/**
 * ============================================================================
 * USE INCIDENTS DATA HOOK
 * ============================================================================
 * 
 * PURPOSE: Custom React hook for Incidents data fetching and mutations
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
import { riskComplianceService, type Incident, type CreateIncidentInput, type UpdateIncidentInput } from '@/services/riskComplianceService';
import { trpc } from '@/lib/trpc';

/**
 * Hook for fetching incidents list with optional filters
 */
export function useIncidentsList(filters?: {
 status?: Incident['status'];
 severity?: Incident['severity'];
 category?: Incident['category'];
 relatedRiskId?: number;
}) {
 const { currentOrganization } = useOrganization();
 const { data, isLoading, error, refetch } = riskComplianceService.useIncidentsList(filters);

 // Auto-refetch when organization changes
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
 * Hook for fetching single incident by ID
 */
export function useIncident(id: number) {
 const { currentOrganization } = useOrganization();
 const { data, isLoading, error, refetch } = riskComplianceService.useIncident(id);

 useEffect(() => {
 if (currentOrganization) {
 refetch();
 }
 }, [currentOrganization, refetch]);

 return { 
 incident: data, 
 isLoading, 
 error, 
 refetch 
 };
}

/**
 * Hook for creating a new incident
 */
export function useCreateIncident() {
 const utils = trpc.useUtils();
 const mutation = riskComplianceService.useCreateIncident();

 const createIncident = async (input: CreateIncidentInput) => {
 const result = await mutation.mutateAsync(input);
 
 // Invalidate incidents list to refresh data
 await utils.riskCompliance.incidents.list.invalidate();
 
 // If related to a risk, invalidate that risk's incidents list
 if (input.relatedRiskId) {
 await utils.riskCompliance.risks.getRelatedIncidents.invalidate({ riskId: input.relatedRiskId });
 }
 
 return result;
 };

 return {
 createIncident,
 isLoading: mutation.isPending,
 error: mutation.error,
 };
}

/**
 * Hook for updating an existing incident
 */
export function useUpdateIncident() {
 const utils = trpc.useUtils();
 const mutation = riskComplianceService.useUpdateIncident();

 const updateIncident = async (input: UpdateIncidentInput) => {
 const result = await mutation.mutateAsync(input);
 
 // Invalidate incidents list and specific incident to refresh data
 await utils.riskCompliance.incidents.list.invalidate();
 await utils.riskCompliance.incidents.getById.invalidate({ id: input.id });
 
 // If related to a risk, invalidate that risk's incidents list
 if (input.relatedRiskId) {
 await utils.riskCompliance.risks.getRelatedIncidents.invalidate({ riskId: input.relatedRiskId });
 }
 
 return result;
 };

 return {
 updateIncident,
 isLoading: mutation.isPending,
 error: mutation.error,
 };
}

/**
 * Hook for deleting an incident (soft delete)
 */
export function useDeleteIncident() {
 const utils = trpc.useUtils();
 const mutation = riskComplianceService.useDeleteIncident();

 const deleteIncident = async (id: number) => {
 const result = await mutation.mutateAsync({ id });
 
 // Invalidate incidents list to refresh data
 await utils.riskCompliance.incidents.list.invalidate();
 
 return result;
 };

 return {
 deleteIncident,
 isLoading: mutation.isPending,
 error: mutation.error,
 };
}

/**
 * Default export combining all incident hooks for convenience
 */
export default function useIncidentsData() {
 const { currentOrganization } = useOrganization();
 const { data: incidents = [], isLoading, error, refetch } = riskComplianceService.useIncidentsList({});
 const createIncident = riskComplianceService.useCreateIncident();
 const updateIncident = riskComplianceService.useUpdateIncident();
 const deleteIncident = riskComplianceService.useDeleteIncident();

 useEffect(() => {
 if (currentOrganization) {
 refetch();
 }
 }, [currentOrganization, refetch]);

 return {
 incidents,
 isLoading,
 error,
 refetch,
 createIncident,
 updateIncident,
 deleteIncident,
 };
}
