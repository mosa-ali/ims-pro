/**
 * Payment Reminders Automation
 * Automatically sends payment reminders for upcoming and overdue payments
 * Implements notification system for payment management
 */

import {
  procurementPayables,
  payments,
  users,
} from "../../drizzle/schema";
import { eq, and, lt, gte, lte } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

interface PaymentReminder {
  payableId: string;
  vendorName: string;
  amount: number;
  dueDate: Date;
  daysUntilDue: number;
  reminderType: "upcoming" | "overdue";
}

/**
 * Check for upcoming and overdue payments and send reminders
 * Called periodically (e.g., daily via cron job)
 */
export async function checkAndSendPaymentReminders(db: any, ctx: any) {
  try {
    const today = new Date();
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);

    // Get upcoming payments (due in next 3 days)
    const upcomingPayments = await db
      .select()
      .from(procurementPayables)
      .where(
        and(
          eq(procurementPayables.organizationId, ctx.scope.organizationId),
          eq(procurementPayables.operatingUnitId, ctx.scope.operatingUnitId),
          eq(procurementPayables.status, "approved"),
          gte(procurementPayables.payableDueDate, today),
          lte(procurementPayables.payableDueDate, threeDaysFromNow)
        )
      );

    // Get overdue payments (due more than 1 day ago)
    const overduePayments = await db
      .select()
      .from(procurementPayables)
      .where(
        and(
          eq(procurementPayables.organizationId, ctx.scope.organizationId),
          eq(procurementPayables.operatingUnitId, ctx.scope.operatingUnitId),
          eq(procurementPayables.status, "approved"),
          lt(procurementPayables.payableDueDate, oneDayAgo)
        )
      );

    const reminders: PaymentReminder[] = [];

    // Process upcoming payments
    for (const payment of upcomingPayments) {
      const daysUntilDue = Math.ceil(
        (new Date(payment.payableDueDate).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      reminders.push({
        payableId: payment.payableId,
        vendorName: payment.vendorName || "Unknown Vendor",
        amount: payment.payableAmount,
        dueDate: new Date(payment.payableDueDate),
        daysUntilDue,
        reminderType: "upcoming",
      });
    }

    // Process overdue payments
    for (const payment of overduePayments) {
      const daysOverdue = Math.ceil(
        (today.getTime() - new Date(payment.payableDueDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      reminders.push({
        payableId: payment.payableId,
        vendorName: payment.vendorName || "Unknown Vendor",
        amount: payment.payableAmount,
        dueDate: new Date(payment.payableDueDate),
        daysUntilDue: -daysOverdue, // Negative for overdue
        reminderType: "overdue",
      });
    }

    // Send notifications for each reminder
    for (const reminder of reminders) {
      await sendPaymentReminder(reminder, ctx);
    }

    console.log(
      `✅ Payment reminders processed: ${upcomingPayments.length} upcoming, ${overduePayments.length} overdue`
    );

    return {
      upcomingCount: upcomingPayments.length,
      overdueCount: overduePayments.length,
      totalReminders: reminders.length,
    };
  } catch (error) {
    console.error("Error in checkAndSendPaymentReminders:", error);
    throw error;
  }
}

/**
 * Send individual payment reminder notification
 */
async function sendPaymentReminder(reminder: PaymentReminder, ctx: any) {
  try {
    const title =
      reminder.reminderType === "upcoming"
        ? `Payment Due Soon: ${reminder.vendorName}`
        : `OVERDUE Payment: ${reminder.vendorName}`;

    const content =
      reminder.reminderType === "upcoming"
        ? `Payment of ${reminder.amount} USD to ${reminder.vendorName} is due in ${reminder.daysUntilDue} days (${reminder.dueDate.toLocaleDateString()}). Payable ID: ${reminder.payableId}`
        : `Payment of ${reminder.amount} USD to ${reminder.vendorName} is OVERDUE by ${Math.abs(reminder.daysUntilDue)} days (Due: ${reminder.dueDate.toLocaleDateString()}). Payable ID: ${reminder.payableId}`;

    // Send notification to owner
    const result = await notifyOwner({
      title,
      content,
    });

    if (result) {
      console.log(
        `✅ Reminder sent for payable ${reminder.payableId}: ${reminder.reminderType}`
      );
    }
  } catch (error) {
    console.error(
      `Error sending reminder for payable ${reminder.payableId}:`,
      error
    );
  }
}

/**
 * Get payment reminders for a specific organization
 * Returns list of upcoming and overdue payments
 */
export async function getPaymentReminders(db: any, ctx: any) {
  try {
    const today = new Date();
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const reminders = await db
      .select()
      .from(procurementPayables)
      .where(
        and(
          eq(procurementPayables.organizationId, ctx.scope.organizationId),
          eq(procurementPayables.operatingUnitId, ctx.scope.operatingUnitId),
          eq(procurementPayables.status, "approved"),
          gte(procurementPayables.payableDueDate, thirtyDaysAgo),
          lte(procurementPayables.payableDueDate, threeDaysFromNow)
        )
      );

    return reminders.map((p: any) => {
      const daysUntilDue = Math.ceil(
        (new Date(p.payableDueDate).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      return {
        payableId: p.payableId,
        vendorName: p.vendorName,
        amount: p.payableAmount,
        dueDate: p.payableDueDate,
        daysUntilDue,
        reminderType: daysUntilDue < 0 ? "overdue" : "upcoming",
        priority: daysUntilDue < 0 ? "high" : daysUntilDue <= 3 ? "medium" : "low",
      };
    });
  } catch (error) {
    console.error("Error in getPaymentReminders:", error);
    throw error;
  }
}

/**
 * Acknowledge a payment reminder (mark as seen)
 * Prevents duplicate reminders for the same payment
 */
export async function acknowledgePaymentReminder(
  db: any,
  payableId: string,
  ctx: any
) {
  try {
    // Update payable with reminder acknowledgment timestamp
    await db
      .update(procurementPayables)
      .set({
        reminderAcknowledgedAt: new Date(),
        reminderAcknowledgedBy: ctx.user?.id || "system",
      })
      .where(
        and(
          eq(procurementPayables.payableId, payableId),
          eq(procurementPayables.organizationId, ctx.scope.organizationId)
        )
      );

    console.log(`✅ Reminder acknowledged for payable ${payableId}`);
  } catch (error) {
    console.error(`Error acknowledging reminder for payable ${payableId}:`, error);
    throw error;
  }
}
