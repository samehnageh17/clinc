import { ConflictError } from "../../domain/errors/AppError.js";
import type { IExpenseCategoryRepository } from "../../domain/repositories/IExpenseCategoryRepository.js";
import type {
  ExpenseCategoryEntity,
  ExpenseCategoryWithSubs,
  ExpenseSubcategoryEntity,
} from "../../domain/entities/ExpenseCategoryEntity.js";
import { prisma } from "../database/prisma.js";

function mapCat(c: { id: string; tenantId: string; name: string; isActive: boolean; createdAt: Date; updatedAt: Date }): ExpenseCategoryEntity {
  return {
    id: c.id,
    tenantId: c.tenantId,
    name: c.name,
    isActive: c.isActive,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function mapSub(s: {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ExpenseSubcategoryEntity {
  return {
    id: s.id,
    tenantId: s.tenantId,
    categoryId: s.categoryId,
    name: s.name,
    isActive: s.isActive,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export class ExpenseCategoryRepository implements IExpenseCategoryRepository {
  async findAllActive(tenantId: string): Promise<ExpenseCategoryWithSubs[]> {
    const rows = await prisma.expenseCategory.findMany({
      where: { tenantId, isActive: true },
      include: { subcategories: { where: { isActive: true }, orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      ...mapCat(r),
      subcategories: r.subcategories.map(mapSub),
    }));
  }

  async findById(tenantId: string, id: string) {
    const c = await prisma.expenseCategory.findFirst({ where: { tenantId, id } });
    return c ? mapCat(c) : null;
  }

  async create(tenantId: string, name: string) {
    try {
      const c = await prisma.expenseCategory.create({
        data: { tenantId, name: name.trim() },
      });
      return mapCat(c);
    } catch {
      throw new ConflictError("Category name must be unique");
    }
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const n = await prisma.expense.count({ where: { tenantId, categoryId: id } });
    if (n > 0) throw new ConflictError("Cannot delete category with existing expenses");
    await prisma.expenseSubcategory.deleteMany({ where: { tenantId, categoryId: id } });
    await prisma.expenseCategory.deleteMany({ where: { tenantId, id } });
  }

  async addSubcategory(tenantId: string, categoryId: string, name: string) {
    try {
      const s = await prisma.expenseSubcategory.create({
        data: { tenantId, categoryId, name: name.trim() },
      });
      return mapSub(s);
    } catch {
      throw new ConflictError("Subcategory name must be unique within category");
    }
  }

  async deleteSubcategory(tenantId: string, categoryId: string, subId: string): Promise<void> {
    const n = await prisma.expense.count({ where: { tenantId, subcategoryId: subId } });
    if (n > 0) throw new ConflictError("Cannot delete subcategory with existing expenses");
    await prisma.expenseSubcategory.deleteMany({ where: { tenantId, categoryId, id: subId } });
  }

  async countExpensesForCategory(tenantId: string, categoryId: string) {
    return prisma.expense.count({ where: { tenantId, categoryId } });
  }

  async countExpensesForSubcategory(tenantId: string, subId: string) {
    return prisma.expense.count({ where: { tenantId, subcategoryId: subId } });
  }

  async validateSubcategoryBelongsToCategory(
    tenantId: string,
    categoryId: string,
    subcategoryId: string
  ): Promise<boolean> {
    const s = await prisma.expenseSubcategory.findFirst({
      where: { tenantId, id: subcategoryId, categoryId, isActive: true },
    });
    return !!s;
  }
}
