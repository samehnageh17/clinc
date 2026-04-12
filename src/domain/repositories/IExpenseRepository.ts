import type { ExpenseWithCategories } from "../entities/ExpenseEntity.js";

export interface ExpenseFilter {
  tenantId: string;
  year: number;
  month: number;
  categoryId?: string;
}

export interface CreateExpenseInput {
  tenantId: string;
  categoryId: string;
  subcategoryId: string;
  description: string;
  amount: number;
  expenseDate: Date;
  notes?: string | null;
  receiptUrl?: string | null;
  createdBy: string;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  expenseCount: number;
}

export interface IExpenseRepository {
  findMany(filter: ExpenseFilter): Promise<ExpenseWithCategories[]>;
  findById(tenantId: string, id: string): Promise<ExpenseWithCategories | null>;
  getTotalForFilter(filter: ExpenseFilter): Promise<number>;
  create(data: CreateExpenseInput): Promise<ExpenseWithCategories>;
  delete(tenantId: string, id: string): Promise<void>;
  sumByCategory(tenantId: string, year: number, month: number): Promise<CategoryBreakdown[]>;
  sumForMonth(tenantId: string, year: number, month: number): Promise<number>;
}
