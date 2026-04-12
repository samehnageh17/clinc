import { TooManyRequestsError } from "../../domain/errors/AppError.js";
import { env } from "../../config/env.js";
import { prisma } from "../database/prisma.js";

export class LoginAttemptRepository {
  private key(email: string): string {
    return email.toLowerCase();
  }

  async assertNotLocked(email: string): Promise<void> {
    const row = await prisma.loginAttempt.findUnique({ where: { identifier: this.key(email) } });
    if (row?.lockedUntil && row.lockedUntil > new Date()) {
      throw new TooManyRequestsError("Too many failed login attempts. Try again later.");
    }
  }

  async onFailure(email: string): Promise<void> {
    const id = this.key(email);
    const row = await prisma.loginAttempt.findUnique({ where: { identifier: id } });
    const next = (row?.failedCount ?? 0) + 1;
    if (next >= env.LOGIN_MAX_ATTEMPTS) {
      await prisma.loginAttempt.upsert({
        where: { identifier: id },
        create: {
          identifier: id,
          failedCount: 0,
          lockedUntil: new Date(Date.now() + env.LOGIN_LOCKOUT_MS),
        },
        update: {
          failedCount: 0,
          lockedUntil: new Date(Date.now() + env.LOGIN_LOCKOUT_MS),
        },
      });
    } else {
      await prisma.loginAttempt.upsert({
        where: { identifier: id },
        create: { identifier: id, failedCount: next },
        update: { failedCount: next },
      });
    }
  }

  async onSuccess(email: string): Promise<void> {
    await prisma.loginAttempt.deleteMany({ where: { identifier: this.key(email) } });
  }
}
