import { ClinicDoctorPermission, UserRole as PrismaRole } from "@prisma/client";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../domain/errors/AppError.js";
import type { IClinicDoctorRepository } from "../../domain/repositories/IClinicDoctorRepository.js";
import type { ITenantRepository } from "../../domain/repositories/ITenantRepository.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { hashPassword, verifyPassword } from "../../infrastructure/security/password.js";
import { signAccessToken } from "../../infrastructure/security/jwtTokens.js";
import { randomToken } from "../../infrastructure/security/tokenHash.js";
import { LoginAttemptRepository } from "../../infrastructure/repositories/LoginAttemptRepository.js";
import { PasswordResetRepository } from "../../infrastructure/repositories/PasswordResetRepository.js";
import { RefreshTokenRepository } from "../../infrastructure/repositories/RefreshTokenRepository.js";
import { seedDefaultExpenseCategories } from "../../infrastructure/tenant/seedDefaultExpenseCategories.js";

const ALL_PERMS: ClinicDoctorPermission[] = [
  ClinicDoctorPermission.view_appointments,
  ClinicDoctorPermission.manage_appointments,
  ClinicDoctorPermission.view_patients,
  ClinicDoctorPermission.manage_patients,
  ClinicDoctorPermission.view_statements,
  ClinicDoctorPermission.manage_statements,
  ClinicDoctorPermission.manage_staff,
  ClinicDoctorPermission.manage_work_hours,
];

export interface RegisterAdminInput {
  fullName: string;
  email: string;
  password: string;
  adminSecretKey: string;
}

export interface RegisterDoctorInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  clinicName: string;
  specialty?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  address?: string;
  timezone?: string;
  bio?: string;
  slug: string;
}

export interface RegisterPatientInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  tenantId: string;
}

export interface LoginInput {
  email: string;
  password: string;
  tenantId?: string;
}

export class AuthService {
  constructor(
    private readonly users: IUserRepository,
    private readonly tenants: ITenantRepository,
    private readonly clinicDoctors: IClinicDoctorRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly passwordResets: PasswordResetRepository,
    private readonly loginAttempts: LoginAttemptRepository
  ) {}

  async registerAdmin(input: RegisterAdminInput) {
    if (input.adminSecretKey !== env.ADMIN_SECRET_KEY) {
      throw new ForbiddenError("Invalid admin secret");
    }
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new ConflictError("Email already registered");
    const passwordHash = await hashPassword(input.password);
    const user = await this.users.create({
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      passwordHash,
      role: "admin",
      tenantId: null,
    });
    return { userId: user.id, role: user.role };
  }

  async registerDoctor(input: RegisterDoctorInput) {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new ConflictError("Email already registered");
    const slug = input.slug.trim().toLowerCase();
    const slugTaken = await this.tenants.findBySlug(slug);
    if (slugTaken) throw new ConflictError("Slug already taken");
    const passwordHash = await hashPassword(input.password);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: input.fullName,
          email: input.email.toLowerCase(),
          passwordHash,
          phone: input.phone ?? null,
          role: PrismaRole.doctor,
        },
      });
      const tenant = await tx.tenant.create({
        data: {
          ownerUserId: user.id,
          clinicName: input.clinicName,
          slug,
          specialty: input.specialty ?? null,
          primaryColor: input.primaryColor ?? "#0F6E56",
          secondaryColor: input.secondaryColor ?? "#E1F5EE",
          logoUrl: input.logoUrl ?? null,
          address: input.address ?? null,
          timezone: input.timezone ?? "UTC",
          bio: input.bio ?? null,
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { tenantId: tenant.id },
      });
      const doc = await tx.clinicDoctor.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          isOwner: true,
          feePerSession: 0,
          sessionDurationMin: 30,
        },
      });
      await tx.clinicDoctorPermissionRow.createMany({
        data: ALL_PERMS.map((permission) => ({
          tenantId: tenant.id,
          clinicDoctorId: doc.id,
          permission,
        })),
      });
      return { userId: user.id, tenantId: tenant.id };
    });

    await seedDefaultExpenseCategories(result.tenantId);
    return result;
  }

  async registerPatient(input: RegisterPatientInput) {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new ConflictError("Email already registered");
    const tenant = await this.tenants.findById(input.tenantId);
    if (!tenant || !tenant.isActive) throw new NotFoundError("Clinic not found or inactive");
    const passwordHash = await hashPassword(input.password);

    const out = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: input.fullName,
          email: input.email.toLowerCase(),
          passwordHash,
          phone: input.phone ?? null,
          role: PrismaRole.patient,
          tenantId: tenant.id,
        },
      });
      const patient = await tx.patient.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          fullName: input.fullName,
          phone: input.phone ?? null,
          email: input.email.toLowerCase(),
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          gender: input.gender ?? null,
        },
      });
      return { userId: user.id, tenantId: tenant.id, patientId: patient.id };
    });
    return out;
  }

  async login(input: LoginInput) {
    const email = input.email.toLowerCase();
    await this.loginAttempts.assertNotLocked(email);
    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive) {
      await this.loginAttempts.onFailure(email);
      throw new UnauthorizedError("Invalid credentials");
    }
    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) {
      await this.loginAttempts.onFailure(email);
      throw new UnauthorizedError("Invalid credentials");
    }
    await this.loginAttempts.onSuccess(email);

    let tenantId: string | null = null;
    if (user.role === "admin") {
      tenantId = null;
    } else if (user.role === "patient") {
      tenantId = user.tenantId;
    } else if (user.role === "doctor") {
      if (input.tenantId) {
        const cd = await this.clinicDoctors.findByTenantAndUser(input.tenantId, user.id);
        if (!cd?.isActive) throw new ForbiddenError("No access to this clinic");
        tenantId = input.tenantId;
      } else {
        const first = await prisma.clinicDoctor.findFirst({
          where: { userId: user.id, isActive: true },
          orderBy: { joinedAt: "asc" },
        });
        tenantId = first?.tenantId ?? null;
      }
    }

    const access = signAccessToken({
      sub: user.id,
      role: user.role,
      tenantId,
      tv: user.tokenVersion,
    });
    const rawRefresh = randomToken(48);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.refreshTokens.create(user.id, rawRefresh, refreshExpires);

    return { accessToken: access, refreshToken: rawRefresh, userId: user.id, role: user.role, tenantId };
  }

  async refresh(refreshTokenRaw: string | undefined) {
    if (!refreshTokenRaw) throw new UnauthorizedError("Missing refresh token");
    const row = await this.refreshTokens.findValid(refreshTokenRaw);
    if (!row) throw new UnauthorizedError("Invalid refresh token");
    const user = await this.users.findById(row.userId);
    if (!user || !user.isActive) throw new UnauthorizedError("Invalid refresh token");
    await this.refreshTokens.deleteByHash(refreshTokenRaw);

    const tenantId =
      user.role === "admin"
        ? null
        : user.role === "patient"
          ? user.tenantId
          : (
              await prisma.clinicDoctor.findFirst({
                where: { userId: user.id, isActive: true },
              })
            )?.tenantId ?? user.tenantId;

    const access = signAccessToken({
      sub: user.id,
      role: user.role,
      tenantId,
      tv: user.tokenVersion,
    });
    const rawRefresh = randomToken(48);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.refreshTokens.create(user.id, rawRefresh, refreshExpires);
    return { accessToken: access, refreshToken: rawRefresh };
  }

  async logout(refreshTokenRaw: string | undefined) {
    if (refreshTokenRaw) await this.refreshTokens.deleteByHash(refreshTokenRaw);
  }

  async forgotPassword(email: string) {
    const user = await this.users.findByEmail(email.toLowerCase());
    if (!user) {
      logger.info("password_reset_request", { email: "***" });
      return;
    }
    const raw = randomToken(32);
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await this.passwordResets.create(user.id, raw, expires);
    logger.info("password_reset_issued", { userId: user.id });
    return { resetToken: raw };
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await this.passwordResets.consume(token);
    if (!userId) throw new BadRequestError("Invalid or expired reset token");
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    await this.refreshTokens.deleteAllForUser(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedError();
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedError("Current password is incorrect");
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    await this.refreshTokens.deleteAllForUser(userId);
  }
}
