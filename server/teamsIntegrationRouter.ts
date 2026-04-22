/**
 * ============================================================================
 * TEAMS INTEGRATION ROUTER
 * ============================================================================
 * 
 * tRPC procedures for Microsoft Teams integration management
 * Handles enabling/disabling Teams Shifts sync at organization level
 * 
 * Procedures:
 * - enableTeamsSync - Enable Teams Shifts sync for organization
 * - disableTeamsSync - Disable Teams Shifts sync for organization
 * - getTeamsSyncStatus - Get current sync status and metrics
 * - triggerManualSync - Manually trigger sync for organization
 * - getTeamsSyncLogs - Get sync history and logs
 * 
 * ============================================================================
 */

import { router, protectedProcedure, adminProcedure } from './_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getTeamsShiftsSyncJob } from './jobs/teamsShiftsSyncJob';

/**
 * Teams Integration Router
 */
export const teamsIntegrationRouter = router({
  /**
   * Enable Teams Shifts sync for organization
   * 
   * Requires: Organization admin role
   * 
   * @param organizationId - Organization ID
   * @returns Success status and message
   */
  enableTeamsSync: adminProcedure
    .input(
      z.object({
        organizationId: z.number().int().positive(),
        operatingUnitId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('Enabling Teams Shifts sync', {
          organizationId: input.organizationId,
          operatingUnitId: input.operatingUnitId,
          userId: ctx.user?.id,
        });

        // TODO: Update organizations table
        // UPDATE organizations SET teamsShiftsSyncEnabled = true WHERE id = ?
        // Also update operatingUnits if specified

        // Verify Microsoft 365 connection is enabled
        // TODO: Check if organization has Microsoft 365 provider enabled

        // Log the action for audit trail
        // TODO: Insert into auditLog table

        return {
          success: true,
          message: 'Teams Shifts sync enabled successfully',
          organizationId: input.organizationId,
        };
      } catch (error) {
        console.error('Failed to enable Teams Shifts sync', {
          organizationId: input.organizationId,
          error: error instanceof Error ? error.message : String(error),
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to enable Teams Shifts sync',
        });
      }
    }),

  /**
   * Disable Teams Shifts sync for organization
   * 
   * Requires: Organization admin role
   * 
   * @param organizationId - Organization ID
   * @returns Success status and message
   */
  disableTeamsSync: adminProcedure
    .input(
      z.object({
        organizationId: z.number().int().positive(),
        operatingUnitId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('Disabling Teams Shifts sync', {
          organizationId: input.organizationId,
          operatingUnitId: input.operatingUnitId,
          userId: ctx.user?.id,
        });

        // TODO: Update organizations table
        // UPDATE organizations SET teamsShiftsSyncEnabled = false WHERE id = ?

        // Log the action for audit trail
        // TODO: Insert into auditLog table

        return {
          success: true,
          message: 'Teams Shifts sync disabled successfully',
          organizationId: input.organizationId,
        };
      } catch (error) {
        console.error('Failed to disable Teams Shifts sync', {
          organizationId: input.organizationId,
          error: error instanceof Error ? error.message : String(error),
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to disable Teams Shifts sync',
        });
      }
    }),

  /**
   * Get Teams Shifts sync status for organization
   * 
   * Requires: Organization admin role
   * 
   * @param organizationId - Organization ID
   * @returns Sync status and metrics
   */
  getTeamsSyncStatus: adminProcedure
    .input(
      z.object({
        organizationId: z.number().int().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        console.log('Fetching Teams Shifts sync status', {
          organizationId: input.organizationId,
        });

        // TODO: Query organizations table to get sync status
        // SELECT teamsShiftsSyncEnabled, lastTeamsSyncTime FROM organizations WHERE id = ?

        // TODO: Query teamsShiftsSyncLog table for latest sync result
        // SELECT * FROM teamsShiftsSyncLog WHERE organizationId = ? ORDER BY syncTime DESC LIMIT 1

        // Get job status
        const syncJob = getTeamsShiftsSyncJob();
        const jobStatus = syncJob?.getStatus();

        return {
          organizationId: input.organizationId,
          syncEnabled: true, // TODO: Get from database
          lastSyncTime: new Date(), // TODO: Get from database
          lastSyncStatus: 'success', // TODO: Get from database
          recordsCreated: 0, // TODO: Get from database
          recordsUpdated: 0, // TODO: Get from database
          conflictsDetected: 0, // TODO: Get from database
          jobStatus: jobStatus,
        };
      } catch (error) {
        console.error('Failed to get Teams Shifts sync status', {
          organizationId: input.organizationId,
          error: error instanceof Error ? error.message : String(error),
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get Teams Shifts sync status',
        });
      }
    }),

  /**
   * Trigger manual Teams Shifts sync for organization
   * 
   * Requires: Organization admin role
   * 
   * @param organizationId - Organization ID
   * @returns Sync result with metrics
   */
  triggerManualSync: adminProcedure
    .input(
      z.object({
        organizationId: z.number().int().positive(),
        operatingUnitId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('Triggering manual Teams Shifts sync', {
          organizationId: input.organizationId,
          operatingUnitId: input.operatingUnitId,
          userId: ctx.user?.id,
        });

        // Get sync job
        const syncJob = getTeamsShiftsSyncJob();
        if (!syncJob) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Teams Shifts sync job not initialized',
          });
        }

        // Trigger manual sync
        const result = await syncJob.triggerManualSync(
          input.organizationId,
          input.operatingUnitId
        );

        console.log('Manual Teams Shifts sync completed', {
          organizationId: input.organizationId,
          status: result.status,
          recordsCreated: result.recordsCreated,
          recordsUpdated: result.recordsUpdated,
        });

        return {
          success: true,
          syncStatus: result.status,
          recordsCreated: result.recordsCreated,
          recordsUpdated: result.recordsUpdated,
          conflictsDetected: result.conflictsDetected,
          errors: result.errors,
          message: result.message,
        };
      } catch (error) {
        console.error('Failed to trigger manual Teams Shifts sync', {
          organizationId: input.organizationId,
          error: error instanceof Error ? error.message : String(error),
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to trigger manual Teams Shifts sync',
        });
      }
    }),

  /**
   * Get Teams Shifts sync logs for organization
   * 
   * Requires: Organization admin role
   * 
   * @param organizationId - Organization ID
   * @param limit - Number of logs to retrieve (default: 10)
   * @returns Array of sync logs
   */
  getTeamsSyncLogs: adminProcedure
    .input(
      z.object({
        organizationId: z.number().int().positive(),
        limit: z.number().int().min(1).max(100).default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        console.log('Fetching Teams Shifts sync logs', {
          organizationId: input.organizationId,
          limit: input.limit,
        });

        // TODO: Query teamsShiftsSyncLog table
        // SELECT * FROM teamsShiftsSyncLog 
        // WHERE organizationId = ? 
        // ORDER BY syncTime DESC 
        // LIMIT ?

        return {
          organizationId: input.organizationId,
          logs: [
            // TODO: Return actual logs from database
            {
              id: 1,
              syncTime: new Date(),
              status: 'success',
              recordsCreated: 10,
              recordsUpdated: 5,
              conflictsDetected: 2,
              errors: [],
              message: 'Sync completed successfully',
            },
          ],
        };
      } catch (error) {
        console.error('Failed to get Teams Shifts sync logs', {
          organizationId: input.organizationId,
          error: error instanceof Error ? error.message : String(error),
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get Teams Shifts sync logs',
        });
      }
    }),

  /**
   * Get Teams integration configuration for organization
   * 
   * Requires: Organization admin role
   * 
   * @param organizationId - Organization ID
   * @returns Teams integration configuration
   */
  getTeamsConfiguration: adminProcedure
    .input(
      z.object({
        organizationId: z.number().int().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        console.log('Fetching Teams integration configuration', {
          organizationId: input.organizationId,
        });

        // TODO: Query organizations table for Teams configuration
        // SELECT teamsShiftsSyncEnabled, teamsPresenceSyncEnabled, etc.

        return {
          organizationId: input.organizationId,
          teamsShiftsSyncEnabled: true, // TODO: Get from database
          teamsPresenceSyncEnabled: false, // TODO: Get from database
          syncInterval: 3600, // 1 hour in seconds
          conflictResolution: 'ims_wins', // IMS is system of record
          lastConfigUpdate: new Date(),
        };
      } catch (error) {
        console.error('Failed to get Teams integration configuration', {
          organizationId: input.organizationId,
          error: error instanceof Error ? error.message : String(error),
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get Teams integration configuration',
        });
      }
    }),
});

export default teamsIntegrationRouter;
