import { z } from "zod";

export const expenseCategoryCreateSchema = z.object({
  name: z.string().min(1).max(100),
});

export const expenseSubcategoryCreateSchema = z.object({
  name: z.string().min(1).max(100),
});

export const expenseCreateSchema = z.object({
  description: z.string().min(1).max(255),
  category_id: z.string().uuid(),
  subcategory_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional().nullable(),
  receipt_url: z.string().url().max(2000).optional().nullable(),
});

export const statementGenerateSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const externalIncomeCreateSchema = z.object({
  source_name: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  amount: z.coerce.number().positive(),
  income_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  receipt_url: z.string().url().max(2000).optional().nullable(),
});

export const listExpenseQuerySchema = z.object({
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
  categoryId: z.string().uuid().optional(),
});
