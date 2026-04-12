import type { ITenantRepository, CreateTenantInput } from "../../domain/repositories/ITenantRepository.js";
import { prisma } from "../database/prisma.js";
import { toTenantEntity } from "../mappers/entityMappers.js";

export class TenantRepository implements ITenantRepository {
  async findById(id: string) {
    const t = await prisma.tenant.findUnique({ where: { id } });
    return t ? toTenantEntity(t) : null;
  }

  async findBySlug(slug: string) {
    const t = await prisma.tenant.findUnique({ where: { slug: slug.toLowerCase() } });
    return t ? toTenantEntity(t) : null;
  }

  async create(data: CreateTenantInput) {
    const t = await prisma.tenant.create({
      data: {
        ownerUserId: data.ownerUserId,
        clinicName: data.clinicName,
        slug: data.slug.toLowerCase(),
        specialty: data.specialty ?? null,
        primaryColor: data.primaryColor ?? "#0F6E56",
        secondaryColor: data.secondaryColor ?? "#E1F5EE",
        logoUrl: data.logoUrl ?? null,
        address: data.address ?? null,
        phone: data.phone ?? null,
        timezone: data.timezone ?? "UTC",
        bio: data.bio ?? null,
      },
    });
    return toTenantEntity(t);
  }

  async list(params: { search?: string; skip: number; take: number }) {
    const where = params.search
      ? {
          OR: [
            { clinicName: { contains: params.search, mode: "insensitive" as const } },
            { specialty: { contains: params.search, mode: "insensitive" as const } },
            { slug: { contains: params.search, mode: "insensitive" as const } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.tenant.count({ where }),
    ]);
    return { items: items.map(toTenantEntity), total };
  }

  async setActive(id: string, isActive: boolean) {
    const t = await prisma.tenant.update({ where: { id }, data: { isActive } });
    return toTenantEntity(t);
  }
}
