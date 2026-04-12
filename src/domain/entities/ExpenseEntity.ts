export interface ExpenseEntity {
  id: string;
  tenantId: string;
  categoryId: string;
  subcategoryId: string;
  description: string;
  amount: number;
  expenseDate: Date;
  notes: string | null;
  receiptUrl: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseWithCategories extends ExpenseEntity {
  categoryName: string;
  subcategoryName: string;
}
