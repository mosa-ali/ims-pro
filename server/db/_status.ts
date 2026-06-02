/**
 * _status.ts — Centralized Status Constants
 *
 * ALL status values are validated against the exact mysqlEnum values in drizzle/schema.ts.
 * NO hardcoded status strings anywhere in the codebase.
 *
 * IMPORTANT: These constants MUST match the exact strings in schema.ts mysqlEnum definitions.
 * Any mismatch will cause silent runtime failures.
 *
 * Last validated: against drizzle/schema.ts
 */

// ============================================================
// PROJECTS — schema: projects.status
// mysqlEnum(['planning','active','on_hold','completed','cancelled'])
// ============================================================
export const PROJECT_STATUS = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

// ============================================================
// GRANTS — schema: grants.status
// mysqlEnum(['planned','ongoing','closed','draft','submitted','under_review','approved','rejected','pending'])
// ============================================================
export const GRANT_STATUS = {
  PLANNED: 'planned',
  ONGOING: 'ongoing',
  /** Alias for ONGOING — use when filtering 'active' grants in dashboards */
  ACTIVE: 'ongoing',
  CLOSED: 'closed',
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PENDING: 'pending',
} as const;
export type GrantStatus = (typeof GRANT_STATUS)[keyof typeof GRANT_STATUS];

// ============================================================
// PURCHASE REQUESTS — schema: purchaseRequests.status
// mysqlEnum(['draft','submitted','validated_by_logistic','rejected_by_logistic',
//            'validated_by_finance','rejected_by_finance','approved','rejected_by_pm'])
// ============================================================
export const PR_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  VALIDATED_BY_LOGISTIC: 'validated_by_logistic',
  REJECTED_BY_LOGISTIC: 'rejected_by_logistic',
  VALIDATED_BY_FINANCE: 'validated_by_finance',
  REJECTED_BY_FINANCE: 'rejected_by_finance',
  APPROVED: 'approved',
  REJECTED_BY_PM: 'rejected_by_pm',
} as const;
export type PrStatus = (typeof PR_STATUS)[keyof typeof PR_STATUS];

// ============================================================
// CONTRACTS — schema: contracts.status
// mysqlEnum(['draft','pending_approval','approved','active','completed','terminated'])
// ============================================================
export const CONTRACT_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  TERMINATED: 'terminated',
} as const;
export type ContractStatus = (typeof CONTRACT_STATUS)[keyof typeof CONTRACT_STATUS];

// ============================================================
// BUDGETS — schema: budgets.status
// mysqlEnum(['draft','submitted','approved','revised','closed','rejected'])
// ============================================================
export const BUDGET_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REVISED: 'revised',
  CLOSED: 'closed',
  REJECTED: 'rejected',
} as const;
export type BudgetStatus = (typeof BUDGET_STATUS)[keyof typeof BUDGET_STATUS];

// ============================================================
// ACTIVITIES — schema: activities.status
// mysqlEnum(['NOT_STARTED','IN_PROGRESS','COMPLETED','ON_HOLD','CANCELLED'])
// NOTE: UPPERCASE values — must match exactly
// ============================================================
export const ACTIVITY_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ON_HOLD: 'ON_HOLD',
  CANCELLED: 'CANCELLED',
} as const;
export type ActivityStatus = (typeof ACTIVITY_STATUS)[keyof typeof ACTIVITY_STATUS];

// ============================================================
// TASKS — schema: tasks.status
// mysqlEnum(['TODO','IN_PROGRESS','REVIEW','DONE','BLOCKED'])
// NOTE: UPPERCASE values
// ============================================================
export const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  REVIEW: 'REVIEW',
  DONE: 'DONE',
  BLOCKED: 'BLOCKED',
} as const;
export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

// ============================================================
// INDICATORS — schema: indicators.status
// mysqlEnum(['ON_TRACK','AT_RISK','OFF_TRACK','ACHIEVED'])
// NOTE: UPPERCASE values
// ============================================================
export const INDICATOR_STATUS = {
  ON_TRACK: 'ON_TRACK',
  AT_RISK: 'AT_RISK',
  OFF_TRACK: 'OFF_TRACK',
  ACHIEVED: 'ACHIEVED',
} as const;
export type IndicatorStatus = (typeof INDICATOR_STATUS)[keyof typeof INDICATOR_STATUS];

// ============================================================
// RFQs — schema: rfqs.status
// mysqlEnum(['draft','active','sent','received','cancelled'])
// ============================================================
export const RFQ_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  SENT: 'sent',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
} as const;
export type RfqStatus = (typeof RFQ_STATUS)[keyof typeof RFQ_STATUS];

// ============================================================
// GOODS RECEIPT NOTES — schema: goodsReceiptNotes.status
// mysqlEnum(['pending_inspection','inspected','accepted','partially_accepted','rejected'])
// ============================================================
export const GRN_STATUS = {
  PENDING_INSPECTION: 'pending_inspection',
  INSPECTED: 'inspected',
  ACCEPTED: 'accepted',
  PARTIALLY_ACCEPTED: 'partially_accepted',
  REJECTED: 'rejected',
} as const;
export type GrnStatus = (typeof GRN_STATUS)[keyof typeof GRN_STATUS];

// ============================================================
// PAYMENTS — schema: payments.status
// mysqlEnum(['draft','pending_approval','approved','paid','cancelled','void'])
// ============================================================
export const PAYMENT_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  VOID: 'void',
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

// ============================================================
// WAREHOUSE TRANSFERS — schema: warehouseTransfers.status
// mysqlEnum(['draft','submitted','approved','dispatched','received','completed','cancelled'])
// ============================================================
export const WAREHOUSE_TRANSFER_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  DISPATCHED: 'dispatched',
  RECEIVED: 'received',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type WarehouseTransferStatus = (typeof WAREHOUSE_TRANSFER_STATUS)[keyof typeof WAREHOUSE_TRANSFER_STATUS];

// ============================================================
// STOCK REQUESTS — schema: stockRequests.status
// mysqlEnum(['draft','submitted','approved','partially_issued','issued','rejected','cancelled'])
// ============================================================
export const STOCK_REQUEST_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  PARTIALLY_ISSUED: 'partially_issued',
  ISSUED: 'issued',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;
export type StockRequestStatus = (typeof STOCK_REQUEST_STATUS)[keyof typeof STOCK_REQUEST_STATUS];

// ============================================================
// STOCK ISSUES — schema: stockIssues.status
// mysqlEnum(['draft','submitted','issued','acknowledged','cancelled'])
// ============================================================
export const STOCK_ISSUE_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  ISSUED: 'issued',
  ACKNOWLEDGED: 'acknowledged',
  CANCELLED: 'cancelled',
} as const;
export type StockIssueStatus = (typeof STOCK_ISSUE_STATUS)[keyof typeof STOCK_ISSUE_STATUS];

// ============================================================
// STOCK ISSUED — schema: stockIssued.status
// mysqlEnum(['draft','issued','acknowledged','cancelled'])
// ============================================================
export const STOCK_ISSUED_STATUS = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  ACKNOWLEDGED: 'acknowledged',
  CANCELLED: 'cancelled',
} as const;
export type StockIssuedStatus = (typeof STOCK_ISSUED_STATUS)[keyof typeof STOCK_ISSUED_STATUS];

// ============================================================
// HR EMPLOYEES — schema: hrEmployees.status
// mysqlEnum(['active','on_leave','suspended','terminated','resigned'])
// ============================================================
export const EMPLOYEE_STATUS = {
  ACTIVE: 'active',
  ON_LEAVE: 'on_leave',
  SUSPENDED: 'suspended',
  TERMINATED: 'terminated',
  RESIGNED: 'resigned',
} as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUS)[keyof typeof EMPLOYEE_STATUS];

// ============================================================
// HR LEAVE TYPES — schema: hrLeaveRequests.leaveType, hrLeaveBalances.leaveType
// mysqlEnum(['annual','sick','maternity','paternity','unpaid','compassionate','study','other'])
// ============================================================
export const LEAVE_TYPES = {
  ANNUAL: 'annual',
  SICK: 'sick',
  MATERNITY: 'maternity',
  PATERNITY: 'paternity',
  UNPAID: 'unpaid',
  COMPASSIONATE: 'compassionate',
  STUDY: 'study',
  OTHER: 'other',
} as const;
export type LeaveType = (typeof LEAVE_TYPES)[keyof typeof LEAVE_TYPES];

// ============================================================
// HR LEAVE REQUESTS — schema: hrLeaveRequests.status
// mysqlEnum(['pending','approved','rejected','cancelled'])
// ============================================================
export const LEAVE_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;
export type LeaveRequestStatus = (typeof LEAVE_REQUEST_STATUS)[keyof typeof LEAVE_REQUEST_STATUS];

// ============================================================
// HR RECRUITMENT JOBS — schema: hrRecruitmentJobs.status
// mysqlEnum(['draft','open','on_hold','closed','filled','cancelled'])
// ============================================================
export const JOB_STATUS = {
  DRAFT: 'draft',
  OPEN: 'open',
  ON_HOLD: 'on_hold',
  CLOSED: 'closed',
  FILLED: 'filled',
  CANCELLED: 'cancelled',
} as const;
export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

// ============================================================
// HR PAYROLL RECORDS — schema: hrPayrollRecords.status
// mysqlEnum(['draft','pending_approval','approved','paid','cancelled'])
// ============================================================
export const PAYROLL_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  PAID: 'paid',
  CANCELLED: 'cancelled',
} as const;
export type PayrollStatus = (typeof PAYROLL_STATUS)[keyof typeof PAYROLL_STATUS];

// ============================================================
// HR SANCTIONS — schema: hrSanctions.status
// mysqlEnum(['reported','under_investigation','pending_decision','decided','appealed','closed'])
// ============================================================
export const SANCTION_STATUS = {
  REPORTED: 'reported',
  UNDER_INVESTIGATION: 'under_investigation',
  PENDING_DECISION: 'pending_decision',
  DECIDED: 'decided',
  APPEALED: 'appealed',
  CLOSED: 'closed',
} as const;
export type SanctionStatus = (typeof SANCTION_STATUS)[keyof typeof SANCTION_STATUS];

// ============================================================
// FINANCE EXPENDITURES — schema: financeExpenditures.status
// mysqlEnum(['draft','pending_approval','approved','rejected','paid','cancelled'])
// ============================================================
export const EXPENDITURE_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid',
  CANCELLED: 'cancelled',
} as const;
export type ExpenditureStatus = (typeof EXPENDITURE_STATUS)[keyof typeof EXPENDITURE_STATUS];

// ============================================================
// FINANCE PERIODS — schema: financePeriods.status
// mysqlEnum(['OPEN','SOFT_CLOSED','LOCKED','REOPENED'])
// NOTE: UPPERCASE values
// ============================================================
export const FINANCE_PERIOD_STATUS = {
  OPEN: 'OPEN',
  SOFT_CLOSED: 'SOFT_CLOSED',
  LOCKED: 'LOCKED',
  REOPENED: 'REOPENED',
} as const;
export type FinancePeriodStatus = (typeof FINANCE_PERIOD_STATUS)[keyof typeof FINANCE_PERIOD_STATUS];

// ============================================================
// ADVANCES — schema: advances.status (if present)
// mysqlEnum(['DRAFT','PENDING','APPROVED','REJECTED','PARTIALLY_SETTLED','FULLY_SETTLED','CANCELLED'])
// NOTE: UPPERCASE values
// ============================================================
export const ADVANCE_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PARTIALLY_SETTLED: 'PARTIALLY_SETTLED',
  FULLY_SETTLED: 'FULLY_SETTLED',
  CANCELLED: 'CANCELLED',
} as const;
export type AdvanceStatus = (typeof ADVANCE_STATUS)[keyof typeof ADVANCE_STATUS];

// ============================================================
// VENDORS — schema: vendors.approvalStatus
// mysqlEnum(['pending','pending_approval','approved','rejected'])
// ============================================================
export const VENDOR_APPROVAL_STATUS = {
  PENDING: 'pending',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export type VendorApprovalStatus = (typeof VENDOR_APPROVAL_STATUS)[keyof typeof VENDOR_APPROVAL_STATUS];

// ============================================================
// PROJECT REPORTING SCHEDULES — schema: projectReportingSchedules.status
// mysqlEnum(['pending','in_progress','submitted','approved','rejected','overdue'])
// ============================================================
export const REPORTING_SCHEDULE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  OVERDUE: 'overdue',
} as const;
export type ReportingScheduleStatus = (typeof REPORTING_SCHEDULE_STATUS)[keyof typeof REPORTING_SCHEDULE_STATUS];

// ============================================================
// GL POSTING EVENTS — schema: glPostingEvents.postingStatus
// mysqlEnum(['pending','posted','failed','reversed'])
// ============================================================
export const GL_POSTING_STATUS = {
  PENDING: 'pending',
  POSTED: 'posted',
  FAILED: 'failed',
  REVERSED: 'reversed',
} as const;
export type GlPostingStatus = (typeof GL_POSTING_STATUS)[keyof typeof GL_POSTING_STATUS];

// ============================================================
// GENERIC POSTING STATUS (shared across finance tables)
// mysqlEnum(['unposted','posted','reversed'])
// ============================================================
export const POSTING_STATUS = {
  UNPOSTED: 'unposted',
  POSTED: 'posted',
  REVERSED: 'reversed',
} as const;
export type PostingStatus = (typeof POSTING_STATUS)[keyof typeof POSTING_STATUS];

// ============================================================
// RISK STATUS
// mysqlEnum(['identified','assessed','mitigated','accepted','transferred','closed'])
// ============================================================
export const RISK_STATUS = {
  IDENTIFIED: 'identified',
  ASSESSED: 'assessed',
  MITIGATED: 'mitigated',
  ACCEPTED: 'accepted',
  TRANSFERRED: 'transferred',
  CLOSED: 'closed',
} as const;
export type RiskStatus = (typeof RISK_STATUS)[keyof typeof RISK_STATUS];

// ============================================================
// MEAL ACCOUNTABILITY STATUS
// mysqlEnum(['open','in_progress','resolved','closed'])
// ============================================================
export const MEAL_ACCOUNTABILITY_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;
export type MealAccountabilityStatus = (typeof MEAL_ACCOUNTABILITY_STATUS)[keyof typeof MEAL_ACCOUNTABILITY_STATUS];

// ============================================================
// MEAL DQA VISIT STATUS
// mysqlEnum(['draft','submitted','approved','closed'])
// ============================================================
export const MEAL_DQA_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  CLOSED: 'closed',
} as const;
export type MealDqaStatus = (typeof MEAL_DQA_STATUS)[keyof typeof MEAL_DQA_STATUS];

// ============================================================
// PURCHASE ORDERS
// Schema: purchaseOrders.status mysqlEnum(['draft','sent','acknowledged','partially_delivered','delivered','completed','cancelled'])
// ============================================================
export const PO_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  ACKNOWLEDGED: 'acknowledged',
  PARTIALLY_DELIVERED: 'partially_delivered',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type PoStatus = (typeof PO_STATUS)[keyof typeof PO_STATUS];

// ============================================================
// INVITATIONS
// Schema: invitations.status mysqlEnum(['pending','accepted','expired','cancelled'])
// ============================================================
export const INVITATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;
export type InvitationStatus = (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS];

// ============================================================
// UNIFIED STATUS NAMESPACE
// Convenience re-export for consumers who want a single import
// ============================================================
export const STATUS = {
  PROJECT: PROJECT_STATUS,
  GRANT: GRANT_STATUS,
  PR: PR_STATUS,
  CONTRACT: CONTRACT_STATUS,
  BUDGET: BUDGET_STATUS,
  ACTIVITY: ACTIVITY_STATUS,
  TASK: TASK_STATUS,
  INDICATOR: INDICATOR_STATUS,
  RFQ: RFQ_STATUS,
  GRN: GRN_STATUS,
  PAYMENT: PAYMENT_STATUS,
  WAREHOUSE_TRANSFER: WAREHOUSE_TRANSFER_STATUS,
  STOCK_REQUEST: STOCK_REQUEST_STATUS,
  STOCK_ISSUE: STOCK_ISSUE_STATUS,
  STOCK_ISSUED: STOCK_ISSUED_STATUS,
  EMPLOYEE: EMPLOYEE_STATUS,
  LEAVE_REQUEST: LEAVE_REQUEST_STATUS,
  JOB: JOB_STATUS,
  PAYROLL: PAYROLL_STATUS,
  SANCTION: SANCTION_STATUS,
  EXPENDITURE: EXPENDITURE_STATUS,
  FINANCE_PERIOD: FINANCE_PERIOD_STATUS,
  ADVANCE: ADVANCE_STATUS,
  VENDOR_APPROVAL: VENDOR_APPROVAL_STATUS,
  REPORTING_SCHEDULE: REPORTING_SCHEDULE_STATUS,
  GL_POSTING: GL_POSTING_STATUS,
  POSTING: POSTING_STATUS,
  RISK: RISK_STATUS,
  MEAL_ACCOUNTABILITY: MEAL_ACCOUNTABILITY_STATUS,
  MEAL_DQA: MEAL_DQA_STATUS,
  INVITATION: INVITATION_STATUS,
  PO: PO_STATUS,
} as const;


// ============================================================================
// HR ANNUAL PLANS — schema: hrAnnualPlans.status
// mysqlEnum(['draft','pending_review','pending_approval','approved','rejected'])
// ============================================================================
export const ANNUAL_PLAN_STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export type AnnualPlanStatus = (typeof ANNUAL_PLAN_STATUS)[keyof typeof ANNUAL_PLAN_STATUS];

// ============================================================================
// HR OBJECTIVES — schema: hrObjectives.status
// mysqlEnum(['draft','active','completed','archived'])
// ============================================================================
export const OBJECTIVE_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;
export type ObjectiveStatus = (typeof OBJECTIVE_STATUS)[keyof typeof OBJECTIVE_STATUS];

// ============================================================================
// HR OBJECTIVE PRIORITY — schema: hrObjectives.priority
// mysqlEnum(['critical','high','medium','low'])
// ============================================================================
export const OBJECTIVE_PRIORITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;
export type ObjectivePriority = (typeof OBJECTIVE_PRIORITY)[keyof typeof OBJECTIVE_PRIORITY];

// ============================================================================
// HR KPIs — schema: hrKPIs.status
// mysqlEnum(['draft','active','completed','archived'])
// ============================================================================
export const KPI_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;
export type KpiStatus = (typeof KPI_STATUS)[keyof typeof KPI_STATUS];

// ============================================================================
// HR KPI REVIEW FREQUENCY — schema: hrKPIs.reviewFrequency
// mysqlEnum(['monthly','quarterly','semi_annual','annual'])
// ============================================================================
export const KPI_REVIEW_FREQUENCY = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  SEMI_ANNUAL: 'semi_annual',
  ANNUAL: 'annual',
} as const;
export type KpiReviewFrequency = (typeof KPI_REVIEW_FREQUENCY)[keyof typeof KPI_REVIEW_FREQUENCY];

// ============================================================================
// HR PLAN REVIEWS — schema: hrPlanReviews.reviewStatus
// mysqlEnum(['pending','approved','rejected','commented'])
// ============================================================================
export const PLAN_REVIEW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMMENTED: 'commented',
} as const;
export type PlanReviewStatus = (typeof PLAN_REVIEW_STATUS)[keyof typeof PLAN_REVIEW_STATUS];

// ============================================================================
// HR PLAN REVIEWER ROLE — schema: hrPlanReviews.reviewerRole
// mysqlEnum(['hr_manager','department_head','executive','finance','other'])
// ============================================================================
export const PLAN_REVIEWER_ROLE = {
  HR_MANAGER: 'hr_manager',
  DEPARTMENT_HEAD: 'department_head',
  EXECUTIVE: 'executive',
  FINANCE: 'finance',
  OTHER: 'other',
} as const;
export type PlanReviewerRole = (typeof PLAN_REVIEWER_ROLE)[keyof typeof PLAN_REVIEWER_ROLE];
