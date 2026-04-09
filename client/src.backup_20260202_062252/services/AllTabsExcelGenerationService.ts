/**
 * ============================================================================
 * ALL PROJECT TABS - AUTO-SYNC EXCEL GENERATION SERVICE
 * ============================================================================
 * 
 * SYSTEM-WIDE AUTO-SYNC RULE (FINAL & LOCKED)
 * 
 * Core Principle:
 * - Project Tabs = SINGLE SOURCE OF TRUTH
 * - Documents = System-generated artifacts ONLY
 * - Users: ❌ Upload, ❌ Edit, ❌ Choose folders
 * - System: ✅ Generates, ✅ Versions, ✅ Auto-syncs
 * 
 * NEW: Document-level "Sync Data" button
 * - Manual trigger for regeneration
 * - Safety/recovery mechanism
 * - Visible confirmation control
 * - NOT an editor or merge tool
 * 
 * ============================================================================
 */

export type ProjectTab = 
  | 'activities'
  | 'project-plan'
  | 'tasks'
  | 'cases'
  | 'indicators'
  | 'beneficiaries'
  | 'finance'
  | 'forecast'
  | 'procurement'
  | 'reports';

export interface TabDocumentConfig {
  tab_id: ProjectTab;
  tab_name_en: string;
  tab_name_ar: string;
  folder_id: string;
  folder_name: string;
  file_prefix: string;           // e.g., "Activities", "Project_Plan"
  file_extension: '.xlsx' | '.pdf';
  auto_sync_enabled: boolean;
  sync_permission_roles: string[]; // Who can click "Sync Data"
}

/**
 * ALL PROJECT TABS CONFIGURATION
 * Maps each tab to its auto-generated document
 */
export const ALL_PROJECT_TABS: TabDocumentConfig[] = [
  {
    tab_id: 'activities',
    tab_name_en: 'Activities',
    tab_name_ar: 'الأنشطة',
    folder_id: 'activities',
    folder_name: 'Activities',
    file_prefix: 'Activities',
    file_extension: '.xlsx',
    auto_sync_enabled: true,
    sync_permission_roles: ['system_admin', 'project_manager', 'meal_officer']
  },
  {
    tab_id: 'project-plan',
    tab_name_en: 'Project Plan',
    tab_name_ar: 'خطة المشروع',
    folder_id: 'project-plan',
    folder_name: 'Project_Plan',
    file_prefix: 'Project_Plan',
    file_extension: '.xlsx',
    auto_sync_enabled: true,
    sync_permission_roles: ['system_admin', 'project_manager']
  },
  {
    tab_id: 'tasks',
    tab_name_en: 'Tasks Management',
    tab_name_ar: 'إدارة المهام',
    folder_id: 'tasks-management',
    folder_name: 'Tasks_Management',
    file_prefix: 'Tasks',
    file_extension: '.xlsx',
    auto_sync_enabled: true,
    sync_permission_roles: ['system_admin', 'project_manager', 'project_coordinator']
  },
  {
    tab_id: 'cases',
    tab_name_en: 'Case Management',
    tab_name_ar: 'إدارة الحالات',
    folder_id: 'case-management',
    folder_name: 'Case_Management',
    file_prefix: 'Cases_Register',
    file_extension: '.xlsx',
    auto_sync_enabled: true,
    sync_permission_roles: ['system_admin', 'project_manager']
  },
  {
    tab_id: 'indicators',
    tab_name_en: 'Indicators',
    tab_name_ar: 'المؤشرات',
    folder_id: 'indicators',
    folder_name: 'Indicators',
    file_prefix: 'Indicator_Tracking',
    file_extension: '.xlsx',
    auto_sync_enabled: true,
    sync_permission_roles: ['system_admin', 'project_manager', 'meal_officer']
  },
  {
    tab_id: 'beneficiaries',
    tab_name_en: 'Beneficiaries',
    tab_name_ar: 'المستفيدون',
    folder_id: 'beneficiaries',
    folder_name: 'Beneficiaries',
    file_prefix: 'Beneficiaries_Register',
    file_extension: '.xlsx',
    auto_sync_enabled: true,
    sync_permission_roles: ['system_admin', 'project_manager', 'meal_officer']
  },
  {
    tab_id: 'finance',
    tab_name_en: 'Financial Overview',
    tab_name_ar: 'نظرة مالية عامة',
    folder_id: 'finance',
    folder_name: 'Finance',
    file_prefix: 'Budget_vs_Actual',
    file_extension: '.xlsx',
    auto_sync_enabled: true,
    sync_permission_roles: ['system_admin', 'project_manager', 'finance_officer']
  },
  {
    tab_id: 'forecast',
    tab_name_en: 'Forecast Plan',
    tab_name_ar: 'خطة التوقعات',
    folder_id: 'forecast-plan',
    folder_name: 'Forecast_Plan',
    file_prefix: 'Forecast',
    file_extension: '.xlsx',
    auto_sync_enabled: true,
    sync_permission_roles: ['system_admin', 'project_manager', 'finance_officer']
  },
  {
    tab_id: 'procurement',
    tab_name_en: 'Procurement Plan',
    tab_name_ar: 'خطة المشتريات',
    folder_id: 'procurement-plan',
    folder_name: 'Procurement_Plan',
    file_prefix: 'Procurement_Plan',
    file_extension: '.xlsx',
    auto_sync_enabled: true,
    sync_permission_roles: ['system_admin', 'project_manager', 'procurement_officer']
  },
  {
    tab_id: 'reports',
    tab_name_en: 'Project Reports',
    tab_name_ar: 'تقارير المشروع',
    folder_id: 'project-reports',
    folder_name: 'Project_Reports',
    file_prefix: 'Project_Report',
    file_extension: '.pdf',
    auto_sync_enabled: true,
    sync_permission_roles: ['system_admin', 'project_manager', 'meal_officer']
  }
];

export interface SystemGeneratedDocument {
  document_id: string;
  
  // System-generated marker (CRITICAL)
  is_system_generated: true;
  is_read_only: true;
  
  // Tab relationship
  source_tab: ProjectTab;
  tab_config: TabDocumentConfig;
  
  // Project context
  project_id: string;
  project_code: string;
  project_name: string;
  
  // Folder routing
  folder_id: string;
  folder_path: string;
  
  // File info
  file_name: string;
  file_size: number;
  mime_type: string;
  file_extension: string;
  file_data: string; // Base64 (mock)
  
  // Versioning
  version: string;
  is_latest: boolean;
  
  // Generation metadata
  generated_by: 'system';
  generated_at: string;
  generation_trigger: 'auto' | 'manual_sync' | 'data_change' | 'initial';
  triggered_by_user?: string; // For manual sync
  
  // Source data
  source_data_snapshot?: any;
  record_count: number;
  last_data_change_at: string;
  
  // Sync status
  sync_status: 'up_to_date' | 'pending' | 'syncing' | 'error';
  last_synced_at?: string;
  sync_error?: string;
}

export interface SyncDataParams {
  document_id: string;
  triggered_by_user: string;
  user_role: string;
}

// ============================================================================
// ALL TABS EXCEL GENERATION SERVICE
// ============================================================================

class AllTabsExcelGenerationServiceClass {
  private readonly STORAGE_KEY = 'pms_all_tabs_system_docs';
  private readonly SYNC_LOG_KEY = 'pms_sync_data_log';

  /**
   * GENERATE DOCUMENT FROM TAB DATA
   * Called automatically when tab data changes
   */
  async generateTabDocument(
    tab_id: ProjectTab,
    project_id: string,
    project_code: string,
    project_name: string,
    tab_data: any,
    trigger: SystemGeneratedDocument['generation_trigger'],
    triggered_by_user?: string
  ): Promise<SystemGeneratedDocument> {
    
    const tabConfig = ALL_PROJECT_TABS.find(t => t.tab_id === tab_id);
    if (!tabConfig) {
      throw new Error(`Invalid tab: ${tab_id}`);
    }

    console.log(`📊 Generating ${tabConfig.tab_name_en} document for ${project_code}...`);

    // Get next version
    const existingDocs = this.getTabDocuments(project_id, tab_id);
    const nextVersion = this.getNextVersion(existingDocs);

    // Generate file name
    const fileName = this.generateFileName(
      tabConfig.file_prefix,
      project_code,
      nextVersion,
      tabConfig.file_extension
    );

    // Generate file content (mock)
    const fileContent = this.generateFileContent(tab_id, tab_data, {
      project_code,
      project_name,
      version: nextVersion
    });

    // Create document
    const document: SystemGeneratedDocument = {
      document_id: `sys-${tab_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      
      // System markers
      is_system_generated: true,
      is_read_only: true,
      
      // Tab relationship
      source_tab: tab_id,
      tab_config: tabConfig,
      
      // Project context
      project_id,
      project_code,
      project_name,
      
      // Folder routing
      folder_id: tabConfig.folder_id,
      folder_path: `Documents/Projects/${project_code} - ${project_name}/${tabConfig.folder_name}/`,
      
      // File info
      file_name: fileName,
      file_size: fileContent.length,
      mime_type: tabConfig.file_extension === '.xlsx' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf',
      file_extension: tabConfig.file_extension,
      file_data: fileContent,
      
      // Versioning
      version: nextVersion,
      is_latest: true,
      
      // Generation metadata
      generated_by: 'system',
      generated_at: new Date().toISOString(),
      generation_trigger: trigger,
      triggered_by_user: triggered_by_user,
      
      // Source data
      source_data_snapshot: tab_data,
      record_count: Array.isArray(tab_data) ? tab_data.length : Object.keys(tab_data).length,
      last_data_change_at: new Date().toISOString(),
      
      // Sync status
      sync_status: 'up_to_date',
      last_synced_at: new Date().toISOString()
    };

    // Mark previous versions as not latest
    this.markPreviousVersionsAsOld(project_id, tab_id);

    // Save document
    this.saveDocument(document);

    // Log generation
    this.logSync(document, 'success', `${tabConfig.tab_name_en} document generated`);

    console.log(`✅ Generated: ${fileName} (v${nextVersion}, ${document.record_count} records)`);

    return document;
  }

  /**
   * SYNC DATA BUTTON - MANUAL TRIGGER
   * 
   * What happens:
   * 1. Re-reads data from the related Project Tab
   * 2. Validates latest committed records
   * 3. Conflict resolution applied at data layer (automatic)
   * 4. New document version generated
   * 5. Previous version archived
   * 6. Metadata updated
   * 7. UI refreshes
   * 
   * NO user choices, NO merge dialogs, NO file uploads
   */
  async syncData(params: SyncDataParams): Promise<SystemGeneratedDocument> {
    console.log(`🔄 Sync Data triggered for ${params.document_id} by ${params.triggered_by_user}`);

    // Get existing document
    const existingDoc = this.getDocumentById(params.document_id);
    if (!existingDoc) {
      throw new Error('Document not found');
    }

    // Check permissions
    if (!this.canSyncDocument(params.user_role, existingDoc.source_tab)) {
      throw new Error('Permission denied: You cannot sync this document');
    }

    // Mark as syncing
    existingDoc.sync_status = 'syncing';
    this.updateDocument(existingDoc);

    try {
      // Simulate re-reading data from source tab
      // In real implementation, this would query the database
      await this.simulateDelay(1500);

      // Get fresh data from source tab (mock)
      const freshData = this.getFreshTabData(existingDoc.source_tab, existingDoc.project_id);

      // Automatic conflict resolution at data layer
      // (In real app, this happens before document generation)
      const resolvedData = this.resolveConflicts(freshData);

      // Generate new version
      const newDocument = await this.generateTabDocument(
        existingDoc.source_tab,
        existingDoc.project_id,
        existingDoc.project_code,
        existingDoc.project_name,
        resolvedData,
        'manual_sync',
        params.triggered_by_user
      );

      console.log(`✅ Sync Data complete: ${newDocument.file_name}`);

      return newDocument;

    } catch (error) {
      // Mark as error
      existingDoc.sync_status = 'error';
      existingDoc.sync_error = error instanceof Error ? error.message : 'Sync failed';
      this.updateDocument(existingDoc);

      this.logSync(existingDoc, 'error', existingDoc.sync_error);

      throw error;
    }
  }

  /**
   * CHECK IF USER CAN SYNC DOCUMENT
   */
  canSyncDocument(user_role: string, tab_id: ProjectTab): boolean {
    const tabConfig = ALL_PROJECT_TABS.find(t => t.tab_id === tab_id);
    if (!tabConfig) return false;
    
    return tabConfig.sync_permission_roles.includes(user_role);
  }

  /**
   * GET LATEST DOCUMENT FOR TAB
   */
  getLatestTabDocument(project_id: string, tab_id: ProjectTab): SystemGeneratedDocument | null {
    const docs = this.getTabDocuments(project_id, tab_id);
    return docs.find(d => d.is_latest) || null;
  }

  /**
   * GET ALL DOCUMENTS FOR PROJECT
   */
  getProjectDocuments(project_id: string): SystemGeneratedDocument[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const docs: SystemGeneratedDocument[] = stored ? JSON.parse(stored) : [];
      return docs.filter(d => d.project_id === project_id)
        .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
    } catch (error) {
      console.error('Failed to get project documents:', error);
      return [];
    }
  }

  /**
   * GET ALL SYSTEM DOCUMENTS
   */
  getAllDocuments(): SystemGeneratedDocument[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get documents:', error);
      return [];
    }
  }

  /**
   * DOWNLOAD DOCUMENT
   */
  downloadDocument(document_id: string): void {
    const doc = this.getDocumentById(document_id);
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

  /**
   * GET SYNC LOGS
   */
  getSyncLogs(project_id?: string, limit: number = 50): any[] {
    try {
      const stored = localStorage.getItem(this.SYNC_LOG_KEY);
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

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getTabDocuments(project_id: string, tab_id: ProjectTab): SystemGeneratedDocument[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const docs: SystemGeneratedDocument[] = stored ? JSON.parse(stored) : [];
      return docs.filter(d => d.project_id === project_id && d.source_tab === tab_id);
    } catch (error) {
      console.error('Failed to get tab documents:', error);
      return [];
    }
  }

  private getDocumentById(document_id: string): SystemGeneratedDocument | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const docs: SystemGeneratedDocument[] = stored ? JSON.parse(stored) : [];
      return docs.find(d => d.document_id === document_id) || null;
    } catch (error) {
      console.error('Failed to get document:', error);
      return null;
    }
  }

  private generateFileName(
    prefix: string,
    project_code: string,
    version: string,
    extension: string
  ): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `${prefix}_${project_code}_v${version}_${date}${extension}`;
  }

  private getNextVersion(existingDocs: SystemGeneratedDocument[]): string {
    if (existingDocs.length === 0) return '1';
    
    const versions = existingDocs
      .map(d => parseInt(d.version))
      .filter(v => !isNaN(v));
    
    if (versions.length === 0) return '1';
    
    return (Math.max(...versions) + 1).toString();
  }

  private markPreviousVersionsAsOld(project_id: string, tab_id: ProjectTab): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const docs: SystemGeneratedDocument[] = stored ? JSON.parse(stored) : [];
      
      docs.forEach(doc => {
        if (doc.project_id === project_id && doc.source_tab === tab_id) {
          doc.is_latest = false;
        }
      });
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(docs));
    } catch (error) {
      console.error('Failed to mark old versions:', error);
    }
  }

  private saveDocument(doc: SystemGeneratedDocument): void {
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

  private updateDocument(doc: SystemGeneratedDocument): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const docs: SystemGeneratedDocument[] = stored ? JSON.parse(stored) : [];
      const index = docs.findIndex(d => d.document_id === doc.document_id);
      
      if (index !== -1) {
        docs[index] = doc;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(docs));
      }
    } catch (error) {
      console.error('Failed to update document:', error);
    }
  }

  private generateFileContent(tab_id: ProjectTab, data: any, metadata: any): string {
    // Mock file generation (Base64)
    const content = {
      tab: tab_id,
      data: data,
      metadata: metadata,
      generated_at: new Date().toISOString()
    };
    return btoa(JSON.stringify(content, null, 2));
  }

  private getFreshTabData(tab_id: ProjectTab, project_id: string): any {
    // Mock: Simulate reading fresh data from database
    // In real app, this would query the actual tab data
    return {
      tab_id,
      project_id,
      records: [
        { id: 1, name: 'Sample Record 1', updated: true },
        { id: 2, name: 'Sample Record 2', updated: true }
      ],
      timestamp: new Date().toISOString()
    };
  }

  private resolveConflicts(data: any): any {
    // Mock: Automatic conflict resolution at data layer
    // In real app, this would use last-write-wins or record-level locking
    console.log('🔧 Auto-resolving conflicts at data layer...');
    return data;
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

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private logSync(
    doc: SystemGeneratedDocument,
    status: 'success' | 'error',
    message: string
  ): void {
    try {
      const log = {
        log_id: `sync-log-${Date.now()}`,
        document_id: doc.document_id,
        project_id: doc.project_id,
        tab_id: doc.source_tab,
        version: doc.version,
        trigger: doc.generation_trigger,
        triggered_by: doc.triggered_by_user || 'system',
        status,
        message,
        timestamp: new Date().toISOString()
      };

      const stored = localStorage.getItem(this.SYNC_LOG_KEY);
      const logs = stored ? JSON.parse(stored) : [];
      logs.push(log);

      // Keep only last 1000 logs
      if (logs.length > 1000) {
        logs.shift();
      }

      localStorage.setItem(this.SYNC_LOG_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to log sync:', error);
    }
  }

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.SYNC_LOG_KEY);
  }
}

// Export singleton instance
export const AllTabsExcelService = new AllTabsExcelGenerationServiceClass();
