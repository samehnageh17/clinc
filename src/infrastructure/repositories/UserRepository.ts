import type { IUserRepository, CreateUserInput } from "../../domain/repositories/IUserRepository.js";
import { prisma } from "../database/prisma.js";
import { toUserEntity } from "../mappers/entityMappers.js";

export class UserRepository implements IUserRepository {
  async findById(id: string) {
    const u = await prisma.user.findUnique({ where: { id } });
    return u ? toUserEntity(u) : null;
  }

  async findByEmail(email: string) {
    const u = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    return u ? toUserEntity(u) : null;
  }

  async create(data: CreateUserInput) {
    const u = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        phone: data.phone ?? null,
        role: data.role,
        tenantId: data.tenantId ?? null,
      },
    });
    return toUserEntity(u);
  }

  async incrementTokenVersion(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  }
}
