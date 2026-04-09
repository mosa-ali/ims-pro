/**
 * ============================================================================
 * DOCUMENT PERMISSIONS SERVICE
 * ============================================================================
 * 
 * ROLE-BASED ACCESS CONTROL (RBAC)
 * 
 * Features:
 * - Role-based permissions (Admin, Project Manager, User, etc.)
 * - Document-level permissions
 * - Project-level permissions
 * - Folder-level permissions
 * - Action-based checks (view, download, upload, delete, etc.)
 * - Audit trail for permission changes
 * 
 * ============================================================================
 */

// ============================================================================
// ROLES DEFINITION
// ============================================================================

export type UserRole = 
 | 'system_admin' // Full system access
 | 'project_manager' // Full access to assigned projects
 | 'finance_officer' // Finance documents access
 | 'meal_officer' // MEAL documents access
 | 'procurement_officer' // Procurement documents access
 | 'project_coordinator' // Limited project access
 | 'field_staff' // Read-only access
 | 'external_auditor' // Audit-specific access
 | 'donor_representative'; // Read-only donor access

// ============================================================================
// PERMISSIONS DEFINITION
// ============================================================================

export type DocumentPermission = 
 | 'view' // Can view document
 | 'download' // Can download document
 | 'upload' // Can upload new documents
 | 'edit' // Can edit document metadata
 | 'delete' // Can delete documents
 | 'share' // Can share documents
 | 'manage_permissions' // Can manage permissions
 | 'manage_sync' // Can configure SharePoint/OneDrive sync
 | 'view_audit_log'; // Can view audit logs

// ============================================================================
// ROLE PERMISSIONS MATRIX
// ============================================================================

const ROLE_PERMISSIONS: Record<UserRole, DocumentPermission[]> = {
 system_admin: [
 'view', 'download', 'upload', 'edit', 'delete', 
 'share', 'manage_permissions', 'manage_sync', 'view_audit_log'
 ],
 project_manager: [
 'view', 'download', 'upload', 'edit', 'delete', 
 'share', 'manage_sync', 'view_audit_log'
 ],
 finance_officer: [
 'view', 'download', 'upload', 'edit'
 ],
 meal_officer: [
 'view', 'download', 'upload', 'edit'
 ],
 procurement_officer: [
 'view', 'download', 'upload', 'edit'
 ],
 project_coordinator: [
 'view', 'download', 'upload'
 ],
 field_staff: [
 'view', 'download'
 ],
 external_auditor: [
 'view', 'download', 'view_audit_log'
 ],
 donor_representative: [
 'view', 'download'
 ]
};

// ============================================================================
// USER WITH PERMISSIONS
// ============================================================================

export interface UserWithPermissions {
 user_id: string;
 name: string;
 email: string;
 role: UserRole;
 
 // Project assignments
 assigned_projects: string[]; // Project IDs user has access to
 
 // Custom permissions (overrides)
 custom_permissions?: {
 project_id: string;
 folder_ids?: string[]; // Specific folders access
 permissions: DocumentPermission[];
 }[];
 
 // Status
 is_active: boolean;
 created_at: string;
 updated_at?: string;
}

// ============================================================================
// DOCUMENT ACCESS CONTROL
// ============================================================================

export interface DocumentAccessControl {
 document_id: string;
 project_id: string;
 folder_id: string;
 
 // Owner
 owner_id: string;
 
 // Public access
 is_public: boolean; // Accessible to all project members
 
 // Specific user access
 user_permissions: {
 user_id: string;
 permissions: DocumentPermission[];
 granted_by: string;
 granted_at: string;
 }[];
 
 // Role-based access
 role_permissions: {
 role: UserRole;
 permissions: DocumentPermission[];
 }[];
 
 created_at: string;
 updated_at?: string;
}

// ============================================================================
// FOLDER-LEVEL PERMISSIONS
// ============================================================================

export const FOLDER_ROLE_ACCESS: Record<string, UserRole[]> = {
 // Auto-created folders - accessible to most roles
 'activities': ['system_admin', 'project_manager', 'project_coordinator', 'meal_officer', 'field_staff'],
 'indicators': ['system_admin', 'project_manager', 'meal_officer'],
 'beneficiaries': ['system_admin', 'project_manager', 'project_coordinator', 'meal_officer'],
 'finance': ['system_admin', 'project_manager', 'finance_officer', 'external_auditor'],
 'forecast-plan': ['system_admin', 'project_manager', 'finance_officer'],
 'project-reports': ['system_admin', 'project_manager', 'meal_officer', 'donor_representative', 'external_auditor'],
 
 // Tab-activated folders - restricted access
 'project-plan': ['system_admin', 'project_manager', 'project_coordinator'],
 'tasks-management': ['system_admin', 'project_manager', 'project_coordinator'],
 'case-management': ['system_admin', 'project_manager', 'project_coordinator'],
 'procurement-plan': ['system_admin', 'project_manager', 'procurement_officer', 'finance_officer']
};

// ============================================================================
// PERMISSION CHECK RESULT
// ============================================================================

export interface PermissionCheckResult {
 allowed: boolean;
 reason?: string;
 suggestion?: string;
}

// ============================================================================
// PERMISSIONS SERVICE CLASS
// ============================================================================

class PermissionsServiceClass {
 private readonly USERS_KEY = 'pms_users_permissions';
 private readonly ACCESS_CONTROL_KEY = 'pms_document_access_control';
 private readonly AUDIT_KEY = 'pms_permissions_audit';

 // ============================================================================
 // USER MANAGEMENT
 // ============================================================================

 /**
 * Create user with permissions
 */
 createUser(
 user_id: string,
 name: string,
 email: string,
 role: UserRole,
 assigned_projects: string[] = []
 ): UserWithPermissions {
 const user: UserWithPermissions = {
 user_id,
 name,
 email,
 role,
 assigned_projects,
 is_active: true,
 created_at: new Date().toISOString()
 };

 this.saveUser(user);
 this.logPermissionChange('user_created', user_id, 'System', `User created with role: ${role}`);

 return user;
 }

 /**
 * Update user role
 */
 updateUserRole(user_id: string, new_role: UserRole, updated_by: string): void {
 const user = this.getUser(user_id);
 if (!user) {
 throw new Error('User not found');
 }

 const old_role = user.role;
 user.role = new_role;
 user.updated_at = new Date().toISOString();

 this.saveUser(user);
 this.logPermissionChange('role_changed', user_id, updated_by, `Role changed from ${old_role} to ${new_role}`);
 }

 /**
 * Assign user to projects
 */
 assignUserToProjects(user_id: string, project_ids: string[], assigned_by: string): void {
 const user = this.getUser(user_id);
 if (!user) {
 throw new Error('User not found');
 }

 const newProjects = project_ids.filter(id => !user.assigned_projects.includes(id));
 user.assigned_projects = [...user.assigned_projects, ...newProjects];
 user.updated_at = new Date().toISOString();

 this.saveUser(user);
 this.logPermissionChange('projects_assigned', user_id, assigned_by, `Assigned to projects: ${newProjects.join(', ')}`);
 }

 /**
 * Remove user from projects
 */
 removeUserFromProjects(user_id: string, project_ids: string[], removed_by: string): void {
 const user = this.getUser(user_id);
 if (!user) {
 throw new Error('User not found');
 }

 user.assigned_projects = user.assigned_projects.filter(id => !project_ids.includes(id));
 user.updated_at = new Date().toISOString();

 this.saveUser(user);
 this.logPermissionChange('projects_removed', user_id, removed_by, `Removed from projects: ${project_ids.join(', ')}`);
 }

 // ============================================================================
 // PERMISSION CHECKS
 // ============================================================================

 /**
 * Check if user can perform action on document
 */
 canPerformAction(
 user_id: string,
 document_id: string,
 project_id: string,
 folder_id: string,
 action: DocumentPermission
 ): PermissionCheckResult {
 const user = this.getUser(user_id);
 
 // User not found
 if (!user) {
 return {
 allowed: false,
 reason: 'User not found',
 suggestion: 'Please contact administrator'
 };
 }

 // User inactive
 if (!user.is_active) {
 return {
 allowed: false,
 reason: 'User account is inactive',
 suggestion: 'Please contact administrator'
 };
 }

 // System admin has all permissions
 if (user.role === 'system_admin') {
 return { allowed: true };
 }

 // Check if user is assigned to project
 if (!user.assigned_projects.includes(project_id)) {
 return {
 allowed: false,
 reason: 'Not assigned to this project',
 suggestion: 'Request project access from Project Manager'
 };
 }

 // Check folder-level access
 const folderAccess = FOLDER_ROLE_ACCESS[folder_id];
 if (folderAccess && !folderAccess.includes(user.role)) {
 return {
 allowed: false,
 reason: `Role ${user.role} does not have access to ${folder_id} folder`,
 suggestion: 'Contact Project Manager for access'
 };
 }

 // Check role permissions
 const rolePermissions = ROLE_PERMISSIONS[user.role];
 if (!rolePermissions.includes(action)) {
 return {
 allowed: false,
 reason: `Role ${user.role} does not have ${action} permission`,
 suggestion: 'Contact administrator to upgrade permissions'
 };
 }

 // Check document-specific access control
 const accessControl = this.getDocumentAccessControl(document_id);
 if (accessControl) {
 // Check if document is public to project members
 if (!accessControl.is_public) {
 // Check specific user permissions
 const userPerm = accessControl.user_permissions.find(p => p.user_id === user_id);
 if (userPerm && !userPerm.permissions.includes(action)) {
 return {
 allowed: false,
 reason: 'Document access restricted',
 suggestion: 'Request access from document owner'
 };
 }
 }
 }

 // Check custom permissions
 if (user.custom_permissions) {
 const customPerm = user.custom_permissions.find(cp => cp.project_id === project_id);
 if (customPerm) {
 if (customPerm.folder_ids && !customPerm.folder_ids.includes(folder_id)) {
 return {
 allowed: false,
 reason: 'Custom permissions restrict folder access',
 suggestion: 'Contact Project Manager'
 };
 }
 if (!customPerm.permissions.includes(action)) {
 return {
 allowed: false,
 reason: 'Custom permissions restrict this action',
 suggestion: 'Contact Project Manager'
 };
 }
 }
 }

 return { allowed: true };
 }

 /**
 * Can user view document?
 */
 canView(user_id: string, document_id: string, project_id: string, folder_id: string): PermissionCheckResult {
 return this.canPerformAction(user_id, document_id, project_id, folder_id, 'view');
 }

 /**
 * Can user download document?
 */
 canDownload(user_id: string, document_id: string, project_id: string, folder_id: string): PermissionCheckResult {
 return this.canPerformAction(user_id, document_id, project_id, folder_id, 'download');
 }

 /**
 * Can user upload to folder?
 */
 canUpload(user_id: string, project_id: string, folder_id: string): PermissionCheckResult {
 return this.canPerformAction(user_id, '', project_id, folder_id, 'upload');
 }

 /**
 * Can user delete document?
 */
 canDelete(user_id: string, document_id: string, project_id: string, folder_id: string): PermissionCheckResult {
 // Only system admin and document owner can delete
 const user = this.getUser(user_id);
 if (!user) {
 return { allowed: false, reason: 'User not found' };
 }

 if (user.role === 'system_admin') {
 return { allowed: true };
 }

 const accessControl = this.getDocumentAccessControl(document_id);
 if (accessControl && accessControl.owner_id === user_id) {
 return { allowed: true };
 }

 return {
 allowed: false,
 reason: 'Only document owner or system admin can delete documents',
 suggestion: 'Contact document owner or system administrator'
 };
 }

 /**
 * Can user manage sync?
 */
 canManageSync(user_id: string, project_id: string): PermissionCheckResult {
 const user = this.getUser(user_id);
 if (!user) {
 return { allowed: false, reason: 'User not found' };
 }

 if (user.role === 'system_admin' || user.role === 'project_manager') {
 return { allowed: true };
 }

 return {
 allowed: false,
 reason: 'Only Project Managers and Admins can manage sync',
 suggestion: 'Contact Project Manager'
 };
 }

 // ============================================================================
 // DOCUMENT ACCESS CONTROL
 // ============================================================================

 /**
 * Set document access control
 */
 setDocumentAccessControl(
 document_id: string,
 project_id: string,
 folder_id: string,
 owner_id: string,
 is_public: boolean = true
 ): DocumentAccessControl {
 const accessControl: DocumentAccessControl = {
 document_id,
 project_id,
 folder_id,
 owner_id,
 is_public,
 user_permissions: [],
 role_permissions: [],
 created_at: new Date().toISOString()
 };

 this.saveAccessControl(accessControl);
 return accessControl;
 }

 /**
 * Grant user access to document
 */
 grantUserAccess(
 document_id: string,
 user_id: string,
 permissions: DocumentPermission[],
 granted_by: string
 ): void {
 const accessControl = this.getDocumentAccessControl(document_id);
 if (!accessControl) {
 throw new Error('Access control not found');
 }

 // Remove existing user permission if any
 accessControl.user_permissions = accessControl.user_permissions.filter(p => p.user_id !== user_id);

 // Add new permission
 accessControl.user_permissions.push({
 user_id,
 permissions,
 granted_by,
 granted_at: new Date().toISOString()
 });

 accessControl.updated_at = new Date().toISOString();
 this.saveAccessControl(accessControl);

 this.logPermissionChange('access_granted', user_id, granted_by, `Granted ${permissions.join(', ')} on document ${document_id}`);
 }

 /**
 * Revoke user access to document
 */
 revokeUserAccess(document_id: string, user_id: string, revoked_by: string): void {
 const accessControl = this.getDocumentAccessControl(document_id);
 if (!accessControl) {
 throw new Error('Access control not found');
 }

 accessControl.user_permissions = accessControl.user_permissions.filter(p => p.user_id !== user_id);
 accessControl.updated_at = new Date().toISOString();
 this.saveAccessControl(accessControl);

 this.logPermissionChange('access_revoked', user_id, revoked_by, `Revoked access to document ${document_id}`);
 }

 // ============================================================================
 // QUERY METHODS
 // ============================================================================

 /**
 * Get user by ID
 */
 getUser(user_id: string): UserWithPermissions | null {
 try {
 const stored = localStorage.getItem(this.USERS_KEY);
 const users: UserWithPermissions[] = stored ? JSON.parse(stored) : [];
 return users.find(u => u.user_id === user_id) || null;
 } catch (error) {
 console.error('Failed to get user:', error);
 return null;
 }
 }

 /**
 * Get all users
 */
 getAllUsers(): UserWithPermissions[] {
 try {
 const stored = localStorage.getItem(this.USERS_KEY);
 return stored ? JSON.parse(stored) : [];
 } catch (error) {
 console.error('Failed to get users:', error);
 return [];
 }
 }

 /**
 * Get users by role
 */
 getUsersByRole(role: UserRole): UserWithPermissions[] {
 return this.getAllUsers().filter(u => u.role === role);
 }

 /**
 * Get users assigned to project
 */
 getUsersByProject(project_id: string): UserWithPermissions[] {
 return this.getAllUsers().filter(u => u.assigned_projects.includes(project_id));
 }

 /**
 * Get document access control
 */
 getDocumentAccessControl(document_id: string): DocumentAccessControl | null {
 try {
 const stored = localStorage.getItem(this.ACCESS_CONTROL_KEY);
 const controls: DocumentAccessControl[] = stored ? JSON.parse(stored) : [];
 return controls.find(c => c.document_id === document_id) || null;
 } catch (error) {
 console.error('Failed to get access control:', error);
 return null;
 }
 }

 /**
 * Get permission audit logs
 */
 getAuditLogs(user_id?: string, limit: number = 100): any[] {
 try {
 const stored = localStorage.getItem(this.AUDIT_KEY);
 let logs = stored ? JSON.parse(stored) : [];
 
 if (user_id) {
 logs = logs.filter((l: any) => l.user_id === user_id);
 }
 
 return logs
 .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
 .slice(0, limit);
 } catch (error) {
 console.error('Failed to get audit logs:', error);
 return [];
 }
 }

 // ============================================================================
 // HELPER METHODS
 // ============================================================================

 private saveUser(user: UserWithPermissions): void {
 try {
 const stored = localStorage.getItem(this.USERS_KEY);
 const users: UserWithPermissions[] = stored ? JSON.parse(stored) : [];
 const index = users.findIndex(u => u.user_id === user.user_id);
 
 if (index !== -1) {
 users[index] = user;
 } else {
 users.push(user);
 }
 
 localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
 } catch (error) {
 console.error('Failed to save user:', error);
 }
 }

 private saveAccessControl(accessControl: DocumentAccessControl): void {
 try {
 const stored = localStorage.getItem(this.ACCESS_CONTROL_KEY);
 const controls: DocumentAccessControl[] = stored ? JSON.parse(stored) : [];
 const index = controls.findIndex(c => c.document_id === accessControl.document_id);
 
 if (index !== -1) {
 controls[index] = accessControl;
 } else {
 controls.push(accessControl);
 }
 
 localStorage.setItem(this.ACCESS_CONTROL_KEY, JSON.stringify(controls));
 } catch (error) {
 console.error('Failed to save access control:', error);
 }
 }

 private logPermissionChange(action: string, user_id: string, changed_by: string, description: string): void {
 try {
 const log = {
 log_id: `perm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 action,
 user_id,
 changed_by,
 description,
 timestamp: new Date().toISOString()
 };

 const stored = localStorage.getItem(this.AUDIT_KEY);
 const logs = stored ? JSON.parse(stored) : [];
 logs.push(log);

 // Keep only last 1000 logs
 if (logs.length > 1000) {
 logs.shift();
 }

 localStorage.setItem(this.AUDIT_KEY, JSON.stringify(logs));
 } catch (error) {
 console.error('Failed to log permission change:', error);
 }
 }

 /**
 * Get role permissions
 */
 getRolePermissions(role: UserRole): DocumentPermission[] {
 return ROLE_PERMISSIONS[role] || [];
 }

 /**
 * Get folder access roles
 */
 getFolderAccessRoles(folder_id: string): UserRole[] {
 return FOLDER_ROLE_ACCESS[folder_id] || [];
 }

 /**
 * Clear all data (for testing)
 */
 clearAll(): void {
 localStorage.removeItem(this.USERS_KEY);
 localStorage.removeItem(this.ACCESS_CONTROL_KEY);
 localStorage.removeItem(this.AUDIT_KEY);
 }
}

// Export singleton instance
export const PermissionsService = new PermissionsServiceClass();
