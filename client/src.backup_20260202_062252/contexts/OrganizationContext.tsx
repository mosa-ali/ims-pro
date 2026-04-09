/**
 * ============================================================================
 * ORGANIZATION CONTEXT
 * ============================================================================
 * 
 * Manages multi-organization membership and switching.
 * Simplified version that works with tRPC-based authentication.
 * 
 * ============================================================================
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';

// Organization type
export interface Organization {
  id: number;
  name: string;
  nameAr?: string;
  code?: string;
  type?: string;
  status?: string;
  logoUrl?: string;
}

// Organization role type
export type OrganizationRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

interface OrganizationContextType {
  currentOrganization: Organization | null;
  currentRole: OrganizationRole | null;
  availableOrganizations: Organization[];
  switchOrganization: (orgId: number) => void;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const ORG_STORAGE_KEY = 'pms_current_org';

// Default organization for the system
const DEFAULT_ORGANIZATION: Organization = {
  id: 30001,
  name: 'IMS Foundation',
  nameAr: 'مؤسسة IMS',
  code: 'IMS',
  type: 'ngo',
  status: 'active',
};

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [currentRole, setCurrentRole] = useState<OrganizationRole | null>(null);
  const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load organization when user changes
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || !user) {
      setCurrentOrganization(null);
      setCurrentRole(null);
      setAvailableOrganizations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // For now, use default organization
    // In production, this would fetch from tRPC
    const orgs = [DEFAULT_ORGANIZATION];
    setAvailableOrganizations(orgs);

    // Try to load saved org from localStorage
    const storedOrgId = localStorage.getItem(ORG_STORAGE_KEY);
    let currentOrgId = storedOrgId ? parseInt(storedOrgId, 10) : DEFAULT_ORGANIZATION.id;

    const org = orgs.find(o => o.id === currentOrgId) || orgs[0];
    
    setCurrentOrganization(org);
    setCurrentRole('admin'); // Default role for authenticated users
    localStorage.setItem(ORG_STORAGE_KEY, String(org.id));

    setIsLoading(false);
  }, [user, isAuthenticated, authLoading]);

  const switchOrganization = (orgId: number) => {
    const org = availableOrganizations.find(o => o.id === orgId);
    if (!org) {
      console.error('Invalid organization');
      return;
    }

    setCurrentOrganization(org);
    setCurrentRole('admin');
    localStorage.setItem(ORG_STORAGE_KEY, String(orgId));
    console.log(`Switched to organization: ${org.name}`);
  };

  const value: OrganizationContextType = {
    currentOrganization,
    currentRole,
    availableOrganizations,
    switchOrganization,
    isLoading
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
