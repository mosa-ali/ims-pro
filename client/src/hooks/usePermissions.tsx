// ============================================================================
// PERMISSION HOOKS
// Role-based access control (RBAC) utilities
// ============================================================================

import { useMemo } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { OrganizationRole } from '@/types/schema.types';
import { getRolePermissions, canUserPerformAction } from '@/services/mockData';

export type PermissionModule = 
 | 'PROJECTS'
 | 'GRANTS'
 | 'FINANCE'
 | 'MEAL'
 | 'SURVEYS'
 | 'CASES'
 | 'DOCUMENTS'
 | 'SETTINGS';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

interface ModulePermissions {
 canView: boolean;
 canCreate: boolean;
 canEdit: boolean;
 canDelete: boolean;
}

/**
 * Hook to check if user has specific permission
 */
export function usePermission(module: PermissionModule, action: PermissionAction): boolean {
 const { user } = useAuth();
 const { currentOrganization, currentRole } = useOrganization();

 return useMemo(() => {
 if (!user || !currentOrganization || !currentRole) return false;

 return canUserPerformAction(
 user.id,
 currentOrganization.id,
 module,
 action
 );
 }, [user, currentOrganization, currentRole, module, action]);
}

/**
 * Hook to get all permissions for a module
 */
export function useModulePermissions(module: PermissionModule): ModulePermissions {
 const { user } = useAuth();
 const { currentOrganization, currentRole } = useOrganization();

 return useMemo(() => {
 if (!user || !currentOrganization || !currentRole) {
 return {
 canView: false,
 canCreate: false,
 canEdit: false,
 canDelete: false
 };
 }

 const permissions = getRolePermissions(currentOrganization.id, currentRole);
 const modulePermission = permissions.find(p => p.module === module);

 if (!modulePermission) {
 return {
 canView: false,
 canCreate: false,
 canEdit: false,
 canDelete: false
 };
 }

 return {
 canView: modulePermission.canView,
 canCreate: modulePermission.canCreate,
 canEdit: modulePermission.canEdit,
 canDelete: modulePermission.canDelete
 };
 }, [user, currentOrganization, currentRole, module]);
}

/**
 * Hook to check if user is organization admin
 */
export function useIsOrgAdmin(): boolean {
 const { currentRole } = useOrganization();
 return currentRole === OrganizationRole.ORG_ADMIN;
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useHasRole(roles: OrganizationRole[]): boolean {
 const { currentRole } = useOrganization();
 return currentRole ? roles.includes(currentRole) : false;
}

/**
 * Hook to get current user's role display name
 */
export function useRoleDisplayName(): string {
 const { currentRole } = useOrganization();
 
 if (!currentRole) return 'No Role';

 const roleNames: Record<OrganizationRole, string> = {
 [OrganizationRole.ORG_ADMIN]: 'Organization Admin',
 [OrganizationRole.PROGRAM_MANAGER]: 'Program Manager',
 [OrganizationRole.FINANCE_MANAGER]: 'Finance Manager',
 [OrganizationRole.MEAL_OFFICER]: 'M&E Officer',
 [OrganizationRole.CASE_WORKER]: 'Case Worker',
 [OrganizationRole.VIEWER]: 'Viewer'
 };

 return roleNames[currentRole] || currentRole;
}

/**
 * Higher-order component to protect routes/components with permissions
 */
export function withPermission<P extends object>(
 Component: React.ComponentType<P>,
 module: PermissionModule,
 action: PermissionAction
) {
 return function PermissionWrapper(props: P) {
 const hasPermission = usePermission(module, action);

 if (!hasPermission) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-center">
 <h2 className="text-xl font-semibold text-gray-900 mb-2">
 Access Denied
 </h2>
 <p className="text-gray-600">
 You don't have permission to {action} {module.toLowerCase()}.
 </p>
 </div>
 </div>
 );
 }

 return <Component {...props} />;
 };
}

/**
 * Utility function to check multiple permissions at once
 */
export function usePermissions(checks: Array<{ module: PermissionModule; action: PermissionAction }>): boolean[] {
 const { user } = useAuth();
 const { currentOrganization } = useOrganization();

 return useMemo(() => {
 if (!user || !currentOrganization) {
 return checks.map(() => false);
 }

 return checks.map(check =>
 canUserPerformAction(
 user.id,
 currentOrganization.id,
 check.module,
 check.action
 )
 );
 }, [user, currentOrganization, checks]);
}
