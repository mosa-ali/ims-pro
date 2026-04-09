/**
 * ============================================================================
 * SHAREPOINT / ONEDRIVE SYNC SERVICE
 * ============================================================================
 * 
 * REALISTIC MOCK IMPLEMENTATION
 * 
 * Features:
 * - Connection configuration (SharePoint/OneDrive)
 * - OAuth-like authentication flow
 * - Folder mapping and sync
 * - Bi-directional sync support
 * - Conflict resolution
 * - Real-time sync status
 * - Error handling and retry logic
 * 
 * ============================================================================
 */

export type SyncProvider = 'sharepoint' | 'onedrive';
export type SyncDirection = 'one-way-to-cloud' | 'one-way-from-cloud' | 'two-way';
export type SyncStatus = 'not_configured' | 'connected' | 'syncing' | 'synced' | 'paused' | 'error';
export type FileStatus = 'not_synced' | 'pending' | 'syncing' | 'synced' | 'conflict' | 'error';

// ============================================================================
// SYNC CONFIGURATION
// ============================================================================

export interface SyncConfiguration {
 config_id: string;
 project_id: string;
 project_name: string;
 provider: SyncProvider;
 enabled: boolean;
 
 // Connection Details
 tenant_id?: string; // For SharePoint
 site_url?: string; // SharePoint site URL
 drive_id?: string; // OneDrive drive ID
 library_name?: string; // Document library name
 root_folder_path: string; // Remote folder path
 
 // Authentication
 access_token?: string; // OAuth access token (encrypted in real app)
 refresh_token?: string; // OAuth refresh token
 token_expires_at?: string; // Token expiration
 
 // Sync Settings
 sync_direction: SyncDirection;
 auto_sync: boolean; // Auto-sync on file change
 sync_interval_minutes: number; // Auto-sync interval
 
 // Conflict Resolution
 conflict_resolution: 'manual' | 'keep-local' | 'keep-remote' | 'keep-both';
 
 // Status
 status: SyncStatus;
 last_sync_at?: string;
 next_sync_at?: string;
 last_error?: string;
 
 // Statistics
 total_files: number;
 synced_files: number;
 pending_files: number;
 failed_files: number;
 conflict_files: number;
 
 // Audit
 created_at: string;
 created_by: string;
 updated_at?: string;
}

// ============================================================================
// FILE SYNC STATUS
// ============================================================================

export interface FileSyncStatus {
 document_id: string;
 file_name: string;
 local_path: string;
 remote_path?: string;
 
 status: FileStatus;
 last_synced_at?: string;
 sync_attempts: number;
 last_error?: string;
 
 // Versioning
 local_version: string;
 remote_version?: string;
 is_conflict: boolean;
 
 // Metadata
 local_modified_at: string;
 remote_modified_at?: string;
 local_size: number;
 remote_size?: number;
 
 // SharePoint/OneDrive IDs
 sharepoint_item_id?: string;
 sharepoint_url?: string;
 onedrive_item_id?: string;
 onedrive_url?: string;
}

// ============================================================================
// SYNC LOG ENTRY
// ============================================================================

export interface SyncLogEntry {
 log_id: string;
 project_id: string;
 sync_id: string;
 timestamp: string;
 
 action: 'connect' | 'disconnect' | 'sync_start' | 'sync_complete' | 'sync_error' | 
 'file_upload' | 'file_download' | 'conflict_detected' | 'conflict_resolved';
 
 status: 'success' | 'error' | 'warning';
 message: string;
 
 files_processed?: number;
 files_succeeded?: number;
 files_failed?: number;
 
 error_details?: string;
 metadata?: any;
}

// ============================================================================
// SHAREPOINT/ONEDRIVE SYNC SERVICE CLASS
// ============================================================================

class SharePointSyncServiceClass {
 private readonly CONFIG_KEY = 'pms_sync_configurations';
 private readonly FILE_STATUS_KEY = 'pms_file_sync_status';
 private readonly SYNC_LOG_KEY = 'pms_sync_logs';
 
 // Simulated OAuth endpoints (mock)
 private readonly MOCK_AUTH_ENDPOINTS = {
 sharepoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
 onedrive: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
 };

 // ============================================================================
 // CONFIGURATION MANAGEMENT
 // ============================================================================

 /**
 * Initialize sync configuration for a project
 */
 async initializeSync(
 project_id: string,
 project_name: string,
 provider: SyncProvider,
 created_by: string,
 options?: {
 site_url?: string;
 library_name?: string;
 sync_direction?: SyncDirection;
 auto_sync?: boolean;
 }
 ): Promise<SyncConfiguration> {
 // Check if configuration already exists
 const existing = this.getSyncConfiguration(project_id);
 if (existing) {
 throw new Error('Sync already configured for this project');
 }

 const config: SyncConfiguration = {
 config_id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 project_id,
 project_name,
 provider,
 enabled: false,
 
 // Connection details
 site_url: options?.site_url || `https://contoso.sharepoint.com/sites/${project_id}`,
 library_name: options?.library_name || 'Documents',
 root_folder_path: `/Projects/${project_id}`,
 
 // Sync settings
 sync_direction: options?.sync_direction || 'two-way',
 auto_sync: options?.auto_sync ?? true,
 sync_interval_minutes: 30,
 
 // Conflict resolution
 conflict_resolution: 'manual',
 
 // Status
 status: 'not_configured',
 total_files: 0,
 synced_files: 0,
 pending_files: 0,
 failed_files: 0,
 conflict_files: 0,
 
 // Audit
 created_at: new Date().toISOString(),
 created_by
 };

 this.saveConfiguration(config);
 this.logSync(project_id, config.config_id, 'connect', 'success', 'Sync configuration initialized');

 return config;
 }

 /**
 * Connect and authenticate with SharePoint/OneDrive
 * Simulates OAuth flow
 */
 async connectToProvider(
 project_id: string,
 credentials?: {
 tenant_id?: string;
 client_id?: string;
 client_secret?: string;
 }
 ): Promise<{ success: boolean; message: string; auth_url?: string }> {
 const config = this.getSyncConfiguration(project_id);
 if (!config) {
 throw new Error('Sync not configured');
 }

 // Simulate OAuth authentication
 console.log(`🔐 Initiating ${config.provider} OAuth flow...`);
 
 // In real app, this would redirect to OAuth consent page
 const authUrl = `${this.MOCK_AUTH_ENDPOINTS[config.provider]}?client_id=mock&response_type=code&redirect_uri=http://localhost:3000/auth/callback`;
 
 // Simulate successful authentication (in real app, this happens after OAuth callback)
 await this.simulateDelay(2000);
 
 // Generate mock tokens
 const access_token = `mock_access_token_${Date.now()}`;
 const refresh_token = `mock_refresh_token_${Date.now()}`;
 const token_expires_at = new Date(Date.now() + 3600000).toISOString(); // 1 hour

 // Update configuration
 config.access_token = access_token;
 config.refresh_token = refresh_token;
 config.token_expires_at = token_expires_at;
 config.tenant_id = credentials?.tenant_id || 'mock-tenant-id';
 config.status = 'connected';
 config.enabled = true;
 config.updated_at = new Date().toISOString();

 this.saveConfiguration(config);
 this.logSync(project_id, config.config_id, 'connect', 'success', `Connected to ${config.provider}`);

 return {
 success: true,
 message: `Successfully connected to ${config.provider}`,
 auth_url: authUrl
 };
 }

 /**
 * Disconnect from provider
 */
 async disconnectFromProvider(project_id: string): Promise<void> {
 const config = this.getSyncConfiguration(project_id);
 if (!config) {
 throw new Error('Sync not configured');
 }

 config.enabled = false;
 config.status = 'not_configured';
 config.access_token = undefined;
 config.refresh_token = undefined;
 config.token_expires_at = undefined;
 config.updated_at = new Date().toISOString();

 this.saveConfiguration(config);
 this.logSync(project_id, config.config_id, 'disconnect', 'success', 'Disconnected from provider');
 }

 /**
 * Trigger manual sync
 */
 async triggerSync(project_id: string): Promise<{
 success: boolean;
 synced_files: number;
 failed_files: number;
 conflicts: number;
 message: string;
 }> {
 const config = this.getSyncConfiguration(project_id);
 if (!config) {
 throw new Error('Sync not configured');
 }

 if (!config.enabled || config.status === 'not_configured') {
 throw new Error('Sync not connected. Please connect to provider first.');
 }

 // Update status
 config.status = 'syncing';
 this.saveConfiguration(config);

 this.logSync(project_id, config.config_id, 'sync_start', 'success', 'Sync started');

 try {
 // Simulate sync process
 await this.simulateDelay(3000);

 // Get all file statuses for this project
 const fileStatuses = this.getFileStatuses(project_id);
 
 let synced = 0;
 let failed = 0;
 let conflicts = 0;

 // Process each file
 for (const fileStatus of fileStatuses) {
 if (fileStatus.status === 'not_synced' || fileStatus.status === 'pending') {
 // Simulate 90% success rate
 const success = Math.random() > 0.1;
 
 if (success) {
 fileStatus.status = 'synced';
 fileStatus.last_synced_at = new Date().toISOString();
 fileStatus.remote_version = fileStatus.local_version;
 fileStatus.remote_modified_at = fileStatus.local_modified_at;
 fileStatus.remote_size = fileStatus.local_size;
 fileStatus.sharepoint_url = `${config.site_url}/${config.library_name}/${fileStatus.remote_path}`;
 synced++;
 } else {
 // Simulate 5% conflicts, 5% errors
 if (Math.random() > 0.5) {
 fileStatus.status = 'conflict';
 fileStatus.is_conflict = true;
 conflicts++;
 } else {
 fileStatus.status = 'error';
 fileStatus.last_error = 'Network timeout - will retry';
 failed++;
 }
 }
 
 fileStatus.sync_attempts++;
 this.saveFileStatus(fileStatus);
 }
 }

 // Update configuration
 config.status = 'synced';
 config.last_sync_at = new Date().toISOString();
 config.next_sync_at = new Date(Date.now() + config.sync_interval_minutes * 60000).toISOString();
 config.synced_files = fileStatuses.filter(f => f.status === 'synced').length;
 config.pending_files = fileStatuses.filter(f => f.status === 'pending' || f.status === 'not_synced').length;
 config.failed_files = fileStatuses.filter(f => f.status === 'error').length;
 config.conflict_files = fileStatuses.filter(f => f.status === 'conflict').length;
 config.updated_at = new Date().toISOString();

 this.saveConfiguration(config);

 this.logSync(
 project_id, 
 config.config_id, 
 'sync_complete', 
 'success', 
 `Sync completed: ${synced} synced, ${failed} failed, ${conflicts} conflicts`,
 { files_succeeded: synced, files_failed: failed }
 );

 return {
 success: true,
 synced_files: synced,
 failed_files: failed,
 conflicts: conflicts,
 message: `Sync completed successfully. ${synced} files synced, ${failed} failed, ${conflicts} conflicts.`
 };

 } catch (error) {
 config.status = 'error';
 config.last_error = error instanceof Error ? error.message : 'Sync failed';
 this.saveConfiguration(config);

 this.logSync(project_id, config.config_id, 'sync_error', 'error', config.last_error || 'Unknown error');

 throw error;
 }
 }

 /**
 * Resolve conflict for a file
 */
 async resolveConflict(
 document_id: string,
 resolution: 'keep-local' | 'keep-remote' | 'keep-both'
 ): Promise<void> {
 const fileStatus = this.getFileStatus(document_id);
 if (!fileStatus) {
 throw new Error('File status not found');
 }

 if (!fileStatus.is_conflict) {
 throw new Error('No conflict to resolve');
 }

 switch (resolution) {
 case 'keep-local':
 fileStatus.status = 'pending'; // Will sync local to remote
 fileStatus.remote_version = fileStatus.local_version;
 break;
 case 'keep-remote':
 fileStatus.status = 'synced'; // Accept remote version
 fileStatus.local_version = fileStatus.remote_version || fileStatus.local_version;
 break;
 case 'keep-both':
 fileStatus.status = 'synced'; // Create copy
 fileStatus.file_name = fileStatus.file_name.replace(/(\.[^.]+)$/, '_conflict$1');
 break;
 }

 fileStatus.is_conflict = false;
 fileStatus.last_synced_at = new Date().toISOString();
 this.saveFileStatus(fileStatus);

 const config = this.getSyncConfiguration(fileStatus.document_id.split('-')[0]);
 if (config) {
 this.logSync(
 config.project_id,
 config.config_id,
 'conflict_resolved',
 'success',
 `Conflict resolved: ${resolution} for ${fileStatus.file_name}`
 );
 }
 }

 /**
 * Pause auto-sync
 */
 pauseSync(project_id: string): void {
 const config = this.getSyncConfiguration(project_id);
 if (!config) {
 throw new Error('Sync not configured');
 }

 config.status = 'paused';
 config.auto_sync = false;
 config.updated_at = new Date().toISOString();
 this.saveConfiguration(config);
 }

 /**
 * Resume auto-sync
 */
 resumeSync(project_id: string): void {
 const config = this.getSyncConfiguration(project_id);
 if (!config) {
 throw new Error('Sync not configured');
 }

 config.status = 'connected';
 config.auto_sync = true;
 config.updated_at = new Date().toISOString();
 this.saveConfiguration(config);
 }

 // ============================================================================
 // FILE STATUS TRACKING
 // ============================================================================

 /**
 * Register file for sync
 */
 registerFileForSync(
 document_id: string,
 file_name: string,
 local_path: string,
 project_id: string,
 file_size: number,
 version: string
 ): FileSyncStatus {
 const config = this.getSyncConfiguration(project_id);
 
 const fileStatus: FileSyncStatus = {
 document_id,
 file_name,
 local_path,
 remote_path: config ? `${config.root_folder_path}/${local_path}` : local_path,
 
 status: 'not_synced',
 sync_attempts: 0,
 
 local_version: version,
 is_conflict: false,
 
 local_modified_at: new Date().toISOString(),
 local_size: file_size
 };

 this.saveFileStatus(fileStatus);
 return fileStatus;
 }

 /**
 * Get file sync status
 */
 getFileStatus(document_id: string): FileSyncStatus | null {
 try {
 const stored = localStorage.getItem(this.FILE_STATUS_KEY);
 const allStatuses: FileSyncStatus[] = stored ? JSON.parse(stored) : [];
 return allStatuses.find(s => s.document_id === document_id) || null;
 } catch (error) {
 console.error('Failed to get file status:', error);
 return null;
 }
 }

 /**
 * Get all file statuses for a project
 */
 getFileStatuses(project_id: string): FileSyncStatus[] {
 try {
 const stored = localStorage.getItem(this.FILE_STATUS_KEY);
 const allStatuses: FileSyncStatus[] = stored ? JSON.parse(stored) : [];
 return allStatuses.filter(s => s.local_path.includes(project_id));
 } catch (error) {
 console.error('Failed to get file statuses:', error);
 return [];
 }
 }

 // ============================================================================
 // QUERY METHODS
 // ============================================================================

 /**
 * Get sync configuration
 */
 getSyncConfiguration(project_id: string): SyncConfiguration | null {
 try {
 const stored = localStorage.getItem(this.CONFIG_KEY);
 const configs: SyncConfiguration[] = stored ? JSON.parse(stored) : [];
 return configs.find(c => c.project_id === project_id) || null;
 } catch (error) {
 console.error('Failed to get sync configuration:', error);
 return null;
 }
 }

 /**
 * Get all sync configurations
 */
 getAllConfigurations(): SyncConfiguration[] {
 try {
 const stored = localStorage.getItem(this.CONFIG_KEY);
 return stored ? JSON.parse(stored) : [];
 } catch (error) {
 console.error('Failed to get configurations:', error);
 return [];
 }
 }

 /**
 * Get sync logs
 */
 getSyncLogs(project_id: string, limit: number = 50): SyncLogEntry[] {
 try {
 const stored = localStorage.getItem(this.SYNC_LOG_KEY);
 const allLogs: SyncLogEntry[] = stored ? JSON.parse(stored) : [];
 return allLogs
 .filter(l => l.project_id === project_id)
 .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
 .slice(0, limit);
 } catch (error) {
 console.error('Failed to get sync logs:', error);
 return [];
 }
 }

 // ============================================================================
 // HELPER METHODS
 // ============================================================================

 private saveConfiguration(config: SyncConfiguration): void {
 try {
 const stored = localStorage.getItem(this.CONFIG_KEY);
 const configs: SyncConfiguration[] = stored ? JSON.parse(stored) : [];
 const index = configs.findIndex(c => c.project_id === config.project_id);
 
 if (index !== -1) {
 configs[index] = config;
 } else {
 configs.push(config);
 }
 
 localStorage.setItem(this.CONFIG_KEY, JSON.stringify(configs));
 } catch (error) {
 console.error('Failed to save configuration:', error);
 }
 }

 private saveFileStatus(fileStatus: FileSyncStatus): void {
 try {
 const stored = localStorage.getItem(this.FILE_STATUS_KEY);
 const statuses: FileSyncStatus[] = stored ? JSON.parse(stored) : [];
 const index = statuses.findIndex(s => s.document_id === fileStatus.document_id);
 
 if (index !== -1) {
 statuses[index] = fileStatus;
 } else {
 statuses.push(fileStatus);
 }
 
 localStorage.setItem(this.FILE_STATUS_KEY, JSON.stringify(statuses));
 } catch (error) {
 console.error('Failed to save file status:', error);
 }
 }

 private logSync(
 project_id: string,
 sync_id: string,
 action: SyncLogEntry['action'],
 status: 'success' | 'error' | 'warning',
 message: string,
 metadata?: any
 ): void {
 try {
 const log: SyncLogEntry = {
 log_id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 project_id,
 sync_id,
 timestamp: new Date().toISOString(),
 action,
 status,
 message,
 ...metadata
 };

 const stored = localStorage.getItem(this.SYNC_LOG_KEY);
 const logs: SyncLogEntry[] = stored ? JSON.parse(stored) : [];
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

 private async simulateDelay(ms: number): Promise<void> {
 return new Promise(resolve => setTimeout(resolve, ms));
 }

 /**
 * Clear all data (for testing)
 */
 clearAll(): void {
 localStorage.removeItem(this.CONFIG_KEY);
 localStorage.removeItem(this.FILE_STATUS_KEY);
 localStorage.removeItem(this.SYNC_LOG_KEY);
 }
}

// Export singleton instance
export const SharePointSyncService = new SharePointSyncServiceClass();
