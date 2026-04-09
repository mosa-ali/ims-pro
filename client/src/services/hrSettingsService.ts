/**
 * ============================================================================
 * HR SETTINGS SERVICE
 * ============================================================================
 * 
 * Control center for all HR system configuration
 * Admin/HR Manager only
 * Changes propagate to all modules
 * 
 * ============================================================================
 */

export interface OrganizationSettings {
 orgId: string;
 orgName: string;
 logoPath?: string;
 address: string;
 hrContactEmail: string;
 hrContactPhone: string;
 website?: string;
}

export interface Department {
 departmentId: string;
 departmentName: string;
 active: boolean;
 createdDate: string;
}

export interface Position {
 positionId: string;
 positionName: string;
 departmentId?: string;
 active: boolean;
 createdDate: string;
}

export interface ContractType {
 contractTypeId: string;
 name: string;
 active: boolean;
}

export interface LeaveType {
 leaveTypeId: string;
 name: string;
 deductibleFromAnnual: boolean;
 active: boolean;
}

export interface ExitReason {
 reasonId: string;
 reasonName: string;
 active: boolean;
}

export interface RecruitmentSettings {
 settingsId: string;
 defaultShortlistThreshold: number;
 defaultCriteriaTemplate: any;
 defaultWeights: any;
}

export interface DocumentTemplate {
 templateId: string;
 templateName: string;
 documentType: 'Offer Letter' | 'Reference' | 'Disciplinary' | 'Appraisal' | 'Contract' | 'Clearance';
 content?: string;
 active: boolean;
 createdDate: string;
}

export interface Role {
 roleId: string;
 roleName: string;
}

export interface RolePermission {
 permissionId: string;
 roleId: string;
 moduleName: string;
 accessLevel: 'View' | 'Edit' | 'Approve' | 'Admin';
}

const STORAGE_KEYS = {
 ORG_SETTINGS: 'hr_org_settings',
 DEPARTMENTS: 'hr_departments',
 POSITIONS: 'hr_positions',
 CONTRACT_TYPES: 'hr_contract_types',
 LEAVE_TYPES: 'hr_leave_types',
 EXIT_REASONS: 'hr_exit_reasons',
 RECRUITMENT_SETTINGS: 'hr_recruitment_settings',
 DOCUMENT_TEMPLATES: 'hr_document_templates',
 ROLES: 'hr_roles',
 ROLE_PERMISSIONS: 'hr_role_permissions'
};

class HRSettingsService {
 
 // ============================================================================
 // ORGANIZATION SETTINGS
 // ============================================================================
 
 getOrganizationSettings(): OrganizationSettings {
 const data = localStorage.getItem(STORAGE_KEYS.ORG_SETTINGS);
 if (!data) {
 return this.createDefaultOrgSettings();
 }
 return JSON.parse(data);
 }

 updateOrganizationSettings(settings: Partial<OrganizationSettings>): OrganizationSettings {
 const current = this.getOrganizationSettings();
 const updated = { ...current, ...settings };
 localStorage.setItem(STORAGE_KEYS.ORG_SETTINGS, JSON.stringify(updated));
 return updated;
 }

 private createDefaultOrgSettings(): OrganizationSettings {
 const defaults: OrganizationSettings = {
 orgId: 'ORG-001',
 orgName: 'Humanitarian Organization',
 address: '123 Main Street, City, Country',
 hrContactEmail: 'hr@organization.org',
 hrContactPhone: '+1 234 567 8900',
 website: 'www.organization.org'
 };
 localStorage.setItem(STORAGE_KEYS.ORG_SETTINGS, JSON.stringify(defaults));
 return defaults;
 }

 // ============================================================================
 // DEPARTMENTS
 // ============================================================================
 
 getAllDepartments(): Department[] {
 const data = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
 if (!data) {
 return this.createDefaultDepartments();
 }
 return JSON.parse(data);
 }

 getActiveDepartments(): Department[] {
 return this.getAllDepartments().filter(d => d.active);
 }

 addDepartment(name: string): Department {
 const departments = this.getAllDepartments();
 const newDept: Department = {
 departmentId: `DEPT-${Date.now()}`,
 departmentName: name,
 active: true,
 createdDate: new Date().toISOString()
 };
 departments.push(newDept);
 localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(departments));
 return newDept;
 }

 updateDepartment(departmentId: string, data: Partial<Department>): boolean {
 const departments = this.getAllDepartments();
 const index = departments.findIndex(d => d.departmentId === departmentId);
 if (index === -1) return false;
 
 departments[index] = { ...departments[index], ...data };
 localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(departments));
 return true;
 }

 deleteDepartment(departmentId: string): boolean {
 const departments = this.getAllDepartments();
 const filtered = departments.filter(d => d.departmentId !== departmentId);
 localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(filtered));
 return true;
 }

 private createDefaultDepartments(): Department[] {
 const defaults: Department[] = [
 { departmentId: 'DEPT-1', departmentName: 'Programs', active: true, createdDate: new Date().toISOString() },
 { departmentId: 'DEPT-2', departmentName: 'Finance', active: true, createdDate: new Date().toISOString() },
 { departmentId: 'DEPT-3', departmentName: 'Human Resources', active: true, createdDate: new Date().toISOString() },
 { departmentId: 'DEPT-4', departmentName: 'Logistics', active: true, createdDate: new Date().toISOString() },
 { departmentId: 'DEPT-5', departmentName: 'M&E', active: true, createdDate: new Date().toISOString() }
 ];
 localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(defaults));
 return defaults;
 }

 // ============================================================================
 // POSITIONS
 // ============================================================================
 
 getAllPositions(): Position[] {
 const data = localStorage.getItem(STORAGE_KEYS.POSITIONS);
 if (!data) {
 return this.createDefaultPositions();
 }
 return JSON.parse(data);
 }

 getActivePositions(): Position[] {
 return this.getAllPositions().filter(p => p.active);
 }

 addPosition(name: string, departmentId?: string): Position {
 const positions = this.getAllPositions();
 const newPos: Position = {
 positionId: `POS-${Date.now()}`,
 positionName: name,
 departmentId,
 active: true,
 createdDate: new Date().toISOString()
 };
 positions.push(newPos);
 localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions));
 return newPos;
 }

 updatePosition(positionId: string, data: Partial<Position>): boolean {
 const positions = this.getAllPositions();
 const index = positions.findIndex(p => p.positionId === positionId);
 if (index === -1) return false;
 
 positions[index] = { ...positions[index], ...data };
 localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions));
 return true;
 }

 deletePosition(positionId: string): boolean {
 const positions = this.getAllPositions();
 const filtered = positions.filter(p => p.positionId !== positionId);
 localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(filtered));
 return true;
 }

 private createDefaultPositions(): Position[] {
 const defaults: Position[] = [
 { positionId: 'POS-1', positionName: 'Project Manager', active: true, createdDate: new Date().toISOString() },
 { positionId: 'POS-2', positionName: 'Finance Officer', active: true, createdDate: new Date().toISOString() },
 { positionId: 'POS-3', positionName: 'HR Officer', active: true, createdDate: new Date().toISOString() },
 { positionId: 'POS-4', positionName: 'Logistics Officer', active: true, createdDate: new Date().toISOString() },
 { positionId: 'POS-5', positionName: 'M&E Officer', active: true, createdDate: new Date().toISOString() }
 ];
 localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(defaults));
 return defaults;
 }

 // ============================================================================
 // CONTRACT TYPES
 // ============================================================================
 
 getAllContractTypes(): ContractType[] {
 const data = localStorage.getItem(STORAGE_KEYS.CONTRACT_TYPES);
 if (!data) {
 return this.createDefaultContractTypes();
 }
 return JSON.parse(data);
 }

 getActiveContractTypes(): ContractType[] {
 return this.getAllContractTypes().filter(ct => ct.active);
 }

 addContractType(name: string): ContractType {
 const types = this.getAllContractTypes();
 const newType: ContractType = {
 contractTypeId: `CT-${Date.now()}`,
 name,
 active: true
 };
 types.push(newType);
 localStorage.setItem(STORAGE_KEYS.CONTRACT_TYPES, JSON.stringify(types));
 return newType;
 }

 private createDefaultContractTypes(): ContractType[] {
 const defaults: ContractType[] = [
 { contractTypeId: 'CT-1', name: 'Permanent', active: true },
 { contractTypeId: 'CT-2', name: 'Fixed-Term', active: true },
 { contractTypeId: 'CT-3', name: 'Consultant', active: true },
 { contractTypeId: 'CT-4', name: 'Intern', active: true }
 ];
 localStorage.setItem(STORAGE_KEYS.CONTRACT_TYPES, JSON.stringify(defaults));
 return defaults;
 }

 // ============================================================================
 // LEAVE TYPES
 // ============================================================================
 
 getAllLeaveTypes(): LeaveType[] {
 const data = localStorage.getItem(STORAGE_KEYS.LEAVE_TYPES);
 if (!data) {
 return this.createDefaultLeaveTypes();
 }
 return JSON.parse(data);
 }

 getActiveLeaveTypes(): LeaveType[] {
 return this.getAllLeaveTypes().filter(lt => lt.active);
 }

 addLeaveType(name: string, deductibleFromAnnual: boolean): LeaveType {
 const types = this.getAllLeaveTypes();
 const newType: LeaveType = {
 leaveTypeId: `LT-${Date.now()}`,
 name,
 deductibleFromAnnual,
 active: true
 };
 types.push(newType);
 localStorage.setItem(STORAGE_KEYS.LEAVE_TYPES, JSON.stringify(types));
 return newType;
 }

 private createDefaultLeaveTypes(): LeaveType[] {
 const defaults: LeaveType[] = [
 { leaveTypeId: 'LT-1', name: 'Annual Leave', deductibleFromAnnual: true, active: true },
 { leaveTypeId: 'LT-2', name: 'Sick Leave', deductibleFromAnnual: false, active: true },
 { leaveTypeId: 'LT-3', name: 'Emergency Leave', deductibleFromAnnual: false, active: true },
 { leaveTypeId: 'LT-4', name: 'Maternity Leave', deductibleFromAnnual: false, active: true },
 { leaveTypeId: 'LT-5', name: 'Paternity Leave', deductibleFromAnnual: false, active: true },
 { leaveTypeId: 'LT-6', name: 'Compassionate Leave', deductibleFromAnnual: false, active: true }
 ];
 localStorage.setItem(STORAGE_KEYS.LEAVE_TYPES, JSON.stringify(defaults));
 return defaults;
 }

 // ============================================================================
 // EXIT REASONS
 // ============================================================================
 
 getAllExitReasons(): ExitReason[] {
 const data = localStorage.getItem(STORAGE_KEYS.EXIT_REASONS);
 if (!data) {
 return this.createDefaultExitReasons();
 }
 return JSON.parse(data);
 }

 getActiveExitReasons(): ExitReason[] {
 return this.getAllExitReasons().filter(er => er.active);
 }

 addExitReason(name: string): ExitReason {
 const reasons = this.getAllExitReasons();
 const newReason: ExitReason = {
 reasonId: `ER-${Date.now()}`,
 reasonName: name,
 active: true
 };
 reasons.push(newReason);
 localStorage.setItem(STORAGE_KEYS.EXIT_REASONS, JSON.stringify(reasons));
 return newReason;
 }

 private createDefaultExitReasons(): ExitReason[] {
 const defaults: ExitReason[] = [
 { reasonId: 'ER-1', reasonName: 'Resignation', active: true },
 { reasonId: 'ER-2', reasonName: 'Contract End', active: true },
 { reasonId: 'ER-3', reasonName: 'Termination', active: true },
 { reasonId: 'ER-4', reasonName: 'Retirement', active: true },
 { reasonId: 'ER-5', reasonName: 'Death', active: true }
 ];
 localStorage.setItem(STORAGE_KEYS.EXIT_REASONS, JSON.stringify(defaults));
 return defaults;
 }

 // ============================================================================
 // DOCUMENT TEMPLATES
 // ============================================================================
 
 getAllTemplates(): DocumentTemplate[] {
 const data = localStorage.getItem(STORAGE_KEYS.DOCUMENT_TEMPLATES);
 if (!data) {
 return this.createDefaultTemplates();
 }
 return JSON.parse(data);
 }

 getActiveTemplates(): DocumentTemplate[] {
 return this.getAllTemplates().filter(t => t.active);
 }

 getTemplatesByType(documentType: string): DocumentTemplate[] {
 return this.getAllTemplates().filter(t => t.documentType === documentType && t.active);
 }

 private createDefaultTemplates(): DocumentTemplate[] {
 const defaults: DocumentTemplate[] = [
 {
 templateId: 'TPL-1',
 templateName: 'Standard Offer Letter',
 documentType: 'Offer Letter',
 active: true,
 createdDate: new Date().toISOString()
 },
 {
 templateId: 'TPL-2',
 templateName: 'Employment Reference',
 documentType: 'Reference',
 active: true,
 createdDate: new Date().toISOString()
 },
 {
 templateId: 'TPL-3',
 templateName: 'Performance Appraisal Form',
 documentType: 'Appraisal',
 active: true,
 createdDate: new Date().toISOString()
 }
 ];
 localStorage.setItem(STORAGE_KEYS.DOCUMENT_TEMPLATES, JSON.stringify(defaults));
 return defaults;
 }

 // ============================================================================
 // ROLES & PERMISSIONS
 // ============================================================================
 
 getAllRoles(): Role[] {
 const data = localStorage.getItem(STORAGE_KEYS.ROLES);
 if (!data) {
 return this.createDefaultRoles();
 }
 return JSON.parse(data);
 }

 private createDefaultRoles(): Role[] {
 const defaults: Role[] = [
 { roleId: 'ROLE-1', roleName: 'HR Manager' },
 { roleId: 'ROLE-2', roleName: 'Admin' },
 { roleId: 'ROLE-3', roleName: 'Finance' },
 { roleId: 'ROLE-4', roleName: 'Supervisor' },
 { roleId: 'ROLE-5', roleName: 'Viewer' }
 ];
 localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(defaults));
 return defaults;
 }

 getAllPermissions(): RolePermission[] {
 const data = localStorage.getItem(STORAGE_KEYS.ROLE_PERMISSIONS);
 if (!data) {
 return this.createDefaultPermissions();
 }
 return JSON.parse(data);
 }

 private createDefaultPermissions(): RolePermission[] {
 const defaults: RolePermission[] = [
 { permissionId: 'PERM-1', roleId: 'ROLE-1', moduleName: 'Staff Dictionary', accessLevel: 'Admin' },
 { permissionId: 'PERM-2', roleId: 'ROLE-1', moduleName: 'Payroll', accessLevel: 'Admin' },
 { permissionId: 'PERM-3', roleId: 'ROLE-2', moduleName: 'Staff Dictionary', accessLevel: 'Admin' },
 { permissionId: 'PERM-4', roleId: 'ROLE-3', moduleName: 'Payroll', accessLevel: 'Approve' },
 { permissionId: 'PERM-5', roleId: 'ROLE-4', moduleName: 'Leave Management', accessLevel: 'Approve' },
 { permissionId: 'PERM-6', roleId: 'ROLE-5', moduleName: 'Staff Dictionary', accessLevel: 'View' }
 ];
 localStorage.setItem(STORAGE_KEYS.ROLE_PERMISSIONS, JSON.stringify(defaults));
 return defaults;
 }

 // ============================================================================
 // INITIALIZATION
 // ============================================================================
 
 initializeAllSettings(): void {
 this.getOrganizationSettings();
 this.getAllDepartments();
 this.getAllPositions();
 this.getAllContractTypes();
 this.getAllLeaveTypes();
 this.getAllExitReasons();
 this.getAllTemplates();
 this.getAllRoles();
 this.getAllPermissions();
 }
}

export const hrSettingsService = new HRSettingsService();
