/**
 * @module FinanceSynchronizationContext
 * @description Defines the context required for finance synchronization operations, ensuring data isolation.
 */

export interface FinanceSynchronizationContext {
  organizationId: number;
  operatingUnitId: number;
  userId?: number; // Optional, for audit logging purposes
  // Add any other context-specific data needed for synchronization, e.g., correlationId
  correlationId?: string;
}
