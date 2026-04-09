/**
 * ============================================================================
 * ENHANCED SYSTEM-WIDE DOCUMENT SERVICE
 * ============================================================================
 * 
 * CRITICAL ARCHITECTURE - MANDATORY AUTO-SYNC:
 * 
 * 1. SINGLE SOURCE OF TRUTH
 * - One file uploaded = one storage location
 * - Multiple views (source module + Document Management)
 * - NO duplicate uploads allowed
 * 
 * 2. AUTO-ROUTING WITH METADATA
 * - Every upload includes: module, document_type, project_id
 * - Backend auto-routes to correct sub-folder
 * - Folder structure enforced server-side
 * 
 * 3. SHAREPOINT/ONEDRIVE SYNC
 * - Sync status tracked per project folder
 * - Controlled centrally, not per file
 * - Error logging with recovery
 * 
 * ============================================================================
 */

// ============================================================================
// FOLDER STRUCTURE DEFINITION (MANDATORY STANDARD)
// ============================================================================

export interface FolderDefinition {
 folder_code: string; // e.g., "01", "02", "03"
 folder_name_en: string; // English display name
 folder_name_ar: string; // Arabic display name
 physical_name: string; // Language-neutral folder name for storage
 module: string; // Which module routes here
}

export const STANDARD_FOLDER_STRUCTURE: FolderDefinition[] = [
 {
 folder_code: '01',
 folder_name_en: 'Project Documents',
 folder_name_ar: 'وثائق المشروع',
 physical_name: '01_Project',
 module: 'projects'
 },
 {
 folder_code: '02',
 folder_name_en: 'Grants & Contracts',
 folder_name_ar: 'المنح والعقود',
 physical_name: '02_Grants',
 module: 'grants'
 },
 {
 folder_code: '03',
 folder_name_en: 'Finance & Budgets',
 folder_name_ar: 'المالية والميزانيات',
 physical_name: '03_Finance',
 module: 'finance'
 },
 {
 folder_code: '04',
 folder_name_en: 'Procurement',
 folder_name_ar: 'المشتريات',
 physical_name: '04_Procurement',
 module: 'procurement'
 },
 {
 folder_code: '05',
 folder_name_en: 'MEAL & Monitoring',
 folder_name_ar: 'المراقبة والتقييم',
 physical_name: '05_MEAL',
 module: 'meal'
 },
 {
 folder_code: '06',
 folder_name_en: 'Reports',
 folder_name_ar: 'التقارير',
 physical_name: '06_Reports',
 module: 'reports'
 },
 {
 folder_code: '07',
 folder_name_en: 'Case Management',
 folder_name_ar: 'إدارة الحالات',
 physical_name: '07_Cases',
 module: 'cases'
 },
 {
 folder_code: '08',
 folder_name_en: 'Proposals & Pipeline',
 folder_name_ar: 'المقترحات والفرص',
 physical_name: '08_Proposals',
 module: 'proposals'
 },
 {
 folder_code: '09',
 folder_name_en: 'HR & Staff',
 folder_name_ar: 'الموارد البشرية',
 physical_name: '09_HR',
 module: 'hr'
 },
 {
 folder_code: '99',
 folder_name_en: 'Other Documents',
 folder_name_ar: 'مستندات أخرى',
 physical_name: '99_Other',
 module: 'other'
 }
];

// ============================================================================
// ENHANCED DOCUMENT RECORD WITH MODULE & SYNC METADATA
// ============================================================================

export interface DocumentRecordEnhanced {
 // Core ID
 document_id: string;
 
 // Relationship IDs
 project_id?: string;
 grant_id?: string;
 budget_id?: string;
 report_id?: string;
 procurement_id?: string;
 case_id?: string;
 proposal_id?: string;
 
 // MODULE FIELD (CRITICAL for auto-routing)
 module: 'projects' | 'grants' | 'finance' | 'procurement' | 'meal' | 'reports' | 'cases' | 'proposals' | 'hr' | 'other';
 
 // Document Metadata
 document_type: string; // e.g., "Project Proposal", "Budget", "Report"
 file_name: string;
 file_size: number;
 mime_type: string;
 file_extension: string;
 
 // File Storage
 file_data: string; // Base64 encoded (frontend mock)
 file_path?: string; // Backend file storage path
 
 // AUTO-ROUTING (Backend enforced)
 folder_code: string; // e.g., "01", "02", "03"
 folder_path: string; // e.g., "Projects/PROJ-001/01_Project/"
 
 // Versioning
 version: string; // e.g., "1.0", "1.1", "2.0"
 status: 'Draft' | 'Final' | 'Approved';
 is_latest: boolean; // Only one version marked as latest
 
 // Categorization
 category: 'Contractual' | 'Financial' | 'Programmatic' | 'Supporting' | 'Compliance';
 
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
// PROJECT FOLDER SYNC STATUS
// ============================================================================

export interface ProjectFolderSyncStatus {
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
// UPLOAD PARAMETERS (Enhanced with module field)
// ============================================================================

export interface DocumentUploadParamsEnhanced {
 file: File;
 
 // MANDATORY: Module source (for auto-routing)
 module: 'projects' | 'grants' | 'finance' | 'procurement' | 'meal' | 'reports' | 'cases' | 'proposals' | 'hr' | 'other';
 
 // Document metadata
 document_type: string;
 category: 'Contractual' | 'Financial' | 'Programmatic' | 'Supporting' | 'Compliance';
 
 // Relationship
 project_id?: string;
 grant_id?: string;
 budget_id?: string;
 report_id?: string;
 procurement_id?: string;
 case_id?: string;
 proposal_id?: string;
 
 // User info
 uploaded_by: string;
 uploaded_by_id?: string;
 
 // Optional
 status?: 'Draft' | 'Final' | 'Approved';
 description?: string;
 tags?: string[];
}

// ============================================================================
// ENHANCED DOCUMENT SERVICE CLASS
// ============================================================================

class DocumentServiceEnhancedClass {
 private readonly STORAGE_KEY = 'pms_documents_enhanced';
 private readonly SYNC_STATUS_KEY = 'pms_folder_sync_status';
 private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

 // ============================================================================
 // UPLOAD DOCUMENT WITH AUTO-ROUTING
 // ============================================================================
 
 async uploadDocument(params: DocumentUploadParamsEnhanced): Promise<DocumentRecordEnhanced> {
 try {
 // Validate file size
 if (params.file.size > this.MAX_FILE_SIZE) {
 throw new Error(`File size exceeds maximum limit of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
 }

 // Read file as Base64
 const file_data = await this.fileToBase64(params.file);

 // Extract file metadata
 const file_extension = params.file.name.split('.').pop()?.toLowerCase() || 'unknown';
 const mime_type = params.file.type || this.getMimeType(file_extension);

 // AUTO-ROUTE to correct folder based on module
 const folderInfo = this.getFolderByModule(params.module);
 const project_id = params.project_id || 'GENERAL';
 const folder_path = `Projects/${project_id}/${folderInfo.physical_name}/`;

 // Create enhanced document record
 const document: DocumentRecordEnhanced = {
 document_id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 
 // Relationships
 project_id: params.project_id,
 grant_id: params.grant_id,
 budget_id: params.budget_id,
 report_id: params.report_id,
 procurement_id: params.procurement_id,
 case_id: params.case_id,
 proposal_id: params.proposal_id,
 
 // MODULE (critical for routing)
 module: params.module,
 
 // Metadata
 document_type: params.document_type,
 file_name: params.file.name,
 file_size: params.file.size,
 mime_type: mime_type,
 file_extension: file_extension,
 file_data: file_data,
 
 // AUTO-ROUTING
 folder_code: folderInfo.folder_code,
 folder_path: folder_path,
 
 // Versioning
 version: this.getNextVersion(project_id, params.module, params.document_type),
 status: params.status || 'Final',
 is_latest: true,
 
 // Category
 category: params.category,
 
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

 // Save to persistent storage
 this.saveDocument(document);

 // Update project folder sync status
 if (params.project_id) {
 this.updateProjectSyncStatus(params.project_id);
 }

 // Log audit trail
 this.logAuditTrail({
 document_id: document.document_id,
 action: 'UPLOAD',
 user: params.uploaded_by,
 timestamp: new Date().toISOString(),
 metadata: {
 module: params.module,
 folder_path: folder_path,
 file_name: document.file_name,
 version: document.version
 }
 });

 return document;
 } catch (error) {
 console.error('Document upload failed:', error);
 throw error;
 }
 }

 // ============================================================================
 // GET DOCUMENTS (with module filter support)
 // ============================================================================
 
 getDocuments(filter?: {
 project_id?: string;
 module?: string;
 document_type?: string;
 category?: string;
 status?: string;
 sync_status?: string;
 }): DocumentRecordEnhanced[] {
 const allDocuments = this.getAllDocuments();

 if (!filter) {
 return allDocuments;
 }

 return allDocuments.filter(doc => {
 if (filter.project_id && doc.project_id !== filter.project_id) return false;
 if (filter.module && doc.module !== filter.module) return false;
 if (filter.document_type && doc.document_type !== filter.document_type) return false;
 if (filter.category && doc.category !== filter.category) return false;
 if (filter.status && doc.status !== filter.status) return false;
 if (filter.sync_status && doc.sync_status !== filter.sync_status) return false;
 return true;
 });
 }

 // ============================================================================
 // SHAREPOINT/ONEDRIVE SYNC CONTROLS
 // ============================================================================
 
 /**
 * Enable sync for a project folder
 */
 enableProjectSync(
 project_id: string, 
 project_name: string,
 provider: 'sharepoint' | 'onedrive'
 ): void {
 const syncStatus: ProjectFolderSyncStatus = {
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
 
 // Trigger initial sync (in real app, this would call backend API)
 this.triggerProjectSync(project_id);
 }

 /**
 * Disable sync for a project folder
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
 * Get sync status for a project
 */
 getProjectSyncStatus(project_id: string): ProjectFolderSyncStatus | null {
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
 * Trigger sync for a project (mock implementation)
 */
 async triggerProjectSync(project_id: string): Promise<void> {
 const status = this.getProjectSyncStatus(project_id);
 if (!status || !status.sync_enabled) {
 throw new Error('Sync not enabled for this project');
 }

 // Update status to pending
 status.sync_status = 'pending';
 this.saveProjectSyncStatus(project_id, status);

 try {
 // In real implementation, this would call backend API
 // For now, simulate sync delay
 await new Promise(resolve => setTimeout(resolve, 2000));

 // Update document sync status
 const projectDocs = this.getDocuments({ project_id });
 projectDocs.forEach(doc => {
 this.updateDocumentSyncStatus(doc.document_id, 'synced');
 });

 // Update project sync status
 status.sync_status = 'synced';
 status.last_sync_at = new Date().toISOString();
 status.synced_documents = projectDocs.length;
 status.pending_documents = 0;
 this.saveProjectSyncStatus(project_id, status);

 this.logAuditTrail({
 document_id: `project-${project_id}`,
 action: 'SYNC_SUCCESS',
 user: 'System',
 timestamp: new Date().toISOString(),
 metadata: {
 project_id,
 documents_synced: projectDocs.length
 }
 });
 } catch (error) {
 // Handle sync error
 status.sync_status = 'error';
 status.sync_error_message = error instanceof Error ? error.message : 'Sync failed';
 this.saveProjectSyncStatus(project_id, status);

 this.logAuditTrail({
 document_id: `project-${project_id}`,
 action: 'SYNC_ERROR',
 user: 'System',
 timestamp: new Date().toISOString(),
 metadata: {
 project_id,
 error: status.sync_error_message
 }
 });

 throw error;
 }
 }

 // ============================================================================
 // HELPER METHODS
 // ============================================================================
 
 private getFolderByModule(module: string): FolderDefinition {
 const folder = STANDARD_FOLDER_STRUCTURE.find(f => f.module === module);
 if (!folder) {
 // Default to "Other" if module not found
 return STANDARD_FOLDER_STRUCTURE[STANDARD_FOLDER_STRUCTURE.length - 1];
 }
 return folder;
 }

 private getAllDocuments(): DocumentRecordEnhanced[] {
 try {
 const stored = localStorage.getItem(this.STORAGE_KEY);
 return stored ? JSON.parse(stored) : [];
 } catch (error) {
 console.error('Failed to retrieve documents:', error);
 return [];
 }
 }

 private saveDocument(document: DocumentRecordEnhanced): void {
 const allDocuments = this.getAllDocuments();
 
 // Mark other versions of same document as not latest
 allDocuments.forEach(doc => {
 if (doc.project_id === document.project_id &&
 doc.module === document.module &&
 doc.document_type === document.document_type &&
 doc.document_id !== document.document_id) {
 doc.is_latest = false;
 }
 });
 
 allDocuments.push(document);
 localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allDocuments));
 }

 private updateProjectSyncStatus(project_id: string): void {
 const projectDocs = this.getDocuments({ project_id });
 const syncedDocs = projectDocs.filter(d => d.sync_status === 'synced').length;
 const pendingDocs = projectDocs.filter(d => d.sync_status === 'pending').length;
 const failedDocs = projectDocs.filter(d => d.sync_status === 'error').length;

 let status = this.getProjectSyncStatus(project_id);
 if (!status) {
 // Create initial status
 status = {
 project_id,
 project_name: `Project ${project_id}`,
 sync_enabled: false,
 sync_provider: null,
 sync_status: 'not_configured',
 total_documents: projectDocs.length,
 synced_documents: syncedDocs,
 pending_documents: pendingDocs,
 failed_documents: failedDocs
 };
 } else {
 status.total_documents = projectDocs.length;
 status.synced_documents = syncedDocs;
 status.pending_documents = pendingDocs;
 status.failed_documents = failedDocs;
 }

 this.saveProjectSyncStatus(project_id, status);
 }

 private saveProjectSyncStatus(project_id: string, status: ProjectFolderSyncStatus): void {
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
 'gif': 'image/gif',
 'svg': 'image/svg+xml',
 'txt': 'text/plain',
 'csv': 'text/csv'
 };
 return mimeTypes[extension] || 'application/octet-stream';
 }

 private getNextVersion(project_id: string, module: string, document_type: string): string {
 const existingDocs = this.getAllDocuments().filter(doc => {
 return doc.project_id === project_id && 
 doc.module === module &&
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

 private logAuditTrail(entry: {
 document_id: string;
 action: string;
 user: string;
 timestamp: string;
 metadata?: any;
 }): void {
 try {
 const AUDIT_KEY = 'pms_document_audit_trail_enhanced';
 const stored = localStorage.getItem(AUDIT_KEY);
 const auditTrail = stored ? JSON.parse(stored) : [];
 
 auditTrail.push(entry);
 
 if (auditTrail.length > 1000) {
 auditTrail.shift();
 }
 
 localStorage.setItem(AUDIT_KEY, JSON.stringify(auditTrail));
 } catch (error) {
 console.error('Failed to log audit trail:', error);
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

 this.logAuditTrail({
 document_id: document.document_id,
 action: 'DOWNLOAD',
 user: 'Current User',
 timestamp: new Date().toISOString(),
 metadata: { file_name: document.file_name }
 });
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

 this.logAuditTrail({
 document_id: document.document_id,
 action: 'VIEW',
 user: 'Current User',
 timestamp: new Date().toISOString(),
 metadata: { file_name: document.file_name }
 });
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
 * Get folder structure for a language
 */
 getFolderStructure(language: 'en' | 'ar'): FolderDefinition[] {
 return STANDARD_FOLDER_STRUCTURE;
 }

 /**
 * Clear all data (for testing)
 */
 clearAll(): void {
 localStorage.removeItem(this.STORAGE_KEY);
 localStorage.removeItem(this.SYNC_STATUS_KEY);
 localStorage.removeItem('pms_document_audit_trail_enhanced');
 }
}

// Export singleton instance
export const DocumentServiceEnhanced = new DocumentServiceEnhancedClass();
