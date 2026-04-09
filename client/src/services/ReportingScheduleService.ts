// ============================================================================
// PROJECT REPORTING SCHEDULE SERVICE - FINAL SPECIFICATION
// System-wide controller for project reporting obligations
// Auto-synced with Projects, Grants, Active Grants, Documents
// ============================================================================

export type ReportType =
 | 'MONTHLY_REPORT'
 | 'QUARTERLY_REPORT'
 | 'MID_TERM_REPORT'
 | 'FIRST_YEAR_REPORT'
 | 'BASELINE_REPORT'
 | 'ENDLINE_REPORT'
 | 'MID_TERM_FINANCIAL_REPORT'
 | 'FINAL_NARRATIVE_REPORT'
 | 'FINAL_FINANCIAL_REPORT'
 | 'FINAL_ASSESSMENT_REPORT'
 | 'OTHER';

export type ReportStatus =
 | 'NOT_STARTED'
 | 'PLANNED'
 | 'UNDER_PREPARATION'
 | 'UNDER_REVIEW'
 | 'SUBMITTED_TO_HQ'
 | 'SUBMITTED_TO_DONOR';

export interface ReportingSchedule {
 id: string;
 
 // Project Identification (Auto-Synced)
 project_code: string; // Links to actual project
 project_name: string; // Auto-populated from project
 project_id?: string; // Internal reference
 
 // Report Definition
 report_type: ReportType;
 report_type_other?: string; // Only when report_type = 'OTHER'
 
 // Report Period
 period_from: string; // YYYY-MM-DD
 period_to: string; // YYYY-MM-DD
 
 // Report Status & Tracking
 report_status: ReportStatus;
 report_deadline: string; // YYYY-MM-DD
 
 // Notes
 notes?: string;
 
 // System fields
 created_by: string;
 created_by_id?: string;
 created_at: string;
 updated_at: string;
 updated_by?: string;
 is_locked: boolean; // True when status = SUBMITTED_TO_DONOR
 
 // Integration fields
 grant_id?: string; // Links to Active Grants
 documents_folder_id?: string; // Links to Documents module
}

export interface CreateReportingScheduleParams {
 project_code: string;
 project_name: string;
 report_type: ReportType;
 report_type_other?: string;
 period_from: string;
 period_to: string;
 report_status: ReportStatus;
 report_deadline: string;
 notes?: string;
 created_by: string;
 created_by_id?: string;
 project_id?: string;
}

export interface UpdateReportingScheduleParams {
 id: string;
 report_type?: ReportType;
 report_type_other?: string;
 period_from?: string;
 period_to?: string;
 report_status?: ReportStatus;
 report_deadline?: string;
 notes?: string;
}

export interface ReportingScheduleFilter {
 project_code?: string;
 project_id?: string;
 report_type?: ReportType;
 report_status?: ReportStatus;
 deadline_from?: string;
 deadline_to?: string;
}

// ============================================================================
// MOCK DATA STORAGE (In production: Supabase/PostgreSQL)
// ============================================================================
let mockReportingSchedules: ReportingSchedule[] = [
 {
 id: '1',
 project_code: 'UEFA-FOUND-001',
 project_name: 'UEFA Foundation',
 project_id: '1',
 report_type: 'QUARTERLY_REPORT',
 period_from: '2026-01-01',
 period_to: '2026-03-31',
 report_status: 'PLANNED',
 report_deadline: '2026-04-15',
 notes: 'Q1 2026 Report',
 created_by: 'Admin User',
 created_at: '2026-01-16T10:00:00Z',
 updated_at: '2026-01-16T10:00:00Z',
 is_locked: false
 },
 {
 id: '2',
 project_code: 'UNICEF-YEM-2024-EDU-007',
 project_name: 'Emergency Education Support in Conflict Areas',
 project_id: '2',
 report_type: 'MID_TERM_REPORT',
 period_from: '2024-03-01',
 period_to: '2024-06-30',
 report_status: 'UNDER_REVIEW',
 report_deadline: '2024-07-15',
 notes: 'Mid-term evaluation due',
 created_by: 'Ahmad Al-Hassan',
 created_at: '2024-03-01T08:00:00Z',
 updated_at: '2024-06-25T14:30:00Z',
 is_locked: false
 }
];

// ============================================================================
// REPORT TYPE TRANSLATIONS
// ============================================================================
export const REPORT_TYPE_LABELS: Record<ReportType, { en: string; ar: string }> = {
 MONTHLY_REPORT: { en: 'Monthly Report', ar: 'تقرير شهري' },
 QUARTERLY_REPORT: { en: 'Quarterly Report', ar: 'تقرير ربع سنوي' },
 MID_TERM_REPORT: { en: 'Mid-term Report / Bi-Annual Report', ar: 'تقرير نصف سنوي' },
 FIRST_YEAR_REPORT: { en: 'First Year Report', ar: 'تقرير السنة الأولى' },
 BASELINE_REPORT: { en: 'Baseline Report', ar: 'تقرير خط الأساس' },
 ENDLINE_REPORT: { en: 'End-line Report', ar: 'تقرير الخط النهائي' },
 MID_TERM_FINANCIAL_REPORT: { en: 'Mid-term Financial Report', ar: 'تقرير مالي نصف سنوي' },
 FINAL_NARRATIVE_REPORT: { en: 'Final Narrative Report', ar: 'التقرير السردي النهائي' },
 FINAL_FINANCIAL_REPORT: { en: 'Final Financial Report', ar: 'التقرير المالي النهائي' },
 FINAL_ASSESSMENT_REPORT: { en: 'Final Assessment Report', ar: 'تقرير التقييم النهائي' },
 OTHER: { en: 'Other', ar: 'أخرى' }
};

// ============================================================================
// REPORT STATUS TRANSLATIONS
// ============================================================================
export const REPORT_STATUS_LABELS: Record<ReportStatus, { en: string; ar: string }> = {
 NOT_STARTED: { en: 'Not Started', ar: 'لم يبدأ' },
 PLANNED: { en: 'Planned', ar: 'مخطط' },
 UNDER_PREPARATION: { en: 'Under Preparation', ar: 'قيد الإعداد' },
 UNDER_REVIEW: { en: 'Under Review', ar: 'قيد المراجعة' },
 SUBMITTED_TO_HQ: { en: 'Submitted to HQ', ar: 'مقدم للمقر الرئيسي' },
 SUBMITTED_TO_DONOR: { en: 'Submitted to Donor', ar: 'مقدم للجهة المانحة' }
};

// ============================================================================
// VALIDATION RULES
// ============================================================================

/**
 * Validate that report period falls within project dates
 */
export function validateReportPeriod(
 periodFrom: string,
 periodTo: string,
 projectStartDate: string,
 projectEndDate: string
): { valid: boolean; error?: string } {
 const from = new Date(periodFrom);
 const to = new Date(periodTo);
 const projectStart = new Date(projectStartDate);
 const projectEnd = new Date(projectEndDate);

 if (from < projectStart || to > projectEnd) {
 return {
 valid: false,
 error: 'Report period must fall within project start and end dates'
 };
 }

 if (from > to) {
 return {
 valid: false,
 error: 'Period From date must be before Period To date'
 };
 }

 return { valid: true };
}

/**
 * Check for duplicate/overlapping schedules
 */
export function checkDuplicateSchedule(
 projectCode: string,
 reportType: ReportType,
 periodFrom: string,
 periodTo: string,
 excludeId?: string
): { isDuplicate: boolean; conflictingSchedule?: ReportingSchedule } {
 const existing = mockReportingSchedules.find(schedule => {
 if (schedule.id === excludeId) return false;
 if (schedule.project_code !== projectCode) return false;
 if (schedule.report_type !== reportType) return false;

 // Check date overlap
 const existingFrom = new Date(schedule.period_from);
 const existingTo = new Date(schedule.period_to);
 const newFrom = new Date(periodFrom);
 const newTo = new Date(periodTo);

 const hasOverlap = (
 (newFrom >= existingFrom && newFrom <= existingTo) ||
 (newTo >= existingFrom && newTo <= existingTo) ||
 (newFrom <= existingFrom && newTo >= existingTo)
 );

 return hasOverlap;
 });

 return {
 isDuplicate: !!existing,
 conflictingSchedule: existing
 };
}

// ============================================================================
// SERVICE METHODS
// ============================================================================

export class ReportingScheduleService {
 /**
 * Get all reporting schedules with optional filtering
 */
 static getReportingSchedules(filter?: ReportingScheduleFilter): ReportingSchedule[] {
 let results = [...mockReportingSchedules];

 if (filter?.project_code) {
 results = results.filter(s => s.project_code === filter.project_code);
 }

 if (filter?.project_id) {
 results = results.filter(s => s.project_id === filter.project_id);
 }

 if (filter?.report_type) {
 results = results.filter(s => s.report_type === filter.report_type);
 }

 if (filter?.report_status) {
 results = results.filter(s => s.report_status === filter.report_status);
 }

 if (filter?.deadline_from) {
 results = results.filter(s => s.report_deadline >= filter.deadline_from!);
 }

 if (filter?.deadline_to) {
 results = results.filter(s => s.report_deadline <= filter.deadline_to!);
 }

 return results.sort((a, b) => 
 new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
 );
 }

 /**
 * Get single reporting schedule by ID
 */
 static getReportingScheduleById(id: string): ReportingSchedule | null {
 return mockReportingSchedules.find(s => s.id === id) || null;
 }

 /**
 * Create new reporting schedule
 */
 static createReportingSchedule(params: CreateReportingScheduleParams): ReportingSchedule {
 // Validate required fields
 if (!params.project_code || !params.project_name) {
 throw new Error('Project Code and Project Name are required');
 }

 if (!params.report_type) {
 throw new Error('Type of Report is required');
 }

 if (params.report_type === 'OTHER' && !params.report_type_other) {
 throw new Error('Please specify report type when "Other" is selected');
 }

 if (!params.period_from || !params.period_to) {
 throw new Error('Report Period (From and To dates) is required');
 }

 if (!params.report_deadline) {
 throw new Error('Report Deadline is required');
 }

 if (!params.report_status) {
 throw new Error('Report Status is required');
 }

 // Create new schedule
 const newSchedule: ReportingSchedule = {
 id: Date.now().toString(),
 project_code: params.project_code,
 project_name: params.project_name,
 project_id: params.project_id,
 report_type: params.report_type,
 report_type_other: params.report_type_other,
 period_from: params.period_from,
 period_to: params.period_to,
 report_status: params.report_status,
 report_deadline: params.report_deadline,
 notes: params.notes,
 created_by: params.created_by,
 created_by_id: params.created_by_id,
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 is_locked: params.report_status === 'SUBMITTED_TO_DONOR'
 };

 mockReportingSchedules.push(newSchedule);
 return newSchedule;
 }

 /**
 * Update existing reporting schedule
 */
 static updateReportingSchedule(
 params: UpdateReportingScheduleParams,
 updatedBy: string
 ): ReportingSchedule {
 const index = mockReportingSchedules.findIndex(s => s.id === params.id);
 if (index === -1) {
 throw new Error('Reporting schedule not found');
 }

 const existing = mockReportingSchedules[index];

 // Check if locked
 if (existing.is_locked) {
 throw new Error('Cannot modify schedule - report has been submitted to donor');
 }

 // Update fields
 const updated: ReportingSchedule = {
 ...existing,
 report_type: params.report_type ?? existing.report_type,
 report_type_other: params.report_type_other ?? existing.report_type_other,
 period_from: params.period_from ?? existing.period_from,
 period_to: params.period_to ?? existing.period_to,
 report_status: params.report_status ?? existing.report_status,
 report_deadline: params.report_deadline ?? existing.report_deadline,
 notes: params.notes ?? existing.notes,
 updated_at: new Date().toISOString(),
 updated_by: updatedBy,
 is_locked: (params.report_status ?? existing.report_status) === 'SUBMITTED_TO_DONOR'
 };

 mockReportingSchedules[index] = updated;
 return updated;
 }

 /**
 * Delete reporting schedule
 */
 static deleteReportingSchedule(id: string): void {
 const schedule = mockReportingSchedules.find(s => s.id === id);
 
 if (!schedule) {
 throw new Error('Reporting schedule not found');
 }

 if (schedule.is_locked) {
 throw new Error('Cannot delete schedule - report has been submitted to donor');
 }

 mockReportingSchedules = mockReportingSchedules.filter(s => s.id !== id);
 }

 /**
 * Get upcoming deadlines (next 30 days)
 */
 static getUpcomingDeadlines(daysAhead: number = 30): ReportingSchedule[] {
 const today = new Date();
 const futureDate = new Date();
 futureDate.setDate(today.getDate() + daysAhead);

 return mockReportingSchedules.filter(schedule => {
 const deadline = new Date(schedule.report_deadline);
 return deadline >= today && deadline <= futureDate;
 }).sort((a, b) => 
 new Date(a.report_deadline).getTime() - new Date(b.report_deadline).getTime()
 );
 }

 /**
 * Get overdue reports
 */
 static getOverdueReports(): ReportingSchedule[] {
 const today = new Date().toISOString().split('T')[0];
 
 return mockReportingSchedules.filter(schedule => {
 return schedule.report_deadline < today && 
 schedule.report_status !== 'SUBMITTED_TO_DONOR';
 });
 }
}
