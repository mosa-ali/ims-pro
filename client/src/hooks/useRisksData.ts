/**
 * ============================================================================
 * USE RISKS DATA HOOK
 * ============================================================================
 * 
 * PURPOSE: Custom React hook for Risks data fetching and mutations
 * 
 * ARCHITECTURE:
 * Component → Hook → Service → tRPC Router → Database
 * 
 * This hook provides:
 * - Clean data fetching interface
 * - CRUD operations
 * - Loading and error states
 * - Cache invalidation
 * - Type safety
 * 
 * ============================================================================
 */

import { useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { riskComplianceService, type Risk, type CreateRiskInput, type UpdateRiskInput } from '@/services/riskComplianceService';
import { trpc } from '@/lib/trpc';

/**
 * Hook for fetching risks list with optional filters
 */
export function useRisksList(filters?: {
 status?: Risk['status'];
 level?: Risk['level'];
 category?: Risk['category'];
 ownerId?: number;
}) {
 const { currentOrganization } = useOrganization();
 const { data, isLoading, error, refetch } = riskComplianceService.useRisksList(filters);

 // Auto-refetch when organization changes
 useEffect(() => {
 if (currentOrganization) {
 refetch();
 }
 }, [currentOrganization, refetch]);

 return { 
 risks: data || [], 
 isLoading, 
 error, 
 refetch 
 };
}

/**
 * Hook for fetching single risk by ID
 */
export function useRisk(id: number) {
 const { currentOrganization } = useOrganization();
 const { data, isLoading, error, refetch } = riskComplianceService.useRisk(id);

 useEffect(() => {
 if (currentOrganization) {
 refetch();
 }
 }, [currentOrganization, refetch]);

 return { 
 risk: data, 
 isLoading, 
 error, 
 refetch 
 };
}

/**
 * Hook for creating a new risk
 */
export function useCreateRisk() {
 const utils = trpc.useUtils();
 const mutation = riskComplianceService.useCreateRisk();

 const createRisk = async (input: CreateRiskInput) => {
 const result = await mutation.mutateAsync(input);
 
 // Invalidate risks list to refresh data
 await utils.riskCompliance.risks.list.invalidate();
 await utils.riskCompliance.dashboard.getDashboardData.invalidate();
 
 return result;
 };

 return {
 createRisk,
 isLoading: mutation.isPending,
 error: mutation.error,
 };
}

/**
 * Hook for updating an existing risk
 */
export function useUpdateRisk() {
 const utils = trpc.useUtils();
 const mutation = riskComplianceService.useUpdateRisk();

 const updateRisk = async (input: UpdateRiskInput) => {
 const result = await mutation.mutateAsync(input);
 
 // Invalidate risks list and specific risk to refresh data
 await utils.riskCompliance.risks.list.invalidate();
 await utils.riskCompliance.risks.getById.invalidate({ id: input.id });
 await utils.riskCompliance.dashboard.getDashboardData.invalidate();
 
 return result;
 };

 return {
 updateRisk,
 isLoading: mutation.isPending,
 error: mutation.error,
 };
}

/**
 * Hook for deleting a risk (soft delete)
 */
export function useDeleteRisk() {
 const utils = trpc.useUtils();
 const mutation = riskComplianceService.useDeleteRisk();

 const deleteRisk = async (id: number) => {
 const result = await mutation.mutateAsync({ id });
 
 // Invalidate risks list to refresh data
 await utils.riskCompliance.risks.list.invalidate();
 await utils.riskCompliance.dashboard.getDashboardData.invalidate();
 
 return result;
 };

 return {
 deleteRisk,
 isLoading: mutation.isPending,
 error: mutation.error,
 };
}

/**
 * Hook for fetching risk history (audit trail)
 */
export function useRiskHistory(riskId: number) {
 const { currentOrganization } = useOrganization();
 const { data, isLoading, error, refetch } = riskComplianceService.useRiskHistory(riskId);

 useEffect(() => {
 if (currentOrganization) {
 refetch();
 }
 }, [currentOrganization, refetch]);

 return { 
 history: data || [], 
 isLoading, 
 error, 
 refetch 
 };
}

/**
 * Hook for fetching related incidents for a risk
 */
export function useRiskRelatedIncidents(riskId: number) {
 const { currentOrganization } = useOrganization();
 const { data, isLoading, error, refetch } = riskComplianceService.useRiskRelatedIncidents(riskId);

 useEffect(() => {
 if (currentOrganization) {
 refetch();
 }
 }, [currentOrganization, refetch]);

 return { 
 incidents: data || [], 
 isLoading, 
 error, 
 refetch 
 };
}

/**
 * Hook for fetching dashboard analytics
 */
export function useRiskDashboard() {
 const { currentOrganization } = useOrganization();
 const { data, isLoading, error, refetch } = riskComplianceService.useDashboard();

 useEffect(() => {
 if (currentOrganization) {
 refetch();
 }
 }, [currentOrganization, refetch]);

 return { 
 dashboard: data, 
 isLoading, 
 error, 
 refetch 
 };
}

/**
 * Default export combining all risk hooks for convenience
 */
export default function useRisksData() {
 const { currentOrganization } = useOrganization();
 const { data: risks = [], isLoading, error, refetch } = riskComplianceService.useRisksList({});
 const createRisk = riskComplianceService.useCreateRisk();
 const updateRisk = riskComplianceService.useUpdateRisk();
 const deleteRisk = riskComplianceService.useDeleteRisk();

 useEffect(() => {
 if (currentOrganization) {
 refetch();
 }
 }, [currentOrganization, refetch]);

 return {
 risks,
 isLoading,
 error,
 refetch,
 createRisk,
 updateRisk,
 deleteRisk,
 };
}
