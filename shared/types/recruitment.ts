/**
 * ============================================================================
 * RECRUITMENT MODULE - TYPE DEFINITIONS
 * ============================================================================
 * 
 * Complete type system for end-to-end recruitment:
 * - Vacancy Management
 * - Candidate Management
 * - Interview & Evaluation
 * - Hiring Decisions
 * - Auto-scoring engine
 * 
 * ============================================================================
 */

// ============================================================================
// VACANCY TYPES
// ============================================================================

export type VacancyType = 'New' | 'Replacement';
export type VacancyStatus = 'Draft' | 'Open' | 'Closed' | 'Archived' | 'draft' | 'open' | 'on_hold' | 'closed' | 'filled' | 'cancelled';

export interface Vacancy {
  id: string | number;
  vacancyRef: string; // Auto-generated unique reference
  positionTitle: string;
  department: string;
  project?: string;
  dutyStation: string;
  contractType: string;
  grade?: string;
  vacancyType: VacancyType;
  justification: string;
  openingDate: string;
  closingDate: string;
  hiringManager: string;
  status: VacancyStatus;
  shortlistThreshold: number; // Default 60%
  numberOfPositions?: number;
  minSalary?: number;
  maxSalary?: number;
  proposedGrade?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: number | boolean;
}

// ============================================================================
// VACANCY CRITERIA (SCORING ENGINE)
// ============================================================================

export type CriteriaType = 'YesNo' | 'Numeric' | 'Scale' | 'Checklist';

export interface VacancyCriteria {
  id: string | number;
  vacancyId: string | number;
  criteriaName: string;
  criteriaType: CriteriaType;
  weightPercentage: number; // Must total 100% per vacancy
  required: boolean;
  options?: string[]; // For Checklist type
  minValue?: number; // For Numeric/Scale
  maxValue?: number; // For Numeric/Scale
  description?: string;
}

// ============================================================================
// CANDIDATE TYPES
// ============================================================================

export type CandidateSource = 'Advertisement' | 'Referral' | 'Database' | 'Internal';
export type ShortlistStatus = 'Eligible' | 'Not Eligible' | 'Manual Override';
export type CandidateStatus = 'Applied' | 'Shortlisted' | 'Interviewed' | 'Selected' | 'Rejected' | 'Hired' | 'applied' | 'screening' | 'shortlisted' | 'interview_scheduled' | 'interviewed' | 'offered' | 'hired' | 'rejected' | 'withdrawn';

export interface Candidate {
  id: string | number;
  vacancyId: string | number;
  vacancyRef: string;
  positionTitle: string;
  candidateRef?: string;
  
  // Personal Information
  fullName?: string;
  firstName?: string;
  lastName?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  nationality?: string;
  dateOfBirth?: string;
  email: string;
  phone: string;
  currentLocation?: string;
  
  // Education & Experience
  educationLevel?: string;
  fieldOfStudy?: string;
  yearsOfExperience?: number;
  currentEmployer?: string;
  currentPosition?: string;
  
  // Application metadata
  source: CandidateSource;
  submissionDate: string;
  appliedAt?: string;
  
  // Scoring & Status
  autoScorePercentage?: number;
  totalScore?: number;
  scoreBreakdown?: CandidateScoreBreakdown[];
  shortlistStatus?: ShortlistStatus;
  finalStatus?: CandidateStatus;
  status?: CandidateStatus;
  isShortlisted?: boolean;
  
  // Manual override
  manualOverride?: boolean;
  overrideReason?: string;
  overrideBy?: string;
  overrideDate?: string;
  
  createdAt: string;
  updatedAt?: string;
  isDeleted?: number | boolean;
}

export interface CandidateScoreBreakdown {
  criteriaId: string | number;
  criteriaName: string;
  maxScore: number;
  scoreAwarded: number;
  response: string;
  score?: number;
}

// ============================================================================
// CANDIDATE CRITERIA RESPONSES
// ============================================================================

export interface CandidateCriteriaResponse {
  id: string | number;
  candidateId: string | number;
  criteriaId: string | number;
  responseValue: string | number | boolean | string[];
  scoreAwarded: number;
  response?: string;
  score?: number;
}

// ============================================================================
// CANDIDATE DOCUMENTS
// ============================================================================

export type CandidateDocumentType = 'CV' | 'Cover Letter' | 'Certificate' | 'Other';

export interface CandidateDocument {
  id: string | number;
  candidateId: string | number;
  documentType: CandidateDocumentType;
  fileName: string;
  fileData?: string; // base64 for localStorage
  fileUrl?: string; // URL for database storage
  uploadedAt: string;
  isDeleted?: number | boolean;
}

// ============================================================================
// INTERVIEW TYPES
// ============================================================================

export type InterviewType = 'Phone' | 'Video' | 'In-Person' | 'Group';
export type InterviewStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'No-Show';

export interface Interview {
  id: string | number;
  candidateId: string | number;
  vacancyId: string | number;
  interviewType: InterviewType;
  interviewDate: string;
  interviewTime?: string;
  duration?: number; // in minutes
  location?: string;
  meetingLink?: string;
  panelMembers: string[];
  status: InterviewStatus;
  notes?: string;
  overallScore?: number;
  feedback?: string;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: number | boolean;
}

// ============================================================================
// HIRING DECISION TYPES
// ============================================================================

export type OfferStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Withdrawn';

export interface HiringDecision {
  id: string | number;
  candidateId: string | number;
  vacancyId: string | number;
  candidateName: string;
  positionTitle: string;
  
  // Offer Details
  offerStatus: OfferStatus;
  proposedSalary: number;
  proposedGrade?: string;
  contractType: string;
  startDate: string;
  
  // Terms
  benefits?: string[];
  probationPeriod?: number; // in months
  reportingTo?: string;
  
  // Approval
  approvedBy?: string;
  approvalDate?: string;
  approvalNotes?: string;
  
  // Auto-employee creation
  autoCreateEmployee: boolean;
  employeeId?: string | number;
  
  createdAt: string;
  updatedAt?: string;
  isDeleted?: number | boolean;
}

// ============================================================================
// APPLICATION FORM DATA
// ============================================================================

export interface ApplicationFormData {
  vacancyId: string | number;
  candidateName: string;
  email: string;
  phone: string;
  currentPosition?: string;
  yearsOfExperience: number;
  educationLevel: string;
  fieldOfStudy?: string;
  source: CandidateSource;
  criteriaResponses: {
    criteriaId: string | number;
    response: string | number | boolean | string[];
  }[];
  documents?: {
    type: CandidateDocumentType;
    file: File;
  }[];
}

// ============================================================================
// RECRUITMENT KPIs
// ============================================================================

export interface RecruitmentKPIs {
  openVacancies: number;
  candidatesInPipeline: number;
  interviewsScheduled: number;
  positionsFilled: number;
  averageTimeToHire: number;
  totalApplications?: number;
  shortlistedCandidates?: number;
  offersMade?: number;
  offersAccepted?: number;
  offersRejected?: number;
}

// ============================================================================
// RECRUITMENT DASHBOARD FILTERS
// ============================================================================

export interface RecruitmentFilters {
  status?: VacancyStatus;
  department?: string;
  candidateStatus?: CandidateStatus;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateVacancyInput {
  positionTitle: string;
  department: string;
  project?: string;
  dutyStation: string;
  contractType: string;
  grade?: string;
  vacancyType: VacancyType;
  justification: string;
  openingDate: string;
  closingDate: string;
  hiringManager: string;
  numberOfPositions?: number;
  minSalary?: number;
  maxSalary?: number;
  proposedGrade?: string;
  shortlistThreshold?: number;
}

export interface UpdateVacancyInput extends Partial<CreateVacancyInput> {
  id: string | number;
  status?: VacancyStatus;
}

export interface CreateCandidateInput {
  vacancyId: string | number;
  fullName: string;
  email: string;
  phone: string;
  currentPosition?: string;
  yearsOfExperience: number;
  educationLevel: string;
  fieldOfStudy?: string;
  source: CandidateSource;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  nationality?: string;
  dateOfBirth?: string;
  currentLocation?: string;
  currentEmployer?: string;
}

export interface UpdateCandidateInput extends Partial<CreateCandidateInput> {
  id: string | number;
  status?: CandidateStatus;
  manualOverride?: boolean;
  overrideReason?: string;
}

export interface CreateInterviewInput {
  candidateId: string | number;
  vacancyId: string | number;
  interviewType: InterviewType;
  interviewDate: string;
  interviewTime?: string;
  duration?: number;
  location?: string;
  meetingLink?: string;
  panelMembers: string[];
}

export interface CreateHiringDecisionInput {
  candidateId: string | number;
  vacancyId: string | number;
  proposedSalary: number;
  proposedGrade?: string;
  contractType: string;
  startDate: string;
  reportingTo?: string;
  probationPeriod?: number;
  benefits?: string[];
  autoCreateEmployee: boolean;
}
