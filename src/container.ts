import { AuthService } from "./application/auth/AuthService.js";
import { FinanceService } from "./application/finance/FinanceService.js";
import { ExpenseCategoryRepository } from "./infrastructure/repositories/ExpenseCategoryRepository.js";
import { ExpenseRepository } from "./infrastructure/repositories/ExpenseRepository.js";
import { StatementRepository } from "./infrastructure/repositories/StatementRepository.js";
import { ExternalIncomeRepository } from "./infrastructure/repositories/ExternalIncomeRepository.js";
import { UserRepository } from "./infrastructure/repositories/UserRepository.js";
import { TenantRepository } from "./infrastructure/repositories/TenantRepository.js";
import { ClinicDoctorRepository } from "./infrastructure/repositories/ClinicDoctorRepository.js";
import { RefreshTokenRepository } from "./infrastructure/repositories/RefreshTokenRepository.js";
import { PasswordResetRepository } from "./infrastructure/repositories/PasswordResetRepository.js";
import { LoginAttemptRepository } from "./infrastructure/repositories/LoginAttemptRepository.js";

const userRepository = new UserRepository();
const tenantRepository = new TenantRepository();
const clinicDoctorRepository = new ClinicDoctorRepository();
const refreshTokenRepository = new RefreshTokenRepository();
const passwordResetRepository = new PasswordResetRepository();
const loginAttemptRepository = new LoginAttemptRepository();

const expenseRepository = new ExpenseRepository();
const expenseCategoryRepository = new ExpenseCategoryRepository();
const statementRepository = new StatementRepository(expenseRepository);
const externalIncomeRepository = new ExternalIncomeRepository();

export const authService = new AuthService(
  userRepository,
  tenantRepository,
  clinicDoctorRepository,
  refreshTokenRepository,
  passwordResetRepository,
  loginAttemptRepository
);

export const financeService = new FinanceService(
  expenseCategoryRepository,
  expenseRepository,
  statementRepository,
  externalIncomeRepository
);

export const repos = {
  users: userRepository,
  tenants: tenantRepository,
  clinicDoctors: clinicDoctorRepository,
  expense: expenseRepository,
};
