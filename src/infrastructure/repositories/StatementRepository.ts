import { AppointmentStatus, StatementStatus } from "@prisma/client";
import { ConflictError, NotFoundError } from "../../domain/errors/AppError.js";
import type { IStatementRepository } from "../../domain/repositories/IStatementRepository.js";
import type {
  MonthlyStatementDetail,
  MonthlyStatementSummary,
} from "../../domain/entities/StatementEntity.js";
import { prisma } from "../database/prisma.js";
import type { IExpenseRepository } from "../../domain/repositories/IExpenseRepository.js";

function toSummary(s: {
  id: string;
  tenantId: string;
  year: number;
  month: number;
  totalClinicIncome: unknown;
  totalExternalIncome: unknown;
  totalExpenses: unknown;
  netProfit: unknown;
  status: StatementStatus;
  generatedAt: Date;
  finalizedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): MonthlyStatementSummary {
  return {
    id: s.id,
    tenantId: s.tenantId,
    year: s.year,
    month: s.month,
    totalClinicIncome: Number(s.totalClinicIncome),
    totalExternalIncome: Number(s.totalExternalIncome),
    totalExpenses: Number(s.totalExpenses),
    netProfit: Number(s.netProfit),
    status: s.status === "finalized" ? "finalized" : "draft",
    generatedAt: s.generatedAt,
    finalizedAt: s.finalizedAt,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export class StatementRepository implements IStatementRepository {
  constructor(private readonly expenseRepo: IExpenseRepository) {}

  async findByPeriod(tenantId: string, year: number, month: number) {
    const row = await prisma.monthlyStatement.findUnique({
      where: { tenantId_year_month: { tenantId, year, month } },
    });
    return row ? toSummary(row) : null;
  }

  async findAll(tenantId: string) {
    const rows = await prisma.monthlyStatement.findMany({
      where: { tenantId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return rows.map(toSummary);
  }

  async isFinalized(tenantId: string, year: number, month: number): Promise<boolean> {
    const row = await prisma.monthlyStatement.findUnique({
      where: { tenantId_year_month: { tenantId, year, month } },
    });
    return row?.status === "finalized";
  }

  async generate(tenantId: string, year: number, month: number): Promise<MonthlyStatementSummary> {
    const existing = await prisma.monthlyStatement.findUnique({
      where: { tenantId_year_month: { tenantId, year, month } },
    });
    if (existing?.status === "finalized") {
      throw new ConflictError("Statement for this period is finalized");
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const [clinicAgg, externalAgg, doctors, breakdown] = await Promise.all([
      prisma.appointment.aggregate({
        where: {
          tenantId,
          status: AppointmentStatus.done,
          appointmentDate: { gte: start, lt: end },
        },
        _sum: { feeCharged: true },
      }),
      prisma.externalIncome.aggregate({
        where: { tenantId, incomeDate: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      prisma.clinicDoctor.findMany({ where: { tenantId, isActive: true } }),
      this.expenseRepo.sumByCategory(tenantId, year, month),
    ]);

    const totalClinicIncome = Number(clinicAgg._sum.feeCharged ?? 0);
    const totalExternalIncome = Number(externalAgg._sum.amount ?? 0);
    const totalExpenses = await this.expenseRepo.sumForMonth(tenantId, year, month);
    const netProfit = totalClinicIncome + totalExternalIncome - totalExpenses;

    const doctorStats = await Promise.all(
      doctors.map(async (d) => {
        const agg = await prisma.appointment.aggregate({
          where: {
            tenantId,
            doctorId: d.id,
            status: AppointmentStatus.done,
            appointmentDate: { gte: start, lt: end },
          },
          _count: { _all: true },
          _sum: { feeCharged: true },
        });
        const sessionsCount = agg._count._all;
        const grossIncome = Number(agg._sum.feeCharged ?? 0);
        const feePer = Number(d.feePerSession);
        const doctorFeeTotal = sessionsCount * feePer;
        const clinicShare = grossIncome - doctorFeeTotal;
        return {
          doctorId: d.id,
          sessionsCount,
          grossIncome,
          doctorFeeTotal,
          clinicShare,
        };
      })
    );

    return prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.monthlyStatement.delete({ where: { id: existing.id } });
      }

      const ms = await tx.monthlyStatement.create({
        data: {
          tenantId,
          year,
          month,
          totalClinicIncome,
          totalExternalIncome,
          totalExpenses,
          netProfit,
          status: StatementStatus.draft,
        },
      });

      await tx.statementSnapshot.createMany({
        data: doctorStats.map((ds) => ({
          tenantId,
          statementId: ms.id,
          doctorId: ds.doctorId,
          sessionsCount: ds.sessionsCount,
          grossIncome: ds.grossIncome,
          doctorFeeTotal: ds.doctorFeeTotal,
          clinicShare: ds.clinicShare,
        })),
      });

      if (breakdown.length) {
        await tx.statementExpenseBreakdown.createMany({
          data: breakdown.map((b) => ({
            tenantId,
            statementId: ms.id,
            categoryId: b.categoryId,
            categoryName: b.categoryName,
            totalAmount: b.totalAmount,
            expenseCount: b.expenseCount,
          })),
        });
      }

      return toSummary(ms);
    });
  }

  async finalize(tenantId: string, id: string): Promise<MonthlyStatementSummary> {
    const row = await prisma.monthlyStatement.findFirst({ where: { tenantId, id } });
    if (!row) throw new NotFoundError("Statement not found");
    if (row.status === "finalized") throw new ConflictError("Already finalized");
    const updated = await prisma.monthlyStatement.update({
      where: { id },
      data: { status: StatementStatus.finalized, finalizedAt: new Date() },
    });
    return toSummary(updated);
  }

  async findWithBreakdown(tenantId: string, year: number, month: number): Promise<MonthlyStatementDetail | null> {
    const ms = await prisma.monthlyStatement.findUnique({
      where: { tenantId_year_month: { tenantId, year, month } },
      include: {
        snapshots: true,
        expenseBreakdowns: true,
      },
    });
    if (!ms) return null;
    return {
      ...toSummary(ms),
      doctorSnapshots: ms.snapshots.map((s) => ({
        doctorId: s.doctorId,
        sessionsCount: s.sessionsCount,
        grossIncome: Number(s.grossIncome),
        doctorFeeTotal: Number(s.doctorFeeTotal),
        clinicShare: Number(s.clinicShare),
      })),
      expenseBreakdown: ms.expenseBreakdowns.map((e) => ({
        categoryName: e.categoryName,
        totalAmount: Number(e.totalAmount),
        expenseCount: e.expenseCount,
      })),
    };
  }
}
