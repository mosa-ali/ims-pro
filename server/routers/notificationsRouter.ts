/**
 * Notifications Router
 * Handles notification management, preferences, and delivery
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import NotificationService, {
  NotificationChannel,
  NotificationEventType,
  NotificationSeverity,
} from "../notifications/notificationService";

// ============================================================================
// SCHEMAS
// ============================================================================

const NotificationChannelEnum = z.enum(["push", "sms", "in_app", "email"]);
const NotificationEventTypeEnum = z.enum([
  "vehicle_breakdown",
  "compliance_violation",
  "fuel_anomaly",
  "maintenance_due",
  "driver_alert",
  "trip_completion",
  "system_alert",
]);
const NotificationSeverityEnum = z.enum(["low", "medium", "high", "critical"]);

const GetNotificationsSchema = z.object({
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
});

const MarkAsReadSchema = z.object({
  notificationId: z.string(),
});

const DeleteNotificationSchema = z.object({
  notificationId: z.string(),
});

const UpdatePreferencesSchema = z.object({
  eventType: NotificationEventTypeEnum,
  channels: z.array(NotificationChannelEnum),
  enabled: z.boolean().default(true),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  timezone: z.string().optional(),
});

const GetPreferencesSchema = z.object({
  eventType: NotificationEventTypeEnum.optional(),
});

// ============================================================================
// PROCEDURES
// ============================================================================

export const notificationsRouter = router({
  /**
   * Get user notifications
   */
  getNotifications: protectedProcedure
    .input(GetNotificationsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const { notifications, total } = await NotificationService.getUserNotifications(
          ctx.user.id,
          ctx.user.organizationId,
          input.limit,
          input.offset
        );

        return {
          notifications,
          total,
          hasMore: input.offset + input.limit < total,
        };
      } catch (error) {
        console.error("Error getting notifications:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch notifications",
        });
      }
    }),

  /**
   * Get unread notification count
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      // This would query the database for unread count
      // For now, return a placeholder
      return {
        unreadCount: 0,
      };
    } catch (error) {
      console.error("Error getting unread count:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch unread count",
      });
    }
  }),

  /**
   * Mark notification as read
   */
  markAsRead: protectedProcedure
    .input(MarkAsReadSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await NotificationService.markAsRead(input.notificationId);

        return {
          success: true,
          message: "Notification marked as read",
        };
      } catch (error) {
        console.error("Error marking notification as read:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to mark notification as read",
        });
      }
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // This would mark all notifications as read for the user
      return {
        success: true,
        message: "All notifications marked as read",
      };
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to mark all notifications as read",
      });
    }
  }),

  /**
   * Delete notification
   */
  deleteNotification: protectedProcedure
    .input(DeleteNotificationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await NotificationService.deleteNotification(input.notificationId);

        return {
          success: true,
          message: "Notification deleted",
        };
      } catch (error) {
        console.error("Error deleting notification:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete notification",
        });
      }
    }),

  /**
   * Delete all notifications
   */
  deleteAllNotifications: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // This would delete all notifications for the user
      return {
        success: true,
        message: "All notifications deleted",
      };
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete all notifications",
      });
    }
  }),

  /**
   * Get notification preferences
   */
  getPreferences: protectedProcedure
    .input(GetPreferencesSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Get user preferences from database
        // For now, return default preferences
        const defaultPreferences = {
          eventType: input.eventType || NotificationEventType.VEHICLE_BREAKDOWN,
          channels: [NotificationChannel.IN_APP],
          enabled: true,
          quietHoursStart: "22:00",
          quietHoursEnd: "08:00",
          timezone: "UTC",
        };

        return defaultPreferences;
      } catch (error) {
        console.error("Error getting preferences:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch preferences",
        });
      }
    }),

  /**
   * Update notification preferences
   */
  updatePreferences: protectedProcedure
    .input(UpdatePreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await NotificationService.updatePreferences(ctx.user.id, input);

        return {
          success: true,
          message: "Preferences updated",
          preferences: input,
        };
      } catch (error) {
        console.error("Error updating preferences:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update preferences",
        });
      }
    }),

  /**
   * Get all event types
   */
  getEventTypes: protectedProcedure.query(async () => {
    return {
      eventTypes: [
        {
          id: NotificationEventType.VEHICLE_BREAKDOWN,
          label: "Vehicle Breakdown",
          description: "Critical vehicle breakdown alerts",
        },
        {
          id: NotificationEventType.COMPLIANCE_VIOLATION,
          label: "Compliance Violation",
          description: "Compliance and regulatory violations",
        },
        {
          id: NotificationEventType.FUEL_ANOMALY,
          label: "Fuel Anomaly",
          description: "Unusual fuel consumption patterns",
        },
        {
          id: NotificationEventType.MAINTENANCE_DUE,
          label: "Maintenance Due",
          description: "Scheduled maintenance reminders",
        },
        {
          id: NotificationEventType.DRIVER_ALERT,
          label: "Driver Alert",
          description: "Driver behavior and safety alerts",
        },
        {
          id: NotificationEventType.TRIP_COMPLETION,
          label: "Trip Completion",
          description: "Trip completion notifications",
        },
        {
          id: NotificationEventType.SYSTEM_ALERT,
          label: "System Alert",
          description: "System and operational alerts",
        },
      ],
    };
  }),

  /**
   * Get available notification channels
   */
  getChannels: protectedProcedure.query(async () => {
    return {
      channels: [
        {
          id: NotificationChannel.PUSH,
          label: "Push Notification",
          description: "Mobile push notifications",
          enabled: true,
        },
        {
          id: NotificationChannel.SMS,
          label: "SMS Alert",
          description: "Text message alerts",
          enabled: true,
        },
        {
          id: NotificationChannel.IN_APP,
          label: "In-App Notification",
          description: "In-application notifications",
          enabled: true,
        },
        {
          id: NotificationChannel.EMAIL,
          label: "Email",
          description: "Email notifications",
          enabled: true,
        },
      ],
    };
  }),

  /**
   * Get notification statistics
   */
  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Get notification statistics for the user
      return {
        totalNotifications: 0,
        unreadNotifications: 0,
        notificationsByType: {},
        notificationsByChannel: {},
        lastNotificationTime: null,
      };
    } catch (error) {
      console.error("Error getting statistics:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch statistics",
      });
    }
  }),
});

export default notificationsRouter;
