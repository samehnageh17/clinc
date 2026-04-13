import { z } from "zod";

export const listPatientsQuerySchema = z.object({
  search: z.string().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(30),
});

export const patientNotesSchema = z.object({
  notes: z.string().max(5000).nullable(),
});
