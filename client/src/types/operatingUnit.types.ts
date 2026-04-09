// ============================================================================
// OPERATING UNIT TYPES - Multi-Office/Country Isolation
// Integrated Management System (IMS)
// ============================================================================

/**
 * CRITICAL ISOLATION RULE:
 * - One Organization can have multiple Operating Units (countries/offices)
 * - Every data record MUST belong to one Operating Unit
 * - Users can only see data from their assigned Operating Units
 * - Required for: Donor compliance, Security, Sanctions risk, INGO operations
 */

export type OperatingUnitType = 
 | 'headquarters'
 | 'country_office'
 | 'regional_office'
 | 'field_office'
 | 'sub_office';

export type OperatingUnitStatus = 'active' | 'suspended' | 'closed';

export interface OperatingUnit {
 id: string;
 code: string; // Unique identifier (e.g., "YEM", "HQ", "REG-MENA")
 name: string;
 nameAr: string;
 organizationId: string; // Parent organization
 type: OperatingUnitType;
 status: OperatingUnitStatus;
 
 // Geographic Info
 country?: string;
 countryCode?: string; // ISO 3166-1 alpha-3 (e.g., "YEM", "JOR")
 region?: string;
 city?: string;
 
 // Contact Info
 address?: string;
 phone?: string;
 email?: string;
 
 // Operational Info
 establishedDate?: string;
 closedDate?: string;
 staffCount?: number;
 
 // Settings
 currency?: string;
 timezone?: string;
 languagePreference?: 'en' | 'ar' | 'both';
 
 // Metadata
 createdAt: string;
 updatedAt: string;
 createdBy: string;
 description?: string;
}

export interface UserOperatingUnitAssignment {
 userId: string;
 operatingUnitId: string;
 isPrimary: boolean; // One primary OU per user
 assignedDate: string;
 assignedBy: string;
}

/**
 * Data Scoping Rule:
 * All records in the system must include:
 * - organization_id: For top-level org isolation
 * - operating_unit_id: For office/country isolation within org
 */
export interface OperatingUnitScoped {
 organizationId: string;
 operatingUnitId: string;
}

/**
 * Filters for data queries
 */
export interface OperatingUnitFilter {
 organizationId?: string;
 operatingUnitIds?: string[]; // User can be assigned to multiple OUs
 includeAll?: boolean; // Admin override (use with extreme caution)
}
