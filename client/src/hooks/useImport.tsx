import { useState } from 'react';
import { useImportHistory, ModuleName, ImportRowError } from '@/contexts/ImportHistoryContext';
import * as XLSX from 'xlsx';

interface UseImportOptions {
 moduleName: ModuleName;
 targetTable: string;
 projectId?: string;
 projectName?: string;
 allowDuplicates?: boolean;
 onSuccess?: (importId: string) => void;
 onError?: (error: Error) => void;
 validateRow?: (row: any, rowNumber: number) => ImportRowError | null;
}

export function useImport(options: UseImportOptions) {
 const { createImport, updateImportStatus, addRowError, generateErrorReport } = useImportHistory();
 const [isImporting, setIsImporting] = useState(false);
 const [currentImportId, setCurrentImportId] = useState<string | null>(null);
 const [progress, setProgress] = useState({ current: 0, total: 0 });

 const processImport = async (file: File, data: any[]) => {
 const totalRows = data.length;
 let successCount = 0;
 let errorCount = 0;

 setProgress({ current: 0, total: totalRows });

 // Create import history record IMMEDIATELY (before processing)
 const importRecord = await createImport({
 fileName: file.name,
 fileType: file.name.endsWith('.csv') ? 'csv' : 'xlsx',
 moduleName: options.moduleName,
 targetTable: options.targetTable,
 projectId: options.projectId,
 projectName: options.projectName,
 allowDuplicates: options.allowDuplicates || false,
 totalRows
 });

 setCurrentImportId(importRecord.id);

 try {
 // Process each row
 for (let i = 0; i < data.length; i++) {
 const row = data[i];
 const rowNumber = i + 2; // +2 because Excel is 1-indexed and has header row

 setProgress({ current: i + 1, total: totalRows });

 // Validate row if validator provided
 if (options.validateRow) {
 const error = options.validateRow(row, rowNumber);
 if (error) {
 addRowError(importRecord.id, error);
 errorCount++;
 continue;
 }
 }

 // Process the row (this would call your actual insert function)
 try {
 // TODO: Call actual data insertion here
 // await insertRow(options.targetTable, row);
 successCount++;
 } catch (error: any) {
 addRowError(importRecord.id, {
 rowNumber,
 field: 'general',
 errorMessage: error.message,
 originalValue: JSON.stringify(row),
 rawRow: row
 });
 errorCount++;
 }
 }

 // Update import status based on results
 const finalStatus = errorCount === 0 ? 'COMPLETED' : 
 errorCount === totalRows ? 'FAILED' : 'PARTIAL';

 updateImportStatus(importRecord.id, {
 status: finalStatus,
 successCount,
 errorCount,
 rollbackApplied: finalStatus === 'FAILED'
 });

 // Generate error report if there are errors
 if (errorCount > 0) {
 await generateErrorReport(importRecord.id);
 }

 if (options.onSuccess) {
 options.onSuccess(importRecord.id);
 }

 return {
 importId: importRecord.id,
 status: finalStatus,
 successCount,
 errorCount
 };

 } catch (error: any) {
 // If critical error occurs, mark as failed and rollback
 updateImportStatus(importRecord.id, {
 status: 'FAILED',
 successCount: 0,
 errorCount: totalRows,
 rollbackApplied: true
 });

 if (options.onError) {
 options.onError(error);
 }

 throw error;
 } finally {
 setIsImporting(false);
 setCurrentImportId(null);
 setProgress({ current: 0, total: 0 });
 }
 };

 const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;

 setIsImporting(true);

 try {
 // Read Excel file
 const arrayBuffer = await file.arrayBuffer();
 const workbook = XLSX.read(arrayBuffer, { type: 'array' });
 const worksheetName = workbook.SheetNames[0];
 const worksheet = workbook.Sheets[worksheetName];
 const data = XLSX.utils.sheet_to_json(worksheet);

 // Process the import
 await processImport(file, data);

 } catch (error: any) {
 console.error('Import error:', error);
 if (options.onError) {
 options.onError(error);
 }
 setIsImporting(false);
 }
 };

 return {
 handleFileSelect,
 isImporting,
 currentImportId,
 progress
 };
}
