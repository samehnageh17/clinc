export interface ExpenseCategoryEntity {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseSubcategoryEntity {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseCategoryWithSubs extends ExpenseCategoryEntity {
  subcategories: ExpenseSubcategoryEntity[];
}
