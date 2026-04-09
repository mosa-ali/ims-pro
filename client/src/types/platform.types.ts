// ============================================================================
// PLATFORM TYPES - Platform vs Organization Separation
// Integrated Management System (IMS)
// ============================================================================

/**
 * CRITICAL SEPARATION RULE:
 * - Platform Admin: System-level access, NO organization data
 * - Organization Users: Domain-locked, organization data access
 */

// ============================================================================
// USER TYPES
// ============================================================================

/**
 * Platform-Level Users (EXCEPTION TO DOMAIN RULE)
 * - System Owner, Platform Admin, Super Admin
 * - Email: Any trusted email (Outlook, Gmail, custom domain)
 * - Access: Platform management ONLY, NO organization data
 */
export type PlatformRole = 
 | 'system_owner'
 | 'platform_admin'
 | 'super_admin';

/**
 * Organization-Level Users (STRICT DOMAIN LOCK)
 * - Organization Admin, Project Manager, Finance, MEAL, HR, Staff, Auditor
 * - Email: MUST match organization domain
 * - Access: Organization data scoped by organization + operating unit
 */
export type OrganizationRole = 
 | 'organization_admin'
 | 'project_manager'
 | 'finance_manager'
 | 'meal_manager'
 | 'hr_manager'
 | 'staff'
 | 'auditor'
 | 'viewer';

/**
 * User Context Type
 */
export type UserContextType = 'platform' | 'organization';

/**
 * Extended User Type with Platform/Organization separation
 */
export interface PlatformUser {
 id: string;
 email: string;
 name: string;
 contextType: 'platform';
 platformRole: PlatformRole;
 
 // Platform users don't belong to any organization
 organizationId: null;
 organizationRole: null;
 
 // Metadata
 createdAt: string;
 lastLogin?: string;
 status: 'active' | 'suspended' | 'inactive';
}

export interface OrganizationUser {
 id: string;
 email: string;
 name: string;
 contextType: 'organization';
 organizationRole: OrganizationRole;
 
 // Organization context (REQUIRED)
 organizationId: string;
 organizationDomain: string; // Email must match this
 
 // Platform users don't have platform roles
 platformRole: null;
 
 // Operating unit assignments
 operatingUnitIds: string[]; // One or more operating units
 primaryOperatingUnitId: string;
 
 // Metadata
 createdAt: string;
 lastLogin?: string;
 status: 'active' | 'suspended' | 'inactive';
}

export type SystemUser = PlatformUser | OrganizationUser;

// ============================================================================
// PLATFORM ADMIN CAPABILITIES
// ============================================================================

export interface PlatformAdminCapabilities {
 canManageOrganizations: boolean;
 canViewSystemHealth: boolean;
 canManageMicrosoftIntegrations: boolean;
 canViewAuditLogs: boolean;
 canManagePlatformUsers: boolean;
 
 // What Platform Admin CANNOT do:
 canAccessOrganizationData: false; // LOCKED - NEVER TRUE
 canAccessProjects: false;
 canAccessFinance: false;
 canAccessHR: false;
 canAccessDocuments: false;
 canAccessMEAL: false;
}

// ============================================================================
// ORGANIZATION MANAGEMENT (Platform Admin View)
// ============================================================================

export interface OrganizationListItem {
 id: string;
 name: string;
 nameAr: string;
 code: string;
 primaryDomain: string;
 country: string;
 status: 'active' | 'suspended' | 'inactive';
 
 // Microsoft 365 Connection Status
 microsoftConnected: boolean;
 microsoftTenantId?: string;
 microsoftTenantName?: string;
 microsoftConnectionDate?: string;
 
 // Operating Units Count
 operatingUnitsCount: number;
 
 // System Health Indicators
 usersCount: number;
 projectsCount: number;
 lastActivity?: string;
 storageUsed?: string; // e.g., "2.4 GB"
 
 // Metadata
 createdAt: string;
 createdBy: string;
 onboardedDate: string;
}

export interface OrganizationDetails extends OrganizationListItem {
 description?: string;
 timezone: string;
 defaultLanguage: 'en' | 'ar';
 
 // Contact
 primaryContact?: string;
 contactEmail?: string;
 contactPhone?: string;
 
 // Address
 address?: string;
 city?: string;
 postalCode?: string;
 
 // Settings
 features: OrganizationFeatures;
 limits: OrganizationLimits;
}

export interface OrganizationFeatures {
 projects: boolean;
 finance: boolean;
 hr: boolean;
 meal: boolean;
 logistics: boolean;
 donorCRM: boolean;
 documents: boolean;
 analytics: boolean;
}

export interface OrganizationLimits {
 maxUsers: number;
 maxProjects: number;
 maxStorageGB: number;
 maxOperatingUnits: number;
}

// ============================================================================
// MICROSOFT 365 INTEGRATION STATUS
// ============================================================================

export type MicrosoftServiceStatus = 'connected' | 'disconnected' | 'available' | 'planned' | 'optional';

export interface MicrosoftService {
 id: string;
 name: string;
 nameAr: string;
 description: string;
 descriptionAr: string;
 status: MicrosoftServiceStatus;
 category: 'core' | 'optional' | 'future';
 icon: string; // Lucide icon name
 
 // Connection details (if connected)
 connectedDate?: string;
 connectedBy?: string;
 version?: string;
 
 // Status indicators
 isHealthy?: boolean;
 lastSync?: string;
 errorMessage?: string;
}

export interface Microsoft365Connection {
 organizationId: string;
 isConnected: boolean;
 
 // Tenant Info (read-only)
 tenantId?: string;
 tenantName?: string;
 tenantDomain?: string;
 connectionDate?: string;
 
 // Services
 services: MicrosoftService[];
 
 // Health
 overallHealth: 'healthy' | 'degraded' | 'error' | 'unknown';
 lastHealthCheck?: string;
}

// ============================================================================
// PLATFORM DASHBOARD DATA
// ============================================================================

export interface PlatformDashboardStats {
 totalOrganizations: number;
 activeOrganizations: number;
 suspendedOrganizations: number;
 
 totalUsers: number;
 platformUsers: number;
 organizationUsers: number;
 
 microsoftConnections: number;
 healthyConnections: number;
 
 systemHealth: 'healthy' | 'degraded' | 'critical';
 
 // Activity
 todayLogins: number;
 weeklyActiveUsers: number;
 monthlyActiveOrganizations: number;
}

// ============================================================================
// EMAIL DOMAIN VALIDATION
// ============================================================================

export interface EmailDomainValidation {
 email: string;
 domain: string;
 isValid: boolean;
 
 // For platform users
 isPlatformUser: boolean;
 
 // For organization users
 organizationId?: string;
 organizationDomain?: string;
 domainMatch: boolean;
 
 errorMessage?: string;
}

// ============================================================================
// AUTHENTICATION CONTEXT
// ============================================================================

export interface AuthenticationContext {
 user: SystemUser;
 contextType: UserContextType;
 
 // Platform context
 platformRole?: PlatformRole;
 platformCapabilities?: PlatformAdminCapabilities;
 
 // Organization context
 organizationId?: string;
 organizationRole?: OrganizationRole;
 operatingUnitIds?: string[];
 currentOperatingUnitId?: string;
 
 // Permissions
 permissions: string[];
 
 // Session
 sessionId: string;
 expiresAt: string;
}

// ============================================================================
// NAVIGATION STRUCTURE
// ============================================================================

export interface PlatformNavigation {
 platform: PlatformMenuItem[];
 organization: OrganizationMenuItem[];
}

export interface PlatformMenuItem {
 id: string;
 label: string;
 labelAr: string;
 path: string;
 icon: string; // Lucide icon name
 requiresPlatformRole: PlatformRole[];
}

export interface OrganizationMenuItem {
 id: string;
 label: string;
 labelAr: string;
 path: string;
 icon: string;
 requiresOrganizationRole: OrganizationRole[];
 module: string; // 'projects', 'finance', 'hr', etc.
}
