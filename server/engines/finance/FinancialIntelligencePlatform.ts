import {
  EnterpriseTreasuryAnalysis,
  ExchangeRate,
  TreasuryInput,
} from "../treasury";
import { TreasuryEngine } from "../treasury";

export interface FinancialIntelligencePlatformResult {
  treasury: EnterpriseTreasuryAnalysis;
  generatedAt: string;
  intelligenceScope: {
    organizationId: number;
    operatingUnitId?: number | null;
    baseCurrency: string;
  };
}

export class FinancialIntelligencePlatform {
  private readonly treasuryEngine: TreasuryEngine;

  constructor(input: {
    treasuryEngine?: TreasuryEngine;
    exchangeRates?: ExchangeRate[];
  } = {}) {
    this.treasuryEngine = input.treasuryEngine ?? new TreasuryEngine(input.exchangeRates ?? []);
  }

  analyzeTreasury(input: TreasuryInput & {
    horizonDays?: number;
    minimumCashReserve?: number;
  }): FinancialIntelligencePlatformResult {
    return {
      treasury: this.treasuryEngine.analyzeEnterpriseTreasury(input),
      generatedAt: new Date().toISOString(),
      intelligenceScope: {
        organizationId: input.scope.organizationId,
        operatingUnitId: input.scope.operatingUnitId,
        baseCurrency: input.scope.baseCurrency,
      },
    };
  }
}
