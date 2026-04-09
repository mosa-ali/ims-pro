/**
 * ============================================================================
 * DAILY BLACKLIST EXPIRY CHECKER
 * ============================================================================
 *
 * Automatically checks for expired blacklist cases every day at 3:00 AM.
 * When a blacklist case's expiryDate has passed, it:
 *   1. Transitions the case status from "approved" → "expired"
 *   2. Removes the isBlacklisted flag from the vendor
 *   3. Logs the expiry action in the audit trail
 *   4. Sends a notification to the owner about expired cases
 *
 * This runs across ALL organizations — no scope/session required.
 *
 * Schedule: Daily at 3:00 AM
 * ============================================================================
 */

import { getDb } from "../db";
import {
  vendors,
  vendorBlacklistCases,
  vendorBlacklistAuditLog,
  organizations,
} from "../../drizzle/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

/**
 * Main scheduler function — checks all organizations for expired blacklist cases
 */
export async function runDailyBlacklistExpiryCheck() {
  console.log("[Blacklist Expiry] Starting daily blacklist expiry check...");

  try {
    const db = await getDb();

    // Get all organizations
    const allOrganizations = await db.select().from(organizations);

    let totalExpired = 0;
    const expirySummary: { orgName: string; count: number; vendors: string[] }[] = [];

    for (const org of allOrganizations) {
      // Find all approved cases with an expiry date that has passed
      const expiredCases = await db
        .select({
          id: vendorBlacklistCases.id,
          vendorId: vendorBlacklistCases.vendorId,
          caseNumber: vendorBlacklistCases.caseNumber,
          expiryDate: vendorBlacklistCases.expiryDate,
          operatingUnitId: vendorBlacklistCases.operatingUnitId,
        })
        .from(vendorBlacklistCases)
        .where(
          and(
            eq(vendorBlacklistCases.organizationId, org.id),
            eq(vendorBlacklistCases.status, "approved"),
            isNull(vendorBlacklistCases.deletedAt),
            sql`${vendorBlacklistCases.expiryDate} IS NOT NULL`,
            sql`${vendorBlacklistCases.expiryDate} <= CURDATE()`
          )
        );

      if (expiredCases.length === 0) {
        continue;
      }

      console.log(
        `[Blacklist Expiry] Found ${expiredCases.length} expired case(s) in organization: ${org.name}`
      );

      const expiredVendorNames: string[] = [];

      for (const c of expiredCases) {
        // 1. Update case status to expired
        await db
          .update(vendorBlacklistCases)
          .set({
            status: "expired",
            updatedBy: null, // System action — no user
          })
          .where(eq(vendorBlacklistCases.id, c.id));

        // 2. Remove blacklist flag from vendor
        await db
          .update(vendors)
          .set({
            isBlacklisted: 0,
            blacklistReason: null,
            updatedBy: null,
          })
          .where(eq(vendors.id, c.vendorId));

        // Get vendor name for summary
        const [vendor] = await db
          .select({ name: vendors.name })
          .from(vendors)
          .where(eq(vendors.id, c.vendorId));
        expiredVendorNames.push(vendor?.name ?? `Vendor #${c.vendorId}`);

        // 3. Log the expiry in audit trail
        await db.insert(vendorBlacklistAuditLog).values({
          organizationId: org.id,
          operatingUnitId: c.operatingUnitId,
          caseId: c.id,
          userId: 0, // System user
          userName: "System (Auto-Expiry Scheduler)",
          actionType: "case_expired",
          previousStatus: "approved",
          newStatus: "expired",
          details: `Blacklist case ${c.caseNumber} automatically expired. Expiry date: ${c.expiryDate}. Vendor removed from blacklist.`,
          ipAddress: null,
        });

        totalExpired++;
      }

      expirySummary.push({
        orgName: org.name,
        count: expiredCases.length,
        vendors: expiredVendorNames,
      });
    }

    // 4. Send notification if any cases expired
    if (totalExpired > 0) {
      const summaryLines = expirySummary
        .map(
          (s) =>
            `- ${s.orgName}: ${s.count} case(s) expired (${s.vendors.join(", ")})`
        )
        .join("\n");

      await notifyOwner({
        title: `${totalExpired} Blacklist Case(s) Auto-Expired`,
        content: `The daily blacklist expiry check found ${totalExpired} case(s) that have passed their expiry date. The affected vendors have been automatically removed from the blacklist.\n\n${summaryLines}`,
      }).catch(() => {});
    }

    console.log(
      `[Blacklist Expiry] Daily check completed. ${totalExpired} case(s) expired across ${expirySummary.length} organization(s).`
    );
  } catch (error) {
    console.error("[Blacklist Expiry] Daily expiry check failed:", error);
    throw error;
  }
}

// Export for cron job registration
export const dailyBlacklistExpiryJob = {
  name: "daily-blacklist-expiry",
  schedule: "0 3 * * *", // Every day at 3:00 AM
  handler: runDailyBlacklistExpiryCheck,
};
