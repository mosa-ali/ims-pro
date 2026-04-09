/**
 * ============================================================================
 * HR ANNUAL PLAN SERVICE - DATA MANAGEMENT
 * ============================================================================
 * 
 * Handles all CRUD operations for HR Annual Plans
 * Data persisted in localStorage
 * 
 * ============================================================================
 */

import { v4 as uuidv4 } from 'uuid';

// Types
export type PlanStatus = 'draft' | 'under-review' | 'approved' | 'locked';
export type ContractType = 'Fixed-Term' | 'Short-Term' | 'Consultancy' | 'Permanent' | 'Volunteer';
export type RecruitmentType = 'New' | 'Replacement';
export type Priority = 'High' | 'Medium' | 'Low';
export type RecruitmentMethod = 'Open' | 'Internal' | 'Roster';
export type TrainingType = 'Internal' | 'External';
export type RiskImpact = 'Low' | 'Medium' | 'High';
export type RiskLikelihood = 'Low' | 'Medium' | 'High';

// Existing Workforce Snapshot (Auto-loaded from Employee Profiles)
export interface ExistingStaff {
 id: string;
 staffId: string;
 fullName: string;
 position: string;
 department: string;
 contractType: ContractType;
 projectAssignment: string[];
 annualCost: number;
 grade?: string;
}

// Planned Position
export interface PlannedPosition {
 id: string;
 positionTitle: string;
 department: string;
 projectProgram: string;
 grade: string;
 contractType: ContractType;
 numberOfPositions: number;
 plannedStartDate: string;
 plannedEndDate: string;
 justification: string;
 fundingSource: string; // 'Grant', 'Core', 'TBD'
 annualSalaryCost?: number;
 allowances?: number;
 totalCost?: number;
}

// Recruitment Plan Entry (Auto-generated)
export interface RecruitmentPlanEntry {
 id: string;
 position: string;
 quantity: number;
 recruitmentType: RecruitmentType;
 expectedRecruitmentMonth: string;
 priority: Priority;
 recruitmentMethod: RecruitmentMethod;
 linkedPositionId: string;
}

// Non-Salary HR Cost
export interface NonSalaryCost {
 id: string;
 category: string;
 description: string;
 estimatedAmount: number;
 notes: string;
}

// Training Plan Entry
export interface TrainingPlanEntry {
 id: string;
 targetGroup: string;
 trainingTopic: string;
 objective: string;
 type: TrainingType;
 plannedPeriod: string;
 estimatedCost: number;
 priority: Priority;
}

// HR Risk Entry
export interface HRRisk {
 id: string;
 riskDescription: string;
 impact: RiskImpact;
 likelihood: RiskLikelihood;
 mitigationAction: string;
 responsiblePerson: string;
 timeline: string;
}

// Approval Record
export interface ApprovalRecord {
 preparedBy: string;
 preparationDate: string;
 reviewedBy?: string;
 reviewDate?: string;
 approvedBy?: string;
 approvalDate?: string;
 comments?: string;
}

// Main HR Annual Plan
export interface HRAnnualPlan {
 id: string;
 year: number;
 organization: string;
 status: PlanStatus;
 
 // Sections
 existingWorkforce: ExistingStaff[];
 plannedPositions: PlannedPosition[];
 recruitmentPlan: RecruitmentPlanEntry[];
 nonSalaryCosts: NonSalaryCost[];
 trainingPlan: TrainingPlanEntry[];
 hrRisks: HRRisk[];
 approval: ApprovalRecord;
 
 // Calculated fields
 totalPlannedPositions: number;
 existingStaffCount: number;
 newPositionsRequired: number;
 estimatedTotalCost: number;
 
 // Metadata
 createdAt: string;
 updatedAt: string;
}

const STORAGE_KEY = 'hr_annual_plans';

// Service class
class HRAnnualPlanService {
 // Get all plans
 getAll(): HRAnnualPlan[] {
 const data = localStorage.getItem(STORAGE_KEY);
 return data ? JSON.parse(data) : this.initializeMockData();
 }

 // Get by ID
 getById(id: string): HRAnnualPlan | null {
 const plans = this.getAll();
 return plans.find(p => p.id === id) || null;
 }

 // Get by year
 getByYear(year: number): HRAnnualPlan | null {
 const plans = this.getAll();
 return plans.find(p => p.year === year) || null;
 }

 // Create new plan
 create(planData: Partial<HRAnnualPlan>): HRAnnualPlan {
 const plans = this.getAll();
 
 const newPlan: HRAnnualPlan = {
 id: uuidv4(),
 year: planData.year || new Date().getFullYear() + 1,
 organization: planData.organization || 'Humanitarian NGO - MENA',
 status: 'draft',
 existingWorkforce: planData.existingWorkforce || [],
 plannedPositions: planData.plannedPositions || [],
 recruitmentPlan: planData.recruitmentPlan || [],
 nonSalaryCosts: planData.nonSalaryCosts || [],
 trainingPlan: planData.trainingPlan || [],
 hrRisks: planData.hrRisks || [],
 approval: planData.approval || {
 preparedBy: '',
 preparationDate: new Date().toISOString().split('T')[0]
 },
 totalPlannedPositions: 0,
 existingStaffCount: 0,
 newPositionsRequired: 0,
 estimatedTotalCost: 0,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString()
 };

 plans.push(newPlan);
 this.save(plans);
 return newPlan;
 }

 // Update plan
 update(id: string, updates: Partial<HRAnnualPlan>): HRAnnualPlan | null {
 const plans = this.getAll();
 const index = plans.findIndex(p => p.id === id);
 
 if (index === -1) return null;
 
 // Don't allow updates to approved/locked plans (except status changes)
 if ((plans[index].status === 'approved' || plans[index].status === 'locked') && updates.status === undefined) {
 console.warn('Cannot update approved/locked plan');
 return plans[index];
 }

 plans[index] = {
 ...plans[index],
 ...updates,
 updatedAt: new Date().toISOString()
 };

 // Recalculate metrics
 plans[index] = this.recalculateMetrics(plans[index]);

 this.save(plans);
 return plans[index];
 }

 // Delete plan
 delete(id: string): boolean {
 const plans = this.getAll();
 const plan = plans.find(p => p.id === id);
 
 // Don't allow deletion of approved/locked plans
 if (plan && (plan.status === 'approved' || plan.status === 'locked')) {
 console.warn('Cannot delete approved/locked plan');
 return false;
 }

 const filtered = plans.filter(p => p.id !== id);
 this.save(filtered);
 return true;
 }

 // Add planned position
 addPlannedPosition(planId: string, position: Omit<PlannedPosition, 'id'>): HRAnnualPlan | null {
 const plan = this.getById(planId);
 if (!plan) return null;

 const newPosition: PlannedPosition = {
 ...position,
 id: uuidv4()
 };

 plan.plannedPositions.push(newPosition);
 
 // Auto-generate recruitment entry
 this.regenerateRecruitmentPlan(plan);
 
 return this.update(planId, plan);
 }

 // Update planned position
 updatePlannedPosition(planId: string, positionId: string, updates: Partial<PlannedPosition>): HRAnnualPlan | null {
 const plan = this.getById(planId);
 if (!plan) return null;

 const index = plan.plannedPositions.findIndex(p => p.id === positionId);
 if (index === -1) return null;

 plan.plannedPositions[index] = {
 ...plan.plannedPositions[index],
 ...updates
 };

 // Regenerate recruitment plan
 this.regenerateRecruitmentPlan(plan);

 return this.update(planId, plan);
 }

 // Delete planned position
 deletePlannedPosition(planId: string, positionId: string): HRAnnualPlan | null {
 const plan = this.getById(planId);
 if (!plan) return null;

 plan.plannedPositions = plan.plannedPositions.filter(p => p.id !== positionId);
 
 // Regenerate recruitment plan
 this.regenerateRecruitmentPlan(plan);

 return this.update(planId, plan);
 }

 // Add non-salary cost
 addNonSalaryCost(planId: string, cost: Omit<NonSalaryCost, 'id'>): HRAnnualPlan | null {
 const plan = this.getById(planId);
 if (!plan) return null;

 const newCost: NonSalaryCost = {
 ...cost,
 id: uuidv4()
 };

 plan.nonSalaryCosts.push(newCost);
 return this.update(planId, plan);
 }

 // Update non-salary cost
 updateNonSalaryCost(planId: string, costId: string, updates: Partial<NonSalaryCost>): HRAnnualPlan | null {
 const plan = this.getById(planId);
 if (!plan) return null;

 const index = plan.nonSalaryCosts.findIndex(c => c.id === costId);
 if (index === -1) return null;

 plan.nonSalaryCosts[index] = {
 ...plan.nonSalaryCosts[index],
 ...updates
 };

 return this.update(planId, plan);
 }

 // Delete non-salary cost
 deleteNonSalaryCost(planId: string, costId: string): HRAnnualPlan | null {
 const plan = this.getById(planId);
 if (!plan) return null;

 plan.nonSalaryCosts = plan.nonSalaryCosts.filter(c => c.id !== costId);
 return this.update(planId, plan);
 }

 // Add training entry
 addTrainingEntry(planId: string, training: Omit<TrainingPlanEntry, 'id'>): HRAnnualPlan | null {
 const plan = this.getById(planId);
 if (!plan) return null;

 const newTraining: TrainingPlanEntry = {
 ...training,
 id: uuidv4()
 };

 plan.trainingPlan.push(newTraining);
 return this.update(planId, plan);
 }

 // Update training entry
 updateTrainingEntry(planId: string, trainingId: string, updates: Partial<TrainingPlanEntry>): HRAnnualPlan | null {
 const plan = this.getById(planId);
 if (!plan) return null;

 const index = plan.trainingPlan.findIndex(t => t.id === trainingId);
 if (index === -1) return null;

 plan.trainingPlan[index] = {
 ...plan.trainingPlan[index],
 ...updates
 };

 return this.update(planId, plan);
 }

 // Delete training entry
 deleteTrainingEntry(planId: string, trainingId: string): HRAnnualPlan | null {
 const plan = this.getById(planId);
 if (!plan) return null;

 plan.trainingPlan = plan.trainingPlan.filter(t => t.id !== trainingId);
 return this.update(planId, plan);
 }

 // Add HR risk
 addHRRisk(planId: string, risk: Omit<HRRisk, 'id'>): HRAnnualPlan | null {
 const plan = this.getById(planId);
 if (!plan) return null;

 const newRisk: HRRisk = {
 ...risk,
 id: uuidv4()
 };

 plan.hrRisks.push(newRisk);
 return this.update(planId, plan);
 }

 // Update HR risk
 updateHRRisk(planId: string, riskId: string, updates: Partial<HRRisk>): HRAnnualPlan | null {
 const plan = this.getById(planId);
 if (!plan) return null;

 const index = plan.hrRisks.findIndex(r => r.id === riskId);
 if (index === -1) return null;

 plan.hrRisks[index] = {
 ...plan.hrRisks[index],
 ...updates
 };

 return this.update(planId, plan);
 }

 // Delete HR risk
 deleteHRRisk(planId: string, riskId: string): HRAnnualPlan | null {
 const plan = this.getById(planId);
 if (!plan) return null;

 plan.hrRisks = plan.hrRisks.filter(r => r.id !== riskId);
 return this.update(planId, plan);
 }

 // Update approval
 updateApproval(planId: string, approval: Partial<ApprovalRecord>): HRAnnualPlan | null {
 const plan = this.getById(planId);
 if (!plan) return null;

 plan.approval = {
 ...plan.approval,
 ...approval
 };

 return this.update(planId, plan);
 }

 // Submit for review
 submitForReview(planId: string): HRAnnualPlan | null {
 const plan = this.getById(planId);
 if (!plan || plan.status !== 'draft') return null;

 return this.update(planId, { status: 'under-review' });
 }

 // Approve plan
 approvePlan(planId: string, approvedBy: string): HRAnnualPlan | null {
 const plan = this.getById(planId);
 if (!plan || plan.status !== 'under-review') return null;

 plan.approval.approvedBy = approvedBy;
 plan.approval.approvalDate = new Date().toISOString().split('T')[0];
 plan.status = 'approved';

 return this.update(planId, plan);
 }

 // Lock plan
 lockPlan(planId: string): HRAnnualPlan | null {
 const plan = this.getById(planId);
 if (!plan || plan.status !== 'approved') return null;

 return this.update(planId, { status: 'locked' });
 }

 // Regenerate recruitment plan from planned positions
 private regenerateRecruitmentPlan(plan: HRAnnualPlan): void {
 plan.recruitmentPlan = plan.plannedPositions.map(position => ({
 id: uuidv4(),
 position: position.positionTitle,
 quantity: position.numberOfPositions,
 recruitmentType: 'New' as RecruitmentType,
 expectedRecruitmentMonth: position.plannedStartDate,
 priority: 'Medium' as Priority,
 recruitmentMethod: 'Open' as RecruitmentMethod,
 linkedPositionId: position.id
 }));
 }

 // Recalculate all metrics
 private recalculateMetrics(plan: HRAnnualPlan): HRAnnualPlan {
 // Total planned positions
 plan.totalPlannedPositions = plan.plannedPositions.reduce((sum, p) => sum + p.numberOfPositions, 0);
 
 // Existing staff count
 plan.existingStaffCount = plan.existingWorkforce.length;
 
 // New positions required
 plan.newPositionsRequired = plan.totalPlannedPositions - plan.existingStaffCount;
 
 // Calculate total salary cost
 const salaryCost = plan.plannedPositions.reduce((sum, p) => {
 const cost = (p.annualSalaryCost || 0) + (p.allowances || 0);
 return sum + (cost * p.numberOfPositions);
 }, 0);
 
 // Calculate total non-salary cost
 const nonSalaryCost = plan.nonSalaryCosts.reduce((sum, c) => sum + c.estimatedAmount, 0);
 
 // Total cost
 plan.estimatedTotalCost = salaryCost + nonSalaryCost;
 
 return plan;
 }

 // Load existing workforce from HR system
 loadExistingWorkforce(planId: string): HRAnnualPlan | null {
 const plan = this.getById(planId);
 if (!plan) return null;

 // This would pull from staffService in real implementation
 // For now, using mock data
 const mockWorkforce: ExistingStaff[] = [
 {
 id: uuidv4(),
 staffId: 'STF-2024-001',
 fullName: 'Ahmed Hassan',
 position: 'Program Manager',
 department: 'Programs',
 contractType: 'Fixed-Term',
 projectAssignment: ['ECHO-YEM-001'],
 annualCost: 42000,
 grade: 'G5'
 },
 {
 id: uuidv4(),
 staffId: 'STF-2024-002',
 fullName: 'Sarah Johnson',
 position: 'Finance Director',
 department: 'Finance',
 contractType: 'Permanent',
 projectAssignment: ['Core'],
 annualCost: 65000,
 grade: 'G7'
 },
 {
 id: uuidv4(),
 staffId: 'STF-2024-003',
 fullName: 'Fatima Al-Masri',
 position: 'Field Officer',
 department: 'Operations',
 contractType: 'Fixed-Term',
 projectAssignment: ['UNHCR-SYR-002'],
 annualCost: 28000,
 grade: 'G3'
 }
 ];

 plan.existingWorkforce = mockWorkforce;
 return this.update(planId, plan);
 }

 // Save to localStorage
 private save(plans: HRAnnualPlan[]): void {
 localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
 }

 // Initialize with mock data
 private initializeMockData(): HRAnnualPlan[] {
 const mockPlans: HRAnnualPlan[] = [
 {
 id: uuidv4(),
 year: 2026,
 organization: 'Humanitarian NGO - MENA',
 status: 'approved',
 existingWorkforce: [],
 plannedPositions: [
 {
 id: uuidv4(),
 positionTitle: 'Senior Program Officer',
 department: 'Programs',
 projectProgram: 'ECHO-YEM-001',
 grade: 'G6',
 contractType: 'Fixed-Term',
 numberOfPositions: 3,
 plannedStartDate: '2026-03-01',
 plannedEndDate: '2027-02-28',
 justification: 'Expansion of Yemen emergency response program',
 fundingSource: 'Grant',
 annualSalaryCost: 48000,
 allowances: 8000,
 totalCost: 56000
 },
 {
 id: uuidv4(),
 positionTitle: 'Field Coordinator',
 department: 'Operations',
 projectProgram: 'UNHCR-SYR-002',
 grade: 'G5',
 contractType: 'Fixed-Term',
 numberOfPositions: 5,
 plannedStartDate: '2026-02-01',
 plannedEndDate: '2027-01-31',
 justification: 'New field office establishment in Syria',
 fundingSource: 'Grant',
 annualSalaryCost: 38000,
 allowances: 6000,
 totalCost: 44000
 }
 ],
 recruitmentPlan: [],
 nonSalaryCosts: [
 {
 id: uuidv4(),
 category: 'Recruitment',
 description: 'Advertising and recruitment agency fees',
 estimatedAmount: 25000,
 notes: 'For 38 new positions'
 },
 {
 id: uuidv4(),
 category: 'Training',
 description: 'Onboarding and technical training',
 estimatedAmount: 45000,
 notes: 'All new hires and capacity building'
 },
 {
 id: uuidv4(),
 category: 'Medical Insurance',
 description: 'Annual health insurance premium',
 estimatedAmount: 85000,
 notes: '285 staff members'
 }
 ],
 trainingPlan: [
 {
 id: uuidv4(),
 targetGroup: 'Program Staff',
 trainingTopic: 'Protection Mainstreaming',
 objective: 'Build capacity on protection principles',
 type: 'External',
 plannedPeriod: 'Q2 2026',
 estimatedCost: 15000,
 priority: 'High'
 },
 {
 id: uuidv4(),
 targetGroup: 'Finance Team',
 trainingTopic: 'Donor Compliance',
 objective: 'Enhance financial compliance knowledge',
 type: 'Internal',
 plannedPeriod: 'Q1 2026',
 estimatedCost: 5000,
 priority: 'High'
 }
 ],
 hrRisks: [
 {
 id: uuidv4(),
 riskDescription: 'High staff turnover due to security concerns',
 impact: 'High',
 likelihood: 'Medium',
 mitigationAction: 'Enhanced security measures and risk allowances',
 responsiblePerson: 'HR Manager',
 timeline: 'Ongoing'
 },
 {
 id: uuidv4(),
 riskDescription: 'Talent shortage in specialized roles',
 impact: 'Medium',
 likelihood: 'High',
 mitigationAction: 'Early recruitment and talent pipeline development',
 responsiblePerson: 'Recruitment Lead',
 timeline: 'Q1 2026'
 }
 ],
 approval: {
 preparedBy: 'Ahmed Hassan',
 preparationDate: '2025-11-15',
 reviewedBy: 'HR Director',
 reviewDate: '2025-11-25',
 approvedBy: 'Sarah Johnson',
 approvalDate: '2025-12-01',
 comments: 'Approved with minor adjustments to training budget'
 },
 totalPlannedPositions: 285,
 existingStaffCount: 247,
 newPositionsRequired: 38,
 estimatedTotalCost: 4250000,
 createdAt: '2025-11-15T00:00:00.000Z',
 updatedAt: '2025-12-01T00:00:00.000Z'
 },
 {
 id: uuidv4(),
 year: 2027,
 organization: 'Humanitarian NGO - MENA',
 status: 'draft',
 existingWorkforce: [],
 plannedPositions: [],
 recruitmentPlan: [],
 nonSalaryCosts: [],
 trainingPlan: [],
 hrRisks: [],
 approval: {
 preparedBy: 'Ahmed Hassan',
 preparationDate: '2026-01-10'
 },
 totalPlannedPositions: 0,
 existingStaffCount: 0,
 newPositionsRequired: 0,
 estimatedTotalCost: 0,
 createdAt: '2026-01-10T00:00:00.000Z',
 updatedAt: '2026-01-10T00:00:00.000Z'
 }
 ];

 this.save(mockPlans);
 return mockPlans;
 }
}

export const hrAnnualPlanService = new HRAnnualPlanService();
