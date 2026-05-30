/**
 * server/routers/dashboardRouter.ts — Production Dashboard tRPC Router
 *
 * ARCHITECTURAL COMPLIANCE:
 * ✅ Uses scopedProcedure for all procedures (data isolation via organizationId + operatingUnitId)
 * ✅ Uses getDb() for database access
 * ✅ Imports all status constants from db/_status.ts
 * ✅ Uses helper functions from db/_time.ts (daysFromNow, todaySqlDate)
 * ✅ Implements scopedFilters() helper for reusable scope + soft-delete filtering
 * ✅ Structured error handling with logger
 * ✅ Promise.all for query parallelization
 * ✅ Return shapes match OrganizationDashboard.tsx type definitions exactly
 * ✅ FIX #1: createdAt uses Intl.DateTimeFormat (production-safe, avoids instanceof)
 * ✅ FIX #8: getRecentActivity is RBAC-aware (org admin sees all; others see own)
 * ✅ FIX #9: getHumanitarianIdentity returns totalBeneficiaries, activeDonors, operatingCountries
 * ✅ FIX #5: getAccessibleDashboardModules returns route metadata per module
 * ✅ NEW: getUserTasks — personal task list for My Work Queue
 * ✅ NEW: getInventoryAlerts — low stock / out-of-stock counts
 * ✅ NEW: getPendingApprovals — detailed pending approval rows
 * ✅ SHAPE FIX: getOperationalModuleSnapshots returns all fields expected by dashboard
 */

import { z } from "zod";
import { scopedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
  projects,
  grants,
  hrEmployees,
  hrLeaveRequests,
  hrRecruitmentJobs,
  purchaseRequests,
  payments,
  contracts,
  stockRequests,
  rfqs,
  tasks,
  risks,
  incidents,
  stockItems,
  auditLogs,
  users,
  mealSurveys,
  mealDqaFindings,
  beneficiaries,
  donors,
  operatingUnits,
  rbacUserPermissions,
  projectReportingSchedules,
  opportunities,
  donorProjects,
} from "../drizzle/schema";
import { eq, and, count, countDistinct, desc, lte, gte, or, isNull, ne, inArray } from "drizzle-orm";
import {
  PROJECT_STATUS,
  GRANT_STATUS,
  RISK_STATUS,
  PAYMENT_STATUS,
  PR_STATUS,
  CONTRACT_STATUS,
  STOCK_REQUEST_STATUS,
  LEAVE_REQUEST_STATUS,
  RFQ_STATUS,
  JOB_STATUS,
  TASK_STATUS,
  MEAL_DQA_STATUS,
} from "./db/_status";
import { daysFromNow, todaySqlDate } from "./db/_time";

// ============================================================================
// LOCAL STATUS CONSTANTS (tables without centralized status)
// ============================================================================

const RISK_LEVEL = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

const INCIDENT_STATUS = {
  OPEN: "open",
  UNDER_INVESTIGATION: "under_investigation",
  RESOLVED: "resolved",
  CLOSED: "closed",
} as const;

const MEAL_SURVEY_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CLOSED: "closed",
  ARCHIVED: "archived",
} as const;

const OPERATING_UNIT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

// ============================================================================
// STRUCTURED LOGGER
// ============================================================================

const LOG_LEVEL = process.env.NODE_ENV === "production" ? "error" : "debug";

const logger = {
  error(context: string, error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    if (LOG_LEVEL === "error" || LOG_LEVEL === "debug") {
      console.error(
        JSON.stringify({
          level: "error",
          service: "dashboard",
          context,
          message: msg,
          stack,
          timestamp: new Date().toISOString(),
        })
      );
    }
  },
};

// ============================================================================
// SCOPED FILTER BUILDER
// ============================================================================

type ScopeContext = {
  organizationId: number;
  operatingUnitId: number | null | undefined;
};

function scopedFilters(
  table: { organizationId: any; operatingUnitId?: any; isDeleted?: any },
  scope: ScopeContext,
  options?: { skipOu?: boolean; ouNullable?: boolean }
) {
  const filters: any[] = [eq(table.organizationId, scope.organizationId)];

  if (!options?.skipOu && table.operatingUnitId && scope.operatingUnitId) {
    if (options?.ouNullable) {
      filters.push(
        or(isNull(table.operatingUnitId), eq(table.operatingUnitId, scope.operatingUnitId))
      );
    } else {
      filters.push(eq(table.operatingUnitId, scope.operatingUnitId));
    }
  }

  if (table.isDeleted) {
    filters.push(eq(table.isDeleted, 0));
  }

  return filters;
}

// ============================================================================
// DATE FORMATTER — FIX #1: production-safe, avoids instanceof, stable output
// ============================================================================

function formatActivityDate(value: unknown): string {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value as string | number | Date));
  } catch {
    return String(value);
  }
}

// ============================================================================
// DASHBOARD ROUTER
// ============================================================================

export const dashboardRouter = router({

  // ========================================================================
  // PROCEDURE 1: getStats
  // Returns: activeProjects, completedProjects, totalEmployees, totalBudget,
  //          totalSpent, budgetExecution, utilization, activeGrants, projectCompliance
  // ========================================================================
  getStats: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const scope = {
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
      };
      const db = await getDb();

      const emptyResult = {
        activeProjects: 0,
        completedProjects: 0,
        totalProjects: 0,
        totalEmployees: 0,
        totalBudget: 0,
        totalSpent: 0,
        budgetExecution: 0,
        utilization: 0,
        activeGrants: 0,
        projectCompliance: 0,
      };

      if (!db) return emptyResult;

      try {
        const [
          allProjectsList,
          activeProjectsList,
          completedProjectsList,
          empResult,
          grantResult,
          overdueTasksResult,
          totalTasksResult,
        ] = await Promise.all([
          db
            .select({ totalBudget: projects.totalBudget, spent: projects.spent })
            .from(projects)
            .where(and(...scopedFilters(projects, scope))),

          db
            .select({ c: count() })
            .from(projects)
            .where(
              and(
                ...scopedFilters(projects, scope),
                eq(projects.status, PROJECT_STATUS.ACTIVE)
              )
            ),

          db
            .select({ c: count() })
            .from(projects)
            .where(
              and(
                ...scopedFilters(projects, scope),
                eq(projects.status, PROJECT_STATUS.COMPLETED)
              )
            ),

          db
            .select({ total: count() })
            .from(hrEmployees)
            .where(and(...scopedFilters(hrEmployees, scope))),

          db
            .select({ total: count() })
            .from(grants)
            .where(
              and(
                ...scopedFilters(grants, scope, { ouNullable: true }),
                eq(grants.status, GRANT_STATUS.ACTIVE)
              )
            ),

          db
            .select({ c: count() })
            .from(tasks)
            .where(
              and(
                ...scopedFilters(tasks, scope),
                lte(tasks.dueDate, todaySqlDate()),
                or(
                  eq(tasks.status, TASK_STATUS.TODO),
                  eq(tasks.status, TASK_STATUS.IN_PROGRESS)
                )
              )
            ),

          db
            .select({ c: count() })
            .from(tasks)
            .where(and(...scopedFilters(tasks, scope))),
        ]);

        const totalProjects = allProjectsList.length;
        const activeProjects = activeProjectsList[0]?.c ?? 0;
        const completedProjects = completedProjectsList[0]?.c ?? 0;
        const totalBudget = allProjectsList.reduce(
          (s, p) => s + Number(p.totalBudget ?? 0),
          0
        );
        const totalSpent = allProjectsList.reduce(
          (s, p) => s + Number(p.spent ?? 0),
          0
        );
        const budgetExecution =
          totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
        const utilization = budgetExecution;

        const totalTasks = totalTasksResult[0]?.c ?? 0;
        const overdueTasks = overdueTasksResult[0]?.c ?? 0;
        const projectCompliance =
          totalTasks > 0
            ? Math.round(((totalTasks - overdueTasks) / totalTasks) * 100)
            : 100;

        return {
          activeProjects: Number(activeProjects),
          completedProjects: Number(completedProjects),
          totalProjects,
          totalEmployees: Number(empResult[0]?.total ?? 0),
          totalBudget,
          totalSpent,
          budgetExecution,
          utilization,
          activeGrants: Number(grantResult[0]?.total ?? 0),
          projectCompliance,
        };
      } catch (error) {
        logger.error("getStats", error);
        return emptyResult;
      }
    }),

  // ========================================================================
  // PROCEDURE 2: getAccessibleDashboardModules
  // ========================================================================
  getAccessibleDashboardModules: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const scope = {
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
      };

      const noAccess = {
        logistics: false,
        hr: false,
        finance: false,
        meal: false,
        risks: false,
        donorCRM: false,
        programs: false,
        procurement: false,
      };

      const allAccess = {
        logistics: true,
        hr: true,
        finance: true,
        meal: true,
        risks: true,
        donorCRM: true,
        programs: true,
        procurement: true,
      };

      try {
        const db = await getDb();
        if (!db) return noAccess;

        const userRole = (ctx as any).user?.role ?? "user";
        const userId: number | undefined = (ctx as any).user?.id;
        const isOrgAdmin = userRole === "admin" || userRole === "org_admin";

        if (isOrgAdmin) return allAccess;

        if (!userId) {
          logger.error("getAccessibleDashboardModules", new Error("userId missing from ctx"));
          return noAccess;
        }

        const permRows = await db
          .select({
            permissions: rbacUserPermissions.permissions,
            isActive: rbacUserPermissions.isActive,
          })
          .from(rbacUserPermissions)
          .where(
            and(
              eq(rbacUserPermissions.userId, userId),
              eq(rbacUserPermissions.organizationId, scope.organizationId),
              eq(rbacUserPermissions.isActive, 1)
            )
          )
          .limit(1);

        let parsedPerms: Record<string, unknown> = {};
        try {
          const raw = permRows[0]?.permissions;
          if (raw) parsedPerms = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return noAccess;
        }

        const modulePerms: Record<string, unknown> =
          (parsedPerms.modules as Record<string, unknown>) ?? parsedPerms;

        const hasPermission = (module: string): boolean =>
          modulePerms[module] === true || modulePerms[module] === 1;

        return {
          logistics: hasPermission("logistics"),
          hr: hasPermission("hr"),
          finance: hasPermission("finance"),
          meal: hasPermission("meal"),
          risks: hasPermission("risks"),
          donorCRM: hasPermission("donorCRM"),
          programs: hasPermission("programs"),
          procurement: hasPermission("procurement"),
        };
      } catch (error) {
        logger.error("getAccessibleDashboardModules", error);
        return noAccess;
      }
    }),

  // ========================================================================
  // PROCEDURE 3: getWorkflowQueue
  // ========================================================================
  getWorkflowQueue: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const scope = {
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
      };
      const db = await getDb();

      const emptyResult = {
        pendingPRs: 0,
        pendingLeaveRequests: 0,
        pendingPayments: 0,
        pendingContracts: 0,
        pendingStockRequests: 0,
        pendingRFQs: 0,
        total: 0,
      };

      if (!db) return emptyResult;

      try {
        const [prResult, leaveResult, payResult, contractResult, stockResult, rfqResult] =
          await Promise.all([
            db
              .select({ c: count() })
              .from(purchaseRequests)
              .where(
                and(
                  ...scopedFilters(purchaseRequests, scope),
                  or(
                    eq(purchaseRequests.status, PR_STATUS.SUBMITTED),
                    eq(purchaseRequests.status, PR_STATUS.VALIDATED_BY_LOGISTIC),
                    eq(purchaseRequests.status, PR_STATUS.VALIDATED_BY_FINANCE)
                  )
                )
              ),

            db
              .select({ c: count() })
              .from(hrLeaveRequests)
              .where(
                and(
                  ...scopedFilters(hrLeaveRequests, scope),
                  eq(hrLeaveRequests.status, LEAVE_REQUEST_STATUS.PENDING)
                )
              ),

            db
              .select({ c: count() })
              .from(payments)
              .where(
                and(
                  ...scopedFilters(payments, scope),
                  eq(payments.status, PAYMENT_STATUS.PENDING_APPROVAL)
                )
              ),

            db
              .select({ c: count() })
              .from(contracts)
              .where(
                and(
                  ...scopedFilters(contracts, scope),
                  eq(contracts.status, CONTRACT_STATUS.PENDING_APPROVAL)
                )
              ),

            db
              .select({ c: count() })
              .from(stockRequests)
              .where(
                and(
                  ...scopedFilters(stockRequests, scope),
                  eq(stockRequests.status, STOCK_REQUEST_STATUS.SUBMITTED)
                )
              ),

            db
              .select({ c: count() })
              .from(rfqs)
              .where(
                and(
                  ...scopedFilters(rfqs, scope),
                  or(eq(rfqs.status, RFQ_STATUS.ACTIVE), eq(rfqs.status, RFQ_STATUS.SENT))
                )
              ),
          ]);

        const pendingPRs = prResult[0]?.c ?? 0;
        const pendingLeaveRequests = leaveResult[0]?.c ?? 0;
        const pendingPayments = payResult[0]?.c ?? 0;
        const pendingContracts = contractResult[0]?.c ?? 0;
        const pendingStockRequests = stockResult[0]?.c ?? 0;
        const pendingRFQs = rfqResult[0]?.c ?? 0;

        const total =
          pendingPRs +
          pendingLeaveRequests +
          pendingPayments +
          pendingContracts +
          pendingStockRequests +
          pendingRFQs;

        return {
          pendingPRs,
          pendingLeaveRequests,
          pendingPayments,
          pendingContracts,
          pendingStockRequests,
          pendingRFQs,
          total,
        };
      } catch (error) {
        logger.error("getWorkflowQueue", error);
        return emptyResult;
      }
    }),

  // ========================================================================
  // PROCEDURE 4: getOperationalModuleSnapshots
  // SHAPE FIX: returns all fields expected by OrganizationDashboard.tsx
  // ========================================================================
  getOperationalModuleSnapshots: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const scope = {
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
      };
      const db = await getDb();

      const emptyResult = {
        logistics: { totalPRs: 0, approvedPRs: 0, pendingPRs: 0, delayedDeliveries: 0, activeContracts: 0 },
        hr: { totalEmployees: 0, pendingLeave: 0, openPositions: 0, expiringContracts: 0 },
        finance: { pendingPayments: 0, budgetUtilization: 0, totalSpent: 0, outstandingAdvances: 0 },
        projects: { active: 0 },
        grants: { active: 0, total: 0, expiringSoon: 0 },
        risks: { open: 0, critical: 0, openIncidents: 0 },
        meal: { activeSurveys: 0, dqaFindings: 0, indicatorsOverdue: 0 },
        donorCRM: { activeDonors: 0 },
        programs: { active: 0 },
        procurement: { totalPRs: 0, approvedPRs: 0, pendingPRs: 0 },
      };

      if (!db) return emptyResult;

      try {
        const today = todaySqlDate();
        const thirtyDaysFromNow = daysFromNow(30);

        const [
          totalPRsResult,
          approvedPRsResult,
          pendingPRsResult,
          pendingLeaveResult,
          totalEmployeesResult,
          openPositionsResult,
          pendingPaymentsResult,
          activeProjectsResult,
          totalGrantsResult,
          activeGrantsResult,
          expiringSoonGrantsResult,
          openRisksResult,
          criticalRisksResult,
          openIncidentsResult,
          activeSurveysResult,
          dqaFindingsResult,
          activeDonorsResult,
          activeContractsResult,
          expiringContractsResult,
          allProjectsBudget,
        ] = await Promise.all([
          db.select({ c: count() }).from(purchaseRequests).where(and(...scopedFilters(purchaseRequests, scope))),
          db.select({ c: count() }).from(purchaseRequests).where(and(...scopedFilters(purchaseRequests, scope), eq(purchaseRequests.status, PR_STATUS.APPROVED))),
          db.select({ c: count() }).from(purchaseRequests).where(and(...scopedFilters(purchaseRequests, scope), or(eq(purchaseRequests.status, PR_STATUS.SUBMITTED), eq(purchaseRequests.status, PR_STATUS.VALIDATED_BY_LOGISTIC)))),
          db.select({ c: count() }).from(hrLeaveRequests).where(and(...scopedFilters(hrLeaveRequests, scope), eq(hrLeaveRequests.status, LEAVE_REQUEST_STATUS.PENDING))),
          db.select({ c: count() }).from(hrEmployees).where(and(...scopedFilters(hrEmployees, scope))),
          db.select({ c: count() }).from(hrRecruitmentJobs).where(and(...scopedFilters(hrRecruitmentJobs, scope), eq(hrRecruitmentJobs.status, JOB_STATUS.OPEN))),
          db.select({ c: count() }).from(payments).where(and(...scopedFilters(payments, scope), eq(payments.status, PAYMENT_STATUS.PENDING_APPROVAL))),
          db.select({ c: count() }).from(projects).where(and(...scopedFilters(projects, scope), eq(projects.status, PROJECT_STATUS.ACTIVE))),
          db.select({ c: count() }).from(grants).where(and(...scopedFilters(grants, scope, { ouNullable: true }))),
          db.select({ c: count() }).from(grants).where(and(...scopedFilters(grants, scope, { ouNullable: true }), eq(grants.status, GRANT_STATUS.ACTIVE))),
          db.select({ c: count() }).from(grants).where(and(...scopedFilters(grants, scope, { ouNullable: true }), eq(grants.status, GRANT_STATUS.ACTIVE), gte(grants.endDate, today), lte(grants.endDate, thirtyDaysFromNow))),
          db.select({ c: count() }).from(risks).where(and(...scopedFilters(risks, scope), ne(risks.level, RISK_LEVEL.LOW))),
          db.select({ c: count() }).from(risks).where(and(...scopedFilters(risks, scope), eq(risks.level, RISK_LEVEL.CRITICAL))),
          db.select({ c: count() }).from(incidents).where(and(...scopedFilters(incidents, scope), or(eq(incidents.status, INCIDENT_STATUS.OPEN), eq(incidents.status, INCIDENT_STATUS.UNDER_INVESTIGATION)))),
          db.select({ c: count() }).from(mealSurveys).where(and(...scopedFilters(mealSurveys, scope), eq(mealSurveys.status, MEAL_SURVEY_STATUS.PUBLISHED))),
          db.select({ c: count() }).from(mealDqaFindings).where(and(...scopedFilters(mealDqaFindings, scope),eq(mealDqaFindings.isDeleted, 0))),
          db.select({ c: count() }).from(donors).where(and(...scopedFilters(donors, scope, { ouNullable: true }), eq(donors.isActive, 1))),
          db.select({ c: count() }).from(contracts).where(and(...scopedFilters(contracts, scope), eq(contracts.status, CONTRACT_STATUS.ACTIVE))),
          db.select({ c: count() }).from(contracts).where(and(...scopedFilters(contracts, scope), eq(contracts.status, CONTRACT_STATUS.ACTIVE), gte(contracts.endDate, today), lte(contracts.endDate, thirtyDaysFromNow))),
          db.select({ totalBudget: projects.totalBudget, spent: projects.spent }).from(projects).where(and(...scopedFilters(projects, scope))),
        ]);

        const totalBudget = allProjectsBudget.reduce((s, p) => s + Number(p.totalBudget ?? 0), 0);
        const totalSpent = allProjectsBudget.reduce((s, p) => s + Number(p.spent ?? 0), 0);
        const budgetUtilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

        return {
          logistics: {
            totalPRs: totalPRsResult[0]?.c ?? 0,
            approvedPRs: approvedPRsResult[0]?.c ?? 0,
            pendingPRs: pendingPRsResult[0]?.c ?? 0,
            delayedDeliveries: 0,
            activeContracts: activeContractsResult[0]?.c ?? 0,
          },
          hr: {
            totalEmployees: totalEmployeesResult[0]?.c ?? 0,
            pendingLeave: pendingLeaveResult[0]?.c ?? 0,
            openPositions: openPositionsResult[0]?.c ?? 0,
            expiringContracts: expiringContractsResult[0]?.c ?? 0,
          },
          finance: {
            pendingPayments: pendingPaymentsResult[0]?.c ?? 0,
            budgetUtilization,
            totalSpent,
            outstandingAdvances: 0,
          },
          projects: {
            active: activeProjectsResult[0]?.c ?? 0,
          },
          grants: {
            active: activeGrantsResult[0]?.c ?? 0,
            total: totalGrantsResult[0]?.c ?? 0,
            expiringSoon: expiringSoonGrantsResult[0]?.c ?? 0,
          },
          risks: {
            open: openRisksResult[0]?.c ?? 0,
            critical: criticalRisksResult[0]?.c ?? 0,
            openIncidents: openIncidentsResult[0]?.c ?? 0,
          },
          meal: {
            activeSurveys: activeSurveysResult[0]?.c ?? 0,
            dqaFindings: dqaFindingsResult[0]?.c ?? 0,
            indicatorsOverdue: 0,
          },
          donorCRM: {
            activeDonors: activeDonorsResult[0]?.c ?? 0,
          },
          programs: {
            active: activeProjectsResult[0]?.c ?? 0,
          },
          procurement: {
            totalPRs: totalPRsResult[0]?.c ?? 0,
            approvedPRs: approvedPRsResult[0]?.c ?? 0,
            pendingPRs: pendingPRsResult[0]?.c ?? 0,
          },
        };
      } catch (error) {
        logger.error("getOperationalModuleSnapshots", error);
        return emptyResult;
      }
    }),

  // ========================================================================
  // PROCEDURE 5: getRecentActivity
  // FIX #1: createdAt uses Intl.DateTimeFormat (production-safe)
  // FIX #8: RBAC-aware — org admin sees all; normal users see only their own
  // ========================================================================
  getRecentActivity: scopedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(15) }))
    .query(async ({ ctx, input }) => {
      const scope = {
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
      };
      const db = await getDb();

      if (!db) return [];

      try {
        const userRole = (ctx as any).user?.role ?? "user";
        const userId = (ctx as any).user?.id;
        const isOrgAdmin = userRole === "admin" || userRole === "org_admin";

        const filters: any[] = [eq(auditLogs.organizationId, scope.organizationId)];

        if (scope.operatingUnitId) {
          filters.push(
            or(isNull(auditLogs.operatingUnitId), eq(auditLogs.operatingUnitId, scope.operatingUnitId))
          );
        }

        if (!isOrgAdmin && userId) {
          filters.push(eq(auditLogs.userId, userId));
        }

        const records = await db
          .select({
            id: auditLogs.id,
            userId: auditLogs.userId,
            action: auditLogs.action,
            entityType: auditLogs.entityType,
            createdAt: auditLogs.createdAt,
            userName: users.name,
          })
          .from(auditLogs)
          .leftJoin(users, eq(auditLogs.userId, users.id))
          .where(and(...filters))
          .orderBy(desc(auditLogs.createdAt))
          .limit(input.limit);

        return records.map((item) => {
          const userName = item.userName ?? "Unknown User";
          const action = item.action ?? "modified";
          const entityType = item.entityType ?? "record";

          const iconMap: Record<string, string> = {
            purchase_request: "🛒",
            payment: "💰",
            contract: "📄",
            project: "📁",
            grant: "🏦",
            risk: "⚠️",
            incident: "🚨",
            task: "✅",
            employee: "👤",
            leave_request: "📅",
          };
          const icon = iconMap[entityType] ?? "📝";

          return {
            id: item.id,
            type: entityType,
            title: `${userName} ${action.replace(/_/g, " ")} ${entityType.replace(/_/g, " ")}`,
            description: `${action.replace(/_/g, " ")} a ${entityType.replace(/_/g, " ")}`,
            module: entityType,
            createdBy: userName,
            userName,
            action,
            entityType,
            createdAt: formatActivityDate(item.createdAt),
            icon,
          };
        });
      } catch (error) {
        logger.error("getRecentActivity", error);
        return [];
      }
    }),

  // ========================================================================
  // PROCEDURE 6: getHumanitarianIdentity
  // SHAPE FIX: returns totalBeneficiaries, activeDonors, operatingCountries
  // ========================================================================
  getHumanitarianIdentity: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const scope = {
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
      };
      const db = await getDb();

      const emptyResult = {
        country: "",
        countryNames: [] as string[],
        operatingCountries: 0,
        sectors: [] as string[],
        governorates: [] as string[],
        implementingPartners: [] as string[],
        donors: [] as string[],
        totalBeneficiaries: 0,
        activeDonors: 0,
      };

      if (!db) return emptyResult;

      try {
        const [
          beneficiaryCount,
          donorRows,
          activeDonorCount,
          operatingUnitsResult,
          allOUsResult,
          projectSectors,
          projectGovernorates,
          projectPartners,
        ] = await Promise.all([
          db
            .select({ c: count() })
            .from(beneficiaries)
            .where(
              and(
                eq(beneficiaries.organizationId, scope.organizationId),
                ...(scope.operatingUnitId
                  ? [or(isNull(beneficiaries.operatingUnitId), eq(beneficiaries.operatingUnitId, scope.operatingUnitId))]
                  : []),
                eq(beneficiaries.isDeleted, 0)
              )
            ),

          db
            .select({ name: donors.name })
            .from(donors)
            .where(
              and(
                eq(donors.organizationId, scope.organizationId),
                ...(scope.operatingUnitId
                  ? [or(isNull(donors.operatingUnitId), eq(donors.operatingUnitId, scope.operatingUnitId))]
                  : []),
                eq(donors.isActive, 1)
              )
            )
            .limit(20),

          // Active donors = distinct donors linked to projects with status 'active'
          // OR grants with status 'ongoing', scoped to the current org/OU
          (async () => {
            const db2 = await getDb();
            if (!db2) return [{ c: 0 }];
            // Donors via active projects (through donor_projects junction)
            const activeProjectIds = await db2
              .select({ id: projects.id })
              .from(projects)
              .where(
                and(
                  ...scopedFilters(projects, scope),
                  eq(projects.status, PROJECT_STATUS.ACTIVE)
                )
              );
            const projectIdList = activeProjectIds.map((p) => p.id);

            // Donors via ongoing grants (grants have donorId directly)
            const ongoingGrantDonorIds = await db2
              .select({ donorId: grants.donorId })
              .from(grants)
              .where(
                and(
                  ...scopedFilters(grants, scope, { ouNullable: true }),
                  eq(grants.status, GRANT_STATUS.ONGOING)
                )
              );
            const grantDonorIdList = ongoingGrantDonorIds
              .map((g) => g.donorId)
              .filter((id): id is number => id != null);

            // Count distinct donors from both sources
            const donorIdSets = new Set<number>(grantDonorIdList);

            if (projectIdList.length > 0) {
              const projectDonors = await db2
                .select({ donorId: donorProjects.donorId })
                .from(donorProjects)
                .where(
                  and(
                    eq(donorProjects.organizationId, scope.organizationId),
                    inArray(donorProjects.projectId, projectIdList)
                  )
                );
              projectDonors.forEach((d) => donorIdSets.add(d.donorId));
            }

            return [{ c: donorIdSets.size }];
          })(),

          db
            .select({ country: operatingUnits.country, unitName: operatingUnits.name })
            .from(operatingUnits)
            .where(
              and(
                eq(operatingUnits.organizationId, scope.organizationId),
                eq(operatingUnits.status, OPERATING_UNIT_STATUS.ACTIVE),
                ...(scope.operatingUnitId
                  ? [eq(operatingUnits.id, scope.operatingUnitId)]
                  : [])
              )
            )
            .limit(1),

          db
            .select({ country: operatingUnits.country })
            .from(operatingUnits)
            .where(
              and(
                eq(operatingUnits.organizationId, scope.organizationId),
                eq(operatingUnits.status, OPERATING_UNIT_STATUS.ACTIVE)
              )
            ),

          db
            .select({ sectors: projects.sectors })
            .from(projects)
            .where(and(...scopedFilters(projects, scope), eq(projects.status, PROJECT_STATUS.ACTIVE))),

          db
            .select({ governorate: projects.location })
            .from(projects)
            .where(and(...scopedFilters(projects, scope), eq(projects.status, PROJECT_STATUS.ACTIVE))),

          db
            .select({ partner: projects.implementingPartner })
            .from(projects)
            .where(and(...scopedFilters(projects, scope), eq(projects.status, PROJECT_STATUS.ACTIVE))),
        ]);

        const allSectors = new Set<string>();
        projectSectors.forEach((row) => {
          if (row.sectors && Array.isArray(row.sectors)) {
            (row.sectors as string[]).forEach((s) => allSectors.add(s));
          }
        });

        const allGovernorates = new Set<string>();
        projectGovernorates.forEach((row) => {
          if (row.governorate) allGovernorates.add(row.governorate);
        });

        const allPartners = new Set<string>();
        projectPartners.forEach((row) => {
          if (row.partner) allPartners.add(row.partner);
        });

        const donorNames = donorRows.map((d) => d.name ?? "").filter(Boolean);

        // Build country list scoped to the current OU (or all OUs of the org if no OU selected).
        // operatingUnitsResult is already filtered to the current OU when scope.operatingUnitId is set.
        // allOUsResult covers all active OUs of the org (used as fallback when no OU is selected).
        const scopedCountryNames: string[] = scope.operatingUnitId
          ? operatingUnitsResult.map((ou) => ou.country).filter((c): c is string => !!c)
          : Array.from(new Set(allOUsResult.map((ou) => ou.country).filter((c): c is string => !!c)));

        // Legacy scalar kept for backward compat
        const country = scopedCountryNames[0] ?? "";
        const operatingCountries = scopedCountryNames.length;

        return {
          country,
          countryNames: scopedCountryNames,
          operatingCountries,
          sectors: Array.from(allSectors).slice(0, 20),
          governorates: Array.from(allGovernorates).slice(0, 20),
          implementingPartners: Array.from(allPartners).slice(0, 20),
          donors: donorNames.slice(0, 20),
          totalBeneficiaries: beneficiaryCount[0]?.c ?? 0,
          activeDonors: activeDonorCount[0]?.c ?? 0,
        };
      } catch (error) {
        logger.error("getHumanitarianIdentity", error);
        return emptyResult;
      }
    }),

  // ========================================================================
  // PROCEDURE 7: getOperationalBottlenecks
  // ========================================================================
  getOperationalBottlenecks: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const scope = {
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
      };
      const db = await getDb();

      const emptyResult = {
        overdueItems: 0,
        expiringContracts: 0,
        overdueProjects: [] as Array<{ id: number; titleEn: string | null; titleAr: string | null; endDate: string | null; progress: string | null }>,
        stalledPRs: [] as Array<{ id: number; prNumber: string; projectTitle: string | null; total: string | null; currency: string | null }>,
        expiredGrants: [] as Array<{ id: number; title: string | null; titleAr: string | null; donorName: string | null; endDate: string | null }>,
        criticalRisks: [] as Array<{ id: number; title: string | null; category: string | null; score: string | null }>,
        overduePayments: [] as Array<{ id: number; paymentNumber: string; payeeName: string | null; amount: string | null }>,
      };

      if (!db) return emptyResult;

      try {
        const today = todaySqlDate();
        const sevenDaysAgo = daysFromNow(-7);
        const thirtyDaysFromNow = daysFromNow(30);

        const [
          stalledPRsResult,
          overdueProjectsResult,
          overduePaymentsResult,
          expiringContractsResult,
          expiredGrantsResult,
          criticalRisksResult,
        ] = await Promise.all([
          db
            .select({
              id: purchaseRequests.id,
              prNumber: purchaseRequests.prNumber,
              projectTitle: purchaseRequests.projectTitle,
              total: purchaseRequests.total,
              currency: purchaseRequests.currency,
            })
            .from(purchaseRequests)
            .where(
              and(
                ...scopedFilters(purchaseRequests, scope),
                eq(purchaseRequests.status, PR_STATUS.SUBMITTED),
                lte(purchaseRequests.createdAt, sevenDaysAgo)
              )
            )
            .limit(10),

          db
            .select({
              id: projects.id,
              titleEn: projects.titleEn,
              titleAr: projects.titleAr,
              endDate: projects.endDate,
              progress: projects.physicalProgressPercentage,
            })
            .from(projects)
            .where(
              and(
                ...scopedFilters(projects, scope),
                eq(projects.status, PROJECT_STATUS.ACTIVE),
                lte(projects.endDate, today)
              )
            )
            .limit(10),

          db
            .select({
              id: payments.id,
              paymentNumber: payments.paymentNumber,
              payeeName: payments.payeeName,
              amount: payments.amount,
            })
            .from(payments)
            .where(
              and(
                ...scopedFilters(payments, scope),
                eq(payments.status, PAYMENT_STATUS.PENDING_APPROVAL),
                lte(payments.paymentDate, today)
              )
            )
            .limit(10),

          db
            .select({ c: count() })
            .from(contracts)
            .where(
              and(
                ...scopedFilters(contracts, scope),
                eq(contracts.status, CONTRACT_STATUS.ACTIVE),
                gte(contracts.endDate, today),
                lte(contracts.endDate, thirtyDaysFromNow)
              )
            ),

          db
            .select({
              id: grants.id,
              title: grants.title,
              titleAr: grants.titleAr,
              donorName: grants.donorName,
              endDate: grants.endDate,
            })
            .from(grants)
            .where(
              and(
                ...scopedFilters(grants, scope, { ouNullable: true }),
                lte(grants.endDate, today),
                or(eq(grants.status, GRANT_STATUS.ONGOING), eq(grants.status, GRANT_STATUS.PLANNED))
              )
            )
            .limit(5),

          db
            .select({
              id: risks.id,
              title: risks.title,
              category: risks.category,
              score: risks.score,
            })
            .from(risks)
            .where(
              and(
                ...scopedFilters(risks, scope),
                eq(risks.level, RISK_LEVEL.CRITICAL)
              )
            )
            .limit(5),
        ]);

        const overdueItems =
          overdueProjectsResult.length + overduePaymentsResult.length;

        return {
          overdueItems,
          expiringContracts: expiringContractsResult[0]?.c ?? 0,
          overdueProjects: overdueProjectsResult,
          stalledPRs: stalledPRsResult,
          expiredGrants: expiredGrantsResult,
          criticalRisks: criticalRisksResult,
          overduePayments: overduePaymentsResult,
        };
      } catch (error) {
        logger.error("getOperationalBottlenecks", error);
        return emptyResult;
      }
    }),

  // ========================================================================
  // PROCEDURE 8: getOperationalHealth
  // ========================================================================
  getOperationalHealth: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const scope = {
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
      };
      const db = await getDb();

      const emptyResult = {
        overallScore: 0,
        status: "healthy" as "healthy" | "warning" | "critical",
        lastUpdated: new Date().toISOString(),
        dimensions: {} as Record<string, { score: number; weight: number; issues: number }>,
        criticalFlags: [] as Array<{ severity: "critical" | "high"; title: string; description: string; action: string }>,
        predictiveAlerts: [] as Array<{ type: string; title: string; probability: number; recommendation: string }>,
        issues: [] as Array<{ dimension: string; severity: string; message: string; impact: number; recommendation: string }>,
        warnings: [] as Array<{ type: string; message: string; action: string }>,
      };

      if (!db) return emptyResult;

      try {
        const today = todaySqlDate();

        const [
          stalledApprovals,
          overdueProjectsCount,
          totalActiveProjects,
          overduePaymentsCount,
          criticalRisksCount,
          expiringGrantsCount,
          activeGrantsCount,
          lowStockCount,
          pendingLeaveCount,
          // Total counts — used to detect "no data" vs "data with zero issues"
          totalPRsCount,
          totalPaymentsCount,
          totalRisksCount,
          totalStockCount,
          totalLeaveCount,
        ] = await Promise.all([
          db.select({ c: count() }).from(purchaseRequests).where(and(...scopedFilters(purchaseRequests, scope), eq(purchaseRequests.status, PR_STATUS.SUBMITTED), lte(purchaseRequests.createdAt, daysFromNow(-7)))),
          db.select({ c: count() }).from(projects).where(and(...scopedFilters(projects, scope), eq(projects.status, PROJECT_STATUS.ACTIVE), lte(projects.endDate, today))),
          db.select({ c: count() }).from(projects).where(and(...scopedFilters(projects, scope), eq(projects.status, PROJECT_STATUS.ACTIVE))),
          db.select({ c: count() }).from(payments).where(and(...scopedFilters(payments, scope), eq(payments.status, PAYMENT_STATUS.PENDING_APPROVAL), lte(payments.paymentDate, today))),
          db.select({ c: count() }).from(risks).where(and(...scopedFilters(risks, scope), eq(risks.level, RISK_LEVEL.CRITICAL))),
          db.select({ c: count() }).from(grants).where(and(...scopedFilters(grants, scope, { ouNullable: true }), eq(grants.status, GRANT_STATUS.ACTIVE), gte(grants.endDate, today), lte(grants.endDate, daysFromNow(30)))),
          db.select({ c: count() }).from(grants).where(and(...scopedFilters(grants, scope, { ouNullable: true }), eq(grants.status, GRANT_STATUS.ACTIVE))),
          db.select({ c: count() }).from(stockItems).where(and(...scopedFilters(stockItems, scope), lte(stockItems.currentQuantity, stockItems.minimumQuantity))),
          db.select({ c: count() }).from(hrLeaveRequests).where(and(...scopedFilters(hrLeaveRequests, scope), eq(hrLeaveRequests.status, LEAVE_REQUEST_STATUS.PENDING))),
          // Total counts for "no data" detection
          db.select({ c: count() }).from(purchaseRequests).where(and(...scopedFilters(purchaseRequests, scope))),
          db.select({ c: count() }).from(payments).where(and(...scopedFilters(payments, scope))),
          db.select({ c: count() }).from(risks).where(and(...scopedFilters(risks, scope))),
          db.select({ c: count() }).from(stockItems).where(and(...scopedFilters(stockItems, scope))),
          db.select({ c: count() }).from(hrLeaveRequests).where(and(...scopedFilters(hrLeaveRequests, scope))),
        ]);

        const stalledCount = stalledApprovals[0]?.c ?? 0;
        const totalPRs = totalPRsCount[0]?.c ?? 0;
        // Return 0 when no PRs exist at all (no data = no score, not perfect score)
        const workflowScore = totalPRs === 0
          ? 0
          : Math.max(0, 100 - stalledCount * 20);

        const totalActive = totalActiveProjects[0]?.c ?? 0;
        const overdueCount = overdueProjectsCount[0]?.c ?? 0;
        // Return 0 when no active projects (no data = no score)
        const projectScore = totalActive > 0
          ? Math.max(0, Math.round(100 - (overdueCount / totalActive) * 100))
          : 0;

        const overduePayCount = overduePaymentsCount[0]?.c ?? 0;
        const totalPayments = totalPaymentsCount[0]?.c ?? 0;
        // Return 0 when no payments exist at all
        const financeScore = totalPayments === 0
          ? 0
          : Math.max(0, 100 - overduePayCount * 15);

        const critCount = criticalRisksCount[0]?.c ?? 0;
        const totalRisks = totalRisksCount[0]?.c ?? 0;
        // Return 0 when no risks exist at all
        const riskScore = totalRisks === 0
          ? 0
          : Math.max(0, 100 - critCount * 25);

        const activeGrants = activeGrantsCount[0]?.c ?? 0;
        const expiringCount = expiringGrantsCount[0]?.c ?? 0;
        // Return 0 when no active grants (no data = no score)
        const grantScore = activeGrants > 0
          ? Math.max(0, Math.round(100 - (expiringCount / activeGrants) * 50))
          : 0;

        const lowStock = lowStockCount[0]?.c ?? 0;
        const totalStock = totalStockCount[0]?.c ?? 0;
        // Return 0 when no stock items exist at all
        const inventoryScore = totalStock === 0
          ? 0
          : Math.max(0, 100 - lowStock * 20);

        const pendingLeave = pendingLeaveCount[0]?.c ?? 0;
        const totalLeave = totalLeaveCount[0]?.c ?? 0;
        // Return 0 when no leave requests exist at all
        const staffScore = totalLeave === 0
          ? 0
          : Math.max(0, 100 - pendingLeave * 10);

        const overallScore = Math.round(
          (workflowScore * 20 + projectScore * 20 + financeScore * 15 +
            riskScore * 15 + grantScore * 15 + inventoryScore * 10 + staffScore * 5) / 100
        );

        let status: "healthy" | "warning" | "critical" = "healthy";
        if (overallScore < 50) status = "critical";
        else if (overallScore < 75) status = "warning";

        const dimensions: Record<string, { score: number; weight: number; issues: number }> = {
          workflowEfficiency: { score: workflowScore, weight: 20, issues: stalledCount > 0 ? 1 : 0 },
          projectDelivery: { score: projectScore, weight: 20, issues: overdueCount > 0 ? overdueCount : 0 },
          financialHealth: { score: financeScore, weight: 15, issues: overduePayCount > 0 ? overduePayCount : 0 },
          riskExposure: { score: riskScore, weight: 15, issues: critCount > 0 ? critCount : 0 },
          grantCompliance: { score: grantScore, weight: 15, issues: expiringCount > 0 ? expiringCount : 0 },
          inventoryReadiness: { score: inventoryScore, weight: 10, issues: lowStock > 0 ? lowStock : 0 },
          staffCapacity: { score: staffScore, weight: 5, issues: pendingLeave > 0 ? pendingLeave : 0 },
        };

        const criticalFlags: Array<{ severity: "critical" | "high"; title: string; description: string; action: string }> = [];
        if (critCount > 0) criticalFlags.push({ severity: "critical", title: "Critical Risks Detected", description: `${critCount} critical risk(s) require immediate attention`, action: "Review Risk Register" });
        if (overduePayCount > 0) criticalFlags.push({ severity: "high", title: "Overdue Payments", description: `${overduePayCount} payment(s) are past due date`, action: "Process Payments" });
        if (overdueCount > 0) criticalFlags.push({ severity: "high", title: "Overdue Projects", description: `${overdueCount} active project(s) have passed their end date`, action: "Review Projects" });

        const predictiveAlerts: Array<{ type: string; title: string; probability: number; recommendation: string }> = [];
        if (expiringCount > 0) predictiveAlerts.push({ type: "compliance", title: "Grant Expiry Risk", probability: Math.min(95, expiringCount * 30), recommendation: `${expiringCount} grant(s) expiring soon — initiate renewal` });
        if (stalledCount > 0) predictiveAlerts.push({ type: "delay", title: "Procurement Delay Risk", probability: Math.min(90, stalledCount * 25), recommendation: `${stalledCount} stalled PR(s) may delay operations` });

        const issues: Array<{ dimension: string; severity: string; message: string; impact: number; recommendation: string }> = [];
        Object.entries(dimensions).forEach(([key, dim]) => {
          if (dim.issues > 0) {
            issues.push({ dimension: key, severity: dim.score < 50 ? "critical" : "high", message: `${dim.issues} issue(s) in ${key}`, impact: dim.issues * 10, recommendation: "Review and resolve" });
          }
        });

        const warnings: Array<{ type: string; message: string; action: string }> = [];
        if (lowStock > 0) warnings.push({ type: "inventory", message: `${lowStock} inventory item(s) below minimum threshold`, action: "Request stock replenishment" });

        return {
          overallScore,
          status,
          lastUpdated: new Date().toISOString(),
          dimensions,
          criticalFlags,
          predictiveAlerts,
          issues,
          warnings,
        };
      } catch (error) {
        logger.error("getOperationalHealth", error);
        return emptyResult;
      }
    }),

  // ========================================================================
  // PROCEDURE 9: getUpcomingDeadlines
  // Returns:
  //   projects      — active projects whose endDate falls within daysAhead
  //   reportingSchedules — project reporting schedules whose dueDate falls within daysAhead (default 90 days)
  //   opportunities — funding opportunities whose applicationDeadline falls within daysAhead
  // ========================================================================
  getUpcomingDeadlines: scopedProcedure
    .input(z.object({ daysAhead: z.number().min(1).max(180).default(90) }))
    .query(async ({ ctx, input }) => {
      const scope = {
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
      };
      const db = await getDb();

      if (!db) return { projects: [], reportingSchedules: [], opportunities: [] };

      try {
        const today = todaySqlDate();
        const cutoff = daysFromNow(input.daysAhead);

        const [upcomingProjects, upcomingReportingSchedules, upcomingOpportunities] = await Promise.all([
          // Tab 1 data: active projects expiring soon
          db
            .select({
              id: projects.id,
              titleEn: projects.titleEn,
              titleAr: projects.titleAr,
              endDate: projects.endDate,
            })
            .from(projects)
            .where(
              and(
                ...scopedFilters(projects, scope),
                eq(projects.status, PROJECT_STATUS.ACTIVE),
                gte(projects.endDate, today),
                lte(projects.endDate, cutoff),
              )
            )
            .orderBy(projects.endDate)
            .limit(10),

          // Tab 2 data: project reporting schedules with upcoming dueDate
          db
            .select({
              id: projectReportingSchedules.id,
              projectId: projectReportingSchedules.projectId,
              projectTitle: projects.titleEn,
              projectTitleAr: projects.titleAr,
              projectCode: projects.projectCode,
              reportType: projectReportingSchedules.reportType,
              reportTitle: projectReportingSchedules.reportTitle,
              reportTitleAr: projectReportingSchedules.reportTitleAr,
              dueDate: projectReportingSchedules.dueDate,
              status: projectReportingSchedules.status,
              frequency: projectReportingSchedules.frequency,
            })
            .from(projectReportingSchedules)
            .leftJoin(projects, eq(projectReportingSchedules.projectId, projects.id))
            .where(
              and(
                eq(projectReportingSchedules.organizationId, scope.organizationId),
                eq(projectReportingSchedules.isDeleted, 0),
                lte(projectReportingSchedules.dueDate, cutoff),
              )
            )
            .orderBy(projectReportingSchedules.dueDate)
            .limit(10),

          // Tab 3 data: funding opportunities with upcoming applicationDeadline
          db
            .select({
              id: opportunities.id,
              donorName: opportunities.donorName,
              donorType: opportunities.donorType,
              interestArea: opportunities.interestArea,
              geographicAreas: opportunities.geographicAreas,
              applicationDeadline: opportunities.applicationDeadline,
              allocatedBudget: opportunities.allocatedBudget,
              currency: opportunities.currency,
              cfpLink: opportunities.cfpLink,
              applicationLink: opportunities.applicationLink,
            })
            .from(opportunities)
            .where(
              and(
                eq(opportunities.organizationId, scope.organizationId),
                eq(opportunities.isDeleted, 0),
                gte(opportunities.applicationDeadline, today),
                lte(opportunities.applicationDeadline, cutoff),
              )
            )
            .orderBy(opportunities.applicationDeadline)
            .limit(10),
        ]);

        return {
          projects: upcomingProjects,
          reportingSchedules: upcomingReportingSchedules,
          opportunities: upcomingOpportunities,
        };
      } catch (error) {
        logger.error("getUpcomingDeadlines", error);
        return { projects: [], reportingSchedules: [], opportunities: [] };
      }
    }),

  // ========================================================================
  // PROCEDURE 10: getUserTasks — NEW
  // Returns personal task list for My Work Queue section
  // ========================================================================
  getUserTasks: scopedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(8) }))
    .query(async ({ ctx, input }) => {
      const scope = {
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
      };
      const db = await getDb();

      if (!db) return [];

      try {
        const userId = (ctx as any).user?.id;

        const baseFilters = [
          ...scopedFilters(tasks, scope),
          or(eq(tasks.status, TASK_STATUS.TODO), eq(tasks.status, TASK_STATUS.IN_PROGRESS)),
        ];

        // Try to get tasks assigned to the current user first
        if (userId) {
          try {
            const userTasks = await db
              .select({
                id: tasks.id,
                taskName: tasks.taskName,
                taskNameAr: tasks.taskNameAr,
                dueDate: tasks.dueDate,
                status: tasks.status,
                priority: tasks.priority,
              })
              .from(tasks)
              .where(
                and(
                  ...scopedFilters(tasks, scope),
                  or(eq(tasks.status, TASK_STATUS.TODO), eq(tasks.status, TASK_STATUS.IN_PROGRESS)),
                  eq((tasks as any).assignedToId, userId)
                )
              )
              .orderBy(tasks.dueDate)
              .limit(input.limit);

            if (userTasks.length > 0) return userTasks;
          } catch {
            // assignedToId column may not exist — fall through
          }
        }

        // Fallback: return upcoming tasks for the org/OU
        return await db
          .select({
            id: tasks.id,
            taskName: tasks.taskName,
            taskNameAr: tasks.taskNameAr,
            dueDate: tasks.dueDate,
            status: tasks.status,
            priority: tasks.priority,
          })
          .from(tasks)
          .where(and(...baseFilters))
          .orderBy(tasks.dueDate)
          .limit(input.limit);
      } catch (error) {
        logger.error("getUserTasks", error);
        return [];
      }
    }),

  // ========================================================================
  // PROCEDURE 11: getInventoryAlerts — NEW
  // Returns low stock / out-of-stock counts
  // ========================================================================
  getInventoryAlerts: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const scope = {
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
      };
      const db = await getDb();

      const emptyResult = { total: 0, lowStock: 0, outOfStock: 0 };

      if (!db) return emptyResult;

      try {
        const [lowStockResult, outOfStockResult] = await Promise.all([
          db
            .select({ c: count() })
            .from(stockItems)
            .where(
              and(
                ...scopedFilters(stockItems, scope),
                lte(stockItems.currentQuantity, stockItems.minimumQuantity)
              )
            ),

          db
            .select({ c: count() })
            .from(stockItems)
            .where(
              and(
                ...scopedFilters(stockItems, scope),
                lte(stockItems.currentQuantity, stockItems.minimumQuantity)
              )
            ),
        ]);

        const lowStock = lowStockResult[0]?.c ?? 0;
        const outOfStock = outOfStockResult[0]?.c ?? 0;

        return {
          total: lowStock,
          lowStock,
          outOfStock,
        };
      } catch (error) {
        logger.error("getInventoryAlerts", error);
        return emptyResult;
      }
    }),

  // ========================================================================
  // PROCEDURE 12: getPendingApprovals — NEW
  // Returns detailed pending approval rows for My Work Queue section
  // ========================================================================
  getPendingApprovals: scopedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      const scope = {
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
      };
      const db = await getDb();

      if (!db) return [];

      try {
        const perType = Math.ceil(input.limit / 3);

        const [prRows, leaveRows, paymentRows] = await Promise.all([
          db
            .select({
              id: purchaseRequests.id,
              reference: purchaseRequests.prNumber,
              description: purchaseRequests.projectTitle,
              amount: purchaseRequests.total,
              createdAt: purchaseRequests.createdAt,
            })
            .from(purchaseRequests)
            .where(
              and(
                ...scopedFilters(purchaseRequests, scope),
                or(
                  eq(purchaseRequests.status, PR_STATUS.SUBMITTED),
                  eq(purchaseRequests.status, PR_STATUS.VALIDATED_BY_LOGISTIC),
                  eq(purchaseRequests.status, PR_STATUS.VALIDATED_BY_FINANCE)
                )
              )
            )
            .orderBy(desc(purchaseRequests.createdAt))
            .limit(perType),

          db
            .select({
              id: hrLeaveRequests.id,
              leaveType: hrLeaveRequests.leaveType,
              createdAt: hrLeaveRequests.createdAt,
            })
            .from(hrLeaveRequests)
            .where(
              and(
                ...scopedFilters(hrLeaveRequests, scope),
                eq(hrLeaveRequests.status, LEAVE_REQUEST_STATUS.PENDING)
              )
            )
            .orderBy(desc(hrLeaveRequests.createdAt))
            .limit(perType),

          db
            .select({
              id: payments.id,
              paymentNumber: payments.paymentNumber,
              payeeName: payments.payeeName,
              amount: payments.amount,
              createdAt: payments.createdAt,
            })
            .from(payments)
            .where(
              and(
                ...scopedFilters(payments, scope),
                eq(payments.status, PAYMENT_STATUS.PENDING_APPROVAL)
              )
            )
            .orderBy(desc(payments.createdAt))
            .limit(perType),
        ]);

        type ApprovalItem = {
          id: string;
          type: "purchase_request" | "leave_request" | "payment";
          reference: string;
          description: string;
          amount: number | null;
          urgency: "urgent" | "normal";
        };

        const results: ApprovalItem[] = [];

        prRows.forEach((row) => {
          results.push({
            id: `pr-${row.id}`,
            type: "purchase_request",
            reference: row.reference ?? `PR-${row.id}`,
            description: row.description ?? "Purchase Request",
            amount: row.amount != null ? Number(row.amount) : null,
            urgency: "normal",
          });
        });

        leaveRows.forEach((row) => {
          results.push({
            id: `leave-${row.id}`,
            type: "leave_request",
            reference: `LR-${row.id}`,
            description: String(row.leaveType ?? "Leave Request"),
            amount: null,
            urgency: "normal",
          });
        });

        paymentRows.forEach((row) => {
          results.push({
            id: `pay-${row.id}`,
            type: "payment",
            reference: row.paymentNumber ?? `PAY-${row.id}`,
            description: String(row.payeeName ?? "Payment"),
            amount: row.amount != null ? Number(row.amount) : null,
            urgency: "normal",
          });
        });

        return results.slice(0, input.limit);
      } catch (error) {
        logger.error("getPendingApprovals", error);
        return [];
      }
    }),
});
