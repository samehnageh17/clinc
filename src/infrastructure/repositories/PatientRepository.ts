import type { IPatientRepository, CreatePatientInput } from "../../domain/repositories/IPatientRepository.js";
import { NotFoundError } from "../../domain/errors/AppError.js";
import { prisma } from "../database/prisma.js";
import { toPatientEntity } from "../mappers/entityMappers.js";

export class PatientRepository implements IPatientRepository {
  async create(data: CreatePatientInput) {
    const p = await prisma.patient.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId ?? null,
        fullName: data.fullName,
        phone: data.phone ?? null,
        email: data.email ?? null,
        dateOfBirth: data.dateOfBirth ?? null,
        gender: data.gender ?? null,
        notes: data.notes ?? null,
      },
    });
    return toPatientEntity(p);
  }

  async findById(tenantId: string, id: string) {
    const p = await prisma.patient.findFirst({ where: { tenantId, id } });
    return p ? toPatientEntity(p) : null;
  }

  async findByUserAndTenant(userId: string, tenantId: string) {
    const p = await prisma.patient.findFirst({ where: { userId, tenantId } });
    return p ? toPatientEntity(p) : null;
  }

  async findByPhone(tenantId: string, phone: string) {
    const normalized = phone.trim();
    if (!normalized) return null;
    const p = await prisma.patient.findFirst({
      where: { tenantId, phone: { equals: normalized, mode: "insensitive" } },
    });
    return p ? toPatientEntity(p) : null;
  }

  async listByTenant(tenantId: string, params: { search?: string; skip: number; take: number }) {
    const search = params.search?.trim();
    const where = {
      tenantId,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.patient.count({ where }),
    ]);
    return { items: items.map(toPatientEntity), total };
  }

  async updateNotes(tenantId: string, id: string, notes: string | null) {
    const existing = await prisma.patient.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError("Patient not found");
    const p = await prisma.patient.update({ where: { id }, data: { notes } });
    return toPatientEntity(p);
  }
}
