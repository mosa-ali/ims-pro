// ============================================================================
// CASE MANAGEMENT TYPES
// Individual-level protection and psychosocial support (PSS)
// ============================================================================

export type RiskLevel = 'low' | 'medium' | 'high';
export type CaseStatus = 'open' | 'ongoing' | 'closed';
export type CaseType = 'pss' | 'cp' | 'gbv' | 'protection';
export type SessionType = 'individual' | 'group';
export type PSSApproach = 'pfa' | 'structured_pss' | 'recreational' | 'expressive';
export type ReferralType = 'internal' | 'external';
export type ReferralStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ActivityType = 'awareness' | 'legal_counselling' | 'health_support' | 'livelihood';
export type CSSActivityType = 'recreational' | 'life_skills' | 'structured_pss';

// ============================================================================
// CASE RECORD (Core Entity)
// ============================================================================

export interface CaseRecord {
  id: number;
  projectId: number;
  caseCode: string; // CM-PRJ-0001
  beneficiaryCode: string; // Pseudonymized
  
  // Demographics (Limited - No PII)
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender: 'male' | 'female' | string;
  age: number;
  nationality?: string;
  idNumber?: string;
  hasDisability: boolean;
  location?: string;
  district?: string;
  community?: string;
  householdSize?: number;
  vulnerabilityCategory?: string;
  
  // Contact Information
  phoneNumber?: string;
  email?: string;
  address?: string;
  
  // Case Details
  caseType: CaseType | string;
  riskLevel: RiskLevel | string;
  status: CaseStatus | string;
  openedAt: string;
  closedAt?: string;
  referralSource?: string;
  intakeDate?: string;
  
  // Needs & Risk
  identifiedNeeds?: string;
  riskFactors?: string;
  immediateConcerns?: string;
  
  // Consent
  informedConsentObtained: boolean;
  consentDate?: string;
  
  // Assignment
  assignedPssOfficerId?: number;
  assignedCaseWorkerId?: number;
  assignedTo?: string;
  
  // Case Plan
  plannedInterventions?: string;
  responsiblePerson?: string;
  expectedOutcomes?: string;
  timeline?: string;
  reviewDate?: string;
  notes?: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy: number;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: number;
}

// ============================================================================
// PSS SESSIONS
// ============================================================================

export interface PSSSession {
  id: number;
  caseId: number;
  
  // Session Details
  sessionDate: string;
  sessionType: SessionType;
  pssApproach: PSSApproach;
  facilitatorId: number;
  duration: number; // minutes
  
  // Observations
  keyObservations?: string;
  beneficiaryResponse?: string;
  nextSessionDate?: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  isDeleted: boolean;
}

// ============================================================================
// CHILD SAFE SPACE (CSS)
// ============================================================================

export interface ChildSafeSpace {
  id: number;
  projectId: number;
  
  // CSS Profile
  cssName: string;
  cssCode: string;
  location: string;
  operatingPartner?: string;
  capacity: number; // children/day
  ageGroupsServed: string;
  genderSegregation: boolean;
  operatingDays: string;
  operatingHours: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  isDeleted: boolean;
}

export interface CSSActivity {
  id: number;
  cssId: number;
  
  // Activity Details
  activityType: CSSActivityType;
  activityDate: string;
  facilitatorId: number;
  participantsCount: number;
  maleCount?: number;
  femaleCount?: number;
  notes?: string;
  
  // Linkage
  linkedCaseId?: number;
  linkedIndicatorId?: number;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  isDeleted: boolean;
}

// ============================================================================
// REFERRALS (CRITICAL)
// ============================================================================

export interface CaseReferral {
  id: number;
  caseId: number;
  
  // Referral Details
  referralDate: string;
  referralType: ReferralType;
  serviceRequired: string;
  receivingOrganization: string;
  focalPoint?: string;
  focalPointContact?: string;
  
  // Status
  status: ReferralStatus;
  followUpDate?: string;
  feedbackReceived: boolean;
  feedbackNotes?: string;
  
  // Consent
  consentObtained: boolean;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  isDeleted: boolean;
}

// ============================================================================
// ACTIVITIES & SERVICES
// ============================================================================

export interface CaseActivity {
  id: number;
  caseId: number;
  
  // Activity Details
  activityType: ActivityType;
  activityDate: string;
  provider: string;
  notes?: string;
  
  // Linkage
  linkedIndicatorId?: number;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  isDeleted: boolean;
}

// ============================================================================
// CASE MANAGEMENT KPIs
// ============================================================================

export interface CaseManagementKPIs {
  totalActiveCases: number;
  newCasesThisMonth: number;
  closedCases: number;
  highRiskCases: number;
  pendingReferrals: number;
  followUpsDue: number;
  
  // PSS
  totalPSSSessions: number;
  individualSessions: number;
  groupSessions: number;
  
  // CSS
  activeCSSLocations: number;
  totalCSSActivities: number;
  childrenReached: number;
  
  // Referrals
  totalReferrals: number;
  completedReferrals: number;
  pendingFollowUps: number;
}

// ============================================================================
// AUTO REPORT TYPES
// ============================================================================

export interface CaseManagementReport {
  // Header
  projectName: string;
  donorName: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  generatedAt: string;
  generatedBy: string;
  
  // Executive Summary (Auto-narrative)
  executiveSummary: string;
  
  // Case Overview
  caseOverview: {
    totalCases: number;
    newCases: number;
    activeCases: number;
    closedCases: number;
    highRiskCases: number;
    averageCaseDuration: number;
  };
  
  // PSS Sessions
  pssSummary: {
    totalSessions: number;
    individualSessions: number;
    groupSessions: number;
    averageDuration: number;
    followUpsScheduled: number;
  };
  
  // CSS Activities
  cssSummary: {
    activeCSSLocations: number;
    totalActivities: number;
    childrenReached: number;
    averageChildrenPerSession: number;
    activitiesByType: Record<CSSActivityType, number>;
  };
  
  // Activities & Services
  activitiesSummary: {
    byType: Record<ActivityType, number>;
  };
  
  // Referrals
  referralsSummary: {
    totalReferrals: number;
    internalReferrals: number;
    externalReferrals: number;
    completedReferrals: number;
    pendingFollowUps: number;
  };
  
  // Risk & Protection
  riskSnapshot: {
    high: number;
    medium: number;
    low: number;
  };
  
  // Accountability
  auditTrail: {
    updatesThisPeriod: number;
    activeCaseWorkers: number;
    lastActivityDate: string;
  };
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface CaseFilters {
  gender?: 'male' | 'female';
  ageGroup?: string;
  riskLevel?: RiskLevel;
  status?: CaseStatus;
  caseType?: CaseType;
  assignedPssOfficerId?: number;
  assignedCaseWorkerId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReportFilters {
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  caseType?: CaseType;
  riskLevel?: RiskLevel;
  caseWorkerId?: number;
  cssLocationId?: number;
}