import { getDb } from "../../db";
import {
  projects,
  grants,
  risks,
  budgetItems,
  activities,
} from "drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * generateExecutiveAlerts  (v2 — Production)
 *
 * Auto-generates decision-support alerts from live ERP data across 8 dimensions:
 *  1. Critical unmitigated risks
 *  2. High risks without mitigation plan
 *  3. Stale risks (no update > 7 days)
 *  4. Grants expiring ≤ 30 days
 *  5. Projects over budget (spent > approved)
 *  6. Projects severely behind schedule (progress < 30% with > 60% time elapsed)
 *  7. Projects stalled (< 5% progress, active > 30 days)
 *  8. Budget burn rate acceleration (spent > 90%, progress < 50%)
 *
 * Returns alerts sorted: critical → warning → info
 * Each alert maps to ExecutiveAlert type consumed by ExecutiveAlertsPanel.
 */
export async function generateExecutiveAlerts(
  organizationId: number,
  operatingUnitId?: number | null,
): Promise<Array<{
  id: string;
  type: "critical" | "warning" | "info";
  category: string;
  message: string;
  date: string;
}>> {
  const db = await getDb();
  const alerts: Array<{
    id: string;
    type: "critical" | "warning" | "info";
    category: string;
    message: string;
    date: string;
    sortOrder: number;
  }> = [];

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });

  const riskBase = and(
    eq(risks.organizationId, organizationId),
    operatingUnitId ? eq(risks.operatingUnitId, operatingUnitId) : undefined,
    eq(risks.isDeleted, 0),
    sql`${risks.status} NOT IN ('closed','transferred')`,
  );

  const projectBase = and(
    eq(projects.organizationId, organizationId),
    operatingUnitId ? eq(projects.operatingUnitId, operatingUnitId) : undefined,
    eq(projects.status, "active"),
    eq(projects.isDeleted, 0),
  );

  // ── 1. Critical risks — unmitigated ────────────────────────────────────
  try {
    const rows = await db
      .select({
        count: sql<number>`COUNT(*)`,
        sample: sql<string>`GROUP_CONCAT(${risks.title} ORDER BY ${risks.score} DESC SEPARATOR ' | ')`,
      })
      .from(risks)
      .where(
        and(riskBase, eq(risks.level, "critical"), sql`${risks.status} IN ('identified','assessed')`),
      );
    const cnt = Number(rows[0]?.count ?? 0);
    if (cnt > 0) {
      const sample = (rows[0]?.sample ?? "").split(" | ").slice(0, 2).join(", ");
      alerts.push({
        id: `alert-critical-risks-${organizationId}`,
        type: "critical",
        category: "RISK",
        message: `${cnt} critical risk${cnt > 1 ? "s remain" : " remains"} unmitigated and require immediate executive action. ${sample ? `Leading risks: ${sample}.` : ""}`,
        date: today,
        sortOrder: 1,
      });
    }
  } catch { /* non-fatal */ }

  // ── 2. High risks — no mitigation plan ────────────────────────────────
  try {
    const rows = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(risks)
      .where(
        and(
          riskBase,
          eq(risks.level, "high"),
          sql`(${risks.mitigationPlan} IS NULL OR ${risks.mitigationPlan} = '')`,
        ),
      );
    const cnt = Number(rows[0]?.count ?? 0);
    if (cnt > 0) {
      alerts.push({
        id: `alert-high-no-plan-${organizationId}`,
        type: "critical",
        category: "RISK",
        message: `${cnt} high-severity risk${cnt > 1 ? "s have" : " has"} no mitigation plan documented. Risk owners must submit plans within 72 hours.`,
        date: today,
        sortOrder: 2,
      });
    }
  } catch { /* non-fatal */ }

  // ── 3. Stale high/critical risks — no update in 7+ days ───────────────
  try {
    const rows = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(risks)
      .where(
        and(
          riskBase,
          sql`${risks.level} IN ('high','critical')`,
          sql`${risks.updatedAt} < DATE_SUB(NOW(), INTERVAL 7 DAY)`,
        ),
      );
    const cnt = Number(rows[0]?.count ?? 0);
    if (cnt > 0) {
      alerts.push({
        id: `alert-stale-risks-${organizationId}`,
        type: "warning",
        category: "RISK",
        message: `${cnt} high/critical risk${cnt > 1 ? "s have" : " has"} not been updated in over 7 days. Risk register is becoming stale — assign review deadlines.`,
        date: today,
        sortOrder: 3,
      });
    }
  } catch { /* non-fatal */ }

  // ── 4. Grants expiring within 30 days ─────────────────────────────────
  try {
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const dateStr = in30.toISOString().split("T")[0];

    const rows = await db
      .select({
        count: sql<number>`COUNT(*)`,
        sample: sql<string>`GROUP_CONCAT(${grants.title} SEPARATOR ' | ')`,
      })
      .from(grants)
      .where(
        and(
          eq(grants.organizationId, organizationId),
          operatingUnitId ? eq(grants.operatingUnitId, operatingUnitId) : undefined,
          sql`${grants.status} IN ('active','ongoing')`,
          sql`${grants.endDate} <= ${dateStr}`,
          sql`${grants.endDate} >= CURDATE()`,
        ),
      );
    const cnt = Number(rows[0]?.count ?? 0);
    if (cnt > 0) {
      const sample = (rows[0]?.sample ?? "").split(" | ").slice(0, 2).join(", ");
      alerts.push({
        id: `alert-grants-expiring-${organizationId}`,
        type: cnt > 1 ? "critical" : "warning",
        category: "GRANT",
        message: `${cnt} grant${cnt > 1 ? "s expire" : " expires"} within 30 days. Initiate closeout procedures immediately. ${sample ? `Affected: ${sample}.` : ""}`,
        date: today,
        sortOrder: 2,
      });
    }
  } catch { /* non-fatal */ }

  // ── 5. Projects over budget ────────────────────────────────────────────
  try {
    const projectRows = await db
      .select({
        id: projects.id,
        title: projects.titleEn,
        budget: projects.totalBudget,
        spent: projects.spent,
      })
      .from(projects)
      .where(projectBase);

    const overBudget = projectRows.filter((p) => {
      const b = Number(p.budget ?? 0);
      const s = Number(p.spent ?? 0);
      return b > 0 && s > b;
    });

    if (overBudget.length > 0) {
      const names = overBudget.map((p) => p.title ?? `#${p.id}`).slice(0, 3).join(", ");
      alerts.push({
        id: `alert-over-budget-${organizationId}`,
        type: "critical",
        category: "FINANCE",
        message: `${overBudget.length} project${overBudget.length > 1 ? "s have" : " has"} exceeded approved budget. Immediate financial review required: ${names}.`,
        date: today,
        sortOrder: 1,
      });
    }
  } catch { /* non-fatal */ }

  // ── 6. Projects severely behind schedule ──────────────────────────────
  try {
    const projectRows = await db
      .select({
        id: projects.id,
        title: projects.titleEn,
        progress: projects.physicalProgressPercentage,
        startDate: projects.startDate,
        endDate: projects.endDate,
      })
      .from(projects)
      .where(projectBase);

    const now = Date.now();
    const behindSchedule = projectRows.filter((p) => {
      const prog = Number(p.progress ?? 0);
      if (!p.startDate || !p.endDate) return false;
      const total   = new Date(p.endDate).getTime() - new Date(p.startDate).getTime();
      const elapsed = now - new Date(p.startDate).getTime();
      const timeElapsed = total > 0 ? (elapsed / total) * 100 : 0;
      return timeElapsed > 60 && prog < 30;
    });

    if (behindSchedule.length > 0) {
      const names = behindSchedule.map((p) => p.title ?? `#${p.id}`).slice(0, 3).join(", ");
      alerts.push({
        id: `alert-behind-schedule-${organizationId}`,
        type: "warning",
        category: "PROJECT",
        message: `${behindSchedule.length} project${behindSchedule.length > 1 ? "s are" : " is"} severely behind schedule (>60% time elapsed, <30% complete): ${names}.`,
        date: today,
        sortOrder: 4,
      });
    }
  } catch { /* non-fatal */ }

  // ── 7. Stalled projects ────────────────────────────────────────────────
  try {
    const stalledRows = await db
      .select({ id: projects.id, title: projects.titleEn })
      .from(projects)
      .where(
        and(
          projectBase,
          sql`${projects.physicalProgressPercentage} < 5`,
          sql`${projects.startDate} < DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        ),
      );

    if (stalledRows.length > 0) {
      const names = stalledRows.map((p) => p.title ?? `#${p.id}`).slice(0, 3).join(", ");
      alerts.push({
        id: `alert-stalled-projects-${organizationId}`,
        type: "warning",
        category: "PROJECT",
        message: `${stalledRows.length} project${stalledRows.length > 1 ? "s show" : " shows"} near-zero progress despite being active for 30+ days: ${names}. Immediate intervention required.`,
        date: today,
        sortOrder: 4,
      });
    }
  } catch { /* non-fatal */ }

  // ── 8. High burn rate — spending fast, low progress ───────────────────
  try {
    const projectRows = await db
      .select({
        id: projects.id,
        title: projects.titleEn,
        budget: projects.totalBudget,
        spent: projects.spent,
        progress: projects.physicalProgressPercentage,
      })
      .from(projects)
      .where(projectBase);

    const burning = projectRows.filter((p) => {
      const b = Number(p.budget ?? 0);
      const s = Number(p.spent ?? 0);
      const prog = Number(p.progress ?? 0);
      if (b === 0) return false;
      return (s / b) * 100 > 90 && prog < 50;
    });

    if (burning.length > 0) {
      const names = burning.map((p) => p.title ?? `#${p.id}`).slice(0, 3).join(", ");
      alerts.push({
        id: `alert-burn-rate-${organizationId}`,
        type: "warning",
        category: "FINANCE",
        message: `${burning.length} project${burning.length > 1 ? "s have" : " has"} consumed >90% of budget with <50% implementation progress: ${names}. Risk of budget exhaustion before completion.`,
        date: today,
        sortOrder: 3,
      });
    }
  } catch { /* non-fatal */ }

  // Sort: critical first, then by sortOrder
  alerts.sort((a, b) => {
    const typeWeight = { critical: 0, warning: 1, info: 2 };
    if (typeWeight[a.type] !== typeWeight[b.type])
      return typeWeight[a.type] - typeWeight[b.type];
    return a.sortOrder - b.sortOrder;
  });

  // Return without internal sortOrder field
  return alerts.map(({ sortOrder: _s, ...rest }) => rest);
}