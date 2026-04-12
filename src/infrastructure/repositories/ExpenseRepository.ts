import type {
  CategoryBreakdown,
  CreateExpenseInput,
  ExpenseFilter,
  IExpenseRepository,
} from "../../domain/repositories/IExpenseRepository.js";
import { prisma } from "../database/prisma.js";
import { mapExpenseRow } from "../mappers/entityMappers.js";

export class ExpenseRepository implements IExpenseRepository {
  async findById(tenantId: string, id: string) {
    const e = await prisma.expense.findFirst({
      where: { tenantId, id },
      include: { category: true, subcategory: true },
    });
    return e ? mapExpenseRow(e) : null;
  }

  async findMany(filter: ExpenseFilter) {
    const start = new Date(Date.UTC(filter.year, filter.month - 1, 1));
    const end = new Date(Date.UTC(filter.year, filter.month, 1));
    const rows = await prisma.expense.findMany({
      where: {
        tenantId: filter.tenantId,
        expenseDate: { gte: start, lt: end },
        ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      },
      include: { category: true, subcategory: true },
      orderBy: { expenseDate: "desc" },
    });
    return rows.map(mapExpenseRow);
  }

  async getTotalForFilter(filter: ExpenseFilter) {
    const start = new Date(Date.UTC(filter.year, filter.month - 1, 1));
    const end = new Date(Date.UTC(filter.year, filter.month, 1));
    const agg = await prisma.expense.aggregate({
      where: {
        tenantId: filter.tenantId,
        expenseDate: { gte: start, lt: end },
        ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      },
      _sum: { amount: true },
    });
    return Number(agg._sum.amount ?? 0);
  }

  async create(data: CreateExpenseInput) {
    const e = await prisma.expense.create({
      data: {
        tenantId: data.tenantId,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        description: data.description,
        amount: data.amount,
        expenseDate: data.expenseDate,
        notes: data.notes ?? null,
        receiptUrl: data.receiptUrl ?? null,
        createdBy: data.createdBy,
      },
      include: { category: true, subcategory: true },
    });
    return mapExpenseRow(e);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await prisma.expense.deleteMany({ where: { tenantId, id } });
  }

  async sumByCategory(tenantId: string, year: number, month: number): Promise<CategoryBreakdown[]> {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const rows = await prisma.expense.groupBy({
      by: ["categoryId"],
      where: { tenantId, expenseDate: { gte: start, lt: end } },
      _sum: { amount: true },
      _count: { _all: true },
    });
    const cats = await prisma.expenseCategory.findMany({
      where: { tenantId, id: { in: rows.map((r) => r.categoryId) } },
    });
    const nameById = new Map(cats.map((c) => [c.id, c.name] as const));
    return rows.map((r) => ({
      categoryId: r.categoryId,
      categoryName: nameById.get(r.categoryId) ?? "",
      totalAmount: Number(r._sum.amount ?? 0),
      expenseCount: r._count._all,
    }));
  }

  async sumForMonth(tenantId: string, year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const agg = await prisma.expense.aggregate({
      where: { tenantId, expenseDate: { gte: start, lt: end } },
      _sum: { amount: true },
    });
    return Number(agg._sum.amount ?? 0);
  }
}
