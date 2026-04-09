import { useState } from 'react';
import { useDeletedRecords, DeletedRecord } from '@/contexts/DeletedRecordsContext';

type RecordType = DeletedRecord['recordType'];
type Module = DeletedRecord['module'];

interface UseRecordDeleteOptions {
 onDeleteSuccess?: () => void;
 onDeleteError?: (error: Error) => void;
}

export function useRecordDelete(options?: UseRecordDeleteOptions) {
 const { softDelete } = useDeletedRecords();
 const [isDeleting, setIsDeleting] = useState(false);
 const [deleteModalOpen, setDeleteModalOpen] = useState(false);
 const [recordToDelete, setRecordToDelete] = useState<{
 id: string;
 name: string;
 type: RecordType;
 module: Module;
 data: any;
 status?: string;
 } | null>(null);

 const initiateDelete = (
 recordId: string,
 recordName: string,
 recordType: RecordType,
 module: Module,
 originalData: any,
 originalStatus?: string
 ) => {
 setRecordToDelete({
 id: recordId,
 name: recordName,
 type: recordType,
 module: module,
 data: originalData,
 status: originalStatus
 });
 setDeleteModalOpen(true);
 };

 const confirmDelete = async () => {
 if (!recordToDelete) return;

 setIsDeleting(true);

 try {
 // Perform soft delete
 softDelete({
 recordType: recordToDelete.type,
 recordName: recordToDelete.name,
 module: recordToDelete.module,
 originalStatus: recordToDelete.status,
 originalData: recordToDelete.data,
 canRestore: true,
 canPermanentDelete: true // Can be customized based on business logic
 });

 setDeleteModalOpen(false);
 setRecordToDelete(null);
 
 if (options?.onDeleteSuccess) {
 options.onDeleteSuccess();
 }
 } catch (error) {
 if (options?.onDeleteError) {
 options.onDeleteError(error as Error);
 }
 } finally {
 setIsDeleting(false);
 }
 };

 const cancelDelete = () => {
 setDeleteModalOpen(false);
 setRecordToDelete(null);
 };

 return {
 initiateDelete,
 confirmDelete,
 cancelDelete,
 deleteModalOpen,
 setDeleteModalOpen,
 recordToDelete,
 isDeleting
 };
}
