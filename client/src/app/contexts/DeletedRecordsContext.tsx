/**
 * ============================================================================
 * DELETED RECORDS CONTEXT
 * ============================================================================
 * 
 * Manages soft-deleted records across all modules (HR, MEAL, etc.)
 * Provides restore and permanent delete functionality.
 * 
 * ============================================================================
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';

export interface DeletedRecord {
 id: string;
 recordType: 'Project' | 'Activity' | 'Task' | 'Indicator' | 'Beneficiary' | 'Budget' | 
 'Expense' | 'Fund Request' | 'Transfer' | 'Procurement Request' | 'Purchase Order' | 
 'GRN' | 'Stock Item' | 'Proposal' | 'Pipeline Item' | 'Risk' | 'Report' | 
 'Case' | 'Survey' | 'Document' | 'User' | 'IndicatorData' | 'Submission' |
 'Staff' | 'SalaryScale' | 'Contract' | 'Leave' | 'PayrollDraft';
 recordName: string;
 module: 'Projects' | 'Finance' | 'MEAL' | 'Cases' | 'Surveys' | 'Documents' | 
 'Procurement' | 'Grants' | 'Users' | 'HR';
 subModule?: string;
 deletedBy: string;
 deletedByName: string;
 deletedAt: string;
 originalStatus?: string;
 originalData: any;
 canRestore: boolean;
 canPermanentDelete: boolean;
 projectId?: string;
 projectName?: string;
 donorId?: string;
 donorName?: string;
 staffId?: string;
 reason?: string;
}

interface DeletedRecordsContextType {
 deletedRecords: DeletedRecord[];
 softDelete: (record: Omit<DeletedRecord, 'id' | 'deletedAt' | 'deletedBy' | 'deletedByName'>) => void;
 restore: (recordId: string) => Promise<boolean>;
 permanentDelete: (recordId: string) => Promise<boolean>;
 getDeletedRecordsByModule: (module: string) => DeletedRecord[];
 getDeletedRecordsByType: (recordType: string) => DeletedRecord[];
 isRecordDeleted: (recordType: string, recordId: string) => boolean;
}

const DeletedRecordsContext = createContext<DeletedRecordsContextType | undefined>(undefined);

const STORAGE_KEY = 'pms_deleted_records';

export function DeletedRecordsProvider({ children }: { children: ReactNode }) {
 const { user } = useAuth();
 const [deletedRecords, setDeletedRecords] = useState<DeletedRecord[]>([]);

 // Load deleted records from localStorage on mount
 useEffect(() => {
 const stored = localStorage.getItem(STORAGE_KEY);
 if (stored) {
 try {
 const parsed = JSON.parse(stored);
 setDeletedRecords(parsed);
 } catch (error) {
 console.error('Failed to parse deleted records:', error);
 }
 }
 }, []);

 // Save deleted records to localStorage whenever they change
 useEffect(() => {
 localStorage.setItem(STORAGE_KEY, JSON.stringify(deletedRecords));
 }, [deletedRecords]);

 const softDelete = (record: Omit<DeletedRecord, 'id' | 'deletedAt' | 'deletedBy' | 'deletedByName'>) => {
 const newRecord: DeletedRecord = {
 ...record,
 id: `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 deletedAt: new Date().toISOString(),
 deletedBy: String(user?.id || 'unknown'),
 deletedByName: user?.name || 'Unknown User'
 };

 setDeletedRecords(prev => [...prev, newRecord]);

 // Dispatch event so other components can react to deletion
 window.dispatchEvent(new CustomEvent('record-deleted', { 
 detail: { 
 recordType: record.recordType, 
 recordId: record.originalData.id 
 } 
 }));
 };

 const restore = async (recordId: string): Promise<boolean> => {
 const record = deletedRecords.find(r => r.id === recordId);
 if (!record || !record.canRestore) {
 return false;
 }

 try {
 // Remove from deleted records
 setDeletedRecords(prev => prev.filter(r => r.id !== recordId));

 // Dispatch event so the original module can restore the record
 window.dispatchEvent(new CustomEvent('record-restored', { 
 detail: { 
 recordType: record.recordType, 
 originalData: record.originalData 
 } 
 }));

 return true;
 } catch (error) {
 console.error('Failed to restore record:', error);
 return false;
 }
 };

 const permanentDelete = async (recordId: string): Promise<boolean> => {
 const record = deletedRecords.find(r => r.id === recordId);
 if (!record || !record.canPermanentDelete) {
 return false;
 }

 try {
 // Permanently remove from deleted records
 setDeletedRecords(prev => prev.filter(r => r.id !== recordId));

 // Dispatch event for permanent deletion
 window.dispatchEvent(new CustomEvent('record-permanently-deleted', { 
 detail: { 
 recordType: record.recordType, 
 recordId: record.originalData.id 
 } 
 }));

 return true;
 } catch (error) {
 console.error('Failed to permanently delete record:', error);
 return false;
 }
 };

 const getDeletedRecordsByModule = (module: string): DeletedRecord[] => {
 return deletedRecords.filter(r => r.module === module);
 };

 const getDeletedRecordsByType = (recordType: string): DeletedRecord[] => {
 return deletedRecords.filter(r => r.recordType === recordType);
 };

 const isRecordDeleted = (recordType: string, recordId: string): boolean => {
 return deletedRecords.some(r => 
 r.recordType === recordType && 
 r.originalData.id === recordId
 );
 };

 return (
 <DeletedRecordsContext.Provider
 value={{
 deletedRecords,
 softDelete,
 restore,
 permanentDelete,
 getDeletedRecordsByModule,
 getDeletedRecordsByType,
 isRecordDeleted
 }}
 >
 {children}
 </DeletedRecordsContext.Provider>
 );
}

export function useDeletedRecords() {
 const context = useContext(DeletedRecordsContext);
 if (context === undefined) {
 throw new Error('useDeletedRecords must be used within a DeletedRecordsProvider');
 }
 return context;
}
