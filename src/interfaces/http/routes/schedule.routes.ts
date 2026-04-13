import { ClinicDoctorPermission } from "@prisma/client";
import { Router } from "express";
import { clinicScheduleService } from "../../../container.js";
import { authRequired } from "../../../middleware/auth.middleware.js";
import { asyncHandler } from "../../../middleware/asyncHandler.js";
import { requireClinicStaff } from "../../../middleware/clinicStaff.middleware.js";
import { loadClinicPermissions, requirePermission } from "../../../middleware/permission.middleware.js";
import { resolveTenantContext, requireTenantId } from "../../../middleware/tenant.middleware.js";
import { validateBody, validateQuery } from "../../../middleware/validate.middleware.js";
import {
  appointmentCreateSchema,
  appointmentStatusSchema,
  blockedSlotCreateSchema,
  doctorIdQuerySchema,
  listAppointmentsQuerySchema,
  optionalDoctorQuerySchema,
  workHoursPutSchema,
} from "../schemas/schedule.schemas.js";

const chain = [authRequired, resolveTenantContext, requireTenantId, loadClinicPermissions, requireClinicStaff];

export function scheduleRoutes(): Router {
  const r = Router();

  r.get(
    "/appointments",
    ...chain,
    requirePermission(ClinicDoctorPermission.view_appointments),
    validateQuery(listAppointmentsQuerySchema),
    asyncHandler(async (req, res) => {
      const q = req.validatedQuery as {
        date?: string;
        doctor_id?: string;
        source?: import("@prisma/client").AppointmentSource;
        status?: import("@prisma/client").AppointmentStatus;
      };
      const rows = await clinicScheduleService.listAppointments(req.tenantId!, {
        date: q.date,
        doctorId: q.doctor_id,
        source: q.source,
        status: q.status,
      });
      res.json(rows);
    })
  );

  r.get(
    "/appointments/:id",
    ...chain,
    requirePermission(ClinicDoctorPermission.view_appointments),
    asyncHandler(async (req, res) => {
      const row = await clinicScheduleService.getAppointment(req.tenantId!, req.params.id);
      res.json(row);
    })
  );

  r.post(
    "/appointments",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_appointments),
    validateBody(appointmentCreateSchema),
    asyncHandler(async (req, res) => {
      const b = req.body as {
        doctor_id: string;
        patient_id?: string;
        patient?: { full_name: string; phone?: string | null; email?: string | null };
        appointment_date: string;
        start_time: string;
        end_time: string;
        source: import("@prisma/client").AppointmentSource;
        fee_charged?: number;
        notes?: string | null;
      };
      const row = await clinicScheduleService.createAppointment(req.tenantId!, {
        doctorId: b.doctor_id,
        patientId: b.patient_id,
        patient: b.patient
          ? {
              fullName: b.patient.full_name,
              phone: b.patient.phone,
              email: b.patient.email,
            }
          : undefined,
        appointmentDate: b.appointment_date,
        startTime: b.start_time,
        endTime: b.end_time,
        source: b.source,
        feeCharged: b.fee_charged,
        notes: b.notes,
      });
      res.status(201).json(row);
    })
  );

  r.patch(
    "/appointments/:id/status",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_appointments),
    validateBody(appointmentStatusSchema),
    asyncHandler(async (req, res) => {
      const { status } = req.body as { status: import("@prisma/client").AppointmentStatus };
      const row = await clinicScheduleService.updateAppointmentStatus(req.tenantId!, req.params.id, status);
      res.json(row);
    })
  );

  r.delete(
    "/appointments/:id",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_appointments),
    asyncHandler(async (req, res) => {
      await clinicScheduleService.deleteAppointment(req.tenantId!, req.params.id);
      res.status(204).end();
    })
  );

  r.get(
    "/work-hours",
    ...chain,
    requirePermission(ClinicDoctorPermission.view_appointments),
    validateQuery(doctorIdQuerySchema),
    asyncHandler(async (req, res) => {
      const q = req.validatedQuery as { doctor_id: string };
      const rows = await clinicScheduleService.listWorkHours(req.tenantId!, q.doctor_id);
      res.json(rows);
    })
  );

  r.put(
    "/work-hours",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_work_hours),
    validateBody(workHoursPutSchema),
    asyncHandler(async (req, res) => {
      const b = req.body as {
        doctor_id: string;
        hours: { day_of_week: string; start_time: string; end_time: string; is_active?: boolean }[];
      };
      const rows = await clinicScheduleService.replaceWorkHours(req.tenantId!, b.doctor_id, b.hours);
      res.json(rows);
    })
  );

  r.get(
    "/blocked-slots",
    ...chain,
    requirePermission(ClinicDoctorPermission.view_appointments),
    validateQuery(optionalDoctorQuerySchema),
    asyncHandler(async (req, res) => {
      const q = req.validatedQuery as { doctor_id?: string };
      const rows = await clinicScheduleService.listBlockedSlots(req.tenantId!, q.doctor_id);
      res.json(rows);
    })
  );

  r.post(
    "/blocked-slots",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_work_hours),
    validateBody(blockedSlotCreateSchema),
    asyncHandler(async (req, res) => {
      const b = req.body as {
        doctor_id: string;
        blocked_date: string;
        start_time?: string | null;
        end_time?: string | null;
        reason?: string | null;
      };
      const row = await clinicScheduleService.createBlockedSlot(req.tenantId!, {
        doctorId: b.doctor_id,
        blockedDate: b.blocked_date,
        startTime: b.start_time,
        endTime: b.end_time,
        reason: b.reason,
      });
      res.status(201).json(row);
    })
  );

  r.delete(
    "/blocked-slots/:id",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_work_hours),
    asyncHandler(async (req, res) => {
      await clinicScheduleService.deleteBlockedSlot(req.tenantId!, req.params.id);
      res.status(204).end();
    })
  );

  return r;
}
