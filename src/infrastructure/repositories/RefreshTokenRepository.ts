import { prisma } from "../database/prisma.js";
import { sha256Hex } from "../security/tokenHash.js";

export class RefreshTokenRepository {
  async create(userId: string, rawToken: string, expiresAt: Date): Promise<void> {
    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256Hex(rawToken),
        expiresAt,
      },
    });
  }

  async findValid(rawToken: string) {
    const hash = sha256Hex(rawToken);
    const row = await prisma.refreshToken.findFirst({
      where: { tokenHash: hash, expiresAt: { gt: new Date() } },
    });
    return row;
  }

  async deleteByHash(rawToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { tokenHash: sha256Hex(rawToken) } });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }
}
