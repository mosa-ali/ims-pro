/**
 * ============================================================================
 * RECRUITMENT CANONICAL TYPES
 * ============================================================================
 * 
 * Single source of truth for all recruitment-related types.
 * These types are derived directly from the database schema.
 * 
 * NO legacy fields. NO mock data structures.
 * Database-first approach.
 * 
 * ============================================================================
 */

// ============================================================================
// ENUMS - Database-backed status values
// ============================================================================

export enum JobEmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  CONSULTANT = 'consultant',
  INTERN = 'intern',
}

export enum JobStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  ON_HOLD = 'on_hold',
  CLOSED = 'closed',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
}

export enum CandidateSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  JOB_BOARD = 'job_board',
  LINKEDIN = 'linkedin',
  AGENCY = 'agency',
  OTHER = 'other',
}

export enum CandidateStatus {
  ALL = 'all',
  NEW = 'new',
  APPLIED = 'applied',
  SCREENING = 'screening',
  SHORTLISTED = 'shortlisted',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEWED = 'interviewed',
  OFFER_PENDING = 'offer_pending',
  OFFER_SENT = 'offer_sent',
  OFFERED = 'offered',
  HIRED = 'hired',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export enum InterviewType {
  PHONE = 'phone',
  VIDEO = 'video',
  IN_PERSON = 'in_person',
  GROUP = 'group',
  TECHNICAL = 'technical',
  FINAL = 'final',
}

export enum InterviewStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
  NO_SHOW = 'no_show',
}

export enum OfferStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  WITHDRAWN = 'withdrawn',
}

// ============================================================================
// ENTITY TYPES - Direct mapping to database tables
// ============================================================================

/**
 * RecruitmentJob - hr_recruitment_jobs table
 * Represents a job posting/vacancy
 */
export interface RecruitmentJob {
  id: number;
  organizationId: number;
  operatingUnitId: number | null;
  jobCode?: string | null;
  jobTitle: string;
  jobTitleAr?: string;
  department?: string;
  employmentType: JobEmploymentType;
  numberOfPositions: number;
  gradeLevel?: string;
  salaryRange?: string;
  description?: string;
  requirements?: string;
  responsibilities?: string;
  benefits?: string;
  location?: string;
  isRemote: boolean;
  openings: number;
  postingDate?: string;
  closingDate?: string;
  status: JobStatus;
  hiringManager?: string;
  vacancyType?: string;
  shortlistThreshold?: number;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * RecruitmentCandidate - hr_recruitment_candidates table
 * Represents a job applicant
 */
export interface RecruitmentCandidate {
  id: number;
  organizationId: number;
  jobId: number;
  candidateRef?: string;
  appliedAt?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  resumeUrl?: string;
  coverLetterUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  education?: string;
  experience?: string;
  skills?: string;
  noInterviews?: string;
  noDecision?: string;
  source: CandidateSource;
  referredBy?: string;
  rating?: number;
  evaluationNotes?: string;
  interviewDate?: string;
  interviewNotes?: string;
  interviewers?: string;
  status: CandidateStatus;
  rejectionReason?: string;
  offerDate?: string;
  offerSalary?: string;
  offerAccepted?: boolean;
  acceptanceDate?: string;
  startDate?: string;
  notes?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * RecruitmentInterview - hr_recruitment_interviews table
 * Represents an interview session
 */
export interface RecruitmentInterview {
  id: number;
  organizationId: number;
  candidateId: number;
  jobId: number;
  interviewType: InterviewType;
  scheduledDate?: string;
  scheduledTime?: string;
  interviewers?: string;
  location?: string;
  notes?: string;
  rating?: number;
  feedback?: string;
  status: InterviewStatus;
  completedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * RecruitmentHiringDecision - hr_recruitment_hiring_decisions table
 * Represents a hiring decision/offer
 */
export interface RecruitmentHiringDecision {
  id: number;
  organizationId: number;
  candidateId: number;
  jobId: number;
  status: OfferStatus;
  offerSalary?: string;
  startDate?: string;
  notes?: string;
  approvedBy?: number;
  approvedAt?: string;
  rejectedBy?: number;
  rejectedAt?: string;
  rejectionReason?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * RecruitmentAuditLog - hr_recruitment_audit_log table
 * Audit trail for all recruitment operations
 */
export interface RecruitmentAuditLog {
  id: number;
  organizationId: number;
  entityType: string;
  entityId: number;
  action: string;
  changes?: string;
  changedBy?: number;
  createdAt: string;
}

// ============================================================================
// INPUT TYPES - For mutations (create/update)
// ============================================================================

export interface CreateJobInput {
  jobTitle: string;
  jobTitleAr?: string;
  department?: string;
  employmentType?: JobEmploymentType;
  numberOfPositions?: number;
  gradeLevel?: string;
  salaryRange?: string;
  description?: string;
  requirements?: string;
  responsibilities?: string;
  benefits?: string;
  location?: string;
  isRemote?: boolean;
  openings?: number;
  postingDate?: string;
  closingDate?: string;
  status?: JobStatus;
  hiringManager?: string;
  vacancyType?: string;
  shortlistThreshold?: number;
}

export interface UpdateJobInput {
  id: number;
  jobTitle?: string;
  jobTitleAr?: string;
  department?: string;
  employmentType?: JobEmploymentType;
  numberOfPositions?: number;
  gradeLevel?: string;
  salaryRange?: string;
  description?: string;
  requirements?: string;
  responsibilities?: string;
  benefits?: string;
  location?: string;
  isRemote?: boolean;
  openings?: number;
  postingDate?: string;
  closingDate?: string;
  status?: JobStatus;
  hiringManager?: string;
  vacancyType?: string;
  shortlistThreshold?: number;
}

export interface CreateCandidateInput {
  jobId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  coverLetterUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  education?: string;
  experience?: string;
  skills?: string;
  source?: CandidateSource;
  referredBy?: string;
  notes?: string;
}

export interface UpdateCandidateInput {
  id: number;
  status?: CandidateStatus;
  rating?: number;
  evaluationNotes?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface CreateInterviewInput {
  candidateId: number;
  jobId: number;
  interviewType: InterviewType;
  scheduledDate?: string;
  scheduledTime?: string;
  interviewers?: string;
  location?: string;
  notes?: string;
}

export interface UpdateInterviewInput {
  id: number;
  status?: InterviewStatus;
  rating?: number;
  feedback?: string;
  notes?: string;
}

export interface CreateHiringDecisionInput {
  candidateId: number;
  jobId: number;
  offerSalary?: string;
  startDate?: string;
  notes?: string;
  status?: OfferStatus;
}

export interface UpdateHiringDecisionInput {
  id: number;
  offerSalary?: string;
  startDate?: string;
  notes?: string;
  status?: OfferStatus;
}

// ============================================================================
// RESPONSE TYPES - For queries
// ============================================================================

export interface JobListResponse {
  data: RecruitmentJob[];
  total: number;
  page: number;
  limit: number;
}

export interface CandidateListResponse {
  data: RecruitmentCandidate[];
  total: number;
  page: number;
  limit: number;
}

export interface InterviewListResponse {
  data: RecruitmentInterview[];
  total: number;
}

export interface HiringDecisionListResponse {
  data: RecruitmentHiringDecision[];
  total: number;
}

// ============================================================================
// FILTER TYPES - For advanced queries
// ============================================================================

export interface JobFilterInput {
  status?: JobStatus;
  department?: string;
  employmentType?: JobEmploymentType;
  isRemote?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CandidateFilterInput {
  jobId?: number;
  status?: CandidateStatus;
  source?: CandidateSource;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface InterviewFilterInput {
  candidateId?: number;
  jobId?: number;
  status?: InterviewStatus;
  interviewType?: InterviewType;
}

export interface HiringDecisionFilterInput {
  candidateId?: number;
  jobId?: number;
  status?: OfferStatus;
}

// ============================================================================
// UTILITY TYPES - For joined/enriched data
// ============================================================================

/**
 * CandidateWithJob - Candidate data joined with job details
 */
export interface CandidateWithJob extends RecruitmentCandidate {
  job?: RecruitmentJob;
}

/**
 * InterviewWithDetails - Interview data with candidate and job details
 */
export interface InterviewWithDetails extends RecruitmentInterview {
  candidate?: RecruitmentCandidate;
  job?: RecruitmentJob;
}

/**
 * HiringDecisionWithDetails - Hiring decision with candidate and job details
 */
export interface HiringDecisionWithDetails extends RecruitmentHiringDecision {
  candidate?: RecruitmentCandidate;
  job?: RecruitmentJob;
}

/**
 * RecruitmentKPIs - Key performance indicators
 */
export interface RecruitmentKPIs {
  totalOpenVacancies: number;
  totalCandidatesInPipeline: number;
  interviewsScheduled: number;
  positionsFilled: number;
  averageTimeToHire: number;
  offerAcceptanceRate: number;
  topRecruitmentSources: Array<{
    source: CandidateSource;
    count: number;
  }>;
}

// ============================================================================
// CONSTANTS - Status mappings and display values
// ============================================================================

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  [JobStatus.DRAFT]: 'Draft',
  [JobStatus.OPEN]: 'Open',
  [JobStatus.ON_HOLD]: 'On Hold',
  [JobStatus.CLOSED]: 'Closed',
  [JobStatus.FILLED]: 'Filled',
  [JobStatus.CANCELLED]: 'Cancelled',
};

export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  [CandidateStatus.ALL]: 'All',
  [CandidateStatus.NEW]: 'New',
  [CandidateStatus.APPLIED]: 'Applied',
  [CandidateStatus.SCREENING]: 'Screening',
  [CandidateStatus.SHORTLISTED]: 'Shortlisted',
  [CandidateStatus.INTERVIEW_SCHEDULED]: 'Interview Scheduled',
  [CandidateStatus.INTERVIEWED]: 'Interviewed',
  [CandidateStatus.OFFER_PENDING]: 'Offer Pending',
  [CandidateStatus.OFFER_SENT]: 'Offer Sent',
  [CandidateStatus.OFFERED]: 'Offered',
  [CandidateStatus.HIRED]: 'Hired',
  [CandidateStatus.REJECTED]: 'Rejected',
  [CandidateStatus.WITHDRAWN]: 'Withdrawn',
};

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  [InterviewStatus.SCHEDULED]: 'Scheduled',
  [InterviewStatus.COMPLETED]: 'Completed',
  [InterviewStatus.CANCELLED]: 'Cancelled',
  [InterviewStatus.RESCHEDULED]: 'Rescheduled',
  [InterviewStatus.NO_SHOW]: 'No Show',
};

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  [OfferStatus.PENDING]: 'Pending',
  [OfferStatus.APPROVED]: 'Approved',
  [OfferStatus.REJECTED]: 'Rejected',
  [OfferStatus.ACCEPTED]: 'Accepted',
  [OfferStatus.DECLINED]: 'Declined',
  [OfferStatus.WITHDRAWN]: 'Withdrawn',
};

// ============================================================================
// TYPE GUARDS - Runtime type checking
// ============================================================================

export function isRecruitmentJob(obj: any): obj is RecruitmentJob {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'number' &&
    typeof obj.jobTitle === 'string' &&
    typeof obj.organizationId === 'number'
  );
}

export function isRecruitmentCandidate(obj: any): obj is RecruitmentCandidate {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'number' &&
    typeof obj.firstName === 'string' &&
    typeof obj.lastName === 'string' &&
    typeof obj.email === 'string'
  );
}

export function isRecruitmentInterview(obj: any): obj is RecruitmentInterview {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'number' &&
    typeof obj.candidateId === 'number' &&
    typeof obj.jobId === 'number'
  );
}

export function isRecruitmentHiringDecision(obj: any): obj is RecruitmentHiringDecision {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'number' &&
    typeof obj.candidateId === 'number' &&
    typeof obj.jobId === 'number'
  );
}
