/**
 * Corruption-Free Excel Error Report Generator
 * 
 * CRITICAL: Uses MANUAL ROW CONSTRUCTION to prevent "Excel repaired the file" warnings
 * 
 * NO worksheet.addTable() - builds Excel files row-by-row with manual styling
 * 
 * Source: "CRITICAL: Fix Excel Generation – No Repaired Files Allowed"
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface ErrorReportRow {
 row: number;
 field: string;
 errorType?: string;
 message: string;
 suggestedFix?: string;
 originalData?: Record<string, any>;
}

export interface ErrorReportOptions {
 errors: ErrorReportRow[];
 fileName: string;
 /** Additional columns from original data to include */
 dataColumns?: Array<{ header: string; key: string; width?: number }>;
}

/**
 * Generate Excel error report using MANUAL ROW CONSTRUCTION (no corruption)
 * NO addTable() - builds row-by-row with styling
 */
export async function generateErrorReport(options: ErrorReportOptions): Promise<void> {
 const { errors, fileName, dataColumns = [] } = options;

 if (errors.length === 0) {
 console.warn('No errors to export');
 return;
 }

 const workbook = new ExcelJS.Workbook();
 const worksheet = workbook.addWorksheet('Import Errors');

 // Define all columns (error info + original data)
 const errorColumnHeaders = ['Row', 'Field', 'Error Type', 'Error Message', 'Suggested Fix'];
 const dataColumnHeaders = dataColumns.map(col => col.header);
 const allHeaders = [...errorColumnHeaders, ...dataColumnHeaders];

 // Define column widths
 const columnWidths = [
 10, // Row
 20, // Field
 15, // Error Type
 40, // Error Message
 40, // Suggested Fix
 ...dataColumns.map(col => col.width || 15),
 ];

 // Set column widths FIRST (before adding any rows)
 columnWidths.forEach((width, index) => {
 const column = worksheet.getColumn(index + 1);
 column.width = width;
 });

 // Add header row manually with blue styling
 const headerRow = worksheet.addRow(allHeaders);
 headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
 headerRow.fill = {
 type: 'pattern',
 pattern: 'solid',
 fgColor: { argb: 'FF4472C4' }, // Blue header
 };
 headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
 headerRow.height = 20;

 // Add error rows manually with red highlighting
 errors.forEach((error, rowIndex) => {
 const errorData = [
 error.row,
 error.field,
 error.errorType || 'Validation',
 error.message,
 error.suggestedFix || 'Check data format and try again',
 ];

 const originalData = dataColumns.map(col => 
 error.originalData?.[col.key] ?? ''
 );

 const row = worksheet.addRow([...errorData, ...originalData]);

 // Highlight error rows in red
 row.eachCell((cell) => {
 cell.fill = {
 type: 'pattern',
 pattern: 'solid',
 fgColor: { argb: 'FFFFC7CE' }, // Light red background
 };
 cell.font = { color: { argb: 'FF9C0006' } }; // Dark red text
 });
 });

 // Add autoFilter for dropdown filters on header row
 const lastRow = worksheet.rowCount;
 const lastCol = allHeaders.length;
 worksheet.autoFilter = {
 from: { row: 1, column: 1 },
 to: { row: lastRow, column: lastCol },
 };

 // Export file with correct MIME type
 const buffer = await workbook.xlsx.writeBuffer();
 const blob = new Blob([buffer], {
 type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 });
 
 const timestamp = new Date().toISOString().split('T')[0];
 saveAs(blob, `${fileName}_ERRORS_${timestamp}.xlsx`);
}
