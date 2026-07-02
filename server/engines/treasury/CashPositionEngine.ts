import { CurrencyEngine } from "./CurrencyEngine";
import {
  CashPositionSnapshot,
  TreasuryBankAccount,
  TreasuryCashFlow,
  TreasuryPayable,
  TreasuryScope,
} from "./TreasuryTypes";

export class CashPositionEngine {
  constructor(private readonly currencyEngine: CurrencyEngine) {}

  generateSnapshot(input: {
    scope: TreasuryScope;
    bankAccounts: TreasuryBankAccount[];
    cashFlows: TreasuryCashFlow[];
    payables: TreasuryPayable[];
  }): CashPositionSnapshot {
    const openingCash = input.bankAccounts.reduce((sum, account) => {
      return sum + this.currencyEngine.toBaseAmount(account.currentBalance, account.currency, input.scope).amountInBaseCurrency;
    }, 0);
    const todaysFlows = input.cashFlows.filter((flow) => flow.date.slice(0, 10) === input.scope.asOfDate);
    const receipts = todaysFlows
      .filter((flow) => flow.direction === "inflow")
      .reduce((sum, flow) => {
        return sum + this.currencyEngine.toBaseAmount(flow.amount, flow.currency, input.scope).amountInBaseCurrency * (flow.probability ?? 1);
      }, 0);
    const payments = todaysFlows
      .filter((flow) => flow.direction === "outflow")
      .reduce((sum, flow) => {
        return sum + this.currencyEngine.toBaseAmount(flow.amount, flow.currency, input.scope).amountInBaseCurrency * (flow.probability ?? 1);
      }, 0);
    const availableCash = openingCash + receipts - payments;
    const blockedCash = input.bankAccounts
      .filter((account) => account.isRestricted || account.role === "restricted")
      .reduce((sum, account) => {
        return sum + this.currencyEngine.toBaseAmount(account.currentBalance, account.currency, input.scope).amountInBaseCurrency;
      }, 0);
    const usableCash = Math.max(0, availableCash - blockedCash);
    const committedCash = input.payables
      .filter((payable) => payable.dueDate && payable.dueDate <= input.scope.asOfDate)
      .reduce((sum, payable) => {
        return sum + this.currencyEngine.toBaseAmount(payable.amount, payable.currency, input.scope).amountInBaseCurrency;
      }, 0);

    return {
      date: input.scope.asOfDate,
      openingCash,
      receipts,
      payments,
      availableCash,
      blockedCash,
      usableCash,
      committedCash,
      freeCash: usableCash - committedCash,
    };
  }
}
