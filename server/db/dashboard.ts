/**
 * db/dashboard.ts — Dashboard Query Helpers
 *
 * Reusable query helpers for the Dashboard module.
 *
 * Standards:
 *  - All status values use status constants — never hardcoded strings
 *  - All queries use scopedAndActive() — never inline eq(organizationId, ...)
 *  - db parameter typed as DB — never `db: any`
 *  - All isDeleted checks use scopedAndActive() — never eq(isDeleted, false/0)
 */

import { and, eq, isNull, count, sum, desc } from 'drizzle-orm';
import {
  projects,
  grants,
  hrEmployees,
} from '../../drizzle/schema';
import type { DB, ScopeContext } from './_scope';
import { scopedAndActive } from './_scope';
import {
  PROJECT_STATUS,
  GRANT_STATUS,
} from './_status';

// ============================================================
// DASHBOARD STATS
// ============================================================

export interface DashboardStats {
  activeProjects: number;
  totalEmployees: number;
  totalBudget: number;
  totalSpent: number;
  budgetExecution: number;
  activeGrants: number;
  projectCompliance: number;
}

/**
 * Get dashboard statistics for a given scope.
 * Replaces inline hardcoded status strings and eq(isDeleted, 0) patterns.
 */
export async function getDashboardStats(
  db: DB,
  ctx: ScopeContext
): Promise<DashboardStats> {
  // Active projects with budget totals
  const activeProjectsList = await db
    .select({
      totalBudget: projects.totalBudget,
      spent: projects.spent,
    })
    .from(projects)
    .where(and(
      ...scopedAndActive(projects, ctx),
      eq(projects.status, PROJECT_STATUS.ACTIVE),
    ));

  const activeProjectsCount = activeProjectsList.length;
  const totalBudget = activeProjectsList.reduce(
    (sum, p) => sum + Number(p.totalBudget ?? 0),
    0
  );
  const totalSpent = activeProjectsList.reduce(
    (sum, p) => sum + Number(p.spent ?? 0),
    0
  );
  const budgetExecution = totalBudget > 0
    ? Math.round((totalSpent / totalBudget) * 100)
    : 0;

  // Total employees
  const [empRow] = await db
    .select({ total: count() })
    .from(hrEmployees)
    .where(and(
      ...scopedAndActive(hrEmployees, ctx),
    ));
  const totalEmployees = Number(empRow?.total ?? 0);

  // Active grants
  const [grantRow] = await db
    .select({ total: count() })
    .from(grants)
    .where(and(
      ...scopedAndActive(grants, ctx),
      eq(grants.status, GRANT_STATUS.ACTIVE),
    ));
  const activeGrants = Number(grantRow?.total ?? 0);

  return {
    activeProjects: activeProjectsCount,
    totalEmployees,
    totalBudget,
    totalSpent,
    budgetExecution,
    activeGrants,
    projectCompliance: 94, // Placeholder until compliance tracking is implemented
  };
}

// ============================================================
// PROJECT PIPELINE
// ============================================================

export interface ProjectPipelineItem {
  id: number;
  titleEn: string;
  titleAr: string;
  status: string;
  totalBudget: number;
  spent: number;
  progress: number;
}

/**
 * Get project pipeline data for the dashboard.
 * Replaces inline hardcoded scope and isDeleted patterns.
 */
export async function getDashboardProjectPipeline(
  db: DB,
  ctx: ScopeContext,
  limit = 5
): Promise<ProjectPipelineItem[]> {
  const rows = await db
    .select({
      id: projects.id,
      titleEn: projects.titleEn,
      titleAr: projects.titleAr,
      status: projects.status,
      totalBudget: projects.totalBudget,
      spent: projects.spent,
      physicalProgressPercentage: projects.physicalProgressPercentage,
    })
    .from(projects)
    .where(and(
      ...scopedAndActive(projects, ctx),
    ))
    .orderBy(desc(projects.createdAt))
    .limit(limit);

  return rows.map((p) => ({
    id: p.id,
    titleEn: p.titleEn ?? 'Untitled Project',
    titleAr: p.titleAr ?? 'مشروع بدون عنوان',
    status: p.status ?? PROJECT_STATUS.PLANNING,
    totalBudget: Number(p.totalBudget ?? 0),
    spent: Number(p.spent ?? 0),
    progress: Number(p.physicalProgressPercentage ?? 0),
  }));
}
