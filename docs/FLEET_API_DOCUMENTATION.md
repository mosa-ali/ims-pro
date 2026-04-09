# Fleet Management API Documentation

**Version:** 1.0.0  
**Last Updated:** March 10, 2026  
**Status:** Production Ready

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Data Isolation](#data-isolation)
4. [Vehicle Management APIs](#vehicle-management-apis)
5. [Driver Management APIs](#driver-management-apis)
6. [Trip Management APIs](#trip-management-apis)
7. [Fuel Analytics APIs](#fuel-analytics-apis)
8. [Maintenance APIs](#maintenance-apis)
9. [Compliance APIs](#compliance-apis)
10. [ERP Integration APIs](#erp-integration-apis)
11. [Reporting APIs](#reporting-apis)
12. [Governance APIs](#governance-apis)
13. [Error Handling](#error-handling)
14. [Performance Optimization](#performance-optimization)

---

## Overview

The Fleet Management API provides comprehensive endpoints for managing vehicles, drivers, trips, fuel consumption, maintenance, compliance, and reporting. All endpoints use tRPC for type-safe communication with automatic serialization/deserialization.

**Base URL:** `/api/trpc`  
**Protocol:** HTTP/HTTPS  
**Authentication:** OAuth 2.0 (Manus Auth)  
**Response Format:** JSON (SuperJSON)

---

## Authentication

All API endpoints require authentication via Manus OAuth. The authentication context is automatically injected into each procedure through the `ctx` parameter.

```typescript
// Example: Accessing user context in a procedure
const myProcedure = scopedProcedure
  .input(z.object({ vehicleId: z.string() }))
  .query(async ({ ctx, input }) => {
    // ctx.user - Current authenticated user
    // ctx.scope.organizationId - User's organization
    // ctx.scope.operatingUnitId - User's operating unit
    const vehicle = await getVehicleDetail(input.vehicleId, ctx.scope);
    return vehicle;
  });
```

---

## Data Isolation

All endpoints enforce multi-tenant data isolation using `organizationId` and `operatingUnitId`. Users can only access data within their organization and operating unit.

**Isolation Levels:**
- **Organization Level:** Each organization has completely isolated data
- **Operating Unit Level:** Within an organization, data is further isolated by operating unit
- **User Level:** Users can only access data for their assigned operating unit

---

## Vehicle Management APIs

### 1. Get Vehicle Detail

Retrieves comprehensive vehicle profile including status, information, and audit trail.

**Endpoint:** `fleet.vehicle.getDetail`  
**Method:** Query  
**Input:**
```typescript
{
  vehicleId: string;
}
```

**Response:**
```typescript
{
  id: string;
  registrationNumber: string;
  status: "active" | "maintenance" | "idle" | "retired";
  information: {
    make: string;
    model: string;
    year: number;
    color: string;
    fuelType: "petrol" | "diesel" | "electric" | "hybrid";
  };
  auditTrail: {
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
  };
}
```

**Example Usage:**
```typescript
const { data: vehicle } = await trpc.fleet.vehicle.getDetail.useQuery({
  vehicleId: "veh-001"
});
```

---

### 2. Get Vehicle Statistics

Retrieves aggregated statistics for a vehicle including trips, fuel consumption, and maintenance records.

**Endpoint:** `fleet.vehicle.getStatistics`  
**Method:** Query  
**Input:**
```typescript
{
  vehicleId: string;
}
```

**Response:**
```typescript
{
  trips: {
    totalTrips: number;
    totalDistance: number;
    avgDistance: number;
  };
  fuel: {
    totalFuel: number;
    avgConsumption: number;
    totalCost: number;
  };
  maintenance: {
    totalRecords: number;
    totalCost: number;
  };
}
```

---

### 3. Get Vehicle Audit Trail

Retrieves the complete audit trail for a vehicle showing all changes and modifications.

**Endpoint:** `fleet.vehicle.getAuditTrail`  
**Method:** Query  
**Input:**
```typescript
{
  vehicleId: string;
  limit?: number; // Default: 50
  offset?: number; // Default: 0
}
```

**Response:**
```typescript
{
  logs: Array<{
    timestamp: Date;
    action: string;
    userId: string;
    changes: string;
  }>;
  total: number;
  limit: number;
  offset: number;
}
```

---

### 4. Can Create Trip

Validates whether a vehicle is eligible to create a new trip based on its status and assignments.

**Endpoint:** `fleet.vehicle.canCreateTrip`  
**Method:** Query  
**Input:**
```typescript
{
  vehicleId: string;
}
```

**Response:**
```typescript
{
  canCreate: boolean;
  reason?: string; // Explanation if cannot create
}
```

---

## Driver Management APIs

### 1. Get Driver Detail

Retrieves comprehensive driver profile including license information and status.

**Endpoint:** `fleet.driver.getDetail`  
**Method:** Query  
**Input:**
```typescript
{
  driverId: string;
}
```

**Response:**
```typescript
{
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: Date;
  licenseCategory: string;
  status: "active" | "inactive" | "suspended";
}
```

---

### 2. Get Driver Performance

Retrieves driver performance metrics including rating, safety score, and KPIs.

**Endpoint:** `fleet.driver.getPerformance`  
**Method:** Query  
**Input:**
```typescript
{
  driverId: string;
  dateRange?: "week" | "month" | "quarter" | "year"; // Default: month
}
```

**Response:**
```typescript
{
  rating: number; // 0-5
  safetyScore: number; // 0-100
  tripsCompleted: number;
  avgDistance: number;
  avgFuelConsumption: number;
  incidents: number;
}
```

---

### 3. Get Driver Assignment History

Retrieves the complete assignment history for a driver.

**Endpoint:** `fleet.driver.getAssignmentHistory`  
**Method:** Query  
**Input:**
```typescript
{
  driverId: string;
  limit?: number; // Default: 50
  offset?: number; // Default: 0
}
```

**Response:**
```typescript
{
  assignments: Array<{
    tripId: string;
    vehicleId: string;
    startDate: Date;
    endDate: Date;
    distance: number;
    status: string;
  }>;
  total: number;
  limit: number;
  offset: number;
}
```

---

### 4. Get Driver License Status

Validates driver license status and expiry.

**Endpoint:** `fleet.driver.getLicenseStatus`  
**Method:** Query  
**Input:**
```typescript
{
  driverId: string;
}
```

**Response:**
```typescript
{
  licenseNumber: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  status: "valid" | "expiring_soon" | "expired";
  category: string;
}
```

---

## Trip Management APIs

### 1. Get Trip Detail

Retrieves comprehensive trip information including route, timing, and efficiency metrics.

**Endpoint:** `fleet.trip.getDetail`  
**Method:** Query  
**Input:**
```typescript
{
  tripId: string;
}
```

**Response:**
```typescript
{
  id: string;
  vehicleId: string;
  driverId: string;
  startLocation: string;
  endLocation: string;
  startTime: Date;
  endTime: Date;
  distance: number;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
}
```

---

### 2. Get Trip Fuel Consumption

Retrieves fuel consumption data for a specific trip.

**Endpoint:** `fleet.trip.getFuelConsumption`  
**Method:** Query  
**Input:**
```typescript
{
  tripId: string;
}
```

**Response:**
```typescript
{
  totalFuel: number;
  totalCost: number;
  avgPrice: number;
  logs: Array<{
    date: Date;
    fuelConsumed: number;
    cost: number;
  }>;
}
```

---

### 3. Get Trip Efficiency

Calculates efficiency metrics for a trip.

**Endpoint:** `fleet.trip.getEfficiency`  
**Method:** Query  
**Input:**
```typescript
{
  tripId: string;
}
```

**Response:**
```typescript
{
  distance: number;
  fuelConsumed: number;
  efficiency: number; // km/liter
  duration: number; // hours
  costPerKm: number;
}
```

---

## Fuel Analytics APIs

### 1. Get Fuel Consumption Trends

Retrieves fuel consumption trends over a specified date range.

**Endpoint:** `fleet.fuel.getFuelConsumptionTrends`  
**Method:** Query  
**Input:**
```typescript
{
  vehicleId?: string;
  startDate: Date;
  endDate: Date;
}
```

**Response:**
```typescript
Array<{
  date: Date;
  totalFuel: number;
  totalCost: number;
  avgPrice: number;
}>
```

---

### 2. Get Fuel Efficiency Metrics

Calculates fuel efficiency metrics for a vehicle.

**Endpoint:** `fleet.fuel.getFuelEfficiencyMetrics`  
**Method:** Query  
**Input:**
```typescript
{
  vehicleId?: string;
  dateRange?: "week" | "month" | "quarter" | "year"; // Default: month
}
```

**Response:**
```typescript
{
  totalFuel: number;
  totalCost: number;
  avgPrice: number;
  totalDistance: number;
  efficiency: number; // km/liter
  costPerKm: number;
}
```

---

### 3. Get Fuel Anomalies

Detects fuel consumption anomalies based on historical averages.

**Endpoint:** `fleet.fuel.getFuelAnomalies`  
**Method:** Query  
**Input:**
```typescript
{
  vehicleId: string;
  threshold?: number; // Default: 1.5 (1.5x average)
}
```

**Response:**
```typescript
{
  avgConsumption: number;
  threshold: number;
  anomalies: Array<{
    date: Date;
    consumption: number;
    deviation: number; // percentage
    tripId: string;
  }>;
}
```

---

## Maintenance APIs

### 1. Get Maintenance Predictions

Generates predictive maintenance alerts based on mileage and service history.

**Endpoint:** `fleet.maintenance.getMaintenancePredictions`  
**Method:** Query  
**Input:**
```typescript
{
  vehicleId: string;
}
```

**Response:**
```typescript
{
  currentMileage: number;
  predictions: Array<{
    type: string;
    priority: "high" | "medium" | "low";
    dueIn: number; // km
    lastDone?: Date;
  }>;
}
```

---

### 2. Get Maintenance Schedule

Retrieves the maintenance schedule for a vehicle.

**Endpoint:** `fleet.maintenance.getMaintenanceSchedule`  
**Method:** Query  
**Input:**
```typescript
{
  vehicleId: string;
}
```

**Response:**
```typescript
Array<{
  id: string;
  vehicleId: string;
  maintenanceType: string;
  maintenanceDate: Date;
  cost: number;
  nextMaintenanceDate: Date;
}>
```

---

### 3. Get Maintenance History

Retrieves maintenance history with pagination support.

**Endpoint:** `fleet.maintenance.getMaintenanceHistory`  
**Method:** Query  
**Input:**
```typescript
{
  vehicleId: string;
  limit?: number; // Default: 50
  offset?: number; // Default: 0
}
```

**Response:**
```typescript
{
  records: Array<{
    id: string;
    vehicleId: string;
    maintenanceType: string;
    maintenanceDate: Date;
    cost: number;
    mileage: number;
  }>;
  total: number;
  limit: number;
  offset: number;
}
```

---

## Compliance APIs

### 1. Get Compliance Status

Retrieves compliance status for vehicles.

**Endpoint:** `fleet.compliance.getComplianceStatus`  
**Method:** Query  
**Input:**
```typescript
{
  vehicleId?: string;
}
```

**Response:**
```typescript
Array<{
  vehicleId: string;
  registrationNumber: string;
  insuranceExpiry: Date;
  pollutionCertificateExpiry: Date;
  complianceStatus: "compliant" | "non_compliant" | "expiring_soon";
}>
```

---

### 2. Get Compliance Documents

Retrieves compliance documents for a vehicle.

**Endpoint:** `fleet.compliance.getComplianceDocuments`  
**Method:** Query  
**Input:**
```typescript
{
  vehicleId: string;
}
```

**Response:**
```typescript
{
  registration: {
    number: string;
    expiry: Date;
  };
  insurance: {
    provider: string;
    expiry: Date;
  };
  pollution: {
    certificate: Date;
  };
}
```

---

### 3. Get Compliance Inspections

Retrieves compliance inspection records.

**Endpoint:** `fleet.compliance.getComplianceInspections`  
**Method:** Query  
**Input:**
```typescript
{
  vehicleId: string;
}
```

**Response:**
```typescript
Array<{
  id: string;
  vehicleId: string;
  inspectionDate: Date;
  result: "pass" | "fail";
  notes: string;
}>
```

---

## ERP Integration APIs

### 1. Get Vendor Status

Retrieves ERP vendor integration status.

**Endpoint:** `fleet.erp.vendor.getVendorStatus`  
**Method:** Query  
**Input:** (none)

**Response:**
```typescript
{
  status: "connected" | "disconnected";
  lastSync: Date;
  vendorCount: number;
  erpEndpoint: string;
  apiKeyConfigured: boolean;
  syncFrequency: string;
  automationEnabled: boolean;
  syncHistory: Array<{
    timestamp: Date;
    recordsCount: number;
    status: "success" | "failed";
  }>;
}
```

---

### 2. Sync Vendors

Triggers vendor synchronization from ERP system.

**Endpoint:** `fleet.erp.vendor.syncVendors`  
**Method:** Mutation  
**Input:** (none)

**Response:**
```typescript
{
  success: boolean;
  message: string;
  recordsSync: number;
  timestamp: Date;
}
```

---

### 3. Get Procurement Linkage

Retrieves purchase order linkage for a vehicle.

**Endpoint:** `fleet.erp.procurement.getProcurementLinkage`  
**Method:** Query  
**Input:**
```typescript
{
  vehicleId: string;
}
```

**Response:**
```typescript
{
  vehicleId: string;
  linkedPurchaseOrders: Array<{
    poNumber: string;
    poDate: Date;
    vendorId: string;
    status: string;
    totalAmount: number;
    lineItems: number;
  }>;
  totalLinked: number;
}
```

---

### 4. Get Finance Module Linkage

Retrieves financial data linkage for a vehicle.

**Endpoint:** `fleet.erp.finance.getFinanceModuleLinkage`  
**Method:** Query  
**Input:**
```typescript
{
  vehicleId: string;
}
```

**Response:**
```typescript
{
  vehicleId: string;
  registrationNumber: string;
  capitalCost: number;
  depreciationRate: number;
  fuelExpenses: number;
  maintenanceExpenses: number;
  insuranceExpenses: number;
  totalOperatingCost: number;
  costPerKm: number;
  glAccounts: {
    capitalAsset: string;
    depreciation: string;
    fuelExpense: string;
    maintenanceExpense: string;
    insuranceExpense: string;
  };
}
```

---

## Reporting APIs

### 1. Get Fleet Overview

Retrieves fleet overview metrics for the dashboard.

**Endpoint:** `fleet.reporting.dashboard.getFleetOverview`  
**Method:** Query  
**Input:** (none)

**Response:**
```typescript
{
  totalVehicles: number;
  vehiclesByStatus: Record<string, number>;
  totalDrivers: number;
  todayTrips: number;
  todayDistance: number;
  todayFuel: number;
  maintenanceDue: number;
}
```

---

### 2. Get Fleet Status Distribution

Retrieves vehicle status distribution.

**Endpoint:** `fleet.reporting.dashboard.getFleetStatusDistribution`  
**Method:** Query  
**Input:** (none)

**Response:**
```typescript
Record<string, number> // { "active": 45, "maintenance": 3, "idle": 2 }
```

---

### 3. Get Fleet Performance Metrics

Retrieves comprehensive fleet performance metrics.

**Endpoint:** `fleet.reporting.dashboard.getFleetPerformanceMetrics`  
**Method:** Query  
**Input:**
```typescript
{
  dateRange?: "week" | "month" | "quarter" | "year"; // Default: month
}
```

**Response:**
```typescript
{
  trips: {
    total: number;
    distance: number;
    avgDistance: number;
  };
  fuel: {
    consumed: number;
    cost: number;
    avgPrice: number;
  };
  efficiency: number;
  costPerKm: number;
}
```

---

### 4. Get Operational KPIs

Retrieves operational KPI metrics.

**Endpoint:** `fleet.reporting.kpi.getOperationalKPIs`  
**Method:** Query  
**Input:**
```typescript
{
  dateRange?: "week" | "month" | "quarter" | "year"; // Default: month
}
```

**Response:**
```typescript
{
  totalTrips: number;
  totalDistance: number;
  avgDistance: number;
  tripsPerDay: number;
  distancePerDay: number;
}
```

---

### 5. Get Financial KPIs

Retrieves financial KPI metrics.

**Endpoint:** `fleet.reporting.kpi.getFinancialKPIs`  
**Method:** Query  
**Input:**
```typescript
{
  dateRange?: "week" | "month" | "quarter" | "year"; // Default: month
}
```

**Response:**
```typescript
{
  fuelCost: number;
  maintenanceCost: number;
  totalOperatingCost: number;
  avgFuelCost: number;
  avgMaintenanceCost: number;
}
```

---

## Governance APIs

### 1. Get Auto-Numbering Templates

Retrieves auto-numbering configuration templates.

**Endpoint:** `fleet.governance.autoNumbering.getAutoNumberingTemplates`  
**Method:** Query  
**Input:** (none)

**Response:**
```typescript
{
  templates: Array<{
    id: string;
    name: string;
    pattern: string;
    example: string;
    nextSequence: number;
    enabled: boolean;
  }>;
  organizationId: string;
  operatingUnitId: string;
}
```

---

### 2. Generate Auto Number

Generates an auto-numbered ID based on a template.

**Endpoint:** `fleet.governance.autoNumbering.generateAutoNumber`  
**Method:** Mutation  
**Input:**
```typescript
{
  templateId: string;
}
```

**Response:**
```typescript
{
  autoNumber: string;
  templateId: string;
  generatedAt: Date;
}
```

---

### 3. Get Role Permissions

Retrieves permissions for a specific role.

**Endpoint:** `fleet.governance.rbac.getRolePermissions`  
**Method:** Query  
**Input:**
```typescript
{
  role?: "admin" | "manager" | "driver" | "viewer";
}
```

**Response:**
```typescript
{
  role: string;
  permissions: Record<string, string[]>; // { "vehicles": ["create", "read", "update"] }
}
```

---

### 4. Get Audit Trail

Retrieves audit trail logs for an entity.

**Endpoint:** `fleet.governance.auditTrail.getAuditTrail`  
**Method:** Query  
**Input:**
```typescript
{
  entityType?: "vehicle" | "driver" | "trip" | "maintenance";
  entityId?: string;
  limit?: number; // Default: 50
  offset?: number; // Default: 0
}
```

**Response:**
```typescript
{
  logs: Array<{
    timestamp: Date;
    action: string;
    entity: string;
    entityId: string;
    userId: string;
    changes: string;
  }>;
  total: number;
  limit: number;
  offset: number;
}
```

---

### 5. Get Workflow Rules

Retrieves workflow automation rules.

**Endpoint:** `fleet.governance.workflow.getWorkflowRules`  
**Method:** Query  
**Input:** (none)

**Response:**
```typescript
{
  rules: Array<{
    id: string;
    name: string;
    trigger: string;
    condition: string;
    action: string;
    enabled: boolean;
  }>;
}
```

---

## Error Handling

All endpoints follow a consistent error handling pattern using tRPC error codes.

**Common Error Codes:**

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Resource not found |
| `UNAUTHORIZED` | 401 | User not authenticated |
| `FORBIDDEN` | 403 | User lacks required permissions |
| `BAD_REQUEST` | 400 | Invalid input parameters |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

**Example Error Response:**
```typescript
{
  code: "NOT_FOUND",
  message: "Vehicle not found",
  data: {
    zodError: null
  }
}
```

---

## Performance Optimization

### Caching Strategy

All frequently accessed data is cached with TTL-based expiration:

| Data Type | TTL | Cache Key Pattern |
|-----------|-----|-------------------|
| Vehicle Detail | 5 min | `vehicle:detail:{orgId}:{vehicleId}` |
| Driver Detail | 5 min | `driver:detail:{orgId}:{driverId}` |
| Fleet Dashboard | 10 min | `fleet:overview:{orgId}:{ouId}` |
| KPI Reports | 15 min | `kpi:*:{orgId}:{ouId}` |

### Pagination

All list endpoints support pagination with configurable limits:

```typescript
// Offset-based pagination
const response = await trpc.fleet.vehicle.getList.useQuery({
  limit: 20,
  offset: 0
});

// Cursor-based pagination
const response = await trpc.fleet.vehicle.getList.useQuery({
  limit: 20,
  cursor: "base64_encoded_id"
});
```

### Query Optimization

Queries are optimized using:
- Database indexing on frequently queried fields
- Batch loading for related data
- Lazy loading for large datasets
- Connection pooling for database connections

---

## Integration Examples

### React Component with tRPC

```typescript
import { trpc } from "@/lib/trpc";

export function VehicleDetail({ vehicleId }: { vehicleId: string }) {
  const { data: vehicle, isLoading } = trpc.fleet.vehicle.getDetail.useQuery({
    vehicleId
  });

  const { data: stats } = trpc.fleet.vehicle.getStatistics.useQuery({
    vehicleId
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{vehicle?.registrationNumber}</h1>
      <p>Status: {vehicle?.status}</p>
      <p>Trips: {stats?.trips.totalTrips}</p>
    </div>
  );
}
```

### Mutation Example

```typescript
const syncVendors = trpc.fleet.erp.vendor.syncVendors.useMutation({
  onSuccess: (data) => {
    console.log(`Synced ${data.recordsSync} vendors`);
  },
  onError: (error) => {
    console.error("Sync failed:", error.message);
  }
});

function SyncButton() {
  return (
    <button onClick={() => syncVendors.mutate()}>
      {syncVendors.isLoading ? "Syncing..." : "Sync Vendors"}
    </button>
  );
}
```

---

## Support & Feedback

For API issues, feature requests, or documentation improvements, please contact the development team or submit an issue through the project management system.

**Last Updated:** March 10, 2026  
**API Version:** 1.0.0  
**Status:** Production Ready
