// ============================================================================
// PROTECTED COMPONENT
// Wrapper for components that require authentication and/or permissions
// ============================================================================

import React from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { usePermission, PermissionModule, PermissionAction } from '@/hooks/usePermissions';

interface ProtectedProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requirePermission?: {
    module: PermissionModule;
    action: PermissionAction;
  };
  fallback?: React.ReactNode;
}

export function Protected({ 
  children, 
  requireAuth = true,
  requirePermission,
  fallback 
}: ProtectedProps) {
  const { isAuthenticated, isLoading } = useAuth();
  
  const hasPermission = usePermission(
    requirePermission?.module || 'PROJECTS',
    requirePermission?.action || 'view'
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return fallback || (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">
            Please log in to access this content.
          </p>
        </div>
      </div>
    );
  }

  if (requirePermission && !hasPermission) {
    return fallback || (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You don't have permission to {requirePermission.action} {requirePermission.module.toLowerCase()}.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Contact your organization administrator if you need access.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Convenience component for commonly protected routes
interface ProtectedRouteProps {
  children: React.ReactNode;
  module: PermissionModule;
  action?: PermissionAction;
}

export function ProtectedRoute({ children, module, action = 'view' }: ProtectedRouteProps) {
  return (
    <Protected
      requireAuth={true}
      requirePermission={{ module, action }}
    >
      {children}
    </Protected>
  );
}

// Example usage components demonstrating different protection levels

// Simple auth check
export function AuthOnly({ children }: { children: React.ReactNode }) {
  return <Protected requireAuth={true}>{children}</Protected>;
}

// Admin-only content
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { currentRole } = useOrganization();
  
  if (currentRole !== OrganizationRole.ORG_ADMIN) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Admin Access Required
          </h2>
          <p className="text-gray-600">
            This feature is only available to organization administrators.
          </p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

import { useOrganization } from '@/contexts/OrganizationContext';
import { OrganizationRole } from '@/types/schema.types';
