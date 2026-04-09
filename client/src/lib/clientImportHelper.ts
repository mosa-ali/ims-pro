/**
 * Client-Side Import Helper for localStorage Tabs
 * 
 * This module provides unified import validation and error reporting
 * for localStorage-based imports (Activities, Indicators, Beneficiaries, Tasks, Procurement).
 * 
 * It ensures the same UX and error reporting as backend imports.
 */

import type { ImportError, ImportResult } from "@shared/importValidation";
import {
 validateRequired,
 validateCurrency,
 validatePositiveNumber,
 validateDateFormat,
 normalizeValue,
 parseNumber
} from "@shared/importValidation";

// ============================================================================
// CLIENT-SIDE VALIDATION HELPERS
// ============================================================================

/**
 * Validate a single row with custom field validators
 * Returns array of errors for that row
 */
export function validateRow(
 row: any,
 rowNumber: number,
 validators: {
 field: string;
 validator: (value: any, row: number) => ImportError | null;
 }[],
 language: "en" | "ar" = "en"
): ImportError[] {
 const errors: ImportError[] = [];
 
 for (const { field, validator } of validators) {
 const error = validator(row[field], rowNumber);
 if (error) {
 errors.push(error);
 }
 }
 
 return errors;
}

/**
 * Parse Excel file and validate all rows
 * Returns { validRows, errors }
 */
export async function parseAndValidateExcel<T>(
 file: File,
 columnMapping: { [excelColumn: number]: keyof T },
 validators: {
 field: keyof T;
 validator: (value: any, row: number) => ImportError | null;
 }[],
 language: "en" | "ar" = "en"
): Promise<{
 validRows: T[];
 errors: ImportError[];
}> {
 // Dynamic import to avoid bundling ExcelJS in main bundle
 const ExcelJS = (await import("exceljs")).default;
 
 const workbook = new ExcelJS.Workbook();
 const arrayBuffer = await file.arrayBuffer();
 await workbook.xlsx.load(arrayBuffer);
 
 const worksheet = workbook.worksheets[0];
 const validRows: T[] = [];
 const errors: ImportError[] = [];
 
 worksheet.eachRow((row, rowNumber) => {
 if (rowNumber === 1) return; // Skip header row
 
 // Parse row data according to column mapping
 const rowData: any = {};
 for (const [excelCol, fieldName] of Object.entries(columnMapping)) {
 const cellValue = row.getCell(Number(excelCol)).value;
 rowData[fieldName] = normalizeValue(cellValue);
 }
 
 // Validate row
 const rowErrors: ImportError[] = [];
 for (const { field, validator } of validators) {
 const error = validator(rowData[field], rowNumber);
 if (error) {
 rowErrors.push({ ...error, data: rowData });
 }
 }
 
 if (rowErrors.length > 0) {
 errors.push(...rowErrors);
 } else {
 validRows.push(rowData as T);
 }
 });
 
 return { validRows, errors };
}

/**
 * Generate Excel error report for client-side imports
 * Uses the corruption-free generateErrorReport utility
 */
export async function generateClientErrorReport(
 originalFileName: string,
 errors: ImportError[],
 dataColumns?: { header: string; key: string; width: number }[]
): Promise<void> {
 // Use the centralized generateErrorReport utility
 const { generateErrorReport } = await import("./generateErrorReport");
 
 const baseName = originalFileName.replace(/\.xlsx?$/i, "");
 
 await generateErrorReport({
 errors,
 fileName: baseName,
 dataColumns: dataColumns || [], // Optional: include original data columns
 });
}

// ============================================================================
// COMMON FIELD VALIDATORS (Reusable across tabs)
// ============================================================================

/**
 * Create a required field validator
 */
export function createRequiredValidator(fieldName: string, language: "en" | "ar" = "en") {
 return (value: any, row: number): ImportError | null => {
 return validateRequired(value, fieldName, row, language);
 };
}

/**
 * Create a date validator
 */
export function createDateValidator(fieldName: string, language: "en" | "ar" = "en") {
 return (value: any, row: number): ImportError | null => {
 return validateDateFormat(value, fieldName, row, language);
 };
}

/**
 * Create a positive number validator
 */
export function createNumberValidator(fieldName: string, language: "en" | "ar" = "en") {
 return (value: any, row: number): ImportError | null => {
 return validatePositiveNumber(value, fieldName, row, language);
 };
}

/**
 * Create a currency validator
 */
export function createCurrencyValidator(language: "en" | "ar" = "en") {
 return (value: any, row: number): ImportError | null => {
 return validateCurrency(value, row, language);
 };
}

/**
 * Create a custom enum validator
 */
export function createEnumValidator(
 fieldName: string,
 allowedValues: string[],
 language: "en" | "ar" = "en"
) {
 return (value: any, row: number): ImportError | null => {
 if (!value || value.trim() === "") {
 return {
 row,
 field: fieldName,
 errorType: "Validation",
 message: language === "ar"
 ? `الحقل "${fieldName}" مطلوب`
 : `Field "${fieldName}" is required`,
 suggestedFix: language === "ar"
 ? `استخدم إحدى القيم: ${allowedValues.join(", ")}`
 : `Use one of: ${allowedValues.join(", ")}`
 };
 }
 
 const normalizedValue = value.trim();
 if (!allowedValues.includes(normalizedValue)) {
 return {
 row,
 field: fieldName,
 errorType: "Validation",
 message: language === "ar"
 ? `قيمة "${value}" غير صالحة للحقل "${fieldName}"`
 : `Invalid value "${value}" for field "${fieldName}"`,
 suggestedFix: language === "ar"
 ? `استخدم إحدى القيم: ${allowedValues.join(", ")}`
 : `Use one of: ${allowedValues.join(", ")}`
 };
 }
 
 return null;
 };
}
