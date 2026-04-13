import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  unread_only: z.coerce.boolean().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(30),
});
