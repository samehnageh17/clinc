export type StatementStatus = "draft" | "finalized";

export interface MonthlyStatementSummary {
  id: string;
  tenantId: string;
  year: number;
  month: number;
  totalClinicIncome: number;
  totalExternalIncome: number;
  totalExpenses: number;
  netProfit: number;
  status: StatementStatus;
  generatedAt: Date;
  finalizedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DoctorSnapshot {
  doctorId: string;
  sessionsCount: number;
  grossIncome: number;
  doctorFeeTotal: number;
  clinicShare: number;
}

export interface ExpenseBreakdownRow {
  categoryName: string;
  totalAmount: number;
  expenseCount: number;
}

export interface MonthlyStatementDetail extends MonthlyStatementSummary {
  doctorSnapshots: DoctorSnapshot[];
  expenseBreakdown: ExpenseBreakdownRow[];
}
