export interface ClinicDoctorEntity {
  id: string;
  tenantId: string;
  userId: string;
  specialty: string | null;
  photoUrl: string | null;
  sessionDurationMin: number;
  feePerSession: number;
  isActive: boolean;
  isOwner: boolean;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
