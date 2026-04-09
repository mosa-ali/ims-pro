/**
 * ============================================================================
 * AUTH CONTEXT ADAPTER
 * ============================================================================
 * 
 * This adapter bridges the original localStorage-based AuthContext to the
 * tRPC-based authentication system. It provides the same interface as the
 * original design so UI components work without modification.
 * 
 * ============================================================================
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useAuth as useTrpcAuth } from '@/_core/hooks/useAuth';

// Types matching original design
export interface User {
  id: number;
  openId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role?: 'admin' | 'user';
  organizationId?: number;
  operatingUnitId?: number;
  platformRole?: string;
  orgRoles?: string[];
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  hasPermission: (module: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const trpcAuth = useTrpcAuth();
  
  // Map tRPC user to original User interface
  const user: User | null = useMemo(() => {
    if (!trpcAuth.user) return null;
    
    return {
      id: trpcAuth.user.id || 0,
      openId: trpcAuth.user.openId || '',
      name: trpcAuth.user.name || '',
      email: trpcAuth.user.email || '',
      avatarUrl: trpcAuth.user.avatarUrl,
      role: trpcAuth.user.role as 'admin' | 'user' | undefined,
      organizationId: trpcAuth.user.organizationId,
      operatingUnitId: trpcAuth.user.operatingUnitId,
      platformRole: trpcAuth.user.platformRole,
      orgRoles: trpcAuth.user.orgRoles,
      permissions: trpcAuth.user.permissions,
    };
  }, [trpcAuth.user]);
  
  // Login is handled by OAuth redirect, not direct credentials
  const login = async (_credentials: { email: string; password: string }) => {
    console.warn('Direct login not supported. Use OAuth redirect.');
    return { success: false, error: 'Use OAuth login' };
  };
  
  // Logout using tRPC
  const logout = () => {
    trpcAuth.logout();
  };
  
  // Update user (no-op for OAuth-based auth)
  const updateUser = (_updates: Partial<User>) => {
    console.warn('User updates are managed by OAuth provider');
  };
  
  // Permission check
  const hasPermission = (module: string, action: string): boolean => {
    if (!user) return false;
    
    // Platform Admin has all permissions
    if (user.platformRole === 'Platform Admin') return true;
    if (user.role === 'admin') return true;
    
    // Check specific permissions
    const permissionKey = `${module.toLowerCase()}.${action.toLowerCase()}`;
    return user.permissions?.includes(permissionKey) || false;
  };
  
  const value: AuthContextType = {
    user,
    isAuthenticated: trpcAuth.isAuthenticated,
    isLoading: trpcAuth.loading,
    login,
    logout,
    updateUser,
    hasPermission,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Re-export for compatibility
export { AuthContext };
