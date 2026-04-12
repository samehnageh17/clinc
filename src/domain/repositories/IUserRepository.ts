import type { UserEntity, UserRole } from "../entities/UserEntity.js";

export interface CreateUserInput {
  fullName: string;
  email: string;
  passwordHash: string;
  phone?: string | null;
  role: UserRole;
  tenantId?: string | null;
}

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(data: CreateUserInput): Promise<UserEntity>;
  incrementTokenVersion(userId: string): Promise<void>;
}
