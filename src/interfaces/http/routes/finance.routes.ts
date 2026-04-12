import { ClinicDoctorPermission } from "@prisma/client";
import { Router } from "express";
import { financeService } from "../../../container.js";
import { authRequired } from "../../../middleware/auth.middleware.js";
import { loadClinicPermissions, requirePermission } from "../../../middleware/permission.middleware.js";
import { resolveTenantContext, requireTenantId } from "../../../middleware/tenant.middleware.js";
import { validateBody, validateQuery } from "../../../middleware/validate.middleware.js";
import {
  expenseCategoryCreateSchema,
  expenseCreateSchema,
  expenseSubcategoryCreateSchema,
  externalIncomeCreateSchema,
  listExpenseQuerySchema,
  statementGenerateSchema,
} from "../schemas/finance.schemas.js";

export function financeRoutes(): Router {
  const r = Router();

  const chain = [authRequired, resolveTenantContext, requireTenantId, loadClinicPermissions];

  r.get(
    "/expense-categories",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_statements),
    async (req, res, next) => {
      try {
        const data = await financeService.listCategories(req.tenantId!);
        res.json(data);
      } catch (e) {
        next(e);
      }
    }
  );

  r.post(
    "/expense-categories",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_statements),
    validateBody(expenseCategoryCreateSchema),
    async (req, res, next) => {
      try {
        const { name } = req.body as { name: string };
        const row = await financeService.addCategory(req.tenantId!, name);
        res.status(201).json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  r.delete(
    "/expense-categories/:categoryId",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_statements),
    async (req, res, next) => {
      try {
        await financeService.deleteCategory(req.tenantId!, req.params.categoryId);
        res.status(204).end();
      } catch (e) {
        next(e);
      }
    }
  );

  r.post(
    "/expense-categories/:categoryId/subcategories",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_statements),
    validateBody(expenseSubcategoryCreateSchema),
    async (req, res, next) => {
      try {
        const { name } = req.body as { name: string };
        const row = await financeService.addSubcategory(req.tenantId!, req.params.categoryId, name);
        res.status(201).json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  r.delete(
    "/expense-categories/:categoryId/subcategories/:subId",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_statements),
    async (req, res, next) => {
      try {
        await financeService.deleteSubcategory(req.tenantId!, req.params.categoryId, req.params.subId);
        res.status(204).end();
      } catch (e) {
        next(e);
      }
    }
  );

  r.get(
    "/expenses",
    ...chain,
    requirePermission(ClinicDoctorPermission.view_statements),
    validateQuery(listExpenseQuerySchema),
    async (req, res, next) => {
      try {
        const q = req.validatedQuery as { year: number; month: number; categoryId?: string };
        const data = await financeService.listExpenses(req.tenantId!, q.year, q.month, q.categoryId);
        res.json(data);
      } catch (e) {
        next(e);
      }
    }
  );

  r.post(
    "/expenses",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_statements),
    validateBody(expenseCreateSchema),
    async (req, res, next) => {
      try {
        const b = req.body as {
          description: string;
          category_id: string;
          subcategory_id: string;
          amount: number;
          expense_date: string;
          notes?: string | null;
          receipt_url?: string | null;
        };
        const row = await financeService.createExpense(req.tenantId!, req.user!.id, {
          description: b.description,
          categoryId: b.category_id,
          subcategoryId: b.subcategory_id,
          amount: b.amount,
          expenseDate: b.expense_date,
          notes: b.notes,
          receiptUrl: b.receipt_url,
        });
        res.status(201).json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  r.delete(
    "/expenses/:id",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_statements),
    async (req, res, next) => {
      try {
        await financeService.deleteExpense(req.tenantId!, req.params.id);
        res.status(204).end();
      } catch (e) {
        next(e);
      }
    }
  );

  r.post(
    "/statements/generate",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_statements),
    validateBody(statementGenerateSchema),
    async (req, res, next) => {
      try {
        const b = req.body as { year: number; month: number };
        const row = await financeService.generateStatement(req.tenantId!, b.year, b.month);
        res.status(201).json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  r.get(
    "/statements",
    ...chain,
    requirePermission(ClinicDoctorPermission.view_statements),
    async (req, res, next) => {
      try {
        const rows = await financeService.listStatements(req.tenantId!);
        res.json(rows);
      } catch (e) {
        next(e);
      }
    }
  );

  r.get(
    "/statements/:year/:month",
    ...chain,
    requirePermission(ClinicDoctorPermission.view_statements),
    async (req, res, next) => {
      try {
        const year = Number(req.params.year);
        const month = Number(req.params.month);
        const row = await financeService.getStatement(req.tenantId!, year, month);
        res.json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  r.patch(
    "/statements/:id/finalize",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_statements),
    async (req, res, next) => {
      try {
        const row = await financeService.finalizeStatement(req.tenantId!, req.params.id);
        res.json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  r.post(
    "/external-income",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_statements),
    validateBody(externalIncomeCreateSchema),
    async (req, res, next) => {
      try {
        const b = req.body as {
          source_name: string;
          description?: string | null;
          amount: number;
          income_date: string;
          receipt_url?: string | null;
        };
        const row = await financeService.addExternalIncome(req.tenantId!, {
          sourceName: b.source_name,
          description: b.description,
          amount: b.amount,
          incomeDate: b.income_date,
          receiptUrl: b.receipt_url,
        });
        res.status(201).json(row);
      } catch (e) {
        next(e);
      }
    }
  );

  r.get(
    "/external-income",
    ...chain,
    requirePermission(ClinicDoctorPermission.view_statements),
    validateQuery(listExpenseQuerySchema),
    async (req, res, next) => {
      try {
        const q = req.validatedQuery as { year: number; month: number };
        const rows = await financeService.listExternalIncome(req.tenantId!, q.year, q.month);
        res.json(rows);
      } catch (e) {
        next(e);
      }
    }
  );

  r.delete(
    "/external-income/:id",
    ...chain,
    requirePermission(ClinicDoctorPermission.manage_statements),
    async (req, res, next) => {
      try {
        await financeService.deleteExternalIncome(req.tenantId!, req.params.id);
        res.status(204).end();
      } catch (e) {
        next(e);
      }
    }
  );

  return r;
}
