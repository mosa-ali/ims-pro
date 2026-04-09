/**
 * Event Trigger Service
 * Detects critical fleet events and triggers notifications
 */

import NotificationService, {
  NotificationEventType,
  NotificationSeverity,
  NotificationChannel,
  NotificationPayload,
} from "./notificationService";

// ============================================================================
// VEHICLE BREAKDOWN DETECTION
// ============================================================================

export interface VehicleBreakdownEvent {
  vehicleId: string;
  vehicleName: string;
  breakdownType: "engine" | "transmission" | "electrical" | "mechanical" | "unknown";
  location: string;
  timestamp: Date;
  driverId?: string;
  driverName?: string;
  organizationId: string;
  operatingUnitId: string;
}

export async function detectVehicleBreakdown(event: VehicleBreakdownEvent): Promise<string> {
  const payload: NotificationPayload = {
    eventType: NotificationEventType.VEHICLE_BREAKDOWN,
    severity: NotificationSeverity.CRITICAL,
    title: `🚨 Vehicle Breakdown Alert: ${event.vehicleName}`,
    message: `${event.vehicleName} has broken down at ${event.location}. Type: ${event.breakdownType}${
      event.driverName ? `. Driver: ${event.driverName}` : ""
    }`,
    channels: [NotificationChannel.PUSH, NotificationChannel.SMS, NotificationChannel.IN_APP],
    recipientId: event.driverId || "fleet_manager",
    organizationId: event.organizationId,
    operatingUnitId: event.operatingUnitId,
    metadata: {
      vehicleId: event.vehicleId,
      breakdownType: event.breakdownType,
      location: event.location,
      timestamp: event.timestamp,
    },
    actionUrl: `/organization/logistics/fleet/vehicles/${event.vehicleId}/detail`,
    imageUrl: "https://cdn.example.com/breakdown-alert.png",
  };

  return await NotificationService.sendNotification(payload);
}

// ============================================================================
// COMPLIANCE VIOLATION DETECTION
// ============================================================================

export interface ComplianceViolationEvent {
  vehicleId: string;
  vehicleName: string;
  violationType:
    | "expired_license"
    | "expired_inspection"
    | "expired_insurance"
    | "missing_document"
    | "failed_inspection";
  violationDetails: string;
  daysUntilExpiry?: number;
  organizationId: string;
  operatingUnitId: string;
}

export async function detectComplianceViolation(
  event: ComplianceViolationEvent
): Promise<string> {
  const severity =
    event.daysUntilExpiry && event.daysUntilExpiry <= 7
      ? NotificationSeverity.CRITICAL
      : event.daysUntilExpiry && event.daysUntilExpiry <= 30
        ? NotificationSeverity.HIGH
        : NotificationSeverity.MEDIUM;

  const payload: NotificationPayload = {
    eventType: NotificationEventType.COMPLIANCE_VIOLATION,
    severity,
    title: `⚠️ Compliance Alert: ${event.vehicleName}`,
    message: `${event.vehicleName} has a compliance issue: ${event.violationType}. ${event.violationDetails}${
      event.daysUntilExpiry ? ` (Expires in ${event.daysUntilExpiry} days)` : ""
    }`,
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    recipientId: "compliance_manager",
    organizationId: event.organizationId,
    operatingUnitId: event.operatingUnitId,
    metadata: {
      vehicleId: event.vehicleId,
      violationType: event.violationType,
      daysUntilExpiry: event.daysUntilExpiry,
    },
    actionUrl: `/organization/logistics/fleet/compliance`,
  };

  return await NotificationService.sendNotification(payload);
}

// ============================================================================
// FUEL ANOMALY DETECTION
// ============================================================================

export interface FuelAnomalyEvent {
  vehicleId: string;
  vehicleName: string;
  anomalyType: "high_consumption" | "fuel_theft" | "unusual_pattern" | "data_error";
  expectedConsumption: number;
  actualConsumption: number;
  variance: number;
  tripId?: string;
  organizationId: string;
  operatingUnitId: string;
}

export async function detectFuelAnomaly(event: FuelAnomalyEvent): Promise<string> {
  const severity =
    event.variance > 50
      ? NotificationSeverity.CRITICAL
      : event.variance > 30
        ? NotificationSeverity.HIGH
        : NotificationSeverity.MEDIUM;

  const payload: NotificationPayload = {
    eventType: NotificationEventType.FUEL_ANOMALY,
    severity,
    title: `⛽ Fuel Anomaly Detected: ${event.vehicleName}`,
    message: `${event.vehicleName} shows unusual fuel consumption. Expected: ${event.expectedConsumption}L, Actual: ${event.actualConsumption}L (${event.variance.toFixed(1)}% variance). Type: ${event.anomalyType}`,
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    recipientId: "fleet_analyst",
    organizationId: event.organizationId,
    operatingUnitId: event.operatingUnitId,
    metadata: {
      vehicleId: event.vehicleId,
      anomalyType: event.anomalyType,
      expectedConsumption: event.expectedConsumption,
      actualConsumption: event.actualConsumption,
      variance: event.variance,
      tripId: event.tripId,
    },
    actionUrl: `/organization/logistics/fleet/fuel-analytics`,
  };

  return await NotificationService.sendNotification(payload);
}

// ============================================================================
// MAINTENANCE DUE DETECTION
// ============================================================================

export interface MaintenanceDueEvent {
  vehicleId: string;
  vehicleName: string;
  maintenanceType: string;
  daysUntilDue: number;
  mileageUntilDue?: number;
  estimatedCost?: number;
  organizationId: string;
  operatingUnitId: string;
}

export async function detectMaintenanceDue(event: MaintenanceDueEvent): Promise<string> {
  const severity =
    event.daysUntilDue <= 7
      ? NotificationSeverity.CRITICAL
      : event.daysUntilDue <= 30
        ? NotificationSeverity.HIGH
        : NotificationSeverity.MEDIUM;

  const payload: NotificationPayload = {
    eventType: NotificationEventType.MAINTENANCE_DUE,
    severity,
    title: `🔧 Maintenance Due: ${event.vehicleName}`,
    message: `${event.vehicleName} requires ${event.maintenanceType} maintenance in ${event.daysUntilDue} days${
      event.mileageUntilDue ? ` or ${event.mileageUntilDue}km` : ""
    }${event.estimatedCost ? `. Estimated cost: $${event.estimatedCost}` : ""}`,
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    recipientId: "maintenance_manager",
    organizationId: event.organizationId,
    operatingUnitId: event.operatingUnitId,
    metadata: {
      vehicleId: event.vehicleId,
      maintenanceType: event.maintenanceType,
      daysUntilDue: event.daysUntilDue,
      mileageUntilDue: event.mileageUntilDue,
      estimatedCost: event.estimatedCost,
    },
    actionUrl: `/organization/logistics/fleet/maintenance`,
  };

  return await NotificationService.sendNotification(payload);
}

// ============================================================================
// DRIVER ALERT DETECTION
// ============================================================================

export interface DriverAlertEvent {
  driverId: string;
  driverName: string;
  alertType: "speeding" | "harsh_braking" | "harsh_acceleration" | "fatigue" | "distraction";
  severity: NotificationSeverity;
  details: string;
  vehicleId?: string;
  vehicleName?: string;
  organizationId: string;
  operatingUnitId: string;
}

export async function detectDriverAlert(event: DriverAlertEvent): Promise<string> {
  const payload: NotificationPayload = {
    eventType: NotificationEventType.DRIVER_ALERT,
    severity: event.severity,
    title: `⚡ Driver Alert: ${event.driverName}`,
    message: `${event.driverName} - ${event.alertType.replace(/_/g, " ")}: ${event.details}${
      event.vehicleName ? `. Vehicle: ${event.vehicleName}` : ""
    }`,
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    recipientId: "fleet_manager",
    organizationId: event.organizationId,
    operatingUnitId: event.operatingUnitId,
    metadata: {
      driverId: event.driverId,
      alertType: event.alertType,
      vehicleId: event.vehicleId,
    },
    actionUrl: `/organization/logistics/fleet/drivers/${event.driverId}/detail`,
  };

  return await NotificationService.sendNotification(payload);
}

// ============================================================================
// TRIP COMPLETION NOTIFICATION
// ============================================================================

export interface TripCompletionEvent {
  tripId: string;
  vehicleId: string;
  vehicleName: string;
  driverId: string;
  driverName: string;
  distance: number;
  fuelConsumed: number;
  duration: number;
  organizationId: string;
  operatingUnitId: string;
}

export async function notifyTripCompletion(event: TripCompletionEvent): Promise<string> {
  const payload: NotificationPayload = {
    eventType: NotificationEventType.TRIP_COMPLETION,
    severity: NotificationSeverity.LOW,
    title: `✅ Trip Completed: ${event.vehicleName}`,
    message: `Trip completed by ${event.driverName}. Distance: ${event.distance}km, Fuel: ${event.fuelConsumed}L, Duration: ${event.duration}min`,
    channels: [NotificationChannel.IN_APP],
    recipientId: event.driverId,
    organizationId: event.organizationId,
    operatingUnitId: event.operatingUnitId,
    metadata: {
      tripId: event.tripId,
      vehicleId: event.vehicleId,
      distance: event.distance,
      fuelConsumed: event.fuelConsumed,
      duration: event.duration,
    },
    actionUrl: `/organization/logistics/fleet/trips/${event.tripId}/detail`,
  };

  return await NotificationService.sendNotification(payload);
}

export default {
  detectVehicleBreakdown,
  detectComplianceViolation,
  detectFuelAnomaly,
  detectMaintenanceDue,
  detectDriverAlert,
  notifyTripCompletion,
};
