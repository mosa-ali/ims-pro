import { CurrencyEngine } from "./CurrencyEngine";
import {
  OptimizedPayment,
  PaymentOptimizationPlan,
  TreasuryBankAccount,
  TreasuryPayable,
  TreasuryScope,
  addDays,
  daysBetween,
  paymentPriority,
  toNumber,
} from "./TreasuryTypes";

export class PaymentOptimizationEngine {
  private readonly currencyEngine: CurrencyEngine;

  constructor(currencyEngine: CurrencyEngine) {
    this.currencyEngine = currencyEngine;
  }

  optimize(input: {
    scope: TreasuryScope;
    bankAccounts: TreasuryBankAccount[];
    payables: TreasuryPayable[];
    minimumCashReserve?: number;
  }): PaymentOptimizationPlan {
    const availableCash = input.bankAccounts
      .filter((account) => account.isActive !== false && account.isActive !== 0 && !account.isRestricted)
      .reduce((sum, account) => {
        return sum + this.currencyEngine.toBaseAmount(account.currentBalance, account.currency, input.scope).amountInBaseCurrency;
      }, 0);
    const minimumCashReserve = input.minimumCashReserve ?? availableCash * 0.15;
    let spendableCash = Math.max(0, availableCash - minimumCashReserve);

    const ordered = [...input.payables].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const pa = priorityOrder[paymentPriority(a, input.scope.asOfDate)];
      const pb = priorityOrder[paymentPriority(b, input.scope.asOfDate)];
      if (pa !== pb) return pa - pb;
      return (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31");
    });

    const optimizedPayments: OptimizedPayment[] = [];
    const warnings: string[] = [];

    for (const payable of ordered) {
      const amountInBase = this.currencyEngine.toBaseAmount(payable.amount, payable.currency, input.scope).amountInBaseCurrency;
      const priority = paymentPriority(payable, input.scope.asOfDate);
      const daysUntilDue = payable.dueDate ? daysBetween(input.scope.asOfDate, payable.dueDate) : 30;
      const discountIsAvailable = payable.discountAmount && payable.discountExpiresOn && payable.discountExpiresOn >= input.scope.asOfDate;
      const penaltyIsNear = payable.penaltyStartsOn && daysBetween(input.scope.asOfDate, payable.penaltyStartsOn) <= 3;

      let decision: OptimizedPayment["decision"] = "schedule";
      let scheduledDate = payable.dueDate ?? addDays(input.scope.asOfDate, 14);
      let reason = "Scheduled for due date.";

      if (amountInBase <= spendableCash && (priority === "critical" || discountIsAvailable || penaltyIsNear)) {
        decision = "pay_now";
        scheduledDate = input.scope.asOfDate;
        reason = discountIsAvailable
          ? "Pay now to capture early-payment discount."
          : penaltyIsNear
            ? "Pay now to avoid penalty."
            : "Pay now because the obligation is critical or overdue.";
        spendableCash -= amountInBase;
      } else if (amountInBase <= spendableCash) {
        spendableCash -= amountInBase;
      } else if (priority === "critical" && spendableCash > 0) {
        decision = "split";
        reason = "Partial payment recommended; remaining amount requires funding or deferral approval.";
        spendableCash = 0;
        warnings.push(`Critical payable ${payable.id} exceeds spendable cash.`);
      } else {
        decision = "defer";
        scheduledDate = addDays(input.scope.asOfDate, Math.max(7, daysUntilDue + 7));
        reason = "Deferred to preserve minimum cash reserve.";
      }

      optimizedPayments.push({
        payableId: payable.id,
        scheduledDate,
        amount: toNumber(payable.amount),
        currency: payable.currency,
        priority,
        bankAccountId: payable.bankAccountId,
        decision,
        reason,
        liquidityImpact: amountInBase,
      });
    }

    const scheduledAmount = optimizedPayments
      .filter((payment) => payment.decision !== "defer")
      .reduce((sum, payment) => {
        return sum + this.currencyEngine.toBaseAmount(payment.amount, payment.currency, input.scope).amountInBaseCurrency;
      }, 0);
    const deferredAmount = optimizedPayments
      .filter((payment) => payment.decision === "defer")
      .reduce((sum, payment) => {
        return sum + this.currencyEngine.toBaseAmount(payment.amount, payment.currency, input.scope).amountInBaseCurrency;
      }, 0);

    if (deferredAmount > 0) {
      warnings.push("Some payments were deferred to protect liquidity reserves.");
    }

    return {
      availableCash,
      minimumCashReserve,
      scheduledAmount,
      deferredAmount,
      optimizedPayments,
      warnings,
    };
  }
}
