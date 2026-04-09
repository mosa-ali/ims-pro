/**
 * ============================================================================
 * ORGANIZATION CONTEXT
 * ============================================================================
 * 
 * Manages multi-organization membership and switching.
 * Fetches organizations from tRPC myOrganizations endpoint.
 * 
 * ============================================================================
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';

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
export type OrganizationRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer' | 'platform_admin' | 'organization_admin';

interface OrganizationContextType {
 currentOrganization: Organization | null;
 currentOrganizationId: number | null;
 currentRole: OrganizationRole | null;
 availableOrganizations: Organization[];
 switchOrganization: (orgId: number) => void;
 isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const ORG_STORAGE_KEY = 'pms_current_org';

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
 const { user, isAuthenticated, loading: authLoading } = useAuth();
 const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
 const [currentRole, setCurrentRole] = useState<OrganizationRole | null>(null);
 const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 // Check if user is a platform admin (they don't have organization assignments)
 const isPlatformAdmin = user && ['platform_admin', 'platform_super_admin', 'platform_auditor'].includes(user.role || '');

 // Fetch organizations from tRPC - uses ims.userAssignments.myOrganizations
 // Query for all authenticated users - platform admins may have organization_admin assignments
 const { data: userOrgsData, isLoading: orgsLoading } = trpc.ims.userAssignments.myOrganizations.useQuery(
 undefined,
 { 
 enabled: isAuthenticated && !authLoading,
 staleTime: 5 * 60 * 1000, // 5 minutes
 }
 );

 // Load organization when user changes or organizations are fetched
 useEffect(() => {
 if (authLoading) return;
 if (orgsLoading) return;
 
 if (!isAuthenticated || !user) {
 setCurrentOrganization(null);
 setCurrentRole(null);
 setAvailableOrganizations([]);
 setIsLoading(false);
 return;
 }

 // Check if user has organization_admin assignments
 const hasOrgAdminRole = (userOrgsData || []).some((o: any) => o.platformRole === 'organization_admin');

 // Platform admins without organization_admin assignments don't have organization context
 if (isPlatformAdmin && !hasOrgAdminRole) {
 setCurrentOrganization(null);
 setCurrentRole(null);
 setAvailableOrganizations([]);
 setIsLoading(false);
 return;
 }

 setIsLoading(true);

 // Map tRPC data to Organization type
 const orgs: Organization[] = (userOrgsData || [])
 .filter((org: any) => org.organizationName || org.name) // Filter out orgs without names
 .map((org: any) => ({
 id: org.organizationId || org.id,
 name: org.organizationName || org.name,
 nameAr: org.organizationNameAr || org.nameAr,
 code: org.organizationCode || org.code || org.shortCode,
 type: org.organizationType || org.type || 'ngo',
 status: org.status || 'active',
 logoUrl: org.logoUrl,
 }));

 if (orgs.length === 0) {
 setCurrentOrganization(null);
 setCurrentRole(null);
 setAvailableOrganizations([]);
 setIsLoading(false);
 return;
 }

 setAvailableOrganizations(orgs);

 // Try to load saved org from localStorage
 const storedOrgId = localStorage.getItem(ORG_STORAGE_KEY);
 let currentOrgId = storedOrgId ? parseInt(storedOrgId, 10) : orgs[0].id;

 const org = orgs.find(o => o.id === currentOrgId) || orgs[0];
 
 setCurrentOrganization(org);
 
 // Get role from the userOrgsData
 const orgData = (userOrgsData || []).find((o: any) => (o.organizationId || o.id) === org.id);
 setCurrentRole(orgData?.platformRole || 'member');
 
 localStorage.setItem(ORG_STORAGE_KEY, String(org.id));

 setIsLoading(false);
 }, [user, isAuthenticated, authLoading, userOrgsData, orgsLoading]);

 const switchOrganization = (orgId: number) => {
 const org = availableOrganizations.find(o => o.id === orgId);
 if (!org) {
 console.error('Invalid organization');
 return;
 }

 // Save to localStorage before reload
 localStorage.setItem(ORG_STORAGE_KEY, String(orgId));
 console.log(`Switching to organization: ${org.name}`);
 
 // CRITICAL: Clean state switch pattern (Governance Requirement)
 // Trigger hard reload to prevent cross-contamination of cached data
 window.location.reload();
 };

 const value: OrganizationContextType = {
 currentOrganization,
 currentOrganizationId: currentOrganization?.id || null,
 currentRole,
 availableOrganizations,
 switchOrganization,
 isLoading: isLoading || orgsLoading
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
