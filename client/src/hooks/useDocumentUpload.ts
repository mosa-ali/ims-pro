/**
 * ============================================================================
 * USE DOCUMENT UPLOAD HOOK
 * ============================================================================
 * 
 * UNIVERSAL HOOK for ALL modules to upload documents with auto-routing
 * 
 * USAGE:
 * ```tsx
 * const { uploadDocument, uploading, error } = useDocumentUpload();
 * 
 * await uploadDocument({
 * file: selectedFile,
 * module: 'projects', // Auto-routes to 01_Project folder
 * document_type: 'Project Proposal',
 * category: 'Programmatic',
 * project_id: 'PROJ-001'
 * });
 * ```
 * 
 * Document will automatically appear in:
 * 1. Source module (e.g., Projects screen)
 * 2. Document Management sidebar
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { 
 DocumentServiceEnhanced, 
 DocumentUploadParamsEnhanced, 
 DocumentRecordEnhanced,
 ProjectFolderSyncStatus 
} from '@/services/DocumentServiceEnhanced';
import { useAuth } from '@/_core/hooks/useAuth';

export function useDocumentUpload() {
 const { user } = useAuth();
 const [uploading, setUploading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [uploadedDocument, setUploadedDocument] = useState<DocumentRecordEnhanced | null>(null);

 const uploadDocument = async (params: Omit<DocumentUploadParamsEnhanced, 'uploaded_by' | 'uploaded_by_id'>): Promise<DocumentRecordEnhanced | null> => {
 setUploading(true);
 setError(null);
 setUploadedDocument(null);

 try {
 const fullParams: DocumentUploadParamsEnhanced = {
 ...params,
 uploaded_by: user?.name || 'Unknown User',
 uploaded_by_id: user?.id.toString()
 };

 const document = await DocumentServiceEnhanced.uploadDocument(fullParams);
 setUploadedDocument(document);
 return document;
 } catch (err) {
 const errorMessage = err instanceof Error ? err.message : 'Upload failed';
 setError(errorMessage);
 return null;
 } finally {
 setUploading(false);
 }
 };

 return {
 uploadDocument,
 uploading,
 error,
 uploadedDocument
 };
}

/**
 * ============================================================================
 * USE PROJECT SYNC HOOK
 * ============================================================================
 * 
 * Hook for managing SharePoint/OneDrive sync at project folder level
 * 
 * USAGE:
 * ```tsx
 * const { 
 * syncStatus, 
 * enableSync, 
 * disableSync, 
 * triggerSync,
 * syncing 
 * } = useProjectSync('PROJ-001', 'Digital Literacy Project');
 * ```
 * 
 * ============================================================================
 */

export function useProjectSync(project_id: string, project_name: string) {
 const [syncStatus, setSyncStatus] = useState<ProjectFolderSyncStatus | null>(null);
 const [syncing, setSyncing] = useState(false);
 const [syncError, setSyncError] = useState<string | null>(null);

 // Load sync status on mount
 useEffect(() => {
 loadSyncStatus();
 }, [project_id]);

 const loadSyncStatus = () => {
 const status = DocumentServiceEnhanced.getProjectSyncStatus(project_id);
 setSyncStatus(status);
 };

 const enableSync = (provider: 'sharepoint' | 'onedrive') => {
 try {
 DocumentServiceEnhanced.enableProjectSync(project_id, project_name, provider);
 loadSyncStatus();
 } catch (err) {
 setSyncError(err instanceof Error ? err.message : 'Failed to enable sync');
 }
 };

 const disableSync = () => {
 try {
 DocumentServiceEnhanced.disableProjectSync(project_id);
 loadSyncStatus();
 } catch (err) {
 setSyncError(err instanceof Error ? err.message : 'Failed to disable sync');
 }
 };

 const triggerSync = async () => {
 setSyncing(true);
 setSyncError(null);

 try {
 await DocumentServiceEnhanced.triggerProjectSync(project_id);
 loadSyncStatus();
 } catch (err) {
 const errorMessage = err instanceof Error ? err.message : 'Sync failed';
 setSyncError(errorMessage);
 } finally {
 setSyncing(false);
 }
 };

 return {
 syncStatus,
 enableSync,
 disableSync,
 triggerSync,
 syncing,
 syncError,
 refreshStatus: loadSyncStatus
 };
}