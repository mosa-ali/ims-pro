// ============================================================================
// DATABASE TYPES - Integrated Management System (IMS)
// ============================================================================

// ----------------------------------------------------------------------------
// ENUMS
// ----------------------------------------------------------------------------

export enum OrganizationType {
 NGO = 'ngo',
 INGO = 'ingo',
 UN = 'un',
 GOVERNMENT = 'government'
}

export enum UserRole {
 SUPER_ADMIN = 'super_admin',
 ORG_ADMIN = 'org_admin',
 PROGRAM_MANAGER = 'program_manager',
 FINANCE_OFFICER = 'finance_officer',
 MEAL_OFFICER = 'meal_officer',
 FIELD_WORKER = 'field_worker',
 VIEWER = 'viewer'
}

export enum DonorType {
 BILATERAL = 'bilateral',
 MULTILATERAL = 'multilateral',
 FOUNDATION = 'foundation',
 CORPORATE = 'corporate',
 INDIVIDUAL = 'individual'
}

export enum GrantStatus {
 DRAFT = 'draft',
 SUBMITTED = 'submitted',
 UNDER_REVIEW = 'under_review',
 APPROVED = 'approved',
 REJECTED = 'rejected',
 ACTIVE = 'active',
 COMPLETED = 'completed',
 CLOSED = 'closed'
}

export enum ProjectStatus {
 PLANNING = 'planning',
 ACTIVE = 'active',
 ON_HOLD = 'on_hold',
 COMPLETED = 'completed',
 CLOSED = 'closed'
}

export enum ActivityStatus {
 PLANNED = 'planned',
 IN_PROGRESS = 'in_progress',
 COMPLETED = 'completed',
 CANCELLED = 'cancelled'
}

export enum BudgetCategory {
 PERSONNEL = 'personnel',
 EQUIPMENT = 'equipment',
 TRAVEL = 'travel',
 OPERATIONS = 'operations',
 BENEFICIARY_ASSISTANCE = 'beneficiary_assistance',
 OVERHEAD = 'overhead'
}

export enum ExpenseStatus {
 DRAFT = 'draft',
 SUBMITTED = 'submitted',
 APPROVED = 'approved',
 REJECTED = 'rejected',
 PAID = 'paid'
}

export enum IndicatorType {
 OUTPUT = 'output',
 OUTCOME = 'outcome',
 IMPACT = 'impact'
}

export enum CaseType {
 INDIVIDUAL = 'individual',
 HOUSEHOLD = 'household',
 GROUP = 'group'
}

export enum CaseStatus {
 ACTIVE = 'active',
 CLOSED = 'closed',
 REFERRED = 'referred',
 SUSPENDED = 'suspended'
}

export enum Gender {
 MALE = 'male',
 FEMALE = 'female',
 OTHER = 'other',
 PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

export enum SurveyType {
 NEEDS_ASSESSMENT = 'needs_assessment',
 SATISFACTION = 'satisfaction',
 IMPACT = 'impact',
 REGISTRATION = 'registration',
 MONITORING = 'monitoring'
}

export enum SurveyStatus {
 DRAFT = 'draft',
 ACTIVE = 'active',
 CLOSED = 'closed',
 ARCHIVED = 'archived'
}

export enum QuestionType {
 TEXT = 'text',
 NUMBER = 'number',
 SINGLE_CHOICE = 'single_choice',
 MULTIPLE_CHOICE = 'multiple_choice',
 RATING = 'rating',
 DATE = 'date',
 YES_NO = 'yes_no'
}

export enum DocumentType {
 PROPOSAL = 'proposal',
 CONTRACT = 'contract',
 REPORT = 'report',
 INVOICE = 'invoice',
 RECEIPT = 'receipt',
 PHOTO = 'photo',
 ASSESSMENT = 'assessment',
 MOU = 'mou',
 OTHER = 'other'
}

// NEW: Project Sectors Enum
export enum ProjectSectorType {
 WASH = 'WASH',
 EFSL = 'EFSL',
 LIVELIHOOD = 'Livelihood',
 CHILD_PROTECTION = 'Child Protection',
 PROTECTION = 'Protection',
 EDUCATION_IN_EMERGENCY = 'Education in Emergency',
 HEALTH = 'Health'
}

// ----------------------------------------------------------------------------
// BASE TYPES
// ----------------------------------------------------------------------------

export interface BaseEntity {
 id: string;
 createdAt: string;
 updatedAt: string;
 deletedAt: string | null;
}

export interface OrganizationScoped {
 organizationId: string;
}

export interface UserTracked {
 createdBy: string;
 updatedBy?: string;
}

// ----------------------------------------------------------------------------
// SYSTEM TABLES
// ----------------------------------------------------------------------------

export interface Organization extends BaseEntity {
 name: string;
 nameAr?: string;
 organizationType: OrganizationType;
 country: string;
 email: string;
 phone: string;
 address: string;
 logo?: string;
 settings: {
 currency: string;
 language: string;
 fiscalYearStart: string;
 };
 isActive: boolean;
}

export interface User extends BaseEntity, OrganizationScoped {
 email: string;
 passwordHash: string;
 firstName: string;
 lastName: string;
 role: UserRole;
 permissions: string[];
 phone?: string;
 position?: string;
 language: string;
 avatar?: string;
 isActive: boolean;
 lastLoginAt?: string;
}

export interface AuditLog {
 id: string;
 organizationId: string;
 userId: string;
 action: string;
 entityType: string;
 entityId: string;
 changes: {
 before?: Record<string, any>;
 after?: Record<string, any>;
 };
 ipAddress?: string;
 userAgent?: string;
 timestamp: string;
}

// ----------------------------------------------------------------------------
// GRANT MANAGEMENT
// ----------------------------------------------------------------------------

export interface Donor extends BaseEntity, OrganizationScoped, UserTracked {
 name: string;
 nameAr?: string;
 donorType: DonorType;
 country: string;
 contactPerson?: string;
 email?: string;
 phone?: string;
 website?: string;
 notes?: string;
 isActive: boolean;
}

export interface Grant extends BaseEntity, OrganizationScoped, UserTracked {
 donorId: string;
 grantNumber: string;
 title: string;
 titleAr?: string;
 description?: string;
 totalBudget: number;
 currency: string;
 startDate: string;
 endDate: string;
 applicationDate?: string;
 approvalDate?: string;
 status: GrantStatus;
 sector: string[];
 targetCountries: string[];
 targetBeneficiaries?: number;
 contractDocument?: string;
 notes?: string;
}

// ----------------------------------------------------------------------------
// PROJECT MANAGEMENT
// ----------------------------------------------------------------------------

export interface ProjectSector {
 id: string;
 name: string;
 nameAr?: string;
 description?: string;
}

export interface Project extends BaseEntity, OrganizationScoped, UserTracked {
 grantId?: string;
 projectCode: string;
 title: string;
 titleAr?: string;
 description?: string;
 budget: number;
 currency: string;
 startDate: string;
 endDate: string;
 status: ProjectStatus;
 completionPercentage: number;
 sector: string[]; // Legacy field - deprecated in favor of project_sectors
 project_sectors: ProjectSectorType[]; // NEW: Multi-select project sectors
 location: {
 country: string;
 governorate?: string;
 district?: string;
 };
 targetBeneficiaries?: number;
 projectManager?: string;
 objectives?: string[];
 expectedOutcomes?: string[];
 risks?: string;
 notes?: string;
}

export interface ProjectActivity extends BaseEntity, OrganizationScoped, UserTracked {
 projectId: string;
 title: string;
 description?: string;
 activityType: string;
 plannedStartDate?: string;
 plannedEndDate?: string;
 actualStartDate?: string;
 actualEndDate?: string;
 status: ActivityStatus;
 completionPercentage: number;
 budget?: number;
 assignedTo?: string;
 targetBeneficiaries?: number;
 actualBeneficiaries?: number;
 deliverables?: string[];
}

export interface ProjectTeamMember {
 id: string;
 projectId: string;
 userId: string;
 role: string;
 responsibilities?: string;
 startDate: string;
 endDate?: string;
 isActive: boolean;
 createdAt: string;
 updatedAt: string;
}

// ----------------------------------------------------------------------------
// FINANCE
// ----------------------------------------------------------------------------

export interface BudgetLine extends BaseEntity, OrganizationScoped, UserTracked {
 grantId: string;
 category: BudgetCategory;
 subcategory?: string;
 description?: string;
 budgetAmount: number;
 currency: string;
 isRestricted: boolean;
 restrictions?: string;
}

export interface BudgetAllocation extends BaseEntity, OrganizationScoped, UserTracked {
 projectId: string;
 budgetLineId: string;
 allocatedAmount: number;
 allocationDate: string;
 notes?: string;
}

export interface Expense extends BaseEntity, OrganizationScoped, UserTracked {
 projectId: string;
 budgetLineId?: string;
 expenseNumber: string;
 description: string;
 category: string;
 amount: number;
 currency: string;
 exchangeRate?: number;
 expenseDate: string;
 vendor?: string;
 invoiceNumber?: string;
 paymentMethod?: string;
 status: ExpenseStatus;
 approvedBy?: string;
 approvedAt?: string;
 receiptUrl?: string;
 invoiceUrl?: string;
 notes?: string;
}

// ----------------------------------------------------------------------------
// MEAL
// ----------------------------------------------------------------------------

export interface Indicator extends BaseEntity, OrganizationScoped, UserTracked {
 projectId: string;
 grantId?: string;
 code: string;
 name: string;
 nameAr?: string;
 description?: string;
 indicatorType: IndicatorType;
 sector?: string;
 category: string;
 unit: string;
 baseline?: number;
 target: number;
 disaggregation?: {
 [key: string]: string[];
 };
 dataSource?: string;
 collectionFrequency?: string;
 responsiblePerson?: string;
 isActive: boolean;
}

export interface IndicatorMilestone {
 id: string;
 indicatorId: string;
 milestoneDate: string;
 targetValue: number;
 description?: string;
 createdAt: string;
 updatedAt: string;
}

export interface IndicatorAchievement extends BaseEntity, OrganizationScoped {
 indicatorId: string;
 reportingPeriod: string;
 periodType: string;
 achievedValue: number;
 disaggregatedData?: {
 [key: string]: number;
 };
 varianceFromTarget?: number;
 variancePercentage?: number;
 dataSource?: string;
 verificationMethod?: string;
 challenges?: string;
 notes?: string;
 reportedBy: string;
 verifiedBy?: string;
 reportedAt: string;
}

// ----------------------------------------------------------------------------
// CASE MANAGEMENT
// ----------------------------------------------------------------------------

export interface Case extends BaseEntity, OrganizationScoped, UserTracked {
 projectId?: string;
 caseNumber: string;
 caseType: CaseType;
 firstName: string;
 lastName: string;
 fatherName?: string;
 dateOfBirth?: string;
 age?: number;
 gender?: Gender;
 nationality?: string;
 idType?: string;
 idNumber?: string;
 phone?: string;
 email?: string;
 alternatePhone?: string;
 country: string;
 governorate?: string;
 district?: string;
 address?: string;
 gpsCoordinates?: {
 lat: number;
 lng: number;
 };
 householdSize?: number;
 childrenCount?: number;
 femaleHeadedHousehold?: boolean;
 vulnerabilityStatus?: string[];
 disabilityType?: string[];
 status: CaseStatus;
 registrationDate: string;
 caseWorker?: string;
 referralSource?: string;
 servicesReceived?: string[];
 consentGiven: boolean;
 consentDate?: string;
 photoConsentGiven?: boolean;
 notes?: string;
}

export interface HouseholdMember {
 id: string;
 caseId: string;
 firstName: string;
 lastName: string;
 relationship: string;
 dateOfBirth?: string;
 age?: number;
 gender?: Gender;
 nationality?: string;
 idType?: string;
 idNumber?: string;
 educationLevel?: string;
 employmentStatus?: string;
 hasDisability: boolean;
 disabilityType?: string[];
 createdAt: string;
 updatedAt: string;
}

export interface CaseActivity extends BaseEntity, OrganizationScoped, UserTracked {
 caseId: string;
 activityType: string;
 activityDate: string;
 description?: string;
 outcome?: string;
 serviceProvided?: string;
 assistanceAmount?: number;
 conductedBy: string;
 location?: string;
 attachments?: string[];
}

// ----------------------------------------------------------------------------
// SURVEY MANAGEMENT
// ----------------------------------------------------------------------------

export interface Survey extends BaseEntity, OrganizationScoped, UserTracked {
 projectId?: string;
 title: string;
 titleAr?: string;
 description?: string;
 surveyType: SurveyType;
 isAnonymous: boolean;
 allowMultipleResponses: boolean;
 language: string[];
 startDate?: string;
 endDate?: string;
 status: SurveyStatus;
 targetRespondents?: number;
 actualResponses: number;
}

export interface SurveyQuestion {
 id: string;
 surveyId: string;
 questionText: string;
 questionTextAr?: string;
 questionType: QuestionType;
 options?: Array<{
 value: string;
 label: string;
 labelAr?: string;
 }>;
 isRequired: boolean;
 minValue?: number;
 maxValue?: number;
 orderIndex: number;
 section?: string;
 helpText?: string;
 createdAt: string;
 updatedAt: string;
}

export interface SurveyResponse extends BaseEntity, OrganizationScoped {
 surveyId: string;
 caseId?: string;
 respondentName?: string;
 respondentContact?: string;
 submittedAt: string;
 submittedBy?: string;
 language: string;
 location?: Record<string, any>;
 device?: string;
}

export interface SurveyAnswer {
 id: string;
 responseId: string;
 questionId: string;
 answerText?: string;
 answerNumber?: number;
 answerDate?: string;
 answerChoice?: string[];
 createdAt: string;
}

// ----------------------------------------------------------------------------
// DOCUMENT MANAGEMENT
// ----------------------------------------------------------------------------

export interface Document extends BaseEntity, OrganizationScoped {
 entityType: string;
 entityId?: string;
 fileName: string;
 fileType: string;
 fileSize: number;
 fileUrl: string;
 documentType: DocumentType;
 category?: string;
 tags?: string[];
 title?: string;
 description?: string;
 uploadDate: string;
 documentDate?: string;
 version: string;
 parentDocumentId?: string;
 isPublic: boolean;
 accessLevel: string;
 uploadedBy: string;
}

// ----------------------------------------------------------------------------
// VIEW MODELS & DTOs (for frontend use)
// ----------------------------------------------------------------------------

export interface GrantWithDonor extends Grant {
 donor: Donor;
 projectsCount?: number;
 totalSpent?: number;
}

export interface ProjectWithGrant extends Project {
 grant?: Grant;
 teamMembersCount?: number;
 activitiesCount?: number;
 budgetSpent?: number;
}

export interface IndicatorWithAchievements extends Indicator {
 latestAchievement?: IndicatorAchievement;
 achievementPercentage?: number;
 milestones?: IndicatorMilestone[];
}

export interface CaseWithActivities extends Case {
 recentActivities?: CaseActivity[];
 householdMembers?: HouseholdMember[];
 caseWorkerName?: string;
}

export interface ExpenseWithProject extends Expense {
 project?: Project;
 budgetLine?: BudgetLine;
 approverName?: string;
}

// ----------------------------------------------------------------------------
// FORM TYPES
// ----------------------------------------------------------------------------

export type GrantFormData = Omit<Grant, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'organizationId'>;
export type ProjectFormData = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'organizationId'>;
export type CaseFormData = Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'organizationId'>;
export type ExpenseFormData = Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'organizationId'>;
export type IndicatorFormData = Omit<Indicator, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'organizationId'>;

// ----------------------------------------------------------------------------
// API RESPONSE TYPES
// ----------------------------------------------------------------------------

export interface PaginatedResponse<T> {
 data: T[];
 total: number;
 page: number;
 pageSize: number;
 totalPages: number;
}

export interface ApiResponse<T> {
 success: boolean;
 data?: T;
 error?: string;
 message?: string;
}

// ----------------------------------------------------------------------------
// FILTER & QUERY TYPES
// ----------------------------------------------------------------------------

export interface GrantFilters {
 status?: GrantStatus[];
 donorId?: string;
 sector?: string[];
 startDateFrom?: string;
 startDateTo?: string;
 search?: string;
}

export interface ProjectFilters {
 status?: ProjectStatus[];
 grantId?: string;
 sector?: string[];
 projectManager?: string;
 search?: string;
}

export interface CaseFilters {
 status?: CaseStatus[];
 caseType?: CaseType;
 caseWorker?: string;
 gender?: Gender;
 registrationDateFrom?: string;
 registrationDateTo?: string;
 search?: string;
}

export interface ExpenseFilters {
 status?: ExpenseStatus[];
 projectId?: string;
 expenseDateFrom?: string;
 expenseDateTo?: string;
 category?: string;
 search?: string;
}