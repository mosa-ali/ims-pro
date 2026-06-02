/**
 * ============================================================================
 * PAYROLL CONSTANTS AND HELPERS - PHASE 3
 * ============================================================================
 *
 * Centralized constants, enums, and utility functions for payroll management.
 * Used across frontend hooks, backend procedures, and UI components.
 * ============================================================================
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * Payroll record status enum
 */
export const PAYROLL_STATUS = {
  DRAFT: "draft",
  PENDING_APPROVAL: "pending_approval",
  APPROVED: "approved",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const;

export type PayrollStatus = (typeof PAYROLL_STATUS)[keyof typeof PAYROLL_STATUS];

/**
 * Payroll status labels for UI display
 */
export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, { en: string; ar: string }> = {
  draft: { en: "Draft", ar: "مسودة" },
  pending_approval: { en: "Pending Approval", ar: "قيد الموافقة" },
  approved: { en: "Approved", ar: "موافق عليه" },
  paid: { en: "Paid", ar: "مدفوع" },
  cancelled: { en: "Cancelled", ar: "ملغى" },
};

/**
 * Payroll status colors for UI badges
 */
export const PAYROLL_STATUS_COLORS: Record<PayrollStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  pending_approval: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

/**
 * Payment method enum
 */
export const PAYMENT_METHOD = {
  BANK_TRANSFER: "bank_transfer",
  CASH: "cash",
  CHECK: "check",
} as const;

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

/**
 * Payment method labels for UI display
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, { en: string; ar: string }> = {
  bank_transfer: { en: "Bank Transfer", ar: "تحويل بنكي" },
  cash: { en: "Cash", ar: "نقد" },
  check: { en: "Check", ar: "شيك" },
};

/**
 * Attendance period status enum
 */
export const PERIOD_STATUS = {
  OPEN: "open",
  LOCKED: "locked",
  PROCESSING_PAYROLL: "processing_payroll",
  PAID: "paid",
} as const;

export type PeriodStatus = (typeof PERIOD_STATUS)[keyof typeof PERIOD_STATUS];

/**
 * Attendance period status labels for UI display
 */
export const PERIOD_STATUS_LABELS: Record<PeriodStatus, { en: string; ar: string }> = {
  open: { en: "Open", ar: "مفتوح" },
  locked: { en: "Locked", ar: "مغلق" },
  processing_payroll: { en: "Processing Payroll", ar: "جاري معالجة الرواتب" },
  paid: { en: "Paid", ar: "مدفوع" },
};

/**
 * Attendance period status colors for UI badges
 */
export const PERIOD_STATUS_COLORS: Record<PeriodStatus, string> = {
  open: "bg-green-100 text-green-800",
  locked: "bg-yellow-100 text-yellow-800",
  processing_payroll: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
};

/**
 * Month names for period display
 */
export const MONTH_NAMES = {
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  ar: [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ],
};

/**
 * Payroll field labels for forms
 */
export const PAYROLL_FIELD_LABELS: Record<string, { en: string; ar: string }> = {
  basicSalary: { en: "Basic Salary", ar: "الراتب الأساسي" },
  housingAllowance: { en: "Housing Allowance", ar: "بدل السكن" },
  transportAllowance: { en: "Transport Allowance", ar: "بدل النقل" },
  representationAllowance: { en: "Representation Allowance", ar: "بدل التمثيل" },
  otherAllowances: { en: "Other Allowances", ar: "بدلات أخرى" },
  overtimePay: { en: "Overtime Pay", ar: "أجر العمل الإضافي" },
  bonus: { en: "Bonus", ar: "مكافأة" },
  grossSalary: { en: "Gross Salary", ar: "الراتب الإجمالي" },
  taxDeduction: { en: "Tax Deduction", ar: "خصم الضريبة" },
  healthInsuranceAmount: { en: "Health Insurance", ar: "التأمين الصحي" },
  employerSocialSecurity: { en: "Employer Social Security", ar: "الضمان الاجتماعي - صاحب العمل" },
  employeeSocialSecurity: { en: "Employee Social Security", ar: "الضمان الاجتماعي - الموظف" },
  socialSecurityDeduction: { en: "Social Security Deduction", ar: "خصم الضمان الاجتماعي" },
  loanDeduction: { en: "Loan Deduction", ar: "خصم القرض" },
  otherDeductions: { en: "Other Deductions", ar: "خصومات أخرى" },
  totalDeductions: { en: "Total Deductions", ar: "إجمالي الخصومات" },
  netSalary: { en: "Net Salary", ar: "الراتب الصافي" },
  currency: { en: "Currency", ar: "العملة" },
  paymentMethod: { en: "Payment Method", ar: "طريقة الدفع" },
  paymentReference: { en: "Payment Reference", ar: "مرجع الدفع" },
  notes: { en: "Notes", ar: "ملاحظات" },
};

// ============================================================================
// CALCULATION HELPERS
// ============================================================================

/**
 * Calculate gross salary from components
 */
export const calculateGrossSalary = (
  basicSalary: number,
  housingAllowance: number = 0,
  transportAllowance: number = 0,
  representationAllowance: number = 0,
  otherAllowances: number = 0,
  overtimePay: number = 0,
  bonus: number = 0
): number => {
  return (
    basicSalary +
    housingAllowance +
    transportAllowance +
    representationAllowance +
    otherAllowances +
    overtimePay +
    bonus
  );
};

/**
 * Calculate total deductions
 */
export const calculateTotalDeductions = (
  taxDeduction: number = 0,
  healthInsuranceAmount: number = 0,
  employeeSocialSecurity: number = 0,
  socialSecurityDeduction: number = 0,
  loanDeduction: number = 0,
  otherDeductions: number = 0
): number => {
  return (
    taxDeduction +
    healthInsuranceAmount +
    employeeSocialSecurity +
    socialSecurityDeduction +
    loanDeduction +
    otherDeductions
  );
};

/**
 * Calculate net salary
 */
export const calculateNetSalary = (grossSalary: number, totalDeductions: number): number => {
  return Math.max(0, grossSalary - totalDeductions);
};

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format currency amount for display
 */
export const formatCurrency = (amount: number | string, currency: string = "USD"): string => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(num);
};

/**
 * Format date for display
 */
export const formatDate = (date: string | Date, locale: "en" | "ar" = "en"): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return d.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", options);
};

/**
 * Format month and year for display
 */
export const formatMonthYear = (month: number, year: number, locale: "en" | "ar" = "en"): string => {
  const monthNames = locale === "ar" ? MONTH_NAMES.ar : MONTH_NAMES.en;
  return `${monthNames[month - 1]} ${year}`;
};

/**
 * Get payroll status label
 */
export const getPayrollStatusLabel = (status: PayrollStatus, locale: "en" | "ar" = "en"): string => {
  return PAYROLL_STATUS_LABELS[status][locale];
};

/**
 * Get payroll status color
 */
export const getPayrollStatusColor = (status: PayrollStatus): string => {
  return PAYROLL_STATUS_COLORS[status];
};

/**
 * Get period status label
 */
export const getPeriodStatusLabel = (status: PeriodStatus, locale: "en" | "ar" = "en"): string => {
  return PERIOD_STATUS_LABELS[status][locale];
};

/**
 * Get period status color
 */
export const getPeriodStatusColor = (status: PeriodStatus): string => {
  return PERIOD_STATUS_COLORS[status];
};

/**
 * Get payment method label
 */
export const getPaymentMethodLabel = (method: PaymentMethod, locale: "en" | "ar" = "en"): string => {
  return PAYMENT_METHOD_LABELS[method][locale];
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate payroll record for submission
 */
export const validatePayrollRecord = (
  payroll: {
    basicSalary?: number;
    grossSalary?: number;
    netSalary?: number;
    totalDeductions?: number;
  }
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!payroll.basicSalary || payroll.basicSalary <= 0) {
    errors.push("Basic salary must be greater than 0");
  }

  if (!payroll.grossSalary || payroll.grossSalary <= 0) {
    errors.push("Gross salary must be greater than 0");
  }

  if (payroll.totalDeductions && payroll.totalDeductions < 0) {
    errors.push("Total deductions cannot be negative");
  }

  if (payroll.netSalary && payroll.netSalary < 0) {
    errors.push("Net salary cannot be negative");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Check if payroll can be edited (only draft records)
 */
export const canEditPayroll = (status: PayrollStatus): boolean => {
  return status === PAYROLL_STATUS.DRAFT;
};

/**
 * Check if payroll can be approved
 */
export const canApprovePayroll = (status: PayrollStatus): boolean => {
  return status === PAYROLL_STATUS.DRAFT || status === PAYROLL_STATUS.PENDING_APPROVAL;
};

/**
 * Check if payroll can be paid
 */
export const canPayPayroll = (status: PayrollStatus): boolean => {
  return status === PAYROLL_STATUS.APPROVED;
};

/**
 * Check if payroll can be cancelled
 */
export const canCancelPayroll = (status: PayrollStatus): boolean => {
  return status !== PAYROLL_STATUS.PAID && status !== PAYROLL_STATUS.CANCELLED;
};
