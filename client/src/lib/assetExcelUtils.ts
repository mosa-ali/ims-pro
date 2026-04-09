/**
 * ============================================================================
 * ASSET EXCEL IMPORT/EXPORT UTILITIES
 * ============================================================================
 * Shared utilities for Excel export, template download, and import parsing
 * for all Assets section pages (Registry, Categories, Transfers, Disposals).
 * Uses ExcelJS for true .xlsx format with professional styling.
 * ============================================================================
 */
import ExcelJS from 'exceljs';

// ─── Styling helpers ────────────────────────────────────────────────────────

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E40AF' }, // dark blue
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
};

const REQUIRED_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFF3CD' }, // light yellow for required columns
};

const ALT_ROW_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF8FAFC' },
};

function applyHeaderRow(row: ExcelJS.Row, requiredCols: number[] = []) {
  row.eachCell((cell, colNumber) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF1E40AF' } },
    };
    if (requiredCols.includes(colNumber)) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDC2626' }, // red for required
      };
    }
  });
  row.height = 30;
}

function applyDataRows(worksheet: ExcelJS.Worksheet, startRow: number) {
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= startRow) return;
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', wrapText: false };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
    if (rowNumber % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = ALT_ROW_FILL;
      });
    }
    row.height = 22;
  });
}

function addInstructionSheet(workbook: ExcelJS.Workbook, instructions: string[]) {
  const sheet = workbook.addWorksheet('Instructions');
  sheet.getColumn(1).width = 80;
  const titleRow = sheet.addRow(['Import Instructions']);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };
  titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  titleRow.height = 28;
  sheet.addRow([]);
  instructions.forEach((line) => {
    const row = sheet.addRow([line]);
    row.getCell(1).alignment = { wrapText: true };
    row.height = 20;
  });
}

function triggerDownload(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Asset Registry ──────────────────────────────────────────────────────────

export interface AssetRow {
  id?: number;
  assetCode: string;
  name: string;
  nameAr?: string;
  category?: string;
  acquisitionDate?: string;
  acquisitionCost?: string;
  currency?: string;
  status?: string;
  condition?: string;
  location?: string;
  assignedTo?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  donorName?: string;
  grantCode?: string;
}

export async function exportAssetsToExcel(assets: AssetRow[], filename = 'assets-export.xlsx') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IMS';
  const ws = workbook.addWorksheet('Assets');

  ws.columns = [
    { header: 'Asset Code *', key: 'assetCode', width: 16 },
    { header: 'Name *', key: 'name', width: 28 },
    { header: 'Name (Arabic)', key: 'nameAr', width: 28 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Acquisition Date (YYYY-MM-DD)', key: 'acquisitionDate', width: 26 },
    { header: 'Acquisition Cost', key: 'acquisitionCost', width: 18 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Condition', key: 'condition', width: 14 },
    { header: 'Location', key: 'location', width: 22 },
    { header: 'Assigned To', key: 'assignedTo', width: 22 },
    { header: 'Serial Number', key: 'serialNumber', width: 18 },
    { header: 'Manufacturer', key: 'manufacturer', width: 18 },
    { header: 'Model', key: 'model', width: 16 },
    { header: 'Donor Name', key: 'donorName', width: 20 },
    { header: 'Grant Code', key: 'grantCode', width: 16 },
  ];

  applyHeaderRow(ws.getRow(1), [1, 2]);
  assets.forEach((a) => ws.addRow(a));
  applyDataRows(ws, 1);

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, filename);
}

export async function downloadAssetTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IMS';
  const ws = workbook.addWorksheet('Assets');

  ws.columns = [
    { header: 'Asset Code *', key: 'assetCode', width: 16 },
    { header: 'Name *', key: 'name', width: 28 },
    { header: 'Name (Arabic)', key: 'nameAr', width: 28 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Acquisition Date (YYYY-MM-DD)', key: 'acquisitionDate', width: 26 },
    { header: 'Acquisition Cost', key: 'acquisitionCost', width: 18 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Condition', key: 'condition', width: 14 },
    { header: 'Location', key: 'location', width: 22 },
    { header: 'Assigned To', key: 'assignedTo', width: 22 },
    { header: 'Serial Number', key: 'serialNumber', width: 18 },
    { header: 'Manufacturer', key: 'manufacturer', width: 18 },
    { header: 'Model', key: 'model', width: 16 },
    { header: 'Donor Name', key: 'donorName', width: 20 },
    { header: 'Grant Code', key: 'grantCode', width: 16 },
  ];

  applyHeaderRow(ws.getRow(1), [1, 2]);

  // Add example row
  ws.addRow({
    assetCode: 'ASSET-001',
    name: 'Laptop Dell XPS',
    nameAr: 'لابتوب ديل',
    category: '',
    acquisitionDate: '2024-01-15',
    acquisitionCost: '1200.00',
    currency: 'USD',
    status: 'active',
    condition: 'good',
    location: 'Main Office',
    assignedTo: 'John Doe',
    serialNumber: 'SN-12345',
    manufacturer: 'Dell',
    model: 'XPS 15',
    donorName: '',
    grantCode: '',
  });

  // Style example row
  const exRow = ws.getRow(2);
  exRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
    cell.font = { italic: true, color: { argb: 'FF2E7D32' } };
  });

  addInstructionSheet(workbook, [
    '📋 ASSET REGISTRY IMPORT TEMPLATE',
    '',
    '✅ Required Fields (marked with * in red headers):',
    '   • Asset Code: Unique identifier (e.g., ASSET-001)',
    '   • Name: Asset name in English',
    '',
    '📌 Valid Values:',
    '   • Status: active | in_maintenance | disposed | lost | transferred | pending_disposal',
    '   • Condition: excellent | good | fair | poor | non_functional',
    '   • Currency: USD | EUR | YER | SAR | AED (ISO codes)',
    '   • Acquisition Date: YYYY-MM-DD format (e.g., 2024-01-15)',
    '',
    '⚠️ Rules:',
    '   • Do not modify the header row',
    '   • Remove the example (green) row before importing',
    '   • Asset Code must be unique within your organization',
    '   • Acquisition Cost must be a number (e.g., 1200.00)',
    '   • Maximum 500 rows per import',
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, 'asset-registry-import-template.xlsx');
}

export interface AssetImportValidationError {
  row: number;
  field: string;
  message: string;
  suggestedFix: string;
}

export async function parseAssetImportFile(
  file: File
): Promise<{ data: AssetRow[]; errors: AssetImportValidationError[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const ws = workbook.getWorksheet('Assets') || workbook.worksheets[0];
  if (!ws) return { data: [], errors: [{ row: 0, field: 'file', message: 'No worksheet found', suggestedFix: 'Use the provided template' }] };

  const data: AssetRow[] = [];
  const errors: AssetImportValidationError[] = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const cells = row.values as any[];
    const assetCode = String(cells[1] || '').trim();
    const name = String(cells[2] || '').trim();

    if (!assetCode && !name) return; // skip empty rows

    // Validation
    if (!assetCode) {
      errors.push({ row: rowNumber, field: 'assetCode', message: 'Asset Code is required', suggestedFix: 'Provide a unique asset code (e.g., ASSET-001)' });
    }
    if (!name) {
      errors.push({ row: rowNumber, field: 'name', message: 'Name is required', suggestedFix: 'Provide the asset name in English' });
    }

    const acquisitionCost = String(cells[6] || '').trim();
    if (acquisitionCost && isNaN(parseFloat(acquisitionCost))) {
      errors.push({ row: rowNumber, field: 'acquisitionCost', message: 'Acquisition Cost must be a number', suggestedFix: 'Enter a numeric value (e.g., 1200.00)' });
    }

    const validStatuses = ['active', 'in_maintenance', 'disposed', 'lost', 'transferred', 'pending_disposal'];
    const status = String(cells[8] || '').trim().toLowerCase();
    if (status && !validStatuses.includes(status)) {
      errors.push({ row: rowNumber, field: 'status', message: `Invalid status: "${status}"`, suggestedFix: `Use one of: ${validStatuses.join(', ')}` });
    }

    const validConditions = ['excellent', 'good', 'fair', 'poor', 'non_functional'];
    const condition = String(cells[9] || '').trim().toLowerCase();
    if (condition && !validConditions.includes(condition)) {
      errors.push({ row: rowNumber, field: 'condition', message: `Invalid condition: "${condition}"`, suggestedFix: `Use one of: ${validConditions.join(', ')}` });
    }

    const acquisitionDate = String(cells[5] || '').trim();
    if (acquisitionDate && !/^\d{4}-\d{2}-\d{2}$/.test(acquisitionDate)) {
      errors.push({ row: rowNumber, field: 'acquisitionDate', message: 'Date must be YYYY-MM-DD format', suggestedFix: 'Use format: 2024-01-15' });
    }

    data.push({
      assetCode,
      name,
      nameAr: String(cells[3] || '').trim() || undefined,
      acquisitionDate: acquisitionDate || undefined,
      acquisitionCost: acquisitionCost || undefined,
      currency: String(cells[7] || '').trim() || undefined,
      status: status || undefined,
      condition: condition || undefined,
      location: String(cells[10] || '').trim() || undefined,
      assignedTo: String(cells[11] || '').trim() || undefined,
      serialNumber: String(cells[12] || '').trim() || undefined,
      manufacturer: String(cells[13] || '').trim() || undefined,
      model: String(cells[14] || '').trim() || undefined,
      donorName: String(cells[15] || '').trim() || undefined,
      grantCode: String(cells[16] || '').trim() || undefined,
    });
  });

  return { data, errors };
}

// ─── Asset Categories ─────────────────────────────────────────────────────────

export interface CategoryRow {
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  depreciationRate?: string;
  defaultUsefulLife?: string;
}

export async function exportCategoriesToExcel(categories: CategoryRow[], filename = 'asset-categories-export.xlsx') {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Categories');

  ws.columns = [
    { header: 'Code *', key: 'code', width: 16 },
    { header: 'Name *', key: 'name', width: 28 },
    { header: 'Name (Arabic)', key: 'nameAr', width: 28 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Depreciation Rate (%)', key: 'depreciationRate', width: 22 },
    { header: 'Default Useful Life (Years)', key: 'defaultUsefulLife', width: 26 },
  ];

  applyHeaderRow(ws.getRow(1), [1, 2]);
  categories.forEach((c) => ws.addRow(c));
  applyDataRows(ws, 1);

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, filename);
}

export async function downloadCategoryTemplate() {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Categories');

  ws.columns = [
    { header: 'Code *', key: 'code', width: 16 },
    { header: 'Name *', key: 'name', width: 28 },
    { header: 'Name (Arabic)', key: 'nameAr', width: 28 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Depreciation Rate (%)', key: 'depreciationRate', width: 22 },
    { header: 'Default Useful Life (Years)', key: 'defaultUsefulLife', width: 26 },
  ];

  applyHeaderRow(ws.getRow(1), [1, 2]);
  ws.addRow({ code: 'IT-EQUIP', name: 'IT Equipment', nameAr: 'معدات تقنية', description: 'Computers and peripherals', depreciationRate: '20.00', defaultUsefulLife: '5' });

  const exRow = ws.getRow(2);
  exRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
    cell.font = { italic: true, color: { argb: 'FF2E7D32' } };
  });

  addInstructionSheet(workbook, [
    '📋 ASSET CATEGORIES IMPORT TEMPLATE',
    '',
    '✅ Required Fields (marked with * in red headers):',
    '   • Code: Unique category code (e.g., IT-EQUIP)',
    '   • Name: Category name in English',
    '',
    '📌 Notes:',
    '   • Depreciation Rate: Percentage per year (e.g., 20.00 for 20%)',
    '   • Default Useful Life: Number of years (e.g., 5)',
    '',
    '⚠️ Rules:',
    '   • Do not modify the header row',
    '   • Remove the example (green) row before importing',
    '   • Category Code must be unique within your organization',
    '   • Maximum 200 rows per import',
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, 'asset-categories-import-template.xlsx');
}

export async function parseCategoryImportFile(
  file: File
): Promise<{ data: CategoryRow[]; errors: AssetImportValidationError[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const ws = workbook.getWorksheet('Categories') || workbook.worksheets[0];
  if (!ws) return { data: [], errors: [{ row: 0, field: 'file', message: 'No worksheet found', suggestedFix: 'Use the provided template' }] };

  const data: CategoryRow[] = [];
  const errors: AssetImportValidationError[] = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cells = row.values as any[];
    const code = String(cells[1] || '').trim();
    const name = String(cells[2] || '').trim();
    if (!code && !name) return;

    if (!code) errors.push({ row: rowNumber, field: 'code', message: 'Code is required', suggestedFix: 'Provide a unique category code' });
    if (!name) errors.push({ row: rowNumber, field: 'name', message: 'Name is required', suggestedFix: 'Provide the category name in English' });

    const depRate = String(cells[5] || '').trim();
    if (depRate && isNaN(parseFloat(depRate))) {
      errors.push({ row: rowNumber, field: 'depreciationRate', message: 'Depreciation Rate must be a number', suggestedFix: 'Enter a numeric value (e.g., 20.00)' });
    }

    const usefulLife = String(cells[6] || '').trim();
    if (usefulLife && isNaN(parseInt(usefulLife))) {
      errors.push({ row: rowNumber, field: 'defaultUsefulLife', message: 'Useful Life must be a whole number', suggestedFix: 'Enter a number (e.g., 5)' });
    }

    data.push({
      code,
      name,
      nameAr: String(cells[3] || '').trim() || undefined,
      description: String(cells[4] || '').trim() || undefined,
      depreciationRate: depRate || undefined,
      defaultUsefulLife: usefulLife || undefined,
    });
  });

  return { data, errors };
}

// ─── Asset Transfers ──────────────────────────────────────────────────────────

export interface TransferRow {
  assetCode: string;
  fromLocation?: string;
  toLocation?: string;
  fromAssignee?: string;
  toAssignee?: string;
  transferDate?: string;
  reason?: string;
}

export async function exportTransfersToExcel(transfers: any[], filename = 'asset-transfers-export.xlsx') {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Transfers');

  ws.columns = [
    { header: 'Transfer Code', key: 'transferCode', width: 18 },
    { header: 'Asset Code', key: 'assetCode', width: 16 },
    { header: 'Asset Name', key: 'assetName', width: 28 },
    { header: 'From Location', key: 'fromLocation', width: 22 },
    { header: 'To Location', key: 'toLocation', width: 22 },
    { header: 'From Assignee', key: 'fromAssignee', width: 22 },
    { header: 'To Assignee', key: 'toAssignee', width: 22 },
    { header: 'Transfer Date', key: 'transferDate', width: 18 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Reason', key: 'reason', width: 40 },
  ];

  applyHeaderRow(ws.getRow(1));
  transfers.forEach((t) => ws.addRow({
    transferCode: t.transferCode,
    assetCode: t.asset?.assetCode || '',
    assetName: t.asset?.name || '',
    fromLocation: t.fromLocation,
    toLocation: t.toLocation,
    fromAssignee: t.fromAssignee,
    toAssignee: t.toAssignee,
    transferDate: t.transferDate ? new Date(t.transferDate).toISOString().split('T')[0] : '',
    status: t.status,
    reason: t.reason,
  }));
  applyDataRows(ws, 1);

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, filename);
}

export async function downloadTransferTemplate() {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Transfers');

  ws.columns = [
    { header: 'Asset Code *', key: 'assetCode', width: 16 },
    { header: 'From Location', key: 'fromLocation', width: 22 },
    { header: 'To Location *', key: 'toLocation', width: 22 },
    { header: 'From Assignee', key: 'fromAssignee', width: 22 },
    { header: 'To Assignee', key: 'toAssignee', width: 22 },
    { header: 'Transfer Date (YYYY-MM-DD)', key: 'transferDate', width: 26 },
    { header: 'Reason', key: 'reason', width: 40 },
  ];

  applyHeaderRow(ws.getRow(1), [1, 3]);
  ws.addRow({ assetCode: 'ASSET-001', fromLocation: 'Main Office', toLocation: 'Field Office', fromAssignee: 'John Doe', toAssignee: 'Jane Smith', transferDate: '2024-03-01', reason: 'Project deployment' });

  const exRow = ws.getRow(2);
  exRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
    cell.font = { italic: true, color: { argb: 'FF2E7D32' } };
  });

  addInstructionSheet(workbook, [
    '📋 ASSET TRANSFERS IMPORT TEMPLATE',
    '',
    '✅ Required Fields (marked with * in red headers):',
    '   • Asset Code: Must match an existing asset in the system',
    '   • To Location: Destination location',
    '',
    '📌 Notes:',
    '   • Transfer Date: YYYY-MM-DD format (e.g., 2024-03-01)',
    '   • Transfer code is auto-generated by the system',
    '   • Status will be set to "pending" automatically',
    '',
    '⚠️ Rules:',
    '   • Asset Code must exist in the Asset Registry',
    '   • Remove the example (green) row before importing',
    '   • Maximum 200 rows per import',
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, 'asset-transfers-import-template.xlsx');
}

export async function parseTransferImportFile(
  file: File
): Promise<{ data: TransferRow[]; errors: AssetImportValidationError[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const ws = workbook.getWorksheet('Transfers') || workbook.worksheets[0];
  if (!ws) return { data: [], errors: [{ row: 0, field: 'file', message: 'No worksheet found', suggestedFix: 'Use the provided template' }] };

  const data: TransferRow[] = [];
  const errors: AssetImportValidationError[] = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cells = row.values as any[];
    const assetCode = String(cells[1] || '').trim();
    if (!assetCode) return;

    if (!assetCode) errors.push({ row: rowNumber, field: 'assetCode', message: 'Asset Code is required', suggestedFix: 'Provide an existing asset code' });

    const transferDate = String(cells[6] || '').trim();
    if (transferDate && !/^\d{4}-\d{2}-\d{2}$/.test(transferDate)) {
      errors.push({ row: rowNumber, field: 'transferDate', message: 'Date must be YYYY-MM-DD format', suggestedFix: 'Use format: 2024-03-01' });
    }

    data.push({
      assetCode,
      fromLocation: String(cells[2] || '').trim() || undefined,
      toLocation: String(cells[3] || '').trim() || undefined,
      fromAssignee: String(cells[4] || '').trim() || undefined,
      toAssignee: String(cells[5] || '').trim() || undefined,
      transferDate: transferDate || undefined,
      reason: String(cells[7] || '').trim() || undefined,
    });
  });

  return { data, errors };
}

// ─── Asset Disposals ──────────────────────────────────────────────────────────

export interface DisposalRow {
  assetCode: string;
  disposalType?: string;
  proposedDate?: string;
  proposedValue?: string;
  reason?: string;
  buyerInfo?: string;
  recipientInfo?: string;
  notes?: string;
}

export async function exportDisposalsToExcel(disposals: any[], filename = 'asset-disposals-export.xlsx') {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Disposals');

  ws.columns = [
    { header: 'Disposal Code', key: 'disposalCode', width: 18 },
    { header: 'Asset Code', key: 'assetCode', width: 16 },
    { header: 'Asset Name', key: 'assetName', width: 28 },
    { header: 'Disposal Type', key: 'disposalType', width: 18 },
    { header: 'Proposed Date', key: 'proposedDate', width: 18 },
    { header: 'Book Value', key: 'bookValue', width: 14 },
    { header: 'Proposed Value', key: 'proposedValue', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Reason', key: 'reason', width: 40 },
    { header: 'Buyer/Recipient Info', key: 'buyerInfo', width: 30 },
  ];

  applyHeaderRow(ws.getRow(1));
  disposals.forEach((d) => ws.addRow({
    disposalCode: d.disposalCode,
    assetCode: d.asset?.assetCode || '',
    assetName: d.asset?.name || '',
    disposalType: d.disposalType,
    proposedDate: d.proposedDate ? new Date(d.proposedDate).toISOString().split('T')[0] : '',
    bookValue: d.bookValue,
    proposedValue: d.proposedValue,
    status: d.status,
    reason: d.reason,
    buyerInfo: d.buyerInfo || d.recipientInfo || '',
  }));
  applyDataRows(ws, 1);

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, filename);
}

export async function downloadDisposalTemplate() {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Disposals');

  ws.columns = [
    { header: 'Asset Code *', key: 'assetCode', width: 16 },
    { header: 'Disposal Type', key: 'disposalType', width: 18 },
    { header: 'Proposed Date (YYYY-MM-DD)', key: 'proposedDate', width: 26 },
    { header: 'Proposed Value', key: 'proposedValue', width: 16 },
    { header: 'Reason', key: 'reason', width: 40 },
    { header: 'Buyer Info', key: 'buyerInfo', width: 30 },
    { header: 'Recipient Info', key: 'recipientInfo', width: 30 },
    { header: 'Notes', key: 'notes', width: 40 },
  ];

  applyHeaderRow(ws.getRow(1), [1]);
  ws.addRow({ assetCode: 'ASSET-001', disposalType: 'sale', proposedDate: '2024-06-01', proposedValue: '500.00', reason: 'End of life', buyerInfo: 'Local vendor', recipientInfo: '', notes: '' });

  const exRow = ws.getRow(2);
  exRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
    cell.font = { italic: true, color: { argb: 'FF2E7D32' } };
  });

  addInstructionSheet(workbook, [
    '📋 ASSET DISPOSALS IMPORT TEMPLATE',
    '',
    '✅ Required Fields (marked with * in red headers):',
    '   • Asset Code: Must match an existing asset in the system',
    '',
    '📌 Valid Values:',
    '   • Disposal Type: sale | donation | scrap | theft | loss | transfer_out | write_off',
    '   • Proposed Date: YYYY-MM-DD format (e.g., 2024-06-01)',
    '   • Proposed Value: Numeric value (e.g., 500.00)',
    '',
    '⚠️ Rules:',
    '   • Asset Code must exist in the Asset Registry',
    '   • Asset status will be set to "pending_disposal" automatically',
    '   • Disposal code is auto-generated by the system',
    '   • Remove the example (green) row before importing',
    '   • Maximum 200 rows per import',
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, 'asset-disposals-import-template.xlsx');
}

export async function parseDisposalImportFile(
  file: File
): Promise<{ data: DisposalRow[]; errors: AssetImportValidationError[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const ws = workbook.getWorksheet('Disposals') || workbook.worksheets[0];
  if (!ws) return { data: [], errors: [{ row: 0, field: 'file', message: 'No worksheet found', suggestedFix: 'Use the provided template' }] };

  const data: DisposalRow[] = [];
  const errors: AssetImportValidationError[] = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cells = row.values as any[];
    const assetCode = String(cells[1] || '').trim();
    if (!assetCode) return;

    const validTypes = ['sale', 'donation', 'scrap', 'theft', 'loss', 'transfer_out', 'write_off'];
    const disposalType = String(cells[2] || '').trim().toLowerCase();
    if (disposalType && !validTypes.includes(disposalType)) {
      errors.push({ row: rowNumber, field: 'disposalType', message: `Invalid disposal type: "${disposalType}"`, suggestedFix: `Use one of: ${validTypes.join(', ')}` });
    }

    const proposedDate = String(cells[3] || '').trim();
    if (proposedDate && !/^\d{4}-\d{2}-\d{2}$/.test(proposedDate)) {
      errors.push({ row: rowNumber, field: 'proposedDate', message: 'Date must be YYYY-MM-DD format', suggestedFix: 'Use format: 2024-06-01' });
    }

    const proposedValue = String(cells[4] || '').trim();
    if (proposedValue && isNaN(parseFloat(proposedValue))) {
      errors.push({ row: rowNumber, field: 'proposedValue', message: 'Proposed Value must be a number', suggestedFix: 'Enter a numeric value (e.g., 500.00)' });
    }

    data.push({
      assetCode,
      disposalType: disposalType || undefined,
      proposedDate: proposedDate || undefined,
      proposedValue: proposedValue || undefined,
      reason: String(cells[5] || '').trim() || undefined,
      buyerInfo: String(cells[6] || '').trim() || undefined,
      recipientInfo: String(cells[7] || '').trim() || undefined,
      notes: String(cells[8] || '').trim() || undefined,
    });
  });

  return { data, errors };
}
