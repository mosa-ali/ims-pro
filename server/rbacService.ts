/**
 * ============================================================================
 * CENTRAL RBAC PERMISSION SERVICE (Enhanced Multi-Level Model)
 * ============================================================================
 * 
 * Hierarchical RBAC permission structure:
 *   Organization
 *     └── Role
 *          └── Module Access (Level 1)
 *               └── Workspace / Screen Access (Level 2)
 *                    └── Feature / Tab Access (Level 3)
 *                         └── Action Permissions (view, create, edit, delete, export, approve, submit)
 * 
 * Core Governance Rule:
 *   Module Access ≠ Workspace / Tab Access
 *   Granting a user permission to a module (e.g., Projects) must NOT automatically
 *   grant access to sensitive internal workspaces such as Case Management, Surveys, CRM.
 * 
 * Sensitive Workspaces (require explicit permission):
 *   - Case Management (GBV survivor data, protection referrals, PSS case files)
 *   - Surveys (data collection, sensitive beneficiary data)
 *   - Accountability & CRM (complaint mechanisms, feedback data)
 *   - HR Sanctions & Disciplinary (sensitive staff records)
 *   - Beneficiary Records (PII data)
 * ============================================================================
 */

import { getDb } from "./db";
import { rbacRoles, rbacUserPermissions, users, auditLogs, userPermissionOverrides } from "../drizzle/schema";
import { eq, and, lte, or, isNull } from "drizzle-orm";

// ============================================================================
// TYPES
// ============================================================================

export type PermissionAction = "view" | "create" | "edit" | "delete" | "export" | "approve" | "submit";

export const ALL_ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete", "export", "approve", "submit"];
export const BASIC_ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete"];
export const EXTENDED_ACTIONS: PermissionAction[] = ["export", "approve", "submit"];

export interface ActionPermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export?: boolean;
  approve?: boolean;
  submit?: boolean;
}

export interface RolePermissions {
  [moduleId: string]: ActionPermissions;
}

export interface ScreenPermissions {
  [moduleId: string]: {
    [screenId: string]: ActionPermissions;
  };
}

export interface TabPermissions {
  [moduleId: string]: {
    [screenId: string]: {
      [tabId: string]: ActionPermissions;
    };
  };
}

export interface PermissionOverride {
  id: number;
  moduleId: string;
  screenId: string | null;
  action: string;
  overrideType: 'grant' | 'revoke';
  reason: string | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdBy: number;
  createdAt: Date;
}

export interface EffectivePermissions {
  userId: number;
  organizationId: number;
  roleId: number | null;
  roleName: string | null;
  modules: RolePermissions;
  screens: ScreenPermissions;
  tabs: TabPermissions;
  isActive: boolean;
  overrides?: PermissionOverride[];
}

// ============================================================================
// SENSITIVE WORKSPACE DEFINITIONS
// ============================================================================

/**
 * Workspaces that require EXPLICIT permission and are NOT inherited from module access.
 * These contain protection-sensitive data (GBV, PII, safeguarding records).
 */
export const SENSITIVE_WORKSPACES: Array<{
  moduleId: string;
  screenId: string;
  name: string;
  nameAr: string;
  reason: string;
}> = [
  {
    moduleId: "cases",
    screenId: "cases_list",
    name: "Case Management",
    nameAr: "إدارة الحالات",
    reason: "Contains GBV survivor data, protection referrals, PSS case files",
  },
  {
    moduleId: "cases",
    screenId: "referrals",
    name: "Referral Pathways",
    nameAr: "مسارات الإحالة",
    reason: "Contains protection referral records",
  },
  {
    moduleId: "surveys",
    screenId: "survey_builder",
    name: "Survey Builder",
    nameAr: "منشئ الاستبيانات",
    reason: "Contains sensitive data collection instruments",
  },
  {
    moduleId: "surveys",
    screenId: "data_collection",
    name: "Survey Data Collection",
    nameAr: "جمع بيانات الاستبيانات",
    reason: "Contains personally identifiable beneficiary information",
  },
  {
    moduleId: "meal",
    screenId: "accountability",
    name: "Accountability & CRM",
    nameAr: "المساءلة وإدارة العلاقات",
    reason: "Contains complaint mechanisms and sensitive feedback data",
  },
  {
    moduleId: "meal",
    screenId: "surveys",
    name: "MEAL Surveys",
    nameAr: "استبيانات القياس والتقييم",
    reason: "Contains sensitive monitoring data",
  },
  {
    moduleId: "hr",
    screenId: "sanctions",
    name: "Sanctions & Disciplinary",
    nameAr: "العقوبات والتأديب",
    reason: "Contains sensitive staff disciplinary records",
  },
  {
    moduleId: "hr",
    screenId: "documents",
    name: "HR Documents",
    nameAr: "مستندات الموارد البشرية",
    reason: "Contains sensitive staff documents",
  },
];

/**
 * Check if a screen is a sensitive workspace
 */
export function isSensitiveWorkspace(moduleId: string, screenId: string): boolean {
  return SENSITIVE_WORKSPACES.some(w => w.moduleId === moduleId && w.screenId === screenId);
}

// ============================================================================
// MODULE DEFINITIONS (Central Registry)
// ============================================================================

export interface ModuleDefinition {
  id: string;
  name: string;
  nameAr: string;
  icon?: string;
  /** If true, the entire module is considered sensitive */
  isSensitive?: boolean;
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  { id: "grants", name: "Grants", nameAr: "المنح" },
  { id: "projects", name: "Projects", nameAr: "المشاريع" },
  { id: "finance", name: "Finance", nameAr: "المالية" },
  { id: "hr", name: "Human Resources", nameAr: "الموارد البشرية" },
  { id: "meal", name: "MEAL", nameAr: "القياس والتقييم" },
  { id: "surveys", name: "Surveys", nameAr: "الاستبيانات", isSensitive: true },
  { id: "cases", name: "Case Management", nameAr: "إدارة الحالات", isSensitive: true },
  { id: "documents", name: "Documents", nameAr: "المستندات" },
  { id: "logistics", name: "Logistics", nameAr: "اللوجستيات" },
  { id: "donors", name: "Donor CRM", nameAr: "إدارة المانحين" },
  { id: "settings", name: "Settings", nameAr: "الإعدادات" },
];

export interface ScreenDefinition {
  id: string;
  name: string;
  nameAr: string;
  /** If true, requires explicit permission (not inherited from module) */
  isSensitive?: boolean;
  /** Actions available for this screen (defaults to BASIC_ACTIONS) */
  availableActions?: PermissionAction[];
}

export const SCREEN_DEFINITIONS: Record<string, ScreenDefinition[]> = {
  projects: [
    { id: "dashboard", name: "Dashboard", nameAr: "لوحة التحكم" },
    { id: "list", name: "Projects List", nameAr: "قائمة المشاريع" },
    { id: "plan", name: "Project Plan", nameAr: "خطة المشروع" },
    { id: "activities", name: "Activities", nameAr: "الأنشطة" },
    { id: "indicators", name: "Indicators", nameAr: "المؤشرات" },
    { id: "financial_overview", name: "Financial Overview", nameAr: "النظرة المالية" },
    { id: "forecast_plan", name: "Forecast Plan", nameAr: "خطة التوقعات" },
    { id: "procurement_plan", name: "Procurement Plan", nameAr: "خطة المشتريات" },
    { id: "task_management", name: "Task Management", nameAr: "إدارة المهام" },
    { id: "beneficiaries", name: "Beneficiaries", nameAr: "المستفيدون", isSensitive: true },
    { id: "case_management", name: "Case Management", nameAr: "إدارة الحالات", isSensitive: true, availableActions: ["view", "create", "edit", "delete", "export"] },
    { id: "surveys", name: "Surveys", nameAr: "الاستبيانات", isSensitive: true, availableActions: ["view", "create", "edit", "delete", "submit", "export"] },
    { id: "reports", name: "Project Reports", nameAr: "تقارير المشاريع", availableActions: ["view", "export"] },
  ],
  meal: [
    { id: "indicators", name: "Indicators Tracking", nameAr: "تتبع المؤشرات" },
    { id: "surveys", name: "Surveys & Data Collection", nameAr: "الاستبيانات وجمع البيانات", isSensitive: true, availableActions: ["view", "create", "edit", "delete", "submit", "export"] },
    { id: "accountability", name: "Accountability & CRM", nameAr: "المساءلة وإدارة العلاقات", isSensitive: true, availableActions: ["view", "create", "edit", "delete", "export"] },
    { id: "reports", name: "MEAL Reports", nameAr: "تقارير القياس والتقييم", availableActions: ["view", "export"] },
    { id: "evaluation", name: "Evaluation Studies", nameAr: "دراسات التقييم" },
    { id: "learning", name: "Learning & KM", nameAr: "التعلم وإدارة المعرفة" },
    { id: "dqa", name: "DQA", nameAr: "ضمان جودة البيانات" },
    { id: "meal_settings", name: "MEAL Settings", nameAr: "إعدادات القياس والتقييم" },
  ],
  finance: [
    { id: "chart_of_accounts", name: "Chart of Accounts", nameAr: "دليل الحسابات" },
    { id: "budgets", name: "Budgets", nameAr: "الميزانيات", availableActions: ["view", "create", "edit", "delete", "approve", "export"] },
    { id: "expenditures", name: "Expenditures", nameAr: "النفقات", availableActions: ["view", "create", "edit", "delete", "approve", "export"] },
    { id: "treasury", name: "Treasury", nameAr: "الخزينة", availableActions: ["view", "create", "edit", "delete", "approve"] },
    { id: "advances", name: "Advances", nameAr: "السلف", availableActions: ["view", "create", "edit", "delete", "approve"] },
    { id: "assets", name: "Assets", nameAr: "الأصول" },
    { id: "payments", name: "Payments", nameAr: "المدفوعات", availableActions: ["view", "create", "edit", "delete", "approve", "export"] },
    { id: "journal_entries", name: "Journal Entries", nameAr: "القيود اليومية", availableActions: ["view", "create", "edit", "delete", "approve"] },
    { id: "reports", name: "Financial Reports", nameAr: "التقارير المالية", availableActions: ["view", "export"] },
    { id: "finance_settings", name: "Finance Settings", nameAr: "إعدادات المالية" },
  ],
  hr: [
    { id: "employees", name: "Employees", nameAr: "الموظفون" },
    { id: "leave", name: "Leave Management", nameAr: "إدارة الإجازات", availableActions: ["view", "create", "edit", "delete", "approve"] },
    { id: "attendance", name: "Attendance", nameAr: "الحضور" },
    { id: "payroll", name: "Payroll", nameAr: "الرواتب", isSensitive: true, availableActions: ["view", "create", "edit", "delete", "approve", "export"] },
    { id: "recruitment", name: "Recruitment", nameAr: "التوظيف", availableActions: ["view", "create", "edit", "delete", "approve"] },
    { id: "documents", name: "HR Documents", nameAr: "مستندات الموارد البشرية", isSensitive: true },
    { id: "sanctions", name: "Sanctions & Disciplinary", nameAr: "العقوبات والتأديب", isSensitive: true, availableActions: ["view", "create", "edit", "delete", "export"] },
    { id: "reports", name: "HR Reports", nameAr: "تقارير الموارد البشرية", availableActions: ["view", "export"] },
  ],
  cases: [
    { id: "cases_list", name: "Cases List", nameAr: "قائمة الحالات", isSensitive: true, availableActions: ["view", "create", "edit", "delete", "export"] },
    { id: "referrals", name: "Referral Pathways", nameAr: "مسارات الإحالة", isSensitive: true, availableActions: ["view", "create", "edit", "delete", "export"] },
    { id: "closure", name: "Case Closure", nameAr: "إغلاق الحالات", isSensitive: true, availableActions: ["view", "create", "edit", "approve"] },
  ],
  surveys: [
    { id: "survey_builder", name: "Survey Builder", nameAr: "منشئ الاستبيانات", availableActions: ["view", "create", "edit", "delete"] },
    { id: "data_collection", name: "Data Collection", nameAr: "جمع البيانات", isSensitive: true, availableActions: ["view", "create", "edit", "delete", "submit", "export"] },
    { id: "analysis", name: "Analysis & Reports", nameAr: "التحليل والتقارير", availableActions: ["view", "export"] },
  ],
  logistics: [
    { id: "procurement", name: "Procurement", nameAr: "المشتريات", availableActions: ["view", "create", "edit", "delete", "approve"] },
    { id: "inventory", name: "Inventory", nameAr: "المخزون" },
    { id: "fleet", name: "Fleet Management", nameAr: "إدارة الأسطول" },
    { id: "distribution", name: "Distribution", nameAr: "التوزيع" },
  ],
  donors: [
    { id: "contacts", name: "Contacts", nameAr: "جهات الاتصال" },
    { id: "communications", name: "Communications", nameAr: "المراسلات" },
    { id: "reports", name: "Donor Reports", nameAr: "تقارير المانحين", availableActions: ["view", "export"] },
  ],
};

// ============================================================================
// DEFAULT ROLE TEMPLATES (Enhanced with workspace-level permissions)
// ============================================================================

const NO_ACCESS: ActionPermissions = { view: false, create: false, edit: false, delete: false, export: false, approve: false, submit: false };
const VIEW_ONLY: ActionPermissions = { view: true, create: false, edit: false, delete: false, export: false, approve: false, submit: false };
const FULL_ACCESS: ActionPermissions = { view: true, create: true, edit: true, delete: true, export: true, approve: true, submit: true };
const STANDARD_ACCESS: ActionPermissions = { view: true, create: true, edit: true, delete: false, export: true, approve: false, submit: true };

export const DEFAULT_ROLE_TEMPLATES: Array<{
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  isSystem: boolean;
  isLocked: boolean;
  permissions: RolePermissions;
  screenPermissions: ScreenPermissions;
}> = [
  {
    name: "Organization Admin",
    nameAr: "مسؤول المنظمة",
    description: "Full access to all modules, workspaces, and settings. Can manage users and permissions.",
    descriptionAr: "وصول كامل لجميع الوحدات ومساحات العمل والإعدادات. يمكنه إدارة المستخدمين والصلاحيات.",
    isSystem: true,
    isLocked: true,
    permissions: Object.fromEntries(
      MODULE_DEFINITIONS.map(m => [m.id, { ...FULL_ACCESS }])
    ),
    screenPermissions: Object.fromEntries(
      Object.entries(SCREEN_DEFINITIONS).map(([moduleId, screens]) => [
        moduleId,
        Object.fromEntries(screens.map(s => [s.id, { ...FULL_ACCESS }]))
      ])
    ),
  },
  {
    name: "Program Manager",
    nameAr: "مدير البرنامج",
    description: "Manages grants, projects, and program activities. Full access to Case Management and Surveys.",
    descriptionAr: "إدارة المنح والمشاريع وأنشطة البرنامج. وصول كامل لإدارة الحالات والاستبيانات.",
    isSystem: true,
    isLocked: false,
    permissions: {
      grants: { ...STANDARD_ACCESS },
      projects: { ...FULL_ACCESS },
      finance: { ...VIEW_ONLY },
      hr: { ...NO_ACCESS },
      meal: { ...FULL_ACCESS },
      surveys: { ...FULL_ACCESS },
      cases: { ...FULL_ACCESS },
      documents: { ...STANDARD_ACCESS },
      logistics: { ...VIEW_ONLY },
      donors: { ...VIEW_ONLY },
      settings: { ...NO_ACCESS },
    },
    screenPermissions: {
      projects: {
        case_management: { ...FULL_ACCESS },
        surveys: { ...FULL_ACCESS },
        beneficiaries: { ...STANDARD_ACCESS },
      },
      meal: {
        surveys: { ...FULL_ACCESS },
        accountability: { ...FULL_ACCESS },
      },
    },
  },
  {
    name: "Finance Manager",
    nameAr: "مدير المالية",
    description: "Full access to financial data, budgets, and expenditures. No access to Case Management or Surveys.",
    descriptionAr: "وصول كامل للبيانات المالية والميزانيات والنفقات. بدون وصول لإدارة الحالات أو الاستبيانات.",
    isSystem: true,
    isLocked: false,
    permissions: {
      grants: { ...VIEW_ONLY },
      projects: { ...VIEW_ONLY },
      finance: { ...FULL_ACCESS },
      hr: { ...NO_ACCESS },
      meal: { ...VIEW_ONLY },
      surveys: { ...NO_ACCESS },
      cases: { ...NO_ACCESS },
      documents: { ...STANDARD_ACCESS },
      logistics: { ...STANDARD_ACCESS },
      donors: { ...NO_ACCESS },
      settings: { ...NO_ACCESS },
    },
    screenPermissions: {
      projects: {
        case_management: { ...NO_ACCESS },
        surveys: { ...NO_ACCESS },
        beneficiaries: { ...NO_ACCESS },
      },
      meal: {
        surveys: { ...NO_ACCESS },
        accountability: { ...NO_ACCESS },
      },
    },
  },
  {
    name: "MEAL Officer",
    nameAr: "مسؤول القياس والتقييم",
    description: "Full access to MEAL, Surveys, Accountability & CRM, and Case Management.",
    descriptionAr: "وصول كامل للقياس والتقييم والاستبيانات والمساءلة وإدارة الحالات.",
    isSystem: true,
    isLocked: false,
    permissions: {
      grants: { ...VIEW_ONLY },
      projects: { ...VIEW_ONLY },
      finance: { ...NO_ACCESS },
      hr: { ...NO_ACCESS },
      meal: { ...FULL_ACCESS },
      surveys: { ...FULL_ACCESS },
      cases: { ...FULL_ACCESS },
      documents: { ...STANDARD_ACCESS },
      logistics: { ...NO_ACCESS },
      donors: { ...NO_ACCESS },
      settings: { ...NO_ACCESS },
    },
    screenPermissions: {
      projects: {
        case_management: { ...FULL_ACCESS },
        surveys: { ...FULL_ACCESS },
        beneficiaries: { ...VIEW_ONLY },
      },
      meal: {
        surveys: { ...FULL_ACCESS },
        accountability: { ...FULL_ACCESS },
      },
    },
  },
  {
    name: "Case Worker",
    nameAr: "أخصائي الحالات",
    description: "Manages individual cases and beneficiary support. Full Case Management access, limited Surveys.",
    descriptionAr: "إدارة الحالات الفردية ودعم المستفيدين. وصول كامل لإدارة الحالات، محدود للاستبيانات.",
    isSystem: true,
    isLocked: false,
    permissions: {
      grants: { ...NO_ACCESS },
      projects: { ...VIEW_ONLY },
      finance: { ...NO_ACCESS },
      hr: { ...NO_ACCESS },
      meal: { ...NO_ACCESS },
      surveys: { ...VIEW_ONLY, submit: true },
      cases: { ...FULL_ACCESS },
      documents: { ...STANDARD_ACCESS },
      logistics: { ...NO_ACCESS },
      donors: { ...NO_ACCESS },
      settings: { ...NO_ACCESS },
    },
    screenPermissions: {
      projects: {
        case_management: { ...FULL_ACCESS },
        surveys: { ...VIEW_ONLY, submit: true },
        beneficiaries: { ...VIEW_ONLY },
      },
      meal: {
        surveys: { ...VIEW_ONLY },
        accountability: { ...NO_ACCESS },
      },
    },
  },
  {
    name: "Food Security Officer",
    nameAr: "مسؤول الأمن الغذائي",
    description: "Full project access, view-only MEAL, no Case Management or CRM access.",
    descriptionAr: "وصول كامل للمشاريع، عرض فقط للقياس والتقييم، بدون وصول لإدارة الحالات أو إدارة العلاقات.",
    isSystem: true,
    isLocked: false,
    permissions: {
      grants: { ...VIEW_ONLY },
      projects: { ...FULL_ACCESS },
      finance: { ...VIEW_ONLY },
      hr: { ...NO_ACCESS },
      meal: { ...VIEW_ONLY },
      surveys: { ...VIEW_ONLY },
      cases: { ...NO_ACCESS },
      documents: { ...STANDARD_ACCESS },
      logistics: { ...VIEW_ONLY },
      donors: { ...NO_ACCESS },
      settings: { ...NO_ACCESS },
    },
    screenPermissions: {
      projects: {
        case_management: { ...NO_ACCESS },
        surveys: { ...VIEW_ONLY },
        beneficiaries: { ...VIEW_ONLY },
      },
      meal: {
        surveys: { ...VIEW_ONLY },
        accountability: { ...NO_ACCESS },
      },
    },
  },
  {
    name: "Viewer",
    nameAr: "مشاهد",
    description: "Read-only access to non-sensitive modules. No access to Case Management, Surveys, or CRM.",
    descriptionAr: "وصول للقراءة فقط للوحدات غير الحساسة. بدون وصول لإدارة الحالات أو الاستبيانات أو إدارة العلاقات.",
    isSystem: true,
    isLocked: false,
    permissions: {
      grants: { ...VIEW_ONLY },
      projects: { ...VIEW_ONLY },
      finance: { ...NO_ACCESS },
      hr: { ...NO_ACCESS },
      meal: { ...VIEW_ONLY },
      surveys: { ...NO_ACCESS },
      cases: { ...NO_ACCESS },
      documents: { ...VIEW_ONLY },
      logistics: { ...NO_ACCESS },
      donors: { ...NO_ACCESS },
      settings: { ...NO_ACCESS },
    },
    screenPermissions: {
      projects: {
        case_management: { ...NO_ACCESS },
        surveys: { ...NO_ACCESS },
        beneficiaries: { ...NO_ACCESS },
      },
      meal: {
        surveys: { ...NO_ACCESS },
        accountability: { ...NO_ACCESS },
      },
    },
  },
];

// ============================================================================
// PERMISSION SERVICE FUNCTIONS
// ============================================================================

/**
 * Get active, non-expired permission overrides for a user.
 */
export async function getUserOverrides(
  userId: number,
  organizationId: number
): Promise<PermissionOverride[]> {
  const db = await getDb();
  const now = new Date();

  const rows = await db
    .select()
    .from(userPermissionOverrides)
    .where(
      and(
        eq(userPermissionOverrides.userId, userId),
        eq(userPermissionOverrides.organizationId, organizationId),
        eq(userPermissionOverrides.isActive, true),
        or(
          isNull(userPermissionOverrides.expiresAt),
          lte(now, userPermissionOverrides.expiresAt!)
        )
      )
    );

  return rows.map(r => ({
    id: r.id,
    moduleId: r.moduleId,
    screenId: r.screenId,
    action: r.action,
    overrideType: r.overrideType,
    reason: r.reason,
    expiresAt: r.expiresAt,
    isActive: r.isActive,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
  }));
}

/**
 * Apply overrides to a permission set.
 * Grants add permissions, revokes remove them.
 */
function applyOverrides(
  modules: RolePermissions,
  screens: ScreenPermissions,
  overrides: PermissionOverride[]
): { modules: RolePermissions; screens: ScreenPermissions } {
  // Deep clone to avoid mutation
  const m = JSON.parse(JSON.stringify(modules)) as RolePermissions;
  const s = JSON.parse(JSON.stringify(screens)) as ScreenPermissions;

  for (const ov of overrides) {
    const action = ov.action as PermissionAction;
    const val = ov.overrideType === 'grant';

    if (ov.screenId) {
      // Screen-level override
      if (!s[ov.moduleId]) s[ov.moduleId] = {};
      if (!s[ov.moduleId][ov.screenId]) {
        s[ov.moduleId][ov.screenId] = { view: false, create: false, edit: false, delete: false };
      }
      (s[ov.moduleId][ov.screenId] as any)[action] = val;
      // If granting screen view, also ensure module view is granted
      if (val && action === 'view') {
        if (!m[ov.moduleId]) m[ov.moduleId] = { view: false, create: false, edit: false, delete: false };
        m[ov.moduleId].view = true;
      }
    } else {
      // Module-level override
      if (!m[ov.moduleId]) m[ov.moduleId] = { view: false, create: false, edit: false, delete: false };
      (m[ov.moduleId] as any)[action] = val;
    }
  }

  return { modules: m, screens: s };
}

/**
 * Get effective permissions for a user in an organization.
 * Merges role-based permissions with per-user overrides.
 * This is the ONLY function that should be used to check permissions.
 */
export async function getEffectivePermissions(
  userId: number,
  organizationId: number
): Promise<EffectivePermissions | null> {
  const db = await getDb();

  const results = await db
    .select({
      id: rbacUserPermissions.id,
      userId: rbacUserPermissions.userId,
      organizationId: rbacUserPermissions.organizationId,
      roleId: rbacUserPermissions.roleId,
      permissions: rbacUserPermissions.permissions,
      screenPermissions: rbacUserPermissions.screenPermissions,
      tabPermissions: rbacUserPermissions.tabPermissions,
      isActive: rbacUserPermissions.isActive,
    })
    .from(rbacUserPermissions)
    .where(
      and(
        eq(rbacUserPermissions.userId, userId),
        eq(rbacUserPermissions.organizationId, organizationId)
      )
    )
    .limit(1);

  if (results.length === 0) return null;

  const record = results[0];

  // Get role name if assigned
  let roleName: string | null = null;
  if (record.roleId) {
    const roleResults = await db
      .select({ name: rbacRoles.name })
      .from(rbacRoles)
      .where(eq(rbacRoles.id, record.roleId))
      .limit(1);
    roleName = roleResults[0]?.name || null;
  }

  // Get per-user overrides
  const overrides = await getUserOverrides(userId, organizationId);

  // Base permissions from role
  let modules = JSON.parse(record.permissions || "{}");
  let screens = JSON.parse(record.screenPermissions || "{}");
  const tabs = JSON.parse(record.tabPermissions || "{}");

  // Apply overrides on top of role permissions
  if (overrides.length > 0) {
    const merged = applyOverrides(modules, screens, overrides);
    modules = merged.modules;
    screens = merged.screens;
  }

  return {
    userId: record.userId,
    organizationId: record.organizationId,
    roleId: record.roleId,
    roleName,
    modules,
    screens,
    tabs,
    isActive: record.isActive ?? true,
    overrides,
  };
}

/**
 * Check if a user can access a specific module/screen/tab.
 * 
 * CRITICAL: For sensitive workspaces, screen-level permission is REQUIRED.
 * Module access alone does NOT grant access to sensitive screens.
 * 
 * Returns false if no permissions found or access denied.
 */
export async function canAccess(
  userId: number,
  organizationId: number,
  moduleId: string,
  screenId?: string,
  tabId?: string,
  action: PermissionAction = "view"
): Promise<boolean> {
  // Check if user is platform_admin (bypass all checks)
  const db = await getDb();
  const userResult = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userResult[0]?.role === "platform_admin") return true;

  const perms = await getEffectivePermissions(userId, organizationId);
  if (!perms || !perms.isActive) return false;

  // Check module-level
  const modulePerms = perms.modules[moduleId];
  if (!modulePerms || !modulePerms.view) return false; // Must have at least view at module level

  // For basic CRUD actions, check module-level permission
  if (!screenId) {
    return modulePerms[action] ?? false;
  }

  // Check screen-level if specified
  const screenDef = SCREEN_DEFINITIONS[moduleId]?.find(s => s.id === screenId);
  const isSensitive = screenDef?.isSensitive || isSensitiveWorkspace(moduleId, screenId);

  if (isSensitive) {
    // SENSITIVE WORKSPACE: Requires EXPLICIT screen-level permission
    // Module access alone does NOT grant access
    const screenPerms = perms.screens?.[moduleId]?.[screenId];
    if (!screenPerms || !screenPerms.view) return false;
    return screenPerms[action] ?? false;
  } else {
    // Non-sensitive screen: Check screen-level if defined, otherwise inherit from module
    const screenPerms = perms.screens?.[moduleId]?.[screenId];
    if (screenPerms) {
      if (!screenPerms[action]) return false;
    } else {
      // Inherit from module
      if (!modulePerms[action]) return false;
    }
  }

  // Check tab-level if specified
  if (tabId && screenId) {
    const tabPerms = perms.tabs?.[moduleId]?.[screenId]?.[tabId];
    if (tabPerms && !tabPerms[action]) return false;
  }

  return true;
}

/**
 * Log access to a sensitive workspace for audit trail.
 */
export async function logSensitiveAccess(
  userId: number,
  organizationId: number,
  operatingUnitId: number | null,
  action: string,
  moduleId: string,
  screenId?: string,
  entityType?: string,
  entityId?: number,
  details?: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  try {
    const db = await getDb();
    await db.insert(auditLogs).values({
      userId,
      organizationId,
      operatingUnitId,
      action: `rbac.${action}`,
      entityType: entityType || `${moduleId}${screenId ? `.${screenId}` : ''}`,
      entityId,
      details: details || JSON.stringify({ moduleId, screenId, action }),
      ipAddress,
      userAgent,
    });
  } catch (error) {
    // Audit logging should never block the main operation
    console.error("[RBAC Audit] Failed to log access:", error);
  }
}

/**
 * Initialize default roles for an organization.
 * Called when setting up RBAC for the first time.
 */
export async function initializeDefaultRoles(organizationId: number, createdBy: number) {
  const db = await getDb();

  // Check if roles already exist
  const existing = await db
    .select({ id: rbacRoles.id })
    .from(rbacRoles)
    .where(eq(rbacRoles.organizationId, organizationId))
    .limit(1);

  if (existing.length > 0) return; // Already initialized

  for (const template of DEFAULT_ROLE_TEMPLATES) {
    await db.insert(rbacRoles).values({
      organizationId,
      name: template.name,
      nameAr: template.nameAr,
      description: template.description,
      descriptionAr: template.descriptionAr,
      permissions: JSON.stringify(template.permissions),
      isSystem: template.isSystem,
      isLocked: template.isLocked,
      createdBy,
    });
  }
}

/**
 * Build a default permission set for a new user based on a role template.
 * Includes both module-level and screen-level permissions.
 */
export function buildPermissionsFromTemplate(template: typeof DEFAULT_ROLE_TEMPLATES[0]) {
  return {
    permissions: JSON.stringify(template.permissions),
    screenPermissions: JSON.stringify(template.screenPermissions || {}),
    tabPermissions: JSON.stringify({}),
  };
}

/**
 * Get the full permission tree structure for the RBAC admin UI.
 * Returns modules with their screens and available actions.
 */
export function getPermissionTree() {
  return MODULE_DEFINITIONS.map(mod => ({
    id: mod.id,
    name: mod.name,
    nameAr: mod.nameAr,
    isSensitive: mod.isSensitive || false,
    actions: ALL_ACTIONS,
    screens: (SCREEN_DEFINITIONS[mod.id] || []).map(screen => ({
      id: screen.id,
      name: screen.name,
      nameAr: screen.nameAr,
      isSensitive: screen.isSensitive || false,
      availableActions: screen.availableActions || BASIC_ACTIONS,
    })),
  }));
}
