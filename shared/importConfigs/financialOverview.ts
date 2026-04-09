/**
 * Financial Overview Import Configuration
 * 
 * Defines validation rules and column structure for Financial Overview (Budget Items) import.
 * Uses the shared import framework for consistency.
 */

import { ImportConfig, ColumnDefinition } from '../importFramework';

/**
 * Supported currencies (will be replaced with STRICT mode in Phase D)
 */
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'SAR', 'YER'];

/**
 * Column definitions for Financial Overview import
 */
export const FINANCIAL_OVERVIEW_COLUMNS: ColumnDefinition[] = [
  {
    key: 'budgetCode',
    header: 'Budget Code',
    required: true,
    dataType: 'string',
    customValidator: (value: any) => {
      const str = String(value).trim();
      if (str.length === 0) return 'Budget Code cannot be empty';
      if (str.length > 50) return 'Budget Code must be 50 characters or less';
      return null;
    },
  },
  {
    key: 'subBudgetLine',
    header: 'Sub Budget Line',
    required: true,
    dataType: 'string',
    customValidator: (value: any) => {
      const str = String(value).trim();
      if (str.length === 0) return 'Sub Budget Line cannot be empty';
      if (str.length > 100) return 'Sub Budget Line must be 100 characters or less';
      return null;
    },
  },
  {
    key: 'activityName',
    header: 'Activity Name',
    required: true,
    dataType: 'string',
    customValidator: (value: any) => {
      const str = String(value).trim();
      if (str.length === 0) return 'Activity Name cannot be empty';
      if (str.length > 200) return 'Activity Name must be 200 characters or less';
      return null;
    },
  },
  {
    key: 'budgetItem',
    header: 'Budget Item',
    required: true,
    dataType: 'string',
    customValidator: (value: any) => {
      const str = String(value).trim();
      if (str.length === 0) return 'Budget Item cannot be empty';
      if (str.length > 200) return 'Budget Item must be 200 characters or less';
      return null;
    },
  },
  {
    key: 'qty',
    header: 'Qty',
    required: true,
    dataType: 'number',
    min: 0,
    customValidator: (value: any) => {
      const num = Number(value);
      if (num < 0) return 'Quantity must be a positive number';
      if (num > 1000000) return 'Quantity exceeds maximum allowed value (1,000,000)';
      return null;
    },
  },
  {
    key: 'unitType',
    header: 'Unit Type',
    required: true,
    dataType: 'string',
    customValidator: (value: any) => {
      const str = String(value).trim();
      if (str.length === 0) return 'Unit Type cannot be empty';
      if (str.length > 50) return 'Unit Type must be 50 characters or less';
      return null;
    },
  },
  {
    key: 'unitCost',
    header: 'Unit Cost',
    required: true,
    dataType: 'number',
    min: 0,
    customValidator: (value: any) => {
      const num = Number(value);
      if (num < 0) return 'Unit Cost must be a positive number';
      if (num > 10000000) return 'Unit Cost exceeds maximum allowed value (10,000,000)';
      return null;
    },
  },
  {
    key: 'recurrence',
    header: 'Recurrence',
    required: true,
    dataType: 'number',
    min: 1,
    customValidator: (value: any) => {
      const num = Number(value);
      if (num < 1) return 'Recurrence must be at least 1';
      if (num > 1000) return 'Recurrence exceeds maximum allowed value (1,000)';
      if (!Number.isInteger(num)) return 'Recurrence must be a whole number';
      return null;
    },
  },
  {
    key: 'currency',
    header: 'Currency',
    required: true,
    dataType: 'enum',
    enumValues: SUPPORTED_CURRENCIES,
    customValidator: (value: any, context?: any) => {
      const curr = String(value).trim().toUpperCase();
      
      // STRICT MODE: If organization currency is provided, only allow that currency
      if (context?.organizationCurrency) {
        const orgCurrency = context.organizationCurrency.toUpperCase();
        if (curr !== orgCurrency) {
          return `Only ${orgCurrency} is allowed for this organization. Found: ${curr}.`;
        }
        return null;
      }
      
      // FALLBACK: If no organization currency, allow any supported currency
      if (!SUPPORTED_CURRENCIES.includes(curr)) {
        return `Currency "${value}" is not supported. Allowed values: ${SUPPORTED_CURRENCIES.join(', ')}.`;
      }
      return null;
    },
  },
  {
    key: 'notes',
    header: 'Notes',
    required: false,
    dataType: 'string',
    customValidator: (value: any) => {
      if (!value) return null; // Optional field
      const str = String(value).trim();
      if (str.length > 500) return 'Notes must be 500 characters or less';
      return null;
    },
  },
];

/**
 * Financial Overview import configuration
 */
export const FINANCIAL_OVERVIEW_CONFIG: ImportConfig = {
  moduleName: 'Financial Overview',
  sheetName: 'Financial Overview',
  columns: FINANCIAL_OVERVIEW_COLUMNS,
  allowDuplicates: false, // Default: prevent duplicates

  // Note: Reference validation and business rules are handled in the backend router
  // Frontend uses Layers 1-4 only (structure, mandatory, datatype, sync references)
  // Backend adds Layer 5 (async business rules: duplicates, foreign keys, locked records)
};

/**
 * Get actionable error message for Financial Overview import errors
 * 
 * This function transforms validation errors into human-readable, actionable messages.
 * Format: "Row X – Field 'Y' value 'Z' is invalid. Reason. Suggested fix."
 */
export function getActionableErrorMessage(
  row: number,
  field: string,
  value: any,
  errorType: string,
  message: string
): string {
  const prefix = `Row ${row} – ${field}`;
  
  switch (errorType) {
    case 'mandatory':
      return `${prefix} is required but empty. Provide a valid value for ${field}.`;
    
    case 'datatype':
      if (field === 'Currency') {
        return `${prefix} value "${value}" is not supported. Allowed currencies: ${SUPPORTED_CURRENCIES.join(', ')}. Use one of these values.`;
      }
      if (field === 'Qty' || field === 'Unit Cost' || field === 'Recurrence') {
        return `${prefix} must be a positive number. Got "${value}". Enter a valid number (e.g., 100, 25.5).`;
      }
      return `${prefix} format is invalid. Got "${value}". ${message}`;
    
    case 'reference':
      return `${prefix} references invalid data. ${message} Ensure all referenced data exists.`;
    
    case 'business':
      if (message.includes('Duplicate')) {
        return `${prefix} value "${value}" already exists in this project. Use a unique value or enable "Allow Duplicates" option.`;
      }
      return `${prefix} violates business rules. ${message}`;
    
    default:
      return `${prefix} validation failed. ${message}`;
  }
}
