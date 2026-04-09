/**
 * ============================================================================
 * HR ATTENDANCE SERVICE
 * ============================================================================
 * 
 * CORE PRINCIPLES:
 * - System is single source of truth for attendance records
 * - Microsoft Teams Shifts = scheduling & signals (primary source)
 * - Microsoft Teams Presence = informational only (validation)
 * - Manual HR Entry = exceptions and field realities
 * 
 * FEATURES:
 * - Attendance records with multiple sources
 * - Overtime tracking and approval
 * - Period locking for payroll
 * - Employee explanations and attachments
 * - Audit trails
 * - Payroll eligibility tracking
 * 
 * ============================================================================
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type AttendanceSource = 'microsoft_teams_shifts' | 'manual_hr_entry' | 'microsoft_teams_presence';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'on_leave' | 'field_work' | 'overtime';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type PeriodStatus = 'open' | 'locked';

export interface AttendanceRecord {
 id: string;
 staffId: string;
 staffName: string;
 date: string; // YYYY-MM-DD
 
 // Shift Planning
 plannedShiftStart: string; // HH:MM
 plannedShiftEnd: string; // HH:MM
 plannedHours: number;
 
 // Actual Attendance
 actualCheckIn: string | null; // HH:MM or null
 actualCheckOut: string | null; // HH:MM or null
 actualHours: number;
 
 // Overtime
 overtimeHours: number;
 overtimeApprovalStatus: ApprovalStatus;
 overtimeApprovedBy: string | null;
 overtimeApprovedAt: string | null;
 
 // Status & Source
 status: AttendanceStatus;
 source: AttendanceSource;
 
 // Validation & Flags
 isLate: boolean;
 lateMinutes: number;
 isFlagged: boolean;
 flagReason: string | null;
 
 // Payroll
 payrollEligible: boolean;
 
 // Approval
 approvalStatus: ApprovalStatus;
 approvedBy: string | null;
 approvedAt: string | null;
 
 // Notes & History
 notes: string;
 notesHistory: AttendanceNote[];
 
 // Employee Explanations
 employeeExplanation: string | null;
 employeeExplanationDate: string | null;
 employeeAttachments: string[];
 
 // Metadata
 createdBy: string;
 createdAt: string;
 updatedBy: string;
 updatedAt: string;
 
 // Period Lock
 periodLocked: boolean;
 periodMonth: string; // YYYY-MM
}

export interface AttendanceNote {
 id: string;
 userId: string;
 userName: string;
 userRole: string;
 note: string;
 timestamp: string;
}

export interface AttendancePeriod {
 id: string;
 month: string; // YYYY-MM
 year: number;
 monthName: string; // January, February, etc.
 status: PeriodStatus;
 lockedBy: string | null;
 lockedAt: string | null;
 lockDeadline: string; // YYYY-MM-DD
 totalRecords: number;
 approvedRecords: number;
 pendingRecords: number;
 createdAt: string;
 updatedAt: string;
}

export interface AttendanceStats {
 totalStaff: number;
 presentToday: number;
 absentToday: number;
 lateArrivals: number;
 overtimeHoursToday: number;
 overtimeHoursPeriod: number;
 pendingApprovals: number;
 flaggedRecords: number;
}

export interface OvertimeRequest {
 id: string;
 attendanceRecordId: string;
 staffId: string;
 staffName: string;
 date: string;
 overtimeHours: number;
 reason: string;
 status: ApprovalStatus;
 requestedBy: string;
 requestedAt: string;
 approvedBy: string | null;
 approvedAt: string | null;
 rejectionReason: string | null;
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
 ATTENDANCE_RECORDS: 'hr_attendance_records',
 ATTENDANCE_PERIODS: 'hr_attendance_periods',
 OVERTIME_REQUESTS: 'hr_overtime_requests'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getFromStorage<T>(key: string, defaultValue: T): T {
 try {
 const data = localStorage.getItem(key);
 return data ? JSON.parse(data) : defaultValue;
 } catch (error) {
 console.error(`Error reading ${key}:`, error);
 return defaultValue;
 }
}

function saveToStorage<T>(key: string, data: T): void {
 try {
 localStorage.setItem(key, JSON.stringify(data));
 } catch (error) {
 console.error(`Error saving ${key}:`, error);
 }
}

/**
 * Calculate hours between two time strings
 */
function calculateHours(startTime: string | null, endTime: string | null): number {
 if (!startTime || !endTime) return 0;
 
 const [startHour, startMin] = startTime.split(':').map(Number);
 const [endHour, endMin] = endTime.split(':').map(Number);
 
 const startMinutes = startHour * 60 + startMin;
 const endMinutes = endHour * 60 + endMin;
 
 return (endMinutes - startMinutes) / 60;
}

/**
 * Calculate late minutes
 */
function calculateLateMinutes(plannedStart: string, actualStart: string | null): number {
 if (!actualStart) return 0;
 
 const [plannedHour, plannedMin] = plannedStart.split(':').map(Number);
 const [actualHour, actualMin] = actualStart.split(':').map(Number);
 
 const plannedMinutes = plannedHour * 60 + plannedMin;
 const actualMinutes = actualHour * 60 + actualMin;
 
 return Math.max(0, actualMinutes - plannedMinutes);
}

/**
 * Get current period (YYYY-MM)
 */
function getCurrentPeriod(): string {
 const now = new Date();
 const year = now.getFullYear();
 const month = String(now.getMonth() + 1).padStart(2, '0');
 return `${year}-${month}`;
}

/**
 * Generate unique ID
 */
function generateId(): string {
 return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// ATTENDANCE RECORDS SERVICE
// ============================================================================

export const attendanceService = {
 /**
 * Get all attendance records
 */
 getAll(): AttendanceRecord[] {
 return getFromStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE_RECORDS, []);
 },

 /**
 * Get record by ID
 */
 getById(id: string): AttendanceRecord | null {
 const records = this.getAll();
 return records.find(r => r.id === id) || null;
 },

 /**
 * Get records by staff ID
 */
 getByStaffId(staffId: string): AttendanceRecord[] {
 return this.getAll().filter(r => r.staffId === staffId);
 },

 /**
 * Get records by date
 */
 getByDate(date: string): AttendanceRecord[] {
 return this.getAll().filter(r => r.date === date);
 },

 /**
 * Get records by date range
 */
 getByDateRange(startDate: string, endDate: string): AttendanceRecord[] {
 return this.getAll().filter(r => r.date >= startDate && r.date <= endDate);
 },

 /**
 * Get records by period (YYYY-MM)
 */
 getByPeriod(period: string): AttendanceRecord[] {
 return this.getAll().filter(r => r.periodMonth === period);
 },

 /**
 * Get records for today
 */
 getToday(): AttendanceRecord[] {
 const today = new Date().toISOString().split('T')[0];
 return this.getByDate(today);
 },

 /**
 * Create attendance record
 */
 create(data: {
 staffId: string;
 staffName: string;
 date: string;
 plannedShiftStart: string;
 plannedShiftEnd: string;
 source: AttendanceSource;
 actualCheckIn?: string | null;
 actualCheckOut?: string | null;
 notes?: string;
 createdBy: string;
 }): AttendanceRecord {
 const records = this.getAll();
 
 const plannedHours = calculateHours(data.plannedShiftStart, data.plannedShiftEnd);
 const actualHours = calculateHours(data.actualCheckIn || null, data.actualCheckOut || null);
 const overtimeHours = Math.max(0, actualHours - plannedHours);
 const lateMinutes = calculateLateMinutes(data.plannedShiftStart, data.actualCheckIn || null);
 const isLate = lateMinutes > 15; // 15 minutes grace period
 
 // Determine status
 let status: AttendanceStatus = 'absent';
 if (data.actualCheckIn && data.actualCheckOut) {
 if (overtimeHours > 0) {
 status = 'overtime';
 } else if (isLate) {
 status = 'late';
 } else {
 status = 'present';
 }
 }
 
 const period = data.date.substring(0, 7); // YYYY-MM
 const periodInfo = this.getPeriod(period);
 
 const newRecord: AttendanceRecord = {
 id: generateId(),
 staffId: data.staffId,
 staffName: data.staffName,
 date: data.date,
 
 plannedShiftStart: data.plannedShiftStart,
 plannedShiftEnd: data.plannedShiftEnd,
 plannedHours,
 
 actualCheckIn: data.actualCheckIn || null,
 actualCheckOut: data.actualCheckOut || null,
 actualHours,
 
 overtimeHours,
 overtimeApprovalStatus: overtimeHours > 0 ? 'pending' : 'approved',
 overtimeApprovedBy: null,
 overtimeApprovedAt: null,
 
 status,
 source: data.source,
 
 isLate,
 lateMinutes,
 isFlagged: isLate || overtimeHours > 2, // Flag if late or overtime > 2 hours
 flagReason: isLate ? 'Late arrival' : overtimeHours > 2 ? 'Excessive overtime' : null,
 
 payrollEligible: status === 'present' || status === 'overtime',
 
 approvalStatus: 'pending',
 approvedBy: null,
 approvedAt: null,
 
 notes: data.notes || '',
 notesHistory: [],
 
 employeeExplanation: null,
 employeeExplanationDate: null,
 employeeAttachments: [],
 
 createdBy: data.createdBy,
 createdAt: new Date().toISOString(),
 updatedBy: data.createdBy,
 updatedAt: new Date().toISOString(),
 
 periodLocked: periodInfo?.status === 'locked',
 periodMonth: period
 };
 
 records.push(newRecord);
 saveToStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, records);
 
 return newRecord;
 },

 /**
 * Update attendance record
 */
 update(id: string, data: Partial<AttendanceRecord>, updatedBy: string): AttendanceRecord | null {
 const records = this.getAll();
 const index = records.findIndex(r => r.id === id);
 
 if (index === -1) return null;
 
 const record = records[index];
 
 // Check if period is locked
 if (record.periodLocked) {
 throw new Error('Cannot update attendance in a locked period');
 }
 
 // Recalculate if times changed
 if (data.actualCheckIn !== undefined || data.actualCheckOut !== undefined) {
 const actualCheckIn = data.actualCheckIn !== undefined ? data.actualCheckIn : record.actualCheckIn;
 const actualCheckOut = data.actualCheckOut !== undefined ? data.actualCheckOut : record.actualCheckOut;
 
 const actualHours = calculateHours(actualCheckIn, actualCheckOut);
 const overtimeHours = Math.max(0, actualHours - record.plannedHours);
 const lateMinutes = calculateLateMinutes(record.plannedShiftStart, actualCheckIn);
 const isLate = lateMinutes > 15;
 
 data.actualHours = actualHours;
 data.overtimeHours = overtimeHours;
 data.lateMinutes = lateMinutes;
 data.isLate = isLate;
 
 // Update status
 if (actualCheckIn && actualCheckOut) {
 if (overtimeHours > 0) {
 data.status = 'overtime';
 } else if (isLate) {
 data.status = 'late';
 } else {
 data.status = 'present';
 }
 }
 }
 
 records[index] = {
 ...record,
 ...data,
 updatedBy,
 updatedAt: new Date().toISOString()
 };
 
 saveToStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, records);
 return records[index];
 },

 /**
 * Add note to attendance record
 */
 addNote(
 recordId: string,
 note: string,
 userId: string,
 userName: string,
 userRole: string
 ): boolean {
 const records = this.getAll();
 const index = records.findIndex(r => r.id === recordId);
 
 if (index === -1) return false;
 
 const noteEntry: AttendanceNote = {
 id: generateId(),
 userId,
 userName,
 userRole,
 note,
 timestamp: new Date().toISOString()
 };
 
 records[index].notesHistory.push(noteEntry);
 records[index].updatedAt = new Date().toISOString();
 
 saveToStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, records);
 return true;
 },

 /**
 * Add employee explanation
 */
 addEmployeeExplanation(
 recordId: string,
 explanation: string,
 attachments: string[] = []
 ): boolean {
 const records = this.getAll();
 const index = records.findIndex(r => r.id === recordId);
 
 if (index === -1) return false;
 
 const record = records[index];
 
 // Check if period is locked
 if (record.periodLocked) {
 throw new Error('Cannot add explanation to a locked period');
 }
 
 records[index].employeeExplanation = explanation;
 records[index].employeeExplanationDate = new Date().toISOString();
 records[index].employeeAttachments = attachments;
 records[index].updatedAt = new Date().toISOString();
 
 saveToStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, records);
 return true;
 },

 /**
 * Approve attendance record
 */
 approve(recordId: string, approvedBy: string): boolean {
 const records = this.getAll();
 const index = records.findIndex(r => r.id === recordId);
 
 if (index === -1) return false;
 
 records[index].approvalStatus = 'approved';
 records[index].approvedBy = approvedBy;
 records[index].approvedAt = new Date().toISOString();
 records[index].payrollEligible = true;
 records[index].updatedAt = new Date().toISOString();
 
 saveToStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, records);
 return true;
 },

 /**
 * Reject attendance record
 */
 reject(recordId: string, approvedBy: string, reason: string): boolean {
 const records = this.getAll();
 const index = records.findIndex(r => r.id === recordId);
 
 if (index === -1) return false;
 
 records[index].approvalStatus = 'rejected';
 records[index].approvedBy = approvedBy;
 records[index].approvedAt = new Date().toISOString();
 records[index].payrollEligible = false;
 records[index].notes = reason;
 records[index].updatedAt = new Date().toISOString();
 
 saveToStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, records);
 return true;
 },

 /**
 * Approve overtime
 */
 approveOvertime(recordId: string, approvedBy: string): boolean {
 const records = this.getAll();
 const index = records.findIndex(r => r.id === recordId);
 
 if (index === -1) return false;
 
 records[index].overtimeApprovalStatus = 'approved';
 records[index].overtimeApprovedBy = approvedBy;
 records[index].overtimeApprovedAt = new Date().toISOString();
 records[index].updatedAt = new Date().toISOString();
 
 saveToStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, records);
 return true;
 },

 /**
 * Reject overtime
 */
 rejectOvertime(recordId: string, approvedBy: string): boolean {
 const records = this.getAll();
 const index = records.findIndex(r => r.id === recordId);
 
 if (index === -1) return false;
 
 records[index].overtimeApprovalStatus = 'rejected';
 records[index].overtimeApprovedBy = approvedBy;
 records[index].overtimeApprovedAt = new Date().toISOString();
 // Adjust actual hours to planned hours
 records[index].actualHours = records[index].plannedHours;
 records[index].overtimeHours = 0;
 records[index].updatedAt = new Date().toISOString();
 
 saveToStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, records);
 return true;
 },

 /**
 * Delete attendance record
 */
 delete(id: string): boolean {
 const records = this.getAll();
 const record = records.find(r => r.id === id);
 
 if (!record) return false;
 
 // Check if period is locked
 if (record.periodLocked) {
 throw new Error('Cannot delete attendance in a locked period');
 }
 
 const filtered = records.filter(r => r.id !== id);
 saveToStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, filtered);
 return true;
 },

 /**
 * Get attendance statistics
 */
 getStats(): AttendanceStats {
 const today = new Date().toISOString().split('T')[0];
 const currentPeriod = getCurrentPeriod();
 
 const todayRecords = this.getByDate(today);
 const periodRecords = this.getByPeriod(currentPeriod);
 const allRecords = this.getAll();
 
 return {
 totalStaff: new Set(todayRecords.map(r => r.staffId)).size,
 presentToday: todayRecords.filter(r => r.status === 'present' || r.status === 'overtime').length,
 absentToday: todayRecords.filter(r => r.status === 'absent').length,
 lateArrivals: todayRecords.filter(r => r.isLate).length,
 overtimeHoursToday: todayRecords.reduce((sum, r) => sum + r.overtimeHours, 0),
 overtimeHoursPeriod: periodRecords.reduce((sum, r) => sum + r.overtimeHours, 0),
 pendingApprovals: allRecords.filter(r => r.approvalStatus === 'pending').length,
 flaggedRecords: allRecords.filter(r => r.isFlagged).length
 };
 },

 /**
 * Get period (create if not exists)
 */
 getPeriod(periodMonth: string): AttendancePeriod | null {
 const periods = getFromStorage<AttendancePeriod[]>(STORAGE_KEYS.ATTENDANCE_PERIODS, []);
 return periods.find(p => p.month === periodMonth) || null;
 },

 /**
 * Get all periods
 */
 getAllPeriods(): AttendancePeriod[] {
 return getFromStorage<AttendancePeriod[]>(STORAGE_KEYS.ATTENDANCE_PERIODS, []);
 },

 /**
 * Create or update period
 */
 createOrUpdatePeriod(periodMonth: string): AttendancePeriod {
 const periods = getFromStorage<AttendancePeriod[]>(STORAGE_KEYS.ATTENDANCE_PERIODS, []);
 const existingIndex = periods.findIndex(p => p.month === periodMonth);
 
 const [year, month] = periodMonth.split('-').map(Number);
 const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
 'July', 'August', 'September', 'October', 'November', 'December'];
 
 // Lock deadline is 5th of next month
 const lockDeadlineDate = new Date(year, month, 5); // month is 0-indexed
 const lockDeadline = lockDeadlineDate.toISOString().split('T')[0];
 
 const periodRecords = this.getByPeriod(periodMonth);
 
 const periodData: AttendancePeriod = {
 id: existingIndex >= 0 ? periods[existingIndex].id : generateId(),
 month: periodMonth,
 year,
 monthName: monthNames[month - 1],
 status: 'open',
 lockedBy: null,
 lockedAt: null,
 lockDeadline,
 totalRecords: periodRecords.length,
 approvedRecords: periodRecords.filter(r => r.approvalStatus === 'approved').length,
 pendingRecords: periodRecords.filter(r => r.approvalStatus === 'pending').length,
 createdAt: existingIndex >= 0 ? periods[existingIndex].createdAt : new Date().toISOString(),
 updatedAt: new Date().toISOString()
 };
 
 if (existingIndex >= 0) {
 periods[existingIndex] = periodData;
 } else {
 periods.push(periodData);
 }
 
 saveToStorage(STORAGE_KEYS.ATTENDANCE_PERIODS, periods);
 return periodData;
 },

 /**
 * Lock attendance period
 */
 lockPeriod(periodMonth: string, lockedBy: string): boolean {
 const periods = getFromStorage<AttendancePeriod[]>(STORAGE_KEYS.ATTENDANCE_PERIODS, []);
 const index = periods.findIndex(p => p.month === periodMonth);
 
 if (index === -1) return false;
 
 periods[index].status = 'locked';
 periods[index].lockedBy = lockedBy;
 periods[index].lockedAt = new Date().toISOString();
 periods[index].updatedAt = new Date().toISOString();
 
 saveToStorage(STORAGE_KEYS.ATTENDANCE_PERIODS, periods);
 
 // Mark all records in this period as locked
 const records = this.getAll();
 records.forEach(record => {
 if (record.periodMonth === periodMonth) {
 record.periodLocked = true;
 }
 });
 saveToStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, records);
 
 return true;
 },

 /**
 * Unlock attendance period
 */
 unlockPeriod(periodMonth: string): boolean {
 const periods = getFromStorage<AttendancePeriod[]>(STORAGE_KEYS.ATTENDANCE_PERIODS, []);
 const index = periods.findIndex(p => p.month === periodMonth);
 
 if (index === -1) return false;
 
 periods[index].status = 'open';
 periods[index].lockedBy = null;
 periods[index].lockedAt = null;
 periods[index].updatedAt = new Date().toISOString();
 
 saveToStorage(STORAGE_KEYS.ATTENDANCE_PERIODS, periods);
 
 // Mark all records in this period as unlocked
 const records = this.getAll();
 records.forEach(record => {
 if (record.periodMonth === periodMonth) {
 record.periodLocked = false;
 }
 });
 saveToStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, records);
 
 return true;
 }
};