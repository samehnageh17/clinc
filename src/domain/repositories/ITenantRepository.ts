import type { TenantEntity } from "../entities/TenantEntity.js";

export interface CreateTenantInput {
  ownerUserId: string;
  clinicName: string;
  slug: string;
  specialty?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  timezone?: string;
  bio?: string | null;
}

export interface ITenantRepository {
  findById(id: string): Promise<TenantEntity | null>;
  findBySlug(slug: string): Promise<TenantEntity | null>;
  create(data: CreateTenantInput): Promise<TenantEntity>;
  list(params: { search?: string; skip: number; take: number }): Promise<{ items: TenantEntity[]; total: number }>;
  setActive(id: string, isActive: boolean): Promise<TenantEntity>;
}
