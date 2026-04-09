import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';

export type ImportStatus = 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'ROLLED_BACK';
export type ModuleName = 'Tasks' | 'Beneficiaries' | 'Activities' | 'Indicators' | 'Budget Lines' | 
 'Forecast Plan' | 'Expenses' | 'Procurement' | 'Stock Items' | 'Cases' | 
 'Surveys' | 'Documents' | 'Users' | 'Projects' | 'Proposals';

export interface ImportRowError {
 rowNumber: number;
 field?: string;
 errorMessage: string;
 originalValue?: string;
 rawRow: any;
}

export interface ImportHistoryRecord {
 id: string;
 fileName: string;
 fileType: 'xlsx' | 'csv' | 'xls';
 moduleName: ModuleName;
 targetTable: string;
 projectId?: string;
 projectName?: string;
 importedBy: string;
 importedByName: string;
 importDateTime: string;
 status: ImportStatus;
 totalRows: number;
 successCount: number;
 errorCount: number;
 allowDuplicates: boolean;
 rollbackApplied: boolean;
 storageFileUrl?: string;
 errorReportUrl?: string;
 errorReportData?: ImportRowError[];
 retryOfImportId?: string;
 retryCount: number;
 maxRetries: number;
 createdAt: string;
 // Duplication Control (MANDATORY)
 duplicateCheckPerformed: boolean;
 duplicatesDetected: number;
 duplicatesAllowed: boolean;
 duplicateDecisionBy?: string;
 duplicateDecisionTime?: string;
 duplicateReportUrl?: string;
}

interface ImportHistoryContextType {
 importRecords: ImportHistoryRecord[];
 createImport: (data: Omit<ImportHistoryRecord, 'id' | 'importDateTime' | 'importedBy' | 'importedByName' | 'status' | 'successCount' | 'errorCount' | 'rollbackApplied' | 'retryCount' | 'maxRetries' | 'createdAt'>) => string;
 updateImportStatus: (importId: string, updates: Partial<ImportHistoryRecord>) => void;
 retryImport: (importId: string, mode: 'ALL' | 'FAILED_ONLY') => Promise<string | null>;
 getImportById: (importId: string) => ImportHistoryRecord | undefined;
 getImportsByModule: (moduleName: ModuleName) => ImportHistoryRecord[];
 getImportsByProject: (projectId: string) => ImportHistoryRecord[];
 getFailedImports: () => ImportHistoryRecord[];
 canRetry: (importId: string) => boolean;
 generateErrorReport: (importId: string) => string;
 downloadErrorReport: (importId: string) => void;
}

const ImportHistoryContext = createContext<ImportHistoryContextType | undefined>(undefined);

const STORAGE_KEY = 'pms_import_history';
const MAX_RETRIES = 3;

export function ImportHistoryProvider({ children }: { children: ReactNode }) {
 const { user } = useAuth();
 const [importRecords, setImportRecords] = useState<ImportHistoryRecord[]>([]);

 // Load import records from localStorage on mount
 useEffect(() => {
 const stored = localStorage.getItem(STORAGE_KEY);
 if (stored) {
 try {
 const parsed = JSON.parse(stored);
 setImportRecords(parsed);
 } catch (error) {
 console.error('Failed to parse import history:', error);
 }
 }
 }, []);

 // Save import records to localStorage whenever they change
 useEffect(() => {
 localStorage.setItem(STORAGE_KEY, JSON.stringify(importRecords));
 }, [importRecords]);

 const createImport = (data: Omit<ImportHistoryRecord, 'id' | 'importDateTime' | 'importedBy' | 'importedByName' | 'status' | 'successCount' | 'errorCount' | 'rollbackApplied' | 'retryCount' | 'maxRetries' | 'createdAt'>): string => {
 const newImport: ImportHistoryRecord = {
 ...data,
 id: `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 importDateTime: new Date().toISOString(),
 importedBy: user?.id || 'unknown',
 importedByName: user?.name || 'Unknown User',
 status: 'IN_PROGRESS',
 successCount: 0,
 errorCount: 0,
 rollbackApplied: false,
 retryCount: 0,
 maxRetries: MAX_RETRIES,
 createdAt: new Date().toISOString(),
 // Duplication Control (MANDATORY)
 duplicateCheckPerformed: false,
 duplicatesDetected: 0,
 duplicatesAllowed: false
 };

 setImportRecords(prev => [newImport, ...prev]);
 
 // Dispatch event for tracking
 window.dispatchEvent(new CustomEvent('import-started', { 
 detail: { importId: newImport.id, moduleName: data.moduleName } 
 }));

 return newImport.id;
 };

 const updateImportStatus = (importId: string, updates: Partial<ImportHistoryRecord>) => {
 setImportRecords(prev => prev.map(record => 
 record.id === importId 
 ? { ...record, ...updates }
 : record
 ));

 // Dispatch event based on status
 const record = importRecords.find(r => r.id === importId);
 if (updates.status) {
 window.dispatchEvent(new CustomEvent('import-status-changed', { 
 detail: { 
 importId, 
 status: updates.status,
 moduleName: record?.moduleName 
 } 
 }));
 }
 };

 const canRetry = (importId: string): boolean => {
 const record = importRecords.find(r => r.id === importId);
 if (!record) return false;

 return (
 (record.status === 'FAILED' || record.status === 'PARTIAL') &&
 record.retryCount < record.maxRetries &&
 record.rollbackApplied
 );
 };

 const retryImport = async (importId: string, mode: 'ALL' | 'FAILED_ONLY'): Promise<string | null> => {
 const originalImport = importRecords.find(r => r.id === importId);
 
 if (!originalImport) {
 console.error('Import not found');
 return null;
 }

 if (!canRetry(importId)) {
 console.error('Cannot retry this import');
 return null;
 }

 // Create new import record as retry
 const retryImportId = createImport({
 fileName: originalImport.fileName,
 fileType: originalImport.fileType,
 moduleName: originalImport.moduleName,
 targetTable: originalImport.targetTable,
 projectId: originalImport.projectId,
 projectName: originalImport.projectName,
 totalRows: mode === 'FAILED_ONLY' ? originalImport.errorCount : originalImport.totalRows,
 allowDuplicates: originalImport.allowDuplicates,
 storageFileUrl: originalImport.storageFileUrl,
 retryOfImportId: importId
 });

 // Update retry count on original
 setImportRecords(prev => prev.map(record => 
 record.id === importId 
 ? { ...record, retryCount: record.retryCount + 1 }
 : record
 ));

 // Dispatch retry event
 window.dispatchEvent(new CustomEvent('import-retried', { 
 detail: { 
 originalImportId: importId,
 newImportId: retryImportId,
 mode
 } 
 }));

 return retryImportId;
 };

 const getImportById = (importId: string): ImportHistoryRecord | undefined => {
 return importRecords.find(r => r.id === importId);
 };

 const getImportsByModule = (moduleName: ModuleName): ImportHistoryRecord[] => {
 return importRecords.filter(r => r.moduleName === moduleName);
 };

 const getImportsByProject = (projectId: string): ImportHistoryRecord[] => {
 return importRecords.filter(r => r.projectId === projectId);
 };

 const getFailedImports = (): ImportHistoryRecord[] => {
 return importRecords.filter(r => r.status === 'FAILED' || r.status === 'PARTIAL');
 };

 const generateErrorReport = (importId: string): string => {
 const record = importRecords.find(r => r.id === importId);
 if (!record || !record.errorReportData || record.errorReportData.length === 0) {
 return '';
 }

 // Generate CSV content
 const headers = ['Row Number', 'Field', 'Error Message', 'Original Value'];
 const rows = record.errorReportData.map(error => [
 error.rowNumber.toString(),
 error.field || 'N/A',
 error.errorMessage,
 error.originalValue || 'N/A'
 ]);

 const csvContent = [
 headers.join(','),
 ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
 ].join('\n');

 return csvContent;
 };

 const downloadErrorReport = (importId: string) => {
 const csvContent = generateErrorReport(importId);
 if (!csvContent) return;

 const record = importRecords.find(r => r.id === importId);
 const fileName = `ImportErrors_${record?.moduleName}_${record?.fileName}_${new Date().toISOString().split('T')[0]}.csv`;

 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const link = document.createElement('a');
 const url = URL.createObjectURL(blob);
 
 link.setAttribute('href', url);
 link.setAttribute('download', fileName);
 link.style.visibility = 'hidden';
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);

 // Update record with error report URL (simulated)
 updateImportStatus(importId, {
 errorReportUrl: `downloads/${fileName}`
 });
 };

 return (
 <ImportHistoryContext.Provider
 value={{
 importRecords,
 createImport,
 updateImportStatus,
 retryImport,
 getImportById,
 getImportsByModule,
 getImportsByProject,
 getFailedImports,
 canRetry,
 generateErrorReport,
 downloadErrorReport
 }}
 >
 {children}
 </ImportHistoryContext.Provider>
 );
}

export function useImportHistory() {
 const context = useContext(ImportHistoryContext);
 if (context === undefined) {
 throw new Error('useImportHistory must be used within an ImportHistoryProvider');
 }
 return context;
}