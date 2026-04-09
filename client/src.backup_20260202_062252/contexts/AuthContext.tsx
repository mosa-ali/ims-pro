/**
 * ============================================================================
 * AUTH CONTEXT - Re-exports from tRPC-based useAuth
 * ============================================================================
 * 
 * This file re-exports the tRPC-based authentication hook for compatibility
 * with components that import from @/contexts/AuthContext.
 * 
 * ============================================================================
 */

export { useAuth } from '@/_core/hooks/useAuth';

// Re-export a simple User type for compatibility
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

// Stub AuthProvider for components that expect it
// The actual provider is in main.tsx via tRPC
import React from 'react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // No-op - actual auth is handled by tRPC provider in main.tsx
  return <>{children}</>;
}
