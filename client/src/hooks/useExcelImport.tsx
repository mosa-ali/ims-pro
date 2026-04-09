import { useState, useRef } from 'react';
import { useImportHistory, ModuleName, ImportRowError } from '@/contexts/ImportHistoryContext';
import ExcelJS from 'exceljs';

interface UseExcelImportOptions {
 moduleName: ModuleName;
 targetTable: string;
 projectId?: string;
 projectName?: string;
 allowDuplicates?: boolean;
 onSuccess?: (importId: string) => void;
 onError?: (error: Error) => void;
 validateRow?: (row: any, rowNumber: number) => { valid: boolean; errors?: ImportRowError[] };
 processRow?: (row: any) => Promise<void>;
}

export function useExcelImport(options: UseExcelImportOptions) {
 const { createImport, updateImportStatus } = useImportHistory();
 const [isImporting, setIsImporting] = useState(false);
 const [progress, setProgress] = useState(0);
 const [currentImportId, setCurrentImportId] = useState<string | null>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const triggerFileSelect = () => {
 fileInputRef.current?.click();
 };

 const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;

 await processImport(file);

 // Reset file input
 if (fileInputRef.current) {
 fileInputRef.current.value = '';
 }
 };

 const processImport = async (file: File) => {
 setIsImporting(true);
 setProgress(0);

 // Step 1: Create import record IMMEDIATELY (before parsing)
 const importId = createImport({
 fileName: file.name,
 fileType: file.name.endsWith('.csv') ? 'csv' : 'xlsx',
 moduleName: options.moduleName,
 targetTable: options.targetTable,
 projectId: options.projectId,
 projectName: options.projectName,
 totalRows: 0, // Will be updated after parsing
 allowDuplicates: options.allowDuplicates || false
 });

 setCurrentImportId(importId);

 try {
 // Step 2: Parse Excel file
 const workbook = new ExcelJS.Workbook();
 const arrayBuffer = await file.arrayBuffer();
 await workbook.xlsx.load(arrayBuffer);

 const worksheet = workbook.worksheets[0];
 const rows: any[] = [];
 const errors: ImportRowError[] = [];

 // Extract rows (skip header)
 worksheet.eachRow((row, rowNumber) => {
 if (rowNumber === 1) return; // Skip header

 const rowData: any = {};
 row.eachCell((cell, colNumber) => {
 const header = worksheet.getRow(1).getCell(colNumber).value?.toString() || `Column${colNumber}`;
 rowData[header] = cell.value;
 });

 rows.push({ rowNumber, data: rowData });
 });

 // Update total rows
 updateImportStatus(importId, { totalRows: rows.length });

 // Step 3: Validate rows
 setProgress(20);
 let validationErrors: ImportRowError[] = [];

 if (options.validateRow) {
 for (const { rowNumber, data } of rows) {
 const validation = options.validateRow(data, rowNumber);
 if (!validation.valid && validation.errors) {
 validationErrors = [...validationErrors, ...validation.errors];
 }
 }
 }

 // Step 4: Process rows (in transaction-like manner)
 setProgress(40);
 let successCount = 0;
 const processingErrors: ImportRowError[] = [];

 for (let i = 0; i < rows.length; i++) {
 const { rowNumber, data } = rows[i];
 
 try {
 // Check if this row had validation errors
 const hasValidationError = validationErrors.some(e => e.rowNumber === rowNumber);
 
 if (!hasValidationError && options.processRow) {
 await options.processRow(data);
 successCount++;
 }

 // Update progress
 setProgress(40 + Math.floor((i / rows.length) * 50));
 } catch (error: any) {
 processingErrors.push({
 rowNumber,
 errorMessage: error.message || 'Unknown error',
 rawRow: data
 });
 }
 }

 const allErrors = [...validationErrors, ...processingErrors];
 const errorCount = allErrors.length;

 // Step 5: Determine final status
 let finalStatus: 'COMPLETED' | 'PARTIAL' | 'FAILED';
 if (errorCount === 0) {
 finalStatus = 'COMPLETED';
 } else if (successCount > 0) {
 finalStatus = 'PARTIAL';
 } else {
 finalStatus = 'FAILED';
 }

 // Step 6: Update import record
 updateImportStatus(importId, {
 status: finalStatus,
 successCount,
 errorCount,
 errorReportData: allErrors.length > 0 ? allErrors : undefined,
 rollbackApplied: finalStatus === 'FAILED' // Rollback on total failure
 });

 setProgress(100);

 // Call success callback
 if (options.onSuccess) {
 options.onSuccess(importId);
 }

 } catch (error: any) {
 // Critical error - mark as failed
 updateImportStatus(importId, {
 status: 'FAILED',
 successCount: 0,
 errorCount: 1,
 errorReportData: [{
 rowNumber: 0,
 errorMessage: error.message || 'Critical import error',
 rawRow: {}
 }],
 rollbackApplied: true
 });

 if (options.onError) {
 options.onError(error);
 }
 } finally {
 setIsImporting(false);
 setProgress(0);
 setCurrentImportId(null);
 }
 };

 return {
 isImporting,
 progress,
 currentImportId,
 triggerFileSelect,
 handleFileSelect,
 processImport,
 fileInputRef
 };
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
function MyComponent() {
 const {
 isImporting,
 progress,
 triggerFileSelect,
 handleFileSelect,
 fileInputRef
 } = useExcelImport({
 moduleName: 'Tasks',
 targetTable: 'tasks',
 projectId: 'project-123',
 projectName: 'My Project',
 allowDuplicates: false,
 
 validateRow: (row, rowNumber) => {
 const errors: ImportRowError[] = [];
 
 if (!row['Task Name']) {
 errors.push({
 rowNumber,
 field: 'Task Name',
 errorMessage: 'Task Name is required',
 rawRow: row
 });
 }
 
 return {
 valid: errors.length === 0,
 errors
 };
 },
 
 processRow: async (row) => {
 // Insert into database
 await createTask({
 name: row['Task Name'],
 startDate: row['Start Date'],
 endDate: row['End Date']
 });
 },
 
 onSuccess: (importId) => {
 alert('Import completed!');
 // Refresh data
 },
 
 onError: (error) => {
 alert(`Import failed: ${error.message}`);
 }
 });

 return (
 <>
 <input
 ref={fileInputRef}
 type="file"
 accept=".xlsx,.xls,.csv"
 onChange={handleFileSelect}
 className="hidden"
 />
 
 <button onClick={triggerFileSelect} disabled={isImporting}>
 {isImporting ? `Importing... ${progress}%` : 'Import Excel'}
 </button>
 </>
 );
}
*/