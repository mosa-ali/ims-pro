/**
 * Budget Validation Helper
 * Provides RTL/LTR aware budget validation messages
 */

export function getBudgetExceededMessage(
 isRTL: boolean,
 currency: string,
 totalAmount: number,
 remainingBudget: number
): string {
 const totalFormatted = totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 });
 const remainingFormatted = remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2 });

 if (isRTL) {
 return `لا يمكن الحفظ أو الإرسال - الإجمالي (${currency} ${totalFormatted}) يتجاوز الميزانية المتبقية (${currency} ${remainingFormatted})`;
 }
 return `Total (${currency} ${totalFormatted}) exceeds remaining budget (${currency} ${remainingFormatted}). Cannot save or submit.`;
}

export function getBudgetWarningMessage(
 isRTL: boolean,
 currency: string,
 remainingBudget: number
): string {
 const remainingFormatted = remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2 });

 if (isRTL) {
 return `تحذير: الميزانية محدودة. المتبقي فقط ${currency} ${remainingFormatted}`;
 }
 return `Warning: Budget is tight. Only ${currency} ${remainingFormatted} remaining.`;
}

export function getBudgetOkMessage(
 isRTL: boolean,
 currency: string,
 remainingBudget: number
): string {
 const remainingFormatted = remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2 });

 if (isRTL) {
 return `الميزانية متاحة: ${currency} ${remainingFormatted}`;
 }
 return `Budget available: ${currency} ${remainingFormatted}`;
}
