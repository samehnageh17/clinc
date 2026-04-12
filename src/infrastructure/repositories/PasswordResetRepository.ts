import { prisma } from "../database/prisma.js";
import { sha256Hex } from "../security/tokenHash.js";

export class PasswordResetRepository {
  async create(userId: string, rawToken: string, expiresAt: Date): Promise<void> {
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: sha256Hex(rawToken),
        expiresAt,
      },
    });
  }

  async consume(rawToken: string) {
    const hash = sha256Hex(rawToken);
    const row = await prisma.passwordResetToken.findFirst({
      where: { tokenHash: hash, expiresAt: { gt: new Date() } },
    });
    if (!row) return null;
    await prisma.passwordResetToken.delete({ where: { id: row.id } });
    return row.userId;
  }
}
