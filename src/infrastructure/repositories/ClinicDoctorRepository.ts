import { ClinicDoctorPermission as PrismaPerm } from "@prisma/client";
import type {
  IClinicDoctorRepository,
  ClinicDoctorPermission,
  ClinicDoctorStaffView,
} from "../../domain/repositories/IClinicDoctorRepository.js";
import { prisma } from "../database/prisma.js";
import { toClinicDoctorEntity } from "../mappers/entityMappers.js";

const ALL: PrismaPerm[] = [
  "view_appointments",
  "manage_appointments",
  "view_patients",
  "manage_patients",
  "view_statements",
  "manage_statements",
  "manage_staff",
  "manage_work_hours",
];

function toPrisma(perms: ClinicDoctorPermission[]): PrismaPerm[] {
  return perms as PrismaPerm[];
}

export class ClinicDoctorRepository implements IClinicDoctorRepository {
  async findByTenantAndUser(tenantId: string, userId: string) {
    const c = await prisma.clinicDoctor.findFirst({ where: { tenantId, userId } });
    return c ? toClinicDoctorEntity(c) : null;
  }

  async findById(tenantId: string, id: string) {
    const c = await prisma.clinicDoctor.findFirst({ where: { tenantId, id } });
    return c ? toClinicDoctorEntity(c) : null;
  }

  async createOwner(tenantId: string, userId: string) {
    const c = await prisma.$transaction(async (tx) => {
      const doc = await tx.clinicDoctor.create({
        data: {
          tenantId,
          userId,
          isOwner: true,
          feePerSession: 0,
          sessionDurationMin: 30,
        },
      });
      await tx.clinicDoctorPermissionRow.createMany({
        data: ALL.map((permission) => ({
          tenantId,
          clinicDoctorId: doc.id,
          permission,
        })),
      });
      return doc;
    });
    return toClinicDoctorEntity(c);
  }

  async createStaff(input: {
    tenantId: string;
    userId: string;
    specialty?: string | null;
    feePerSession: number;
    sessionDurationMin: number;
    permissions: ClinicDoctorPermission[];
  }) {
    const c = await prisma.$transaction(async (tx) => {
      const doc = await tx.clinicDoctor.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          isOwner: false,
          specialty: input.specialty ?? null,
          feePerSession: input.feePerSession,
          sessionDurationMin: input.sessionDurationMin,
        },
      });
      const perms = toPrisma(input.permissions);
      if (perms.length) {
        await tx.clinicDoctorPermissionRow.createMany({
          data: perms.map((permission) => ({
            tenantId: input.tenantId,
            clinicDoctorId: doc.id,
            permission,
          })),
        });
      }
      return doc;
    });
    return toClinicDoctorEntity(c);
  }

  async setPermissions(tenantId: string, clinicDoctorId: string, permissions: ClinicDoctorPermission[]) {
    const perms = toPrisma(permissions);
    await prisma.$transaction(async (tx) => {
      await tx.clinicDoctorPermissionRow.deleteMany({ where: { tenantId, clinicDoctorId } });
      if (perms.length) {
        await tx.clinicDoctorPermissionRow.createMany({
          data: perms.map((permission) => ({
            tenantId,
            clinicDoctorId,
            permission,
          })),
        });
      }
    });
  }

  async deactivate(tenantId: string, clinicDoctorId: string): Promise<void> {
    await prisma.clinicDoctor.updateMany({
      where: { tenantId, id: clinicDoctorId },
      data: { isActive: false },
    });
  }

  async reactivate(tenantId: string, clinicDoctorId: string): Promise<void> {
    await prisma.clinicDoctor.updateMany({
      where: { tenantId, id: clinicDoctorId },
      data: { isActive: true },
    });
  }

  async listByTenant(tenantId: string) {
    const rows = await prisma.clinicDoctor.findMany({ where: { tenantId } });
    return rows.map(toClinicDoctorEntity);
  }

  async listStaffView(tenantId: string): Promise<ClinicDoctorStaffView[]> {
    const rows = await prisma.clinicDoctor.findMany({
      where: { tenantId },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        permissions: true,
      },
      orderBy: { joinedAt: "asc" },
    });
    return rows.map((r) => ({
      doctor: toClinicDoctorEntity(r),
      fullName: r.user.fullName,
      email: r.user.email,
      phone: r.user.phone,
      permissions: r.permissions.map((p) => p.permission as ClinicDoctorPermission),
    }));
  }
}
