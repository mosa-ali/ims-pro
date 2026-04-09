/**
 * IMS-Wide Unified Import Validation Library
 * 
 * This module provides a standardized validation framework for ALL import operations
 * across the IMS system, ensuring consistent error reporting and user experience.
 * 
 * Key Principles:
 * 1. Human-readable error messages (NO technical/ORM errors)
 * 2. Specific field names (NEVER "unknown")
 * 3. Actionable suggested fixes
 * 4. Bilingual support (EN/AR)
 * 5. Same UX for backend and client-side imports
 */

// ============================================================================
// UNIFIED ERROR MODEL
// ============================================================================

export type ImportErrorType = "Validation" | "BusinessRule" | "System";

export interface ImportError {
  row: number;           // Excel row number (1-indexed, row 1 = headers)
  field: string;         // Specific column name (e.g., "currency", "budgetCode")
  errorType: ImportErrorType;
  message: string;       // Human-readable error message
  suggestedFix?: string; // Actionable guidance for fixing the error
  data?: any;            // Original row data for error report
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: ImportError[];
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate required field
 */
export function validateRequired(
  value: any,
  fieldName: string,
  row: number,
  language: "en" | "ar" = "en"
): ImportError | null {
  if (value === null || value === undefined || value === "") {
    return {
      row,
      field: fieldName,
      errorType: "Validation",
      message: language === "ar" 
        ? `الحقل "${fieldName}" مطلوب`
        : `Field "${fieldName}" is required`,
      suggestedFix: language === "ar"
        ? "يرجى إدخال قيمة لهذا الحقل"
        : "Please provide a value for this field"
    };
  }
  return null;
}

/**
 * Validate currency code
 */
export function validateCurrency(
  value: string,
  row: number,
  language: "en" | "ar" = "en"
): ImportError | null {
  // All supported currencies in IMS system
  const allowedCurrencies = ["USD", "EUR", "GBP", "CHF", "SAR", "YER"];
  
  if (!value || value.trim() === "") {
    return {
      row,
      field: "currency",
      errorType: "Validation",
      message: language === "ar"
        ? "العملة مطلوبة"
        : "Currency is required",
      suggestedFix: language === "ar"
        ? "استخدم USD, EUR, GBP, CHF, SAR, أو YER"
        : "Use USD, EUR, GBP, CHF, SAR, or YER"
    };
  }
  
  const normalizedValue = value.trim().toUpperCase();
  if (!allowedCurrencies.includes(normalizedValue)) {
    return {
      row,
      field: "currency",
      errorType: "Validation",
      message: language === "ar"
        ? `قيمة العملة "${value}" غير مدعومة`
        : `Unsupported currency value "${value}"`,
      suggestedFix: language === "ar"
        ? "استخدم USD, EUR, GBP, CHF, SAR, أو YER"
        : "Use USD, EUR, GBP, CHF, SAR, or YER"
    };
  }
  
  return null;
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(
  value: any,
  fieldName: string,
  row: number,
  language: "en" | "ar" = "en"
): ImportError | null {
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return {
      row,
      field: fieldName,
      errorType: "Validation",
      message: language === "ar"
        ? `"${fieldName}" يجب أن يكون رقمًا`
        : `"${fieldName}" must be a number`,
      suggestedFix: language === "ar"
        ? "أدخل رقمًا صحيحًا (مثال: 100.50)"
        : "Enter a valid number (e.g., 100.50)"
    };
  }
  
  if (num < 0) {
    return {
      row,
      field: fieldName,
      errorType: "Validation",
      message: language === "ar"
        ? `"${fieldName}" يجب أن يكون رقمًا موجبًا`
        : `"${fieldName}" must be a positive number`,
      suggestedFix: language === "ar"
        ? "أدخل رقمًا أكبر من أو يساوي 0"
        : "Enter a number greater than or equal to 0"
    };
  }
  
  return null;
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDateFormat(
  value: any,
  fieldName: string,
  row: number,
  language: "en" | "ar" = "en"
): ImportError | null {
  if (!value) {
    return {
      row,
      field: fieldName,
      errorType: "Validation",
      message: language === "ar"
        ? `التاريخ "${fieldName}" مطلوب`
        : `Date "${fieldName}" is required`,
      suggestedFix: language === "ar"
        ? "استخدم تنسيق YYYY-MM-DD (مثال: 2026-01-30)"
        : "Use format YYYY-MM-DD (e.g., 2026-01-30)"
    };
  }
  
  const dateStr = value instanceof Date ? value.toISOString().split('T')[0] : String(value);
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!dateRegex.test(dateStr)) {
    return {
      row,
      field: fieldName,
      errorType: "Validation",
      message: language === "ar"
        ? `تنسيق التاريخ "${dateStr}" غير صحيح`
        : `Invalid date format "${dateStr}"`,
      suggestedFix: language === "ar"
        ? "استخدم تنسيق YYYY-MM-DD (مثال: 2026-01-30)"
        : "Use format YYYY-MM-DD (e.g., 2026-01-30)"
    };
  }
  
  // Validate it's a real date
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return {
      row,
      field: fieldName,
      errorType: "Validation",
      message: language === "ar"
        ? `التاريخ "${dateStr}" غير صالح`
        : `Invalid date "${dateStr}"`,
      suggestedFix: language === "ar"
        ? "تحقق من أن التاريخ صحيح (مثال: 2026-01-30)"
        : "Check that the date is valid (e.g., 2026-01-30)"
    };
  }
  
  return null;
}

/**
 * Validate duplicate code (business rule)
 */
export function createDuplicateError(
  code: string,
  fieldName: string,
  row: number,
  language: "en" | "ar" = "en"
): ImportError {
  return {
    row,
    field: fieldName,
    errorType: "BusinessRule",
    message: language === "ar"
      ? `الرمز "${code}" موجود بالفعل في هذا المشروع`
      : `Code "${code}" already exists in this project`,
    suggestedFix: language === "ar"
      ? "استخدم رمزًا فريدًا أو فعّل 'السماح بالتكرار'"
      : "Use a unique code or enable 'Allow Duplicates'"
  };
}

/**
 * Parse database error to human-readable message
 * This function maps technical database errors to user-friendly messages
 */
export function parseDatabaseError(
  error: any,
  row: number,
  language: "en" | "ar" = "en"
): ImportError {
  const errorMessage = error.message || String(error);
  
  // Duplicate key error
  if (errorMessage.includes("Duplicate entry") || errorMessage.includes("unique constraint")) {
    const field = extractFieldFromError(errorMessage) || "code";
    return {
      row,
      field,
      errorType: "BusinessRule",
      message: language === "ar"
        ? "قيمة مكررة - السجل موجود بالفعل"
        : "Duplicate value - record already exists",
      suggestedFix: language === "ar"
        ? "استخدم قيمة فريدة أو فعّل 'السماح بالتكرار'"
        : "Use a unique value or enable 'Allow Duplicates'"
    };
  }
  
  // Foreign key constraint error
  if (errorMessage.includes("foreign key constraint")) {
    return {
      row,
      field: "reference",
      errorType: "BusinessRule",
      message: language === "ar"
        ? "مرجع غير صالح - السجل المرتبط غير موجود"
        : "Invalid reference - related record does not exist",
      suggestedFix: language === "ar"
        ? "تحقق من أن السجلات المرتبطة موجودة أولاً"
        : "Ensure related records exist first"
    };
  }
  
  // NOT NULL constraint error
  if (errorMessage.includes("cannot be null") || errorMessage.includes("NOT NULL")) {
    const field = extractFieldFromError(errorMessage) || "field";
    return {
      row,
      field,
      errorType: "Validation",
      message: language === "ar"
        ? `الحقل "${field}" مطلوب`
        : `Field "${field}" is required`,
      suggestedFix: language === "ar"
        ? "يرجى إدخال قيمة لهذا الحقل"
        : "Please provide a value for this field"
    };
  }
  
  // Data type mismatch
  if (errorMessage.includes("invalid input syntax") || errorMessage.includes("type mismatch")) {
    const field = extractFieldFromError(errorMessage) || "field";
    return {
      row,
      field,
      errorType: "Validation",
      message: language === "ar"
        ? `نوع البيانات غير صحيح للحقل "${field}"`
        : `Invalid data type for field "${field}"`,
      suggestedFix: language === "ar"
        ? "تحقق من تنسيق البيانات (رقم، تاريخ، نص)"
        : "Check data format (number, date, text)"
    };
  }
  
  // Generic system error (fallback)
  return {
    row,
    field: "system",
    errorType: "System",
    message: language === "ar"
      ? "حدث خطأ في النظام أثناء معالجة هذا السجل"
      : "A system error occurred while processing this record",
    suggestedFix: language === "ar"
      ? "تحقق من صحة البيانات أو اتصل بالدعم الفني"
      : "Verify data correctness or contact technical support"
  };
}

/**
 * Extract field name from database error message
 */
function extractFieldFromError(errorMessage: string): string | null {
  // Try to extract field name from common error patterns
  const patterns = [
    /column ['"`](\w+)['"`]/i,
    /field ['"`](\w+)['"`]/i,
    /key ['"`](\w+)['"`]/i,
    /for key ['"`]\w+\.(\w+)['"`]/i
  ];
  
  for (const pattern of patterns) {
    const match = errorMessage.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

// ============================================================================
// IMPORT LIFECYCLE HELPERS
// ============================================================================

/**
 * Normalize Excel value (trim whitespace, handle empty cells)
 */
export function normalizeValue(value: any): any {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return value;
}

/**
 * Parse number from Excel (handles both number and string inputs)
 */
export function parseNumber(value: any): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, ""); // Remove thousand separators
    return parseFloat(cleaned);
  }
  return NaN;
}

/**
 * Format error for Excel error report
 */
export function formatErrorForExcel(error: ImportError): {
  __error_row__: number;
  __error_field__: string;
  __error_message__: string;
  __suggested_fix__: string;
} {
  return {
    __error_row__: error.row,
    __error_field__: error.field,
    __error_message__: error.message,
    __suggested_fix__: error.suggestedFix || "Check data format and try again"
  };
}
