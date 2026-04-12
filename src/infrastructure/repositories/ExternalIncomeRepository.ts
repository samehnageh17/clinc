import { prisma } from "../database/prisma.js";

export class ExternalIncomeRepository {
  async create(input: {
    tenantId: string;
    sourceName: string;
    description?: string | null;
    amount: number;
    incomeDate: Date;
    receiptUrl?: string | null;
  }) {
    return prisma.externalIncome.create({
      data: {
        tenantId: input.tenantId,
        sourceName: input.sourceName,
        description: input.description ?? null,
        amount: input.amount,
        incomeDate: input.incomeDate,
        receiptUrl: input.receiptUrl ?? null,
      },
    });
  }

  async list(tenantId: string, year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    return prisma.externalIncome.findMany({
      where: { tenantId, incomeDate: { gte: start, lt: end } },
      orderBy: { incomeDate: "desc" },
    });
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await prisma.externalIncome.deleteMany({ where: { tenantId, id } });
  }

  async findById(tenantId: string, id: string) {
    return prisma.externalIncome.findFirst({ where: { tenantId, id } });
  }
}
