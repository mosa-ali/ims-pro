/**
 * Standardized Excel Export Utility - CORRUPTION-FREE VERSION
 * 
 * CRITICAL LESSON LEARNED: worksheet.addTable() causes XML corruption when combined
 * with ANY other worksheet modifications (column widths, number formats, etc.)
 * 
 * SOLUTION: Build Excel files manually without addTable():
 * 1. Add header row with manual styling
 * 2. Add data rows with manual styling
 * 3. Add autoFilter for dropdown filters
 * 4. NO table objects - just styled cells
 * 
 * This approach gives us full control and guarantees no corruption.
 * 
 * Requirements:
 * 1. TRUE Excel File Format (.xlsx) with correct MIME type
 * 2. Manual row-by-row construction (NO worksheet.addTable())
 * 3. Row 1 = headers, data starts immediately (no empty rows)
 * 4. Blue header (#4472C4), white text, bold
 * 5. Alternating row stripes (white/light gray)
 * 6. Filter dropdowns on all columns
 * 7. NO formulas - all values are static calculated numbers
 * 8. Number format: #,##0.00 (explicit, no auto-detection)
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ExcelColumn {
 /** Column header name (must match UI label) */
 name: string;
 /** Property key in data object */
 key: string;
 /** Column width in characters (optional, will auto-size if not provided) */
 width?: number;
 /** Data type for formatting */
 type?: 'text' | 'number' | 'date' | 'currency';
 /** Total function for TOTAL row (calculates in JavaScript, not Excel formulas) */
 totals?: 'sum' | 'count' | 'average' | 'none';
}

export interface ExcelExportOptions {
 /** Worksheet name */
 sheetName: string;
 /** Column definitions */
 columns: ExcelColumn[];
 /** Data rows */
 data: any[];
 /** File name (without extension) */
 fileName: string;
 /** Include TOTAL row at bottom (calculated as static values, NO formulas) */
 includeTotals?: boolean;
 /** RTL mode */
 isRTL?: boolean;
}

/**
 * Calculate totals for TOTAL row (returns static values, NOT formulas)
 * Exported for testing purposes
 */
export function calculateTotals(data: any[], columns: ExcelColumn[]): any[] {
 return columns.map((col, index) => {
 // First column gets "Total" label
 if (index === 0) {
 return 'Total';
 }

 // Skip columns with no totals function
 if (!col.totals || col.totals === 'none') {
 return '';
 }

 // Extract numeric values
 const values = data
 .map(row => {
 const value = row[col.key];
 if (typeof value === 'number') return value;
 if (typeof value === 'string') {
 const parsed = parseFloat(value);
 return isNaN(parsed) ? 0 : parsed;
 }
 return 0;
 })
 .filter(v => v !== 0); // Filter out zeros for average calculation

 if (values.length === 0) return 0;

 // Calculate based on function type
 switch (col.totals) {
 case 'sum':
 return values.reduce((sum, val) => sum + val, 0);
 case 'count':
 return values.length;
 case 'average':
 return values.reduce((sum, val) => sum + val, 0) / values.length;
 default:
 return '';
 }
 });
}

/**
 * Export data to standardized Excel format WITHOUT using addTable()
 * NO FORMULAS - all values are static
 * NO addTable() - manual row construction to prevent corruption
 */
export async function exportToStandardExcel(options: ExcelExportOptions): Promise<void> {
 const { sheetName, columns, data, fileName, includeTotals = false, isRTL = false } = options;

 const workbook = new ExcelJS.Workbook();
 const worksheet = workbook.addWorksheet(sheetName);

 // Set RTL if needed
 if (isRTL) {
 worksheet.views = [{ rightToLeft: true }];
 }

 // Set column widths FIRST (before adding any rows)
 columns.forEach((col, index) => {
 const column = worksheet.getColumn(index + 1);
 column.width = col.width || 15;
 
 // Apply number formatting for numeric columns
 if (col.type === 'number' || col.type === 'currency') {
 column.numFmt = '#,##0.00';
 } else if (col.type === 'date') {
 column.numFmt = 'yyyy-mm-dd';
 }
 });

 // Add header row manually
 const headerRow = worksheet.addRow(columns.map(col => col.name));
 headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
 headerRow.fill = {
 type: 'pattern',
 pattern: 'solid',
 fgColor: { argb: 'FF4472C4' }, // Blue header
 };
 headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
 headerRow.height = 20;

 // Add data rows manually with alternating stripes
 data.forEach((rowData, rowIndex) => {
 const row = worksheet.addRow(
 columns.map(col => {
 const value = rowData[col.key];
 
 // Format based on type
 if (col.type === 'number' || col.type === 'currency') {
 return typeof value === 'number' ? value : parseFloat(value) || 0;
 }
 if (col.type === 'date' && value) {
 return value instanceof Date ? value : new Date(value);
 }
 return value ?? '';
 })
 );

 // Alternating row stripes (every other row gets light gray background)
 if (rowIndex % 2 === 1) {
 row.fill = {
 type: 'pattern',
 pattern: 'solid',
 fgColor: { argb: 'FFF2F2F2' }, // Light gray
 };
 }
 });

 // Add TOTAL row with static calculated values (if needed)
 if (includeTotals && data.length > 0) {
 const totalsRow = calculateTotals(data, columns);
 const row = worksheet.addRow(totalsRow);
 
 // Style TOTAL row
 row.font = { bold: true };
 row.fill = {
 type: 'pattern',
 pattern: 'solid',
 fgColor: { argb: 'FFD9D9D9' }, // Gray background
 };
 }

 // Add autoFilter for dropdown filters on header row
 const lastCol = String.fromCharCode(64 + columns.length); // A, B, C, etc.
 const lastRow = worksheet.rowCount;
 worksheet.autoFilter = {
 from: { row: 1, column: 1 },
 to: { row: lastRow, column: columns.length },
 };

 // Export to file with correct MIME type
 const buffer = await workbook.xlsx.writeBuffer();
 const blob = new Blob([buffer], { 
 type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
 });
 saveAs(blob, `${fileName}.xlsx`);
}

/**
 * Export empty template (for import) with standardized format
 * NO FORMULAS - template is completely empty with only headers
 */
export async function exportExcelTemplate(options: Omit<ExcelExportOptions, 'data' | 'includeTotals'>): Promise<void> {
 await exportToStandardExcel({
 ...options,
 data: [], // Empty template
 includeTotals: false, // No totals in template
 });
}
