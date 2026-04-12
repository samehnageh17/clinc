import { BadRequestError, ConflictError, NotFoundError } from "../../domain/errors/AppError.js";
import type { IExpenseCategoryRepository } from "../../domain/repositories/IExpenseCategoryRepository.js";
import type { IExpenseRepository } from "../../domain/repositories/IExpenseRepository.js";
import type { IStatementRepository } from "../../domain/repositories/IStatementRepository.js";
import { sanitizeText } from "../../infrastructure/security/sanitize.js";
import { ExternalIncomeRepository } from "../../infrastructure/repositories/ExternalIncomeRepository.js";

export class FinanceService {
  constructor(
    private readonly categories: IExpenseCategoryRepository,
    private readonly expenses: IExpenseRepository,
    private readonly statements: IStatementRepository,
    private readonly externalIncome: ExternalIncomeRepository
  ) {}

  async listCategories(tenantId: string) {
    return this.categories.findAllActive(tenantId);
  }

  async addCategory(tenantId: string, name: string) {
    const n = sanitizeText(name, 100);
    return this.categories.create(tenantId, n);
  }

  async deleteCategory(tenantId: string, id: string) {
    await this.categories.delete(tenantId, id);
  }

  async addSubcategory(tenantId: string, categoryId: string, name: string) {
    const n = sanitizeText(name, 100);
    return this.categories.addSubcategory(tenantId, categoryId, n);
  }

  async deleteSubcategory(tenantId: string, categoryId: string, subId: string) {
    await this.categories.deleteSubcategory(tenantId, categoryId, subId);
  }

  async listExpenses(tenantId: string, year: number, month: number, categoryId?: string) {
    const items = await this.expenses.findMany({ tenantId, year, month, categoryId });
    const total = await this.expenses.getTotalForFilter({ tenantId, year, month, categoryId });
    return { items, total };
  }

  async createExpense(
    tenantId: string,
    userId: string,
    input: {
      description: string;
      categoryId: string;
      subcategoryId: string;
      amount: number;
      expenseDate: string;
      notes?: string | null;
      receiptUrl?: string | null;
    }
  ) {
    const desc = sanitizeText(input.description, 255);
    const notes = input.notes != null ? sanitizeText(input.notes, 500) : null;
    const expenseDate = new Date(input.expenseDate);
    const y = expenseDate.getUTCFullYear();
    const m = expenseDate.getUTCMonth() + 1;
    const finalized = await this.statements.isFinalized(tenantId, y, m);
    if (finalized) throw new ConflictError("Cannot add expense for a finalized statement period");

    const ok = await this.categories.validateSubcategoryBelongsToCategory(
      tenantId,
      input.categoryId,
      input.subcategoryId
    );
    if (!ok) throw new BadRequestError("Subcategory does not belong to category or is inactive");

    if (input.amount <= 0) throw new BadRequestError("Amount must be positive");

    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);
    if (expenseDate > today) throw new BadRequestError("Expense date cannot be in the future");

    return this.expenses.create({
      tenantId,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId,
      description: desc,
      amount: input.amount,
      expenseDate,
      notes,
      receiptUrl: input.receiptUrl ?? null,
      createdBy: userId,
    });
  }

  async deleteExpense(tenantId: string, id: string) {
    const existing = await this.expenses.findById(tenantId, id);
    if (!existing) throw new NotFoundError("Expense not found");
    const y = existing.expenseDate.getUTCFullYear();
    const m = existing.expenseDate.getUTCMonth() + 1;
    if (await this.statements.isFinalized(tenantId, y, m)) {
      throw new ConflictError("Cannot delete expense in a finalized statement period");
    }
    await this.expenses.delete(tenantId, id);
  }

  async generateStatement(tenantId: string, year: number, month: number) {
    return this.statements.generate(tenantId, year, month);
  }

  async listStatements(tenantId: string) {
    return this.statements.findAll(tenantId);
  }

  async getStatement(tenantId: string, year: number, month: number) {
    const d = await this.statements.findWithBreakdown(tenantId, year, month);
    if (!d) throw new NotFoundError("Statement not found");
    return d;
  }

  async finalizeStatement(tenantId: string, id: string) {
    return this.statements.finalize(tenantId, id);
  }

  async addExternalIncome(
    tenantId: string,
    input: {
      sourceName: string;
      description?: string | null;
      amount: number;
      incomeDate: string;
      receiptUrl?: string | null;
    }
  ) {
    const d = new Date(input.incomeDate);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const finalized = await this.statements.isFinalized(tenantId, y, m);
    if (finalized) throw new ConflictError("Cannot add external income for a finalized period");
    return this.externalIncome.create({
      tenantId,
      sourceName: sanitizeText(input.sourceName, 200),
      description: input.description != null ? sanitizeText(input.description, 500) : null,
      amount: input.amount,
      incomeDate: d,
      receiptUrl: input.receiptUrl ?? null,
    });
  }

  async listExternalIncome(tenantId: string, year: number, month: number) {
    return this.externalIncome.list(tenantId, year, month);
  }

  async deleteExternalIncome(tenantId: string, id: string) {
    const row = await this.externalIncome.findById(tenantId, id);
    if (!row) throw new NotFoundError("Not found");
    const y = row.incomeDate.getUTCFullYear();
    const m = row.incomeDate.getUTCMonth() + 1;
    const finalized = await this.statements.isFinalized(tenantId, y, m);
    if (finalized) throw new ConflictError("Cannot delete external income in a finalized period");
    await this.externalIncome.delete(tenantId, id);
  }
}
