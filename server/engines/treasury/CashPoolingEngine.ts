import { CurrencyEngine } from "./CurrencyEngine";
import {
  CashPoolingPlan,
  TreasuryBankAccount,
  TreasuryScope,
  toNumber,
} from "./TreasuryTypes";

export class CashPoolingEngine {
  private readonly currencyEngine: CurrencyEngine;

  constructor(currencyEngine: CurrencyEngine) {
    this.currencyEngine = currencyEngine;
  }

  buildPoolingPlan(input: {
    scope: TreasuryScope;
    bankAccounts: TreasuryBankAccount[];
  }): CashPoolingPlan {
    const accounts = input.bankAccounts.filter((account) => account.isActive !== false && account.isActive !== 0);
    const surplusAccounts = accounts
      .map((account) => ({
        account,
        surplus: Math.max(0, toNumber(account.currentBalance) - (account.targetBalance ?? account.minimumBalance ?? 0)),
      }))
      .filter((item) => item.surplus > 0)
      .sort((a, b) => (a.account.bankPriority ?? 100) - (b.account.bankPriority ?? 100));
    const deficitAccounts = accounts
      .map((account) => ({
        account,
        deficit: Math.max(0, (account.targetBalance ?? account.minimumBalance ?? 0) - toNumber(account.currentBalance)),
      }))
      .filter((item) => item.deficit > 0)
      .sort((a, b) => (a.account.bankPriority ?? 100) - (b.account.bankPriority ?? 100));

    const sweeps = [];
    const unresolvedDeficits = [];

    for (const deficitItem of deficitAccounts) {
      let remaining = deficitItem.deficit;
      for (const surplusItem of surplusAccounts) {
        if (remaining <= 0 || surplusItem.surplus <= 0) continue;
        if (surplusItem.account.currency !== deficitItem.account.currency) continue;

        const amount = Math.min(remaining, surplusItem.surplus);
        sweeps.push({
          fromAccountId: surplusItem.account.id,
          toAccountId: deficitItem.account.id,
          currency: deficitItem.account.currency,
          amount,
          reason: `Top up ${deficitItem.account.accountName} to target balance`,
          estimatedCost: surplusItem.account.transferCost ?? 0,
        });
        remaining -= amount;
        surplusItem.surplus -= amount;
      }

      if (remaining > 0) {
        unresolvedDeficits.push({
          accountId: deficitItem.account.id,
          currency: deficitItem.account.currency,
          deficit: remaining,
        });
      }
    }

    const totalSurplus = surplusAccounts.reduce((sum, item) => {
      return sum + this.currencyEngine.toBaseAmount(item.surplus, item.account.currency, input.scope).amountInBaseCurrency;
    }, 0);
    const totalDeficit = deficitAccounts.reduce((sum, item) => {
      return sum + this.currencyEngine.toBaseAmount(item.deficit, item.account.currency, input.scope).amountInBaseCurrency;
    }, 0);

    const recommendations = [
      sweeps.length
        ? "Execute proposed sweeps after validating donor restrictions and bank cut-off times."
        : "No cash sweeps required for current account targets.",
    ];
    if (unresolvedDeficits.length) {
      recommendations.push("Review unresolved deficits for cross-currency conversion or external funding.");
    }

    return {
      totalSurplus,
      totalDeficit,
      netPoolPosition: totalSurplus - totalDeficit,
      sweeps,
      unresolvedDeficits,
      recommendations,
    };
  }
}
