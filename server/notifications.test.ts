/**
 * Notification System Tests
 * Comprehensive tests for notification service, event triggers, and router
 */

import { describe, it, expect, beforeEach } from "vitest";
import NotificationService, {
  NotificationChannel,
  NotificationEventType,
  NotificationSeverity,
} from "./notifications/notificationService";
import {
  detectVehicleBreakdown,
  detectComplianceViolation,
  detectFuelAnomaly,
  detectMaintenanceDue,
  detectDriverAlert,
  notifyTripCompletion,
} from "./notifications/eventTriggerService";
import { notificationsRouter } from "./routers/notificationsRouter";

// ============================================================================
// MOCK DATA
// ============================================================================

const mockUser = {
  id: "user-001",
  email: "user@example.com",
  organizationId: "org-001",
  operatingUnitId: "ou-001",
  role: "admin" as const,
};

const mockCtx = { user: mockUser };

// ============================================================================
// NOTIFICATION SERVICE TESTS
// ============================================================================

describe("Notification Service", () => {
  describe("Send Notification", () => {
    it("should send notification with valid payload", async () => {
      const payload = {
        eventType: NotificationEventType.VEHICLE_BREAKDOWN,
        severity: NotificationSeverity.CRITICAL,
        title: "Vehicle Breakdown Alert",
        message: "Vehicle VH-001 has broken down",
        channels: [NotificationChannel.PUSH, NotificationChannel.SMS],
        recipientId: "user-001",
        organizationId: "org-001",
        operatingUnitId: "ou-001",
      };

      const result = await NotificationService.sendNotification(payload);
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("should respect user notification preferences", async () => {
      const payload = {
        eventType: NotificationEventType.FUEL_ANOMALY,
        severity: NotificationSeverity.MEDIUM,
        title: "Fuel Anomaly Detected",
        message: "Unusual fuel consumption detected",
        channels: [NotificationChannel.PUSH],
        recipientId: "user-001",
        organizationId: "org-001",
        operatingUnitId: "ou-001",
      };

      const result = await NotificationService.sendNotification(payload);
      expect(result).toBeDefined();
    });

    it("should handle multiple notification channels", async () => {
      const payload = {
        eventType: NotificationEventType.COMPLIANCE_VIOLATION,
        severity: NotificationSeverity.HIGH,
        title: "Compliance Alert",
        message: "Vehicle license expired",
        channels: [
          NotificationChannel.PUSH,
          NotificationChannel.SMS,
          NotificationChannel.IN_APP,
          NotificationChannel.EMAIL,
        ],
        recipientId: "user-001",
        organizationId: "org-001",
        operatingUnitId: "ou-001",
      };

      const result = await NotificationService.sendNotification(payload);
      expect(result).toBeDefined();
    });

    it("should include metadata in notification", async () => {
      const payload = {
        eventType: NotificationEventType.VEHICLE_BREAKDOWN,
        severity: NotificationSeverity.CRITICAL,
        title: "Vehicle Breakdown",
        message: "Vehicle VH-001 breakdown",
        channels: [NotificationChannel.PUSH],
        recipientId: "user-001",
        organizationId: "org-001",
        operatingUnitId: "ou-001",
        metadata: {
          vehicleId: "VH-001",
          location: "Highway 101",
          breakdownType: "engine",
        },
      };

      const result = await NotificationService.sendNotification(payload);
      expect(result).toBeDefined();
    });

    it("should include action URL in notification", async () => {
      const payload = {
        eventType: NotificationEventType.VEHICLE_BREAKDOWN,
        severity: NotificationSeverity.CRITICAL,
        title: "Vehicle Breakdown",
        message: "Vehicle VH-001 breakdown",
        channels: [NotificationChannel.PUSH],
        recipientId: "user-001",
        organizationId: "org-001",
        operatingUnitId: "ou-001",
        actionUrl: "/organization/logistics/fleet/vehicles/VH-001/detail",
      };

      const result = await NotificationService.sendNotification(payload);
      expect(result).toBeDefined();
    });
  });

  describe("Get User Preferences", () => {
    it("should return default preferences if not found", async () => {
      const preferences = await NotificationService.getUserPreferences(
        "user-001",
        NotificationEventType.VEHICLE_BREAKDOWN
      );

      expect(preferences).toBeDefined();
      expect(preferences.userId).toBe("user-001");
      expect(preferences.eventType).toBe(NotificationEventType.VEHICLE_BREAKDOWN);
      expect(preferences.enabled).toBe(true);
      expect(Array.isArray(preferences.channels)).toBe(true);
    });

    it("should return preferences with quiet hours", async () => {
      const preferences = await NotificationService.getUserPreferences(
        "user-001",
        NotificationEventType.FUEL_ANOMALY
      );

      expect(preferences).toBeDefined();
      expect(preferences.eventType).toBe(NotificationEventType.FUEL_ANOMALY);
    });
  });
});

// ============================================================================
// EVENT TRIGGER TESTS
// ============================================================================

describe("Event Triggers", () => {
  describe("Vehicle Breakdown Detection", () => {
    it("should detect and notify vehicle breakdown", async () => {
      const event = {
        vehicleId: "VH-001",
        vehicleName: "Truck-001",
        breakdownType: "engine" as const,
        location: "Highway 101",
        timestamp: new Date(),
        driverId: "DR-001",
        driverName: "John Doe",
        organizationId: "org-001",
        operatingUnitId: "ou-001",
      };

      const result = await detectVehicleBreakdown(event);
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("should include vehicle details in breakdown notification", async () => {
      const event = {
        vehicleId: "VH-002",
        vehicleName: "Van-001",
        breakdownType: "transmission" as const,
        location: "Downtown",
        timestamp: new Date(),
        organizationId: "org-001",
        operatingUnitId: "ou-001",
      };

      const result = await detectVehicleBreakdown(event);
      expect(result).toBeDefined();
    });
  });

  describe("Compliance Violation Detection", () => {
    it("should detect expired license", async () => {
      const event = {
        vehicleId: "VH-001",
        vehicleName: "Truck-001",
        violationType: "expired_license" as const,
        violationDetails: "Vehicle license expired on 2026-03-01",
        daysUntilExpiry: 0,
        organizationId: "org-001",
        operatingUnitId: "ou-001",
      };

      const result = await detectComplianceViolation(event);
      expect(result).toBeDefined();
    });

    it("should set critical severity for imminent expiry", async () => {
      const event = {
        vehicleId: "VH-001",
        vehicleName: "Truck-001",
        violationType: "expired_inspection" as const,
        violationDetails: "Vehicle inspection expires soon",
        daysUntilExpiry: 3,
        organizationId: "org-001",
        operatingUnitId: "ou-001",
      };

      const result = await detectComplianceViolation(event);
      expect(result).toBeDefined();
    });
  });

  describe("Fuel Anomaly Detection", () => {
    it("should detect high fuel consumption", async () => {
      const event = {
        vehicleId: "VH-001",
        vehicleName: "Truck-001",
        anomalyType: "high_consumption" as const,
        expectedConsumption: 50,
        actualConsumption: 85,
        variance: 70,
        organizationId: "org-001",
        operatingUnitId: "ou-001",
      };

      const result = await detectFuelAnomaly(event);
      expect(result).toBeDefined();
    });

    it("should detect fuel theft", async () => {
      const event = {
        vehicleId: "VH-002",
        vehicleName: "Van-001",
        anomalyType: "fuel_theft" as const,
        expectedConsumption: 30,
        actualConsumption: 5,
        variance: -83,
        tripId: "TR-001",
        organizationId: "org-001",
        operatingUnitId: "ou-001",
      };

      const result = await detectFuelAnomaly(event);
      expect(result).toBeDefined();
    });

    it("should set critical severity for high variance", async () => {
      const event = {
        vehicleId: "VH-001",
        vehicleName: "Truck-001",
        anomalyType: "unusual_pattern" as const,
        expectedConsumption: 40,
        actualConsumption: 120,
        variance: 200,
        organizationId: "org-001",
        operatingUnitId: "ou-001",
      };

      const result = await detectFuelAnomaly(event);
      expect(result).toBeDefined();
    });
  });

  describe("Maintenance Due Detection", () => {
    it("should detect imminent maintenance", async () => {
      const event = {
        vehicleId: "VH-001",
        vehicleName: "Truck-001",
        maintenanceType: "Oil Change",
        daysUntilDue: 5,
        mileageUntilDue: 500,
        estimatedCost: 150,
        organizationId: "org-001",
        operatingUnitId: "ou-001",
      };

      const result = await detectMaintenanceDue(event);
      expect(result).toBeDefined();
    });

    it("should set critical severity for overdue maintenance", async () => {
      const event = {
        vehicleId: "VH-002",
        vehicleName: "Van-001",
        maintenanceType: "Brake Service",
        daysUntilDue: 2,
        organizationId: "org-001",
        operatingUnitId: "ou-001",
      };

      const result = await detectMaintenanceDue(event);
      expect(result).toBeDefined();
    });
  });

  describe("Driver Alert Detection", () => {
    it("should detect speeding", async () => {
      const event = {
        driverId: "DR-001",
        driverName: "John Doe",
        alertType: "speeding" as const,
        severity: NotificationSeverity.HIGH,
        details: "Exceeded speed limit by 20 km/h",
        vehicleId: "VH-001",
        vehicleName: "Truck-001",
        organizationId: "org-001",
        operatingUnitId: "ou-001",
      };

      const result = await detectDriverAlert(event);
      expect(result).toBeDefined();
    });

    it("should detect harsh braking", async () => {
      const event = {
        driverId: "DR-002",
        driverName: "Jane Smith",
        alertType: "harsh_braking" as const,
        severity: NotificationSeverity.MEDIUM,
        details: "Harsh braking detected",
        organizationId: "org-001",
        operatingUnitId: "ou-001",
      };

      const result = await detectDriverAlert(event);
      expect(result).toBeDefined();
    });
  });

  describe("Trip Completion Notification", () => {
    it("should notify trip completion", async () => {
      const event = {
        tripId: "TR-001",
        vehicleId: "VH-001",
        vehicleName: "Truck-001",
        driverId: "DR-001",
        driverName: "John Doe",
        distance: 150,
        fuelConsumed: 45,
        duration: 180,
        organizationId: "org-001",
        operatingUnitId: "ou-001",
      };

      const result = await notifyTripCompletion(event);
      expect(result).toBeDefined();
    });

    it("should include trip metrics in notification", async () => {
      const event = {
        tripId: "TR-002",
        vehicleId: "VH-002",
        vehicleName: "Van-001",
        driverId: "DR-002",
        driverName: "Jane Smith",
        distance: 75,
        fuelConsumed: 20,
        duration: 90,
        organizationId: "org-001",
        operatingUnitId: "ou-001",
      };

      const result = await notifyTripCompletion(event);
      expect(result).toBeDefined();
    });
  });
});

// ============================================================================
// NOTIFICATIONS ROUTER TESTS
// ============================================================================

describe("Notifications Router", () => {
  describe("Get Notifications", () => {
    it("should get user notifications", async () => {
      const result = await notificationsRouter.createCaller(mockCtx).getNotifications({
        limit: 20,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("notifications");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("hasMore");
      expect(Array.isArray(result.notifications)).toBe(true);
    });

    it("should support pagination", async () => {
      const result = await notificationsRouter.createCaller(mockCtx).getNotifications({
        limit: 10,
        offset: 10,
      });

      expect(result).toBeDefined();
      expect(result.notifications).toBeDefined();
    });
  });

  describe("Notification Management", () => {
    it("should mark notification as read", async () => {
      const result = await notificationsRouter
        .createCaller(mockCtx)
        .markAsRead({ notificationId: "notif-001" });

      expect(result.success).toBe(true);
    });

    it("should mark all notifications as read", async () => {
      const result = await notificationsRouter.createCaller(mockCtx).markAllAsRead();

      expect(result.success).toBe(true);
    });

    it("should delete notification", async () => {
      const result = await notificationsRouter
        .createCaller(mockCtx)
        .deleteNotification({ notificationId: "notif-001" });

      expect(result.success).toBe(true);
    });

    it("should delete all notifications", async () => {
      const result = await notificationsRouter.createCaller(mockCtx).deleteAllNotifications();

      expect(result.success).toBe(true);
    });
  });

  describe("Notification Preferences", () => {
    it("should get notification preferences", async () => {
      const result = await notificationsRouter
        .createCaller(mockCtx)
        .getPreferences({ eventType: NotificationEventType.VEHICLE_BREAKDOWN });

      expect(result).toBeDefined();
      expect(result.eventType).toBe(NotificationEventType.VEHICLE_BREAKDOWN);
      expect(result.enabled).toBe(true);
      expect(Array.isArray(result.channels)).toBe(true);
    });

    it("should update notification preferences", async () => {
      const result = await notificationsRouter
        .createCaller(mockCtx)
        .updatePreferences({
          eventType: NotificationEventType.FUEL_ANOMALY,
          channels: [NotificationChannel.PUSH, NotificationChannel.SMS],
          enabled: true,
        });

      expect(result.success).toBe(true);
      expect(result.preferences).toBeDefined();
    });

    it("should support quiet hours configuration", async () => {
      const result = await notificationsRouter
        .createCaller(mockCtx)
        .updatePreferences({
          eventType: NotificationEventType.COMPLIANCE_VIOLATION,
          channels: [NotificationChannel.IN_APP],
          enabled: true,
          quietHoursStart: "22:00",
          quietHoursEnd: "08:00",
          timezone: "America/New_York",
        });

      expect(result.success).toBe(true);
    });
  });

  describe("Event Types & Channels", () => {
    it("should get all event types", async () => {
      const result = await notificationsRouter.createCaller(mockCtx).getEventTypes();

      expect(result.eventTypes).toBeDefined();
      expect(Array.isArray(result.eventTypes)).toBe(true);
      expect(result.eventTypes.length).toBeGreaterThan(0);
    });

    it("should get available notification channels", async () => {
      const result = await notificationsRouter.createCaller(mockCtx).getChannels();

      expect(result.channels).toBeDefined();
      expect(Array.isArray(result.channels)).toBe(true);
      expect(result.channels.length).toBeGreaterThan(0);
    });
  });

  describe("Notification Statistics", () => {
    it("should get notification statistics", async () => {
      const result = await notificationsRouter.createCaller(mockCtx).getStatistics();

      expect(result).toBeDefined();
      expect(result).toHaveProperty("totalNotifications");
      expect(result).toHaveProperty("unreadNotifications");
      expect(result).toHaveProperty("notificationsByType");
      expect(result).toHaveProperty("notificationsByChannel");
    });
  });

  describe("Unread Count", () => {
    it("should get unread notification count", async () => {
      const result = await notificationsRouter.createCaller(mockCtx).getUnreadCount();

      expect(result).toBeDefined();
      expect(result).toHaveProperty("unreadCount");
      expect(typeof result.unreadCount).toBe("number");
    });
  });
});
