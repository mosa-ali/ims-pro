/**
 * ============================================================================
 * EXCEL IMPORT WITH MANDATORY DUPLICATION CHECK
 * ============================================================================
 * 
 * This hook ENFORCES system-wide duplication control for ALL imports.
 * 
 * MANDATORY FLOW:
 * 1. File selected
 * 2. Parse Excel
 * 3. **DUPLICATION SCAN (MANDATORY)**
 * 4. Show DuplicateDetectionModal if duplicates found
 * 5. User decides: Block or Allow
 * 6. If Block: Stop import, show details
 * 7. If Allow: Continue import, flag duplicates
 * 8. Process import
 * 9. Update Import History
 * ============================================================================
 */

import { useState, useRef } from 'react';
import { useImportHistory, ModuleName, ImportRowError } from '@/contexts/ImportHistoryContext';
import { useAuth } from '@/_core/hooks/useAuth';
import ExcelJS from 'exceljs';
import { 
 performDuplicationScan, 
 DuplicationScanResult,
 filterDuplicateRows 
} from '@/utils/duplicationDetection';

interface UseExcelImportWithDuplicateCheckOptions {
 moduleName: ModuleName;
 targetTable: string;
 projectId?: string;
 projectName?: string;
 onSuccess?: (importId: string) => void;
 onError?: (error: Error) => void;
 onDuplicatesBlocked?: (scanResult: DuplicationScanResult) => void;
 validateRow?: (row: any, rowNumber: number) => { valid: boolean; errors?: ImportRowError[] };
 processRow?: (row: any) => Promise<void>;
}

export function useExcelImportWithDuplicateCheck(options: UseExcelImportWithDuplicateCheckOptions) {
 const { createImport, updateImportStatus } = useImportHistory();
 const { user } = useAuth();
 const [isImporting, setIsImporting] = useState(false);
 const [progress, setProgress] = useState(0);
 const [currentImportId, setCurrentImportId] = useState<string | null>(null);
 const [parsedRows, setParsedRows] = useState<any[]>([]);
 const [duplicateScanResult, setDuplicateScanResult] = useState<DuplicationScanResult | null>(null);
 const [showDuplicateModal, setShowDuplicateModal] = useState(false);
 const [selectedFile, setSelectedFile] = useState<File | null>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const triggerFileSelect = () => {
 fileInputRef.current?.click();
 };

 const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;

 setSelectedFile(file);
 await parseAndCheckDuplicates(file);

 // Reset file input
 if (fileInputRef.current) {
 fileInputRef.current.value = '';
 }
 };

 const parseAndCheckDuplicates = async (file: File) => {
 setIsImporting(true);
 setProgress(10);

 try {
 // Step 1: Parse Excel file
 const workbook = new ExcelJS.Workbook();
 const arrayBuffer = await file.arrayBuffer();
 await workbook.xlsx.load(arrayBuffer);

 const worksheet = workbook.worksheets[0];
 const rows: any[] = [];

 // Extract rows (skip header)
 worksheet.eachRow((row, rowNumber) => {
 if (rowNumber === 1) return; // Skip header

 const rowData: any = {};
 row.eachCell((cell, colNumber) => {
 const header = worksheet.getRow(1).getCell(colNumber).value?.toString() || `Column${colNumber}`;
 rowData[header] = cell.value;
 });

 rows.push(rowData);
 });

 setParsedRows(rows);
 setProgress(30);

 // Step 2: MANDATORY DUPLICATION SCAN
 const scanResult = await performDuplicationScan(
 rows,
 options.moduleName,
 options.projectId
 );

 setDuplicateScanResult(scanResult);
 setProgress(50);

 // Step 3: Show modal if duplicates detected
 if (scanResult.hasDuplicates) {
 setShowDuplicateModal(true);
 setIsImporting(false);
 } else {
 // No duplicates - proceed directly
 await processImportWithRows(file, rows, false, scanResult);
 }
 } catch (error: any) {
 console.error('Failed to parse and check duplicates:', error);
 setIsImporting(false);
 if (options.onError) {
 options.onError(error);
 }
 }
 };

 const handleAllowDuplicates = async () => {
 if (!selectedFile || !parsedRows || !duplicateScanResult) return;

 setShowDuplicateModal(false);
 setIsImporting(true);

 // Process ALL rows, including duplicates
 await processImportWithRows(selectedFile, parsedRows, true, duplicateScanResult);
 };

 const handleBlockDuplicates = () => {
 setShowDuplicateModal(false);
 setIsImporting(false);
 setProgress(0);

 // Notify caller that duplicates were blocked
 if (options.onDuplicatesBlocked && duplicateScanResult) {
 options.onDuplicatesBlocked(duplicateScanResult);
 }

 // Clear state
 setParsedRows([]);
 setDuplicateScanResult(null);
 setSelectedFile(null);

 alert('Import blocked due to duplicate records. Please review and fix duplicates, then try again.');
 };

 const handleCancelDuplicateModal = () => {
 setShowDuplicateModal(false);
 setIsImporting(false);
 setProgress(0);
 setParsedRows([]);
 setDuplicateScanResult(null);
 setSelectedFile(null);
 };

 const processImportWithRows = async (
 file: File,
 rows: any[],
 allowDuplicates: boolean,
 scanResult: DuplicationScanResult
 ) => {
 setProgress(60);

 // Step 1: Create import record IMMEDIATELY
 const importId = createImport({
 fileName: file.name,
 fileType: file.name.endsWith('.csv') ? 'csv' : 'xlsx',
 moduleName: options.moduleName,
 targetTable: options.targetTable,
 projectId: options.projectId,
 projectName: options.projectName,
 totalRows: rows.length,
 allowDuplicates,
 // DUPLICATION METADATA (MANDATORY)
 duplicateCheckPerformed: true,
 duplicatesDetected: scanResult.duplicateCount,
 duplicatesAllowed: allowDuplicates,
 duplicateDecisionBy: user?.id,
 duplicateDecisionTime: new Date().toISOString()
 });

 setCurrentImportId(importId);

 try {
 // Step 2: Filter duplicates if not allowed
 const rowsToProcess = allowDuplicates 
 ? rows 
 : filterDuplicateRows(rows, scanResult.duplicates);

 setProgress(70);

 // Step 3: Validate rows
 let validationErrors: ImportRowError[] = [];

 if (options.validateRow) {
 rowsToProcess.forEach((row, index) => {
 const rowNumber = index + 2; // Excel row number
 const validation = options.validateRow!(row, rowNumber);
 if (!validation.valid && validation.errors) {
 validationErrors = [...validationErrors, ...validation.errors];
 }
 });
 }

 setProgress(80);

 // Step 4: Process rows
 let successCount = 0;
 const processingErrors: ImportRowError[] = [];

 for (let i = 0; i < rowsToProcess.length; i++) {
 const row = rowsToProcess[i];
 const rowNumber = i + 2;
 
 try {
 const hasValidationError = validationErrors.some(e => e.rowNumber === rowNumber);
 
 if (!hasValidationError && options.processRow) {
 await options.processRow(row);
 successCount++;
 }
 } catch (error: any) {
 processingErrors.push({
 rowNumber,
 errorMessage: error.message || 'Unknown error',
 rawRow: row
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
 rollbackApplied: finalStatus === 'FAILED'
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
 setParsedRows([]);
 setDuplicateScanResult(null);
 setSelectedFile(null);
 }
 };

 return {
 isImporting,
 progress,
 currentImportId,
 triggerFileSelect,
 handleFileSelect,
 fileInputRef,
 // Duplication Modal State
 showDuplicateModal,
 duplicateScanResult,
 selectedFile,
 handleAllowDuplicates,
 handleBlockDuplicates,
 handleCancelDuplicateModal
 };
}