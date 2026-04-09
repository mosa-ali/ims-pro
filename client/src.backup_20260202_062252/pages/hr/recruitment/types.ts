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
export type VacancyStatus = 'Draft' | 'Open' | 'Closed' | 'Archived';

export interface Vacancy {
  id: string;
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
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================================================
// VACANCY CRITERIA (SCORING ENGINE)
// ============================================================================

export type CriteriaType = 'YesNo' | 'Numeric' | 'Scale' | 'Checklist';

export interface VacancyCriteria {
  id: string;
  vacancyId: string;
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

export type CandidateSource = 'Advertisement' | 'Referral' | 'Database';
export type ShortlistStatus = 'Eligible' | 'Not Eligible' | 'Manual Override';
export type CandidateStatus = 'Applied' | 'Shortlisted' | 'Interviewed' | 'Selected' | 'Rejected' | 'Hired';

export interface Candidate {
  id: string;
  vacancyId: string;
  vacancyRef: string;
  positionTitle: string;
  
  // Personal Information
  fullName: string;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  nationality: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  currentLocation: string;
  
  // Education & Experience
  educationLevel: string;
  fieldOfStudy: string;
  yearsOfExperience: number;
  currentEmployer?: string;
  currentPosition?: string;
  
  // Application metadata
  source: CandidateSource;
  submissionDate: string;
  
  // Scoring & Status
  autoScorePercentage: number;
  scoreBreakdown?: CandidateScoreBreakdown[];
  shortlistStatus: ShortlistStatus;
  finalStatus: CandidateStatus;
  
  // Manual override
  manualOverride?: boolean;
  overrideReason?: string;
  overrideBy?: string;
  overrideDate?: string;
  
  createdAt: string;
  updatedAt?: string;
}

export interface CandidateScoreBreakdown {
  criteriaId: string;
  criteriaName: string;
  maxScore: number;
  scoreAwarded: number;
  response: string;
}

// ============================================================================
// CANDIDATE CRITERIA RESPONSES
// ============================================================================

export interface CandidateCriteriaResponse {
  id: string;
  candidateId: string;
  criteriaId: string;
  responseValue: string | number | boolean | string[];
  scoreAwarded: number;
}

// ============================================================================
// CANDIDATE DOCUMENTS
// ============================================================================

export type CandidateDocumentType = 'CV' | 'Cover Letter' | 'Certificate' | 'Other';

export interface CandidateDocument {
  id: string;
  candidateId: string;
  documentType: CandidateDocumentType;
  fileName: string;
  fileData: string; // base64 for localStorage
  uploadedAt: string;
}

// ============================================================================
// INTERVIEW TYPES
// ============================================================================

export type InterviewType = 'Phone Screening' | 'Technical Interview' | 'Panel Interview' | 'Final Interview';

export interface Interview {
  id: string;
  candidateId: string;
  vacancyId: string;
  interviewDate: string;
  interviewType: InterviewType;
  panelMembers: string[];
  overallScore?: number;
  recommendation?: string;
  notes?: string;
  evaluationFile?: string; // base64
  evaluationFileName?: string;
  conductedBy: string;
  createdAt: string;
}

// ============================================================================
// HIRING DECISION
// ============================================================================

export type HiringDecisionStatus = 'Pending' | 'Approved' | 'Rejected';

export interface HiringDecision {
  id: string;
  candidateId: string;
  vacancyId: string;
  
  // Proposed terms
  proposedGrade: string;
  proposedStep?: string;
  proposedSalary: number;
  contractType: string;
  startDate: string;
  
  // Decision
  decisionStatus: HiringDecisionStatus;
  approvedBy?: string;
  decisionDate?: string;
  decisionNotes?: string;
  
  // Offer letter
  offerLetterGenerated: boolean;
  offerLetterDate?: string;
  offerAccepted?: boolean;
  acceptanceDate?: string;
  
  // Auto-creation flags
  staffRecordCreated: boolean;
  staffRecordId?: string;
  employeeProfileCreated: boolean;
  
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================================================
// APPLICATION FORM DATA (PUBLIC SUBMISSION)
// ============================================================================

export interface ApplicationFormData {
  // Vacancy (read-only)
  vacancyId: string;
  vacancyRef: string;
  positionTitle: string;
  
  // Personal Information
  fullName: string;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  nationality: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  currentLocation: string;
  
  // Education & Experience
  educationLevel: string;
  fieldOfStudy: string;
  yearsOfExperience: number;
  currentEmployer?: string;
  currentPosition?: string;
  
  // Dynamic criteria responses
  criteriaResponses: Record<string, any>;
  
  // Declaration
  declarationAccepted: boolean;
}

// ============================================================================
// RECRUITMENT DASHBOARD KPIs
// ============================================================================

export interface RecruitmentKPIs {
  openVacancies: number;
  candidatesInPipeline: number;
  interviewsScheduled: number;
  positionsFilled: number;
  averageTimeToHire: number; // in days
}

// ============================================================================
// EXCEL EXPORT TYPES
// ============================================================================

export interface LongListExportData {
  candidateName: string;
  email: string;
  phone: string;
  nationality: string;
  educationLevel: string;
  yearsOfExperience: number;
  autoScore: number;
  shortlistStatus: string;
  submissionDate: string;
  scoreBreakdown: string;
}

export interface ShortListExportData extends LongListExportData {
  interviewDate?: string;
  interviewScore?: number;
  recommendation?: string;
}
