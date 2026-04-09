import { getDb } from '../db';
import { opportunities } from '../../drizzle/schema';
import { eq, and, sql, lt, gte } from 'drizzle-orm';
import { notifyOwner } from '../_core/notification';

/**
 * Deadline Alert Service
 * Monitors funding opportunities and sends alerts when deadlines are approaching
 */

export interface DeadlineAlert {
  opportunityId: number;
  donorName: string;
  applicationDeadline: string;
  daysUntilDeadline: number;
  status: 'urgent' | 'closing-soon' | 'expiring-today';
  organizationId: string;
  operatingUnitId: string;
}

/**
 * Get opportunities expiring within specified days
 */
export async function getExpiringOpportunities(
  daysThreshold: number = 7
): Promise<DeadlineAlert[]> {
  const db = await getDb();

  // Calculate date range
  const today = new Date();
  const thresholdDate = new Date(today);
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  // Query opportunities expiring within threshold
  const expiringOpps = await db
    .select({
      id: opportunities.id,
      donorName: opportunities.donorName,
      applicationDeadline: opportunities.applicationDeadline,
      organizationId: opportunities.organizationId,
      operatingUnitId: opportunities.operatingUnitId,
    })
    .from(opportunities)
    .where(
      and(
        eq(opportunities.isDeleted, false),
        // Deadline is today or in the future
        gte(opportunities.applicationDeadline, today.toISOString().split('T')[0]),
        // Deadline is within threshold
        lt(opportunities.applicationDeadline, thresholdDate.toISOString().split('T')[0])
      )
    );

  // Transform to DeadlineAlert format
  return expiringOpps.map((opp) => {
    const deadline = new Date(opp.applicationDeadline);
    const daysUntil = Math.ceil(
      (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    let status: 'urgent' | 'closing-soon' | 'expiring-today' = 'closing-soon';
    if (daysUntil === 0) {
      status = 'expiring-today';
    } else if (daysUntil <= 3) {
      status = 'urgent';
    }

    return {
      opportunityId: opp.id,
      donorName: opp.donorName,
      applicationDeadline: opp.applicationDeadline,
      daysUntilDeadline: daysUntil,
      status,
      organizationId: opp.organizationId,
      operatingUnitId: opp.operatingUnitId,
    };
  });
}

/**
 * Get opportunities that have already expired
 */
export async function getExpiredOpportunities(): Promise<DeadlineAlert[]> {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];

  const expiredOpps = await db
    .select({
      id: opportunities.id,
      donorName: opportunities.donorName,
      applicationDeadline: opportunities.applicationDeadline,
      organizationId: opportunities.organizationId,
      operatingUnitId: opportunities.operatingUnitId,
    })
    .from(opportunities)
    .where(
      and(
        eq(opportunities.isDeleted, false),
        lt(opportunities.applicationDeadline, today)
      )
    );

  return expiredOpps.map((opp) => ({
    opportunityId: opp.id,
    donorName: opp.donorName,
    applicationDeadline: opp.applicationDeadline,
    daysUntilDeadline: -1, // Already expired
    status: 'expiring-today' as const,
    organizationId: opp.organizationId,
    operatingUnitId: opp.operatingUnitId,
  }));
}

/**
 * Send deadline alert notifications
 */
export async function sendDeadlineAlerts(): Promise<{
  sent: number;
  failed: number;
  alerts: DeadlineAlert[];
}> {
  try {
    const alerts = await getExpiringOpportunities(7);

    if (alerts.length === 0) {
      return { sent: 0, failed: 0, alerts: [] };
    }

    // Group alerts by organization
    const alertsByOrg = alerts.reduce(
      (acc, alert) => {
        const key = alert.organizationId;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(alert);
        return acc;
      },
      {} as Record<string, DeadlineAlert[]>
    );

    let sent = 0;
    let failed = 0;

    // Send notifications for each organization
    for (const [orgId, orgAlerts] of Object.entries(alertsByOrg)) {
      try {
        const urgentCount = orgAlerts.filter((a) => a.status === 'urgent').length;
        const closingSoonCount = orgAlerts.filter(
          (a) => a.status === 'closing-soon'
        ).length;
        const expiringTodayCount = orgAlerts.filter(
          (a) => a.status === 'expiring-today'
        ).length;

        const alertSummary = [
          urgentCount > 0 && `${urgentCount} urgent (≤3 days)`,
          closingSoonCount > 0 && `${closingSoonCount} closing soon (4-7 days)`,
          expiringTodayCount > 0 && `${expiringTodayCount} expiring today`,
        ]
          .filter(Boolean)
          .join(', ');

        const result = await notifyOwner({
          title: `🔔 Funding Opportunity Deadline Alerts (${orgAlerts.length} total)`,
          content: `
<h3>Funding Opportunity Deadlines</h3>
<p>You have <strong>${orgAlerts.length}</strong> funding opportunities with approaching deadlines:</p>
<ul>
${orgAlerts
  .map(
    (alert) => `
  <li>
    <strong>${alert.donorName}</strong> - Deadline: ${alert.applicationDeadline}
    <br/>
    <small>${alert.daysUntilDeadline} days remaining (${alert.status})</small>
  </li>
`
  )
  .join('')}
</ul>
<p><strong>Summary:</strong> ${alertSummary}</p>
<p>Log in to the Donor CRM to review and take action on these opportunities.</p>
          `,
        });

        if (result) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Failed to send alert for organization ${orgId}:`, error);
        failed++;
      }
    }

    return { sent, failed, alerts };
  } catch (error) {
    console.error('Error sending deadline alerts:', error);
    return { sent: 0, failed: 1, alerts: [] };
  }
}

/**
 * Get alert statistics for dashboard
 */
export async function getAlertStatistics(): Promise<{
  urgent: number;
  closingSoon: number;
  expiringToday: number;
  expired: number;
}> {
  const expiringAlerts = await getExpiringOpportunities(7);
  const expiredAlerts = await getExpiredOpportunities();

  const urgent = expiringAlerts.filter((a) => a.status === 'urgent').length;
  const closingSoon = expiringAlerts.filter(
    (a) => a.status === 'closing-soon'
  ).length;
  const expiringToday = expiringAlerts.filter(
    (a) => a.status === 'expiring-today'
  ).length;
  const expired = expiredAlerts.length;

  return { urgent, closingSoon, expiringToday, expired };
}

/**
 * Format deadline alert for display
 */
export function formatDeadlineAlert(alert: DeadlineAlert): string {
  const statusEmoji = {
    urgent: '🔴',
    'closing-soon': '🟡',
    'expiring-today': '🔔',
  };

  return `${statusEmoji[alert.status]} ${alert.donorName} - ${alert.applicationDeadline} (${alert.daysUntilDeadline} days)`;
}
