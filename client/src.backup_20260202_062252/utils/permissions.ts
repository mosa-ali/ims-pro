// ============================================================================
// PERMISSION UTILITIES
// Helper functions for role-based access control
// ============================================================================

import { OrganizationRole } from '@/app/types/schema.types';

/**
 * Get human-readable role name
 */
export function getRoleName(role: OrganizationRole): string {
  const roleNames: Record<OrganizationRole, string> = {
    [OrganizationRole.ORG_ADMIN]: 'Organization Admin',
    [OrganizationRole.PROGRAM_MANAGER]: 'Program Manager',
    [OrganizationRole.FINANCE_MANAGER]: 'Finance Manager',
    [OrganizationRole.MEAL_OFFICER]: 'M&E Officer',
    [OrganizationRole.CASE_WORKER]: 'Case Worker',
    [OrganizationRole.VIEWER]: 'Viewer'
  };
  return roleNames[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: OrganizationRole): string {
  const descriptions: Record<OrganizationRole, string> = {
    [OrganizationRole.ORG_ADMIN]: 'Full system access including user management and settings',
    [OrganizationRole.PROGRAM_MANAGER]: 'Manage grants, projects, and program activities',
    [OrganizationRole.FINANCE_MANAGER]: 'Manage budgets, expenditures, and financial reports',
    [OrganizationRole.MEAL_OFFICER]: 'Manage indicators, monitoring, evaluation, and reporting',
    [OrganizationRole.CASE_WORKER]: 'Manage beneficiaries, cases, and service delivery',
    [OrganizationRole.VIEWER]: 'Read-only access to view data and reports'
  };
  return descriptions[role] || '';
}

/**
 * Check if role has admin-level permissions
 */
export function isAdminRole(role: OrganizationRole): boolean {
  return role === OrganizationRole.ORG_ADMIN;
}

/**
 * Check if role can manage users
 */
export function canManageUsers(role: OrganizationRole): boolean {
  return role === OrganizationRole.ORG_ADMIN;
}

/**
 * Check if role can approve expenditures
 */
export function canApproveExpenditures(role: OrganizationRole): boolean {
  return [
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.FINANCE_MANAGER
  ].includes(role);
}

/**
 * Check if role can manage grants
 */
export function canManageGrants(role: OrganizationRole): boolean {
  return [
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.PROGRAM_MANAGER
  ].includes(role);
}

/**
 * Check if role can manage projects
 */
export function canManageProjects(role: OrganizationRole): boolean {
  return [
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.PROGRAM_MANAGER
  ].includes(role);
}

/**
 * Check if role can manage indicators
 */
export function canManageIndicators(role: OrganizationRole): boolean {
  return [
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.MEAL_OFFICER
  ].includes(role);
}

/**
 * Check if role can manage cases
 */
export function canManageCases(role: OrganizationRole): boolean {
  return [
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.CASE_WORKER
  ].includes(role);
}

/**
 * Get all available roles
 */
export function getAllRoles(): OrganizationRole[] {
  return [
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.PROGRAM_MANAGER,
    OrganizationRole.FINANCE_MANAGER,
    OrganizationRole.MEAL_OFFICER,
    OrganizationRole.CASE_WORKER,
    OrganizationRole.VIEWER
  ];
}

/**
 * Get role color for UI display
 */
export function getRoleColor(role: OrganizationRole): string {
  const colors: Record<OrganizationRole, string> = {
    [OrganizationRole.ORG_ADMIN]: 'text-purple-700 bg-purple-100',
    [OrganizationRole.PROGRAM_MANAGER]: 'text-blue-700 bg-blue-100',
    [OrganizationRole.FINANCE_MANAGER]: 'text-green-700 bg-green-100',
    [OrganizationRole.MEAL_OFFICER]: 'text-orange-700 bg-orange-100',
    [OrganizationRole.CASE_WORKER]: 'text-teal-700 bg-teal-100',
    [OrganizationRole.VIEWER]: 'text-gray-700 bg-gray-100'
  };
  return colors[role] || 'text-gray-700 bg-gray-100';
}

/**
 * Permission matrix for quick reference
 */
export const PERMISSION_MATRIX = {
  [OrganizationRole.ORG_ADMIN]: {
    projects: { view: true, create: true, edit: true, delete: true },
    grants: { view: true, create: true, edit: true, delete: true },
    finance: { view: true, create: true, edit: true, delete: true },
    meal: { view: true, create: true, edit: true, delete: true },
    surveys: { view: true, create: true, edit: true, delete: true },
    cases: { view: true, create: true, edit: true, delete: true },
    documents: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: true, edit: true, delete: true }
  },
  [OrganizationRole.PROGRAM_MANAGER]: {
    projects: { view: true, create: true, edit: true, delete: true },
    grants: { view: true, create: true, edit: true, delete: true },
    finance: { view: true, create: false, edit: false, delete: false },
    meal: { view: true, create: true, edit: true, delete: false },
    surveys: { view: true, create: true, edit: true, delete: false },
    cases: { view: true, create: false, edit: false, delete: false },
    documents: { view: true, create: true, edit: true, delete: false },
    settings: { view: true, create: false, edit: false, delete: false }
  },
  [OrganizationRole.FINANCE_MANAGER]: {
    projects: { view: true, create: false, edit: false, delete: false },
    grants: { view: true, create: false, edit: false, delete: false },
    finance: { view: true, create: true, edit: true, delete: true },
    meal: { view: true, create: false, edit: false, delete: false },
    surveys: { view: false, create: false, edit: false, delete: false },
    cases: { view: false, create: false, edit: false, delete: false },
    documents: { view: true, create: true, edit: true, delete: false },
    settings: { view: true, create: false, edit: false, delete: false }
  },
  [OrganizationRole.MEAL_OFFICER]: {
    projects: { view: true, create: false, edit: false, delete: false },
    grants: { view: true, create: false, edit: false, delete: false },
    finance: { view: false, create: false, edit: false, delete: false },
    meal: { view: true, create: true, edit: true, delete: true },
    surveys: { view: true, create: true, edit: true, delete: false },
    cases: { view: true, create: false, edit: false, delete: false },
    documents: { view: true, create: true, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false }
  },
  [OrganizationRole.CASE_WORKER]: {
    projects: { view: true, create: false, edit: false, delete: false },
    grants: { view: false, create: false, edit: false, delete: false },
    finance: { view: false, create: false, edit: false, delete: false },
    meal: { view: true, create: false, edit: false, delete: false },
    surveys: { view: true, create: true, edit: true, delete: false },
    cases: { view: true, create: true, edit: true, delete: false },
    documents: { view: true, create: true, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false }
  },
  [OrganizationRole.VIEWER]: {
    projects: { view: true, create: false, edit: false, delete: false },
    grants: { view: true, create: false, edit: false, delete: false },
    finance: { view: true, create: false, edit: false, delete: false },
    meal: { view: true, create: false, edit: false, delete: false },
    surveys: { view: true, create: false, edit: false, delete: false },
    cases: { view: true, create: false, edit: false, delete: false },
    documents: { view: true, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false }
  }
};
