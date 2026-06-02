/**
 * ============================================================================
 * HR ANNUAL PLANNING - TYPE DEFINITIONS
 * ============================================================================
 * 
 * Type definitions for HR Annual Planning module
 * Aligned with database schema in drizzle/schema.ts
 * 
 * ============================================================================
 */

/**
 * Annual Plan Status
 */
export type AnnualPlanStatus = 
  | 'draft'
  | 'pending_review'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'under-review'
  | 'locked';

/**
 * Objective Status
 */
export type ObjectiveStatus = 
  | 'draft'
  | 'active'
  | 'completed'
  | 'archived';

/**
 * Objective Priority
 */
export type ObjectivePriority = 
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

/**
 * KPI Status
 */
export type KPIStatus = 
  | 'draft'
  | 'active'
  | 'completed'
  | 'archived';

/**
 * KPI Review Frequency
 */
export type KPIReviewFrequency = 
  | 'monthly'
  | 'quarterly'
  | 'semi_annual'
  | 'annual';

/**
 * Plan Review Status
 */
export type PlanReviewStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'commented';

/**
 * Plan Reviewer Role
 */
export type PlanReviewerRole = 
  | 'hr_manager'
  | 'department_head'
  | 'executive'
  | 'finance'
  | 'other';

/**
 * Contract Type for Planned Positions
 */
export type ContractType = 'Fixed-Term' | 'Short-Term' | 'Consultancy' | 'Permanent';

/**
 * Risk Impact Level
 */
export type RiskImpact = 'High' | 'Medium' | 'Low';

/**
 * Risk Likelihood Level
 */
export type RiskLikelihood = 'High' | 'Medium' | 'Low';

/**
 * Training Priority Level
 */
export type TrainingPriority = 'High' | 'Medium' | 'Low';

/**
 * Training Type
 */
export type TrainingType = 'Internal' | 'External';

/**
 * Existing Workforce Entry
 */
export interface ExistingWorkforceEntry {
  id?: string;
  jobTitle: string;
  department: string;
  currentCount: number;
  salaryRange: string;
  notes?: string;
}

/**
 * Planned Staffing Entry
 */
export interface PlannedStaffingEntry {
  id?: string;
  jobTitle: string;
  department: string;
  plannedCount: number;
  startDate: string;
  endDate?: string;
  salaryRange: string;
  justification?: string;
}

/**
 * Planned Position
 */
export interface PlannedPosition {
  id: string;
  positionTitle: string;
  department: string;
  projectProgram?: string;
  grade?: string;
  contractType: ContractType;
  numberOfPositions: number;
  plannedStartDate: string;
  plannedEndDate?: string;
  justification?: string;
  fundingSource?: string; // 'Grant' | 'Core' | 'TBD' or any string
  annualSalaryCost: number;
  allowances: number;
  totalCost: number;
  // Legacy properties for backward compatibility
  jobTitle?: string;
  plannedCount?: number;
  startDate?: string;
  endDate?: string;
  salaryRange?: string;
}

/**
 * Recruitment Plan Entry
 */
export interface RecruitmentPlanEntry {
  id: string;
  position: string;
  quantity: number;
  recruitmentType: 'New' | 'Replacement';
  expectedRecruitmentMonth: string;
  priority: 'High' | 'Medium' | 'Low';
  recruitmentMethod: 'Open' | 'Internal' | 'Roster';
  // Legacy properties
  department?: string;
  timeline?: string;
  budget?: number;
  status?: string;
  notes?: string;
}

/**
 * Recruitment Plan (alias for RecruitmentPlanEntry)
 */
export interface RecruitmentPlan extends RecruitmentPlanEntry {}

/**
 * Budget Estimate
 */
export interface BudgetEstimate {
  total: number;
  salaries: number;
  recruitment: number;
  training: number;
  other: number;
  currency: string;
}

/**
 * Training Plan Entry
 */
export interface TrainingPlanEntry {
  id: string;
  targetGroup: string;
  trainingTopic: string;
  objective?: string;
  type: TrainingType;
  plannedPeriod?: string;
  estimatedCost: number;
  priority: TrainingPriority;
  // Legacy properties
  title?: string;
  department?: string;
  targetAudience?: string;
  duration?: string;
  budget?: number;
  startDate?: string;
  status?: string;
  notes?: string;
}

/**
 * HR Risk Entry
 */
export interface HRRisk {
  id: string;
  riskDescription: string;
  impact: RiskImpact;
  likelihood: RiskLikelihood;
  mitigationAction: string;
  responsiblePerson?: string;
  timeline?: string;
  // Legacy properties
  probability?: 'low' | 'medium' | 'high';
  mitigation?: string;
  owner?: string;
  status?: 'open' | 'mitigated' | 'closed';
}

/**
 * HR Risk Entry (legacy name)
 */
export interface HRRiskEntry extends HRRisk {}

/**
 * HR Annual Plan
 */
export interface HRAnnualPlan {
  id: number;
  organizationId: number;
  operatingUnitId?: number | null;
  planYear: number;
  year?: number; // Alternative property name
  planName: string;
  organization?: string; // Organization name
  existingWorkforce: string | ExistingWorkforceEntry[] | null; // JSON stringified array or array
  plannedStaffing: string | PlannedStaffingEntry[] | null; // JSON stringified array or array
  plannedPositions?: PlannedPosition[]; // Array of planned positions
  recruitmentPlan: RecruitmentPlan[] | string | null; // Array of recruitment plans or JSON string
  budgetEstimate: string | BudgetEstimate | null; // JSON stringified or object
  trainingPlan: TrainingPlanEntry[] | string; // Array of training plan entries or JSON string
  hrRisks: HRRisk[] | string; // Array of HR risks or JSON string
  status: AnnualPlanStatus;
  approval?: ApprovalObject | boolean; // Approval status object or boolean
  preparedBy?: number; // User ID
  preparedAt?: string; // ISO timestamp
  preparationDate?: string; // Alternative property name for preparedAt
  reviewedBy?: number | null; // User ID
  reviewedAt?: string | null; // ISO timestamp
  reviewDate?: string | null; // Alternative property name for reviewedAt
  approvedBy?: number | null; // User ID
  approvedAt?: string | null; // ISO timestamp
  approvalDate?: string | null; // Alternative property name for approvedAt
  comments?: string | null; // Approval comments
  isDeleted: number; // 0 or 1
  deletedAt?: string | null; // ISO timestamp
  deletedBy?: number | null; // User ID
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  // Additional properties for component compatibility
  nonSalaryCosts?: any[];
  salaryForecast?: any[];
  riskItems?: any[];
  trainingItems?: any[];
  notes?: string | null; // Additional notes
}

/**
 * Objective
 */
export interface Objective {
  id: number;
  planId: number;
  organizationId: number;
  operatingUnitId?: number | null;
  objectiveCode: string;
  objectiveNameEn: string;
  objectiveNameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  priority: ObjectivePriority;
  status: ObjectiveStatus;
  startDate: string; // ISO date
  endDate: string; // ISO date
  owner: number; // User ID
  isDeleted: number; // 0 or 1
  deletedAt?: string | null;
  deletedBy?: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy: number;
}

/**
 * KPI
 */
export interface KPI {
  id: number;
  objectiveId: number;
  planId: number;
  organizationId: number;
  operatingUnitId?: number | null;
  kpiCode: string;
  kpiNameEn: string;
  kpiNameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  baseline: number;
  target: number;
  actual?: number | null;
  unit: string;
  reviewFrequency: KPIReviewFrequency;
  status: KPIStatus;
  owner: number; // User ID
  isDeleted: number; // 0 or 1
  deletedAt?: string | null;
  deletedBy?: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy: number;
}

/**
 * Plan Review
 */
export interface PlanReview {
  id: number;
  planId: number;
  organizationId: number;
  operatingUnitId?: number | null;
  reviewerRole: PlanReviewerRole;
  reviewerName: string;
  reviewerEmail: string;
  status: PlanReviewStatus;
  comments?: string | null;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  isDeleted: number; // 0 or 1
  deletedAt?: string | null;
  deletedBy?: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy: number;
}

/**
 * Create Annual Plan Input
 */
export interface CreateAnnualPlanInput {
  planYear: number;
  planName: string;
  existingWorkforce?: string;
  plannedStaffing?: string;
  recruitmentPlan?: string;
  budgetEstimate?: string;
  trainingPlan?: string;
  hrRisks?: string;
}

/**
 * Update Annual Plan Input
 */
export interface UpdateAnnualPlanInput {
  id: number;
  planYear?: number;
  planName?: string;
  existingWorkforce?: string | ExistingWorkforceEntry[];
  plannedStaffing?: string | PlannedStaffingEntry[];
  recruitmentPlan?: string | RecruitmentPlan[];
  budgetEstimate?: string | BudgetEstimate;
  trainingPlan?: string | TrainingPlanEntry[];
  hrRisks?: string | HRRisk[];
  status?: AnnualPlanStatus;
}

/**
 * Annual Plan Statistics
 */
export interface AnnualPlanStatistics {
  totalPlans: number;
  draftPlans: number;
  pendingReviewPlans: number;
  pendingApprovalPlans: number;
  approvedPlans: number;
  rejectedPlans: number;
  totalObjectives: number;
  totalKPIs: number;
  totalReviews: number;
}

/**
 * List Annual Plans Filter
 */
export interface ListAnnualPlansFilter {
  year?: number;
  status?: AnnualPlanStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * List Objectives Filter
 */
export interface ListObjectivesFilter {
  planId: number;
  status?: ObjectiveStatus;
  priority?: ObjectivePriority;
  limit?: number;
  offset?: number;
}

/**
 * List KPIs Filter
 */
export interface ListKPIsFilter {
  objectiveId?: number;
  planId?: number;
  status?: KPIStatus;
  limit?: number;
  offset?: number;
}

/**
 * List Plan Reviews Filter
 */
export interface ListPlanReviewsFilter {
  planId: number;
  status?: PlanReviewStatus;
  limit?: number;
  offset?: number;
}

/**
 * Non-Salary Cost
 */
export interface NonSalaryCost {
  id?: string;
  category: string;
  description: string;
  estimatedAmount: number;
  notes?: string;
}

/**
 * Salary Forecast Entry
 */
export interface SalaryForecastEntry {
  id?: string;
  position: string;
  quantity: number;
  annualSalary: number;
  allowances: number;
  totalCost: number;
}

/**
 * Risk Item
 */
export interface RiskItem {
  id?: string;
  riskDescription: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
  owner: string;
  status: 'open' | 'mitigated' | 'closed';
}

/**
 * Training Item
 */
export interface TrainingItem {
  id?: string;
  title: string;
  department: string;
  targetAudience: string;
  duration: string;
  budget: number;
  startDate: string;
  status: string;
  notes?: string;
}

/**
 * Recruitment Action
 */
export interface RecruitmentAction {
  id?: string;
  position: string;
  quantity: number;
  recruitmentType: 'new' | 'replacement';
  expectedMonth: string;
  priority: 'high' | 'medium' | 'low';
  method: 'open' | 'internal' | 'roster';
}

/**
 * Approval Object
 */
export interface ApprovalObject {
  approvedBy?: number | null;
  preparationDate?: string;
  reviewedBy?: number | null;
  reviewDate?: string | null;
  approvalDate?: string | null;
  comments?: string | null;
}

/**
 * Extended HRAnnualPlan with all properties
 */
export interface HRAnnualPlanExtended extends Omit<HRAnnualPlan, 'plannedPositions' | 'recruitmentPlan' | 'trainingPlan' | 'hrRisks'> {
  salaryForecast?: SalaryForecastEntry[];
  nonSalaryCosts?: NonSalaryCost[];
  riskItems?: RiskItem[];
  trainingItems?: TrainingItem[];
  plannedPositions?: PlannedPosition[];
  totalPlannedPositions?: number | null;
  existingStaff?: number | null;
  newPositionsRequired?: number | null;
  estimatedHrCost?: string | number | null;
  recruitmentPlan: RecruitmentPlan[];
  trainingPlan: TrainingPlanEntry[];
  hrRisks: HRRisk[];
  recruitmentActions?: RecruitmentAction[];
  salaryCostTotal?: number;
  nonSalaryCostTotal?: number;
  totalBudget?: number;
  hrCostBudgetEstimation?: number;
  hrBudgetSummary?: number;
  salaryCostForecast?: SalaryForecastEntry[];
  nonsalaryHrCosts?: NonSalaryCost[];
  totalRecruitmentActions?: number;
  workforceAnalysis?: any;
  currentWorkforce?: any[];
  plannedWorkforce?: any[];
  governanceNotes?: string;
}
