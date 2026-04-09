/**
 * ============================================================================
 * FINANCE PERMISSIONS HOOK (RBAC)
 * ============================================================================
 * 
 * ROLES & PERMISSIONS:
 * 
 * System Admin - Full access to everything
 * Finance Admin - Full finance module access, can approve all
 * Finance Officer - Can create/edit budgets & expenditures, cannot approve
 * Project Manager - Read-only finance (view budgets/expenditures for their projects)
 * Viewer - Read-only access
 * 
 * PERMISSION RULES:
 * - Only Finance Admin/Officer can create budgets/expenditures
 * - Only Finance Admin can approve budgets/expenditures
 * - Only Finance Admin can manage Chart of Accounts
 * - All actions must respect organization scope
 * - Project Managers see only their project finances
 * ============================================================================
 */

import { useAuth } from '@/_core/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';

export type FinancePermission =
 | 'finance:view' // View financial data
 | 'finance:chart_of_accounts:manage' // Create/Edit/Deactivate accounts
 | 'finance:budget:create' // Create budgets
 | 'finance:budget:edit' // Edit draft budgets
 | 'finance:budget:submit' // Submit budgets for approval
 | 'finance:budget:approve' // Approve budgets
 | 'finance:budget:reject' // Reject budgets
 | 'finance:expenditure:create' // Create expenditures
 | 'finance:expenditure:edit' // Edit draft expenditures
 | 'finance:expenditure:submit' // Submit expenditures for approval
 | 'finance:expenditure:approve' // Approve expenditures
 | 'finance:expenditure:reject' // Reject expenditures
 | 'finance:expenditure:mark_paid' // Mark expenditure as paid
 | 'finance:exchange_rate:manage' // Manage exchange rates
 | 'finance:reports:view' // View financial reports
 | 'finance:reports:export'; // Export financial reports

interface FinancePermissions {
 // Permission checks
 can: (permission: FinancePermission) => boolean;
 canAny: (permissions: FinancePermission[]) => boolean;
 canAll: (permissions: FinancePermission[]) => boolean;
 
 // Quick role checks
 isSystemAdmin: boolean;
 isFinanceAdmin: boolean;
 isFinanceOfficer: boolean;
 isProjectManager: boolean;
 isViewer: boolean;
 
 // Contextual permissions
 canViewProject: (projectId: string) => boolean;
 canEditBudget: (budgetStatus: string, budgetCreatedBy: string) => boolean;
 canEditExpenditure: (expenditureStatus: string, expenditureCreatedBy: string) => boolean;
 
 // Finance-specific role
 isFinanceRole: boolean;
 
 // Organization scope
 hasOrganizationAccess: boolean;
}

export function useFinancePermissions(): FinancePermissions {
 const { user } = useAuth();
 const { currentOrganization, userOrganizations } = useOrganization();

 // Role checks
 const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
 const isFinanceAdmin = user?.role === 'FINANCE_ADMIN' || isSystemAdmin;
 const isFinanceOfficer = user?.role === 'FINANCE_OFFICER' || isFinanceAdmin;
 const isProjectManager = user?.role === 'PROJECT_MANAGER';
 const isViewer = user?.role === 'VIEWER';
 
 const isFinanceRole = isFinanceAdmin || isFinanceOfficer;

 // Organization access
 const hasOrganizationAccess = !currentOrganization || 
 userOrganizations?.some(org => org.id === currentOrganization.id) ||
 isSystemAdmin;

 // Permission mapping
 const permissionMap: Record<FinancePermission, boolean> = {
 // View permissions
 'finance:view': isSystemAdmin || isFinanceRole || isProjectManager || isViewer,
 
 // Chart of Accounts permissions (Finance Admin only)
 'finance:chart_of_accounts:manage': isFinanceAdmin,
 
 // Budget permissions
 'finance:budget:create': isFinanceRole,
 'finance:budget:edit': isFinanceRole,
 'finance:budget:submit': isFinanceRole,
 'finance:budget:approve': isFinanceAdmin, // Only Finance Admin can approve
 'finance:budget:reject': isFinanceAdmin,
 
 // Expenditure permissions
 'finance:expenditure:create': isFinanceRole,
 'finance:expenditure:edit': isFinanceRole,
 'finance:expenditure:submit': isFinanceRole,
 'finance:expenditure:approve': isFinanceAdmin, // Only Finance Admin can approve
 'finance:expenditure:reject': isFinanceAdmin,
 'finance:expenditure:mark_paid': isFinanceAdmin,
 
 // Exchange rate permissions (Finance Admin only)
 'finance:exchange_rate:manage': isFinanceAdmin,
 
 // Reporting permissions
 'finance:reports:view': isSystemAdmin || isFinanceRole || isProjectManager || isViewer,
 'finance:reports:export': isSystemAdmin || isFinanceRole
 };

 // Check single permission
 const can = (permission: FinancePermission): boolean => {
 if (!user) return false;
 if (!hasOrganizationAccess) return false;
 return permissionMap[permission] || false;
 };

 // Check any permission (OR logic)
 const canAny = (permissions: FinancePermission[]): boolean => {
 return permissions.some(permission => can(permission));
 };

 // Check all permissions (AND logic)
 const canAll = (permissions: FinancePermission[]): boolean => {
 return permissions.every(permission => can(permission));
 };

 // Contextual: Can view project finances
 const canViewProject = (projectId: string): boolean => {
 if (!user) return false;
 if (isSystemAdmin || isFinanceRole) return true;
 
 // Project Managers can only view their projects
 if (isProjectManager) {
 // TODO: Check if user is assigned to this project
 // For now, allow all project managers to view all projects
 return true;
 }
 
 return false;
 };

 // Contextual: Can edit budget
 const canEditBudget = (budgetStatus: string, budgetCreatedBy: string): boolean => {
 if (!can('finance:budget:edit')) return false;
 
 // Cannot edit approved budgets
 if (budgetStatus === 'APPROVED') return false;
 
 // Finance Admin can edit any budget
 if (isFinanceAdmin) return true;
 
 // Finance Officer can edit their own budgets (if draft)
 if (isFinanceOfficer && budgetCreatedBy === user?.id && budgetStatus === 'DRAFT') {
 return true;
 }
 
 return false;
 };

 // Contextual: Can edit expenditure
 const canEditExpenditure = (expenditureStatus: string, expenditureCreatedBy: string): boolean => {
 if (!can('finance:expenditure:edit')) return false;
 
 // Cannot edit approved or paid expenditures
 if (expenditureStatus === 'APPROVED' || expenditureStatus === 'PAID') return false;
 
 // Finance Admin can edit any expenditure
 if (isFinanceAdmin) return true;
 
 // Finance Officer can edit their own expenditures (if draft)
 if (isFinanceOfficer && expenditureCreatedBy === user?.id && expenditureStatus === 'DRAFT') {
 return true;
 }
 
 return false;
 };

 return {
 can,
 canAny,
 canAll,
 isSystemAdmin,
 isFinanceAdmin,
 isFinanceOfficer,
 isProjectManager,
 isViewer,
 canViewProject,
 canEditBudget,
 canEditExpenditure,
 isFinanceRole,
 hasOrganizationAccess
 };
}

/**
 * Permission Guard Component
 * Usage: <FinancePermissionGuard permission="finance:budget:approve">...</FinancePermissionGuard>
 */
export function FinancePermissionGuard({ 
 permission, 
 fallback = null,
 children 
}: { 
 permission: FinancePermission | FinancePermission[]; 
 fallback?: React.ReactNode;
 children: React.ReactNode;
}) {
 const permissions = useFinancePermissions();
 
 const hasPermission = Array.isArray(permission)
 ? permissions.canAny(permission)
 : permissions.can(permission);
 
 if (!hasPermission) {
 return <>{fallback}</>;
 }
 
 return <>{children}</>;
}