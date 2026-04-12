export interface TenantEntity {
  id: string;
  ownerUserId: string;
  clinicName: string;
  slug: string;
  subdomain: string | null;
  customDomain: string | null;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  timezone: string;
  specialty: string | null;
  bio: string | null;
  isActive: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}
