import type { IPatientRepository, CreatePatientInput } from "../../domain/repositories/IPatientRepository.js";
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
}
