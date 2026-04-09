// ============================================================================
// MOCK DATA SERVICE - Integrated Management System (IMS)
// Simulates backend API responses with realistic NGO data
// ============================================================================

import {
 Organization,
 User,
 UserOrganization,
 UserOrganizationRole,
 RolePermission,
 OrganizationStatus,
 UserRole,
 OrganizationRole,
 Donor,
 DonorType,
 DonorStatus,
 Grant,
 GrantStatus,
 Project,
 ProjectStatus,
 Beneficiary,
 Case,
 CaseStatus,
 CaseType,
 CasePriority,
 MealIndicator,
 MealIndicatorType,
 Budget,
 Expenditure,
 Survey,
 Gender,
 DisplacementStatus,
 EnrollmentStatus
} from '@/app/types/schema.types';

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export const mockOrganizations: Organization[] = [
 {
 id: 1,
 name: 'Relief International',
 nameAr: 'الإغاثة الدولية',
 code: 'RI',
 description: 'International NGO providing humanitarian assistance in conflict zones',
 descriptionAr: 'منظمة دولية غير حكومية تقدم المساعدة الإنسانية في مناطق الناع',
 country: 'Jordan',
 defaultCurrency: 'USD',
 contactEmail: 'info@relief-intl.org',
 contactPhone: '+962-6-1234567',
 logoUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=200',
 faviconUrl: null,
 primaryColor: '#3b82f6',
 secondaryColor: '#10b981',
 accentColor: '#f59e0b',
 defaultLanguage: 'en',
 status: OrganizationStatus.ACTIVE,
 createdBy: null,
 createdAt: '2023-01-15T10:00:00Z',
 updatedAt: '2024-01-10T14:30:00Z'
 },
 {
 id: 2,
 name: 'Jordan Local Partner NGO',
 nameAr: 'منظمة الشريك المحلي الأردني',
 code: 'JLPN',
 description: 'National NGO supporting vulnerable communities in Jordan',
 descriptionAr: 'منظمة وطنية غير حكومية تدعم المجتمعات الضعيفة في الأردن',
 country: 'Jordan',
 defaultCurrency: 'JOD',
 contactEmail: 'contact@jlpn.org.jo',
 contactPhone: '+962-79-1234567',
 logoUrl: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=200',
 faviconUrl: null,
 primaryColor: '#059669',
 secondaryColor: '#3b82f6',
 accentColor: '#ef4444',
 defaultLanguage: 'ar',
 status: OrganizationStatus.ACTIVE,
 createdBy: null,
 createdAt: '2022-06-20T08:00:00Z',
 updatedAt: '2024-01-12T09:15:00Z'
 },
 {
 id: 3,
 name: 'UN Migration Agency - Field Office',
 nameAr: 'وكالة الأمم المتحدة للهجرة - المكتب الميداني',
 code: 'IOM-JO',
 description: 'UN agency managing humanitarian migration programs',
 descriptionAr: 'وكالة الأمم المتحدة لإدارة برامج الهجرة الإنسانية',
 country: 'Jordan',
 defaultCurrency: 'USD',
 contactEmail: 'iomjordan@iom.int',
 contactPhone: '+962-6-9876543',
 logoUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=200',
 faviconUrl: null,
 primaryColor: '#0ea5e9',
 secondaryColor: '#8b5cf6',
 accentColor: '#f59e0b',
 defaultLanguage: 'en',
 status: OrganizationStatus.ACTIVE,
 createdBy: null,
 createdAt: '2021-03-10T12:00:00Z',
 updatedAt: '2024-01-08T16:45:00Z'
 }
];

// ============================================================================
// USERS
// ============================================================================

export const mockUsers: User[] = [
 {
 id: 1,
 openId: 'auth0|admin001',
 name: 'Sarah Johnson',
 email: 'sarah.johnson@relief-intl.org',
 loginMethod: 'auth0',
 role: UserRole.ADMIN,
 organizationId: 1,
 currentOrganizationId: 1,
 languagePreference: 'en',
 createdAt: '2023-01-15T10:00:00Z',
 updatedAt: '2024-01-14T08:30:00Z',
 lastSignedIn: '2024-01-14T08:30:00Z'
 },
 {
 id: 2,
 openId: 'auth0|manager001',
 name: 'Ahmad Hassan',
 email: 'ahmad.hassan@relief-intl.org',
 loginMethod: 'auth0',
 role: UserRole.MANAGER,
 organizationId: 1,
 currentOrganizationId: 1,
 languagePreference: 'en',
 createdAt: '2023-02-20T09:00:00Z',
 updatedAt: '2024-01-14T07:15:00Z',
 lastSignedIn: '2024-01-14T07:15:00Z'
 },
 {
 id: 3,
 openId: 'auth0|finance001',
 name: 'Maria Garcia',
 email: 'maria.garcia@relief-intl.org',
 loginMethod: 'auth0',
 role: UserRole.USER,
 organizationId: 1,
 currentOrganizationId: 1,
 languagePreference: 'en',
 createdAt: '2023-03-10T11:00:00Z',
 updatedAt: '2024-01-13T14:20:00Z',
 lastSignedIn: '2024-01-13T14:20:00Z'
 },
 {
 id: 4,
 openId: 'auth0|meal001',
 name: 'Fatima AlSayed',
 email: 'fatima.alsayed@jlpn.org.jo',
 loginMethod: 'auth0',
 role: UserRole.USER,
 organizationId: 1,
 currentOrganizationId: 1,
 languagePreference: 'en',
 createdAt: '2023-04-05T10:30:00Z',
 updatedAt: '2024-01-14T09:00:00Z',
 lastSignedIn: '2024-01-14T09:00:00Z'
 },
 {
 id: 5,
 openId: 'auth0|field001',
 name: 'John Smith',
 email: 'john.smith@relief-intl.org',
 loginMethod: 'auth0',
 role: UserRole.USER,
 organizationId: 1,
 currentOrganizationId: 1,
 languagePreference: 'en',
 createdAt: '2023-05-12T08:00:00Z',
 updatedAt: '2024-01-13T16:45:00Z',
 lastSignedIn: '2024-01-13T16:45:00Z'
 },
 {
 id: 6,
 openId: 'auth0|viewer001',
 name: 'Laura Martinez',
 email: 'laura.martinez@iom.int',
 loginMethod: 'auth0',
 role: UserRole.USER,
 organizationId: 1,
 currentOrganizationId: 1,
 languagePreference: 'en',
 createdAt: '2023-06-18T13:00:00Z',
 updatedAt: '2024-01-12T11:30:00Z',
 lastSignedIn: '2024-01-12T11:30:00Z'
 },
 {
 id: 7,
 openId: 'auth0|hr001',
 name: 'Layla Ibrahim',
 email: 'layla.ibrahim@relief-intl.org',
 loginMethod: 'auth0',
 role: UserRole.USER,
 organizationId: 1,
 currentOrganizationId: 1,
 languagePreference: 'en',
 createdAt: '2023-07-10T09:00:00Z',
 updatedAt: '2024-01-14T10:15:00Z',
 lastSignedIn: '2024-01-14T10:15:00Z'
 }
];

// ============================================================================
// USER ORGANIZATIONS (Multi-org membership)
// ============================================================================

export const mockUserOrganizations: UserOrganization[] = [
 { id: 1, userId: 1, organizationId: 1, isPrimary: true, joinedAt: '2023-01-15T10:00:00Z' },
 { id: 2, userId: 2, organizationId: 1, isPrimary: true, joinedAt: '2023-02-20T09:00:00Z' },
 { id: 3, userId: 3, organizationId: 1, isPrimary: true, joinedAt: '2023-03-10T11:00:00Z' },
 { id: 4, userId: 4, organizationId: 1, isPrimary: true, joinedAt: '2023-04-05T10:30:00Z' },
 { id: 5, userId: 5, organizationId: 1, isPrimary: true, joinedAt: '2023-05-12T08:00:00Z' },
 { id: 6, userId: 6, organizationId: 1, isPrimary: true, joinedAt: '2023-06-18T13:00:00Z' },
 { id: 7, userId: 7, organizationId: 1, isPrimary: true, joinedAt: '2023-07-10T09:00:00Z' }
];

// ============================================================================
// USER ORGANIZATION ROLES
// ============================================================================

export const mockUserOrganizationRoles: UserOrganizationRole[] = [
 { id: 1, userId: 1, organizationId: 1, role: OrganizationRole.ORG_ADMIN, assignedAt: '2023-01-15T10:00:00Z', assignedBy: null },
 { id: 2, userId: 2, organizationId: 1, role: OrganizationRole.PROGRAM_MANAGER, assignedAt: '2023-02-20T09:00:00Z', assignedBy: 1 },
 { id: 3, userId: 3, organizationId: 1, role: OrganizationRole.FINANCE_MANAGER, assignedAt: '2023-03-10T11:00:00Z', assignedBy: 1 },
 { id: 4, userId: 4, organizationId: 1, role: OrganizationRole.MEAL_OFFICER, assignedAt: '2023-04-05T10:30:00Z', assignedBy: 1 },
 { id: 5, userId: 5, organizationId: 1, role: OrganizationRole.CASE_WORKER, assignedAt: '2023-05-12T08:00:00Z', assignedBy: 1 },
 { id: 6, userId: 6, organizationId: 1, role: OrganizationRole.VIEWER, assignedAt: '2023-06-18T13:00:00Z', assignedBy: 1 },
 { id: 7, userId: 7, organizationId: 1, role: OrganizationRole.HR_ADMIN_OFFICER, assignedAt: '2023-07-10T09:00:00Z', assignedBy: 1 }
];

// ============================================================================
// ROLE PERMISSIONS (Default permissions per role per module)
// ============================================================================

export const mockRolePermissions: RolePermission[] = [
 // ORG_ADMIN - Full access to everything
 { id: 1, organizationId: 1, role: OrganizationRole.ORG_ADMIN, module: 'dashboard', canView: true, canCreate: true, canEdit: true, canDelete: true, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 2, organizationId: 1, role: OrganizationRole.ORG_ADMIN, module: 'projects', canView: true, canCreate: true, canEdit: true, canDelete: true, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 3, organizationId: 1, role: OrganizationRole.ORG_ADMIN, module: 'grants', canView: true, canCreate: true, canEdit: true, canDelete: true, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 4, organizationId: 1, role: OrganizationRole.ORG_ADMIN, module: 'finance', canView: true, canCreate: true, canEdit: true, canDelete: true, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 5, organizationId: 1, role: OrganizationRole.ORG_ADMIN, module: 'meal', canView: true, canCreate: true, canEdit: true, canDelete: true, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 6, organizationId: 1, role: OrganizationRole.ORG_ADMIN, module: 'surveys', canView: true, canCreate: true, canEdit: true, canDelete: true, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 7, organizationId: 1, role: OrganizationRole.ORG_ADMIN, module: 'cases', canView: true, canCreate: true, canEdit: true, canDelete: true, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 8, organizationId: 1, role: OrganizationRole.ORG_ADMIN, module: 'documents', canView: true, canCreate: true, canEdit: true, canDelete: true, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 9, organizationId: 1, role: OrganizationRole.ORG_ADMIN, module: 'settings', canView: true, canCreate: true, canEdit: true, canDelete: true, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 10, organizationId: 1, role: OrganizationRole.ORG_ADMIN, module: 'organizations', canView: true, canCreate: true, canEdit: true, canDelete: true, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 11, organizationId: 1, role: OrganizationRole.ORG_ADMIN, module: 'import', canView: true, canCreate: true, canEdit: true, canDelete: true, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 12, organizationId: 1, role: OrganizationRole.ORG_ADMIN, module: 'admin', canView: true, canCreate: true, canEdit: true, canDelete: true, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 58, organizationId: 1, role: OrganizationRole.ORG_ADMIN, module: 'hr', canView: true, canCreate: true, canEdit: true, canDelete: true, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 68, organizationId: 1, role: OrganizationRole.ORG_ADMIN, module: 'logistics', canView: true, canCreate: true, canEdit: true, canDelete: true, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },

 // PROGRAM_MANAGER - Full access to projects/grants, view others
 { id: 13, organizationId: 1, role: OrganizationRole.PROGRAM_MANAGER, module: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 14, organizationId: 1, role: OrganizationRole.PROGRAM_MANAGER, module: 'projects', canView: true, canCreate: true, canEdit: true, canDelete: true, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 15, organizationId: 1, role: OrganizationRole.PROGRAM_MANAGER, module: 'grants', canView: true, canCreate: true, canEdit: true, canDelete: true, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 16, organizationId: 1, role: OrganizationRole.PROGRAM_MANAGER, module: 'finance', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 17, organizationId: 1, role: OrganizationRole.PROGRAM_MANAGER, module: 'meal', canView: true, canCreate: true, canEdit: true, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 18, organizationId: 1, role: OrganizationRole.PROGRAM_MANAGER, module: 'surveys', canView: true, canCreate: true, canEdit: true, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 19, organizationId: 1, role: OrganizationRole.PROGRAM_MANAGER, module: 'cases', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 20, organizationId: 1, role: OrganizationRole.PROGRAM_MANAGER, module: 'documents', canView: true, canCreate: true, canEdit: true, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 21, organizationId: 1, role: OrganizationRole.PROGRAM_MANAGER, module: 'settings', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 59, organizationId: 1, role: OrganizationRole.PROGRAM_MANAGER, module: 'hr', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 69, organizationId: 1, role: OrganizationRole.PROGRAM_MANAGER, module: 'logistics', canView: true, canCreate: true, canEdit: true, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },

 // FINANCE_MANAGER - Full finance access, view others
 { id: 22, organizationId: 1, role: OrganizationRole.FINANCE_MANAGER, module: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 23, organizationId: 1, role: OrganizationRole.FINANCE_MANAGER, module: 'projects', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 24, organizationId: 1, role: OrganizationRole.FINANCE_MANAGER, module: 'grants', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 25, organizationId: 1, role: OrganizationRole.FINANCE_MANAGER, module: 'finance', canView: true, canCreate: true, canEdit: true, canDelete: true, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 26, organizationId: 1, role: OrganizationRole.FINANCE_MANAGER, module: 'meal', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 27, organizationId: 1, role: OrganizationRole.FINANCE_MANAGER, module: 'surveys', canView: false, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 28, organizationId: 1, role: OrganizationRole.FINANCE_MANAGER, module: 'cases', canView: false, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 29, organizationId: 1, role: OrganizationRole.FINANCE_MANAGER, module: 'documents', canView: true, canCreate: true, canEdit: true, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 30, organizationId: 1, role: OrganizationRole.FINANCE_MANAGER, module: 'settings', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 60, organizationId: 1, role: OrganizationRole.FINANCE_MANAGER, module: 'hr', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 70, organizationId: 1, role: OrganizationRole.FINANCE_MANAGER, module: 'logistics', canView: true, canCreate: true, canEdit: true, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },

 // MEAL_OFFICER - Full MEAL access
 { id: 31, organizationId: 1, role: OrganizationRole.MEAL_OFFICER, module: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 32, organizationId: 1, role: OrganizationRole.MEAL_OFFICER, module: 'projects', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 33, organizationId: 1, role: OrganizationRole.MEAL_OFFICER, module: 'grants', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 34, organizationId: 1, role: OrganizationRole.MEAL_OFFICER, module: 'finance', canView: false, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 35, organizationId: 1, role: OrganizationRole.MEAL_OFFICER, module: 'meal', canView: true, canCreate: true, canEdit: true, canDelete: true, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 36, organizationId: 1, role: OrganizationRole.MEAL_OFFICER, module: 'surveys', canView: true, canCreate: true, canEdit: true, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 37, organizationId: 1, role: OrganizationRole.MEAL_OFFICER, module: 'cases', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 38, organizationId: 1, role: OrganizationRole.MEAL_OFFICER, module: 'documents', canView: true, canCreate: true, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 39, organizationId: 1, role: OrganizationRole.MEAL_OFFICER, module: 'settings', canView: false, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 61, organizationId: 1, role: OrganizationRole.MEAL_OFFICER, module: 'hr', canView: false, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },

 // CASE_WORKER - Full cases/beneficiaries access
 { id: 40, organizationId: 1, role: OrganizationRole.CASE_WORKER, module: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 41, organizationId: 1, role: OrganizationRole.CASE_WORKER, module: 'projects', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 42, organizationId: 1, role: OrganizationRole.CASE_WORKER, module: 'grants', canView: false, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 43, organizationId: 1, role: OrganizationRole.CASE_WORKER, module: 'finance', canView: false, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 44, organizationId: 1, role: OrganizationRole.CASE_WORKER, module: 'meal', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 45, organizationId: 1, role: OrganizationRole.CASE_WORKER, module: 'surveys', canView: true, canCreate: true, canEdit: true, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 46, organizationId: 1, role: OrganizationRole.CASE_WORKER, module: 'cases', canView: true, canCreate: true, canEdit: true, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 47, organizationId: 1, role: OrganizationRole.CASE_WORKER, module: 'documents', canView: true, canCreate: true, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 48, organizationId: 1, role: OrganizationRole.CASE_WORKER, module: 'settings', canView: false, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 62, organizationId: 1, role: OrganizationRole.CASE_WORKER, module: 'hr', canView: false, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },

 // VIEWER - Read-only access
 { id: 49, organizationId: 1, role: OrganizationRole.VIEWER, module: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 50, organizationId: 1, role: OrganizationRole.VIEWER, module: 'projects', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 51, organizationId: 1, role: OrganizationRole.VIEWER, module: 'grants', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 52, organizationId: 1, role: OrganizationRole.VIEWER, module: 'finance', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 53, organizationId: 1, role: OrganizationRole.VIEWER, module: 'meal', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 54, organizationId: 1, role: OrganizationRole.VIEWER, module: 'surveys', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 55, organizationId: 1, role: OrganizationRole.VIEWER, module: 'cases', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 56, organizationId: 1, role: OrganizationRole.VIEWER, module: 'documents', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 57, organizationId: 1, role: OrganizationRole.VIEWER, module: 'settings', canView: false, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 63, organizationId: 1, role: OrganizationRole.VIEWER, module: 'hr', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 71, organizationId: 1, role: OrganizationRole.VIEWER, module: 'logistics', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 
 // HR_ADMIN_OFFICER - Full HR access
 { id: 64, organizationId: 1, role: OrganizationRole.HR_ADMIN_OFFICER, module: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 65, organizationId: 1, role: OrganizationRole.HR_ADMIN_OFFICER, module: 'projects', canView: true, canCreate: false, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 66, organizationId: 1, role: OrganizationRole.HR_ADMIN_OFFICER, module: 'hr', canView: true, canCreate: true, canEdit: true, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' },
 { id: 67, organizationId: 1, role: OrganizationRole.HR_ADMIN_OFFICER, module: 'documents', canView: true, canCreate: true, canEdit: false, canDelete: false, updatedBy: null, updatedAt: '2023-01-15T10:00:00Z' }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getUserById = (userId: number): User | undefined => {
 return mockUsers.find(u => u.id === userId);
};

export const getUserByEmail = (email: string): User | undefined => {
 return mockUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
};

export const getOrganizationById = (orgId: number): Organization | undefined => {
 return mockOrganizations.find(o => o.id === orgId);
};

export const getUserOrganizations = (userId: number): Organization[] => {
 const userOrgIds = mockUserOrganizations
 .filter(uo => uo.userId === userId)
 .map(uo => uo.organizationId);
 
 return mockOrganizations.filter(o => userOrgIds.includes(o.id));
};

export const getUserRoleInOrganization = (userId: number, orgId: number): OrganizationRole | null => {
 const roleMapping = mockUserOrganizationRoles.find(
 r => r.userId === userId && r.organizationId === orgId
 );
 return roleMapping?.role || null;
};

export const getRolePermissions = (orgId: number, role: OrganizationRole): RolePermission[] => {
 return mockRolePermissions.filter(
 p => p.organizationId === orgId && p.role === role
 );
};

export const canUserPerformAction = (
 userId: number,
 orgId: number,
 module: string,
 action: 'view' | 'create' | 'edit' | 'delete' | 'manage'
): boolean => {
 const role = getUserRoleInOrganization(userId, orgId);
 if (!role) return false;

 const permission = mockRolePermissions.find(
 p => p.organizationId === orgId && p.role === role && p.module === module
 );

 if (!permission) return false;

 switch (action) {
 case 'view': return permission.canView;
 case 'create': return permission.canCreate;
 case 'edit': return permission.canEdit;
 case 'delete': return permission.canDelete;
 case 'manage': return permission.canEdit || permission.canCreate; // manage requires edit OR create permission
 default: return false;
 }
};

// ============================================================================
// MOCK LOGIN FUNCTION
// ============================================================================

export interface LoginCredentials {
 email: string;
 password: string; // In real app, this would validate against backend
}

export interface LoginResponse {
 success: boolean;
 user?: User;
 organizations?: Organization[];
 role?: OrganizationRole;
 error?: string;
}

export const mockLogin = async (credentials: LoginCredentials): Promise<LoginResponse> => {
 // Simulate API delay
 await new Promise(resolve => setTimeout(resolve, 500));

 const user = getUserByEmail(credentials.email);
 
 if (!user) {
 return {
 success: false,
 error: 'Invalid email or password'
 };
 }

 // In a real app, password would be validated here
 // For mock, any password works

 const organizations = getUserOrganizations(user.id);
 const currentOrgId = user.currentOrganizationId || organizations[0]?.id;
 const role = currentOrgId ? getUserRoleInOrganization(user.id, currentOrgId) : null;

 return {
 success: true,
 user,
 organizations,
 role: role || undefined
 };
};

// ============================================================================
// DEMO ACCOUNTS (for easy testing)
// ============================================================================

export const demoAccounts = [
 {
 email: 'sarah.johnson@relief-intl.org',
 password: 'demo123',
 role: 'Org Admin',
 description: 'Full system access'
 },
 {
 email: 'ahmad.hassan@relief-intl.org',
 password: 'demo123',
 role: 'Program Manager',
 description: 'Grants & Projects management'
 },
 {
 email: 'maria.garcia@relief-intl.org',
 password: 'demo123',
 role: 'Finance Manager',
 description: 'Finance & Budget management'
 },
 {
 email: 'fatima.alsayed@jlpn.org.jo',
 password: 'demo123',
 role: 'MEAL Officer',
 description: 'M&E and Indicators'
 },
 {
 email: 'john.smith@relief-intl.org',
 password: 'demo123',
 role: 'Case Worker',
 description: 'Cases & Beneficiaries'
 },
 {
 email: 'laura.martinez@iom.int',
 password: 'demo123',
 role: 'Viewer',
 description: 'Read-only access'
 }
];