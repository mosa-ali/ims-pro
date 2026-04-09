/**
 * SYSTEM-WIDE IMPORT FRAMEWORK (MANDATORY FOR ALL MODULES)
 * 
 * Architecture: Option 3 - Shared Validation Logic
 * 
 * This module contains PURE validation functions with NO dependencies on:
 * - UI frameworks (React, DOM)
 * - Database (Drizzle, SQL)
 * - Server-specific libraries (tRPC, Express)
 * 
 * These functions are imported by:
 * - Frontend: For client-side preview and early feedback
 * - Backend: For authoritative enforcement before database operations
 * 
 * Rules (NON-NEGOTIABLE):
 * 1. Valid rows MUST be imported
 * 2. Invalid rows MUST be skipped
 * 3. Error reports MUST include only failed rows
 * 4. Entire file rejection ONLY if all rows are invalid
 * 5. NO divergence between preview and final import behavior
 * 
 * Validation Order (STRICT):
 * 1. File structure (sheet name, headers)
 * 2. Mandatory fields (required columns not empty)
 * 3. Data types (numbers, dates, percentages, enums)
 * 4. References (currency, budget codes, status values) - SYNC ONLY
 * 5. Business rules (locked records, duplicates) - ASYNC (backend only)
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Validation context for organization-specific rules
 */
export interface ValidationContext {
  organizationCurrency?: string;  // Organization base currency (e.g., 'USD', 'EUR')
  projectId?: number;             // Project ID for project-specific validation
  userId?: number;                // User ID for permission checks
}

/**
 * Validation error with full context for user correction
 */
export interface ValidationError {
  row: number;                    // Row number in Excel (1-indexed, excluding header)
  field: string;                  // Column name
  value: any;                     // Invalid value (exact)
  errorType: 'structure' | 'mandatory' | 'datatype' | 'reference' | 'business';
  message: string;                // Human-readable reason
  suggestedFix: string;           // Actionable correction guidance
  originalData?: Record<string, any>; // Full row data for error report
}

/**
 * Validation result for a single row
 */
export interface RowValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];  // Optional: non-blocking issues
  data: Record<string, any>;     // Parsed row data
}

/**
 * Import result summary
 */
export interface ImportResult {
  success: boolean;
  rowsProcessed: number;
  rowsImported: number;
  rowsSkipped: number;
  rowsWithErrors: number;
  errors: ValidationError[];
  importedIds?: number[];        // IDs of successfully imported records
}

/**
 * Column definition for validation
 */
export interface ColumnDefinition {
  key: string;                   // Internal field name
  header: string;                // Excel column header (exact match)
  headerAr?: string;             // Arabic column header (optional, for bilingual support)
  required: boolean;             // Mandatory field check
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'enum' | 'percentage';
  enumValues?: string[];         // For enum validation
  min?: number;                  // For number/date validation
  max?: number;                  // For number/date validation
  pattern?: RegExp;              // For string validation
  referenceTable?: string;       // For foreign key validation (informational)
  customValidator?: (value: any, context?: ValidationContext) => string | null; // Returns error message or null
}

/**
 * Import configuration for a module
 */
export interface ImportConfig {
  moduleName: string;            // English module name
  moduleNameAr?: string;         // Arabic module name (optional)
  sheetName: string;             // Expected Excel sheet name
  sheetNameAr?: string;          // Arabic sheet name (optional)
  columns: ColumnDefinition[];   // Column definitions
  allowDuplicates?: boolean;     // Business rule: allow duplicate entries
  context?: ValidationContext;   // Validation context (organization currency, etc.)
  language?: 'en' | 'ar';        // Language for error messages
}

/**
 * Parsed Excel row data
 */
export interface ParsedRow {
  rowNumber: number;             // Excel row number (1-indexed, excluding header)
  data: Record<string, any>;     // Column key-value pairs
}

// ============================================================================
// PURE VALIDATION FUNCTIONS (LAYERS 1-4)
// ============================================================================

/**
 * Layer 1: File Structure Validation
 * Validates sheet name and column headers
 * 
 * PURE FUNCTION - No side effects, no external dependencies
 */
export function validateFileStructure(
  sheetName: string,
  actualHeaders: string[],
  config: ImportConfig
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check sheet name (support both English and Arabic)
  const validSheetNames = [config.sheetName];
  if (config.sheetNameAr) validSheetNames.push(config.sheetNameAr);
  
  if (!validSheetNames.includes(sheetName)) {
    errors.push({
      row: 0,
      field: 'Sheet',
      value: sheetName,
      errorType: 'structure',
      message: `Invalid sheet name "${sheetName}". Expected "${validSheetNames.join('" or "')}"`,
      suggestedFix: `Rename the sheet to "${config.sheetName}" or use the correct template.`,
    });
  }

  // Check headers (exact match, support bilingual)
  const expectedHeaders = config.columns.map(col => col.header);
  const expectedHeadersAr = config.columns.filter(col => col.headerAr).map(col => col.headerAr!);
  
  const missingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h));
  const extraHeaders = actualHeaders.filter(h => 
    !expectedHeaders.includes(h) && 
    !expectedHeadersAr.includes(h)
  );

  if (missingHeaders.length > 0) {
    errors.push({
      row: 0,
      field: 'Headers',
      value: actualHeaders.join(', '),
      errorType: 'structure',
      message: `Missing required columns: ${missingHeaders.join(', ')}`,
      suggestedFix: `Add the missing columns to match the template. Download a fresh template if needed.`,
    });
  }

  if (extraHeaders.length > 0) {
    errors.push({
      row: 0,
      field: 'Headers',
      value: actualHeaders.join(', '),
      errorType: 'structure',
      message: `Unexpected columns found: ${extraHeaders.join(', ')}`,
      suggestedFix: `Remove extra columns or use the correct template.`,
    });
  }

  return errors;
}

/**
 * Layer 2: Mandatory Field Validation
 * Checks required columns are not empty
 * 
 * PURE FUNCTION - No side effects, no external dependencies
 */
export function validateMandatoryFields(
  row: Record<string, any>,
  rowNumber: number,
  config: ImportConfig
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const col of config.columns) {
    if (col.required) {
      const value = row[col.key];
      if (value === null || value === undefined || String(value).trim() === '') {
        errors.push({
          row: rowNumber,
          field: col.header,
          value: value,
          errorType: 'mandatory',
          message: `${col.header} is required but empty.`,
          suggestedFix: `Provide a valid value for ${col.header}.`,
          originalData: row,
        });
      }
    }
  }

  return errors;
}

/**
 * Layer 3: Data Type Validation
 * Validates data types (numbers, dates, percentages, enums)
 * 
 * PURE FUNCTION - No side effects, no external dependencies
 */
export function validateDataTypes(
  row: Record<string, any>,
  rowNumber: number,
  config: ImportConfig,
  context?: ValidationContext
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const col of config.columns) {
    const value = row[col.key];
    
    // Skip validation if field is empty and not required
    if (!col.required && (value === null || value === undefined || String(value).trim() === '')) {
      continue;
    }

    switch (col.dataType) {
      case 'number':
        if (isNaN(Number(value))) {
          errors.push({
            row: rowNumber,
            field: col.header,
            value: value,
            errorType: 'datatype',
            message: `${col.header} must be a number. Got "${value}".`,
            suggestedFix: `Enter a valid number (e.g., 100, 25.5).`,
            originalData: row,
          });
        } else {
          const num = Number(value);
          if (col.min !== undefined && num < col.min) {
            errors.push({
              row: rowNumber,
              field: col.header,
              value: value,
              errorType: 'datatype',
              message: `${col.header} must be at least ${col.min}. Got ${num}.`,
              suggestedFix: `Enter a value >= ${col.min}.`,
              originalData: row,
            });
          }
          if (col.max !== undefined && num > col.max) {
            errors.push({
              row: rowNumber,
              field: col.header,
              value: value,
              errorType: 'datatype',
              message: `${col.header} must be at most ${col.max}. Got ${num}.`,
              suggestedFix: `Enter a value <= ${col.max}.`,
              originalData: row,
            });
          }
        }
        break;

      case 'percentage':
        const percentValue = String(value).replace('%', '').trim();
        if (isNaN(Number(percentValue))) {
          errors.push({
            row: rowNumber,
            field: col.header,
            value: value,
            errorType: 'datatype',
            message: `${col.header} must be a percentage. Got "${value}".`,
            suggestedFix: `Enter a valid percentage (e.g., 50%, 0.5, 50).`,
            originalData: row,
          });
        }
        break;

      case 'date':
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          errors.push({
            row: rowNumber,
            field: col.header,
            value: value,
            errorType: 'datatype',
            message: `${col.header} must be a valid date. Got "${value}".`,
            suggestedFix: `Enter a date in format YYYY-MM-DD (e.g., 2024-01-31).`,
            originalData: row,
          });
        }
        break;

      case 'enum':
        if (col.enumValues && !col.enumValues.includes(String(value))) {
          errors.push({
            row: rowNumber,
            field: col.header,
            value: value,
            errorType: 'datatype',
            message: `${col.header} value "${value}" is not valid. Allowed values: ${col.enumValues.join(', ')}.`,
            suggestedFix: `Use one of: ${col.enumValues.join(', ')}.`,
            originalData: row,
          });
        }
        break;

      case 'string':
        if (col.pattern && !col.pattern.test(String(value))) {
          errors.push({
            row: rowNumber,
            field: col.header,
            value: value,
            errorType: 'datatype',
            message: `${col.header} format is invalid. Got "${value}".`,
            suggestedFix: `Follow the required format for ${col.header}.`,
            originalData: row,
          });
        }
        break;
    }

    // Custom validator
    if (col.customValidator) {
      const customError = col.customValidator(value, context);
      if (customError) {
        errors.push({
          row: rowNumber,
          field: col.header,
          value: value,
          errorType: 'datatype',
          message: customError,
          suggestedFix: `Check the value and correct according to the rules.`,
          originalData: row,
        });
      }
    }
  }

  return errors;
}

/**
 * Layer 4: Reference Validation (Synchronous Only)
 * Validates reference data that can be checked without database access
 * 
 * PURE FUNCTION - No side effects, no external dependencies
 * 
 * Note: This layer only validates references that can be checked synchronously
 * (e.g., currency codes, status enums). Database foreign key validation happens
 * in Layer 5 (business rules) on the backend only.
 */
export function validateReferences(
  row: Record<string, any>,
  rowNumber: number,
  config: ImportConfig,
  referenceData?: Record<string, string[]>,
  context?: ValidationContext
): ValidationError[] {
  const errors: ValidationError[] = [];

  // This layer is for synchronous reference validation only
  // Example: validate currency codes against a known list
  // Database foreign key validation happens in Layer 5 (backend only)

  return errors;
}

// ============================================================================
// VALIDATION ORCHESTRATION
// ============================================================================

/**
 * Validate a single row through Layers 1-4 (synchronous validation)
 * 
 * PURE FUNCTION - No side effects, no external dependencies
 * 
 * This function can be used by both frontend and backend for consistent validation.
 * Layer 5 (business rules) is handled separately on the backend only.
 */
export function validateRow(
  row: Record<string, any>,
  rowNumber: number,
  config: ImportConfig,
  referenceData?: Record<string, string[]>,
  context?: ValidationContext
): RowValidationResult {
  const errors: ValidationError[] = [];

  // Layer 2: Mandatory Fields
  errors.push(...validateMandatoryFields(row, rowNumber, config));

  // Layer 3: Data Types
  errors.push(...validateDataTypes(row, rowNumber, config, context));

  // Layer 4: References (synchronous only)
  errors.push(...validateReferences(row, rowNumber, config, referenceData, context));

  return {
    isValid: errors.length === 0,
    errors,
    data: row,
  };
}

/**
 * Validate all rows (Layers 1-4 only)
 * 
 * PURE FUNCTION - No side effects, no external dependencies
 * 
 * This function can be used by both frontend (for preview) and backend (for pre-validation).
 * Backend must additionally run Layer 5 (business rules) before final import.
 */
export function validateAllRows(
  sheetName: string,
  headers: string[],
  rows: ParsedRow[],
  config: ImportConfig,
  referenceData?: Record<string, string[]>
): {
  structureErrors: ValidationError[];
  validRows: ParsedRow[];
  invalidRows: ParsedRow[];
  allErrors: ValidationError[];
} {
  const allErrors: ValidationError[] = [];
  const validRows: ParsedRow[] = [];
  const invalidRows: ParsedRow[] = [];

  // Layer 1: File Structure
  const structureErrors = validateFileStructure(sheetName, headers, config);
  if (structureErrors.length > 0) {
    return {
      structureErrors,
      validRows: [],
      invalidRows: [],
      allErrors: structureErrors,
    };
  }

  // Validate each row (Layers 2-4)
  for (const parsedRow of rows) {
    const result = validateRow(parsedRow.data, parsedRow.rowNumber, config, referenceData);
    
    if (result.isValid) {
      validRows.push(parsedRow);
    } else {
      invalidRows.push(parsedRow);
      allErrors.push(...result.errors);
    }
  }

  return {
    structureErrors: [],
    validRows,
    invalidRows,
    allErrors,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format validation error as actionable message
 * 
 * PURE FUNCTION - No side effects, no external dependencies
 */
export function formatErrorMessage(error: ValidationError): string {
  const prefix = `Row ${error.row} – ${error.field}`;
  return `${prefix}: ${error.message} ${error.suggestedFix}`;
}

/**
 * Group errors by row number
 * 
 * PURE FUNCTION - No side effects, no external dependencies
 */
export function groupErrorsByRow(errors: ValidationError[]): Map<number, ValidationError[]> {
  const grouped = new Map<number, ValidationError[]>();
  
  for (const error of errors) {
    if (!grouped.has(error.row)) {
      grouped.set(error.row, []);
    }
    grouped.get(error.row)!.push(error);
  }
  
  return grouped;
}

/**
 * Calculate import summary statistics
 * 
 * PURE FUNCTION - No side effects, no external dependencies
 */
export function calculateImportSummary(
  totalRows: number,
  validRows: number,
  invalidRows: number
): {
  rowsProcessed: number;
  rowsImported: number;
  rowsSkipped: number;
  rowsWithErrors: number;
  successRate: number;
} {
  return {
    rowsProcessed: totalRows,
    rowsImported: validRows,
    rowsSkipped: invalidRows,
    rowsWithErrors: invalidRows,
    successRate: totalRows > 0 ? (validRows / totalRows) * 100 : 0,
  };
}
