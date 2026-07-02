export type RiskLevel = "low" | "medium" | "high" | "critical";
export type AccountRole = "master" | "pool_header" | "operating" | "restricted" | "petty_cash";
export type ForecastScenario = "best" | "expected" | "worst";
export type PaymentPriority = "critical" | "high" | "medium" | "low";

export interface TreasuryScope {
  organizationId: number;
  operatingUnitId?: number | null;
  baseCurrency: string;
  asOfDate: string;
}

export interface TreasuryBankAccount {
  id: number;
  accountName: string;
  bankName: string;
  accountNumber?: string;
  currency: string;
  currentBalance: number | string;
  minimumBalance?: number;
  targetBalance?: number;
  operatingUnitId?: number | null;
  parentAccountId?: number | null;
  role?: AccountRole;
  isActive?: boolean | number;
  isRestricted?: boolean;
  interestRate?: number;
  transferCost?: number;
  bankPriority?: number;
}

export interface TreasuryCashFlow {
  id: string | number;
  date: string;
  amount: number | string;
  currency: string;
  direction: "inflow" | "outflow";
  probability?: number;
  sourceType?: "payment" | "grant" | "payable" | "payroll" | "manual" | "bank";
  bankAccountId?: number;
  operatingUnitId?: number | null;
  isCommitted?: boolean;
}

export interface TreasuryPayable {
  id: number;
  payableNumber?: string;
  vendorId?: number;
  vendorName?: string;
  dueDate?: string | null;
  amount: number | string;
  currency: string;
  status?: string;
  paymentMethod?: "bank_transfer" | "check" | "cash" | "wire" | "mobile_money";
  priority?: PaymentPriority;
  bankAccountId?: number;
  discountAmount?: number;
  discountExpiresOn?: string;
  penaltyAmount?: number;
  penaltyStartsOn?: string;
  isCriticalVendor?: boolean;
}

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number | string;
  effectiveDate: string;
  source?: string;
}

export interface CurrencyAmount {
  currency: string;
  amount: number;
  amountInBaseCurrency: number;
}

export interface TreasuryInput {
  scope: TreasuryScope;
  bankAccounts: TreasuryBankAccount[];
  cashFlows?: TreasuryCashFlow[];
  payables?: TreasuryPayable[];
  exchangeRates?: ExchangeRate[];
}

export interface DailyCashForecast {
  date: string;
  scenario: ForecastScenario;
  openingBalance: number;
  inflows: number;
  outflows: number;
  closingBalance: number;
  minimumRequired: number;
  liquidityGap: number;
  riskLevel: RiskLevel;
}

export interface CashForecastSummary {
  scenario: ForecastScenario;
  horizonDays: number;
  startBalance: number;
  endingBalance: number;
  minimumProjectedBalance: number;
  maximumProjectedBalance: number;
  totalInflows: number;
  totalOutflows: number;
  daysBelowMinimum: number;
  forecast: DailyCashForecast[];
}

export interface LiquidityAnalysis {
  totalCash: number;
  unrestrictedCash: number;
  restrictedCash: number;
  totalPayables: number;
  overduePayables: number;
  workingCapital: number;
  currentRatio: number;
  cashCoverageDays: number;
  liquidityBuffer: number;
  riskLevel: RiskLevel;
  recommendations: string[];
}

export interface CashPoolSweep {
  fromAccountId: number;
  toAccountId: number;
  currency: string;
  amount: number;
  reason: string;
  estimatedCost: number;
}

export interface CashPoolingPlan {
  totalSurplus: number;
  totalDeficit: number;
  netPoolPosition: number;
  sweeps: CashPoolSweep[];
  unresolvedDeficits: Array<{ accountId: number; currency: string; deficit: number }>;
  recommendations: string[];
}

export interface FXExposurePosition {
  currency: string;
  cashBalance: number;
  expectedInflows: number;
  expectedOutflows: number;
  payableExposure: number;
  netExposure: number;
  baseCurrencyValue: number;
  percentageOfCash: number;
  riskLevel: RiskLevel;
}

export interface FXExposureReport {
  baseCurrency: string;
  totalExposureInBaseCurrency: number;
  positions: FXExposurePosition[];
  highRiskCurrencies: string[];
  recommendations: string[];
}

export interface OptimizedPayment {
  payableId: number;
  scheduledDate: string;
  amount: number;
  currency: string;
  priority: PaymentPriority;
  bankAccountId?: number;
  decision: "pay_now" | "schedule" | "defer" | "split";
  reason: string;
  liquidityImpact: number;
}

export interface PaymentOptimizationPlan {
  availableCash: number;
  minimumCashReserve: number;
  scheduledAmount: number;
  deferredAmount: number;
  optimizedPayments: OptimizedPayment[];
  warnings: string[];
}

export interface TreasuryDashboardSnapshot {
  scope: TreasuryScope;
  generatedAt: string;
  liquidity: LiquidityAnalysis;
  cashForecast: CashForecastSummary;
  cashPooling: CashPoolingPlan;
  fxExposure: FXExposureReport;
  paymentOptimization: PaymentOptimizationPlan;
  kpis: Array<{
    key: string;
    label: string;
    value: number;
    status: "good" | "watch" | "risk";
  }>;
  alerts: Array<{
    severity: "info" | "warning" | "critical";
    title: string;
    message: string;
  }>;
}

export function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toDateOnly(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const fromMs = new Date(`${from}T00:00:00.000Z`).getTime();
  const toMs = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.floor((toMs - fromMs) / 86400000);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function riskFromScore(score: number): RiskLevel {
  if (score >= 90) return "critical";
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

export function paymentPriority(payable: TreasuryPayable, asOfDate: string): PaymentPriority {
  if (payable.priority) return payable.priority;
  if (payable.isCriticalVendor) return "critical";
  if (!payable.dueDate) return "medium";

  const daysUntilDue = daysBetween(asOfDate, payable.dueDate);
  if (daysUntilDue <= 0) return "critical";
  if (daysUntilDue <= 3) return "high";
  if (daysUntilDue <= 14) return "medium";
  return "low";
}
