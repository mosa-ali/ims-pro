/**
 * ============================================================================
 * OPERATING UNIT CONTEXT - Multi-Office/Country Isolation
 * Integrated Management System (IMS)
 * ============================================================================
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';

// Operating Unit type
export interface OperatingUnit {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  organizationId: string | number;
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
  userOperatingUnits: OperatingUnit[];
  switchOperatingUnit: (unitId: string) => void;
  isLoading: boolean;
}

const OperatingUnitContext = createContext<OperatingUnitContextType | undefined>(undefined);

export function OperatingUnitProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { currentOrganization } = useOrganization();
  const [currentOperatingUnit, setCurrentOperatingUnit] = useState<OperatingUnit | null>(null);
  const [userOperatingUnits, setUserOperatingUnits] = useState<OperatingUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load operating units when organization changes
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || !user || !currentOrganization) {
      setUserOperatingUnits([]);
      setCurrentOperatingUnit(null);
      setIsLoading(false);
      return;
    }

    loadOperatingUnits();
  }, [user, isAuthenticated, authLoading, currentOrganization]);

  const loadOperatingUnits = () => {
    setIsLoading(true);
    
    try {
      // Load operating units from localStorage (scoped by organization)
      const storageKey = `operating_units_${currentOrganization?.id}`;
      const stored = localStorage.getItem(storageKey);
      
      let allUnits: OperatingUnit[] = [];
      
      if (stored) {
        allUnits = JSON.parse(stored);
      } else {
        // Initialize with sample operating units for the current org
        allUnits = getSampleOperatingUnits(String(currentOrganization?.id || ''));
        localStorage.setItem(storageKey, JSON.stringify(allUnits));
      }

      // Load user's assigned operating units
      const userAssignmentsKey = `user_operating_units_${user?.id}`;
      const userAssignments = localStorage.getItem(userAssignmentsKey);
      
      let assignedUnitIds: string[] = [];
      
      if (userAssignments) {
        const assignments = JSON.parse(userAssignments);
        assignedUnitIds = assignments
          .filter((a: any) => a.organizationId === currentOrganization?.id)
          .map((a: any) => a.operatingUnitId);
      } else {
        // Default: Assign user to all units in their organization (for demo purposes)
        assignedUnitIds = allUnits.map(u => u.id);
        
        const defaultAssignments = assignedUnitIds.map(unitId => ({
          userId: user?.id,
          organizationId: currentOrganization?.id,
          operatingUnitId: unitId,
          isPrimary: unitId === allUnits[0]?.id,
          assignedDate: new Date().toISOString(),
          assignedBy: 'system'
        }));
        
        localStorage.setItem(userAssignmentsKey, JSON.stringify(defaultAssignments));
      }

      // Filter units user has access to
      const accessibleUnits = allUnits.filter(u => 
        assignedUnitIds.includes(u.id) && u.status === 'active'
      );

      setUserOperatingUnits(accessibleUnits);

      // Set current operating unit
      const currentUnitKey = `current_operating_unit_${user?.id}_${currentOrganization?.id}`;
      const savedCurrentId = localStorage.getItem(currentUnitKey);
      
      let current: OperatingUnit | null = null;
      
      if (savedCurrentId && accessibleUnits.find(u => u.id === savedCurrentId)) {
        current = accessibleUnits.find(u => u.id === savedCurrentId) || null;
      } else {
        // Default to first accessible unit
        current = accessibleUnits[0] || null;
        if (current) {
          localStorage.setItem(currentUnitKey, current.id);
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
  };

  const switchOperatingUnit = (unitId: string) => {
    const unit = userOperatingUnits.find(u => u.id === unitId);
    if (!unit) {
      console.error('Operating unit not found or not accessible:', unitId);
      return;
    }

    setCurrentOperatingUnit(unit);
    
    // Save preference
    const currentUnitKey = `current_operating_unit_${user?.id}_${currentOrganization?.id}`;
    localStorage.setItem(currentUnitKey, unitId);
  };

  return (
    <OperatingUnitContext.Provider
      value={{
        currentOperatingUnit,
        userOperatingUnits,
        switchOperatingUnit,
        isLoading
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

// ============================================================================
// SAMPLE DATA GENERATOR
// ============================================================================

function getSampleOperatingUnits(organizationId: string): OperatingUnit[] {
  const now = new Date().toISOString();
  
  return [
    {
      id: `ou-${organizationId}-hq`,
      code: 'HQ',
      name: 'Headquarters',
      nameAr: 'المقر الرئيسي',
      organizationId,
      type: 'headquarters',
      status: 'active',
      country: 'United States',
      countryCode: 'USA',
      city: 'New York',
      address: '123 Main Street, New York, NY 10001',
      phone: '+1-555-0100',
      email: 'hq@organization.org',
      establishedDate: '2010-01-01',
      staffCount: 150,
      currency: 'USD',
      timezone: 'America/New_York',
      languagePreference: 'en',
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      description: 'Global headquarters and administrative center'
    },
    {
      id: `ou-${organizationId}-yem`,
      code: 'YEM',
      name: 'Yemen Country Office',
      nameAr: 'مكتب اليمن',
      organizationId,
      type: 'country_office',
      status: 'active',
      country: 'Yemen',
      countryCode: 'YEM',
      region: 'MENA',
      city: 'Sana\'a',
      address: 'Hadda Street, Sana\'a, Yemen',
      phone: '+967-1-234567',
      email: 'yemen@organization.org',
      establishedDate: '2015-06-15',
      staffCount: 85,
      currency: 'YER',
      timezone: 'Asia/Aden',
      languagePreference: 'both',
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      description: 'Yemen humanitarian operations'
    },
    {
      id: `ou-${organizationId}-jor`,
      code: 'JOR',
      name: 'Jordan Country Office',
      nameAr: 'مكتب الأردن',
      organizationId,
      type: 'country_office',
      status: 'active',
      country: 'Jordan',
      countryCode: 'JOR',
      region: 'MENA',
      city: 'Amman',
      address: 'Rainbow Street, Amman, Jordan',
      phone: '+962-6-1234567',
      email: 'jordan@organization.org',
      establishedDate: '2012-03-20',
      staffCount: 45,
      currency: 'JOD',
      timezone: 'Asia/Amman',
      languagePreference: 'both',
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      description: 'Jordan refugee response operations'
    }
  ];
}
