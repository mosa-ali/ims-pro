import { sendDeadlineAlerts } from '../services/deadlineAlertService';

/**
 * Deadline Alert Job
 * Runs daily at 6 AM to check for expiring opportunities and send alerts
 */

export async function runDeadlineAlertJob() {
  try {
    console.log('[DeadlineAlertJob] Starting deadline alert check...');

    const result = await sendDeadlineAlerts();

    console.log(
      `[DeadlineAlertJob] Completed: ${result.sent} sent, ${result.failed} failed, ${result.alerts.length} alerts found`
    );

    if (result.alerts.length > 0) {
      console.log('[DeadlineAlertJob] Alerts summary:');
      result.alerts.forEach((alert) => {
        console.log(
          `  - ${alert.donorName}: ${alert.daysUntilDeadline} days (${alert.status})`
        );
      });
    }

    return result;
  } catch (error) {
    console.error('[DeadlineAlertJob] Error:', error);
    throw error;
  }
}

/**
 * Job configuration for scheduler
 */
export const deadlineAlertJobConfig = {
  name: 'deadline-alert-check',
  schedule: '0 6 * * *', // Daily at 6 AM
  description: 'Check for expiring funding opportunities and send alerts',
  handler: runDeadlineAlertJob,
};
