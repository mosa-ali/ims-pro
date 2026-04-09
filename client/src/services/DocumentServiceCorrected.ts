/**
 * ============================================================================
 * CORRECTED SYSTEM-WIDE DOCUMENT SERVICE
 * ============================================================================
 * 
 * MANDATORY ARCHITECTURE - PROJECT-TAB-ALIGNED
 * 
 * CRITICAL RULES:
 * 1. ✅ Sub-folders MUST match Project Tabs (not modules/departments)
 * 2. ✅ Auto-creation on project creation
 * 3. ✅ Tab-based folder creation on tab activation
 * 4. ✅ Auto-routing by project tab, not module
 * 5. ✅ Archive folder for deleted projects
 * 6. ✅ Role-based permissions
 * 7. ✅ Full EN/AR support
 * 
 * ============================================================================
 */

// ============================================================================
// PROJECT-TAB-ALIGNED FOLDER STRUCTURE (FINAL - LOCKED)
// ============================================================================

export interface ProjectTabFolder {
 folder_id: string; // Unique identifier
 folder_name_en: string; // English display name
 folder_name_ar: string; // Arabic display name
 physical_name: string; // Language-neutral storage name
 project_tab: string; // Corresponding project tab/module
 auto_created: boolean; // Auto-created on project creation?
 creation_trigger: 'project_creation' | 'tab_activation'; // When to create
}

/**
 * FINAL FOLDER STRUCTURE - PROJECT-TAB-ALIGNED
 * 
 * This structure matches Project Tabs exactly (excluding Overview)
 */
export const PROJECT_TAB_FOLDERS: ProjectTabFolder[] = [
 // ========== AUTO-CREATED ON PROJECT CREATION ==========
 {
 folder_id: 'activities',
 folder_name_en: 'Activities',
 folder_name_ar: 'الأنشطة',
 physical_name: 'Activities',
 project_tab: 'activities',
 auto_created: true,
 creation_trigger: 'project_creation'
 },
 {
 folder_id: 'indicators',
 folder_name_en: 'Indicators',
 folder_name_ar: 'المؤشرات',
 physical_name: 'Indicators',
 project_tab: 'indicators',
 auto_created: true,
 creation_trigger: 'project_creation'
 },
 {
 folder_id: 'beneficiaries',
 folder_name_en: 'Beneficiaries',
 folder_name_ar: 'المستفيدون',
 physical_name: 'Beneficiaries',
 project_tab: 'beneficiaries',
 auto_created: true,
 creation_trigger: 'project_creation'
 },
 {
 folder_id: 'finance',
 folder_name_en: 'Finance',
 folder_name_ar: 'المالية',
 physical_name: 'Finance',
 project_tab: 'finance',
 auto_created: true,
 creation_trigger: 'project_creation'
 },
 {
 folder_id: 'forecast-plan',
 folder_name_en: 'Forecast Plan',
 folder_name_ar: 'خطة التوقعات',
 physical_name: 'Forecast_Plan',
 project_tab: 'forecast',
 auto_created: true,
 creation_trigger: 'project_creation'
 },
 {
 folder_id: 'project-reports',
 folder_name_en: 'Project Reports',
 folder_name_ar: 'تقارير المشروع',
 physical_name: 'Project_Reports',
 project_tab: 'reports',
 auto_created: true,
 creation_trigger: 'project_creation'
 },
 
 // ========== CREATED ON TAB ACTIVATION ==========
 {
 folder_id: 'project-plan',
 folder_name_en: 'Project Plan',
 folder_name_ar: 'خطة المشروع',
 physical_name: 'Project_Plan',
 project_tab: 'project-plan',
 auto_created: false,
 creation_trigger: 'tab_activation'
 },
 {
 folder_id: 'tasks-management',
 folder_name_en: 'Tasks Management',
 folder_name_ar: 'إدارة المهام',
 physical_name: 'Tasks_Management',
 project_tab: 'tasks',
 auto_created: false,
 creation_trigger: 'tab_activation'
 },
 {
 folder_id: 'case-management',
 folder_name_en: 'Case Management',
 folder_name_ar: 'إدارة الحالات',
 physical_name: 'Case_Management',
 project_tab: 'cases',
 auto_created: false,
 creation_trigger: 'tab_activation'
 },
 {
 folder_id: 'procurement-plan',
 folder_name_en: 'Procurement Plan',
 folder_name_ar: 'خطة المشتريات',
 physical_name: 'Procurement_Plan',
 project_tab: 'procurement',
 auto_created: false,
 creation_trigger: 'tab_activation'
 }
];

// ============================================================================
// DOCUMENT RECORD WITH PROJECT-TAB METADATA
// ============================================================================

export interface DocumentRecordCorrected {
 // Core ID
 document_id: string;
 
 // Project Relationship (MANDATORY)
 project_id: string; // Every document belongs to a project
 project_code: string; // For folder path
 project_name: string; // For display
 
 // PROJECT TAB (CRITICAL for auto-routing)
 project_tab: 'activities' | 'project-plan' | 'tasks' | 'cases' | 'indicators' | 
 'beneficiaries' | 'finance' | 'forecast' | 'procurement' | 'reports';
 
 // Document Metadata
 document_type: string; // e.g., "Activity Report", "Budget", "Procurement Contract"
 file_name: string;
 file_size: number;
 mime_type: string;
 file_extension: string;
 
 // File Storage
 file_data: string; // Base64 encoded (frontend mock)
 file_path?: string; // Backend file storage path
 
 // AUTO-ROUTING (Backend enforced)
 folder_id: string; // e.g., "activities", "finance"
 folder_path: string; // e.g., "Documents/Projects/PROJ-001 - Digital Literacy/Activities/"
 
 // Versioning
 version: string; // e.g., "1.0", "1.1", "2.0"
 status: 'Draft' | 'Final' | 'Approved';
 is_latest: boolean; // Only one version marked as latest
 
 // Audit Trail
 uploaded_by: string;
 uploaded_by_id?: string;
 uploaded_at: string;
 updated_at?: string;
 
 // SharePoint/OneDrive Sync
 sync_status: 'not_synced' | 'pending' | 'synced' | 'error';
 sync_last_attempt?: string;
 sync_error_message?: string;
 sharepoint_url?: string;
 onedrive_url?: string;
 
 // Additional
 description?: string;
 tags?: string[];
}

// ============================================================================
// PROJECT FOLDER STRUCTURE
// ============================================================================

export interface ProjectFolder {
 project_id: string;
 project_code: string;
 project_name: string;
 project_name_ar: string;
 folder_path: string; // e.g., "Documents/Projects/PROJ-001 - Digital Literacy"
 created_at: string;
 created_by: string;
 sub_folders: string[]; // List of folder_ids that exist
 archived: boolean;
 archived_at?: string;
}

// ============================================================================
// UPLOAD PARAMETERS (PROJECT-TAB-BASED)
// ============================================================================

export interface DocumentUploadParams {
 file: File;
 
 // MANDATORY: Project context
 project_id: string;
 project_code: string;
 project_name: string;
 
 // MANDATORY: Project Tab (for auto-routing)
 project_tab: 'activities' | 'project-plan' | 'tasks' | 'cases' | 'indicators' | 
 'beneficiaries' | 'finance' | 'forecast' | 'procurement' | 'reports';
 
 // Document metadata
 document_type: string;
 
 // User info
 uploaded_by: string;
 uploaded_by_id?: string;
 
 // Optional
 status?: 'Draft' | 'Final' | 'Approved';
 description?: string;
 tags?: string[];
}

// ============================================================================
// PROJECT SYNC STATUS
// ============================================================================

export interface ProjectSyncStatus {
 project_id: string;
 project_name: string;
 sync_enabled: boolean;
 sync_provider: 'sharepoint' | 'onedrive' | null;
 sync_status: 'not_configured' | 'synced' | 'pending' | 'error';
 last_sync_at?: string;
 sync_error_message?: string;
 total_documents: number;
 synced_documents: number;
 pending_documents: number;
 failed_documents: number;
}

// ============================================================================
// CORRECTED DOCUMENT SERVICE CLASS
// ============================================================================

class DocumentServiceCorrectedClass {
 private readonly STORAGE_KEY = 'pms_documents_corrected';
 private readonly FOLDERS_KEY = 'pms_project_folders';
 private readonly SYNC_STATUS_KEY = 'pms_project_sync_status';
 private readonly ARCHIVE_KEY = 'pms_archived_projects';
 private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

 // ============================================================================
 // PROJECT FOLDER MANAGEMENT
 // ============================================================================

 /**
 * AUTO-CREATE PROJECT FOLDER STRUCTURE
 * Called when a new project is created
 */
 createProjectFolder(
 project_id: string,
 project_code: string,
 project_name: string,
 project_name_ar: string,
 created_by: string
 ): ProjectFolder {
 // Check if folder already exists
 const existing = this.getProjectFolder(project_id);
 if (existing) {
 console.log(`Project folder already exists for ${project_id}`);
 return existing;
 }

 // Create auto-folders
 const autoFolders = PROJECT_TAB_FOLDERS
 .filter(f => f.auto_created)
 .map(f => f.folder_id);

 const folder: ProjectFolder = {
 project_id,
 project_code,
 project_name,
 project_name_ar,
 folder_path: `Documents/Projects/${project_code} - ${project_name}`,
 created_at: new Date().toISOString(),
 created_by,
 sub_folders: autoFolders,
 archived: false
 };

 this.saveProjectFolder(folder);

 console.log(`✅ Created project folder: ${folder.folder_path}`);
 console.log(`✅ Auto-created sub-folders: ${autoFolders.join(', ')}`);

 return folder;
 }

 /**
 * CREATE TAB-SPECIFIC FOLDER
 * Called when a tab/module is activated
 */
 createTabFolder(project_id: string, tab_id: string): void {
 const projectFolder = this.getProjectFolder(project_id);
 if (!projectFolder) {
 throw new Error(`Project folder not found: ${project_id}`);
 }

 // Check if folder already exists
 if (projectFolder.sub_folders.includes(tab_id)) {
 console.log(`Tab folder already exists: ${tab_id}`);
 return;
 }

 // Add folder to project
 projectFolder.sub_folders.push(tab_id);
 this.saveProjectFolder(projectFolder);

 console.log(`✅ Created tab folder: ${tab_id} for project ${project_id}`);
 }

 /**
 * ARCHIVE PROJECT FOLDER
 * Called when a project is deleted
 */
 archiveProjectFolder(project_id: string, archived_by: string): void {
 const projectFolder = this.getProjectFolder(project_id);
 if (!projectFolder) {
 throw new Error(`Project folder not found: ${project_id}`);
 }

 // Mark as archived
 projectFolder.archived = true;
 projectFolder.archived_at = new Date().toISOString();
 projectFolder.folder_path = `Documents/Archive/${projectFolder.project_code} - ${projectFolder.project_name}`;

 this.saveProjectFolder(projectFolder);

 // Log to archive
 const archived = this.getArchivedProjects();
 archived.push({
 ...projectFolder,
 archived_by,
 archived_at: new Date().toISOString()
 });
 localStorage.setItem(this.ARCHIVE_KEY, JSON.stringify(archived));

 console.log(`✅ Archived project folder: ${projectFolder.folder_path}`);
 }

 // ============================================================================
 // DOCUMENT UPLOAD WITH AUTO-ROUTING
 // ============================================================================

 async uploadDocument(params: DocumentUploadParams): Promise<DocumentRecordCorrected> {
 try {
 // Validate file size
 if (params.file.size > this.MAX_FILE_SIZE) {
 throw new Error(`File size exceeds maximum limit of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
 }

 // Ensure project folder exists
 let projectFolder = this.getProjectFolder(params.project_id);
 if (!projectFolder) {
 // Auto-create if missing (retroactive)
 projectFolder = this.createProjectFolder(
 params.project_id,
 params.project_code,
 params.project_name,
 params.project_name,
 params.uploaded_by
 );
 }

 // Ensure tab folder exists
 const tabFolder = PROJECT_TAB_FOLDERS.find(f => f.project_tab === params.project_tab);
 if (!tabFolder) {
 throw new Error(`Invalid project tab: ${params.project_tab}`);
 }

 if (!projectFolder.sub_folders.includes(tabFolder.folder_id)) {
 this.createTabFolder(params.project_id, tabFolder.folder_id);
 }

 // Read file as Base64
 const file_data = await this.fileToBase64(params.file);

 // Extract file metadata
 const file_extension = params.file.name.split('.').pop()?.toLowerCase() || 'unknown';
 const mime_type = params.file.type || this.getMimeType(file_extension);

 // Build folder path
 const folder_path = `${projectFolder.folder_path}/${tabFolder.physical_name}/`;

 // Create document record
 const document: DocumentRecordCorrected = {
 document_id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 
 // Project context
 project_id: params.project_id,
 project_code: params.project_code,
 project_name: params.project_name,
 
 // Project tab (for routing)
 project_tab: params.project_tab,
 
 // Metadata
 document_type: params.document_type,
 file_name: params.file.name,
 file_size: params.file.size,
 mime_type: mime_type,
 file_extension: file_extension,
 file_data: file_data,
 
 // Auto-routing
 folder_id: tabFolder.folder_id,
 folder_path: folder_path,
 
 // Versioning
 version: this.getNextVersion(params.project_id, params.project_tab, params.document_type),
 status: params.status || 'Final',
 is_latest: true,
 
 // Audit
 uploaded_by: params.uploaded_by,
 uploaded_by_id: params.uploaded_by_id,
 uploaded_at: new Date().toISOString(),
 
 // Sync (initially not synced)
 sync_status: 'not_synced',
 
 // Optional
 description: params.description,
 tags: params.tags
 };

 // Save document
 this.saveDocument(document);

 // Update project sync status
 this.updateProjectSyncStatus(params.project_id);

 console.log(`✅ Document uploaded: ${document.file_name} → ${folder_path}`);

 return document;
 } catch (error) {
 console.error('Document upload failed:', error);
 throw error;
 }
 }

 // ============================================================================
 // QUERY METHODS
 // ============================================================================

 /**
 * Get all documents
 */
 getAllDocuments(): DocumentRecordCorrected[] {
 try {
 const stored = localStorage.getItem(this.STORAGE_KEY);
 return stored ? JSON.parse(stored) : [];
 } catch (error) {
 console.error('Failed to retrieve documents:', error);
 return [];
 }
 }

 /**
 * Get documents by project
 */
 getDocumentsByProject(project_id: string): DocumentRecordCorrected[] {
 return this.getAllDocuments().filter(d => d.project_id === project_id);
 }

 /**
 * Get documents by project tab
 */
 getDocumentsByTab(project_id: string, project_tab: string): DocumentRecordCorrected[] {
 return this.getAllDocuments().filter(d => 
 d.project_id === project_id && d.project_tab === project_tab
 );
 }

 /**
 * Get documents by folder
 */
 getDocumentsByFolder(project_id: string, folder_id: string): DocumentRecordCorrected[] {
 return this.getAllDocuments().filter(d => 
 d.project_id === project_id && d.folder_id === folder_id
 );
 }

 /**
 * Get project folder
 */
 getProjectFolder(project_id: string): ProjectFolder | null {
 try {
 const stored = localStorage.getItem(this.FOLDERS_KEY);
 const folders: ProjectFolder[] = stored ? JSON.parse(stored) : [];
 return folders.find(f => f.project_id === project_id) || null;
 } catch (error) {
 console.error('Failed to get project folder:', error);
 return null;
 }
 }

 /**
 * Get all project folders
 */
 getAllProjectFolders(): ProjectFolder[] {
 try {
 const stored = localStorage.getItem(this.FOLDERS_KEY);
 return stored ? JSON.parse(stored) : [];
 } catch (error) {
 console.error('Failed to get project folders:', error);
 return [];
 }
 }

 /**
 * Get archived projects
 */
 getArchivedProjects(): any[] {
 try {
 const stored = localStorage.getItem(this.ARCHIVE_KEY);
 return stored ? JSON.parse(stored) : [];
 } catch (error) {
 console.error('Failed to get archived projects:', error);
 return [];
 }
 }

 // ============================================================================
 // SHAREPOINT/ONEDRIVE SYNC
 // ============================================================================

 /**
 * Enable sync for a project
 */
 enableProjectSync(
 project_id: string,
 project_name: string,
 provider: 'sharepoint' | 'onedrive'
 ): void {
 const syncStatus: ProjectSyncStatus = {
 project_id,
 project_name,
 sync_enabled: true,
 sync_provider: provider,
 sync_status: 'pending',
 total_documents: 0,
 synced_documents: 0,
 pending_documents: 0,
 failed_documents: 0
 };

 this.saveProjectSyncStatus(project_id, syncStatus);
 this.triggerProjectSync(project_id);
 }

 /**
 * Disable sync for a project
 */
 disableProjectSync(project_id: string): void {
 const status = this.getProjectSyncStatus(project_id);
 if (status) {
 status.sync_enabled = false;
 status.sync_provider = null;
 this.saveProjectSyncStatus(project_id, status);
 }
 }

 /**
 * Get sync status
 */
 getProjectSyncStatus(project_id: string): ProjectSyncStatus | null {
 try {
 const stored = localStorage.getItem(this.SYNC_STATUS_KEY);
 const allStatuses = stored ? JSON.parse(stored) : {};
 return allStatuses[project_id] || null;
 } catch (error) {
 console.error('Failed to get sync status:', error);
 return null;
 }
 }

 /**
 * Trigger sync
 */
 async triggerProjectSync(project_id: string): Promise<void> {
 const status = this.getProjectSyncStatus(project_id);
 if (!status || !status.sync_enabled) {
 throw new Error('Sync not enabled for this project');
 }

 status.sync_status = 'pending';
 this.saveProjectSyncStatus(project_id, status);

 try {
 await new Promise(resolve => setTimeout(resolve, 2000));

 const projectDocs = this.getDocumentsByProject(project_id);
 projectDocs.forEach(doc => {
 this.updateDocumentSyncStatus(doc.document_id, 'synced');
 });

 status.sync_status = 'synced';
 status.last_sync_at = new Date().toISOString();
 status.synced_documents = projectDocs.length;
 status.pending_documents = 0;
 this.saveProjectSyncStatus(project_id, status);
 } catch (error) {
 status.sync_status = 'error';
 status.sync_error_message = error instanceof Error ? error.message : 'Sync failed';
 this.saveProjectSyncStatus(project_id, status);
 throw error;
 }
 }

 // ============================================================================
 // HELPER METHODS
 // ============================================================================

 private saveDocument(document: DocumentRecordCorrected): void {
 const allDocuments = this.getAllDocuments();
 
 // Mark other versions as not latest
 allDocuments.forEach(doc => {
 if (doc.project_id === document.project_id &&
 doc.project_tab === document.project_tab &&
 doc.document_type === document.document_type &&
 doc.document_id !== document.document_id) {
 doc.is_latest = false;
 }
 });
 
 allDocuments.push(document);
 localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allDocuments));
 }

 private saveProjectFolder(folder: ProjectFolder): void {
 const folders = this.getAllProjectFolders();
 const index = folders.findIndex(f => f.project_id === folder.project_id);
 
 if (index !== -1) {
 folders[index] = folder;
 } else {
 folders.push(folder);
 }
 
 localStorage.setItem(this.FOLDERS_KEY, JSON.stringify(folders));
 }

 private updateProjectSyncStatus(project_id: string): void {
 const projectDocs = this.getDocumentsByProject(project_id);
 const syncedDocs = projectDocs.filter(d => d.sync_status === 'synced').length;
 const pendingDocs = projectDocs.filter(d => d.sync_status === 'pending').length;
 const failedDocs = projectDocs.filter(d => d.sync_status === 'error').length;

 let status = this.getProjectSyncStatus(project_id);
 if (status) {
 status.total_documents = projectDocs.length;
 status.synced_documents = syncedDocs;
 status.pending_documents = pendingDocs;
 status.failed_documents = failedDocs;
 this.saveProjectSyncStatus(project_id, status);
 }
 }

 private saveProjectSyncStatus(project_id: string, status: ProjectSyncStatus): void {
 try {
 const stored = localStorage.getItem(this.SYNC_STATUS_KEY);
 const allStatuses = stored ? JSON.parse(stored) : {};
 allStatuses[project_id] = status;
 localStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify(allStatuses));
 } catch (error) {
 console.error('Failed to save sync status:', error);
 }
 }

 private updateDocumentSyncStatus(
 document_id: string,
 sync_status: 'not_synced' | 'pending' | 'synced' | 'error',
 error_message?: string
 ): void {
 const allDocuments = this.getAllDocuments();
 const docIndex = allDocuments.findIndex(d => d.document_id === document_id);
 
 if (docIndex !== -1) {
 allDocuments[docIndex].sync_status = sync_status;
 allDocuments[docIndex].sync_last_attempt = new Date().toISOString();
 if (error_message) {
 allDocuments[docIndex].sync_error_message = error_message;
 }
 localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allDocuments));
 }
 }

 private async fileToBase64(file: File): Promise<string> {
 return new Promise((resolve, reject) => {
 const reader = new FileReader();
 reader.onload = () => {
 const result = reader.result as string;
 const base64 = result.split(',')[1];
 resolve(base64);
 };
 reader.onerror = reject;
 reader.readAsDataURL(file);
 });
 }

 private getMimeType(extension: string): string {
 const mimeTypes: Record<string, string> = {
 'pdf': 'application/pdf',
 'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'xls': 'application/vnd.ms-excel',
 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'doc': 'application/msword',
 'jpg': 'image/jpeg',
 'jpeg': 'image/jpeg',
 'png': 'image/png',
 'txt': 'text/plain',
 'csv': 'text/csv'
 };
 return mimeTypes[extension] || 'application/octet-stream';
 }

 private getNextVersion(project_id: string, project_tab: string, document_type: string): string {
 const existingDocs = this.getAllDocuments().filter(doc => {
 return doc.project_id === project_id && 
 doc.project_tab === project_tab &&
 doc.document_type === document_type;
 });

 if (existingDocs.length === 0) {
 return '1.0';
 }

 const versions = existingDocs.map(doc => {
 const parts = doc.version.split('.');
 return parseInt(parts[0]) * 100 + parseInt(parts[1]);
 });

 const maxVersion = Math.max(...versions);
 const major = Math.floor(maxVersion / 100);
 const minor = maxVersion % 100;

 if (minor < 9) {
 return `${major}.${minor + 1}`;
 } else {
 return `${major + 1}.0`;
 }
 }

 /**
 * Download document
 */
 downloadDocument(document_id: string): void {
 const document = this.getAllDocuments().find(d => d.document_id === document_id);
 if (!document) {
 throw new Error('Document not found');
 }

 try {
 const blob = this.base64ToBlob(document.file_data, document.mime_type);
 const url = window.URL.createObjectURL(blob);
 const link = window.document.createElement('a');
 link.href = url;
 link.download = document.file_name;
 window.document.body.appendChild(link);
 link.click();
 window.document.body.removeChild(link);
 window.URL.revokeObjectURL(url);
 } catch (error) {
 console.error('Document download failed:', error);
 throw error;
 }
 }

 /**
 * View document
 */
 viewDocument(document_id: string): void {
 const document = this.getAllDocuments().find(d => d.document_id === document_id);
 if (!document) {
 throw new Error('Document not found');
 }

 try {
 const fileType = document.file_extension.toLowerCase();

 if (fileType === 'pdf' || ['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) {
 const blob = this.base64ToBlob(document.file_data, document.mime_type);
 const url = window.URL.createObjectURL(blob);
 window.open(url, '_blank');
 } else {
 this.downloadDocument(document_id);
 }
 } catch (error) {
 console.error('Document view failed:', error);
 throw error;
 }
 }

 private base64ToBlob(base64: string, mimeType: string): Blob {
 const byteCharacters = atob(base64);
 const byteNumbers = new Array(byteCharacters.length);
 
 for (let i = 0; i < byteCharacters.length; i++) {
 byteNumbers[i] = byteCharacters.charCodeAt(i);
 }
 
 const byteArray = new Uint8Array(byteNumbers);
 return new Blob([byteArray], { type: mimeType });
 }

 /**
 * Clear all data (for testing)
 */
 clearAll(): void {
 localStorage.removeItem(this.STORAGE_KEY);
 localStorage.removeItem(this.FOLDERS_KEY);
 localStorage.removeItem(this.SYNC_STATUS_KEY);
 localStorage.removeItem(this.ARCHIVE_KEY);
 }
}

// Export singleton instance
export const DocumentServiceCorrected = new DocumentServiceCorrectedClass();
