import type {
  ClinicDoctor,
  Expense,
  ExpenseCategory,
  ExpenseSubcategory,
  Patient,
  Tenant,
  User,
} from "@prisma/client";
import type { ClinicDoctorEntity } from "../../domain/entities/ClinicDoctorEntity.js";
import type { ExpenseWithCategories } from "../../domain/entities/ExpenseEntity.js";
import type { PatientEntity } from "../../domain/entities/PatientEntity.js";
import type { TenantEntity } from "../../domain/entities/TenantEntity.js";
import type { UserEntity, UserRole } from "../../domain/entities/UserEntity.js";

export function toUserEntity(u: User): UserEntity {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    passwordHash: u.passwordHash,
    phone: u.phone,
    role: u.role as UserRole,
    tenantId: u.tenantId,
    isActive: u.isActive,
    emailVerified: u.emailVerified,
    tokenVersion: u.tokenVersion,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export function toTenantEntity(t: Tenant): TenantEntity {
  return {
    id: t.id,
    ownerUserId: t.ownerUserId,
    clinicName: t.clinicName,
    slug: t.slug,
    subdomain: t.subdomain,
    customDomain: t.customDomain,
    primaryColor: t.primaryColor,
    secondaryColor: t.secondaryColor,
    logoUrl: t.logoUrl,
    address: t.address,
    phone: t.phone,
    timezone: t.timezone,
    specialty: t.specialty,
    bio: t.bio,
    isActive: t.isActive,
    isPublished: t.isPublished,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export function toClinicDoctorEntity(c: ClinicDoctor): ClinicDoctorEntity {
  return {
    id: c.id,
    tenantId: c.tenantId,
    userId: c.userId,
    specialty: c.specialty,
    photoUrl: c.photoUrl,
    sessionDurationMin: c.sessionDurationMin,
    feePerSession: Number(c.feePerSession),
    isActive: c.isActive,
    isOwner: c.isOwner,
    joinedAt: c.joinedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export function toPatientEntity(p: Patient): PatientEntity {
  return {
    id: p.id,
    tenantId: p.tenantId,
    userId: p.userId,
    fullName: p.fullName,
    phone: p.phone,
    email: p.email,
    dateOfBirth: p.dateOfBirth,
    gender: p.gender,
    notes: p.notes,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function mapExpenseRow(
  e: Expense & { category: ExpenseCategory; subcategory: ExpenseSubcategory }
): ExpenseWithCategories {
  return {
    id: e.id,
    tenantId: e.tenantId,
    categoryId: e.categoryId,
    subcategoryId: e.subcategoryId,
    description: e.description,
    amount: Number(e.amount),
    expenseDate: e.expenseDate,
    notes: e.notes,
    receiptUrl: e.receiptUrl,
    createdBy: e.createdBy,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    categoryName: e.category.name,
    subcategoryName: e.subcategory.name,
  };
}
