import {
  AppointmentSource,
  AppointmentStatus,
  ClinicDoctorPermission,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "../../domain/errors/AppError.js";
import type { IPatientRepository } from "../../domain/repositories/IPatientRepository.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import {
  dayCodeFromDateUtc,
  minutesToHHMM,
  parseDateOnlyUtc,
  parseHHMM,
  rangesOverlap,
  timeToMinutes,
  utcTimeFromHoursMinutes,
} from "./clinicScheduleUtils.js";

const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.pending,
  AppointmentStatus.confirmed,
  AppointmentStatus.in_progress,
  AppointmentStatus.done,
  AppointmentStatus.no_show,
];

export class ClinicScheduleService {
  constructor(private readonly patients: IPatientRepository) {}

  async listAppointments(
    tenantId: string,
    q: {
      date?: string;
      doctorId?: string;
      source?: AppointmentSource;
      status?: AppointmentStatus;
    }
  ) {
    const where: Prisma.AppointmentWhereInput = { tenantId };
    if (q.doctorId) where.doctorId = q.doctorId;
    if (q.source) where.source = q.source;
    if (q.status) where.status = q.status;
    if (q.date) {
      const d = parseDateOnlyUtc(q.date);
      where.appointmentDate = d;
    }
    return prisma.appointment.findMany({
      where,
      orderBy: [{ appointmentDate: "asc" }, { startTime: "asc" }],
      include: {
        patient: { select: { id: true, fullName: true, phone: true, email: true } },
      },
    });
  }

  async getAppointment(tenantId: string, id: string) {
    const row = await prisma.appointment.findFirst({
      where: { id, tenantId },
      include: {
        patient: { select: { id: true, fullName: true, phone: true, email: true } },
      },
    });
    if (!row) throw new NotFoundError("Appointment not found");
    return row;
  }

  async createAppointment(
    tenantId: string,
    input: {
      doctorId: string;
      patientId?: string;
      patient?: {
        fullName: string;
        phone?: string | null;
        email?: string | null;
      };
      appointmentDate: string;
      startTime: string;
      endTime: string;
      source: AppointmentSource;
      feeCharged?: number;
      notes?: string | null;
      skipStaffNotification?: boolean;
    }
  ) {
    const doctor = await prisma.clinicDoctor.findFirst({
      where: { id: input.doctorId, tenantId, isActive: true },
    });
    if (!doctor) throw new NotFoundError("Doctor not found in this clinic");

    let patientId = input.patientId;
    if (!patientId) {
      if (!input.patient?.fullName?.trim()) throw new BadRequestError("patient or patient_id required");
      const phone = input.patient.phone?.trim() || null;
      const email = input.patient.email?.trim()?.toLowerCase() || null;
      let p = phone ? await this.patients.findByPhone(tenantId, phone) : null;
      if (!p) {
        p = await this.patients.create({
          tenantId,
          fullName: input.patient.fullName.trim(),
          phone,
          email,
        });
      }
      patientId = p.id;
    } else {
      const p = await this.patients.findById(tenantId, patientId);
      if (!p) throw new NotFoundError("Patient not found");
    }

    const appointmentDate = parseDateOnlyUtc(input.appointmentDate);
    const st = parseHHMM(input.startTime);
    const et = parseHHMM(input.endTime);
    const startTime = utcTimeFromHoursMinutes(st.h, st.m);
    const endTime = utcTimeFromHoursMinutes(et.h, et.m);
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      throw new BadRequestError("end_time must be after start_time");
    }

    await this.assertSlotAvailable(tenantId, input.doctorId, appointmentDate, startTime, endTime);

    try {
      const row = await prisma.appointment.create({
        data: {
          tenantId,
          doctorId: input.doctorId,
          patientId,
          appointmentDate,
          startTime,
          endTime,
          source: input.source,
          feeCharged: new Prisma.Decimal(input.feeCharged ?? Number(doctor.feePerSession)),
          notes: input.notes ?? null,
        },
        include: {
          patient: { select: { id: true, fullName: true, phone: true, email: true } },
        },
      });
      if (!input.skipStaffNotification) {
        await this.notifyStaffNewBooking(
          tenantId,
          "New booking",
          `${row.patient.fullName} — ${input.appointmentDate} ${input.startTime}`
        );
      }
      return row;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictError("That time slot is already taken");
      }
      throw e;
    }
  }

  async updateAppointmentStatus(tenantId: string, id: string, status: AppointmentStatus) {
    const existing = await prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError("Appointment not found");
    return prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        patient: { select: { id: true, fullName: true, phone: true, email: true } },
      },
    });
  }

  async deleteAppointment(tenantId: string, id: string) {
    const existing = await prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError("Appointment not found");
    await prisma.appointment.delete({ where: { id } });
  }

  async listWorkHours(tenantId: string, doctorId: string) {
    await this.assertDoctorInTenant(tenantId, doctorId);
    const dowOrder = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const rows = await prisma.workHour.findMany({
      where: { tenantId, doctorId },
    });
    return [...rows].sort((a, b) => dowOrder.indexOf(a.dayOfWeek) - dowOrder.indexOf(b.dayOfWeek));
  }

  async replaceWorkHours(
    tenantId: string,
    doctorId: string,
    rows: { day_of_week: string; start_time: string; end_time: string; is_active?: boolean }[]
  ) {
    await this.assertDoctorInTenant(tenantId, doctorId);
    const allowed = new Set(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]);
    await prisma.$transaction(async (tx) => {
      await tx.workHour.deleteMany({ where: { tenantId, doctorId } });
      for (const r of rows) {
        const dow = r.day_of_week.toLowerCase();
        if (!allowed.has(dow)) throw new BadRequestError(`Invalid day_of_week: ${r.day_of_week}`);
        const sh = parseHHMM(r.start_time);
        const eh = parseHHMM(r.end_time);
        const startTime = utcTimeFromHoursMinutes(sh.h, sh.m);
        const endTime = utcTimeFromHoursMinutes(eh.h, eh.m);
        if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
          throw new BadRequestError("end_time must be after start_time");
        }
        await tx.workHour.create({
          data: {
            tenantId,
            doctorId,
            dayOfWeek: dow,
            startTime,
            endTime,
            isActive: r.is_active ?? true,
          },
        });
      }
    });
    return this.listWorkHours(tenantId, doctorId);
  }

  async listBlockedSlots(tenantId: string, doctorId?: string) {
    const where: Prisma.BlockedSlotWhereInput = { tenantId };
    if (doctorId) where.doctorId = doctorId;
    return prisma.blockedSlot.findMany({
      where,
      orderBy: [{ blockedDate: "desc" }, { startTime: "asc" }],
    });
  }

  async createBlockedSlot(
    tenantId: string,
    input: {
      doctorId: string;
      blockedDate: string;
      startTime?: string | null;
      endTime?: string | null;
      reason?: string | null;
    }
  ) {
    await this.assertDoctorInTenant(tenantId, input.doctorId);
    const blockedDate = parseDateOnlyUtc(input.blockedDate);
    let startT: Date | null = null;
    let endT: Date | null = null;
    if (input.startTime || input.endTime) {
      if (!input.startTime || !input.endTime) {
        throw new BadRequestError("Provide both start_time and end_time or neither for full-day block");
      }
      const sh = parseHHMM(input.startTime);
      const eh = parseHHMM(input.endTime);
      startT = utcTimeFromHoursMinutes(sh.h, sh.m);
      endT = utcTimeFromHoursMinutes(eh.h, eh.m);
      if (timeToMinutes(endT) <= timeToMinutes(startT)) {
        throw new BadRequestError("end_time must be after start_time");
      }
    }
    return prisma.blockedSlot.create({
      data: {
        tenantId,
        doctorId: input.doctorId,
        blockedDate,
        startTime: startT,
        endTime: endT,
        reason: input.reason ?? null,
      },
    });
  }

  async deleteBlockedSlot(tenantId: string, id: string) {
    const row = await prisma.blockedSlot.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundError("Blocked slot not found");
    await prisma.blockedSlot.delete({ where: { id } });
  }

  /** Public: suggested slot start times (HH:mm) for online booking. */
  async getPublicAvailability(tenantId: string, doctorId: string, dateIso: string) {
    const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, isActive: true } });
    if (!tenant) throw new NotFoundError("Clinic not found");
    const doctor = await prisma.clinicDoctor.findFirst({
      where: { id: doctorId, tenantId, isActive: true },
    });
    if (!doctor) throw new NotFoundError("Doctor not found");

    const appointmentDate = parseDateOnlyUtc(dateIso);
    const dow = dayCodeFromDateUtc(appointmentDate);
    const work = await prisma.workHour.findFirst({
      where: { tenantId, doctorId, dayOfWeek: dow, isActive: true },
    });
    if (!work) return { slots: [] as string[], session_duration_min: doctor.sessionDurationMin };

    const step = doctor.sessionDurationMin;
    const whStart = timeToMinutes(work.startTime);
    const whEnd = timeToMinutes(work.endTime);

    const blocked = await prisma.blockedSlot.findMany({
      where: { tenantId, doctorId, blockedDate: appointmentDate },
    });

    const appts = await prisma.appointment.findMany({
      where: {
        tenantId,
        doctorId,
        appointmentDate,
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
      },
    });

    const slots: string[] = [];
    for (let t = whStart; t + step <= whEnd; t += step) {
      const slotStart = t;
      const slotEnd = t + step;
      if (blocked.some((b) => this.blockedCovers(slotStart, slotEnd, b))) continue;
      if (
        appts.some((a) =>
          rangesOverlap(slotStart, slotEnd, timeToMinutes(a.startTime), timeToMinutes(a.endTime))
        )
      ) {
        continue;
      }
      slots.push(minutesToHHMM(slotStart));
    }
    return { slots, session_duration_min: step };
  }

  private blockedCovers(slotStart: number, slotEnd: number, b: { startTime: Date | null; endTime: Date | null }) {
    if (b.startTime == null || b.endTime == null) return true;
    const bs = timeToMinutes(b.startTime);
    const be = timeToMinutes(b.endTime);
    return rangesOverlap(slotStart, slotEnd, bs, be);
  }

  private async assertDoctorInTenant(tenantId: string, doctorId: string) {
    const d = await prisma.clinicDoctor.findFirst({ where: { id: doctorId, tenantId } });
    if (!d) throw new NotFoundError("Doctor not found in this clinic");
  }

  private async assertSlotAvailable(
    tenantId: string,
    doctorId: string,
    appointmentDate: Date,
    startTime: Date,
    endTime: Date
  ) {
    const s = timeToMinutes(startTime);
    const e = timeToMinutes(endTime);
    const dow = dayCodeFromDateUtc(appointmentDate);
    const work = await prisma.workHour.findFirst({
      where: { tenantId, doctorId, dayOfWeek: dow, isActive: true },
    });
    if (!work) throw new BadRequestError("Doctor has no working hours on this day");
    const whS = timeToMinutes(work.startTime);
    const whE = timeToMinutes(work.endTime);
    if (s < whS || e > whE) throw new BadRequestError("Appointment is outside working hours");

    const blocked = await prisma.blockedSlot.findMany({
      where: { tenantId, doctorId, blockedDate: appointmentDate },
    });
    if (blocked.some((b) => this.blockedCovers(s, e, b))) {
      throw new BadRequestError("Time range is blocked");
    }

    const clash = await prisma.appointment.findFirst({
      where: {
        tenantId,
        doctorId,
        appointmentDate,
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
    });
    if (clash) throw new ConflictError("That time slot is already taken");
  }

  private async notifyStaffNewBooking(tenantId: string, title: string, message: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ownerUserId: true },
    });
    if (!tenant) return;
    const staff = await prisma.clinicDoctor.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { isOwner: true },
          { permissions: { some: { permission: ClinicDoctorPermission.manage_appointments } } },
        ],
      },
      select: { userId: true },
    });
    const userIds = new Set<string>([tenant.ownerUserId]);
    for (const row of staff) userIds.add(row.userId);
    await prisma.notification.createMany({
      data: [...userIds].map((userId) => ({
        tenantId,
        userId,
        type: NotificationType.new_booking,
        title,
        message,
      })),
    });
  }
}
