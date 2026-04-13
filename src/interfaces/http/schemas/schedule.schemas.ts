import { AppointmentSource, AppointmentStatus } from "@prisma/client";
import { z } from "zod";

export const listAppointmentsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  doctor_id: z.string().uuid().optional(),
  source: z.nativeEnum(AppointmentSource).optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
});

export const appointmentCreateSchema = z.object({
  doctor_id: z.string().uuid(),
  patient_id: z.string().uuid().optional(),
  patient: z
    .object({
      full_name: z.string().min(1),
      phone: z.string().optional().nullable(),
      email: z.string().email().optional().nullable(),
    })
    .optional(),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{1,2}:\d{2}$/),
  end_time: z.string().regex(/^\d{1,2}:\d{2}$/),
  source: z.nativeEnum(AppointmentSource),
  fee_charged: z.number().nonnegative().optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const appointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
});

export const workHoursPutSchema = z.object({
  doctor_id: z.string().uuid(),
  hours: z.array(
    z.object({
      day_of_week: z.string().min(2).max(3),
      start_time: z.string().regex(/^\d{1,2}:\d{2}$/),
      end_time: z.string().regex(/^\d{1,2}:\d{2}$/),
      is_active: z.boolean().optional(),
    })
  ),
});

export const blockedSlotCreateSchema = z.object({
  doctor_id: z.string().uuid(),
  blocked_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{1,2}:\d{2}$/).optional().nullable(),
  end_time: z.string().regex(/^\d{1,2}:\d{2}$/).optional().nullable(),
  reason: z.string().max(500).optional().nullable(),
});

export const doctorIdQuerySchema = z.object({
  doctor_id: z.string().uuid(),
});

export const optionalDoctorQuerySchema = z.object({
  doctor_id: z.string().uuid().optional(),
});

export const publicAvailabilityQuerySchema = z.object({
  doctor_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const publicBookingSchema = z.object({
  doctor_id: z.string().uuid(),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{1,2}:\d{2}$/),
  patient: z.object({
    full_name: z.string().min(1),
    phone: z.string().min(3),
    email: z.string().email().optional().nullable(),
  }),
});
