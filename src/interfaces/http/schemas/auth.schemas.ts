import { z } from "zod";

const password = z.string().min(8).max(128);

export const registerAdminSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  password,
  adminSecretKey: z.string().min(1),
});

export const registerDoctorSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  password,
  phone: z.string().max(50).optional(),
  clinicName: z.string().min(1).max(200),
  specialty: z.string().max(200).optional(),
  primaryColor: z.string().max(20).optional(),
  secondaryColor: z.string().max(20).optional(),
  logoUrl: z.union([z.string().url().max(2000), z.literal("")]).optional(),
  address: z.string().max(500).optional(),
  timezone: z.string().max(100).optional(),
  bio: z.string().max(5000).optional(),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const registerPatientSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  password,
  phone: z.string().max(50).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  tenantId: z.string().uuid(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantId: z.string().uuid().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});
