/**
 * IMPORT HISTORY SERVICE
 * 
 * System-wide import tracking and auditing service
 * 
 * CRITICAL REQUIREMENTS:
 * - Every Excel import MUST create an ImportHistory record
 * - Backend-enforced duplicate detection
 * - Immutable history (no edit/delete)
 * - Full error reporting with CSV generation
 * - Safe retry framework
 * - Complete audit trail
 * 
 * NO IMPORT IS ALLOWED WITHOUT IMPORT HISTORY
 */

export type ImportStatus = 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'ROLLED_BACK';
export type ModuleName = 'Tasks' | 'Activities' | 'Beneficiaries' | 'Indicators' | 'Budget Lines' | 'Chart of Accounts' | 'Expenditures' | 'Forecasts';

export interface ImportHistory {
 id: string;
 file_name: string;
 file_type: 'xlsx' | 'csv';
 module_name: ModuleName;
 target_table: string;
 project_id?: string;
 project_name?: string;
 imported_by: string;
 imported_by_id?: string;
 import_datetime: string;
 status: ImportStatus;
 total_rows: number;
 success_rows_count: number;
 failed_rows_count: number;
 allow_duplicates: boolean;
 rollback_applied: boolean;
 storage_file_url?: string;
 error_report_url?: string;
 retry_of_import_id?: string; // Links to original import if this is a retry
 retry_count: number;
 created_at: string;
 updated_at: string;
}

export interface ImportRowError {
 id: string;
 import_id: string;
 row_number: number;
 field?: string;
 error_message: string;
 original_value?: string;
 raw_row: any; // JSON of the entire row
 created_at: string;
}

export interface CreateImportHistoryParams {
 file_name: string;
 file_type: 'xlsx' | 'csv';
 module_name: ModuleName;
 target_table: string;
 project_id?: string;
 project_name?: string;
 imported_by: string;
 imported_by_id?: string;
 allow_duplicates: boolean;
 total_rows: number;
 retry_of_import_id?: string;
}

export interface UpdateImportHistoryParams {
 id: string;
 status: ImportStatus;
 success_rows_count: number;
 failed_rows_count: number;
 rollback_applied?: boolean;
 storage_file_url?: string;
 error_report_url?: string;
}

export interface ImportHistoryFilter {
 module_name?: ModuleName;
 project_id?: string;
 status?: ImportStatus;
 imported_by?: string;
 date_from?: string;
 date_to?: string;
}

export interface DuplicateCheckResult {
 has_duplicates: boolean;
 duplicate_count: number;
 duplicate_rows: Array<{
 row_number: number;
 duplicate_key: string;
 existing_record_id?: string;
 }>;
}

/**
 * Module-specific duplicate detection keys
 * CRITICAL: These define how duplicates are detected per module
 */
export const MODULE_DUPLICATE_KEYS: Record<ModuleName, string[]> = {
 'Tasks': ['project_id', 'task_name'],
 'Activities': ['project_id', 'activity_code'],
 'Beneficiaries': ['project_id', 'national_id'], // OR beneficiary_code
 'Indicators': ['project_id', 'indicator_code'],
 'Budget Lines': ['project_id', 'budget_code'],
 'Chart of Accounts': ['account_code'],
 'Expenditures': ['project_id', 'expenditure_code'],
 'Forecasts': ['project_id', 'forecast_period']
};

class ImportHistoryServiceClass {
 private readonly STORAGE_KEY = 'pms_import_history';
 private readonly ERROR_STORAGE_KEY = 'pms_import_row_errors';
 private readonly MAX_RETRIES = 3;

 /**
 * Create a new import history record (IMMEDIATELY when import starts)
 * MUST be called BEFORE any data parsing
 */
 createImportHistory(params: CreateImportHistoryParams): ImportHistory {
 try {
 // Check retry limit
 if (params.retry_of_import_id) {
 const originalImport = this.getImportHistory(params.retry_of_import_id);
 if (originalImport && originalImport.retry_count >= this.MAX_RETRIES) {
 throw new Error(`Maximum retry limit (${this.MAX_RETRIES}) reached for this import`);
 }
 }

 const importRecord: ImportHistory = {
 id: `imp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 file_name: params.file_name,
 file_type: params.file_type,
 module_name: params.module_name,
 target_table: params.target_table,
 project_id: params.project_id,
 project_name: params.project_name,
 imported_by: params.imported_by,
 imported_by_id: params.imported_by_id,
 import_datetime: new Date().toISOString(),
 status: 'IN_PROGRESS',
 total_rows: params.total_rows,
 success_rows_count: 0,
 failed_rows_count: 0,
 allow_duplicates: params.allow_duplicates,
 rollback_applied: false,
 retry_of_import_id: params.retry_of_import_id,
 retry_count: params.retry_of_import_id ? this.getRetryCount(params.retry_of_import_id) + 1 : 0,
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString()
 };

 // Save to storage
 this.saveImportHistory(importRecord);

 return importRecord;
 } catch (error) {
 console.error('Failed to create import history:', error);
 throw error;
 }
 }

 /**
 * Update import history record (called when import completes/fails)
 * CRITICAL: Import History records are immutable except for status updates
 */
 updateImportHistory(params: UpdateImportHistoryParams): ImportHistory | null {
 try {
 const allImports = this.getAllImportHistory();
 const importIndex = allImports.findIndex(imp => imp.id === params.id);

 if (importIndex === -1) {
 throw new Error('Import history record not found');
 }

 const updatedImport: ImportHistory = {
 ...allImports[importIndex],
 status: params.status,
 success_rows_count: params.success_rows_count,
 failed_rows_count: params.failed_rows_count,
 rollback_applied: params.rollback_applied || allImports[importIndex].rollback_applied,
 storage_file_url: params.storage_file_url || allImports[importIndex].storage_file_url,
 error_report_url: params.error_report_url || allImports[importIndex].error_report_url,
 updated_at: new Date().toISOString()
 };

 allImports[importIndex] = updatedImport;
 localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allImports));

 return updatedImport;
 } catch (error) {
 console.error('Failed to update import history:', error);
 throw error;
 }
 }

 /**
 * Get all import history records matching filter
 */
 getImportHistoryList(filter?: ImportHistoryFilter): ImportHistory[] {
 const allImports = this.getAllImportHistory();

 if (!filter) {
 return allImports;
 }

 return allImports.filter(imp => {
 if (filter.module_name && imp.module_name !== filter.module_name) return false;
 if (filter.project_id && imp.project_id !== filter.project_id) return false;
 if (filter.status && imp.status !== filter.status) return false;
 if (filter.imported_by && imp.imported_by !== filter.imported_by) return false;
 
 if (filter.date_from) {
 const importDate = new Date(imp.import_datetime);
 const filterDate = new Date(filter.date_from);
 if (importDate < filterDate) return false;
 }
 
 if (filter.date_to) {
 const importDate = new Date(imp.import_datetime);
 const filterDate = new Date(filter.date_to);
 if (importDate > filterDate) return false;
 }

 return true;
 });
 }

 /**
 * Get a single import history record by ID
 */
 getImportHistory(id: string): ImportHistory | null {
 const allImports = this.getAllImportHistory();
 return allImports.find(imp => imp.id === id) || null;
 }

 /**
 * Check for duplicates BEFORE import
 * CRITICAL: Backend-enforced duplicate detection
 */
 checkDuplicates(
 module_name: ModuleName,
 rows: any[],
 existingData: any[]
 ): DuplicateCheckResult {
 try {
 const duplicateKeys = MODULE_DUPLICATE_KEYS[module_name];
 const duplicates: DuplicateCheckResult['duplicate_rows'] = [];

 rows.forEach((row, index) => {
 // Build composite key for this row
 const rowKey = duplicateKeys.map(key => row[key]).join('|');

 // Check against existing data
 const existingMatch = existingData.find(existing => {
 const existingKey = duplicateKeys.map(key => existing[key]).join('|');
 return existingKey === rowKey;
 });

 if (existingMatch) {
 duplicates.push({
 row_number: index + 1,
 duplicate_key: rowKey,
 existing_record_id: existingMatch.id
 });
 }
 });

 return {
 has_duplicates: duplicates.length > 0,
 duplicate_count: duplicates.length,
 duplicate_rows: duplicates
 };
 } catch (error) {
 console.error('Duplicate check failed:', error);
 throw error;
 }
 }

 /**
 * Log row-level errors
 */
 logRowError(error: Omit<ImportRowError, 'id' | 'created_at'>): void {
 try {
 const rowError: ImportRowError = {
 id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 ...error,
 created_at: new Date().toISOString()
 };

 const allErrors = this.getAllRowErrors();
 allErrors.push(rowError);

 // Keep only last 10,000 errors to prevent storage overflow
 if (allErrors.length > 10000) {
 allErrors.splice(0, allErrors.length - 10000);
 }

 localStorage.setItem(this.ERROR_STORAGE_KEY, JSON.stringify(allErrors));
 } catch (error) {
 console.error('Failed to log row error:', error);
 }
 }

 /**
 * Get all errors for a specific import
 */
 getImportErrors(import_id: string): ImportRowError[] {
 const allErrors = this.getAllRowErrors();
 return allErrors.filter(err => err.import_id === import_id);
 }

 /**
 * Generate error report CSV
 */
 generateErrorReportCSV(import_id: string): string {
 const errors = this.getImportErrors(import_id);

 if (errors.length === 0) {
 return '';
 }

 // CSV Headers
 let csv = 'Row Number,Field,Error Message,Original Value\n';

 // CSV Rows
 errors.forEach(error => {
 const row = [
 error.row_number,
 error.field || 'N/A',
 `"${error.error_message.replace(/"/g, '""')}"`, // Escape quotes
 `"${error.original_value || 'N/A'}"`
 ].join(',');
 csv += row + '\n';
 });

 return csv;
 }

 /**
 * Download error report as CSV file
 */
 downloadErrorReport(import_id: string, file_name: string): void {
 try {
 const csv = this.generateErrorReportCSV(import_id);
 
 if (!csv) {
 throw new Error('No errors to report');
 }

 // Create blob and download
 const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
 const link = document.createElement('a');
 const url = URL.createObjectURL(blob);
 
 link.setAttribute('href', url);
 link.setAttribute('download', `${file_name}_errors.csv`);
 link.style.visibility = 'hidden';
 
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 } catch (error) {
 console.error('Failed to download error report:', error);
 throw error;
 }
 }

 /**
 * Check if retry is allowed
 */
 canRetry(import_id: string): boolean {
 const importRecord = this.getImportHistory(import_id);
 
 if (!importRecord) {
 return false;
 }

 // Only allow retry for FAILED or PARTIAL imports
 if (importRecord.status !== 'FAILED' && importRecord.status !== 'PARTIAL') {
 return false;
 }

 // Check retry limit
 if (importRecord.retry_count >= this.MAX_RETRIES) {
 return false;
 }

 return true;
 }

 /**
 * Get retry chain (all retries of an import)
 */
 getRetryChain(import_id: string): ImportHistory[] {
 const allImports = this.getAllImportHistory();
 const chain: ImportHistory[] = [];

 // Find the original import (if this is a retry)
 let currentImport = this.getImportHistory(import_id);
 
 if (!currentImport) {
 return chain;
 }

 // Walk back to find original
 while (currentImport && currentImport.retry_of_import_id) {
 currentImport = this.getImportHistory(currentImport.retry_of_import_id);
 if (currentImport) {
 chain.unshift(currentImport);
 }
 }

 // Add the queried import
 const queriedImport = this.getImportHistory(import_id);
 if (queriedImport) {
 chain.push(queriedImport);
 }

 // Find all subsequent retries
 const findRetries = (id: string) => {
 const retries = allImports.filter(imp => imp.retry_of_import_id === id);
 retries.forEach(retry => {
 chain.push(retry);
 findRetries(retry.id);
 });
 };

 findRetries(import_id);

 return chain;
 }

 /**
 * Get statistics for dashboard
 */
 getStatistics(filter?: ImportHistoryFilter): {
 total_imports: number;
 successful_imports: number;
 failed_imports: number;
 total_rows_imported: number;
 total_rows_failed: number;
 recent_imports: ImportHistory[];
 } {
 const imports = this.getImportHistoryList(filter);

 return {
 total_imports: imports.length,
 successful_imports: imports.filter(imp => imp.status === 'COMPLETED').length,
 failed_imports: imports.filter(imp => imp.status === 'FAILED').length,
 total_rows_imported: imports.reduce((sum, imp) => sum + imp.success_rows_count, 0),
 total_rows_failed: imports.reduce((sum, imp) => sum + imp.failed_rows_count, 0),
 recent_imports: imports.slice(0, 10)
 };
 }

 // ==================== PRIVATE HELPER METHODS ====================

 private getAllImportHistory(): ImportHistory[] {
 try {
 const stored = localStorage.getItem(this.STORAGE_KEY);
 return stored ? JSON.parse(stored) : [];
 } catch (error) {
 console.error('Failed to retrieve import history:', error);
 return [];
 }
 }

 private saveImportHistory(importRecord: ImportHistory): void {
 const allImports = this.getAllImportHistory();
 allImports.push(importRecord);
 
 // Sort by date descending (newest first)
 allImports.sort((a, b) => new Date(b.import_datetime).getTime() - new Date(a.import_datetime).getTime());
 
 localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allImports));
 }

 private getAllRowErrors(): ImportRowError[] {
 try {
 const stored = localStorage.getItem(this.ERROR_STORAGE_KEY);
 return stored ? JSON.parse(stored) : [];
 } catch (error) {
 console.error('Failed to retrieve row errors:', error);
 return [];
 }
 }

 private getRetryCount(import_id: string): number {
 const importRecord = this.getImportHistory(import_id);
 return importRecord ? importRecord.retry_count : 0;
 }

 /**
 * Clear all import history (for testing only)
 */
 clearAll(): void {
 localStorage.removeItem(this.STORAGE_KEY);
 localStorage.removeItem(this.ERROR_STORAGE_KEY);
 }
}

// Export singleton instance
export const ImportHistoryService = new ImportHistoryServiceClass();
