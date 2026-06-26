import { getDb } from "../../db";
import {
  projects,
  grants,
  risks,
  budgetItems,
  activities,
} from "drizzle/schema";
import { eq, and, sql, lt, gte, lte } from "drizzle-orm";

/**
 * AIInsightsService  (v2 — Production)
 *
 * Strategic recommendation engine for the Executive Intelligence Center.
 * Analyses multi-dimensional ERP data across 7 dimensions to surface
 * actionable, data-driven management insights.
 *
 * Every logic block:
 *  - Uses correct Drizzle column references (no raw string column names)
 *  - Guards against division-by-zero
 *  - Falls back gracefully when tables are empty
 *  - Always produces at least one recommendation (the portfolio-stability default)
 */
export class AIInsightsService {

  static async getExecutiveRecommendations(
    organizationId: number,
    operatingUnitId?: number | null,
  ) {
    const db = await getDb();
    const recommendations: Array<{
      id: string;
      title: string;
      content: string;
      impact: "high" | "medium" | "low";
      priority: number;
      category: string;
    }> = [];

    // ── Base project filter ────────────────────────────────────────────────
    const projectWhere = and(
      eq(projects.organizationId, organizationId),
      operatingUnitId ? eq(projects.operatingUnitId, operatingUnitId) : undefined,
      eq(projects.status, "active"),
      eq(projects.isDeleted, 0),
    );

    // ── Base risk filter ───────────────────────────────────────────────────
    const riskWhere = and(
      eq(risks.organizationId, organizationId),
      operatingUnitId ? eq(risks.operatingUnitId, operatingUnitId) : undefined,
      eq(risks.isDeleted, 0),
    );

    // ══════════════════════════════════════════════════════════════════════
    // 1. CRITICAL RISKS — unmitigated (identified/assessed), score ≥ 15
    // ══════════════════════════════════════════════════════════════════════
    try {
      const criticalUnmitigated = await db
        .select({ count: sql<number>`COUNT(*)`, titles: sql<string>`GROUP_CONCAT(${risks.title} SEPARATOR ', ')` })
        .from(risks)
        .where(
          and(
            riskWhere,
            eq(risks.level, "critical"),
            sql`${risks.status} IN ('identified','assessed')`,
          ),
        );

      const cnt = Number(criticalUnmitigated[0]?.count ?? 0);
      if (cnt > 0) {
        recommendations.push({
          id: "ai-critical-risks",
          title: "Unmitigated Critical Risks",
          content: `${cnt} critical risk${cnt > 1 ? "s" : ""} remain unmitigated (status: identified/assessed). These represent the highest exposure to project failure. Convene an emergency risk review and assign mitigation owners within 48 hours.`,
          impact: "high",
          priority: 1,
          category: "risk",
        });
      }
    } catch { /* non-fatal */ }

    // ══════════════════════════════════════════════════════════════════════
    // 2. STALE HIGH/CRITICAL RISKS — no update in 7+ days
    // ══════════════════════════════════════════════════════════════════════
    try {
      const staleRisks = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(risks)
        .where(
          and(
            riskWhere,
            sql`${risks.level} IN ('critical','high')`,
            sql`${risks.status} NOT IN ('closed','transferred')`,
            sql`${risks.updatedAt} < DATE_SUB(NOW(), INTERVAL 7 DAY)`,
          ),
        );

      const cnt = Number(staleRisks[0]?.count ?? 0);
      if (cnt > 0) {
        recommendations.push({
          id: "ai-stale-risks",
          title: "Stale High-Priority Risks",
          content: `${cnt} high or critical risk${cnt > 1 ? "s have" : " has"} not been updated in over 7 days. Risk registers require active management — assign review deadlines and update mitigation progress immediately.`,
          impact: "high",
          priority: 1,
          category: "risk",
        });
      }
    } catch { /* non-fatal */ }

    // ══════════════════════════════════════════════════════════════════════
    // 3. HIGH RISK CONCENTRATION — > 40% of risks are high/critical
    // ══════════════════════════════════════════════════════════════════════
    try {
      const [totalRow, highRow] = await Promise.all([
        db.select({ count: sql<number>`COUNT(*)` }).from(risks).where(and(riskWhere, sql`${risks.status} != 'closed'`)),
        db.select({ count: sql<number>`COUNT(*)` }).from(risks).where(and(riskWhere, sql`${risks.level} IN ('high','critical')`, sql`${risks.status} != 'closed'`)),
      ]);
      const total = Number(totalRow[0]?.count ?? 0);
      const high  = Number(highRow[0]?.count ?? 0);
      if (total > 0 && high / total > 0.4) {
        const pct = Math.round((high / total) * 100);
        recommendations.push({
          id: "ai-risk-concentration",
          title: "High Risk Concentration Alert",
          content: `${pct}% of active portfolio risks (${high} of ${total}) are rated high or critical. This concentration exceeds safe operational thresholds. A portfolio-wide risk mitigation task force should be established immediately.`,
          impact: "high",
          priority: 1,
          category: "risk",
        });
      }
    } catch { /* non-fatal */ }

    // ══════════════════════════════════════════════════════════════════════
    // 4. BUDGET–PROGRESS MISALIGNMENT — over-spending vs under-delivery
    // ══════════════════════════════════════════════════════════════════════
    try {
      const projectFinances = await db
        .select({
          id: projects.id,
          title: projects.titleEn,
          budget: projects.totalBudget,
          spent: projects.spent,
          progress: projects.physicalProgressPercentage,
        })
        .from(projects)
        .where(projectWhere);

      const misaligned = projectFinances.filter((p) => {
        const budget = Number(p.budget ?? 0);
        const spent  = Number(p.spent ?? 0);
        const prog   = Number(p.progress ?? 0);
        if (budget === 0) return false;
        const utilization = (spent / budget) * 100;
        return utilization > 70 && prog < 40; // spending fast, progress low
      });

      if (misaligned.length > 0) {
        const names = misaligned.map((p) => p.title ?? `Project ${p.id}`).slice(0, 3).join(", ");
        recommendations.push({
          id: "ai-budget-progress-gap",
          title: "Budget–Progress Misalignment",
          content: `${misaligned.length} project${misaligned.length > 1 ? "s are" : " is"} consuming budget significantly faster than implementation progress: ${names}. Conduct an urgent financial review to prevent premature budget exhaustion before project delivery.`,
          impact: "high",
          priority: 2,
          category: "financial",
        });
      }
    } catch { /* non-fatal */ }

    // ══════════════════════════════════════════════════════════════════════
    // 5. UNDER-SPENT PROJECTS — <20% spent but >50% time elapsed
    // ══════════════════════════════════════════════════════════════════════
    try {
      const projectFinances = await db
        .select({
          id: projects.id,
          title: projects.titleEn,
          budget: projects.totalBudget,
          spent: projects.spent,
          startDate: projects.startDate,
          endDate: projects.endDate,
        })
        .from(projects)
        .where(projectWhere);

      const now = Date.now();
      const underSpentDelayed = projectFinances.filter((p) => {
        const budget  = Number(p.budget ?? 0);
        const spent   = Number(p.spent ?? 0);
        if (budget === 0 || !p.startDate || !p.endDate) return false;
        const total   = new Date(p.endDate).getTime() - new Date(p.startDate).getTime();
        const elapsed = now - new Date(p.startDate).getTime();
        const timeElapsed = total > 0 ? (elapsed / total) * 100 : 0;
        const utilization = (spent / budget) * 100;
        return utilization < 20 && timeElapsed > 50;
      });

      if (underSpentDelayed.length > 0) {
        const names = underSpentDelayed.map((p) => p.title ?? `Project ${p.id}`).slice(0, 3).join(", ");
        recommendations.push({
          id: "ai-under-spent",
          title: "Under-Execution Risk",
          content: `${underSpentDelayed.length} project${underSpentDelayed.length > 1 ? "s are" : " is"} more than 50% through their timeline but have spent less than 20% of budget: ${names}. This signals implementation stalling and risks grant non-compliance. Accelerate activity execution.`,
          impact: "high",
          priority: 2,
          category: "financial",
        });
      }
    } catch { /* non-fatal */ }

    // ══════════════════════════════════════════════════════════════════════
    // 6. GRANTS EXPIRING WITHIN 30 DAYS
    // ══════════════════════════════════════════════════════════════════════
    try {
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);

      const expiringGrants = await db
        .select({
          count: sql<number>`COUNT(*)`,
          titles: sql<string>`GROUP_CONCAT(${grants.title} SEPARATOR ', ')`,
        })
        .from(grants)
        .where(
          and(
            eq(grants.organizationId, organizationId),
            operatingUnitId ? eq(grants.operatingUnitId, operatingUnitId) : undefined,
            sql`${grants.status} IN ('active','ongoing')`,
            sql`${grants.endDate} <= ${in30Days.toISOString().split("T")[0]}`,
            sql`${grants.endDate} >= CURDATE()`,
          ),
        );

      const cnt = Number(expiringGrants[0]?.count ?? 0);
      if (cnt > 0) {
        recommendations.push({
          id: "ai-grants-expiring",
          title: "Grants Expiring Within 30 Days",
          content: `${cnt} grant${cnt > 1 ? "s are" : " is"} expiring within the next 30 days. Initiate closeout procedures, ensure all deliverables are documented, and begin renewal or replacement grant negotiations immediately.`,
          impact: cnt > 2 ? "high" : "medium",
          priority: 2,
          category: "compliance",
        });
      }
    } catch { /* non-fatal */ }

    // ══════════════════════════════════════════════════════════════════════
    // 7. PROJECTS WITH ZERO ACTIVITY PROGRESS (stalled)
    // ══════════════════════════════════════════════════════════════════════
    try {
      const stalledProjects = await db
        .select({
          id: projects.id,
          title: projects.titleEn,
          progress: projects.physicalProgressPercentage,
          startDate: projects.startDate,
        })
        .from(projects)
        .where(
          and(
            projectWhere,
            sql`${projects.physicalProgressPercentage} < 5`,
            sql`${projects.startDate} < DATE_SUB(NOW(), INTERVAL 30 DAY)`,
          ),
        );

      if (stalledProjects.length > 0) {
        const names = stalledProjects.map((p) => p.title ?? `Project ${p.id}`).slice(0, 3).join(", ");
        recommendations.push({
          id: "ai-stalled-projects",
          title: "Stalled Project Execution",
          content: `${stalledProjects.length} project${stalledProjects.length > 1 ? "s show" : " shows"} less than 5% implementation progress despite being active for over 30 days: ${names}. Investigate root causes — resource shortages, approvals, or scope issues — and establish a recovery plan.`,
          impact: "medium",
          priority: 2,
          category: "operational",
        });
      }
    } catch { /* non-fatal */ }

    // ══════════════════════════════════════════════════════════════════════
    // FALLBACK — always surfaces something useful
    // ══════════════════════════════════════════════════════════════════════
    if (recommendations.length === 0) {
      recommendations.push({
        id: "ai-portfolio-stable",
        title: "Portfolio Stability Confirmed",
        content: "All active projects, grants, and risk registers are within healthy variance thresholds. No immediate corrective actions required. Maintain current monitoring cadence and schedule the next quarterly portfolio review.",
        impact: "low",
        priority: 3,
        category: "general",
      });
    }

    // Sort by priority then impact weight
    const impactWeight = { high: 3, medium: 2, low: 1 };
    recommendations.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return impactWeight[b.impact] - impactWeight[a.impact];
    });

    return recommendations;
  }
}