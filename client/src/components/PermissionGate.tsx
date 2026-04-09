/**
 * PermissionGate Component
 * 
 * Wraps UI elements that should only be visible to users with specific permissions.
 * Uses the central RBAC system from usePermissions hook.
 * 
 * Usage:
 * <PermissionGate module="finance" action="view">
 * <FinanceModule />
 * </PermissionGate>
 * 
 * <PermissionGate module="finance" screen="budget" action="edit">
 * <EditBudgetButton />
 * </PermissionGate>
 */

import { ReactNode } from 'react';
import { usePermissions, type PermissionAction } from '@/hooks/usePermissions';

interface PermissionGateProps {
 module: string;
 screen?: string;
 tab?: string;
 action?: PermissionAction;
 /** Show this instead when access is denied (default: null/hidden) */
 fallback?: ReactNode;
 /** If true, shows a loading spinner while permissions load */
 showLoading?: boolean;
 children: ReactNode;
}

export function PermissionGate({
 module,
 screen,
 tab,
 action = 'view',
 fallback = null,
 showLoading = false,
 children,
}: PermissionGateProps) {
 const { loading, canModule, canScreen, canTab } = usePermissions();

 if (loading) {
 if (showLoading) {
 return (
 <div className="flex items-center justify-center p-4">
 <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
 </div>
 );
 }
 return null;
 }

 let hasAccess = false;

 if (tab && screen) {
 hasAccess = canTab(module, screen, tab, action);
 } else if (screen) {
 hasAccess = canScreen(module, screen, action);
 } else {
 hasAccess = canModule(module, action);
 }

 if (!hasAccess) {
 return <>{fallback}</>;
 }

 return <>{children}</>;
}

/**
 * AccessDeniedPage component for route-level permission blocking
 */
export function AccessDeniedPage() {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-center p-8 bg-white rounded-2xl shadow border">
 <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
 <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
 </svg>
 </div>
 <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
 <p className="text-gray-500 mt-2">You don't have permission to access this page.</p>
 <p className="text-gray-400 text-sm mt-1">Contact your organization administrator for access.</p>
 </div>
 </div>
 );
}

export default PermissionGate;
