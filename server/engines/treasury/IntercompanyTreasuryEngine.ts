import { CurrencyEngine } from "./CurrencyEngine";
import {
  IntercompanyTreasuryPosition,
  TreasuryBankAccount,
  TreasuryScope,
} from "./TreasuryTypes";

export class IntercompanyTreasuryEngine {
  constructor(private readonly currencyEngine: CurrencyEngine) {}

  planInternalFunding(input: {
    scope: TreasuryScope;
    bankAccounts: TreasuryBankAccount[];
  }): IntercompanyTreasuryPosition[] {
    const byOperatingUnit = new Map<number | null, TreasuryBankAccount[]>();

    for (const account of input.bankAccounts.filter((account) => account.isActive !== false && account.isActive !== 0)) {
      const key = account.operatingUnitId ?? null;
      byOperatingUnit.set(key, [...(byOperatingUnit.get(key) ?? []), account]);
    }

    return [...byOperatingUnit.entries()].map(([operatingUnitId, accounts]) => {
      const cash = accounts.reduce((sum, account) => {
        return sum + this.currencyEngine.toBaseAmount(account.currentBalance, account.currency, input.scope).amountInBaseCurrency;
      }, 0);
      const target = accounts.reduce((sum, account) => sum + (account.targetBalance ?? account.minimumBalance ?? 0), 0);
      const fundingNeed = Math.max(0, target - cash);
      const settlementAmount = Math.max(0, cash - target);

      return {
        organizationId: input.scope.organizationId,
        operatingUnitId,
        currency: input.scope.baseCurrency,
        fundingNeed,
        settlementAmount,
        recommendation: fundingNeed > 0
          ? "Request internal funding from treasury pool."
          : settlementAmount > 0
            ? "Available for internal settlement or cash pool sweep."
            : "Operating unit is aligned with internal funding target.",
      };
    });
  }
}
