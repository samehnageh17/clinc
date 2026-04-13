import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../domain/errors/AppError.js";
import type { ClinicDoctorPermission, IClinicDoctorRepository } from "../../domain/repositories/IClinicDoctorRepository.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import { hashPassword } from "../../infrastructure/security/password.js";

const VIEW_ONLY: ClinicDoctorPermission[] = [
  "view_appointments",
  "view_patients",
  "view_statements",
];

export class StaffService {
  constructor(
    private readonly users: IUserRepository,
    private readonly clinicDoctors: IClinicDoctorRepository
  ) {}

  list(tenantId: string) {
    return this.clinicDoctors.listStaffView(tenantId);
  }

  async inviteDoctor(
    tenantId: string,
    input: {
      fullName: string;
      email: string;
      password?: string;
      phone?: string | null;
      specialty?: string | null;
      feePerSession?: number;
      sessionDurationMin?: number;
      permissions?: ClinicDoctorPermission[];
    }
  ) {
    const email = input.email.toLowerCase();
    const perms = input.permissions?.length ? input.permissions : VIEW_ONLY;
    const existing = await this.users.findByEmail(email);

    if (!existing && (!input.password || input.password.length < 8)) {
      throw new BadRequestError("password is required for new staff accounts");
    }

    if (existing) {
      if (existing.role !== "doctor") {
        throw new ConflictError("This email is already used by a non-doctor account");
      }
      const link = await this.clinicDoctors.findByTenantAndUser(tenantId, existing.id);
      if (link?.isActive) {
        throw new ConflictError("This doctor is already a member of this clinic");
      }
      if (link && !link.isActive) {
        await this.clinicDoctors.reactivate(tenantId, link.id);
        await this.clinicDoctors.setPermissions(tenantId, link.id, perms);
        const updated = await this.clinicDoctors.findById(tenantId, link.id);
        if (!updated) throw new NotFoundError("Staff member not found");
        return updated;
      }
      return this.clinicDoctors.createStaff({
        tenantId,
        userId: existing.id,
        specialty: input.specialty ?? null,
        feePerSession: input.feePerSession ?? 0,
        sessionDurationMin: input.sessionDurationMin ?? 30,
        permissions: perms,
      });
    }

    const passwordHash = await hashPassword(input.password!);
    const user = await this.users.create({
      fullName: input.fullName,
      email,
      passwordHash,
      phone: input.phone ?? null,
      role: "doctor",
      tenantId,
    });
    return this.clinicDoctors.createStaff({
      tenantId,
      userId: user.id,
      specialty: input.specialty ?? null,
      feePerSession: input.feePerSession ?? 0,
      sessionDurationMin: input.sessionDurationMin ?? 30,
      permissions: perms,
    });
  }

  async setPermissions(
    tenantId: string,
    actorUserId: string,
    clinicDoctorId: string,
    permissions: ClinicDoctorPermission[]
  ) {
    const target = await this.clinicDoctors.findById(tenantId, clinicDoctorId);
    if (!target) throw new NotFoundError("Staff member not found");
    if (target.isOwner) throw new ForbiddenError("Cannot change the clinic owner's permissions");
    const actor = await this.clinicDoctors.findByTenantAndUser(tenantId, actorUserId);
    if (actor && !actor.isOwner && target.userId === actorUserId) {
      throw new ForbiddenError("Cannot change your own permissions");
    }
    await this.clinicDoctors.setPermissions(tenantId, clinicDoctorId, permissions);
  }

  async deactivate(tenantId: string, clinicDoctorId: string) {
    const target = await this.clinicDoctors.findById(tenantId, clinicDoctorId);
    if (!target) throw new NotFoundError("Staff member not found");
    if (target.isOwner) throw new BadRequestError("Cannot deactivate the clinic owner");
    await this.clinicDoctors.deactivate(tenantId, clinicDoctorId);
  }
}
