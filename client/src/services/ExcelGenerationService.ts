/**
 * ============================================================================
 * EXCEL GENERATION SERVICE - SYSTEM-GENERATED ARTIFACTS
 * ============================================================================
 * 
 * AUTO-GENERATES READ-ONLY EXCEL FILES FROM SYSTEM DATA
 * 
 * Key Concepts:
 * - Think like "bank statements" not "uploads"
 * - Activities tab = source of truth
 * - Excel file = derived artifact
 * - System manages, users view/download only
 * 
 * Features:
 * - Auto-generation on data changes
 * - Versioning (never overwrite)
 * - Read-only enforcement
 * - Proper Excel structure (multiple sheets)
 * - Metadata tracking
 * - Audit trail
 * 
 * ============================================================================
 */

export type SystemGeneratedDocumentType = 
 | 'activities_export'
 | 'project_plan_export'
 | 'tasks_export'
 | 'beneficiaries_register'
 | 'budget_vs_actual'
 | 'indicator_tracking';

export interface SystemGeneratedDocument {
 document_id: string;
 
 // System-generated marker (CRITICAL)
 is_system_generated: boolean;
 system_doc_type: SystemGeneratedDocumentType;
 
 // Project context
 project_id: string;
 project_code: string;
 project_name: string;
 
 // Folder routing
 project_tab: string;
 folder_id: string;
 
 // File info
 file_name: string;
 file_size: number;
 mime_type: string;
 file_extension: string;
 file_data: string; // Base64 (mock - real would be file path)
 
 // Versioning
 version: string;
 is_latest: boolean;
 
 // Generation metadata
 generated_by: 'system';
 generated_at: string;
 generation_trigger: 'create' | 'update' | 'delete' | 'status_change' | 'reporting_period' | 'manual';
 source_data_snapshot?: any; // For audit trail
 
 // Status
 status: 'Draft' | 'Final' | 'Archived';
 is_read_only: boolean; // Always true
 
 // Access control
 accessible_to_roles: string[]; // Who can view/download
 
 // Statistics
 record_count?: number; // e.g., number of activities in export
 last_data_change_at?: string;
}

export interface ExcelGenerationOptions {
 project_id: string;
 project_code: string;
 project_name: string;
 doc_type: SystemGeneratedDocumentType;
 trigger: SystemGeneratedDocument['generation_trigger'];
 data: any;
}

// ============================================================================
// EXCEL STRUCTURE DEFINITIONS
// ============================================================================

/**
 * Activities Excel Structure
 * Sheet 1: Activities (Main)
 * Sheet 2: Sub-Activities / Tasks
 * Sheet 3: Metadata (Audit)
 */
export interface ActivitiesExcelStructure {
 // Sheet 1: Activities
 activities: {
 activity_code: string;
 activity_title_en: string;
 activity_title_ar: string;
 department: string;
 start_date: string;
 end_date: string;
 status: string;
 responsible: string;
 progress_percent: number;
 linked_tasks_count: number;
 last_updated: string;
 }[];
 
 // Sheet 2: Sub-Activities / Tasks
 tasks: {
 task_code: string;
 task_name_en: string;
 task_name_ar: string;
 parent_activity_code: string;
 start_date: string;
 end_date: string;
 status: string;
 responsible: string;
 }[];
 
 // Sheet 3: Metadata
 metadata: {
 project_code: string;
 project_name: string;
 generated_by: string;
 generated_on: string;
 version: string;
 read_only: boolean;
 total_activities: number;
 total_tasks: number;
 };
}

// ============================================================================
// EXCEL GENERATION SERVICE
// ============================================================================

class ExcelGenerationServiceClass {
 private readonly STORAGE_KEY = 'pms_system_generated_docs';
 private readonly GENERATION_LOG_KEY = 'pms_excel_generation_log';

 /**
 * File naming convention (MANDATORY)
 * Format: {Type}_{ProjectCode}_v{Version}_{YYYY-MM-DD}.xlsx
 * Example: Activities_ECHO-YEM-2024-WASH-001_v3_2026-02-18.xlsx
 */
 private generateFileName(
 type: string,
 project_code: string,
 version: string,
 date: Date = new Date()
 ): string {
 const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
 return `${type}_${project_code}_v${version}_${dateStr}.xlsx`;
 }

 /**
 * AUTO-GENERATE ACTIVITIES EXCEL
 * 
 * Trigger when:
 * - Activity created
 * - Activity updated
 * - Activity deleted
 * - Task added/updated
 * - Status changed
 * - Reporting period closed
 */
 async generateActivitiesExcel(options: {
 project_id: string;
 project_code: string;
 project_name: string;
 trigger: SystemGeneratedDocument['generation_trigger'];
 activities: any[];
 tasks?: any[];
 }): Promise<SystemGeneratedDocument> {
 console.log(`📊 Generating Activities Excel for ${options.project_code}...`);

 // Get next version
 const existingDocs = this.getSystemGeneratedDocuments(
 options.project_id,
 'activities_export'
 );
 const nextVersion = this.getNextVersion(existingDocs);

 // Generate file name
 const fileName = this.generateFileName(
 'Activities',
 options.project_code,
 nextVersion
 );

 // Build Excel structure
 const excelData: ActivitiesExcelStructure = {
 activities: options.activities.map((act, idx) => ({
 activity_code: act.activity_code || `ACT-${idx + 1}`,
 activity_title_en: act.activity_name || act.title || `Activity ${idx + 1}`,
 activity_title_ar: act.activity_name_ar || act.title_ar || `نشاط ${idx + 1}`,
 department: act.department || 'Program',
 start_date: act.start_date || new Date().toISOString().split('T')[0],
 end_date: act.end_date || new Date().toISOString().split('T')[0],
 status: act.status || 'Not Started',
 responsible: act.responsible_name || act.responsible || 'TBD',
 progress_percent: act.progress || 0,
 linked_tasks_count: act.tasks?.length || 0,
 last_updated: act.updated_at || new Date().toISOString()
 })),
 
 tasks: (options.tasks || []).map((task, idx) => ({
 task_code: task.task_code || `TASK-${idx + 1}`,
 task_name_en: task.task_name || `Task ${idx + 1}`,
 task_name_ar: task.task_name_ar || `مهمة ${idx + 1}`,
 parent_activity_code: task.activity_code || 'ACT-1',
 start_date: task.start_date || new Date().toISOString().split('T')[0],
 end_date: task.end_date || new Date().toISOString().split('T')[0],
 status: task.status || 'Not Started',
 responsible: task.responsible || 'TBD'
 })),
 
 metadata: {
 project_code: options.project_code,
 project_name: options.project_name,
 generated_by: 'System',
 generated_on: new Date().toISOString(),
 version: nextVersion,
 read_only: true,
 total_activities: options.activities.length,
 total_tasks: options.tasks?.length || 0
 }
 };

 // Simulate Excel generation (in real app, would use ExcelJS or similar)
 const excelContent = this.mockExcelGeneration(excelData);

 // Create system-generated document
 const document: SystemGeneratedDocument = {
 document_id: `sys-doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 
 // System-generated marker
 is_system_generated: true,
 system_doc_type: 'activities_export',
 
 // Project context
 project_id: options.project_id,
 project_code: options.project_code,
 project_name: options.project_name,
 
 // Folder routing
 project_tab: 'activities',
 folder_id: 'activities',
 
 // File info
 file_name: fileName,
 file_size: excelContent.length,
 mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 file_extension: 'xlsx',
 file_data: excelContent,
 
 // Versioning
 version: nextVersion,
 is_latest: true,
 
 // Generation metadata
 generated_by: 'system',
 generated_at: new Date().toISOString(),
 generation_trigger: options.trigger,
 source_data_snapshot: {
 activities_count: options.activities.length,
 tasks_count: options.tasks?.length || 0,
 generation_params: options
 },
 
 // Status
 status: 'Final',
 is_read_only: true,
 
 // Access control
 accessible_to_roles: [
 'system_admin',
 'project_manager',
 'project_coordinator',
 'meal_officer',
 'field_staff'
 ],
 
 // Statistics
 record_count: options.activities.length,
 last_data_change_at: new Date().toISOString()
 };

 // Mark previous versions as not latest
 this.markPreviousVersionsAsOld(options.project_id, 'activities_export');

 // Save document
 this.saveSystemGeneratedDocument(document);

 // Log generation
 this.logGeneration(document, 'success', 'Activities Excel generated successfully');

 console.log(`✅ Generated: ${fileName}`);
 console.log(` - ${document.record_count} activities`);
 console.log(` - Version: ${document.version}`);
 console.log(` - Trigger: ${document.generation_trigger}`);

 return document;
 }

 /**
 * REGENERATE ON DATA CHANGE
 * Call this whenever activities data changes
 */
 async triggerRegeneration(
 project_id: string,
 project_code: string,
 project_name: string,
 trigger: SystemGeneratedDocument['generation_trigger'],
 activities: any[],
 tasks?: any[]
 ): Promise<SystemGeneratedDocument> {
 console.log(`🔄 Triggering regeneration: ${trigger}`);
 
 return this.generateActivitiesExcel({
 project_id,
 project_code,
 project_name,
 trigger,
 activities,
 tasks
 });
 }

 /**
 * GET LATEST SYSTEM-GENERATED DOCUMENT
 */
 getLatestDocument(
 project_id: string,
 doc_type: SystemGeneratedDocumentType
 ): SystemGeneratedDocument | null {
 const docs = this.getSystemGeneratedDocuments(project_id, doc_type);
 return docs.find(d => d.is_latest) || null;
 }

 /**
 * GET ALL VERSIONS
 */
 getAllVersions(
 project_id: string,
 doc_type: SystemGeneratedDocumentType
 ): SystemGeneratedDocument[] {
 return this.getSystemGeneratedDocuments(project_id, doc_type)
 .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
 }

 /**
 * CHECK IF REGENERATION NEEDED
 */
 needsRegeneration(
 project_id: string,
 doc_type: SystemGeneratedDocumentType,
 lastDataChange: Date
 ): boolean {
 const latestDoc = this.getLatestDocument(project_id, doc_type);
 
 if (!latestDoc) {
 return true; // No document exists
 }

 const docGeneratedAt = new Date(latestDoc.generated_at);
 return lastDataChange > docGeneratedAt;
 }

 /**
 * DOWNLOAD SYSTEM-GENERATED DOCUMENT
 */
 downloadSystemDocument(document_id: string): void {
 const doc = this.getSystemGeneratedDocumentById(document_id);
 if (!doc) {
 throw new Error('Document not found');
 }

 try {
 const blob = this.base64ToBlob(doc.file_data, doc.mime_type);
 const url = window.URL.createObjectURL(blob);
 const link = window.document.createElement('a');
 link.href = url;
 link.download = doc.file_name;
 window.document.body.appendChild(link);
 link.click();
 window.document.body.removeChild(link);
 window.URL.revokeObjectURL(url);

 console.log(`✅ Downloaded: ${doc.file_name}`);
 } catch (error) {
 console.error('Download failed:', error);
 throw error;
 }
 }

 // ============================================================================
 // QUERY METHODS
 // ============================================================================

 private getSystemGeneratedDocuments(
 project_id: string,
 doc_type?: SystemGeneratedDocumentType
 ): SystemGeneratedDocument[] {
 try {
 const stored = localStorage.getItem(this.STORAGE_KEY);
 const docs: SystemGeneratedDocument[] = stored ? JSON.parse(stored) : [];
 
 return docs.filter(d => {
 if (d.project_id !== project_id) return false;
 if (doc_type && d.system_doc_type !== doc_type) return false;
 return true;
 });
 } catch (error) {
 console.error('Failed to get system documents:', error);
 return [];
 }
 }

 private getSystemGeneratedDocumentById(document_id: string): SystemGeneratedDocument | null {
 try {
 const stored = localStorage.getItem(this.STORAGE_KEY);
 const docs: SystemGeneratedDocument[] = stored ? JSON.parse(stored) : [];
 return docs.find(d => d.document_id === document_id) || null;
 } catch (error) {
 console.error('Failed to get document:', error);
 return null;
 }
 }

 /**
 * GET ALL SYSTEM-GENERATED DOCUMENTS (for document library)
 */
 getAllSystemGeneratedDocuments(): SystemGeneratedDocument[] {
 try {
 const stored = localStorage.getItem(this.STORAGE_KEY);
 return stored ? JSON.parse(stored) : [];
 } catch (error) {
 console.error('Failed to get documents:', error);
 return [];
 }
 }

 // ============================================================================
 // HELPER METHODS
 // ============================================================================

 private getNextVersion(existingDocs: SystemGeneratedDocument[]): string {
 if (existingDocs.length === 0) return '1';
 
 const versions = existingDocs
 .map(d => parseInt(d.version))
 .filter(v => !isNaN(v));
 
 if (versions.length === 0) return '1';
 
 const maxVersion = Math.max(...versions);
 return (maxVersion + 1).toString();
 }

 private markPreviousVersionsAsOld(
 project_id: string,
 doc_type: SystemGeneratedDocumentType
 ): void {
 try {
 const stored = localStorage.getItem(this.STORAGE_KEY);
 const docs: SystemGeneratedDocument[] = stored ? JSON.parse(stored) : [];
 
 docs.forEach(doc => {
 if (doc.project_id === project_id && doc.system_doc_type === doc_type) {
 doc.is_latest = false;
 }
 });
 
 localStorage.setItem(this.STORAGE_KEY, JSON.stringify(docs));
 } catch (error) {
 console.error('Failed to mark old versions:', error);
 }
 }

 private saveSystemGeneratedDocument(doc: SystemGeneratedDocument): void {
 try {
 const stored = localStorage.getItem(this.STORAGE_KEY);
 const docs: SystemGeneratedDocument[] = stored ? JSON.parse(stored) : [];
 docs.push(doc);
 localStorage.setItem(this.STORAGE_KEY, JSON.stringify(docs));
 } catch (error) {
 console.error('Failed to save document:', error);
 throw error;
 }
 }

 private mockExcelGeneration(data: ActivitiesExcelStructure): string {
 // In real app, would use ExcelJS or similar library
 // For mock, just return a base64 string representing the data
 const jsonData = JSON.stringify(data, null, 2);
 return btoa(jsonData); // Base64 encode
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

 private logGeneration(
 doc: SystemGeneratedDocument,
 status: 'success' | 'error',
 message: string
 ): void {
 try {
 const log = {
 log_id: `gen-log-${Date.now()}`,
 document_id: doc.document_id,
 project_id: doc.project_id,
 doc_type: doc.system_doc_type,
 version: doc.version,
 trigger: doc.generation_trigger,
 status,
 message,
 timestamp: new Date().toISOString()
 };

 const stored = localStorage.getItem(this.GENERATION_LOG_KEY);
 const logs = stored ? JSON.parse(stored) : [];
 logs.push(log);

 // Keep only last 1000 logs
 if (logs.length > 1000) {
 logs.shift();
 }

 localStorage.setItem(this.GENERATION_LOG_KEY, JSON.stringify(logs));
 } catch (error) {
 console.error('Failed to log generation:', error);
 }
 }

 /**
 * Get generation logs
 */
 getGenerationLogs(project_id?: string, limit: number = 50): any[] {
 try {
 const stored = localStorage.getItem(this.GENERATION_LOG_KEY);
 let logs = stored ? JSON.parse(stored) : [];
 
 if (project_id) {
 logs = logs.filter((l: any) => l.project_id === project_id);
 }
 
 return logs
 .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
 .slice(0, limit);
 } catch (error) {
 console.error('Failed to get logs:', error);
 return [];
 }
 }

 /**
 * Clear all data (for testing)
 */
 clearAll(): void {
 localStorage.removeItem(this.STORAGE_KEY);
 localStorage.removeItem(this.GENERATION_LOG_KEY);
 }
}

// Export singleton instance
export const ExcelGenerationService = new ExcelGenerationServiceClass();
