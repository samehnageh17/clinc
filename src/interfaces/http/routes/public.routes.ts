import { AppointmentSource } from "@prisma/client";
import { Router } from "express";
import { clinicScheduleService } from "../../../container.js";
import { asyncHandler } from "../../../middleware/asyncHandler.js";
import { validateBody, validateQuery } from "../../../middleware/validate.middleware.js";
import { prisma } from "../../../infrastructure/database/prisma.js";
import { publicAvailabilityQuerySchema, publicBookingSchema } from "../schemas/schedule.schemas.js";

export function publicRoutes(): Router {
  const r = Router();

  r.get(
    "/clinics/:slug",
    asyncHandler(async (req, res) => {
      const slug = req.params.slug.toLowerCase();
      const tenant = await prisma.tenant.findFirst({
        where: { slug, isActive: true },
        select: {
          id: true,
          clinicName: true,
          slug: true,
          specialty: true,
          primaryColor: true,
          secondaryColor: true,
          logoUrl: true,
          address: true,
          phone: true,
          timezone: true,
          bio: true,
          isPublished: true,
        },
      });
      if (!tenant) {
        res.status(404).json({ error: "Clinic not found" });
        return;
      }
      res.json(tenant);
    })
  );

  r.get(
    "/clinics/:slug/doctors",
    asyncHandler(async (req, res) => {
      const slug = req.params.slug.toLowerCase();
      const tenant = await prisma.tenant.findFirst({
        where: { slug, isActive: true },
        select: { id: true },
      });
      if (!tenant) {
        res.status(404).json({ error: "Clinic not found" });
        return;
      }
      const doctors = await prisma.clinicDoctor.findMany({
        where: { tenantId: tenant.id, isActive: true },
        select: {
          id: true,
          specialty: true,
          photoUrl: true,
          sessionDurationMin: true,
          feePerSession: true,
          user: { select: { fullName: true } },
        },
        orderBy: { joinedAt: "asc" },
      });
      res.json(
        doctors.map((d) => ({
          id: d.id,
          full_name: d.user.fullName,
          specialty: d.specialty,
          photo_url: d.photoUrl,
          session_duration_min: d.sessionDurationMin,
          fee_per_session: Number(d.feePerSession),
        }))
      );
    })
  );

  r.get(
    "/clinics/:slug/availability",
    validateQuery(publicAvailabilityQuerySchema),
    asyncHandler(async (req, res) => {
      const slug = req.params.slug.toLowerCase();
      const q = req.validatedQuery as { doctor_id: string; date: string };
      const tenant = await prisma.tenant.findFirst({
        where: { slug, isActive: true },
        select: { id: true },
      });
      if (!tenant) {
        res.status(404).json({ error: "Clinic not found" });
        return;
      }
      const out = await clinicScheduleService.getPublicAvailability(tenant.id, q.doctor_id, q.date);
      res.json(out);
    })
  );

  r.post(
    "/clinics/:slug/bookings",
    validateBody(publicBookingSchema),
    asyncHandler(async (req, res) => {
      const slug = req.params.slug.toLowerCase();
      const b = req.body as {
        doctor_id: string;
        appointment_date: string;
        start_time: string;
        patient: { full_name: string; phone: string; email?: string | null };
      };
      const tenant = await prisma.tenant.findFirst({
        where: { slug, isActive: true },
        select: { id: true },
      });
      if (!tenant) {
        res.status(404).json({ error: "Clinic not found" });
        return;
      }
      const doctor = await prisma.clinicDoctor.findFirst({
        where: { id: b.doctor_id, tenantId: tenant.id, isActive: true },
        select: { sessionDurationMin: true },
      });
      if (!doctor) {
        res.status(404).json({ error: "Doctor not found" });
        return;
      }
      const [sh, sm] = b.start_time.split(":").map(Number);
      const startTotal = sh * 60 + sm;
      const endTotal = startTotal + doctor.sessionDurationMin;
      const end_time = `${String(Math.floor(endTotal / 60)).padStart(2, "0")}:${String(endTotal % 60).padStart(2, "0")}`;
      const row = await clinicScheduleService.createAppointment(tenant.id, {
        doctorId: b.doctor_id,
        patient: {
          fullName: b.patient.full_name,
          phone: b.patient.phone,
          email: b.patient.email,
        },
        appointmentDate: b.appointment_date,
        startTime: b.start_time,
        endTime: end_time,
        source: AppointmentSource.online,
      });
      res.status(201).json({
        id: row.id,
        appointment_date: b.appointment_date,
        start_time: b.start_time,
        end_time: end_time,
        status: row.status,
      });
    })
  );

  return r;
}
