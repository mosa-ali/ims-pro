/**
 * ============================================================================
 * OPERATING UNIT CONTEXT - Multi-Office/Country Isolation
 * Integrated Management System (IMS)
 * ============================================================================
 * 
 * Fetches operating units from tRPC myOperatingUnits endpoint.
 * 
 * ============================================================================
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { trpc } from '@/lib/trpc';

// Operating Unit type
export interface OperatingUnit {
 id: number | string;
 code: string;
 name: string;
 nameAr?: string;
 organizationId: number | string;
 type: 'headquarters' | 'regional_office' | 'country_office' | 'field_office' | 'project_office';
 status: 'active' | 'inactive' | 'closed';
 country?: string;
 countryCode?: string;
 region?: string;
 city?: string;
 address?: string;
 phone?: string;
 email?: string;
 establishedDate?: string;
 staffCount?: number;
 currency?: string;
 timezone?: string;
 languagePreference?: 'en' | 'ar' | 'both';
 createdAt?: string;
 updatedAt?: string;
 createdBy?: string;
 description?: string;
}

interface OperatingUnitContextType {
 currentOperatingUnit: OperatingUnit | null;
 currentOperatingUnitId: number | string | null;
 userOperatingUnits: OperatingUnit[];
 switchOperatingUnit: (unitId: string | number) => void;
 setCurrentOperatingUnitId: (unitId: string | number | null) => void;
 shouldShowSelector: boolean;
 isLoading: boolean;
 // Extended context properties for finance pages
 currentOrganization: any;
 language: string;
}

const OperatingUnitContext = createContext<OperatingUnitContextType | undefined>(undefined);

export function OperatingUnitProvider({ children }: { children: React.ReactNode }) {
 const { user, isAuthenticated, loading: authLoading } = useAuth();
 const { currentOrganization, isLoading: orgLoading } = useOrganization();
 const [currentOperatingUnit, setCurrentOperatingUnit] = useState<OperatingUnit | null>(null);
 const [userOperatingUnits, setUserOperatingUnits] = useState<OperatingUnit[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 // Check if user is a platform admin (they don't have operating unit assignments)
 const isPlatformAdmin = user && ['platform_admin', 'platform_super_admin', 'platform_auditor'].includes(user.role || '');

 // Fetch operating units from tRPC - uses ims.userAssignments.myOperatingUnits
 // Query for all authenticated users with an org context - platform admins may have org_admin assignments
 const { data: userOUsData, isLoading: ousLoading } = trpc.ims.userAssignments.myOperatingUnits.useQuery(
 undefined,
 { 
 enabled: isAuthenticated && !authLoading && !orgLoading && !!currentOrganization,
 staleTime: 5 * 60 * 1000, // 5 minutes
 }
 );

 // Load operating units when organization changes or OUs are fetched
 useEffect(() => {
 if (authLoading || orgLoading) return;
 if (ousLoading) return;
 
 // If no organization context, clear OUs
 if (!currentOrganization) {
 setUserOperatingUnits([]);
 setCurrentOperatingUnit(null);
 setIsLoading(false);
 return;
 }
 
 if (!isAuthenticated || !user) {
 setUserOperatingUnits([]);
 setCurrentOperatingUnit(null);
 setIsLoading(false);
 return;
 }

 setIsLoading(true);

 try {
 // Debug logging
 console.log('[OperatingUnitContext] Raw userOUsData:', userOUsData);
 console.log('[OperatingUnitContext] currentOrganization:', currentOrganization);
 
 // Map tRPC data to OperatingUnit type
 // The API returns: { id, userId, operatingUnitId, createdAt, unitName, unitType, unitStatus, organizationId }
 const allOUs: OperatingUnit[] = (userOUsData || [])
 .filter((ou: any) => {
 const matches = ou.unitName && ou.organizationId === currentOrganization.id;
 console.log('[OperatingUnitContext] Filter check:', { ouOrgId: ou.organizationId, currentOrgId: currentOrganization.id, matches });
 return matches;
 })
 .map((ou: any) => ({
 id: ou.operatingUnitId || ou.id,
 code: ou.unitCode || `OU-${ou.operatingUnitId || ou.id}`,
 name: ou.unitName,
 nameAr: ou.unitNameAr,
 organizationId: ou.organizationId,
 type: ou.unitType || 'country_office',
 status: ou.unitStatus || 'active',
 country: ou.country,
 countryCode: ou.countryCode,
 region: ou.region,
 city: ou.city,
 address: ou.address,
 phone: ou.phone,
 email: ou.email,
 establishedDate: ou.establishedDate,
 staffCount: ou.staffCount,
 currency: ou.currency,
 timezone: ou.timezone,
 languagePreference: ou.languagePreference,
 createdAt: ou.createdAt,
 updatedAt: ou.updatedAt,
 createdBy: ou.createdBy,
 description: ou.description,
 }));

 // Filter active units
 const accessibleUnits = allOUs.filter(u => u.status === 'active');

 setUserOperatingUnits(accessibleUnits);

 // Set current operating unit
 const currentUnitKey = `current_operating_unit_${user?.id}_${currentOrganization?.id}`;
 const savedCurrentId = localStorage.getItem(currentUnitKey);
 
 let current: OperatingUnit | null = null;
 
 if (savedCurrentId && accessibleUnits.find(u => String(u.id) === savedCurrentId)) {
 current = accessibleUnits.find(u => String(u.id) === savedCurrentId) || null;
 } else {
 // Default to first accessible unit
 current = accessibleUnits[0] || null;
 if (current) {
 localStorage.setItem(currentUnitKey, String(current.id));
 }
 }

 setCurrentOperatingUnit(current);
 } catch (error) {
 console.error('Error loading operating units:', error);
 setUserOperatingUnits([]);
 setCurrentOperatingUnit(null);
 } finally {
 setIsLoading(false);
 }
 }, [user, isAuthenticated, authLoading, currentOrganization, orgLoading, userOUsData, ousLoading]);

 const switchOperatingUnit = (unitId: string | number) => {
 const unit = userOperatingUnits.find(u => String(u.id) === String(unitId));
 if (!unit) {
 console.error('Operating unit not found or not accessible:', unitId);
 return;
 }

 // Save preference before reload
 const currentUnitKey = `current_operating_unit_${user?.id}_${currentOrganization?.id}`;
 localStorage.setItem(currentUnitKey, String(unitId));
 console.log(`Switching to operating unit: ${unit.name}`);
 
 // CRITICAL: Clean state switch pattern (Governance Requirement)
 // Trigger hard reload to prevent cross-contamination of cached data
 window.location.reload();
 };

 // Determine if selector should be shown (more than one operating unit)
 const shouldShowSelector = userOperatingUnits.length > 1;

 // Set current operating unit ID directly
 const setCurrentOperatingUnitId = (unitId: string | number | null) => {
 if (unitId === null) {
 setCurrentOperatingUnit(null);
 return;
 }
 switchOperatingUnit(unitId);
 };

 return (
 <OperatingUnitContext.Provider
 value={{
 currentOperatingUnit,
 currentOperatingUnitId: currentOperatingUnit?.id || null,
 userOperatingUnits,
 switchOperatingUnit,
 setCurrentOperatingUnitId,
 shouldShowSelector,
 isLoading: isLoading || ousLoading,
 currentOrganization,
 language: user?.languagePreference || 'en',
 }}
 >
 {children}
 </OperatingUnitContext.Provider>
 );
}

export function useOperatingUnit() {
 const context = useContext(OperatingUnitContext);
 if (context === undefined) {
 throw new Error('useOperatingUnit must be used within an OperatingUnitProvider');
 }
 return context;
}
