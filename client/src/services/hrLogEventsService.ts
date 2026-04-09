/**
 * ============================================================================
 * HR LOG EVENTS SERVICE - COMPLIANCE-GRADE AUDIT TRAIL
 * ============================================================================
 * 
 * CRITICAL RULES:
 * - System-generated only (NO manual entries)
 * - Read-only (NO edits, NO deletes)
 * - Permanent retention
 * - Before/After tracking for all changes
 * - Restricted to HR Manager / Admin only
 * 
 * PURPOSE:
 * - Internal audits
 * - Donor audits (UN, EU, DG ECHO)
 * - Legal disputes
 * - Management oversight
 * 
 * ============================================================================
 */

export type HRModule = 'HR' | 'Payroll' | 'Attendance' | 'Recruitment' | 'Disciplinary' | 'Settings';
export type ActionType = 'Create' | 'Update' | 'Approve' | 'Reject' | 'Lock' | 'Unlock' | 'Delete' | 'Archive' | 'Restore';
export type RecordType = 'Employee' | 'Contract' | 'Salary' | 'Leave' | 'Disciplinary' | 'Attendance' | 'Vacancy' | 'Candidate' | 'Configuration';
export type EventStatus = 'Success' | 'Failed';

export interface HRLogEvent {
 eventId: string;
 timestamp: string; // ISO 8601
 module: HRModule;
 actionType: ActionType;
 recordType: RecordType;
 recordReference: string; // Staff ID, Case ID, Document ID, etc.
 performedBy: string; // User name
 performedByRole: string; // User role
 affectedEmployee?: string; // Name + Staff ID (if applicable)
 status: EventStatus;
 ipAddress?: string; // Optional - for future backend
 changeDetails?: ChangeDetail[];
 justification?: string;
 errorMessage?: string; // If status is Failed
}

export interface ChangeDetail {
 fieldName: string;
 beforeValue: string;
 afterValue: string;
}

export interface HRLogFilters {
 dateFrom?: string;
 dateTo?: string;
 module?: HRModule;
 actionType?: ActionType;
 recordType?: RecordType;
 employee?: string;
 performedBy?: string;
}

class HRLogEventsService {
 private readonly STORAGE_KEY = 'hr_log_events';

 /**
 * Initialize with sample audit trail data
 */
 initializeSampleData(): void {
 const existing = this.getAll();
 if (existing.length > 0) return;

 const sampleEvents: HRLogEvent[] = [
 // Employee Lifecycle
 {
 eventId: 'EVT-001',
 timestamp: '2024-01-15T09:23:45Z',
 module: 'HR',
 actionType: 'Create',
 recordType: 'Employee',
 recordReference: 'HR-0024',
 performedBy: 'Sarah Johnson',
 performedByRole: 'HR Manager',
 affectedEmployee: 'Ahmed Hassan (HR-0024)',
 status: 'Success',
 changeDetails: [
 { fieldName: 'Employee Created', beforeValue: 'N/A', afterValue: 'New Employee Record' },
 { fieldName: 'Status', beforeValue: 'N/A', afterValue: 'Active' }
 ]
 },
 {
 eventId: 'EVT-002',
 timestamp: '2024-01-16T14:15:30Z',
 module: 'HR',
 actionType: 'Update',
 recordType: 'Employee',
 recordReference: 'HR-0024',
 performedBy: 'Sarah Johnson',
 performedByRole: 'HR Manager',
 affectedEmployee: 'Ahmed Hassan (HR-0024)',
 status: 'Success',
 changeDetails: [
 { fieldName: 'Department', beforeValue: 'Operations', afterValue: 'Programs' },
 { fieldName: 'Position', beforeValue: 'Field Officer', afterValue: 'Program Officer' }
 ],
 justification: 'Internal promotion - effective January 2024'
 },
 {
 eventId: 'EVT-003',
 timestamp: '2024-01-20T11:45:00Z',
 module: 'HR',
 actionType: 'Archive',
 recordType: 'Employee',
 recordReference: 'HR-0012',
 performedBy: 'Sarah Johnson',
 performedByRole: 'HR Manager',
 affectedEmployee: 'John Smith (HR-0012)',
 status: 'Success',
 changeDetails: [
 { fieldName: 'Status', beforeValue: 'Active', afterValue: 'Archived' }
 ],
 justification: 'Contract ended - normal completion'
 },

 // Salary & Payroll
 {
 eventId: 'EVT-004',
 timestamp: '2024-01-10T10:30:00Z',
 module: 'Payroll',
 actionType: 'Create',
 recordType: 'Salary',
 recordReference: 'SAL-V2-HR-0024',
 performedBy: 'Michael Chen',
 performedByRole: 'HR Officer',
 affectedEmployee: 'Ahmed Hassan (HR-0024)',
 status: 'Success',
 changeDetails: [
 { fieldName: 'Salary Grade', beforeValue: 'G3', afterValue: 'G4' },
 { fieldName: 'Base Salary', beforeValue: '2,500 USD', afterValue: '3,000 USD' },
 { fieldName: 'Effective Date', beforeValue: '01-01-2024', afterValue: '01-03-2024' }
 ],
 justification: 'Annual salary review - performance-based increase'
 },
 {
 eventId: 'EVT-005',
 timestamp: '2024-01-25T16:20:00Z',
 module: 'Payroll',
 actionType: 'Approve',
 recordType: 'Salary',
 recordReference: 'PAYROLL-JAN-2024',
 performedBy: 'Sarah Johnson',
 performedByRole: 'HR Manager',
 status: 'Success',
 changeDetails: [
 { fieldName: 'Payroll Status', beforeValue: 'Pending', afterValue: 'Approved' },
 { fieldName: 'Approval Date', beforeValue: 'N/A', afterValue: '25-01-2024' }
 ]
 },
 {
 eventId: 'EVT-006',
 timestamp: '2024-01-26T09:00:00Z',
 module: 'Payroll',
 actionType: 'Lock',
 recordType: 'Salary',
 recordReference: 'PAYROLL-JAN-2024',
 performedBy: 'Sarah Johnson',
 performedByRole: 'HR Manager',
 status: 'Success',
 changeDetails: [
 { fieldName: 'Payroll Status', beforeValue: 'Approved', afterValue: 'Locked' }
 ]
 },

 // Attendance
 {
 eventId: 'EVT-007',
 timestamp: '2024-01-18T13:30:00Z',
 module: 'Attendance',
 actionType: 'Update',
 recordType: 'Attendance',
 recordReference: 'ATT-HR-0024-15-01-2024',
 performedBy: 'Michael Chen',
 performedByRole: 'HR Officer',
 affectedEmployee: 'Ahmed Hassan (HR-0024)',
 status: 'Success',
 changeDetails: [
 { fieldName: 'Attendance Status', beforeValue: 'Absent', afterValue: 'Present' },
 { fieldName: 'Check-In Time', beforeValue: 'N/A', afterValue: '08:30' }
 ],
 justification: 'Manual correction - employee was present but forgot to check in'
 },
 {
 eventId: 'EVT-008',
 timestamp: '2024-01-22T15:45:00Z',
 module: 'Attendance',
 actionType: 'Approve',
 recordType: 'Attendance',
 recordReference: 'ATT-PERIOD-JAN-W3-2024',
 performedBy: 'David Wilson',
 performedByRole: 'Supervisor',
 status: 'Success',
 changeDetails: [
 { fieldName: 'Week 3 Attendance', beforeValue: 'Pending Review', afterValue: 'Approved' }
 ]
 },

 // Recruitment
 {
 eventId: 'EVT-009',
 timestamp: '2024-01-05T10:00:00Z',
 module: 'Recruitment',
 actionType: 'Create',
 recordType: 'Vacancy',
 recordReference: 'VAC-2024-003',
 performedBy: 'Sarah Johnson',
 performedByRole: 'HR Manager',
 status: 'Success',
 changeDetails: [
 { fieldName: 'Position', beforeValue: 'N/A', afterValue: 'Project Manager' },
 { fieldName: 'Department', beforeValue: 'N/A', afterValue: 'Programs' },
 { fieldName: 'Status', beforeValue: 'N/A', afterValue: 'Open' }
 ]
 },
 {
 eventId: 'EVT-010',
 timestamp: '2024-01-12T11:30:00Z',
 module: 'Recruitment',
 actionType: 'Update',
 recordType: 'Candidate',
 recordReference: 'CAND-VAC-003-042',
 performedBy: 'Michael Chen',
 performedByRole: 'HR Officer',
 status: 'Success',
 changeDetails: [
 { fieldName: 'Interview Status', beforeValue: 'Shortlisted', afterValue: 'Interviewed' },
 { fieldName: 'Interview Date', beforeValue: 'N/A', afterValue: '12-01-2024' }
 ]
 },
 {
 eventId: 'EVT-011',
 timestamp: '2024-01-14T14:00:00Z',
 module: 'Recruitment',
 actionType: 'Approve',
 recordType: 'Candidate',
 recordReference: 'CAND-VAC-003-042',
 performedBy: 'Sarah Johnson',
 performedByRole: 'HR Manager',
 status: 'Success',
 changeDetails: [
 { fieldName: 'Hiring Decision', beforeValue: 'Pending', afterValue: 'Approved' }
 ],
 justification: 'Strong technical skills and cultural fit'
 },

 // Disciplinary
 {
 eventId: 'EVT-012',
 timestamp: '2024-01-08T09:15:00Z',
 module: 'Disciplinary',
 actionType: 'Create',
 recordType: 'Disciplinary',
 recordReference: 'DISC-2024-001',
 performedBy: 'Sarah Johnson',
 performedByRole: 'HR Manager',
 affectedEmployee: 'Mark Johnson (HR-0018)',
 status: 'Success',
 changeDetails: [
 { fieldName: 'Case Type', beforeValue: 'N/A', afterValue: 'Policy Violation' },
 { fieldName: 'Severity', beforeValue: 'N/A', afterValue: 'Minor' },
 { fieldName: 'Status', beforeValue: 'N/A', afterValue: 'Under Investigation' }
 ]
 },
 {
 eventId: 'EVT-013',
 timestamp: '2024-01-19T16:30:00Z',
 module: 'Disciplinary',
 actionType: 'Approve',
 recordType: 'Disciplinary',
 recordReference: 'DISC-2024-001',
 performedBy: 'Sarah Johnson',
 performedByRole: 'HR Manager',
 affectedEmployee: 'Mark Johnson (HR-0018)',
 status: 'Success',
 changeDetails: [
 { fieldName: 'Decision', beforeValue: 'Under Review', afterValue: 'Written Warning' },
 { fieldName: 'Status', beforeValue: 'Under Investigation', afterValue: 'Closed' }
 ],
 justification: 'First offense - written warning issued with corrective action plan'
 },

 // HR Settings
 {
 eventId: 'EVT-014',
 timestamp: '2024-01-03T10:45:00Z',
 module: 'Settings',
 actionType: 'Update',
 recordType: 'Configuration',
 recordReference: 'WORKFLOW-RULES',
 performedBy: 'Sarah Johnson',
 performedByRole: 'HR Manager',
 status: 'Success',
 changeDetails: [
 { fieldName: 'Annual Leave Accrual Rate', beforeValue: '2.0 days/month', afterValue: '2.5 days/month' },
 { fieldName: 'Carry-Over Days', beforeValue: '5 days', afterValue: '10 days' }
 ],
 justification: 'Updated to align with new HR policy 2024'
 },
 {
 eventId: 'EVT-015',
 timestamp: '2024-01-04T11:00:00Z',
 module: 'Settings',
 actionType: 'Create',
 recordType: 'Configuration',
 recordReference: 'DEPARTMENT',
 performedBy: 'Sarah Johnson',
 performedByRole: 'HR Manager',
 status: 'Success',
 changeDetails: [
 { fieldName: 'New Department', beforeValue: 'N/A', afterValue: 'Monitoring & Evaluation' }
 ]
 },

 // Failed event example
 {
 eventId: 'EVT-016',
 timestamp: '2024-01-21T10:00:00Z',
 module: 'Payroll',
 actionType: 'Update',
 recordType: 'Salary',
 recordReference: 'SAL-HR-0030',
 performedBy: 'Michael Chen',
 performedByRole: 'HR Officer',
 affectedEmployee: 'Lisa Martinez (HR-0030)',
 status: 'Failed',
 errorMessage: 'Cannot update salary - payroll period is locked'
 }
 ];

 localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sampleEvents));
 }

 /**
 * Get all log events (read-only)
 */
 getAll(): HRLogEvent[] {
 const stored = localStorage.getItem(this.STORAGE_KEY);
 return stored ? JSON.parse(stored) : [];
 }

 /**
 * Get filtered log events
 */
 getFiltered(filters: HRLogFilters): HRLogEvent[] {
 let events = this.getAll();

 // Date range filter
 if (filters.dateFrom) {
 const fromDate = new Date(filters.dateFrom);
 events = events.filter(e => new Date(e.timestamp) >= fromDate);
 }
 if (filters.dateTo) {
 const toDate = new Date(filters.dateTo);
 toDate.setHours(23, 59, 59); // End of day
 events = events.filter(e => new Date(e.timestamp) <= toDate);
 }

 // Module filter
 if (filters.module) {
 events = events.filter(e => e.module === filters.module);
 }

 // Action type filter
 if (filters.actionType) {
 events = events.filter(e => e.actionType === filters.actionType);
 }

 // Record type filter
 if (filters.recordType) {
 events = events.filter(e => e.recordType === filters.recordType);
 }

 // Employee filter
 if (filters.employee) {
 events = events.filter(e => 
 e.affectedEmployee?.toLowerCase().includes(filters.employee!.toLowerCase())
 );
 }

 // Performed by filter
 if (filters.performedBy) {
 events = events.filter(e => 
 e.performedBy.toLowerCase().includes(filters.performedBy!.toLowerCase())
 );
 }

 // Sort by timestamp descending (newest first)
 return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
 }

 /**
 * Get single event by ID
 */
 getById(eventId: string): HRLogEvent | undefined {
 return this.getAll().find(e => e.eventId === eventId);
 }

 /**
 * Log a new event (system use only)
 * This would be called automatically by other services
 */
 logEvent(event: Omit<HRLogEvent, 'eventId' | 'timestamp' | 'status'>): void {
 const events = this.getAll();
 const newEvent: HRLogEvent = {
 ...event,
 eventId: `EVT-${String(events.length + 1).padStart(3, '0')}`,
 timestamp: new Date().toISOString(),
 status: 'Success'
 };
 events.push(newEvent);
 localStorage.setItem(this.STORAGE_KEY, JSON.stringify(events));
 }

 /**
 * Export to Excel format
 */
 exportToExcel(filters?: HRLogFilters): void {
 const events = filters ? this.getFiltered(filters) : this.getAll();
 
 // Create CSV content
 const headers = [
 'Event ID',
 'Date & Time',
 'Module',
 'Action Type',
 'Record Type',
 'Record Reference',
 'Performed By',
 'Role',
 'Affected Employee',
 'Status',
 'Changes',
 'Justification'
 ];

 const rows = events.map(event => [
 event.eventId,
 new Date(event.timestamp).toLocaleString(),
 event.module,
 event.actionType,
 event.recordType,
 event.recordReference,
 event.performedBy,
 event.performedByRole,
 event.affectedEmployee || 'N/A',
 event.status,
 event.changeDetails?.map(c => `${c.fieldName}: ${c.beforeValue} → ${c.afterValue}`).join('; ') || 'No changes',
 event.justification || 'N/A'
 ]);

 const csvContent = [
 headers.join(','),
 ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
 ].join('\n');

 // Download
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const link = document.createElement('a');
 const url = URL.createObjectURL(blob);
 link.setAttribute('href', url);
 link.setAttribute('download', `HR_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`);
 link.style.visibility = 'hidden';
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 }

 /**
 * Get statistics
 */
 getStatistics() {
 const events = this.getAll();
 return {
 total: events.length,
 byModule: this.groupBy(events, 'module'),
 byActionType: this.groupBy(events, 'actionType'),
 byStatus: this.groupBy(events, 'status'),
 recentEvents: events.slice(0, 5)
 };
 }

 private groupBy(array: HRLogEvent[], key: keyof HRLogEvent): Record<string, number> {
 return array.reduce((acc, item) => {
 const value = String(item[key]);
 acc[value] = (acc[value] || 0) + 1;
 return acc;
 }, {} as Record<string, number>);
 }
}

export const hrLogEventsService = new HRLogEventsService();
