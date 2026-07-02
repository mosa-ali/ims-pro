import { describe, expect, it } from "vitest";
import {
  CashForecastEngine,
  CashPoolingEngine,
  CashPositionEngine,
  CurrencyEngine,
  FXExposureEngine,
  LiquidityAnalysisEngine,
  PaymentOptimizationEngine,
  TreasuryComplianceEngine,
  TreasuryEngine,
  TreasuryInput,
  TreasuryLimitsEngine,
  TreasuryPolicyEngine,
  TreasuryScenarioBuilder,
} from "./index";
import { BankRiskEngine } from "./BankRiskEngine";
import { FinancialIntelligencePlatform } from "../finance/FinancialIntelligencePlatform";

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
      organizationId: 1,
      operatingUnitId: 10,
      accountName: "Master USD",
      bankName: "Main Bank",
      currency: "USD",
      currentBalance: 100000,
      minimumBalance: 20000,
      targetBalance: 70000,
      role: "master",
      bankPriority: 1,
      countryCode: "US",
      creditRating: "A",
      liquidityRating: "strong",
    },
    {
      id: 2,
      organizationId: 1,
      operatingUnitId: 10,
      accountName: "Operating USD",
      bankName: "Main Bank",
      currency: "USD",
      currentBalance: 5000,
      minimumBalance: 10000,
      targetBalance: 25000,
      role: "operating",
      bankPriority: 2,
      transferCost: 5,
      countryCode: "US",
      creditRating: "A",
      liquidityRating: "strong",
    },
    {
      id: 3,
      organizationId: 1,
      operatingUnitId: 10,
      accountName: "Restricted EUR",
      bankName: "EU Bank",
      currency: "EUR",
      currentBalance: 30000,
      minimumBalance: 5000,
      role: "restricted",
      isRestricted: true,
      countryCode: "DE",
      creditRating: "BBB",
      liquidityRating: "adequate",
    },
  ],
  cashFlows: [
    { id: "today-receipt", organizationId: 1, operatingUnitId: 10, date: "2026-07-02", amount: 5000, currency: "USD", direction: "inflow", probability: 1 },
    { id: "today-payment", organizationId: 1, operatingUnitId: 10, date: "2026-07-02", amount: 2000, currency: "USD", direction: "outflow", probability: 1 },
    { id: "grant", organizationId: 1, operatingUnitId: 10, date: "2026-07-05", amount: 25000, currency: "USD", direction: "inflow", probability: 1, scenarioTags: ["grant"] },
    { id: "payroll", organizationId: 1, operatingUnitId: 10, date: "2026-07-06", amount: 40000, currency: "USD", direction: "outflow", probability: 1, scenarioTags: ["payroll"] },
    { id: "eur-proc", organizationId: 1, operatingUnitId: 10, date: "2026-07-07", amount: 10000, currency: "EUR", direction: "outflow", probability: 1, scenarioTags: ["procurement"] },
  ],
  payables: [
    {
      id: 10,
      organizationId: 1,
      operatingUnitId: 10,
      payableNumber: "PAY-10",
      dueDate: "2026-07-02",
      amount: 30000,
      currency: "USD",
      isCriticalVendor: true,
    },
    {
      id: 11,
      organizationId: 1,
      operatingUnitId: 10,
      payableNumber: "PAY-11",
      dueDate: "2026-08-15",
      amount: 70000,
      currency: "USD",
    },
    {
      id: 12,
      organizationId: 1,
      operatingUnitId: 10,
      payableNumber: "PAY-12",
      dueDate: "2026-07-15",
      amount: 10000,
      currency: "EUR",
    },
  ],
  policy: {
    minimumCashCoverageDays: 30,
    minimumLiquidityRatio: 1.5,
    minimumCashReserve: 20000,
    maximumFXExposurePercent: 20,
    maximumBankExposurePercent: 35,
    maximumCountryExposurePercent: 40,
    staleExchangeRateDays: 7,
    restrictedCashUsable: false,
    requireDualApprovalAboveAmount: 50000,
  },
  countryRisks: [
    { countryCode: "US", riskLevel: "low" },
    { countryCode: "DE", riskLevel: "low" },
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
    expect(forecast.totalInflows).toBe(30000);
    expect(forecast.totalOutflows).toBe(53000);
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

describe("TreasuryPolicyEngine", () => {
  it("resolves configurable policy defaults without hardcoded callers", () => {
    const policy = new TreasuryPolicyEngine().resolvePolicy({ maximumBankExposurePercent: 25 });

    expect(policy.maximumBankExposurePercent).toBe(25);
    expect(policy.minimumLiquidityRatio).toBe(1.5);
  });
});

describe("CashPositionEngine", () => {
  it("publishes actual daily usable and free cash", () => {
    const engine = new CashPositionEngine(new CurrencyEngine(input.exchangeRates));
    const position = engine.generateSnapshot({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      cashFlows: input.cashFlows!,
      payables: input.payables!,
    });

    expect(position.availableCash).toBe(141000);
    expect(position.blockedCash).toBe(33000);
    expect(position.freeCash).toBe(78000);
  });
});

describe("BankRiskEngine", () => {
  it("flags concentration risk across multi-bank balances", () => {
    const engine = new BankRiskEngine(new CurrencyEngine(input.exchangeRates));
    const risks = engine.assess({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      policy: new TreasuryPolicyEngine().resolvePolicy(input.policy),
      countryRisks: input.countryRisks,
    });

    const mainBank = risks.find((risk) => risk.bankName === "Main Bank");
    expect(mainBank?.exposurePercentage).toBeGreaterThan(35);
    expect(mainBank?.concentrationRisk).toBe("high");
  });
});

describe("TreasuryLimitsEngine", () => {
  it("reports configurable treasury policy violations", () => {
    const currency = new CurrencyEngine(input.exchangeRates);
    const liquidity = new LiquidityAnalysisEngine(currency).analyze({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      payables: input.payables!,
      cashFlows: input.cashFlows!,
    });
    const fxExposure = new FXExposureEngine(currency).analyzeExposure({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      cashFlows: input.cashFlows!,
      payables: input.payables!,
    });
    const bankRisks = new BankRiskEngine(currency).assess({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      policy: new TreasuryPolicyEngine().resolvePolicy(input.policy),
    });

    const limits = new TreasuryLimitsEngine().evaluate({
      policy: new TreasuryPolicyEngine().resolvePolicy(input.policy),
      liquidity,
      fxExposure,
      bankRisks,
    });

    expect(limits.passed).toBe(false);
    expect(limits.violations.some((violation) => violation.policyKey === "bank_concentration")).toBe(true);
  });
});

describe("TreasuryComplianceEngine", () => {
  it("requires approval for large optimized payments", () => {
    const policy = new TreasuryPolicyEngine().resolvePolicy(input.policy);
    const paymentOptimization = new PaymentOptimizationEngine(new CurrencyEngine(input.exchangeRates)).optimize({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      payables: input.payables!,
      minimumCashReserve: policy.minimumCashReserve,
    });
    const compliance = new TreasuryComplianceEngine().evaluate({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      payables: input.payables!,
      paymentOptimization,
      policy,
    });

    expect(compliance.findings.some((finding) => finding.code === "DUAL_APPROVAL_REQUIRED")).toBe(true);
  });
});

describe("TreasuryScenarioBuilder", () => {
  it("models grant delay and currency shock scenarios", () => {
    const currency = new CurrencyEngine(input.exchangeRates);
    const builder = new TreasuryScenarioBuilder(
      new CashForecastEngine(currency),
      new LiquidityAnalysisEngine(currency),
      new TreasuryLimitsEngine(),
    );
    const result = builder.runScenario({
      ...input,
      policy: new TreasuryPolicyEngine().resolvePolicy(input.policy),
      horizonDays: 7,
      scenario: {
        id: "grant-delay",
        name: "Grant delayed and EUR shock",
        inflowMultiplier: 0,
        currencyShock: { EUR: 1.2 },
        tags: ["grant"],
      },
    });

    expect(result.forecast.totalInflows).toBe(5000);
    expect(result.liquidity.totalCash).toBeGreaterThan(138000);
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
    expect(result.cashPosition.freeCash).toBe(78000);
    expect(result.limits.passed).toBe(false);
    expect(result.bankRisks.some((risk) => risk.bankName === "Main Bank")).toBe(true);
    expect(result.advisorInsight.narrative.length).toBeGreaterThan(40);
    expect(result.workflow.steps.map((step) => step.key)).toEqual([
      "forecast",
      "review",
      "approve",
      "publish",
      "execute",
      "reconcile",
    ]);
  });

  it("keeps organization and operating unit scoped data isolated in analysis input", () => {
    const engine = new TreasuryEngine(input.exchangeRates);
    const isolatedInput: TreasuryInput = {
      ...input,
      bankAccounts: input.bankAccounts.filter((account) => {
        return account.organizationId === input.scope.organizationId && account.operatingUnitId === input.scope.operatingUnitId;
      }),
      cashFlows: input.cashFlows?.filter((flow) => {
        return flow.organizationId === input.scope.organizationId && flow.operatingUnitId === input.scope.operatingUnitId;
      }),
      payables: input.payables?.filter((payable) => {
        return payable.organizationId === input.scope.organizationId && payable.operatingUnitId === input.scope.operatingUnitId;
      }),
    };
    const result = engine.analyzeEnterpriseTreasury({ ...isolatedInput, horizonDays: 7 });

    expect(result.dashboard.scope.organizationId).toBe(1);
    expect(result.dashboard.scope.operatingUnitId).toBe(10);
  });
});

describe("FinancialIntelligencePlatform", () => {
  it("orchestrates treasury intelligence through the finance platform layer", () => {
    const platform = new FinancialIntelligencePlatform({ exchangeRates: input.exchangeRates });
    const result = platform.analyzeTreasury({ ...input, horizonDays: 7 });

    expect(result.intelligenceScope.organizationId).toBe(1);
    expect(result.treasury.advisorInsight.title).toBeTruthy();
  });
});
