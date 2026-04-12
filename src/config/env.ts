import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  ADMIN_SECRET_KEY: z.string().min(8),
  COOKIE_SECURE: z
    .string()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  CORS_ORIGIN: z.string().optional(),
  BCRYPT_ROUNDS: z.coerce.number().min(10).default(12),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().min(1).default(10),
  LOGIN_LOCKOUT_MS: z.coerce.number().min(1000).default(60 * 60 * 1000),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
