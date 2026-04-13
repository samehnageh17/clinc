import { z } from "zod";

const permissionEnum = z.enum([
  "view_appointments",
  "manage_appointments",
  "view_patients",
  "manage_patients",
  "view_statements",
  "manage_statements",
  "manage_staff",
  "manage_work_hours",
]);

export const staffInviteSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  /** Required when creating a new user; ignored when linking an existing doctor account. */
  password: z.string().min(8).optional(),
  phone: z.string().optional().nullable(),
  specialty: z.string().optional().nullable(),
  fee_per_session: z.number().nonnegative().optional(),
  session_duration_min: z.number().int().min(5).max(240).optional(),
  permissions: z.array(permissionEnum).optional(),
});

export const staffPermissionsSchema = z.object({
  permissions: z.array(permissionEnum).min(0),
});
