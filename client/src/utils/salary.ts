/**
 * ============================================================================
 * SALARY CALCULATION UTILITIES
 * ============================================================================
 * Shared utility functions for salary and allowance calculations
 * Used across HR, Payroll, and related modules
 */

/**
 * Calculate allowance value based on type (fixed amount or percentage)
 * @param basicSalary - Base salary amount
 * @param allowance - Allowance value (either fixed amount or percentage)
 * @param type - Type of allowance: 'value' (fixed) or 'percentage'
 * @returns Calculated allowance value
 */
export const calculateAllowanceValue = (
  basicSalary: number,
  allowance: number,
  type: 'value' | 'percentage'
): number => {
  if (type === 'percentage') {
    return (basicSalary * allowance) / 100;
  }
  return allowance || 0;
};

/**
 * Calculate total gross salary including all allowances
 * @param basicSalary - Base salary
 * @param allowances - Object containing all allowances with their types
 * @returns Total gross salary
 */
export const calculateTotalGross = (
  basicSalary: number,
  allowances: {
    housing?: { value: number; type: 'value' | 'percentage' };
    transport?: { value: number; type: 'value' | 'percentage' };
    representation?: { value: number; type: 'value' | 'percentage' };
    other?: { value: number; type: 'value' | 'percentage' };
  }
): number => {
  let total = basicSalary;

  if (allowances.housing) {
    total += calculateAllowanceValue(basicSalary, allowances.housing.value, allowances.housing.type);
  }
  if (allowances.transport) {
    total += calculateAllowanceValue(basicSalary, allowances.transport.value, allowances.transport.type);
  }
  if (allowances.representation) {
    total += calculateAllowanceValue(basicSalary, allowances.representation.value, allowances.representation.type);
  }
  if (allowances.other) {
    total += calculateAllowanceValue(basicSalary, allowances.other.value, allowances.other.type);
  }

  return total;
};

/**
 * Format currency value for display
 * @param amount - Amount to format
 * @param language - Language code ('en' or 'ar')
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  language: string = 'en',
  currency: string = 'USD'
): string => {
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Format date for display
 * @param dateString - ISO date string
 * @param language - Language code ('en' or 'ar')
 * @returns Formatted date string
 */
export const formatDate = (
  dateString?: string,
  language: string = 'en'
): string => {
  if (!dateString) return '-';
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';
  return new Date(dateString).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Validate salary amount
 * @param amount - Amount to validate
 * @returns true if valid, false otherwise
 */
export const isValidSalaryAmount = (amount: number): boolean => {
  return typeof amount === 'number' && amount > 0 && isFinite(amount);
};

/**
 * Validate allowance percentage (0-100)
 * @param percentage - Percentage value
 * @returns true if valid, false otherwise
 */
export const isValidPercentage = (percentage: number): boolean => {
  return typeof percentage === 'number' && percentage >= 0 && percentage <= 100 && isFinite(percentage);
};
