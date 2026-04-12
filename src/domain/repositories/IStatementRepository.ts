import type { MonthlyStatementDetail, MonthlyStatementSummary } from "../entities/StatementEntity.js";

export interface IStatementRepository {
  findByPeriod(tenantId: string, year: number, month: number): Promise<MonthlyStatementSummary | null>;
  findAll(tenantId: string): Promise<MonthlyStatementSummary[]>;
  generate(tenantId: string, year: number, month: number): Promise<MonthlyStatementSummary>;
  finalize(tenantId: string, id: string): Promise<MonthlyStatementSummary>;
  isFinalized(tenantId: string, year: number, month: number): Promise<boolean>;
  findWithBreakdown(tenantId: string, year: number, month: number): Promise<MonthlyStatementDetail | null>;
}
