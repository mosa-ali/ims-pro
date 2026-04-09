import { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '@/_core/hooks/useAuth';

interface RouteGuardProps {
  children: ReactNode;
  module: string;
  action: 'view' | 'create' | 'edit' | 'delete' | 'manage';
  adminOnly?: boolean;
  redirectTo?: string;
}

export function RouteGuard({ 
  children, 
  module, 
  action, 
  adminOnly = false,
  redirectTo = '/' 
}: RouteGuardProps) {
  const { user, hasPermission } = useAuth();
  
  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Check admin-only routes
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to={redirectTo} replace />;
  }
  
  // Check module permission
  if (!hasPermission(module, action)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Your role: <span className="font-medium text-gray-700">{user.role.replace('_', ' ')}</span>
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}