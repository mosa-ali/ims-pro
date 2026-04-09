/**
 * ============================================================================
 * EXCEL UTILITIES
 * Helpers for Excel import/export operations
 * ============================================================================
 */

/**
 * Convert Excel date serial number to JavaScript Date
 * Excel stores dates as number of days since 1900-01-01
 */
export function excelDateToJSDate(serial: number): Date {
 // Excel incorrectly treats 1900 as a leap year
 const utc_days = Math.floor(serial - 25569);
 const utc_value = utc_days * 86400;
 const date_info = new Date(utc_value * 1000);

 return new Date(
 date_info.getFullYear(),
 date_info.getMonth(),
 date_info.getDate()
 );
}

/**
 * Convert JavaScript Date to Excel date serial number
 */
export function jsDateToExcelDate(date: Date): number {
 const epoch = new Date(1900, 0, 1);
 const days = Math.floor((date.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24));
 return days + 2; // Excel serial date starts at 1, not 0, plus leap year bug
}

/**
 * Parse Excel date value (handles both serial numbers and date strings)
 */
export function parseExcelDate(value: any): string | null {
 if (!value) return null;

 // If it's already a Date object
 if (value instanceof Date) {
 return value.toISOString().split('T')[0];
 }

 // If it's a number (Excel serial date)
 if (typeof value === 'number') {
 const date = excelDateToJSDate(value);
 return date.toISOString().split('T')[0];
 }

 // If it's a string
 if (typeof value === 'string') {
 // Try to parse as ISO date
 const date = new Date(value);
 if (!isNaN(date.getTime())) {
 return date.toISOString().split('T')[0];
 }
 }

 return null;
}

/**
 * Clean Excel cell value (remove extra whitespace, handle null/undefined)
 */
export function cleanExcelValue(value: any): string {
 if (value === null || value === undefined) {
 return '';
 }

 return String(value).trim();
}

/**
 * Parse Excel boolean value
 */
export function parseExcelBoolean(value: any): boolean {
 if (typeof value === 'boolean') {
 return value;
 }

 if (typeof value === 'number') {
 return value === 1;
 }

 if (typeof value === 'string') {
 const lower = value.toLowerCase().trim();
 return lower === 'yes' || lower === 'true' || lower === '1' || lower === 'y';
 }

 return false;
}

/**
 * Parse Excel number value
 */
export function parseExcelNumber(value: any): number | null {
 if (typeof value === 'number') {
 return value;
 }

 if (typeof value === 'string') {
 const cleaned = value.replace(/[^0-9.-]/g, '');
 const parsed = parseFloat(cleaned);
 return isNaN(parsed) ? null : parsed;
 }

 return null;
}

/**
 * Validate required Excel columns exist
 */
export function validateRequiredColumns(
 headers: string[],
 requiredColumns: string[]
): { valid: boolean; missing: string[] } {
 const missing: string[] = [];

 requiredColumns.forEach(col => {
 if (!headers.includes(col)) {
 missing.push(col);
 }
 });

 return {
 valid: missing.length === 0,
 missing
 };
}

/**
 * Map Excel row to object using column mapping
 */
export function mapExcelRowToObject<T>(
 row: any[],
 headers: string[],
 columnMapping: Record<string, keyof T>
): Partial<T> {
 const obj: any = {};

 headers.forEach((header, index) => {
 const targetField = columnMapping[header];
 if (targetField) {
 obj[targetField] = row[index];
 }
 });

 return obj as Partial<T>;
}

/**
 * Detect duplicate rows in Excel data
 */
export function detectDuplicateRows<T>(
 rows: T[],
 uniqueFields: (keyof T)[]
): { hasDuplicates: boolean; duplicates: T[] } {
 const seen = new Set<string>();
 const duplicates: T[] = [];

 rows.forEach(row => {
 const key = uniqueFields.map(field => row[field]).join('|');
 
 if (seen.has(key)) {
 duplicates.push(row);
 } else {
 seen.add(key);
 }
 });

 return {
 hasDuplicates: duplicates.length > 0,
 duplicates
 };
}

/**
 * Generate Excel template headers with required markers
 */
export function generateTemplateHeaders(
 columns: Array<{ name: string; required: boolean }>
): string[] {
 return columns.map(col => 
 col.required ? `${col.name} *` : col.name
 );
}

/**
 * Sanitize value for Excel export (prevent formula injection)
 */
export function sanitizeForExcel(value: any): any {
 if (typeof value === 'string') {
 // Prevent formula injection
 if (value.startsWith('=') || value.startsWith('+') || 
 value.startsWith('-') || value.startsWith('@')) {
 return `'${value}`;
 }
 }
 return value;
}

/**
 * Format Excel error message with row/column context
 */
export function formatExcelError(
 rowIndex: number,
 columnName: string,
 error: string
): string {
 return `Row ${rowIndex + 2}, Column "${columnName}": ${error}`;
}

/**
 * Batch validate Excel rows
 */
export function batchValidateExcelRows<T>(
 rows: T[],
 validator: (row: T, index: number) => string | null
): { valid: boolean; errors: string[] } {
 const errors: string[] = [];

 rows.forEach((row, index) => {
 const error = validator(row, index);
 if (error) {
 errors.push(`Row ${index + 2}: ${error}`);
 }
 });

 return {
 valid: errors.length === 0,
 errors
 };
}

/**
 * Check if Excel value is empty
 */
export function isExcelValueEmpty(value: any): boolean {
 if (value === null || value === undefined) return true;
 if (typeof value === 'string' && value.trim() === '') return true;
 return false;
}

/**
 * Get Excel column letter from index (0 = A, 1 = B, etc.)
 */
export function getExcelColumnLetter(index: number): string {
 let letter = '';
 while (index >= 0) {
 letter = String.fromCharCode((index % 26) + 65) + letter;
 index = Math.floor(index / 26) - 1;
 }
 return letter;
}

/**
 * Get Excel cell reference (e.g., "A1", "B2")
 */
export function getExcelCellReference(rowIndex: number, colIndex: number): string {
 return `${getExcelColumnLetter(colIndex)}${rowIndex + 1}`;
}

/**
 * Parse CSV string to array of objects
 */
export function parseCSV(csvString: string, delimiter: string = ','): any[][] {
 const rows: any[][] = [];
 let currentRow: string[] = [];
 let currentCell = '';
 let inQuotes = false;

 for (let i = 0; i < csvString.length; i++) {
 const char = csvString[i];
 const nextChar = csvString[i + 1];

 if (char === '"') {
 if (inQuotes && nextChar === '"') {
 // Escaped quote
 currentCell += '"';
 i++;
 } else {
 // Toggle quote state
 inQuotes = !inQuotes;
 }
 } else if (char === delimiter && !inQuotes) {
 // End of cell
 currentRow.push(currentCell.trim());
 currentCell = '';
 } else if ((char === '\n' || char === '\r') && !inQuotes) {
 // End of row
 if (char === '\r' && nextChar === '\n') {
 i++; // Skip \n in \r\n
 }
 if (currentCell || currentRow.length > 0) {
 currentRow.push(currentCell.trim());
 rows.push(currentRow);
 currentRow = [];
 currentCell = '';
 }
 } else {
 currentCell += char;
 }
 }

 // Add last cell and row
 if (currentCell || currentRow.length > 0) {
 currentRow.push(currentCell.trim());
 rows.push(currentRow);
 }

 return rows;
}

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV<T>(
 data: T[],
 headers: (keyof T)[]
): string {
 const escapeCSV = (value: any): string => {
 if (value === null || value === undefined) return '';
 
 const str = String(value);
 
 // Escape if contains comma, quote, or newline
 if (str.includes(',') || str.includes('"') || str.includes('\n')) {
 return `"${str.replace(/"/g, '""')}"`;
 }
 
 return str;
 };

 // Header row
 const headerRow = headers.map(h => escapeCSV(h)).join(',');
 
 // Data rows
 const dataRows = data.map(row => 
 headers.map(header => escapeCSV(row[header])).join(',')
 );

 return [headerRow, ...dataRows].join('\n');
}
