// ============================================================================
// APPROVAL FLOW SERVICE
// Sequential approval management for PR and SR with email notifications
// ✅ WITH WORKFLOW AUTOMATION - Auto-creates QA/BA on PR approval
// Integrated Management System (IMS)
// ============================================================================

import { procurementWorkflowAutomationService } from './procurementWorkflowAutomationService';
import { procurementRequestService } from './procurementRequestService';

const APPROVAL_FLOWS_KEY = 'approval_flows_v1';
const APPROVAL_LOGS_KEY = 'approval_logs_v1';

// ============================================================================
// TYPES
// ============================================================================

export type ApprovalEntityType = 'PR' | 'SR' | 'PO' | 'PAYMENT';

export type ApprovalStepRole = 
 | 'requester'
 | 'logistics'
 | 'finance'
 | 'pm'
 | 'director';

export type ApprovalStepStatus = 
 | 'pending'
 | 'approved'
 | 'rejected'
 | 'locked';

export interface ApprovalStep {
 stepNumber: number;
 role: ApprovalStepRole;
 roleLabel: {
 en: string;
 ar: string;
 };
 status: ApprovalStepStatus;
 approverId?: string;
 approverName?: string;
 approverEmail?: string;
 approvedAt?: string;
 rejectionReason?: string;
 comments?: string;
}

export interface ApprovalFlow {
 id: string;
 entityType: ApprovalEntityType;
 entityId: string;
 entityNumber: string; // PR-2026-001, etc.
 
 currentStep: number;
 totalSteps: number;
 overallStatus: 'draft' | 'submitted' | 'in_progress' | 'approved' | 'rejected';
 
 steps: ApprovalStep[];
 
 createdAt: string;
 createdBy: string;
 updatedAt: string;
 updatedBy: string;
}

export interface ApprovalLogEntry {
 id: string;
 flowId: string;
 entityType: ApprovalEntityType;
 entityId: string;
 entityNumber: string;
 
 action: 'created' | 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'updated';
 stepNumber?: number;
 userId: string;
 userName: string;
 userRole: string;
 
 comments?: string;
 rejectionReason?: string;
 
 timestamp: string;
}

// ============================================================================
// PR APPROVAL SEQUENCE
// ============================================================================

function createPRApprovalSteps(): ApprovalStep[] {
 return [
 {
 stepNumber: 1,
 role: 'logistics',
 roleLabel: { en: 'Logistics Review', ar: 'مراجعة اللوجستيات' },
 status: 'pending'
 },
 {
 stepNumber: 2,
 role: 'finance',
 roleLabel: { en: 'Finance Review', ar: 'المراجعة المالية' },
 status: 'locked'
 },
 {
 stepNumber: 3,
 role: 'pm',
 roleLabel: { en: 'PM/Director Approval', ar: 'موافقة مدير المشروع' },
 status: 'locked'
 }
 ];
}

// ============================================================================
// SR APPROVAL SEQUENCE (NO FINANCE)
// ============================================================================

function createSRApprovalSteps(): ApprovalStep[] {
 return [
 {
 stepNumber: 1,
 role: 'logistics',
 roleLabel: { en: 'Logistics Review', ar: 'مراجعة اللوجستيات' },
 status: 'pending'
 },
 {
 stepNumber: 2,
 role: 'pm',
 roleLabel: { en: 'PM Approval', ar: 'موافقة مدير المشروع' },
 status: 'locked'
 }
 ];
}

// ============================================================================
// PO APPROVAL SEQUENCE
// ============================================================================

function createPOApprovalSteps(): ApprovalStep[] {
 return [
 {
 stepNumber: 1,
 role: 'logistics',
 roleLabel: { en: 'Logistics Verification', ar: 'التحقق اللوجستي' },
 status: 'pending'
 },
 {
 stepNumber: 2,
 role: 'finance',
 roleLabel: { en: 'Finance Approval', ar: 'الموافقة المالية' },
 status: 'locked'
 }
 ];
}

// ============================================================================
// SERVICE METHODS
// ============================================================================

export const approvalFlowService = {
 
 /**
 * Initialize approval flow for an entity
 */
 initializeFlow(
 entityType: ApprovalEntityType,
 entityId: string,
 entityNumber: string,
 userId: string,
 userName: string
 ): ApprovalFlow {
 // Check if flow already exists
 const existing = this.getFlowByEntity(entityType, entityId);
 if (existing) {
 return existing;
 }

 let steps: ApprovalStep[];
 switch (entityType) {
 case 'PR':
 steps = createPRApprovalSteps();
 break;
 case 'SR':
 steps = createSRApprovalSteps();
 break;
 case 'PO':
 steps = createPOApprovalSteps();
 break;
 default:
 steps = createPRApprovalSteps();
 }

 const flow: ApprovalFlow = {
 id: `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 entityType,
 entityId,
 entityNumber,
 currentStep: 0,
 totalSteps: steps.length,
 overallStatus: 'draft',
 steps,
 createdAt: new Date().toISOString(),
 createdBy: userId,
 updatedAt: new Date().toISOString(),
 updatedBy: userId
 };

 this.saveFlow(flow);
 this.logAction(flow.id, entityType, entityId, entityNumber, 'created', userId, userName, 'System');

 return flow;
 },

 /**
 * Submit for approval (start the flow)
 */
 submitForApproval(
 flowId: string,
 userId: string,
 userName: string
 ): { success: boolean; error?: string; emailTrigger?: any } {
 const flow = this.getFlowById(flowId);
 if (!flow) {
 return { success: false, error: 'Flow not found' };
 }

 if (flow.overallStatus !== 'draft') {
 return { success: false, error: 'Flow already submitted' };
 }

 // Activate first step
 flow.steps[0].status = 'pending';
 flow.currentStep = 1;
 flow.overallStatus = 'submitted';
 flow.updatedAt = new Date().toISOString();
 flow.updatedBy = userId;

 this.saveFlow(flow);
 this.logAction(flow.id, flow.entityType, flow.entityId, flow.entityNumber, 'submitted', userId, userName, 'Requester');

 // Email notification to first approver (Logistics)
 const emailTrigger = {
 to: flow.steps[0].role,
 subject: `${flow.entityType} ${flow.entityNumber} - Pending ${flow.steps[0].roleLabel.en}`,
 entityNumber: flow.entityNumber,
 entityType: flow.entityType,
 stepNumber: 1
 };

 return { success: true, emailTrigger };
 },

 /**
 * Approve a step
 */
 approveStep(
 flowId: string,
 stepNumber: number,
 userId: string,
 userName: string,
 userRole: string,
 comments?: string
 ): { success: boolean; error?: string; completed?: boolean; emailTrigger?: any } {
 const flow = this.getFlowById(flowId);
 if (!flow) {
 return { success: false, error: 'Flow not found' };
 }

 const step = flow.steps.find(s => s.stepNumber === stepNumber);
 if (!step) {
 return { success: false, error: 'Step not found' };
 }

 if (step.status !== 'pending') {
 return { success: false, error: 'Step is not pending approval' };
 }

 // Approve current step
 step.status = 'approved';
 step.approverId = userId;
 step.approverName = userName;
 step.approvedAt = new Date().toISOString();
 step.comments = comments;

 // Check if there's a next step
 const nextStepIndex = flow.steps.findIndex(s => s.stepNumber === stepNumber + 1);
 
 let emailTrigger;
 let completed = false;

 if (nextStepIndex >= 0) {
 // Unlock and activate next step
 flow.steps[nextStepIndex].status = 'pending';
 flow.currentStep = stepNumber + 1;
 flow.overallStatus = 'in_progress';

 // Email to next approver
 emailTrigger = {
 to: flow.steps[nextStepIndex].role,
 subject: `${flow.entityType} ${flow.entityNumber} - Pending ${flow.steps[nextStepIndex].roleLabel.en}`,
 entityNumber: flow.entityNumber,
 entityType: flow.entityType,
 stepNumber: stepNumber + 1
 };
 } else {
 // All steps approved
 flow.overallStatus = 'approved';
 flow.currentStep = flow.totalSteps;
 completed = true;

 // Email to requester and all approvers
 emailTrigger = {
 to: 'all',
 subject: `${flow.entityType} ${flow.entityNumber} - Approved`,
 entityNumber: flow.entityNumber,
 entityType: flow.entityType
 };

 // ✅ WORKFLOW AUTOMATION - Auto-create QA/BA on PR approval
 if (flow.entityType === 'PR') {
 try {
 console.log('🚀 [Approval] Triggering workflow automation for PR:', flow.entityId);
 procurementWorkflowAutomationService.onPRApproved(flow.entityId, userId);
 
 // Update PR status to approved
 procurementRequestService.updateRequest(flow.entityId, { status: 'approved' });
 } catch (error) {
 console.error('❌ [Approval] Workflow automation failed:', error);
 }
 }
 }

 flow.updatedAt = new Date().toISOString();
 flow.updatedBy = userId;

 this.saveFlow(flow);
 this.logAction(flow.id, flow.entityType, flow.entityId, flow.entityNumber, 'approved', userId, userName, userRole, stepNumber, comments);

 return { success: true, completed, emailTrigger };
 },

 /**
 * Reject a step
 */
 rejectStep(
 flowId: string,
 stepNumber: number,
 userId: string,
 userName: string,
 userRole: string,
 reason: string
 ): { success: boolean; error?: string; emailTrigger?: any } {
 const flow = this.getFlowById(flowId);
 if (!flow) {
 return { success: false, error: 'Flow not found' };
 }

 const step = flow.steps.find(s => s.stepNumber === stepNumber);
 if (!step) {
 return { success: false, error: 'Step not found' };
 }

 if (step.status !== 'pending') {
 return { success: false, error: 'Step is not pending approval' };
 }

 if (!reason || reason.trim() === '') {
 return { success: false, error: 'Rejection reason is mandatory' };
 }

 // Reject step
 step.status = 'rejected';
 step.approverId = userId;
 step.approverName = userName;
 step.approvedAt = new Date().toISOString();
 step.rejectionReason = reason;

 // Mark entire flow as rejected
 flow.overallStatus = 'rejected';
 flow.updatedAt = new Date().toISOString();
 flow.updatedBy = userId;

 this.saveFlow(flow);
 this.logAction(flow.id, flow.entityType, flow.entityId, flow.entityNumber, 'rejected', userId, userName, userRole, stepNumber, undefined, reason);

 // Email to requester and previous approvers
 const emailTrigger = {
 to: 'requester_and_approvers',
 subject: `${flow.entityType} ${flow.entityNumber} - Rejected`,
 entityNumber: flow.entityNumber,
 entityType: flow.entityType,
 reason
 };

 return { success: true, emailTrigger };
 },

 /**
 * Get flow by entity
 */
 getFlowByEntity(entityType: ApprovalEntityType, entityId: string): ApprovalFlow | null {
 const all = this.getAllFlows();
 return all.find(f => f.entityType === entityType && f.entityId === entityId) || null;
 },

 /**
 * Get flow by ID
 */
 getFlowById(flowId: string): ApprovalFlow | null {
 const all = this.getAllFlows();
 return all.find(f => f.id === flowId) || null;
 },

 /**
 * Get all flows
 */
 getAllFlows(): ApprovalFlow[] {
 const data = localStorage.getItem(APPROVAL_FLOWS_KEY);
 return data ? JSON.parse(data) : [];
 },

 /**
 * Save flow
 */
 saveFlow(flow: ApprovalFlow): void {
 const all = this.getAllFlows();
 const index = all.findIndex(f => f.id === flow.id);

 if (index >= 0) {
 all[index] = flow;
 } else {
 all.push(flow);
 }

 localStorage.setItem(APPROVAL_FLOWS_KEY, JSON.stringify(all));
 },

 /**
 * Log action
 */
 logAction(
 flowId: string,
 entityType: ApprovalEntityType,
 entityId: string,
 entityNumber: string,
 action: ApprovalLogEntry['action'],
 userId: string,
 userName: string,
 userRole: string,
 stepNumber?: number,
 comments?: string,
 rejectionReason?: string
 ): void {
 const entry: ApprovalLogEntry = {
 id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 flowId,
 entityType,
 entityId,
 entityNumber,
 action,
 stepNumber,
 userId,
 userName,
 userRole,
 comments,
 rejectionReason,
 timestamp: new Date().toISOString()
 };

 const all = this.getAllLogs();
 all.push(entry);
 localStorage.setItem(APPROVAL_LOGS_KEY, JSON.stringify(all));
 },

 /**
 * Get logs for entity
 */
 getLogsForEntity(entityType: ApprovalEntityType, entityId: string): ApprovalLogEntry[] {
 const all = this.getAllLogs();
 return all
 .filter(log => log.entityType === entityType && log.entityId === entityId)
 .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
 },

 /**
 * Get all logs
 */
 getAllLogs(): ApprovalLogEntry[] {
 const data = localStorage.getItem(APPROVAL_LOGS_KEY);
 return data ? JSON.parse(data) : [];
 },

 /**
 * Check if user can approve current step
 */
 canUserApprove(flowId: string, userRole: string): boolean {
 const flow = this.getFlowById(flowId);
 if (!flow || flow.overallStatus !== 'submitted' && flow.overallStatus !== 'in_progress') {
 return false;
 }

 const currentStep = flow.steps.find(s => s.status === 'pending');
 if (!currentStep) {
 return false;
 }

 // Map user role to approval role
 const roleMapping: Record<string, ApprovalStepRole[]> = {
 'Logistics Officer': ['logistics'],
 'Logistics Manager': ['logistics'],
 'Finance Officer': ['finance'],
 'Finance Manager': ['finance'],
 'Project Manager': ['pm'],
 'Director': ['pm', 'director'],
 'Administrator': ['logistics', 'finance', 'pm', 'director']
 };

 const allowedRoles = roleMapping[userRole] || [];
 return allowedRoles.includes(currentStep.role);
 }
};