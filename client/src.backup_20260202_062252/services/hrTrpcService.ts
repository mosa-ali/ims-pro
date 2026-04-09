/**
 * HR tRPC Service - Database-backed HR operations
 * 
 * This service provides React hooks for HR operations using tRPC.
 * It replaces the localStorage-based hrService with database persistence.
 */

import { trpc } from "@/lib/trpc";

// ============================================================================
// TYPE DEFINITIONS (matching database schema)
// ============================================================================

export interface HREmployee {
  id: number;
  organizationId: number;
  operatingUnitId?: number | null;
  employeeCode: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string | null;
  lastNameAr?: string | null;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: Date | null;
  gender?: "male" | "female" | "other" | null;
  nationality?: string | null;
  nationalId?: string | null;
  passportNumber?: string | null;
  employmentType?: "full_time" | "part_time" | "contract" | "consultant" | "intern" | null;
  staffCategory?: "national" | "international" | "expatriate" | null;
  department?: string | null;
  position?: string | null;
  jobTitle?: string | null;
  gradeLevel?: string | null;
  reportingTo?: number | null;
  hireDate?: Date | null;
  contractStartDate?: Date | null;
  contractEndDate?: Date | null;
  probationEndDate?: Date | null;
  terminationDate?: Date | null;
  status?: "active" | "on_leave" | "suspended" | "terminated" | "resigned" | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankIban?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface HRLeaveRequest {
  id: number;
  organizationId: number;
  employeeId: number;
  leaveType: "annual" | "sick" | "maternity" | "paternity" | "unpaid" | "compassionate" | "study" | "other";
  startDate: Date;
  endDate: Date;
  totalDays: string;
  reason?: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approvedBy?: number | null;
  approvedAt?: Date | null;
  rejectionReason?: string | null;
  attachmentUrl?: string | null;
  balanceBefore?: string | null;
  balanceAfter?: string | null;
  notes?: string | null;
  createdAt?: Date | null;
}

export interface HRLeaveBalance {
  id: number;
  organizationId: number;
  employeeId: number;
  year: number;
  leaveType: "annual" | "sick" | "maternity" | "paternity" | "unpaid" | "compassionate" | "study" | "other";
  entitlement: string;
  carriedOver: string;
  used: string;
  pending: string;
  remaining: string;
}

export interface HRAttendanceRecord {
  id: number;
  organizationId: number;
  employeeId: number;
  date: Date;
  checkIn?: Date | null;
  checkOut?: Date | null;
  status: "present" | "absent" | "late" | "half_day" | "on_leave" | "holiday" | "weekend";
  workHours?: string | null;
  overtimeHours?: string | null;
  location?: string | null;
  notes?: string | null;
  periodLocked?: boolean | null;
}

export interface HRPayrollRecord {
  id: number;
  organizationId: number;
  employeeId: number;
  payrollMonth: number;
  payrollYear: number;
  basicSalary: string;
  housingAllowance?: string | null;
  transportAllowance?: string | null;
  otherAllowances?: string | null;
  overtimePay?: string | null;
  bonus?: string | null;
  grossSalary: string;
  taxDeduction?: string | null;
  socialSecurityDeduction?: string | null;
  loanDeduction?: string | null;
  otherDeductions?: string | null;
  totalDeductions: string;
  netSalary: string;
  currency?: string | null;
  paymentMethod?: "bank_transfer" | "cash" | "check" | null;
  paymentReference?: string | null;
  status: "draft" | "pending_approval" | "approved" | "paid" | "cancelled";
  approvedBy?: number | null;
  approvedAt?: Date | null;
  paidAt?: Date | null;
  notes?: string | null;
}

export interface HRSanction {
  id: number;
  organizationId: number;
  employeeId: number;
  sanctionCode?: string | null;
  sanctionType: "verbal_warning" | "written_warning" | "final_warning" | "suspension" | "demotion" | "termination" | "other";
  severity: "minor" | "moderate" | "major" | "critical";
  incidentDate: Date;
  reportedDate?: Date | null;
  description: string;
  evidence?: string | null;
  status: "reported" | "under_investigation" | "pending_decision" | "decided" | "appealed" | "closed";
  investigatedBy?: number | null;
  investigationDate?: Date | null;
  investigationNotes?: string | null;
  decisionDate?: Date | null;
  decisionBy?: number | null;
  decision?: string | null;
  effectiveDate?: Date | null;
  expiryDate?: Date | null;
  appealDate?: Date | null;
  appealNotes?: string | null;
  appealOutcome?: "upheld" | "modified" | "overturned" | null;
  notes?: string | null;
}

export interface HRAnnualPlan {
  id: number;
  organizationId: number;
  planYear: number;
  planName: string;
  existingWorkforce?: string | null;
  plannedStaffing?: string | null;
  recruitmentPlan?: string | null;
  budgetEstimate?: string | null;
  trainingPlan?: string | null;
  hrRisks?: string | null;
  totalPlannedPositions?: number | null;
  existingStaff?: number | null;
  newPositionsRequired?: number | null;
  estimatedHrCost?: string | null;
  status: "draft" | "pending_review" | "pending_approval" | "approved" | "rejected";
  preparedBy?: number | null;
  preparedAt?: Date | null;
  reviewedBy?: number | null;
  reviewedAt?: Date | null;
  approvedBy?: number | null;
  approvedAt?: Date | null;
  notes?: string | null;
}

export interface HRDocument {
  id: number;
  organizationId: number;
  employeeId?: number | null;
  documentCode?: string | null;
  documentName: string;
  documentNameAr?: string | null;
  documentType: "policy" | "template" | "form" | "contract" | "certificate" | "id_document" | "other";
  category?: string | null;
  fileUrl?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  version?: string | null;
  effectiveDate?: Date | null;
  expiryDate?: Date | null;
  description?: string | null;
  tags?: string | null;
  isPublic?: boolean | null;
  accessRoles?: string | null;
  status: "draft" | "active" | "archived" | "expired";
  uploadedBy?: number | null;
}

export interface HRRecruitmentJob {
  id: number;
  organizationId: number;
  jobCode?: string | null;
  jobTitle: string;
  jobTitleAr?: string | null;
  department?: string | null;
  location?: string | null;
  employmentType?: "full_time" | "part_time" | "contract" | "consultant" | "intern" | null;
  numberOfPositions?: number | null;
  salaryMin?: string | null;
  salaryMax?: string | null;
  currency?: string | null;
  description?: string | null;
  requirements?: string | null;
  responsibilities?: string | null;
  benefits?: string | null;
  applicationDeadline?: Date | null;
  status: "draft" | "open" | "on_hold" | "closed" | "filled" | "cancelled";
  postedBy?: number | null;
  postedAt?: Date | null;
  closedAt?: Date | null;
}

export interface HRRecruitmentCandidate {
  id: number;
  organizationId: number;
  jobId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  resumeUrl?: string | null;
  coverLetterUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  currentCompany?: string | null;
  currentPosition?: string | null;
  yearsOfExperience?: number | null;
  expectedSalary?: string | null;
  currency?: string | null;
  noticePeriod?: string | null;
  source?: string | null;
  referredBy?: string | null;
  status: "applied" | "screening" | "shortlisted" | "interview_scheduled" | "interviewed" | "offered" | "hired" | "rejected" | "withdrawn";
  appliedAt?: Date | null;
  shortlistedAt?: Date | null;
  interviewDate?: Date | null;
  interviewNotes?: string | null;
  rating?: number | null;
  hiredAt?: Date | null;
  rejectedAt?: Date | null;
  notes?: string | null;
}

// ============================================================================
// CUSTOM HOOKS FOR HR OPERATIONS
// ============================================================================

/**
 * Hook for employee operations
 */
export function useHREmployees(organizationId: number, options?: {
  status?: "active" | "on_leave" | "suspended" | "terminated" | "resigned";
  department?: string;
  search?: string;
}) {
  const query = trpc.hrEmployees.getAll.useQuery({
    organizationId,
    status: options?.status,
    department: options?.department,
    search: options?.search,
  });

  const createMutation = trpc.hrEmployees.create.useMutation();
  const updateMutation = trpc.hrEmployees.update.useMutation();
  const deleteMutation = trpc.hrEmployees.delete.useMutation();

  return {
    employees: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useHREmployee(id: number) {
  return trpc.hrEmployees.getById.useQuery({ id });
}

export function useHREmployeeStatistics(organizationId: number) {
  return trpc.hrEmployees.getStatistics.useQuery({ organizationId });
}

/**
 * Hook for leave operations
 */
export function useHRLeaveRequests(organizationId: number, options?: {
  employeeId?: number;
  status?: "pending" | "approved" | "rejected" | "cancelled";
  leaveType?: "annual" | "sick" | "maternity" | "paternity" | "unpaid" | "compassionate" | "study" | "other";
}) {
  const query = trpc.hrLeave.getAll.useQuery({
    organizationId,
    employeeId: options?.employeeId,
    status: options?.status,
    leaveType: options?.leaveType,
  });

  const createMutation = trpc.hrLeave.create.useMutation();
  const approveMutation = trpc.hrLeave.approve.useMutation();
  const rejectMutation = trpc.hrLeave.reject.useMutation();
  const cancelMutation = trpc.hrLeave.cancel.useMutation();
  const deleteMutation = trpc.hrLeave.delete.useMutation();

  return {
    requests: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    approve: approveMutation.mutateAsync,
    reject: rejectMutation.mutateAsync,
    cancel: cancelMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
  };
}

export function useHRLeaveBalances(organizationId: number, employeeId: number, year?: number) {
  return trpc.hrLeave.getBalances.useQuery({
    organizationId,
    employeeId,
    year,
  });
}

export function useHRLeaveStatistics(organizationId: number, year?: number) {
  return trpc.hrLeave.getStatistics.useQuery({ organizationId, year });
}

/**
 * Hook for attendance operations
 */
export function useHRAttendance(organizationId: number, startDate: string, endDate: string, options?: {
  employeeId?: number;
  status?: "present" | "absent" | "late" | "half_day" | "on_leave" | "holiday" | "weekend";
}) {
  const query = trpc.hrAttendance.getAll.useQuery({
    organizationId,
    startDate,
    endDate,
    employeeId: options?.employeeId,
    status: options?.status,
  });

  const upsertMutation = trpc.hrAttendance.upsert.useMutation();
  const bulkCreateMutation = trpc.hrAttendance.bulkCreate.useMutation();
  const lockPeriodMutation = trpc.hrAttendance.lockPeriod.useMutation();
  const unlockPeriodMutation = trpc.hrAttendance.unlockPeriod.useMutation();

  return {
    records: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    upsert: upsertMutation.mutateAsync,
    bulkCreate: bulkCreateMutation.mutateAsync,
    lockPeriod: lockPeriodMutation.mutateAsync,
    unlockPeriod: unlockPeriodMutation.mutateAsync,
  };
}

export function useHRAttendanceStatistics(organizationId: number, startDate: string, endDate: string) {
  return trpc.hrAttendance.getStatistics.useQuery({ organizationId, startDate, endDate });
}

/**
 * Hook for payroll operations
 */
export function useHRPayroll(organizationId: number, options?: {
  employeeId?: number;
  payrollMonth?: number;
  payrollYear?: number;
  status?: "draft" | "pending_approval" | "approved" | "paid" | "cancelled";
}) {
  const query = trpc.hrPayroll.getAll.useQuery({
    organizationId,
    employeeId: options?.employeeId,
    payrollMonth: options?.payrollMonth,
    payrollYear: options?.payrollYear,
    status: options?.status,
  });

  const createMutation = trpc.hrPayroll.create.useMutation();
  const updateMutation = trpc.hrPayroll.update.useMutation();
  const submitMutation = trpc.hrPayroll.submitForApproval.useMutation();
  const approveMutation = trpc.hrPayroll.approve.useMutation();
  const markPaidMutation = trpc.hrPayroll.markAsPaid.useMutation();
  const cancelMutation = trpc.hrPayroll.cancel.useMutation();
  const deleteMutation = trpc.hrPayroll.delete.useMutation();

  return {
    records: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    submit: submitMutation.mutateAsync,
    approve: approveMutation.mutateAsync,
    markPaid: markPaidMutation.mutateAsync,
    cancel: cancelMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
  };
}

export function useHRPayrollStatistics(organizationId: number, payrollYear: number) {
  return trpc.hrPayroll.getStatistics.useQuery({ organizationId, payrollYear });
}

/**
 * Hook for salary grades
 */
export function useHRSalaryGrades(organizationId: number, status?: "active" | "inactive" | "draft") {
  const query = trpc.hrPayroll.getSalaryGrades.useQuery({ organizationId, status });

  const createMutation = trpc.hrPayroll.createSalaryGrade.useMutation();
  const updateMutation = trpc.hrPayroll.updateSalaryGrade.useMutation();
  const deleteMutation = trpc.hrPayroll.deleteSalaryGrade.useMutation();

  return {
    grades: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
  };
}

/**
 * Hook for sanctions operations
 */
export function useHRSanctions(organizationId: number, options?: {
  employeeId?: number;
  sanctionType?: "verbal_warning" | "written_warning" | "final_warning" | "suspension" | "demotion" | "termination" | "other";
  severity?: "minor" | "moderate" | "major" | "critical";
  status?: "reported" | "under_investigation" | "pending_decision" | "decided" | "appealed" | "closed";
}) {
  const query = trpc.hrSanctions.getAll.useQuery({
    organizationId,
    employeeId: options?.employeeId,
    sanctionType: options?.sanctionType,
    severity: options?.severity,
    status: options?.status,
  });

  const createMutation = trpc.hrSanctions.create.useMutation();
  const updateMutation = trpc.hrSanctions.update.useMutation();
  const startInvestigationMutation = trpc.hrSanctions.startInvestigation.useMutation();
  const completeInvestigationMutation = trpc.hrSanctions.completeInvestigation.useMutation();
  const makeDecisionMutation = trpc.hrSanctions.makeDecision.useMutation();
  const recordAppealMutation = trpc.hrSanctions.recordAppeal.useMutation();
  const resolveAppealMutation = trpc.hrSanctions.resolveAppeal.useMutation();
  const closeMutation = trpc.hrSanctions.close.useMutation();
  const deleteMutation = trpc.hrSanctions.delete.useMutation();

  return {
    sanctions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    startInvestigation: startInvestigationMutation.mutateAsync,
    completeInvestigation: completeInvestigationMutation.mutateAsync,
    makeDecision: makeDecisionMutation.mutateAsync,
    recordAppeal: recordAppealMutation.mutateAsync,
    resolveAppeal: resolveAppealMutation.mutateAsync,
    close: closeMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
  };
}

export function useHRSanctionsStatistics(organizationId: number) {
  return trpc.hrSanctions.getStatistics.useQuery({ organizationId });
}

/**
 * Hook for annual plan operations
 */
export function useHRAnnualPlans(organizationId: number, options?: {
  planYear?: number;
  status?: "draft" | "pending_review" | "pending_approval" | "approved" | "rejected";
}) {
  const query = trpc.hrAnnualPlan.getAll.useQuery({
    organizationId,
    planYear: options?.planYear,
    status: options?.status,
  });

  const createMutation = trpc.hrAnnualPlan.create.useMutation();
  const updateMutation = trpc.hrAnnualPlan.update.useMutation();
  const submitForReviewMutation = trpc.hrAnnualPlan.submitForReview.useMutation();
  const completeReviewMutation = trpc.hrAnnualPlan.completeReview.useMutation();
  const approveMutation = trpc.hrAnnualPlan.approve.useMutation();
  const rejectMutation = trpc.hrAnnualPlan.reject.useMutation();
  const revertToDraftMutation = trpc.hrAnnualPlan.revertToDraft.useMutation();
  const deleteMutation = trpc.hrAnnualPlan.delete.useMutation();

  return {
    plans: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    submitForReview: submitForReviewMutation.mutateAsync,
    completeReview: completeReviewMutation.mutateAsync,
    approve: approveMutation.mutateAsync,
    reject: rejectMutation.mutateAsync,
    revertToDraft: revertToDraftMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
  };
}

export function useHRAnnualPlan(id: number) {
  return trpc.hrAnnualPlan.getById.useQuery({ id });
}

export function useHRAnnualPlanByYear(organizationId: number, planYear: number) {
  return trpc.hrAnnualPlan.getByYear.useQuery({ organizationId, planYear });
}

export function useHRAnnualPlanStatistics(organizationId: number) {
  return trpc.hrAnnualPlan.getStatistics.useQuery({ organizationId });
}

/**
 * Hook for HR documents operations
 */
export function useHRDocuments(organizationId: number, options?: {
  employeeId?: number;
  documentType?: "policy" | "template" | "form" | "contract" | "certificate" | "id_document" | "other";
  category?: string;
  status?: "draft" | "active" | "archived" | "expired";
  search?: string;
}) {
  const query = trpc.hrDocuments.getAll.useQuery({
    organizationId,
    employeeId: options?.employeeId,
    documentType: options?.documentType,
    category: options?.category,
    status: options?.status,
    search: options?.search,
  });

  const createMutation = trpc.hrDocuments.create.useMutation();
  const updateMutation = trpc.hrDocuments.update.useMutation();
  const archiveMutation = trpc.hrDocuments.archive.useMutation();
  const deleteMutation = trpc.hrDocuments.delete.useMutation();
  const restoreMutation = trpc.hrDocuments.restore.useMutation();

  return {
    documents: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    archive: archiveMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
  };
}

export function useHRDocument(id: number) {
  return trpc.hrDocuments.getById.useQuery({ id });
}

export function useHRDocumentsByEmployee(organizationId: number, employeeId: number) {
  return trpc.hrDocuments.getByEmployee.useQuery({ organizationId, employeeId });
}

export function useHRDocumentsStatistics(organizationId: number) {
  return trpc.hrDocuments.getStatistics.useQuery({ organizationId });
}

/**
 * Hook for recruitment job operations
 */
export function useHRRecruitmentJobs(organizationId: number, options?: {
  status?: "draft" | "open" | "on_hold" | "closed" | "filled" | "cancelled";
  department?: string;
}) {
  const query = trpc.hrRecruitment.getAllJobs.useQuery({
    organizationId,
    status: options?.status,
    department: options?.department,
  });

  const createMutation = trpc.hrRecruitment.createJob.useMutation();
  const updateMutation = trpc.hrRecruitment.updateJob.useMutation();
  const publishMutation = trpc.hrRecruitment.publishJob.useMutation();
  const closeMutation = trpc.hrRecruitment.closeJob.useMutation();
  const deleteMutation = trpc.hrRecruitment.deleteJob.useMutation();

  return {
    jobs: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    publish: publishMutation.mutateAsync,
    close: closeMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
  };
}

export function useHRRecruitmentJob(id: number) {
  return trpc.hrRecruitment.getJobById.useQuery({ id });
}

export function useHRRecruitmentJobStatistics(organizationId: number) {
  return trpc.hrRecruitment.getJobStatistics.useQuery({ organizationId });
}

/**
 * Hook for recruitment candidate operations
 */
export function useHRRecruitmentCandidates(organizationId: number, options?: {
  jobId?: number;
  status?: "applied" | "screening" | "shortlisted" | "interview_scheduled" | "interviewed" | "offered" | "hired" | "rejected" | "withdrawn";
}) {
  const query = trpc.hrRecruitment.getAllCandidates.useQuery({
    organizationId,
    jobId: options?.jobId,
    status: options?.status,
  });

  const createMutation = trpc.hrRecruitment.createCandidate.useMutation();
  const updateMutation = trpc.hrRecruitment.updateCandidate.useMutation();
  const updateStatusMutation = trpc.hrRecruitment.updateCandidateStatus.useMutation();
  const deleteMutation = trpc.hrRecruitment.deleteCandidate.useMutation();

  return {
    candidates: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
  };
}

export function useHRRecruitmentCandidate(id: number) {
  return trpc.hrRecruitment.getCandidateById.useQuery({ id });
}

export function useHRRecruitmentCandidateStatistics(organizationId: number, jobId?: number) {
  return trpc.hrRecruitment.getCandidateStatistics.useQuery({ organizationId, jobId });
}
