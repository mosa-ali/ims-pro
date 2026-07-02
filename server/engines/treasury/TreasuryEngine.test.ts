import { describe, expect, it } from "vitest";
import {
  CashForecastEngine,
  CashPoolingEngine,
  CurrencyEngine,
  FXExposureEngine,
  LiquidityAnalysisEngine,
  PaymentOptimizationEngine,
  TreasuryEngine,
  TreasuryInput,
} from "./index";

const input: TreasuryInput = {
  scope: {
    organizationId: 1,
    operatingUnitId: 10,
    baseCurrency: "USD",
    asOfDate: "2026-07-02",
  },
  exchangeRates: [
    { fromCurrency: "EUR", toCurrency: "USD", rate: 1.1, effectiveDate: "2026-07-01" },
    { fromCurrency: "YER", toCurrency: "USD", rate: 0.004, effectiveDate: "2026-07-01" },
  ],
  bankAccounts: [
    {
      id: 1,
      accountName: "Master USD",
      bankName: "Main Bank",
      currency: "USD",
      currentBalance: 100000,
      minimumBalance: 20000,
      targetBalance: 70000,
      role: "master",
      bankPriority: 1,
    },
    {
      id: 2,
      accountName: "Operating USD",
      bankName: "Main Bank",
      currency: "USD",
      currentBalance: 5000,
      minimumBalance: 10000,
      targetBalance: 25000,
      role: "operating",
      bankPriority: 2,
      transferCost: 5,
    },
    {
      id: 3,
      accountName: "Restricted EUR",
      bankName: "EU Bank",
      currency: "EUR",
      currentBalance: 30000,
      minimumBalance: 5000,
      role: "restricted",
      isRestricted: true,
    },
  ],
  cashFlows: [
    { id: "grant", date: "2026-07-05", amount: 25000, currency: "USD", direction: "inflow", probability: 1 },
    { id: "payroll", date: "2026-07-06", amount: 40000, currency: "USD", direction: "outflow", probability: 1 },
    { id: "eur-proc", date: "2026-07-07", amount: 10000, currency: "EUR", direction: "outflow", probability: 1 },
  ],
  payables: [
    {
      id: 10,
      payableNumber: "PAY-10",
      dueDate: "2026-07-02",
      amount: 30000,
      currency: "USD",
      isCriticalVendor: true,
    },
    {
      id: 11,
      payableNumber: "PAY-11",
      dueDate: "2026-08-15",
      amount: 70000,
      currency: "USD",
    },
    {
      id: 12,
      payableNumber: "PAY-12",
      dueDate: "2026-07-15",
      amount: 10000,
      currency: "EUR",
    },
  ],
};

describe("CurrencyEngine", () => {
  it("converts direct exchange rates", () => {
    const engine = new CurrencyEngine(input.exchangeRates);
    expect(engine.convert(100, "EUR", "USD", "2026-07-02").convertedAmount).toBeCloseTo(110);
  });

  it("converts inverse exchange rates", () => {
    const engine = new CurrencyEngine(input.exchangeRates);
    expect(engine.convert(110, "USD", "EUR", "2026-07-02").convertedAmount).toBeCloseTo(100);
  });

  it("returns identity conversion for same currency", () => {
    const engine = new CurrencyEngine(input.exchangeRates);
    expect(engine.convert(55, "USD", "USD", "2026-07-02").exchangeRate).toBe(1);
  });
});

describe("CashForecastEngine", () => {
  it("generates expected cash forecast", () => {
    const currency = new CurrencyEngine(input.exchangeRates);
    const engine = new CashForecastEngine(currency);
    const forecast = engine.generateForecast({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      cashFlows: input.cashFlows!,
      horizonDays: 7,
      minimumCashReserve: 20000,
    });

    expect(forecast.forecast).toHaveLength(8);
    expect(forecast.totalInflows).toBe(25000);
    expect(forecast.totalOutflows).toBe(51000);
  });

  it("makes worst-case cash lower than best-case cash", () => {
    const currency = new CurrencyEngine(input.exchangeRates);
    const engine = new CashForecastEngine(currency);
    const [best, , worst] = engine.generateScenarioSet({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      cashFlows: input.cashFlows!,
      horizonDays: 7,
      minimumCashReserve: 20000,
    });

    expect(best.endingBalance).toBeGreaterThan(worst.endingBalance);
  });
});

describe("LiquidityAnalysisEngine", () => {
  it("separates restricted and unrestricted cash", () => {
    const engine = new LiquidityAnalysisEngine(new CurrencyEngine(input.exchangeRates));
    const liquidity = engine.analyze({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      payables: input.payables!,
      cashFlows: input.cashFlows!,
    });

    expect(liquidity.restrictedCash).toBe(33000);
    expect(liquidity.unrestrictedCash).toBe(105000);
    expect(liquidity.totalPayables).toBe(111000);
  });

  it("reports overdue payables", () => {
    const engine = new LiquidityAnalysisEngine(new CurrencyEngine(input.exchangeRates));
    const liquidity = engine.analyze({
      scope: { ...input.scope, asOfDate: "2026-07-03" },
      bankAccounts: input.bankAccounts,
      payables: input.payables!,
      cashFlows: input.cashFlows!,
    });

    expect(liquidity.overduePayables).toBe(30000);
  });
});

describe("CashPoolingEngine", () => {
  it("creates sweeps from surplus account to deficit account", () => {
    const engine = new CashPoolingEngine(new CurrencyEngine(input.exchangeRates));
    const plan = engine.buildPoolingPlan({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
    });

    expect(plan.sweeps[0]).toMatchObject({
      fromAccountId: 1,
      toAccountId: 2,
      amount: 20000,
    });
  });
});

describe("FXExposureEngine", () => {
  it("calculates high-risk non-base exposure", () => {
    const engine = new FXExposureEngine(new CurrencyEngine(input.exchangeRates));
    const report = engine.analyzeExposure({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      cashFlows: input.cashFlows!,
      payables: input.payables!,
    });

    const eur = report.positions.find((position) => position.currency === "EUR");
    expect(eur?.netExposure).toBe(10000);
    expect(report.totalExposureInBaseCurrency).toBeGreaterThan(0);
  });
});

describe("PaymentOptimizationEngine", () => {
  it("pays critical overdue payments now", () => {
    const engine = new PaymentOptimizationEngine(new CurrencyEngine(input.exchangeRates));
    const plan = engine.optimize({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      payables: input.payables!,
      minimumCashReserve: 50000,
    });

    expect(plan.optimizedPayments.find((payment) => payment.payableId === 10)?.decision).toBe("pay_now");
  });

  it("defers payments when reserve would be breached", () => {
    const engine = new PaymentOptimizationEngine(new CurrencyEngine(input.exchangeRates));
    const plan = engine.optimize({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      payables: input.payables!,
      minimumCashReserve: 120000,
    });

    expect(plan.deferredAmount).toBeGreaterThan(0);
  });
});

describe("TreasuryEngine", () => {
  it("produces an enterprise treasury analysis", () => {
    const engine = new TreasuryEngine(input.exchangeRates);
    const result = engine.analyzeEnterpriseTreasury({ ...input, horizonDays: 14, minimumCashReserve: 20000 });

    expect(result.dashboard.kpis.length).toBeGreaterThan(0);
    expect(result.liquidity.totalCash).toBe(138000);
    expect(result.cashPooling.sweeps.length).toBe(1);
  });
});
