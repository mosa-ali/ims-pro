/**
 * ============================================================================
 * CANONICAL PAYROLL CALCULATION ENGINE
 * ============================================================================
 * 
 * CRITICAL RULE:
 * This is the SINGLE SOURCE OF TRUTH for ALL payroll calculations.
 * Used by:
 * - Payroll Calculator
 * - Monthly Payroll Sheet (UI)
 * - Printed Payroll
 * - Excel Export
 * 
 * NO OTHER CALCULATION LOGIC IS ALLOWED.
 * 
 * ============================================================================
 */

export interface PayrollCalculationInput {
 // Salary & Allowances
 basicSalary: number;
 housingAllowance: number;
 transportAllowance: number;
 representationAllowance: number;
 otherAllowances: number;
 
 // Tax Configuration
 taxableIncomeBase?: number; // Optional: If not provided, defaults to grossSalary
 taxRate: number; // Percentage (e.g., 15 for 15%)
 
 // Deduction Rates
 socialSecurityRate: number; // Percentage (e.g., 7 for 7%)
 healthInsuranceRate: number; // Percentage (e.g., 5 for 5%)
 otherDeductions: number; // Fixed amount
}

export interface PayrollCalculationResult {
 // Salary & Allowances
 basicSalary: number;
 housingAllowance: number;
 transportAllowance: number;
 representationAllowance: number;
 otherAllowances: number;
 
 // Gross Salary (Auto-calculated)
 grossSalary: number;
 
 // Tax Calculation
 taxableIncomeBase: number;
 taxRate: number;
 taxAmount: number;
 
 // Social Security
 socialSecurityRate: number;
 socialSecurityAmount: number;
 
 // Health Insurance
 healthInsuranceRate: number;
 healthInsuranceAmount: number;
 
 // Other Deductions
 otherDeductions: number;
 
 // Totals (Auto-calculated)
 totalDeductions: number;
 netSalary: number;
}

/**
 * CANONICAL PAYROLL CALCULATION FUNCTION
 * 
 * This function MUST be used for ALL payroll calculations.
 * No exceptions.
 */
export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
 // Step 1: Calculate Gross Salary
 // Gross = Basic + Housing + Transport + Representation + Other
 const grossSalary = 
 input.basicSalary + 
 input.housingAllowance + 
 input.transportAllowance + 
 input.representationAllowance + 
 input.otherAllowances;
 
 // Step 2: Determine Taxable Income Base
 // Default to gross salary if not specified
 // (Can be overridden for country-specific rules, e.g., Yemen uses basic salary)
 const taxableIncomeBase = input.taxableIncomeBase !== undefined 
 ? input.taxableIncomeBase 
 : grossSalary;
 
 // Step 3: Calculate Tax Amount
 // Tax = Taxable Income Base × (Tax Rate / 100)
 const taxAmount = (taxableIncomeBase * input.taxRate) / 100;
 
 // Step 4: Calculate Social Security Amount
 // Social Security = Gross Salary × (Social Security Rate / 100)
 const socialSecurityAmount = (grossSalary * input.socialSecurityRate) / 100;
 
 // Step 5: Calculate Health Insurance Amount
 // Health Insurance = Gross Salary × (Health Insurance Rate / 100)
 const healthInsuranceAmount = (grossSalary * input.healthInsuranceRate) / 100;
 
 // Step 6: Calculate Total Deductions
 // Total Deductions = Tax + Social Security + Health Insurance + Other
 const totalDeductions = 
 taxAmount + 
 socialSecurityAmount + 
 healthInsuranceAmount + 
 input.otherDeductions;
 
 // Step 7: Calculate Net Salary
 // Net Salary = Gross Salary - Total Deductions
 const netSalary = grossSalary - totalDeductions;
 
 // Return all calculated values
 return {
 basicSalary: input.basicSalary,
 housingAllowance: input.housingAllowance,
 transportAllowance: input.transportAllowance,
 representationAllowance: input.representationAllowance,
 otherAllowances: input.otherAllowances,
 grossSalary,
 taxableIncomeBase,
 taxRate: input.taxRate,
 taxAmount,
 socialSecurityRate: input.socialSecurityRate,
 socialSecurityAmount,
 healthInsuranceRate: input.healthInsuranceRate,
 healthInsuranceAmount,
 otherDeductions: input.otherDeductions,
 totalDeductions,
 netSalary
 };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'USD', language: 'en' | 'ar' = 'en'): string {
 return new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en', {
 style: 'currency',
 currency: currency,
 minimumFractionDigits: 2
 }).format(amount);
}

/**
 * CANONICAL COLUMN SCHEMA
 * This defines the EXACT column order for ALL outputs
 */
export const CANONICAL_PAYROLL_COLUMNS = [
 'staffId',
 'staffName',
 'position',
 'project',
 'basicSalary',
 'housingAllowance',
 'transportAllowance',
 'representationAllowance',
 'otherAllowances',
 'grossSalary',
 'taxableIncomeBase',
 'taxRate',
 'taxAmount',
 'socialSecurityRate',
 'socialSecurityAmount',
 'healthInsuranceRate',
 'healthInsuranceAmount',
 'otherDeductions',
 'totalDeductions',
 'netSalary'
] as const;

export type CanonicalPayrollColumn = typeof CANONICAL_PAYROLL_COLUMNS[number];

/**
 * Column headers (English)
 */
export const CANONICAL_COLUMN_HEADERS_EN: Record<CanonicalPayrollColumn, string> = {
 staffId: 'Staff ID',
 staffName: 'Staff Full Name',
 position: 'Position / Job Title',
 project: 'Project / Cost Center',
 basicSalary: 'Basic Salary',
 housingAllowance: 'Housing Allowance',
 transportAllowance: 'Transport Allowance',
 representationAllowance: 'Representation Allowance',
 otherAllowances: 'Other Allowances',
 grossSalary: 'Gross Salary',
 taxableIncomeBase: 'Taxable Income Base',
 taxRate: 'Tax Rate (%)',
 taxAmount: 'Tax Amount',
 socialSecurityRate: 'Social Security Rate (%)',
 socialSecurityAmount: 'Social Security Amount',
 healthInsuranceRate: 'Health Insurance Rate (%)',
 healthInsuranceAmount: 'Health Insurance Amount',
 otherDeductions: 'Other Deductions',
 totalDeductions: 'Total Deductions',
 netSalary: 'Net Salary'
};

/**
 * Column headers (Arabic)
 */
export const CANONICAL_COLUMN_HEADERS_AR: Record<CanonicalPayrollColumn, string> = {
 staffId: 'الرقم الوظيفي',
 staffName: 'الاسم الكامل',
 position: 'المسمى الوظيفي',
 project: 'المشروع / مركز التكلفة',
 basicSalary: 'الراتب الأساسي',
 housingAllowance: 'بدل السكن',
 transportAllowance: 'بدل المواصلات',
 representationAllowance: 'بدل التمثيل',
 otherAllowances: 'بدلات أخرى',
 grossSalary: 'الإجمالي',
 taxableIncomeBase: 'الوعاء الضريبي',
 taxRate: 'نسبة الضريبة (%)',
 taxAmount: 'مبلغ الضريبة',
 socialSecurityRate: 'نسبة الضمان (%)',
 socialSecurityAmount: 'مبلغ الضمان',
 healthInsuranceRate: 'نسبة التأمين الصحي (%)',
 healthInsuranceAmount: 'مبلغ التأمين الصحي',
 otherDeductions: 'خصومات أخرى',
 totalDeductions: 'إجمالي الخصومات',
 netSalary: 'صافي الراتب'
};
