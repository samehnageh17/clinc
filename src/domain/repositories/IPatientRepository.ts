import type { PatientEntity } from "../entities/PatientEntity.js";

export interface CreatePatientInput {
  tenantId: string;
  userId?: string | null;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  notes?: string | null;
}

export interface IPatientRepository {
  create(data: CreatePatientInput): Promise<PatientEntity>;
  findById(tenantId: string, id: string): Promise<PatientEntity | null>;
  findByUserAndTenant(userId: string, tenantId: string): Promise<PatientEntity | null>;
}
