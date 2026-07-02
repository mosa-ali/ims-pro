/**
 * CashPlanningEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Cash Planning and Liquidity Forecasting
 *
 * PHASE 6: Enterprise Performance Management
 *
 * Forecasts cash position by combining:
 *  - Expected donor receipts (grant disbursement schedule)
 *  - Scheduled supplier payments (committed POs, invoices)
 *  - Payroll (monthly, based on staffing plan)
 *  - Tax obligations
 *  - Advance disbursements and settlements
 *  - Minimum cash balance requirements
 *  - Borrowing requirements (if cash falls below minimum)
 *  - Liquidity gap identification
 *
 * Critical for NGOs managing multiple donors and currencies.
 */

import type { ILogger, IConfigService, RepositoryScope } from '../PHASE3_HARDENED/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface CashPlan {
  organizationId: number;
  currency: string;
  planDate: string;
  forecastMonths: number;
  openingBalance: number;
  months: CashPlanMonth[];
  summary: CashPlanSummary;
  alerts: CashAlert[];
}

export interface CashPlanMonth {
  month: string;           // YYYY-MM

  // Inflows
  donorReceipts: number;
  otherIncome: number;
  totalInflows: number;

  // Outflows
  supplierPayments: number;
  payroll: number;
  taxes: number;
  advances: number;
  otherExpenses: number;
  totalOutflows: number;

  // Position
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
  minimumRequired: number;
  surplus: number;         // closingBalance - minimumRequired
  liquidityGap: number;   // max(0, minimumRequired - closingBalance)
  borrowingNeeded: number; // = liquidityGap if > 0
}

export interface CashPlanSummary {
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  lowestBalance: number;
  lowestBalanceMonth: string;
  monthsWithGap: number;
  totalBorrowingNeeded: number;
  averageMonthlyBurn: number;
  monthsOfRunway: number;  // How many months can operate at current rate
}

export interface CashAlert {
  type: 'liquidity_gap' | 'low_balance' | 'donor_delay_risk' | 'payroll_shortfall' | 'high_concentration';
  severity: 'info' | 'warning' | 'critical';
  month: string;
  message: string;
  amount: number;
}

export interface DonorReceiptSchedule {
  donorId: number;
  donorName: string;
  grantId: number;
  installments: Array<{
    expectedDate: string;
    amount: number;
    currency: string;
    probability: number;  // 0-1 (confirmed=1, expected=0.8, uncertain=0.5)
    status: 'confirmed' | 'expected' | 'uncertain' | 'received' | 'delayed';
  }>;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface ICashPlanningRepository {
  getCurrentCashBalance(currency: string, scope: RepositoryScope): Promise<number>;
  getMinimumCashBalance(scope: RepositoryScope): Promise<number>;
  getDonorReceiptSchedule(scope: RepositoryScope): Promise<DonorReceiptSchedule[]>;
  getScheduledPayments(fromMonth: string, toMonth: string, scope: RepositoryScope): Promise<Array<{ month: string; amount: number }>>;
  getPayrollForecast(fromMonth: string, toMonth: string, scope: RepositoryScope): Promise<Array<{ month: string; amount: number }>>;
  getTaxObligations(fromMonth: string, toMonth: string, scope: RepositoryScope): Promise<Array<{ month: string; amount: number }>>;
  getAdvanceForecast(fromMonth: string, toMonth: string, scope: RepositoryScope): Promise<Array<{ month: string; disbursements: number; settlements: number }>>;
  getOtherExpenses(fromMonth: string, toMonth: string, scope: RepositoryScope): Promise<Array<{ month: string; amount: number }>>;
}

export interface CashPlanningDependencies {
  cashRepo: ICashPlanningRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class CashPlanningEngine {
  private repo: ICashPlanningRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: CashPlanningDependencies) {
    this.repo = deps.cashRepo;
    this.logger = deps.logger.child({ service: 'CashPlanningEngine' });
    this.config = deps.config;
  }

  /**
   * Generate a complete cash plan for the next N months.
   */
  async generatePlan(
    forecastMonths: number,
    currency: string,
    scope: RepositoryScope,
  ): Promise<CashPlan> {
    const today = new Date();
    const startMonth = today.toISOString().slice(0, 7);
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + forecastMonths);
    const endMonth = endDate.toISOString().slice(0, 7);

    // Fetch all data sources
    const [
      openingBalance,
      minimumRequired,
      donorSchedules,
      payments,
      payroll,
      taxes,
      advances,
      otherExpenses,
    ] = await Promise.all([
      this.repo.getCurrentCashBalance(currency, scope),
      this.repo.getMinimumCashBalance(scope),
      this.repo.getDonorReceiptSchedule(scope),
      this.repo.getScheduledPayments(startMonth, endMonth, scope),
      this.repo.getPayrollForecast(startMonth, endMonth, scope),
      this.repo.getTaxObligations(startMonth, endMonth, scope),
      this.repo.getAdvanceForecast(startMonth, endMonth, scope),
      this.repo.getOtherExpenses(startMonth, endMonth, scope),
    ]);

    // Build lookup maps
    const paymentMap = new Map(payments.map(p => [p.month, p.amount]));
    const payrollMap = new Map(payroll.map(p => [p.month, p.amount]));
    const taxMap = new Map(taxes.map(t => [t.month, t.amount]));
    const advanceMap = new Map(advances.map(a => [a.month, a]));
    const otherMap = new Map(otherExpenses.map(o => [o.month, o.amount]));

    // Aggregate donor receipts by month
    const donorReceiptsByMonth = new Map<string, number>();
    for (const schedule of donorSchedules) {
      for (const inst of schedule.installments) {
        if (inst.status === 'received') continue;
        const month = inst.expectedDate.slice(0, 7);
        const weighted = inst.amount * inst.probability;
        donorReceiptsByMonth.set(month, (donorReceiptsByMonth.get(month) || 0) + weighted);
      }
    }

    // Generate monthly cash plan
    const months: CashPlanMonth[] = [];
    let runningBalance = openingBalance;
    const alerts: CashAlert[] = [];

    for (let i = 0; i < forecastMonths; i++) {
      const d = new Date(today);
      d.setMonth(d.getMonth() + i);
      const month = d.toISOString().slice(0, 7);

      const donorReceipts = donorReceiptsByMonth.get(month) || 0;
      const totalInflows = donorReceipts;

      const supplierPay = paymentMap.get(month) || 0;
      const payrollAmt = payrollMap.get(month) || 0;
      const taxAmt = taxMap.get(month) || 0;
      const advData = advanceMap.get(month);
      const advanceAmt = advData ? advData.disbursements - advData.settlements : 0;
      const otherAmt = otherMap.get(month) || 0;
      const totalOutflows = supplierPay + payrollAmt + taxAmt + Math.max(0, advanceAmt) + otherAmt;

      const netCashFlow = totalInflows - totalOutflows;
      const closingBalance = runningBalance + netCashFlow;
      const surplus = closingBalance - minimumRequired;
      const liquidityGap = Math.max(0, minimumRequired - closingBalance);

      months.push({
        month,
        donorReceipts: Math.round(donorReceipts * 100) / 100,
        otherIncome: 0,
        totalInflows: Math.round(totalInflows * 100) / 100,
        supplierPayments: Math.round(supplierPay * 100) / 100,
        payroll: Math.round(payrollAmt * 100) / 100,
        taxes: Math.round(taxAmt * 100) / 100,
        advances: Math.round(Math.max(0, advanceAmt) * 100) / 100,
        otherExpenses: Math.round(otherAmt * 100) / 100,
        totalOutflows: Math.round(totalOutflows * 100) / 100,
        netCashFlow: Math.round(netCashFlow * 100) / 100,
        openingBalance: Math.round(runningBalance * 100) / 100,
        closingBalance: Math.round(closingBalance * 100) / 100,
        minimumRequired,
        surplus: Math.round(surplus * 100) / 100,
        liquidityGap: Math.round(liquidityGap * 100) / 100,
        borrowingNeeded: Math.round(liquidityGap * 100) / 100,
      });

      // Generate alerts
      if (liquidityGap > 0) {
        alerts.push({
          type: 'liquidity_gap',
          severity: liquidityGap > minimumRequired ? 'critical' : 'warning',
          month,
          message: `Liquidity gap of ${liquidityGap.toFixed(0)} ${currency} projected`,
          amount: liquidityGap,
        });
      }

      if (closingBalance < 0) {
        alerts.push({
          type: 'low_balance',
          severity: 'critical',
          month,
          message: `Negative cash balance projected: ${closingBalance.toFixed(0)} ${currency}`,
          amount: closingBalance,
        });
      }

      if (payrollAmt > 0 && closingBalance < payrollAmt) {
        alerts.push({
          type: 'payroll_shortfall',
          severity: 'critical',
          month,
          message: `Insufficient cash for payroll: need ${payrollAmt.toFixed(0)}, have ${Math.max(0, runningBalance).toFixed(0)}`,
          amount: payrollAmt - Math.max(0, runningBalance),
        });
      }

      runningBalance = closingBalance;
    }

    // Summary
    const totalInflows = months.reduce((s, m) => s + m.totalInflows, 0);
    const totalOutflows = months.reduce((s, m) => s + m.totalOutflows, 0);
    const lowestMonth = months.reduce((min, m) => m.closingBalance < min.closingBalance ? m : min, months[0]);
    const monthsWithGap = months.filter(m => m.liquidityGap > 0).length;
    const totalBorrowing = months.reduce((s, m) => s + m.borrowingNeeded, 0);
    const avgBurn = totalOutflows / Math.max(1, forecastMonths);
    const runway = openingBalance > 0 && avgBurn > 0 ? openingBalance / avgBurn : 0;

    const summary: CashPlanSummary = {
      totalInflows: Math.round(totalInflows * 100) / 100,
      totalOutflows: Math.round(totalOutflows * 100) / 100,
      netCashFlow: Math.round((totalInflows - totalOutflows) * 100) / 100,
      lowestBalance: Math.round(lowestMonth.closingBalance * 100) / 100,
      lowestBalanceMonth: lowestMonth.month,
      monthsWithGap,
      totalBorrowingNeeded: Math.round(totalBorrowing * 100) / 100,
      averageMonthlyBurn: Math.round(avgBurn * 100) / 100,
      monthsOfRunway: Math.round(runway * 10) / 10,
    };

    this.logger.info('Cash plan generated', {
      forecastMonths,
      openingBalance,
      lowestBalance: summary.lowestBalance,
      monthsWithGap,
      alertCount: alerts.length,
    });

    return {
      organizationId: scope.organizationId,
      currency,
      planDate: new Date().toISOString(),
      forecastMonths,
      openingBalance,
      months,
      summary,
      alerts,
    };
  }
}
