/**
 * ============================================================================
 * SYSTEM-WIDE DUPLICATION DETECTION SERVICE
 * ============================================================================
 * 
 * MANDATORY for ALL Excel imports across ALL modules.
 * Enforces data integrity, auditability, and donor compliance.
 * 
 * NON-NEGOTIABLE RULES:
 * 1. Every import MUST check for duplicates before processing
 * 2. User MUST explicitly allow duplicates if detected
 * 3. All duplicate decisions are logged for audit
 * 4. Backend validation required (not UI only)
 * ============================================================================
 */

import { ModuleName } from '@/app/contexts/ImportHistoryContext';

/**
 * Duplicate record detected during import validation
 */
export interface DuplicateRecord {
 rowNumber: number;
 rowData: any;
 duplicateKey: string;
 duplicateFields: string[];
 existingRecordId?: string;
 existingRecordData?: any;
 reason: string;
}

/**
 * Result of duplication detection scan
 */
export interface DuplicationScanResult {
 hasDuplicates: boolean;
 totalRows: number;
 duplicateCount: number;
 uniqueCount: number;
 duplicates: DuplicateRecord[];
 scanTimestamp: string;
}

/**
 * Module-specific business key configuration
 * Defines which fields uniquely identify a record in each module
 */
export const MODULE_BUSINESS_KEYS: Record<ModuleName, {
 fields: string[];
 description: string;
 caseSensitive: boolean;
}> = {
 'Tasks': {
 fields: ['Task Name', 'Project ID', 'Start Date'],
 description: 'Task Name + Project + Start Date',
 caseSensitive: false
 },
 'Beneficiaries': {
 fields: ['National ID', 'Project ID'],
 description: 'National ID within Project',
 caseSensitive: false
 },
 'Activities': {
 fields: ['Activity Code', 'Project ID'],
 description: 'Activity Code within Project',
 caseSensitive: false
 },
 'Indicators': {
 fields: ['Indicator Code', 'Project ID'],
 description: 'Indicator Code within Project',
 caseSensitive: false
 },
 'Budget Lines': {
 fields: ['Account Code', 'Budget Year', 'Project ID'],
 description: 'Account Code + Year + Project',
 caseSensitive: false
 },
 'Forecast Plan': {
 fields: ['Account Code', 'Period', 'Project ID'],
 description: 'Account Code + Period + Project',
 caseSensitive: false
 },
 'Expenses': {
 fields: ['Expense ID', 'Project ID'],
 description: 'Expense ID within Project',
 caseSensitive: false
 },
 'Procurement': {
 fields: ['PO Number', 'Vendor ID'],
 description: 'Purchase Order Number + Vendor',
 caseSensitive: false
 },
 'Stock Items': {
 fields: ['Item Code', 'Warehouse ID'],
 description: 'Item Code + Warehouse',
 caseSensitive: false
 },
 'Cases': {
 fields: ['Case Number'],
 description: 'Case Number (globally unique)',
 caseSensitive: false
 },
 'Surveys': {
 fields: ['Survey ID', 'Respondent ID'],
 description: 'Survey ID + Respondent',
 caseSensitive: false
 },
 'Documents': {
 fields: ['Document ID', 'Version'],
 description: 'Document ID + Version',
 caseSensitive: false
 },
 'Users': {
 fields: ['Email'],
 description: 'Email Address (globally unique)',
 caseSensitive: false
 },
 'Projects': {
 fields: ['Project Code'],
 description: 'Project Code (globally unique)',
 caseSensitive: false
 },
 'Proposals': {
 fields: ['Proposal Number'],
 description: 'Proposal Number (globally unique)',
 caseSensitive: false
 }
};

/**
 * Generate a unique key from row data based on business key fields
 */
function generateBusinessKey(
 row: any,
 fields: string[],
 caseSensitive: boolean
): string {
 const values = fields.map(field => {
 const value = row[field];
 if (value === null || value === undefined || value === '') {
 return ''; // Empty values treated as empty string
 }
 const stringValue = String(value).trim();
 return caseSensitive ? stringValue : stringValue.toLowerCase();
 });
 
 return values.join('||'); // Use || as separator
}

/**
 * Detect internal duplicates within the import file itself
 * This checks for duplicate rows within the Excel file being imported
 */
export function detectInternalDuplicates(
 rows: any[],
 moduleName: ModuleName
): DuplicateRecord[] {
 const config = MODULE_BUSINESS_KEYS[moduleName];
 if (!config) {
 console.warn(`No business key configuration for module: ${moduleName}`);
 return [];
 }

 const seenKeys = new Map<string, { rowNumber: number; rowData: any }>();
 const duplicates: DuplicateRecord[] = [];

 rows.forEach((row, index) => {
 const rowNumber = index + 2; // +2 because Excel is 1-indexed and has header row
 
 // Generate business key
 const businessKey = generateBusinessKey(row, config.fields, config.caseSensitive);
 
 // Check if this key was already seen
 if (seenKeys.has(businessKey)) {
 const original = seenKeys.get(businessKey)!;
 duplicates.push({
 rowNumber,
 rowData: row,
 duplicateKey: businessKey,
 duplicateFields: config.fields,
 existingRecordId: `Row ${original.rowNumber}`,
 existingRecordData: original.rowData,
 reason: `Duplicate of Row ${original.rowNumber} (${config.description})`
 });
 } else {
 seenKeys.set(businessKey, { rowNumber, rowData: row });
 }
 });

 return duplicates;
}

/**
 * Detect duplicates against existing database records
 * This checks if rows in the Excel file already exist in the database
 * 
 * NOTE: In production, this should query the actual database.
 * For now, we'll use a mock check against localStorage.
 */
export async function detectExistingDuplicates(
 rows: any[],
 moduleName: ModuleName,
 projectId?: string
): Promise<DuplicateRecord[]> {
 const config = MODULE_BUSINESS_KEYS[moduleName];
 if (!config) {
 return [];
 }

 // In production, this would be an API call to check against database
 // For now, we'll simulate with localStorage
 const existingRecords = getExistingRecordsFromStorage(moduleName, projectId);
 
 const duplicates: DuplicateRecord[] = [];

 rows.forEach((row, index) => {
 const rowNumber = index + 2;
 const businessKey = generateBusinessKey(row, config.fields, config.caseSensitive);
 
 // Check if this key exists in database
 const existingRecord = existingRecords.find(record => {
 const existingKey = generateBusinessKey(record, config.fields, config.caseSensitive);
 return existingKey === businessKey;
 });

 if (existingRecord) {
 duplicates.push({
 rowNumber,
 rowData: row,
 duplicateKey: businessKey,
 duplicateFields: config.fields,
 existingRecordId: existingRecord.id || 'Unknown',
 existingRecordData: existingRecord,
 reason: `Already exists in database (${config.description})`
 });
 }
 });

 return duplicates;
}

/**
 * Mock function to get existing records from localStorage
 * In production, replace with actual API call
 */
function getExistingRecordsFromStorage(
 moduleName: ModuleName,
 projectId?: string
): any[] {
 try {
 const storageKey = `pms_${moduleName.toLowerCase().replace(/\s/g, '_')}_data`;
 const stored = localStorage.getItem(storageKey);
 if (!stored) return [];
 
 const records = JSON.parse(stored);
 
 // Filter by project if applicable
 if (projectId) {
 return records.filter((r: any) => r.projectId === projectId);
 }
 
 return records;
 } catch (error) {
 console.error('Failed to load existing records:', error);
 return [];
 }
}

/**
 * Perform complete duplication scan
 * Checks both internal duplicates (within file) and external duplicates (against database)
 */
export async function performDuplicationScan(
 rows: any[],
 moduleName: ModuleName,
 projectId?: string
): Promise<DuplicationScanResult> {
 const startTime = new Date().toISOString();

 // Check internal duplicates (within the Excel file)
 const internalDuplicates = detectInternalDuplicates(rows, moduleName);

 // Check external duplicates (against existing database records)
 const externalDuplicates = await detectExistingDuplicates(rows, moduleName, projectId);

 // Combine all duplicates
 const allDuplicates = [...internalDuplicates, ...externalDuplicates];

 // Get unique duplicate row numbers
 const uniqueDuplicateRows = new Set(allDuplicates.map(d => d.rowNumber));

 return {
 hasDuplicates: allDuplicates.length > 0,
 totalRows: rows.length,
 duplicateCount: uniqueDuplicateRows.size,
 uniqueCount: rows.length - uniqueDuplicateRows.size,
 duplicates: allDuplicates,
 scanTimestamp: startTime
 };
}

/**
 * Filter out duplicate rows from the import
 * Used when user chooses NOT to allow duplicates
 */
export function filterDuplicateRows(
 rows: any[],
 duplicates: DuplicateRecord[]
): any[] {
 const duplicateRowNumbers = new Set(duplicates.map(d => d.rowNumber));
 return rows.filter((_, index) => !duplicateRowNumbers.has(index + 2));
}

/**
 * Get business key configuration for a module
 */
export function getBusinessKeyConfig(moduleName: ModuleName) {
 return MODULE_BUSINESS_KEYS[moduleName];
}

/**
 * Format duplicate record for display
 */
export function formatDuplicateForDisplay(duplicate: DuplicateRecord): string {
 const fieldValues = duplicate.duplicateFields
 .map(field => `${field}: "${duplicate.rowData[field]}"`)
 .join(', ');
 return `Row ${duplicate.rowNumber}: ${fieldValues} - ${duplicate.reason}`;
}

/**
 * Export duplication report as CSV
 */
export function exportDuplicationReportCSV(
 scanResult: DuplicationScanResult,
 moduleName: ModuleName
): string {
 const config = MODULE_BUSINESS_KEYS[moduleName];
 
 const headers = [
 'Row Number',
 'Duplicate Fields',
 'Values',
 'Reason',
 'Existing Record ID'
 ];

 const rows = scanResult.duplicates.map(dup => {
 const fieldValues = dup.duplicateFields
 .map(field => `${field}=${dup.rowData[field]}`)
 .join('; ');
 
 return [
 dup.rowNumber.toString(),
 dup.duplicateFields.join(', '),
 fieldValues,
 dup.reason,
 dup.existingRecordId || 'N/A'
 ];
 });

 const csvContent = [
 headers.join(','),
 ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
 ].join('\n');

 return csvContent;
}

/**
 * Download duplication report
 */
export function downloadDuplicationReport(
 scanResult: DuplicationScanResult,
 moduleName: ModuleName,
 fileName: string
): void {
 const csvContent = exportDuplicationReportCSV(scanResult, moduleName);
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const link = document.createElement('a');
 const url = URL.createObjectURL(blob);
 
 link.setAttribute('href', url);
 link.setAttribute('download', `Duplicates_${moduleName}_${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
 link.style.visibility = 'hidden';
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
}
