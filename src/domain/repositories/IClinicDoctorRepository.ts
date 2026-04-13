import type { ClinicDoctorEntity } from "../entities/ClinicDoctorEntity.js";

export type ClinicDoctorPermission =
  | "view_appointments"
  | "manage_appointments"
  | "view_patients"
  | "manage_patients"
  | "view_statements"
  | "manage_statements"
  | "manage_staff"
  | "manage_work_hours";

export interface ClinicDoctorStaffView {
  doctor: ClinicDoctorEntity;
  fullName: string;
  email: string;
  phone: string | null;
  permissions: ClinicDoctorPermission[];
}

export interface IClinicDoctorRepository {
  findByTenantAndUser(tenantId: string, userId: string): Promise<ClinicDoctorEntity | null>;
  findById(tenantId: string, id: string): Promise<ClinicDoctorEntity | null>;
  createOwner(tenantId: string, userId: string): Promise<ClinicDoctorEntity>;
  createStaff(input: {
    tenantId: string;
    userId: string;
    specialty?: string | null;
    feePerSession: number;
    sessionDurationMin: number;
    permissions: ClinicDoctorPermission[];
  }): Promise<ClinicDoctorEntity>;
  setPermissions(tenantId: string, clinicDoctorId: string, permissions: ClinicDoctorPermission[]): Promise<void>;
  deactivate(tenantId: string, clinicDoctorId: string): Promise<void>;
  reactivate(tenantId: string, clinicDoctorId: string): Promise<void>;
  listByTenant(tenantId: string): Promise<ClinicDoctorEntity[]>;
  listStaffView(tenantId: string): Promise<ClinicDoctorStaffView[]>;
}
