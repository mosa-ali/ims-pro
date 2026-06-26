import { getDb } from "../../db";
import { purchaseRequests } from "drizzle/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";

/**
 * ProcurementAnalyticsService
 * 
 * Provides real-time procurement analytics for executive dashboard.
 * All metrics are calculated from live purchase_requests table data.
 * 
 * Zero Mock Data Policy:
 * - No hardcoded counts
 * - No sample data
 * - No fallback values
 * - All values from database only
 * 
 * Filtering:
 * - organizationId: Required - never mix organizations
 * - operatingUnitId: Optional - when provided, filters to specific OU
 * - isDeleted = 0: Always applied
 */

export interface ProcurementMetrics {
  totalPRs: number;
  approvedPRs: number;
  pendingPRs: number;
  rejectedPRs: number;
  approvalRate: number;
  pendingRate: number;
  rejectedRate: number;
}

  const PENDING_STATUSES = [
    "draft",
    "submitted",
    "validated_by_logistic",
    "validated_by_finance",
  ] as const;

  const REJECTED_STATUSES = [
    "rejected_by_logistic",
    "rejected_by_finance",
    "rejected_by_pm",
  ] as const;

/**
 * Get purchase request statistics
 * Returns counts for each status category
 */
export async function getPurchaseRequestStatistics(
  organizationId: number,
  operatingUnitId?: number | null
): Promise<{
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}> {
  // Build base query with organization and deleted filters
  const db = await getDb();
  let query = db
    .select()
    .from(purchaseRequests)
    .where(
      and(
        eq(purchaseRequests.organizationId, organizationId),
        eq(purchaseRequests.isDeleted, 0)
      )
    );

  // Add operating unit filter if provided
  if (operatingUnitId) {
    query = db
      .select()
      .from(purchaseRequests)
      .where(
        and(
          eq(purchaseRequests.organizationId, organizationId),
          eq(purchaseRequests.operatingUnitId, operatingUnitId),
          eq(purchaseRequests.isDeleted, 0)
        )
      );
  }

  const allPRs = await query;

  // Calculate counts by status
  const total = allPRs.length;
  const approved = allPRs.filter((pr) => pr.status === "approved").length;
  const pending = allPRs.filter((pr) =>
    pr.status &&
    [
      "draft",
      "submitted",
      "validated_by_logistic",
      "validated_by_finance",
    ].includes(pr.status)
  ).length;
  const rejected = allPRs.filter((pr) =>
      [
        "rejected_by_logistic",
        "rejected_by_finance",
        "rejected_by_pm",
      ].includes(pr.status ?? "")
    ).length;

  return {
    total,
    approved,
    pending,
    rejected,
  };
}

/**
 * Calculate approval rate
 * Formula: (Approved PRs / Total PRs) × 100
 */
export async function getApprovalRate(
  organizationId: number,
  operatingUnitId?: number | null
): Promise<number> {
  const stats = await getPurchaseRequestStatistics(organizationId, operatingUnitId);

  if (stats.total === 0) {
    return 0;
  }

  return Math.round((stats.approved / stats.total) * 100);
}

/**
 * Calculate pending rate
 * Formula: (Pending PRs / Total PRs) × 100
 */
export async function getPendingRate(
  organizationId: number,
  operatingUnitId?: number | null
): Promise<number> {
  const stats = await getPurchaseRequestStatistics(organizationId, operatingUnitId);

  if (stats.total === 0) {
    return 0;
  }

  return Math.round((stats.pending / stats.total) * 100);
}

/**
 * Calculate rejected rate
 * Formula: (Rejected PRs / Total PRs) × 100
 */
export async function getRejectedRate(
  organizationId: number,
  operatingUnitId?: number | null
): Promise<number> {
  const stats = await getPurchaseRequestStatistics(organizationId, operatingUnitId);

  if (stats.total === 0) {
    return 0;
  }

  return Math.round((stats.rejected / stats.total) * 100);
}

/**
 * Get complete procurement dashboard metrics
 * Returns all metrics needed for the executive dashboard widget
 */
export async function getProcurementDashboardMetrics(
  organizationId: number,
  operatingUnitId?: number | null
): Promise<ProcurementMetrics> {
  const stats = await getPurchaseRequestStatistics(organizationId, operatingUnitId);
  const approvalRate = await getApprovalRate(organizationId, operatingUnitId);
  const pendingRate = await getPendingRate(organizationId, operatingUnitId);
  const rejectedRate = await getRejectedRate(organizationId, operatingUnitId);

  return {
    totalPRs: stats.total,
    approvedPRs: stats.approved,
    pendingPRs: stats.pending,
    rejectedPRs: stats.rejected,
    approvalRate,
    pendingRate,
    rejectedRate,
  };
}

/**
 * Get procurement bottleneck analysis
 * Identifies PRs stuck in pending state for extended periods
 */
export async function getProcurementBottlenecks(
  organizationId: number,
  operatingUnitId?: number | null,
  daysThreshold: number = 7
): Promise<{
  bottleneckCount: number;
  oldestPendingDays: number | null;
  averagePendingDays: number | null;
}> {
  // Build query
  const db = await getDb();
  let query = db
    .select()
    .from(purchaseRequests)
    .where(
      and(
        eq(purchaseRequests.organizationId, organizationId),
        eq(purchaseRequests.isDeleted, 0),
        inArray(
          purchaseRequests.status,
          [
            "draft",
            "submitted",
            "validated_by_logistic",
            "validated_by_finance",
          ]
        )
      )
    );

  // Add operating unit filter if provided
  if (operatingUnitId) {
    const db = await getDb();
    query = db
      .select()
      .from(purchaseRequests)
      .where(
        and(
          eq(purchaseRequests.organizationId, organizationId),
          eq(purchaseRequests.operatingUnitId, operatingUnitId),
          eq(purchaseRequests.isDeleted, 0),
          inArray(
            purchaseRequests.status,
            [...PENDING_STATUSES]
          )
        )
      );
  }

  const pendingPRs = await query;

  // Calculate bottleneck metrics
  const now = new Date();
  const bottleneckPRs = pendingPRs.filter((pr) => {
    if (!pr.createdAt) return false;
    const createdDate = new Date(pr.createdAt);
    const daysDiff = Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysDiff >= daysThreshold;
  });

  const bottleneckCount = bottleneckPRs.length;

  // Calculate oldest pending PR
  let oldestPendingDays: number | null = null;
  if (pendingPRs.length > 0) {
    const oldestPR = pendingPRs.reduce((oldest, current) => {
      const oldestDate = new Date(oldest.createdAt || 0);
      const currentDate = new Date(current.createdAt || 0);
      return oldestDate < currentDate ? oldest : current;
    });

    if (oldestPR.createdAt) {
      oldestPendingDays = Math.floor(
        (now.getTime() - new Date(oldestPR.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      );
    }
  }

  // Calculate average pending days
  let averagePendingDays: number | null = null;
  if (pendingPRs.length > 0) {
    const totalDays = pendingPRs.reduce((sum, pr) => {
      if (!pr.createdAt) return sum;
      const daysDiff = Math.floor(
        (now.getTime() - new Date(pr.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return sum + daysDiff;
    }, 0);
    averagePendingDays = Math.round(totalDays / pendingPRs.length);
  }

  return {
    bottleneckCount,
    oldestPendingDays,
    averagePendingDays,
  };
}
