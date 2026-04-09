/**
 * ============================================================================
 * DAILY QUALIFICATION EXPIRY NOTIFICATION SCHEDULER
 * ============================================================================
 * 
 * Checks vendor qualifications approaching expiry (30/60/90 days)
 * Sends in-app notifications to the organization owner
 * 
 * Schedule: Daily at 4:00 AM
 * 
 * ============================================================================
 */

import { getDb } from '../db';
import { vendorQualificationScores, vendors } from '../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { notifyOwner } from '../_core/notification';

const EXPIRY_THRESHOLDS = [30, 60, 90]; // days before expiry

export const dailyQualificationExpiryJob = {
  name: 'daily-qualification-expiry',
  schedule: '0 4 * * *', // Every day at 4:00 AM
  handler: async () => {
    console.log('[QualificationExpiry] Starting daily qualification expiry check...');
    const db = await getDb();

    try {
      // Get all active qualifications with expiry dates
      const qualifications = await db
        .select({
          vendorId: vendorQualificationScores.vendorId,
          vendorName: vendors.name,
          vendorCode: vendors.vendorCode,
          organizationId: vendorQualificationScores.organizationId,
          expiryDate: vendorQualificationScores.expiryDate,
          classification: vendorQualificationScores.classification,
          totalScore: vendorQualificationScores.totalScore,
        })
        .from(vendorQualificationScores)
        .innerJoin(vendors, eq(vendors.id, vendorQualificationScores.vendorId))
        .where(
          and(
            eq(vendorQualificationScores.isDeleted, 0),
            sql`${vendorQualificationScores.expiryDate} IS NOT NULL`,
            sql`${vendorQualificationScores.status} IN ('qualified', 'conditional')`,
          )
        );

      const now = new Date();
      const notifications: Array<{
        orgId: number;
        vendorName: string;
        vendorCode: string;
        daysUntilExpiry: number;
        classification: string | null;
      }> = [];

      for (const q of qualifications) {
        if (!q.expiryDate) continue;
        const expiryDate = new Date(q.expiryDate);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Check if it matches any threshold
        for (const threshold of EXPIRY_THRESHOLDS) {
          if (daysUntilExpiry === threshold) {
            notifications.push({
              orgId: q.organizationId,
              vendorName: q.vendorName || 'Unknown',
              vendorCode: q.vendorCode || '',
              daysUntilExpiry,
              classification: q.classification,
            });
            break;
          }
        }
      }

      if (notifications.length > 0) {
        // Group by organization
        const byOrg = new Map<number, typeof notifications>();
        for (const n of notifications) {
          const existing = byOrg.get(n.orgId) || [];
          existing.push(n);
          byOrg.set(n.orgId, existing);
        }

        for (const [orgId, orgNotifications] of byOrg) {
          const vendorList = orgNotifications
            .map(n => `- ${n.vendorCode} - ${n.vendorName}: ${n.daysUntilExpiry} days (${n.classification || 'N/A'})`)
            .join('\n');

          await notifyOwner({
            title: `Vendor Qualification Expiry Alert (${orgNotifications.length} vendor${orgNotifications.length > 1 ? 's' : ''})`,
            content: `The following vendor qualifications are approaching expiry:\n\n${vendorList}\n\nPlease review and re-evaluate these vendors before their qualifications expire.`,
          });
        }

        console.log(`[QualificationExpiry] Sent ${notifications.length} expiry notifications across ${byOrg.size} organizations`);
      } else {
        console.log('[QualificationExpiry] No qualifications approaching expiry thresholds today');
      }
    } catch (error) {
      console.error('[QualificationExpiry] Error during expiry check:', error);
    }
  },
};
