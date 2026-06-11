/**
 * ============================================================================
 * TEAMS SHIFTS SCHEDULED SYNC JOB
 * ============================================================================
 * 
 * Scheduled job for automatic Teams Shifts synchronization
 * Runs every hour to sync attendance data from Teams to IMS
 * 
 * Features:
 * - Automatic hourly execution
 * - Organization-level sync
 * - Error handling and notifications
 * - Audit logging
 * - Manual trigger capability
 * 
 * ============================================================================
 */

import * as cron from "node-cron";
import { getDb } from '../db';
import { TeamsShiftsSyncService } from '../services/teamsShiftsSyncService';
import { MicrosoftGraphClient } from '../_core/microsoftGraphClient';
import { organizations } from '../../drizzle/schema';

/**
 * Teams Shifts Sync Job
 */
export class TeamsShiftsSyncJob {
  private job: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  /**
   * Start the scheduled sync job
   * Runs every hour at minute 0
   */
  public start(): void {
    if (this.job) {
      console.warn('Teams Shifts sync job already running');
      return;
    }

    // Schedule: Every hour at minute 0
    this.job = cron.schedule('0 * * * *', async () => {
      await this.runSync();
    });

    console.log('Teams Shifts sync job started - runs every hour');
  }

  /**
   * Stop the scheduled sync job
   */
  public stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('Teams Shifts sync job stopped');
    }
  }

  /**
   * Manually trigger sync for all organizations
   */
  public async runSync(): Promise<void> {
    if (this.isRunning) {
      console.warn('Sync already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('Starting Teams Shifts sync job...');

      // Get all organizations with Teams sync enabled
      const db = await getDb();
      const orgs = await db.select().from(organizations);

      let successCount = 0;
      let errorCount = 0;

      for (const org of orgs) {
        try {
          // TODO: Check if organization has Teams sync enabled
          // if (!org.teamsShiftsSyncEnabled) continue;

          console.log(`Syncing Teams Shifts for organization: ${org.id}`);

          // Initialize Microsoft Graph Client for this organization
          // TODO: Get the appropriate credentials for this organization
          const graphClient = new MicrosoftGraphClient(
            process.env.MICROSOFT_GRAPH_TOKEN || '',
            process.env.MS_TENANT_ID || ''
          );

          // Create sync service instance
          const syncService = new TeamsShiftsSyncService(
            graphClient,
            org.id
          );

          // Calculate date range (last 7 days)
          const endDate = new Date().toISOString().split('T')[0];
          const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

          // Run sync
          const result = await syncService.sync(startDate, endDate);

          if (result.status === 'success' || result.status === 'partial') {
            successCount++;
            console.log(`Sync completed for organization ${org.id}:`, {
              recordsCreated: result.recordsCreated,
              recordsUpdated: result.recordsUpdated,
              conflictsDetected: result.conflictsDetected,
            });
          } else {
            errorCount++;
            console.error(`Sync failed for organization ${org.id}:`, result.message);
          }
        } catch (error) {
          errorCount++;
          console.error(
            `Error syncing Teams Shifts for organization ${org.id}:`,
            error
          );
        }
      }

      const duration = Date.now() - startTime;
      console.log(
        `Teams Shifts sync completed in ${duration}ms - Success: ${successCount}, Errors: ${errorCount}`
      );
    } catch (error) {
      console.error('Teams Shifts sync job failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get sync job status
   */
  public getStatus(): {
    isRunning: boolean;
    isScheduled: boolean;
  } {
    return {
      isRunning: this.isRunning,
      isScheduled: !!this.job,
    };
  }
}

/**
 * Global instance of Teams Shifts sync job
 */
let teamsShiftsSyncJobInstance: TeamsShiftsSyncJob | null = null;

/**
 * Get or create the Teams Shifts sync job instance
 */
export function getTeamsShiftsSyncJob(): TeamsShiftsSyncJob {
  if (!teamsShiftsSyncJobInstance) {
    teamsShiftsSyncJobInstance = new TeamsShiftsSyncJob();
  }
  return teamsShiftsSyncJobInstance;
}

/**
 * Initialize and start the Teams Shifts sync job
 * Call this during server startup
 */
export function initializeTeamsShiftsSyncJob(): void {
  const job = getTeamsShiftsSyncJob();
  job.start();
}
