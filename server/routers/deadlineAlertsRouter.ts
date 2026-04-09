import { router, protectedProcedure } from '../_core/trpc';
import {
  getExpiringOpportunities,
  getExpiredOpportunities,
  getAlertStatistics,
  sendDeadlineAlerts,
} from '../services/deadlineAlertService';

/**
 * Deadline Alerts Router
 * Provides tRPC procedures for managing deadline alerts
 */

export const deadlineAlertsRouter = router({
  /**
   * Get opportunities expiring within 7 days
   */
  getExpiringOpportunities: protectedProcedure.query(async () => {
    try {
      const alerts = await getExpiringOpportunities(7);
      return {
        success: true,
        data: alerts,
        count: alerts.length,
      };
    } catch (error) {
      console.error('Error fetching expiring opportunities:', error);
      return {
        success: false,
        data: [],
        count: 0,
        error: 'Failed to fetch expiring opportunities',
      };
    }
  }),

  /**
   * Get opportunities that have already expired
   */
  getExpiredOpportunities: protectedProcedure.query(async () => {
    try {
      const alerts = await getExpiredOpportunities();
      return {
        success: true,
        data: alerts,
        count: alerts.length,
      };
    } catch (error) {
      console.error('Error fetching expired opportunities:', error);
      return {
        success: false,
        data: [],
        count: 0,
        error: 'Failed to fetch expired opportunities',
      };
    }
  }),

  /**
   * Get alert statistics for dashboard
   */
  getAlertStatistics: protectedProcedure.query(async () => {
    try {
      const stats = await getAlertStatistics();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error('Error fetching alert statistics:', error);
      return {
        success: false,
        data: {
          urgent: 0,
          closingSoon: 0,
          expiringToday: 0,
          expired: 0,
        },
        error: 'Failed to fetch alert statistics',
      };
    }
  }),

  /**
   * Manually trigger deadline alert notifications
   * (Admin only - for testing or manual triggering)
   */
  triggerAlerts: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Check if user is admin (optional - remove if not needed)
      // if (ctx.user.role !== 'admin') {
      //   throw new Error('Only admins can trigger alerts');
      // }

      const result = await sendDeadlineAlerts();
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Error triggering alerts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger alerts',
      };
    }
  }),
});
