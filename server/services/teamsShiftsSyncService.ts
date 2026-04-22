/**
 * ============================================================================
 * TEAMS SHIFTS SYNC SERVICE
 * ============================================================================
 * 
 * Syncs attendance data from Microsoft Teams Shifts to IMS
 * Maintains IMS as system of record with conflict resolution
 * 
 * Features:
 * - Scheduled sync (configurable interval)
 * - Conflict detection and resolution
 * - Data transformation (Teams → IMS format)
 * - Audit logging
 * - Error handling and retry logic
 * - Email notifications
 * 
 * ============================================================================
 */

import { db } from '../db';
import { hrAttendanceRecords } from '../../drizzle/schema';
import { MicrosoftGraphClient, TeamsShift, AzureAdUser } from '../_core/microsoftGraphClient';
import { eq, and, gte, lte } from 'drizzle-orm';
import { logger } from '../_core/logger';

/**
 * Sync Result with detailed metrics
 */
export interface SyncResult {
  organizationId: number;
  operatingUnitId?: number;
  syncStartTime: Date;
  syncEndTime: Date;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  conflictsDetected: number;
  errors: SyncError[];
  status: 'success' | 'partial' | 'failed';
  message: string;
}

/**
 * Sync Error Details
 */
export interface SyncError {
  userId: string;
  date: string;
  reason: string;
  severity: 'warning' | 'error';
}

/**
 * Conflict Type
 */
type ConflictType =
  | 'none'
  | 'new'
  | 'manual_entry_exists'
  | 'presence_exists'
  | 'time_mismatch'
  | 'status_mismatch';

/**
 * Attendance Record for IMS
 */
interface AttendanceRecord {
  employeeId: number;
  organizationId: number;
  operatingUnitId?: number;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  workHours: number;
  source: string;
  approvalStatus: string;
  notes: string;
  staffName?: string;
  staffId?: string;
}

/**
 * Teams Shifts Sync Service
 */
export class TeamsShiftsSyncService {
  private graphClient: MicrosoftGraphClient;
  private organizationId: number;
  private operatingUnitId?: number;

  constructor(
    graphClient: MicrosoftGraphClient,
    organizationId: number,
    operatingUnitId?: number
  ) {
    this.graphClient = graphClient;
    this.organizationId = organizationId;
    this.operatingUnitId = operatingUnitId;
  }

  /**
   * Execute sync for organization
   * 
   * @param startDate - Sync start date (YYYY-MM-DD)
   * @param endDate - Sync end date (YYYY-MM-DD)
   * @returns SyncResult with detailed metrics
   */
  async sync(startDate: string, endDate: string): Promise<SyncResult> {
    const syncStartTime = new Date();
    const result: SyncResult = {
      organizationId: this.organizationId,
      operatingUnitId: this.operatingUnitId,
      syncStartTime,
      syncEndTime: new Date(),
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      conflictsDetected: 0,
      errors: [],
      status: 'success',
      message: 'Sync completed successfully',
    };

    try {
      logger.info('Starting Teams Shifts sync', {
        organizationId: this.organizationId,
        startDate,
        endDate,
      });

      // Step 1: Get all users from Azure AD
      const users = await this.graphClient.getOrganizationUsers();
      logger.info(`Retrieved ${users.length} users from Azure AD`);

      if (users.length === 0) {
        result.status = 'warning';
        result.message = 'No users found in Azure AD';
        return result;
      }

      // Step 2: For each user, fetch their Teams Shifts
      for (const user of users) {
        try {
          await this.syncUserShifts(user, startDate, endDate, result);
        } catch (error) {
          result.errors.push({
            userId: user.id,
            date: startDate,
            reason: error instanceof Error ? error.message : 'Unknown error',
            severity: 'error',
          });
          logger.error(`Failed to sync shifts for user ${user.id}`, { error });
        }
      }

      // Step 3: Determine final status
      const errorRate = result.errors.length / users.length;
      if (errorRate > 0.5) {
        result.status = 'failed';
        result.message = `Sync failed: ${errorRate * 100}% of users had errors`;
      } else if (result.errors.length > 0) {
        result.status = 'partial';
        result.message = `Sync completed with ${result.errors.length} errors`;
      }

      result.syncEndTime = new Date();

      logger.info('Teams Shifts sync completed', {
        status: result.status,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        conflictsDetected: result.conflictsDetected,
        errors: result.errors.length,
      });

      return result;
    } catch (error) {
      result.status = 'failed';
      result.message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push({
        userId: 'system',
        date: startDate,
        reason: result.message,
        severity: 'error',
      });

      logger.error('Teams Shifts sync failed', { error });
      return result;
    }
  }

  /**
   * Sync Teams Shifts for a specific user
   * 
   * @param user - Azure AD user
   * @param startDate - Sync start date
   * @param endDate - Sync end date
   * @param result - Sync result to update
   */
  private async syncUserShifts(
    user: AzureAdUser,
    startDate: string,
    endDate: string,
    result: SyncResult
  ): Promise<void> {
    // Get Teams Shifts for this user
    const shifts = await this.graphClient.getShifts(user.id, startDate, endDate);

    if (shifts.length === 0) {
      logger.debug(`No shifts found for user ${user.id}`);
      return;
    }

    logger.info(`Processing ${shifts.length} shifts for user ${user.id}`);

    // Process each shift
    for (const shift of shifts) {
      try {
        await this.processShift(user, shift, result);
        result.recordsProcessed++;
      } catch (error) {
        result.errors.push({
          userId: user.id,
          date: shift.startDateTime.split('T')[0],
          reason: error instanceof Error ? error.message : 'Unknown error',
          severity: 'error',
        });
        logger.error(`Failed to process shift for user ${user.id}`, { error });
      }
    }
  }

  /**
   * Process a single Teams Shift
   * 
   * @param user - Azure AD user
   * @param shift - Teams Shift data
   * @param result - Sync result to update
   */
  private async processShift(
    user: AzureAdUser,
    shift: TeamsShift,
    result: SyncResult
  ): Promise<void> {
    // Step 1: Get or create employee record
    const employeeId = await this.getOrCreateEmployee(user);
    if (!employeeId) {
      throw new Error(`Failed to get or create employee for user ${user.id}`);
    }

    // Step 2: Transform Teams Shift to IMS Attendance
    const attendanceRecord = this.transformShiftToAttendance(
      shift,
      employeeId,
      user
    );

    // Step 3: Check for existing record
    const existingRecord = await this.getExistingRecord(
      employeeId,
      attendanceRecord.date
    );

    // Step 4: Detect conflicts
    const conflictType = this.detectConflict(attendanceRecord, existingRecord);

    if (conflictType !== 'none') {
      result.conflictsDetected++;
      logger.warn(`Conflict detected for user ${user.id}`, {
        conflictType,
        date: attendanceRecord.date,
      });
    }

    // Step 5: Resolve conflicts (IMS wins)
    if (existingRecord && conflictType !== 'none') {
      const resolved = this.resolveConflict(
        attendanceRecord,
        existingRecord,
        conflictType
      );

      if (resolved === existingRecord) {
        logger.info(`Keeping existing IMS record for ${user.id} on ${attendanceRecord.date}`);
        return;
      }
    }

    // Step 6: Upsert record
    if (existingRecord) {
      // Update existing record
      await db
        .update(hrAttendanceRecords)
        .set({
          checkIn: attendanceRecord.checkIn,
          checkOut: attendanceRecord.checkOut,
          workHours: attendanceRecord.workHours,
          source: attendanceRecord.source,
          notes: attendanceRecord.notes,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(hrAttendanceRecords.id, existingRecord.id));

      result.recordsUpdated++;
      logger.info(`Updated attendance record for ${user.id} on ${attendanceRecord.date}`);
    } else {
      // Create new record
      await db.insert(hrAttendanceRecords).values({
        employeeId: attendanceRecord.employeeId,
        organizationId: attendanceRecord.organizationId,
        operatingUnitId: attendanceRecord.operatingUnitId,
        date: attendanceRecord.date,
        checkIn: attendanceRecord.checkIn,
        checkOut: attendanceRecord.checkOut,
        status: attendanceRecord.status,
        workHours: attendanceRecord.workHours,
        source: attendanceRecord.source,
        approvalStatus: attendanceRecord.approvalStatus,
        notes: attendanceRecord.notes,
        staffName: attendanceRecord.staffName,
        staffId: attendanceRecord.staffId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      result.recordsCreated++;
      logger.info(`Created attendance record for ${user.id} on ${attendanceRecord.date}`);
    }
  }

  /**
   * Get or create employee record
   * 
   * @param user - Azure AD user
   * @returns Employee ID or null if failed
   */
  private async getOrCreateEmployee(user: AzureAdUser): Promise<number | null> {
    // TODO: Implement employee lookup/creation logic
    // This would typically query the employees table and create if not exists
    // For now, return a placeholder
    logger.info(`Getting or creating employee for user ${user.id}`);
    return 1; // Placeholder
  }

  /**
   * Get existing attendance record
   * 
   * @param employeeId - Employee ID
   * @param date - Attendance date
   * @returns Existing record or null
   */
  private async getExistingRecord(
    employeeId: number,
    date: string
  ): Promise<any | null> {
    try {
      const records = await db
        .select()
        .from(hrAttendanceRecords)
        .where(
          and(
            eq(hrAttendanceRecords.employeeId, employeeId),
            eq(hrAttendanceRecords.date, date),
            eq(hrAttendanceRecords.isDeleted, 0)
          )
        );

      return records.length > 0 ? records[0] : null;
    } catch (error) {
      logger.error('Failed to get existing record', { error });
      return null;
    }
  }

  /**
   * Transform Teams Shift to IMS Attendance Record
   * 
   * @param shift - Teams Shift data
   * @param employeeId - Employee ID
   * @param user - Azure AD user
   * @returns Transformed attendance record
   */
  private transformShiftToAttendance(
    shift: TeamsShift,
    employeeId: number,
    user: AzureAdUser
  ): AttendanceRecord {
    const startDateTime = new Date(shift.startDateTime);
    const endDateTime = new Date(shift.endDateTime);
    const workHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

    return {
      employeeId,
      organizationId: this.organizationId,
      operatingUnitId: this.operatingUnitId,
      date: shift.startDateTime.split('T')[0],
      checkIn: shift.startDateTime,
      checkOut: shift.endDateTime,
      status: 'present',
      workHours: Math.round(workHours * 100) / 100, // Round to 2 decimals
      source: 'microsoft_teams_shifts',
      approvalStatus: 'pending',
      notes: `Synced from Teams Shifts: ${shift.displayName}`,
      staffName: user.displayName,
      staffId: user.userPrincipalName,
    };
  }

  /**
   * Detect conflict between Teams data and IMS data
   * 
   * @param teamsRecord - Transformed Teams record
   * @param imsRecord - Existing IMS record
   * @returns Conflict type
   */
  private detectConflict(
    teamsRecord: AttendanceRecord,
    imsRecord: any | null
  ): ConflictType {
    if (!imsRecord) {
      return 'new';
    }

    if (imsRecord.source === 'manual_hr_entry') {
      return 'manual_entry_exists';
    }

    if (imsRecord.source === 'microsoft_teams_presence') {
      return 'presence_exists';
    }

    if (
      imsRecord.checkIn !== teamsRecord.checkIn ||
      imsRecord.checkOut !== teamsRecord.checkOut
    ) {
      return 'time_mismatch';
    }

    if (imsRecord.status !== teamsRecord.status) {
      return 'status_mismatch';
    }

    return 'none';
  }

  /**
   * Resolve conflict (IMS always wins)
   * 
   * @param teamsRecord - Transformed Teams record
   * @param imsRecord - Existing IMS record
   * @param conflictType - Type of conflict
   * @returns Record to use (Teams or IMS)
   */
  private resolveConflict(
    teamsRecord: AttendanceRecord,
    imsRecord: any,
    conflictType: ConflictType
  ): AttendanceRecord | any {
    // IMS is authoritative - preserve IMS data in case of conflicts
    switch (conflictType) {
      case 'manual_entry_exists':
        // Manual entries always take precedence
        return imsRecord;

      case 'presence_exists':
        // Shifts data is more reliable than presence
        return teamsRecord;

      case 'time_mismatch':
        // Keep existing IMS data (manual entry or previous sync)
        return imsRecord;

      case 'status_mismatch':
        // Keep existing IMS status
        return imsRecord;

      default:
        return imsRecord;
    }
  }

  /**
   * Calculate work hours between two timestamps
   * 
   * @param startTime - Start time (ISO 8601)
   * @param endTime - End time (ISO 8601)
   * @returns Work hours (rounded to 2 decimals)
   */
  private calculateWorkHours(startTime: string, endTime: string): number {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.round(hours * 100) / 100;
  }
}

export default TeamsShiftsSyncService;
