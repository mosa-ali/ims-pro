// ============================================================================
// OPERATING UNIT FILTER HOOK
// Helper hook for filtering data by operating unit
// Integrated Management System (IMS)
// ============================================================================

import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';

/**
 * Hook to filter data by current organization and operating unit
 * 
 * Usage:
 * ```typescript
 * const { filterByOperatingUnit } = useOperatingUnitFilter();
 * const filteredEmployees = filterByOperatingUnit(allEmployees);
 * ```
 */
export function useOperatingUnitFilter() {
 const { currentOrganization } = useOrganization();
 const { currentOperatingUnit } = useOperatingUnit();

 /**
 * Filters an array of items by organization and operating unit
 * @param items - Array of items to filter
 * @returns Filtered array containing only items from current org and operating unit
 */
 const filterByOperatingUnit = <T extends { organizationId: string; operatingUnitId: string }>(
 items: T[]
 ): T[] => {
 if (!currentOrganization || !currentOperatingUnit) {
 return [];
 }

 return items.filter(
 item =>
 item.organizationId === currentOrganization.id &&
 item.operatingUnitId === currentOperatingUnit.id
 );
 };

 /**
 * Filters an array of items by organization only (for cross-unit data)
 * Use with caution - most data should be filtered by operating unit!
 */
 const filterByOrganization = <T extends { organizationId: string }>(
 items: T[]
 ): T[] => {
 if (!currentOrganization) {
 return [];
 }

 return items.filter(item => item.organizationId === currentOrganization.id);
 };

 /**
 * Checks if an item belongs to the current operating unit
 */
 const belongsToCurrentUnit = (item: { organizationId: string; operatingUnitId: string }): boolean => {
 if (!currentOrganization || !currentOperatingUnit) {
 return false;
 }

 return (
 item.organizationId === currentOrganization.id &&
 item.operatingUnitId === currentOperatingUnit.id
 );
 };

 /**
 * Gets the storage key scoped by organization and operating unit
 * Useful for localStorage keys
 */
 const getScopedStorageKey = (baseKey: string): string => {
 if (!currentOrganization || !currentOperatingUnit) {
 return baseKey;
 }

 return `${baseKey}_${currentOrganization.id}_${currentOperatingUnit.id}`;
 };

 return {
 filterByOperatingUnit,
 filterByOrganization,
 belongsToCurrentUnit,
 getScopedStorageKey,
 currentOrganization,
 currentOperatingUnit,
 isReady: !!currentOrganization && !!currentOperatingUnit
 };
}

/**
 * Hook to add operating unit context to new items
 * 
 * Usage:
 * ```typescript
 * const { addOperatingUnitContext } = useOperatingUnitContext();
 * const newEmployee = addOperatingUnitContext({ name: 'John', ... });
 * // Result: { name: 'John', organizationId: '...', operatingUnitId: '...', ... }
 * ```
 */
export function useOperatingUnitContext() {
 const { currentOrganization } = useOrganization();
 const { currentOperatingUnit } = useOperatingUnit();

 /**
 * Adds organization and operating unit IDs to a data object
 */
 const addOperatingUnitContext = <T extends Record<string, any>>(
 data: T
 ): T & { organizationId: string; operatingUnitId: string } => {
 if (!currentOrganization || !currentOperatingUnit) {
 throw new Error('Organization and Operating Unit context required');
 }

 return {
 ...data,
 organizationId: currentOrganization.id,
 operatingUnitId: currentOperatingUnit.id
 };
 };

 /**
 * Validates that data has the correct operating unit context
 */
 const validateOperatingUnitContext = (
 data: { organizationId?: string; operatingUnitId?: string }
 ): boolean => {
 if (!currentOrganization || !currentOperatingUnit) {
 return false;
 }

 return (
 data.organizationId === currentOrganization.id &&
 data.operatingUnitId === currentOperatingUnit.id
 );
 };

 return {
 addOperatingUnitContext,
 validateOperatingUnitContext,
 currentOrganization,
 currentOperatingUnit,
 isReady: !!currentOrganization && !!currentOperatingUnit
 };
}
