/**
 * Central RBAC Permission Hook (Enhanced Multi-Level Model)
 * 
 * Single source of truth for frontend permission enforcement.
 * Supports 3-level hierarchy: Module → Screen/Workspace → Tab
 * Extended actions: view, create, edit, delete, export, approve, submit
 * 
 * CRITICAL: Sensitive workspaces require EXPLICIT screen-level permission.
 * Module access alone does NOT grant access to sensitive screens.
 * 
 * Usage:
 * const { canView, canModule, canScreen, canTab, isAdmin, loading } = usePermissions();
 * if (!canView('grants')) return <AccessDenied />;
 * if (!canScreen('cases', 'cases_list', 'view')) return <AccessDenied />;
 */

import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve' | 'submit';
export type PermissionModule = string;

export interface ActionPermissions {
 view: boolean;
 create: boolean;
 edit: boolean;
 delete: boolean;
 export?: boolean;
 approve?: boolean;
 submit?: boolean;
}

export interface EffectivePermissions {
 isAdmin: boolean;
 modules: Record<string, ActionPermissions>;
 screens: Record<string, Record<string, ActionPermissions>>;
 tabs: Record<string, any>;
 sensitiveWorkspaces?: Array<{ moduleId: string; screenId: string }>;
}

export function usePermissions() {
 const { user, loading: authLoading } = useAuth();
 const permQuery = trpc.settings.users.myPermissions.useQuery(undefined, {
 enabled: !!user,
 staleTime: 5 * 60 * 1000, // Cache for 5 minutes
 retry: 1,
 });

 const permissions: EffectivePermissions | null = permQuery.data ?? null;
 const loading = authLoading || permQuery.isLoading;

 // Platform admin and organization admin always have full access
 const isPlatformAdmin = user?.role === 'platform_admin' || user?.platformRole === 'platform_admin' || user?.platformRole === 'organization_admin';

 const isAdmin = isPlatformAdmin || (permissions?.isAdmin ?? false);

 /**
 * Check if a screen is a sensitive workspace
 */
 function isSensitiveScreen(moduleId: string, screenId: string): boolean {
 if (!permissions?.sensitiveWorkspaces) return false;
 return permissions.sensitiveWorkspaces.some(
 w => w.moduleId === moduleId && w.screenId === screenId
 );
 }

 /**
 * Check if user can perform action on a module
 */
 function canModule(moduleId: string, action: PermissionAction): boolean {
 if (isAdmin) return true;
 if (!permissions?.modules) return false;
 const mod = permissions.modules[moduleId];
 if (!mod) return false;
 return mod[action] ?? false;
 }

 /**
 * Check if user can perform action on a screen within a module.
 * 
 * CRITICAL: For sensitive screens, explicit screen-level permission is REQUIRED.
 * Module access alone does NOT grant access to sensitive screens.
 */
 function canScreen(moduleId: string, screenId: string, action: PermissionAction): boolean {
 if (isAdmin) return true;
 // First check module-level access
 if (!canModule(moduleId, 'view')) return false;

 const sensitive = isSensitiveScreen(moduleId, screenId);

 if (sensitive) {
 // SENSITIVE WORKSPACE: Requires EXPLICIT screen-level permission
 const screenPerms = permissions?.screens?.[moduleId]?.[screenId];
 if (!screenPerms || !screenPerms.view) return false;
 return screenPerms[action] ?? false;
 }

 // Non-sensitive: Check screen-level if defined, otherwise inherit from module
 const screenPerms = permissions?.screens?.[moduleId]?.[screenId];
 if (screenPerms) {
 return screenPerms[action] ?? false;
 }
 return canModule(moduleId, action);
 }

 /**
 * Check if user can perform action on a tab within a screen
 */
 function canTab(moduleId: string, screenId: string, tabId: string, action: PermissionAction): boolean {
 if (isAdmin) return true;
 // First check screen-level access
 if (!canScreen(moduleId, screenId, 'view')) return false;
 // Then check tab-level if defined
 if (!permissions?.tabs?.[moduleId]?.[screenId]?.[tabId]) {
 // If no tab-level permissions defined, inherit from screen
 return canScreen(moduleId, screenId, action);
 }
 return permissions.tabs[moduleId][screenId][tabId][action] ?? false;
 }

 // Convenience helpers
 const canView = (moduleId: string) => canModule(moduleId, 'view');
 const canCreate = (moduleId: string) => canModule(moduleId, 'create');
 const canEdit = (moduleId: string) => canModule(moduleId, 'edit');
 const canDelete = (moduleId: string) => canModule(moduleId, 'delete');
 const canExport = (moduleId: string) => canModule(moduleId, 'export');
 const canApprove = (moduleId: string) => canModule(moduleId, 'approve');
 const canSubmit = (moduleId: string) => canModule(moduleId, 'submit');

 return {
 permissions,
 loading,
 isAdmin,
 isPlatformAdmin,
 canModule,
 canScreen,
 canTab,
 canView,
 canCreate,
 canEdit,
 canDelete,
 canExport,
 canApprove,
 canSubmit,
 isSensitiveScreen,
 };
}

/**
 * Module IDs that match the RBAC system
 * These must match the MODULE_DEFINITIONS in server/rbacService.ts
 */
export const MODULE_IDS = {
 GRANTS: 'grants',
 PROJECTS: 'projects',
 FINANCE: 'finance',
 HR: 'hr',
 MEAL: 'meal',
 SURVEYS: 'surveys',
 CASE_MANAGEMENT: 'cases',
 DOCUMENTS: 'documents',
 LOGISTICS: 'logistics',
 DONOR_MANAGEMENT: 'donors',
 SETTINGS: 'settings',
} as const;

/**
 * Hook to get module-level permissions for a specific module
 */
export function useModulePermissions(moduleId: string) {
 const { canModule, loading, isAdmin } = usePermissions();
 return {
 loading,
 isAdmin,
 canView: canModule(moduleId, 'view'),
 canCreate: canModule(moduleId, 'create'),
 canEdit: canModule(moduleId, 'edit'),
 canDelete: canModule(moduleId, 'delete'),
 canExport: canModule(moduleId, 'export'),
 canApprove: canModule(moduleId, 'approve'),
 canSubmit: canModule(moduleId, 'submit'),
 };
}

/**
 * Hook to get the display name for the current user's role
 */
export function useRoleDisplayName(): string {
 const { permissions } = usePermissions();
 if (!permissions) return 'No Role';
 if (permissions.isAdmin) return 'Administrator';
 return 'User';
}
