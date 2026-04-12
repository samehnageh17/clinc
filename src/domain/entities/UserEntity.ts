export type UserRole = "admin" | "doctor" | "patient";

export interface UserEntity {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  phone: string | null;
  role: UserRole;
  tenantId: string | null;
  isActive: boolean;
  emailVerified: boolean;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}
