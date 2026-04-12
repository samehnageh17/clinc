import type {
  ExpenseCategoryEntity,
  ExpenseCategoryWithSubs,
  ExpenseSubcategoryEntity,
} from "../entities/ExpenseCategoryEntity.js";

export interface IExpenseCategoryRepository {
  findAllActive(tenantId: string): Promise<ExpenseCategoryWithSubs[]>;
  findById(tenantId: string, id: string): Promise<ExpenseCategoryEntity | null>;
  create(tenantId: string, name: string): Promise<ExpenseCategoryEntity>;
  delete(tenantId: string, id: string): Promise<void>;
  addSubcategory(tenantId: string, categoryId: string, name: string): Promise<ExpenseSubcategoryEntity>;
  deleteSubcategory(tenantId: string, categoryId: string, subId: string): Promise<void>;
  countExpensesForCategory(tenantId: string, categoryId: string): Promise<number>;
  countExpensesForSubcategory(tenantId: string, subId: string): Promise<number>;
  validateSubcategoryBelongsToCategory(
    tenantId: string,
    categoryId: string,
    subcategoryId: string
  ): Promise<boolean>;
}
