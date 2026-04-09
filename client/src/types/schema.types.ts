// ============================================================================
// SCHEMA TYPES - Integrated Management System (IMS) (Prisma-based)
// Generated from existing database schema
// ============================================================================

// ----------------------------------------------------------------------------
// ENUMS (matching Prisma schema)
// ----------------------------------------------------------------------------

export enum UserRole {
 USER = 'user',
 MANAGER = 'manager',
 ADMIN = 'admin'
}

export enum OrganizationRole {
 ORG_ADMIN = 'org_admin',
 PROGRAM_MANAGER = 'program_manager',
 FINANCE_MANAGER = 'finance_manager',
 HR_ADMIN_OFFICER = 'hr_admin_officer',
 MEAL_OFFICER = 'meal_officer',
 CASE_WORKER = 'case_worker',
 VIEWER = 'viewer'
}

export enum OrganizationStatus {
 ACTIVE = 'active',
 INACTIVE = 'inactive',
 SUSPENDED = 'suspended'
}

export enum DonorType {
 UN = 'UN',
 INGO = 'INGO',
 GOV = 'GOV',
 PRIVATE = 'Private',
 FOUNDATION = 'Foundation',
 OTHER = 'Other'
}

export enum DonorStatus {
 ACTIVE = 'active',
 INACTIVE = 'inactive',
 ARCHIVED = 'archived'
}

export enum GrantStatus {
 PLANNED = 'planned',
 ONGOING = 'ongoing',
 CLOSED = 'closed',
 DRAFT = 'draft',
 SUBMITTED = 'submitted',
 UNDER_REVIEW = 'under_review',
 APPROVED = 'approved',
 REJECTED = 'rejected'
}

export enum ProjectStatus {
 PLANNING = 'planning',
 ACTIVE = 'active',
 ON_HOLD = 'on_hold',
 COMPLETED = 'completed',
 CANCELLED = 'cancelled'
}

export enum BudgetStatus {
 DRAFT = 'draft',
 APPROVED = 'approved',
 REVISED = 'revised',
 CLOSED = 'closed'
}

export enum ExpenditureStatus {
 DRAFT = 'draft',
 SUBMITTED = 'submitted',
 APPROVED = 'approved',
 PAID = 'paid',
 REJECTED = 'rejected'
}

export enum AccountType {
 ASSET = 'ASSET',
 LIABILITY = 'LIABILITY',
 EQUITY = 'EQUITY',
 INCOME = 'INCOME',
 EXPENSE = 'EXPENSE'
}

export enum MealIndicatorType {
 OUTPUT = 'output',
 OUTCOME = 'outcome',
 IMPACT = 'impact'
}

export enum MealIndicatorFrequency {
 DAILY = 'daily',
 WEEKLY = 'weekly',
 MONTHLY = 'monthly',
 QUARTERLY = 'quarterly',
 ANNUALLY = 'annually'
}

export enum Gender {
 MALE = 'male',
 FEMALE = 'female',
 OTHER = 'other',
 PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

export enum DisplacementStatus {
 IDP = 'idp',
 HOST = 'host',
 RETURNEE = 'returnee',
 REFUGEE = 'refugee',
 OTHER = 'other'
}

export enum MaritalStatus {
 SINGLE = 'single',
 MARRIED = 'married',
 DIVORCED = 'divorced',
 WIDOWED = 'widowed',
 OTHER = 'other'
}

export enum DisabilityStatus {
 NONE = 'none',
 PHYSICAL = 'physical',
 VISUAL = 'visual',
 HEARING = 'hearing',
 INTELLECTUAL = 'intellectual',
 MULTIPLE = 'multiple'
}

export enum EnrollmentStatus {
 ACTIVE = 'active',
 INACTIVE = 'inactive',
 GRADUATED = 'graduated',
 DROPPED_OUT = 'dropped_out'
}

export enum DeliveryStatus {
 PLANNED = 'planned',
 ONGOING = 'ongoing',
 COMPLETED = 'completed',
 CANCELLED = 'cancelled'
}

export enum CaseType {
 PROTECTION = 'protection',
 PSS = 'pss',
 COMPLAINT = 'complaint',
 REFERRAL = 'referral'
}

export enum CaseStatus {
 OPEN = 'open',
 IN_PROGRESS = 'in_progress',
 RESOLVED = 'resolved',
 CLOSED = 'closed',
 REFERRED = 'referred'
}

export enum CasePriority {
 LOW = 'low',
 MEDIUM = 'medium',
 HIGH = 'high',
 URGENT = 'urgent'
}

export enum CaseNoteType {
 GENERAL = 'general',
 FOLLOW_UP = 'follow_up',
 RESOLUTION = 'resolution',
 REFERRAL = 'referral'
}

export enum ReferralStatus {
 PENDING = 'pending',
 ACCEPTED = 'accepted',
 REJECTED = 'rejected',
 COMPLETED = 'completed'
}

export enum SurveyStatus {
 DRAFT = 'draft',
 ACTIVE = 'active',
 CLOSED = 'closed'
}

export enum GrantDocumentType {
 PROJECT_AGREEMENT = 'project_agreement',
 APPROVED_PROPOSAL = 'approved_proposal',
 APPROVED_BUDGET_SHEET = 'approved_budget_sheet',
 BASELINE_REPORT = 'baseline_report',
 MIDTERM_NARRATIVE_REPORT = 'midterm_narrative_report',
 MID_FINANCIAL_REPORT = 'mid_financial_report',
 FINAL_NARRATIVE_REPORT = 'final_narrative_report',
 FINAL_FINANCIAL_REPORT = 'final_financial_report',
 FINAL_ASSESSMENT_REPORT = 'final_assessment_report'
}

export enum AlertType {
 BUDGET_THRESHOLD = 'budget_threshold',
 BURN_RATE_HIGH = 'burn_rate_high',
 REPORT_DUE = 'report_due',
 GRANT_EXPIRING = 'grant_expiring',
 COMPLIANCE_ISSUE = 'compliance_issue',
 SYSTEM_NOTIFICATION = 'system_notification'
}

export enum AlertSeverity {
 INFO = 'info',
 WARNING = 'warning',
 CRITICAL = 'critical'
}

export enum AlertStatus {
 ACTIVE = 'active',
 ACKNOWLEDGED = 'acknowledged',
 RESOLVED = 'resolved',
 DISMISSED = 'dismissed'
}

export enum InvitationStatus {
 PENDING = 'pending',
 ACCEPTED = 'accepted',
 EXPIRED = 'expired',
 CANCELLED = 'cancelled'
}

export enum ImportStatus {
 IN_PROGRESS = 'in_progress',
 COMPLETED = 'completed',
 FAILED = 'failed',
 PARTIAL = 'partial'
}

// ----------------------------------------------------------------------------
// BASE TYPES
// ----------------------------------------------------------------------------

export interface BaseEntity {
 id: number;
 createdAt: string;
 updatedAt: string;
}

export interface SoftDeletable {
 isDeleted: boolean;
 deletedAt: string | null;
 deletedBy: number | null;
}

export interface OrganizationScoped {
 organizationId: number;
}

export interface UserTracked {
 createdBy: number;
 updatedBy?: number;
}

// ----------------------------------------------------------------------------
// SYSTEM TABLES
// ----------------------------------------------------------------------------

export interface Organization {
 id: number;
 name: string;
 nameAr: string | null;
 code: string | null;
 description: string | null;
 descriptionAr: string | null;
 country: string | null;
 defaultCurrency: string;
 contactEmail: string | null;
 contactPhone: string | null;
 logoUrl: string | null;
 faviconUrl: string | null;
 primaryColor: string;
 secondaryColor: string;
 accentColor: string;
 defaultLanguage: string;
 status: OrganizationStatus;
 createdBy: number | null;
 createdAt: string;
 updatedAt: string;
}

export interface User {
 id: number;
 openId: string;
 name: string | null;
 email: string | null;
 loginMethod: string | null;
 role: UserRole;
 organizationId: number | null;
 currentOrganizationId: number | null;
 languagePreference: string | null;
 createdAt: string;
 updatedAt: string;
 lastSignedIn: string;
}

export interface UserOrganization {
 id: number;
 userId: number;
 organizationId: number;
 isPrimary: boolean;
 joinedAt: string;
}

export interface UserOrganizationRole {
 id: number;
 userId: number;
 organizationId: number;
 role: OrganizationRole;
 assignedAt: string;
 assignedBy: number | null;
}

export interface ActivityLog {
 id: number;
 organizationId: number;
 userId: number;
 action: string;
 entityType: string;
 entityId: number;
 details: any;
 ipAddress: string | null;
 createdAt: string;
}

export interface RolePermission {
 id: number;
 organizationId: number;
 role: OrganizationRole;
 module: string;
 canView: boolean;
 canCreate: boolean;
 canEdit: boolean;
 canDelete: boolean;
 updatedBy: number | null;
 updatedAt: string;
}

export interface Invitation {
 id: number;
 email: string;
 organizationId: number;
 role: OrganizationRole;
 token: string;
 status: InvitationStatus;
 expiresAt: string;
 invitedBy: number;
 acceptedAt: string | null;
 createdAt: string;
}

// ----------------------------------------------------------------------------
// DONOR & GRANT MANAGEMENT
// ----------------------------------------------------------------------------

export interface Donor extends OrganizationScoped, UserTracked, SoftDeletable {
 id: number;
 donorCode: string;
 name: string;
 nameAr: string | null;
 type: DonorType;
 country: string | null;
 contactPerson: string | null;
 contactEmail: string | null;
 contactPhone: string | null;
 website: string | null;
 address: string | null;
 addressAr: string | null;
 notes: string | null;
 notesAr: string | null;
 status: DonorStatus;
 createdAt: string;
 updatedAt: string;
}

export interface Grant extends OrganizationScoped, UserTracked, SoftDeletable {
 id: number;
 donorId: number | null;
 projectId: number | null;
 grantCode: string;
 title: string;
 titleAr: string | null;
 donorName: string;
 grantNumber: string | null;
 amount: number;
 totalBudget: number;
 currency: string;
 status: GrantStatus;
 submissionDate: string | null;
 approvalDate: string | null;
 startDate: string | null;
 endDate: string | null;
 description: string | null;
 descriptionAr: string | null;
 objectives: string | null;
 objectivesAr: string | null;
 proposalDocumentUrl: string | null;
 approvalDocumentUrl: string | null;
 createdAt: string;
 updatedAt: string;
}

export interface GrantDocument extends OrganizationScoped, SoftDeletable {
 id: number;
 grantId: number;
 documentType: GrantDocumentType;
 fileName: string;
 fileUrl: string;
 fileKey: string;
 fileSize: number | null;
 mimeType: string | null;
 uploadedBy: number;
 uploadedAt: string;
 notes: string | null;
 notesAr: string | null;
}

// ----------------------------------------------------------------------------
// PROJECT MANAGEMENT
// ----------------------------------------------------------------------------

export interface Project extends OrganizationScoped, UserTracked, SoftDeletable {
 id: number;
 grantId: number | null;
 title: string;
 titleAr: string | null;
 projectCode: string;
 status: ProjectStatus;
 startDate: string;
 endDate: string;
 location: string | null;
 locationAr: string | null;
 description: string | null;
 descriptionAr: string | null;
 objectives: string | null;
 objectivesAr: string | null;
 beneficiaryCount: number | null;
 projectManager: number | null;
 createdAt: string;
 updatedAt: string;
}

// ----------------------------------------------------------------------------
// FINANCE MANAGEMENT
// ----------------------------------------------------------------------------

export interface BudgetCategory extends OrganizationScoped {
 id: number;
 name: string;
 nameAr: string | null;
 code: string | null;
 description: string | null;
 parentCategoryId: number | null;
 createdAt: string;
}

export interface Budget extends OrganizationScoped, UserTracked, SoftDeletable {
 id: number;
 projectId: number;
 grantId: number | null;
 categoryId: number;
 accountId: number | null;
 budgetedAmount: number;
 approvedAmount: number | null;
 forecastAmount: number | null;
 currency: string;
 period: string | null;
 budgetVersion: number;
 status: BudgetStatus;
 costCenter: string | null;
 notes: string | null;
 createdAt: string;
 updatedAt: string;
}

export interface Expenditure extends OrganizationScoped, UserTracked, SoftDeletable {
 id: number;
 projectId: number;
 budgetId: number;
 accountId: number | null;
 amount: number;
 currency: string;
 transactionDate: string;
 expenditureDate: string;
 description: string | null;
 descriptionAr: string | null;
 vendor: string | null;
 invoiceNumber: string | null;
 referenceNo: string | null;
 receiptUrl: string | null;
 status: ExpenditureStatus;
 approvedBy: number | null;
 approvedAt: string | null;
 createdAt: string;
 updatedAt: string;
}

export interface ChartOfAccounts extends OrganizationScoped, SoftDeletable {
 id: number;
 accountCode: string;
 accountName: string;
 accountNameAr: string | null;
 accountType: AccountType;
 parentAccountId: number | null;
 isActive: boolean;
 createdAt: string;
}

export interface ForecastPlan extends OrganizationScoped, UserTracked {
 id: number;
 projectId: number;
 budgetId: number;
 fiscalYear: string;
 planPeriod: number | null;
 planStartDate: string | null;
 planEndDate: string | null;
 month1: number | null;
 month2: number | null;
 month3: number | null;
 month4: number | null;
 month5: number | null;
 month6: number | null;
 month7: number | null;
 month8: number | null;
 month9: number | null;
 month10: number | null;
 month11: number | null;
 month12: number | null;
 previousYearBudget: number | null;
 createdAt: string;
 updatedAt: string;
 updatedBy: number | null;
}

// ----------------------------------------------------------------------------
// MEAL (Monitoring, Evaluation, Accountability & Learning)
// ----------------------------------------------------------------------------

export interface MealIndicator extends OrganizationScoped, UserTracked, SoftDeletable {
 id: number;
 projectId: number;
 name: string;
 nameAr: string | null;
 type: MealIndicatorType;
 description: string | null;
 descriptionAr: string | null;
 baseline: number | null;
 target: number;
 achieved: number | null;
 unit: string | null;
 unitAr: string | null;
 frequency: MealIndicatorFrequency;
 dataSource: string | null;
 collectionMethod: string | null;
 responsible: number | null;
 createdAt: string;
 updatedAt: string;
}

export interface MealEvidence extends OrganizationScoped {
 id: number;
 indicatorId: number;
 title: string;
 description: string | null;
 fileUrl: string;
 fileType: string | null;
 collectionDate: string;
 uploadedBy: number;
 createdAt: string;
}

// ----------------------------------------------------------------------------
// BENEFICIARY MANAGEMENT
// ----------------------------------------------------------------------------

export interface Beneficiary extends OrganizationScoped, UserTracked, SoftDeletable {
 id: number;
 projectId: number | null;
 beneficiaryId: string;
 firstName: string;
 lastName: string;
 firstNameAr: string | null;
 lastNameAr: string | null;
 dateOfBirth: string | null;
 gender: Gender | null;
 nationality: string | null;
 nationalId: string | null;
 campId: string | null;
 passportNumber: string | null;
 governorate: string | null;
 district: string | null;
 community: string | null;
 address: string | null;
 city: string | null;
 displacementStatus: DisplacementStatus | null;
 phoneNumber: string | null;
 email: string | null;
 householdSize: number | null;
 adultMales: number | null;
 adultFemales: number | null;
 boys: number | null;
 girls: number | null;
 isHeadOfHousehold: boolean | null;
 maritalStatus: MaritalStatus | null;
 vulnerabilityCategories: string | null;
 disabilityStatus: DisabilityStatus | null;
 chronicIllness: boolean | null;
 singleHeadedHousehold: boolean | null;
 specialNeeds: string | null;
 enrollmentDate: string | null;
 enrollmentStatus: EnrollmentStatus;
 exitDate: string | null;
 exitReason: string | null;
 consentGiven: boolean;
 consentDate: string | null;
 dataCollectorName: string | null;
 registrationDate: string | null;
 verificationDocumentUrl: string | null;
 photoUrl: string | null;
 notes: string | null;
 createdAt: string;
 updatedAt: string;
}

export interface BeneficiaryService extends OrganizationScoped, UserTracked, SoftDeletable {
 id: number;
 beneficiaryId: number;
 projectId: number;
 activityType: string;
 serviceType: string | null;
 serviceDate: string;
 quantity: number | null;
 deliveryStatus: DeliveryStatus;
 completionDate: string | null;
 referralSource: string | null;
 referralDate: string | null;
 indicatorId: number | null;
 contributesToIndicator: boolean | null;
 notes: string | null;
 serviceProvidedBy: string | null;
 createdAt: string;
 updatedAt: string;
}

// ----------------------------------------------------------------------------
// CASE MANAGEMENT
// ----------------------------------------------------------------------------

export interface Case extends OrganizationScoped, UserTracked, SoftDeletable {
 id: number;
 projectId: number | null;
 caseNumber: string;
 caseType: CaseType;
 status: CaseStatus;
 priority: CasePriority;
 beneficiaryName: string | null;
 beneficiaryAge: number | null;
 beneficiaryGender: Gender | null;
 beneficiaryContact: string | null;
 description: string | null;
 descriptionAr: string | null;
 location: string | null;
 assignedTo: number | null;
 openedAt: string;
 closedAt: string | null;
 createdAt: string;
 updatedAt: string;
}

export interface CaseNote {
 id: number;
 caseId: number;
 note: string;
 noteType: CaseNoteType;
 createdBy: number;
 createdAt: string;
}

export interface Referral extends OrganizationScoped, UserTracked {
 id: number;
 caseId: number;
 referredTo: string;
 referredToAr: string | null;
 referralReason: string | null;
 referralDate: string;
 status: ReferralStatus;
 feedback: string | null;
 createdAt: string;
 updatedAt: string;
}

// ----------------------------------------------------------------------------
// SURVEY MANAGEMENT
// ----------------------------------------------------------------------------

export interface Survey extends OrganizationScoped, UserTracked, SoftDeletable {
 id: number;
 projectId: number | null;
 title: string;
 titleAr: string | null;
 description: string | null;
 descriptionAr: string | null;
 formSchema: any; // JSON schema
 status: SurveyStatus;
 startDate: string | null;
 endDate: string | null;
 createdAt: string;
 updatedAt: string;
}

export interface SurveyResponse extends OrganizationScoped {
 id: number;
 surveyId: number;
 responseData: any; // JSON response
 respondentName: string | null;
 respondentContact: string | null;
 location: string | null;
 submittedAt: string;
 submittedBy: number | null;
 createdAt: string;
}

// ----------------------------------------------------------------------------
// DOCUMENT MANAGEMENT
// ----------------------------------------------------------------------------

export interface Document extends OrganizationScoped {
 id: number;
 projectId: number | null;
 grantId: number | null;
 caseId: number | null;
 title: string;
 description: string | null;
 fileUrl: string;
 fileKey: string;
 fileName: string;
 fileSize: number | null;
 mimeType: string | null;
 category: string | null;
 version: number;
 uploadedBy: number;
 createdAt: string;
 updatedAt: string;
}

// ----------------------------------------------------------------------------
// SYSTEM ADMINISTRATION
// ----------------------------------------------------------------------------

export interface Alert extends OrganizationScoped {
 id: number;
 projectId: number | null;
 type: AlertType;
 severity: AlertSeverity;
 title: string;
 message: string;
 thresholdValue: number | null;
 currentValue: number | null;
 status: AlertStatus;
 acknowledgedBy: number | null;
 acknowledgedAt: string | null;
 createdAt: string;
 updatedAt: string;
}

export interface OptionSet extends OrganizationScoped, UserTracked {
 id: number;
 category: string;
 value: string;
 label: string;
 labelAr: string | null;
 displayOrder: number | null;
 isActive: boolean;
 isSystem: boolean;
 createdAt: string;
 updatedAt: string;
}

export interface ImportHistory extends OrganizationScoped {
 id: number;
 module: string;
 fileName: string;
 fileSize: number | null;
 totalRows: number;
 successfulRows: number;
 failedRows: number;
 status: ImportStatus;
 errorReportUrl: string | null;
 errorReportKey: string | null;
 importedBy: number;
 importedAt: string;
 completedAt: string | null;
 notes: string | null;
}

export interface ImportRowError {
 id: number;
 importHistoryId: number;
 rowNumber: number;
 rowData: any;
 errorMessage: string;
 errorField: string | null;
 createdAt: string;
}

export interface DeletedRecord {
 id: number;
 organizationId: number | null;
 module: string;
 recordType: string;
 recordId: number;
 recordName: string;
 originalStatus: string | null;
 deletedBy: number | null;
 deletedAt: string;
}

// ----------------------------------------------------------------------------
// VIEW MODELS & EXTENDED TYPES (for frontend use)
// ----------------------------------------------------------------------------

export interface GrantWithRelations extends Grant {
 donor?: Donor;
 project?: Project;
 documents?: GrantDocument[];
 budgets?: Budget[];
}

export interface ProjectWithRelations extends Project {
 grant?: Grant;
 budgets?: Budget[];
 expenditures?: Expenditure[];
 indicators?: MealIndicator[];
 beneficiaries?: Beneficiary[];
 manager?: User;
}

export interface BeneficiaryWithServices extends Beneficiary {
 services?: BeneficiaryService[];
 project?: Project;
}

export interface CaseWithDetails extends Case {
 notes?: CaseNote[];
 referrals?: Referral[];
 assignedUser?: User;
}

export interface BudgetWithDetails extends Budget {
 category?: BudgetCategory;
 project?: Project;
 expenditures?: Expenditure[];
 spent?: number;
 remaining?: number;
}

export interface UserWithOrganizations extends User {
 organizations?: UserOrganization[];
 roles?: UserOrganizationRole[];
 currentOrganization?: Organization;
}

// ----------------------------------------------------------------------------
// FORM TYPES (for creating/updating records)
// ----------------------------------------------------------------------------

export type GrantFormData = Omit<Grant, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt' | 'deletedBy'>;
export type ProjectFormData = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt' | 'deletedBy'>;
export type BeneficiaryFormData = Omit<Beneficiary, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt' | 'deletedBy'>;
export type CaseFormData = Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt' | 'deletedBy'>;
export type ExpenditureFormData = Omit<Expenditure, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt' | 'deletedBy'>;
export type MealIndicatorFormData = Omit<MealIndicator, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt' | 'deletedBy'>;
export type SurveyFormData = Omit<Survey, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt' | 'deletedBy'>;

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

export interface ApiError {
 message: string;
 code?: string;
 field?: string;
}

// ----------------------------------------------------------------------------
// FILTER TYPES (for list queries)
// ----------------------------------------------------------------------------

export interface BaseFilters {
 search?: string;
 page?: number;
 pageSize?: number;
 sortBy?: string;
 sortOrder?: 'asc' | 'desc';
}

export interface GrantFilters extends BaseFilters {
 status?: GrantStatus[];
 donorId?: number;
 startDateFrom?: string;
 startDateTo?: string;
}

export interface ProjectFilters extends BaseFilters {
 status?: ProjectStatus[];
 grantId?: number;
 projectManager?: number;
}

export interface BeneficiaryFilters extends BaseFilters {
 projectId?: number;
 gender?: Gender;
 displacementStatus?: DisplacementStatus;
 enrollmentStatus?: EnrollmentStatus;
 governorate?: string;
 district?: string;
}

export interface CaseFilters extends BaseFilters {
 caseType?: CaseType[];
 status?: CaseStatus[];
 priority?: CasePriority[];
 assignedTo?: number;
 openedDateFrom?: string;
 openedDateTo?: string;
}

export interface ExpenditureFilters extends BaseFilters {
 projectId?: number;
 budgetId?: number;
 status?: ExpenditureStatus[];
 expenditureDateFrom?: string;
 expenditureDateTo?: string;
}

// ----------------------------------------------------------------------------
// DASHBOARD & STATISTICS TYPES
// ----------------------------------------------------------------------------

export interface DashboardStats {
 activeProjects: number;
 totalBeneficiaries: number;
 totalExpenditure: number;
 activeGrants: number;
 openCases: number;
 pendingApprovals: number;
}

export interface BudgetSummary {
 totalBudget: number;
 totalSpent: number;
 remaining: number;
 percentageUsed: number;
}

export interface ProjectProgress {
 totalActivities: number;
 completedActivities: number;
 percentageComplete: number;
 daysRemaining: number;
}