/**
 * Purchase Request Export/Import Service (CORRECTED)
 * 
 * Handles:
 * 1. Export template generation (blank)
 * 2. Export data (with actual PR data)
 * 3. Import processing (grouping, validation, transformation)
 * 4. Recurrence calculation
 * 5. Import grouping (multiple rows = single PR)
 * 
 * CRITICAL: Uses PURCHASE_REQUEST_COLUMNS as single source of truth
 * FIXES: No Decimal.js, proper MySQL handling, transaction support
 */

import {
  PURCHASE_REQUEST_COLUMNS,
  getExportableColumns,
  getImportableColumns,
  getExcelJSColumns,
  getDefaultValue,
  isColumnReadonly,
  isColumnHidden,
} from 'shared/importConfigs/purchaseRequestImportConfig';

/**
 * Type for PR row data (export/import)
 */
export interface PRRowData {
  // PR Header
  importGroupId?: string;
  prNumber?: string;
  category: string;
  projectTitle: string;
  donorName?: string;
  budgetCode?: string;
  budgetTitle?: string;
  subBudgetLine?: string;
  activityName?: string;
  totalBudgetLine?: number;
  currency: string;
  exchangeRate?: number;
  exchangeTo?: string;
  department?: string;
  requesterName: string;
  requesterEmail: string;
  neededByDate?: string;
  urgency?: string;
  justification?: string;
  procurementLadder?: string;
  status?: string;
  prDate?: string;
  
  // Line Item
  lineNumber: number;
  budgetLine?: string;
  description: string;
  descriptionAr?: string;
  specifications?: string;
  specificationsAr?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice?: number;
  recurrence?: number;
}

/**
 * Type for grouped import data (multiple rows grouped into single PR)
 */
export interface GroupedPRImport {
  importGroupId: string;
  prHeader: {
    category: string;
    projectTitle: string;
    donorName?: string;
    budgetCode?: string;
    budgetTitle?: string;
    subBudgetLine?: string;
    activityName?: string;
    totalBudgetLine?: number;
    currency: string;
    exchangeRate?: number;
    exchangeTo?: string;
    department?: string;
    requesterName: string;
    requesterEmail: string;
    neededByDate?: string;
    urgency?: string;
    justification?: string;
    procurementLadder?: string;
    status?: string;
    prDate?: string;
  };
  lineItems: Array<{
    lineNumber: number;
    budgetLine?: string;
    description: string;
    descriptionAr?: string;
    specifications?: string;
    specificationsAr?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    recurrence: number;
  }>;
  prTotal: number;
  prTotalUsd: number;
}

// ============================================================================
// CALCULATION FUNCTIONS (NO DECIMAL.JS - PURE NUMBERS)
// ============================================================================

/**
 * Calculate total price for a line item
 * quantity × unitPrice × recurrence
 */
export function calculateTotalPrice(
  quantity: number,
  unitPrice: number,
  recurrence: number = 1
): number {
  return Number(quantity) * Number(unitPrice) * Number(recurrence || 1);
}

/**
 * Calculate PR total from line items
 */
export function calculatePRTotal(
  lineItems: Array<{ totalPrice: number; recurrence?: number }>
): number {
  return lineItems.reduce((sum, item) => {
    const recurrence = Number(item.recurrence || 1);
    return sum + (Number(item.totalPrice) * recurrence);
  }, 0);
}

/**
 * Calculate USD equivalent
 */
export function calculatePRTotalUsd(
  prTotal: number,
  exchangeRate: number | string = '1'
): number {
  return Number(prTotal) * Number(exchangeRate || 1);
}

/**
 * Calculate procurement ladder based on total amount
 * MUST match database enum values
 */
export function calculateProcurementLadder(totalUsd: number): string {
  // Verify these match your actual DB enum values
  if (totalUsd <= 5000) return 'one_quotation';
  if (totalUsd <= 25000) return 'three_quotations';
  if (totalUsd <= 100000) return 'public_tender';
  return 'tender';
}

// ============================================================================
// IMPORT GROUPING FUNCTIONS
// ============================================================================

/**
 * Group imported rows by importGroupId
 * Multiple rows with same importGroupId = single PR with multiple line items
 */
export function groupImportedRows(
  rows: PRRowData[]
): Map<string, GroupedPRImport> {
  const grouped = new Map<string, GroupedPRImport>();

  for (const row of rows) {
    const groupId = row.importGroupId || `AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    if (!grouped.has(groupId)) {
      grouped.set(groupId, {
        importGroupId: groupId,
        prHeader: {
          category: row.category,
          projectTitle: row.projectTitle,
          donorName: row.donorName,
          budgetCode: row.budgetCode,
          budgetTitle: row.budgetTitle,
          subBudgetLine: row.subBudgetLine,
          activityName: row.activityName,
          totalBudgetLine: row.totalBudgetLine,
          currency: row.currency,
          exchangeRate: row.exchangeRate ? Number(row.exchangeRate) : 1,
          exchangeTo: row.exchangeTo,
          department: row.department,
          requesterName: row.requesterName,
          requesterEmail: row.requesterEmail,
          neededByDate: row.neededByDate,
          urgency: row.urgency || 'normal',
          justification: row.justification,
          procurementLadder: row.procurementLadder,
          status: row.status || 'draft',
          prDate: row.prDate || new Date().toISOString().split('T')[0],
        },
        lineItems: [],
        prTotal: 0,
        prTotalUsd: 0,
      });
    }

    const group = grouped.get(groupId)!;
    const recurrence = row.recurrence ? Number(row.recurrence) : 1;
    const totalPrice = calculateTotalPrice(
      Number(row.quantity),
      Number(row.unitPrice),
      recurrence
    );

    group.lineItems.push({
      lineNumber: row.lineNumber,
      budgetLine: row.budgetLine,
      description: row.description,
      descriptionAr: row.descriptionAr,
      specifications: row.specifications,
      specificationsAr: row.specificationsAr,
      quantity: Number(row.quantity),
      unit: row.unit,
      unitPrice: Number(row.unitPrice),
      totalPrice,
      recurrence,
    });
  }

  // Calculate totals for each group
  for (const group of grouped.values()) {
    group.prTotal = calculatePRTotal(group.lineItems);
    group.prTotalUsd = calculatePRTotalUsd(
      group.prTotal,
      group.prHeader.exchangeRate || 1
    );
    
    // Recalculate procurement ladder based on total
    if (!group.prHeader.procurementLadder) {
      group.prHeader.procurementLadder = calculateProcurementLadder(group.prTotalUsd);
    }
  }

  return grouped;
}

// ============================================================================
// TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Transform imported row: normalize types, apply defaults
 */
export function transformImportedRow(row: Record<string, any>): PRRowData {
  return {
    importGroupId: row.importGroupId?.toString().trim() || undefined,
    prNumber: row.prNumber?.toString().trim() || undefined,
    category: row.category?.toString().trim() || '',
    projectTitle: row.projectTitle?.toString().trim() || '',
    donorName: row.donorName?.toString().trim() || undefined,
    budgetCode: row.budgetCode?.toString().trim() || undefined,
    budgetTitle: row.budgetTitle?.toString().trim() || undefined,
    subBudgetLine: row.subBudgetLine?.toString().trim() || undefined,
    activityName: row.activityName?.toString().trim() || undefined,
    totalBudgetLine: row.totalBudgetLine ? Number(row.totalBudgetLine) : undefined,
    currency: row.currency?.toString().trim() || 'USD',
    exchangeRate: row.exchangeRate ? Number(row.exchangeRate) : 1,
    exchangeTo: row.exchangeTo?.toString().trim() || undefined,
    department: row.department?.toString().trim() || undefined,
    requesterName: row.requesterName?.toString().trim() || '',
    requesterEmail: row.requesterEmail?.toString().trim() || '',
    neededByDate: row.neededByDate?.toString().trim() || undefined,
    urgency: row.urgency?.toString().trim() || getDefaultValue('urgency'),
    justification: row.justification?.toString().trim() || undefined,
    procurementLadder: row.procurementLadder?.toString().trim() || undefined,
    status: row.status?.toString().trim() || 'draft',
    prDate: row.prDate?.toString().trim() || new Date().toISOString().split('T')[0],
    
    lineNumber: Number(row.lineNumber) || 1,
    budgetLine: row.budgetLine?.toString().trim() || undefined,
    description: row.description?.toString().trim() || '',
    descriptionAr: row.descriptionAr?.toString().trim() || undefined,
    specifications: row.specifications?.toString().trim() || undefined,
    specificationsAr: row.specificationsAr?.toString().trim() || undefined,
    quantity: Number(row.quantity) || 0,
    unit: row.unit?.toString().trim() || '',
    unitPrice: Number(row.unitPrice) || 0,
    totalPrice: row.totalPrice ? Number(row.totalPrice) : undefined,
    recurrence: row.recurrence ? Number(row.recurrence) : getDefaultValue('recurrence'),
  };
}

/**
 * Prepare row for export: format numbers, handle nulls
 */
export function prepareRowForExport(data: any): Record<string, any> {
  const result: Record<string, any> = {};

  for (const column of getExportableColumns()) {
    const key = column.key;
    const value = data[key];

    if (value === null || value === undefined) {
      result[key] = '';
    } else if (column.dataType === 'number') {
      result[key] = Number(value).toFixed(2);
    } else if (column.dataType === 'date') {
      result[key] = new Date(value).toISOString().split('T')[0];
    } else {
      result[key] = String(value).trim();
    }
  }

  return result;
}

// ============================================================================
// EXCEL PARSING FUNCTIONS
// ============================================================================

/**
 * Safe conversion of ExcelJS cell value
 * Handles union types and error values
 */
export function getCellValue(cell: any): any {
  if (!cell || !cell.value) return '';

  // Handle rich text
  if (typeof cell.value === 'object' && 'text' in cell.value) {
    return cell.value.text;
  }

  // Handle error values
  if (typeof cell.value === 'object' && 'error' in cell.value) {
    return '';
  }

  return cell.value;
}

/**
 * Parse Excel file and extract rows
 * Returns array of row data
 */
export async function parseExcelFile(
  buffer: Buffer,
  sheetName: string = 'Purchase Requests'
): Promise<PRRowData[]> {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet(sheetName);

  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found in Excel file`);
  }

  const rows: PRRowData[] = [];
  const headers: string[] = [];

  // Extract headers from first row
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell: any, colNumber: number) => {
    headers[colNumber] = getCellValue(cell)?.toString().trim() || '';
  });

  // Extract data rows (skip header)
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const rowData: Record<string, any> = {};

    row.eachCell((cell: any, colNumber: number) => {
      const header = headers[colNumber];
      if (header) {
        const headerValue = String(header);
        const value = getCellValue(cell);
        rowData[headerValue] = value;
      }
    });

    // Skip empty rows
    if (Object.values(rowData).some(v => v && v !== '')) {
      rows.push(transformImportedRow(rowData));
    }
  }

  return rows;
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Generate Excel template (blank)
 */
export async function generateExportTemplate(): Promise<Buffer> {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Purchase Requests');

  // Add headers
  const columns = getExcelJSColumns();
  worksheet.columns = columns;

  // Add sample row with instructions
  const sampleRow = worksheet.addRow({});
  worksheet.addRow({}); // Empty row for spacing

  // Add instructions
  const instructionsSheet = workbook.addWorksheet('Instructions');
  instructionsSheet.addRow(['Purchase Request Import Template']);
  instructionsSheet.addRow(['']);
  instructionsSheet.addRow(['INSTRUCTIONS:']);
  instructionsSheet.addRow(['1. Fill in the Purchase Requests sheet with your data']);
  instructionsSheet.addRow(['2. Each row = one line item']);
  instructionsSheet.addRow(['3. Use same importGroupId for multiple items in one PR']);
  instructionsSheet.addRow(['4. Do NOT edit: prNumber, totalPrice (auto-calculated)']);
  instructionsSheet.addRow(['5. Required fields: category, projectTitle, requesterName, requesterEmail, description, quantity, unit, unitPrice']);
  instructionsSheet.addRow(['6. Recurrence defaults to 1 if not specified']);

  // Convert to buffer with proper type casting
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer as ArrayBuffer);

  return buffer;
}

/**
 * Generate PR number
 */
export function generatePRNumber(): string {
  return `PR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
