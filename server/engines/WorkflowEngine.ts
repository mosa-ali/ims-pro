/**
 * server/engines/WorkflowEngine.ts
 *
 * Workflow Engine
 * Manages centralized approval workflows and approval matrices.
 *
 * Responsibilities:
 * - Define and manage approval workflows
 * - Enforce approval hierarchies
 * - Track approval status and history
 * - Generate approval notifications
 * - Support conditional approvals
 * - Audit approval trails
 */

import { and, eq, sum, gte, lte, desc, sql, isNull } from 'drizzle-orm';
import type { DB } from '../db/_scope';
import {
  payments,
  procurementInvoices,
  financeExpenditures,
} from '../../drizzle/schema';
import { getDb } from '../db';

// ── Types ────────────────────────────────────────────────────────────────────

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'withdrawn';
export type ApprovalLevel = 'supervisor' | 'manager' | 'director' | 'executive' | 'finance';

export interface ApprovalMatrix {
  id: string;
  organizationId: number;
  name: string;
  description: string;
  applicableFor: string; // 'payment', 'invoice', 'expenditure', 'budget'
  thresholds: Array<{
    minAmount: number;
    maxAmount: number;
    requiredApprovals: ApprovalLevel[];
    timeLimit: number; // hours
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRequest {
  id: string;
  organizationId: number;
  operatingUnitId: number;
  requestType: 'payment' | 'invoice' | 'expenditure' | 'budget';
  requestId: number;
  amount: number;
  requesterName: string;
  requesterRole: string;
  description: string;
  status: ApprovalStatus;
  currentApprovalLevel: ApprovalLevel;
  approvalHistory: ApprovalEvent[];
  createdAt: string;
  dueDate: string;
}

export interface ApprovalEvent {
  timestamp: string;
  approverName: string;
  approverRole: ApprovalLevel;
  action: 'approved' | 'rejected' | 'escalated' | 'commented';
  comment?: string;
  reason?: string;
}

export interface ApprovalWorkflow {
  requestId: string;
  currentStep: number;
  totalSteps: number;
  steps: Array<{
    stepNumber: number;
    approvalLevel: ApprovalLevel;
    status: ApprovalStatus;
    assignedTo?: string;
    dueDate: string;
    completedAt?: string;
  }>;
  isCompleted: boolean;
  completedAt?: string;
}

export interface ApprovalNotification {
  id: string;
  recipientId: number;
  recipientEmail: string;
  requestId: string;
  requestType: string;
  amount: number;
  action: 'approval_requested' | 'approval_approved' | 'approval_rejected' | 'approval_escalated';
  message: string;
  createdAt: string;
  readAt?: string;
}

// ── Workflow Engine ──────────────────────────────────────────────────────────

export class WorkflowEngine {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Get approval matrix for an organization.
   */
  async getApprovalMatrix(
    organizationId: number,
    applicableFor: string
  ): Promise<ApprovalMatrix | null> {
    // TODO: Fetch from database
    return {
      id: 'matrix-1',
      organizationId,
      name: 'Standard Approval Matrix',
      description: 'Standard approval workflow for payments',
      applicableFor,
      thresholds: [
        {
          minAmount: 0,
          maxAmount: 1000,
          requiredApprovals: ['supervisor'],
          timeLimit: 24,
        },
        {
          minAmount: 1000,
          maxAmount: 10000,
          requiredApprovals: ['supervisor', 'manager'],
          timeLimit: 48,
        },
        {
          minAmount: 10000,
          maxAmount: 100000,
          requiredApprovals: ['supervisor', 'manager', 'director'],
          timeLimit: 72,
        },
        {
          minAmount: 100000,
          maxAmount: Number.MAX_SAFE_INTEGER,
          requiredApprovals: ['supervisor', 'manager', 'director', 'executive'],
          timeLimit: 120,
        },
      ],
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Create approval request.
   */
  async createApprovalRequest(
    organizationId: number,
    operatingUnitId: number,
    requestType: 'payment' | 'invoice' | 'expenditure' | 'budget',
    requestId: number,
    amount: number,
    requesterName: string,
    requesterRole: string,
    description: string
  ): Promise<ApprovalRequest> {
    const matrix = await this.getApprovalMatrix(organizationId, requestType);
    if (!matrix) {
      throw new Error('No approval matrix found');
    }

    // Find applicable threshold
    const threshold = matrix.thresholds.find(
      (t) => amount >= t.minAmount && amount <= t.maxAmount
    );

    if (!threshold) {
      throw new Error('Amount exceeds maximum approval threshold');
    }

    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + threshold.timeLimit);

    const approvalRequest: ApprovalRequest = {
      id: `req-${Date.now()}`,
      organizationId,
      operatingUnitId,
      requestType,
      requestId,
      amount,
      requesterName,
      requesterRole,
      description,
      status: 'pending',
      currentApprovalLevel: threshold.requiredApprovals[0],
      approvalHistory: [],
      createdAt: new Date().toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
    };

    // TODO: Save to database

    return approvalRequest;
  }

  /**
   * Get approval request.
   */
  async getApprovalRequest(requestId: string): Promise<ApprovalRequest | null> {
    // TODO: Fetch from database
    return null;
  }

  /**
   * Approve request.
   */
  async approveRequest(
    requestId: string,
    approverName: string,
    approverRole: ApprovalLevel,
    comment?: string
  ): Promise<ApprovalRequest> {
    const request = await this.getApprovalRequest(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    // Add approval event
    request.approvalHistory.push({
      timestamp: new Date().toISOString(),
      approverName,
      approverRole,
      action: 'approved',
      comment,
    });

    // Check if all approvals are complete
    const matrix = await this.getApprovalMatrix(request.organizationId, request.requestType);
    if (!matrix) {
      throw new Error('No approval matrix found');
    }

    const threshold = matrix.thresholds.find(
      (t) => request.amount >= t.minAmount && request.amount <= t.maxAmount
    );

    if (!threshold) {
      throw new Error('Threshold not found');
    }

    // Check if all required approvals have been obtained
    const approvedByRoles = request.approvalHistory
      .filter((e) => e.action === 'approved')
      .map((e) => e.approverRole);

    const allApprovalsObtained = threshold.requiredApprovals.every((role) =>
      approvedByRoles.includes(role)
    );

    if (allApprovalsObtained) {
      request.status = 'approved';
    } else {
      // Move to next approval level
      const currentIndex = threshold.requiredApprovals.indexOf(approverRole);
      if (currentIndex < threshold.requiredApprovals.length - 1) {
        request.currentApprovalLevel = threshold.requiredApprovals[currentIndex + 1];
      }
    }

    // TODO: Save to database

    return request;
  }

  /**
   * Reject request.
   */
  async rejectRequest(
    requestId: string,
    approverName: string,
    approverRole: ApprovalLevel,
    reason: string
  ): Promise<ApprovalRequest> {
    const request = await this.getApprovalRequest(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    request.status = 'rejected';
    request.approvalHistory.push({
      timestamp: new Date().toISOString(),
      approverName,
      approverRole,
      action: 'rejected',
      reason,
    });

    // TODO: Save to database

    return request;
  }

  /**
   * Escalate request.
   */
  async escalateRequest(
    requestId: string,
    escalatedBy: string,
    reason: string
  ): Promise<ApprovalRequest> {
    const request = await this.getApprovalRequest(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    request.status = 'escalated';
    request.approvalHistory.push({
      timestamp: new Date().toISOString(),
      approverName: escalatedBy,
      approverRole: 'executive',
      action: 'escalated',
      reason,
    });

    request.currentApprovalLevel = 'executive';

    // TODO: Save to database

    return request;
  }

/**
 * Get approval workflow.
 */
async getApprovalWorkflow(
  requestId: string
): Promise<ApprovalWorkflow | null> {

  const request = await this.getApprovalRequest(requestId);

  if (!request) {
    return null;
  }

  const matrix = await this.getApprovalMatrix(
    request.organizationId,
    request.requestType
  );

  if (!matrix) {
    return null;
  }

  const threshold = matrix.thresholds.find(
    t =>
      request.amount >= t.minAmount &&
      request.amount <= t.maxAmount
  );

  if (!threshold) {
    return null;
  }

  const steps: ApprovalWorkflow["steps"] =
    threshold.requiredApprovals.map((role, index) => {

      const approvalEvent = request.approvalHistory.find(
        e => e.approverRole === role
      );

      const status: ApprovalStatus =
        approvalEvent
          ? approvalEvent.action === "approved"
            ? "approved"
            : "rejected"
          : "pending";

      return {
        stepNumber: index + 1,
        approvalLevel: role,
        status,
        assignedTo: approvalEvent?.approverName,
        dueDate: request.dueDate,
        completedAt: approvalEvent?.timestamp,
      };
    });

  return {
    requestId,

    currentStep:
      Math.max(
        1,
        steps.findIndex(s => s.status === "pending") + 1
      ),

    totalSteps: steps.length,

    steps,

    isCompleted:
      request.status === "approved" ||
      request.status === "rejected",

    completedAt:
      request.approvalHistory.at(-1)?.timestamp,
  };
}

  /**
   * Get pending approvals for a user.
   */
  async getPendingApprovalsForUser(
    organizationId: number,
    approverRole: ApprovalLevel
  ): Promise<ApprovalRequest[]> {
    // TODO: Fetch from database
    return [];
  }

  /**
   * Get approval history.
   */
  async getApprovalHistory(requestId: string): Promise<ApprovalEvent[]> {
    const request = await this.getApprovalRequest(requestId);
    if (!request) {
      return [];
    }

    return request.approvalHistory;
  }

  /**
   * Generate approval notifications.
   */
  async generateApprovalNotifications(
    organizationId: number
  ): Promise<ApprovalNotification[]> {
    const notifications: ApprovalNotification[] = [];

    // TODO: Fetch pending approvals and generate notifications

    return notifications;
  }

  /**
   * Get approval statistics.
   */
  async getApprovalStatistics(organizationId: number): Promise<{
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    averageApprovalTime: number; // hours
    bottlenecks: Array<{ level: ApprovalLevel; pendingCount: number }>;
  }> {
    // TODO: Calculate from database
    return {
      totalPending: 0,
      totalApproved: 0,
      totalRejected: 0,
      averageApprovalTime: 24,
      bottlenecks: [],
    };
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let workflowEngineInstance: WorkflowEngine | null = null;

export async function getWorkflowEngine(): Promise<WorkflowEngine> {
  if (!workflowEngineInstance) {
    const db = await getDb();
    workflowEngineInstance = new WorkflowEngine(db);
  }
  return workflowEngineInstance;
}

export const workflowEngine = {
  getApprovalMatrix: async (organizationId: number, applicableFor: string) => {
    const engine = await getWorkflowEngine();
    return engine.getApprovalMatrix(organizationId, applicableFor);
  },
  createApprovalRequest: async (
    organizationId: number,
    operatingUnitId: number,
    requestType: 'payment' | 'invoice' | 'expenditure' | 'budget',
    requestId: number,
    amount: number,
    requesterName: string,
    requesterRole: string,
    description: string
  ) => {
    const engine = await getWorkflowEngine();
    return engine.createApprovalRequest(
      organizationId,
      operatingUnitId,
      requestType,
      requestId,
      amount,
      requesterName,
      requesterRole,
      description
    );
  },
  approveRequest: async (
    requestId: string,
    approverName: string,
    approverRole: ApprovalLevel,
    comment?: string
  ) => {
    const engine = await getWorkflowEngine();
    return engine.approveRequest(requestId, approverName, approverRole, comment);
  },
  rejectRequest: async (
    requestId: string,
    approverName: string,
    approverRole: ApprovalLevel,
    reason: string
  ) => {
    const engine = await getWorkflowEngine();
    return engine.rejectRequest(requestId, approverName, approverRole, reason);
  },
  escalateRequest: async (requestId: string, escalatedBy: string, reason: string) => {
    const engine = await getWorkflowEngine();
    return engine.escalateRequest(requestId, escalatedBy, reason);
  },
  getApprovalWorkflow: async (requestId: string) => {
    const engine = await getWorkflowEngine();
    return engine.getApprovalWorkflow(requestId);
  },
  getPendingApprovalsForUser: async (organizationId: number, approverRole: ApprovalLevel) => {
    const engine = await getWorkflowEngine();
    return engine.getPendingApprovalsForUser(organizationId, approverRole);
  },
  getApprovalHistory: async (requestId: string) => {
    const engine = await getWorkflowEngine();
    return engine.getApprovalHistory(requestId);
  },
  generateApprovalNotifications: async (organizationId: number) => {
    const engine = await getWorkflowEngine();
    return engine.generateApprovalNotifications(organizationId);
  },
  getApprovalStatistics: async (organizationId: number) => {
    const engine = await getWorkflowEngine();
    return engine.getApprovalStatistics(organizationId);
  },
};
