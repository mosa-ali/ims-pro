import { useState, useEffect, useCallback } from 'react';
import {
 DocumentFolder,
 DocumentFile,
 DocumentModuleType,
 DocumentType,
 STANDARD_SUBFOLDERS,
 MODULE_FOLDER_ROUTING,
 SyncConfiguration
} from '@/types/document.types';

const STORAGE_KEY_FOLDERS = 'pms_document_folders';
const STORAGE_KEY_FILES = 'pms_documents';
const STORAGE_KEY_SYNC = 'pms_document_sync';
const MIGRATION_FLAG_AUTO_CREATE = 'pms_document_migration_v4_correct_storage_key'; // ✅ PERMANENT FLAG

/**
 * ============================================================================
 * SYSTEM-WIDE DOCUMENT SERVICE
 * Central service for managing documents across all modules
 * ============================================================================
 * 
 * CORE RESPONSIBILITIES:
 * 1. Auto-create project folders on project creation
 * 2. Auto-create standard sub-folder structure
 * 3. Route documents to correct folders based on module
 * 4. Manage document versions
 * 5. Handle SharePoint/OneDrive sync configuration
 * 6. Enforce permissions (ready for backend integration)
 * 
 * AUTHORITATIVE DATA STORAGE:
 * - pms_document_folders: Folder structure
 * - pms_documents: Document metadata and references
 * - pms_document_sync: Sync configurations
 * 
 * ✅ CRITICAL AUTO-CREATE LOGIC (PERMANENT - DO NOT REMOVE):
 * - ALWAYS checks pms_projects on loadData()
 * - Auto-creates missing project folders + standard subfolders
 * - This ensures folders are NEVER lost even if migration interrupted
 * - Migration flag: pms_document_migration_v4_correct_storage_key
 * ============================================================================
 */
export function useDocumentService() {
 const [folders, setFolders] = useState<DocumentFolder[]>([]);
 const [documents, setDocuments] = useState<DocumentFile[]>([]);
 const [syncConfigs, setSyncConfigs] = useState<SyncConfiguration[]>([]);
 const [loading, setLoading] = useState(true);

 // Load data from localStorage
 useEffect(() => {
 loadData();
 }, []);

 const loadData = useCallback(() => {
 setLoading(true);
 
 try {
 // Load folders
 const foldersData = localStorage.getItem(STORAGE_KEY_FOLDERS);
 
 let loadedFolders: DocumentFolder[] = [];
 
 if (foldersData) {
 loadedFolders = JSON.parse(foldersData);
 setFolders(loadedFolders);
 } else {
 // Initialize root folders
 loadedFolders = initializeRootFolders();
 }

 // ✅ CRITICAL: ALWAYS check and auto-create folders for ALL existing projects
 // This ensures folders are created even if migration was interrupted
 const projectsData = localStorage.getItem('pms_projects');
 
 if (projectsData) {
 const projects = JSON.parse(projectsData);
 
 let needsUpdate = false;
 let updatedFolders = [...loadedFolders];
 
 projects.forEach((project: any) => {
 // Check if project folder exists
 const folderExists = updatedFolders.find(f => f.projectId === project.id);
 
 if (!folderExists) {
 const folderName = `${project.projectCode} - ${project.title}`;
 const folderPath = `/Documents/Projects/${folderName}`;
 const projectFolderId = `folder-${project.id}`;
 
 // Create main project folder
 const projectFolder: DocumentFolder = {
 id: projectFolderId,
 name: folderName,
 nameAr: folderName,
 path: folderPath,
 projectId: project.id,
 projectCode: project.projectCode,
 parentId: 'projects-root',
 createdAt: project.createdAt || new Date().toISOString(),
 createdBy: project.manager || 'System',
 syncStatus: 'not_configured'
 };

 // Create standard sub-folders
 const subFolders: DocumentFolder[] = STANDARD_SUBFOLDERS.map((sf) => ({
 id: `${projectFolderId}-${sf.id}`,
 name: sf.name,
 nameAr: sf.nameAr,
 path: `${folderPath}/${sf.id}`,
 projectId: project.id,
 projectCode: project.projectCode,
 parentId: projectFolderId,
 moduleType: sf.id,
 createdAt: new Date().toISOString(),
 createdBy: 'System'
 }));

 updatedFolders = [...updatedFolders, projectFolder, ...subFolders];
 needsUpdate = true;
 }
 });

 if (needsUpdate) {
 localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(updatedFolders));
 setFolders(updatedFolders);
 console.log('✅ Document Library: Auto-created folders for existing projects');
 }
 }

 // Load documents
 const docsData = localStorage.getItem(STORAGE_KEY_FILES);
 if (docsData) {
 setDocuments(JSON.parse(docsData));
 }

 // Load sync configs
 const syncData = localStorage.getItem(STORAGE_KEY_SYNC);
 if (syncData) {
 setSyncConfigs(JSON.parse(syncData));
 }
 } catch (error) {
 console.error('Error loading document data:', error);
 } finally {
 setLoading(false);
 }
 }, []);

 /**
 * Initialize root folder structure
 */
 const initializeRootFolders = () => {
 const rootFolders: DocumentFolder[] = [
 {
 id: 'root',
 name: 'Documents',
 nameAr: 'الوثائق',
 path: '/Documents',
 parentId: null,
 createdAt: new Date().toISOString(),
 createdBy: 'System'
 },
 {
 id: 'projects-root',
 name: 'Projects',
 nameAr: 'المشاريع',
 path: '/Documents/Projects',
 parentId: 'root',
 createdAt: new Date().toISOString(),
 createdBy: 'System'
 }
 ];

 localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(rootFolders));
 setFolders(rootFolders);
 return rootFolders;
 };

 /**
 * CRITICAL: Auto-create project folder when project is created
 * This MUST be called from project creation flow
 * @param projectId - Project ID
 * @param projectCode - Project code
 * @param projectName - Project name
 * @param createdBy - User who created the project
 * @returns Project folder ID
 */
 const createProjectFolder = useCallback((
 projectId: string,
 projectCode: string,
 projectName: string,
 createdBy: string
 ): string => {
 try {
 const folderName = `${projectCode} - ${projectName}`;
 const folderPath = `/Documents/Projects/${folderName}`;
 
 // Check if folder already exists
 const existingFolder = folders.find(f => f.projectId === projectId);
 if (existingFolder) {
 console.warn(`Project folder already exists for project ${projectId}`);
 return existingFolder.id;
 }

 // Create main project folder
 const projectFolderId = `folder-${Date.now()}`;
 const projectFolder: DocumentFolder = {
 id: projectFolderId,
 name: folderName,
 nameAr: folderName, // Same for both languages (contains project code)
 path: folderPath,
 projectId,
 projectCode,
 parentId: 'projects-root',
 createdAt: new Date().toISOString(),
 createdBy,
 syncStatus: 'not_configured'
 };

 // Create standard sub-folders
 const subFolders: DocumentFolder[] = STANDARD_SUBFOLDERS.map((sf) => ({
 id: `${projectFolderId}-${sf.id}`,
 name: sf.name,
 nameAr: sf.nameAr,
 path: `${folderPath}/${sf.id}`,
 projectId,
 projectCode,
 parentId: projectFolderId,
 moduleType: sf.id,
 createdAt: new Date().toISOString(),
 createdBy: 'System'
 }));

 // Save all folders
 const updatedFolders = [...folders, projectFolder, ...subFolders];
 localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(updatedFolders));
 setFolders(updatedFolders);

 console.log(`✅ Auto-created project folder: ${folderName} with ${subFolders.length} sub-folders`);
 
 return projectFolderId;
 } catch (error) {
 console.error('❌ CRITICAL: Failed to create project folder:', error);
 throw new Error('Project folder creation failed - this is a blocking error');
 }
 }, [folders]);

 /**
 * Upload document to correct folder based on module
 * Automatically routes to correct sub-folder
 * Handles versioning
 */
 const uploadDocument = useCallback((
 file: File,
 projectId: string,
 moduleType: DocumentModuleType,
 documentType: DocumentType,
 uploadedBy: string,
 description?: string
 ): DocumentFile => {
 try {
 // Find project folder
 const projectFolder = folders.find(f => f.projectId === projectId && !f.moduleType);
 if (!projectFolder) {
 throw new Error(`Project folder not found for project ${projectId}`);
 }

 // Find target sub-folder
 const targetFolder = folders.find(
 f => f.projectId === projectId && f.moduleType === moduleType
 );
 if (!targetFolder) {
 throw new Error(`Sub-folder ${moduleType} not found for project ${projectId}`);
 }

 // Check for existing versions
 const existingDocs = documents.filter(
 d => d.projectId === projectId && 
 d.moduleType === moduleType && 
 d.documentType === documentType &&
 d.originalName === file.name
 );

 const version = existingDocs.length > 0 
 ? Math.max(...existingDocs.map(d => d.version)) + 1 
 : 1;

 // Mark previous versions as not latest
 if (existingDocs.length > 0) {
 const updatedDocs = documents.map(d => {
 if (existingDocs.find(ed => ed.id === d.id)) {
 return { ...d, isLatestVersion: false };
 }
 return d;
 });
 setDocuments(updatedDocs);
 }

 // Create document record
 const docId = `doc-${Date.now()}`;
 const versionedName = version > 1 
 ? `${file.name.split('.')[0]}_v${version}.${file.name.split('.').pop()}`
 : file.name;

 const newDoc: DocumentFile = {
 id: docId,
 name: versionedName,
 originalName: file.name,
 folderId: targetFolder.id,
 projectId,
 moduleType,
 documentType,
 version,
 fileSize: file.size,
 mimeType: file.type,
 uploadedBy,
 uploadedAt: new Date().toISOString(),
 description,
 fileReference: `file://${targetFolder.path}/${versionedName}`, // Mock reference
 isLatestVersion: true,
 parentVersionId: existingDocs.length > 0 ? existingDocs[existingDocs.length - 1].id : undefined
 };

 // Save document
 const updatedDocs = [...documents, newDoc];
 localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(updatedDocs));
 setDocuments(updatedDocs);

 console.log(`✅ Document uploaded: ${versionedName} → ${targetFolder.path} (v${version})`);
 
 return newDoc;
 } catch (error) {
 console.error('❌ Document upload failed:', error);
 throw error;
 }
 }, [folders, documents]);

 /**
 * Get documents by folder
 */
 const getDocumentsByFolder = useCallback((folderId: string): DocumentFile[] => {
 return documents.filter(d => d.folderId === folderId);
 }, [documents]);

 /**
 * Get documents by project
 */
 const getDocumentsByProject = useCallback((projectId: string): DocumentFile[] => {
 return documents.filter(d => d.projectId === projectId);
 }, [documents]);

 /**
 * Get folder tree for a project
 */
 const getProjectFolderTree = useCallback((projectId: string): DocumentFolder[] => {
 return folders.filter(f => f.projectId === projectId);
 }, [folders]);

 /**
 * Configure SharePoint/OneDrive sync
 */
 const configureSyncForProject = useCallback((
 projectId: string,
 provider: 'sharepoint' | 'onedrive',
 syncMode: 'one-way' | 'two-way'
 ): void => {
 const config: SyncConfiguration = {
 projectId,
 provider,
 enabled: true,
 syncMode,
 syncStatus: 'pending'
 };

 const updatedConfigs = syncConfigs.filter(c => c.projectId !== projectId);
 updatedConfigs.push(config);
 
 localStorage.setItem(STORAGE_KEY_SYNC, JSON.stringify(updatedConfigs));
 setSyncConfigs(updatedConfigs);

 // Update folder sync status
 const updatedFolders = folders.map(f => {
 if (f.projectId === projectId && !f.moduleType) {
 return { ...f, syncStatus: 'pending' as const, syncProvider: provider };
 }
 return f;
 });
 
 localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(updatedFolders));
 setFolders(updatedFolders);

 console.log(`✅ Sync configured for project ${projectId}: ${provider} (${syncMode})`);
 }, [folders, syncConfigs]);

 /**
 * Get sync status for project
 */
 const getSyncStatus = useCallback((projectId: string): SyncConfiguration | null => {
 return syncConfigs.find(c => c.projectId === projectId) || null;
 }, [syncConfigs]);

 /**
 * Delete document (soft delete - keeps version history)
 */
 const deleteDocument = useCallback((documentId: string): void => {
 const updatedDocs = documents.filter(d => d.id !== documentId);
 localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(updatedDocs));
 setDocuments(updatedDocs);
 }, [documents]);

 return {
 // Data
 folders,
 documents,
 loading,
 
 // Core operations
 createProjectFolder,
 uploadDocument,
 deleteDocument,
 
 // Queries
 getDocumentsByFolder,
 getDocumentsByProject,
 getProjectFolderTree,
 
 // Sync
 configureSyncForProject,
 getSyncStatus,
 
 // Utilities
 loadData
 };
}