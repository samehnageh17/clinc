export interface PatientEntity {
  id: string;
  tenantId: string;
  userId: string | null;
  fullName: string;
  phone: string | null;
  email: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
