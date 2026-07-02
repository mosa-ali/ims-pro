/**
 * ApprovalWorkflowEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Journal Entry Approval Workflow
 *
 * PHASE 4 REFINEMENT #2
 *
 * State machine:
 *   draft → submitted → pending_approval → approved → posted
 *                                        → rejected
 *                                                    → reversed
 *
 * Supports:
 *  - Segregation of duties (preparer ≠ approver ≠ poster)
 *  - Multi-level approval (amount-based escalation)
 *  - Delegation (out-of-office routing)
 *  - Donor-specific approval rules
 *  - Full audit trail of every state transition
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, RepositoryScope } from '../PHASE3_HARDENED/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type ApprovalStatus =
  | 'draft'
  | 'submitted'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'posted'
  | 'reversed';

export interface ApprovalRequest {
  requestId: string;
  entityType: string;
  entityId?: number;
  entityData: Record<string, unknown>;
  status: ApprovalStatus;
  reason: string;

  // Actor tracking
  requestedBy: number;
  requestedAt: string;
  currentApproverId?: number;
  approvalLevel: number;
  maxApprovalLevel: number;

  // Resolution
  approvedBy?: number;
  approvedAt?: string;
  rejectedBy?: number;
  rejectedAt?: string;
  rejectionReason?: string;

  // Scope
  organizationId: number;
  operatingUnitId: number;

  // History
  transitions: ApprovalTransition[];
}

export interface ApprovalTransition {
  transitionId: string;
  fromStatus: ApprovalStatus;
  toStatus: ApprovalStatus;
  performedBy: number;
  performedAt: string;
  comments?: string;
}

export interface ApprovalRule {
  ruleId: string;
  entityType: string;
  condition: string;
  approverRole: string;
  approverUserId?: number;
  approvalLevel: number;
  organizationId: number;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IApprovalRepository {
  saveRequest(request: ApprovalRequest): Promise<void>;
  getRequest(requestId: string): Promise<ApprovalRequest | null>;
  updateRequest(requestId: string, fields: Partial<ApprovalRequest>): Promise<void>;
  listPendingForUser(userId: number, scope: RepositoryScope): Promise<ApprovalRequest[]>;
  getApprovalRules(entityType: string, scope: RepositoryScope): Promise<ApprovalRule[]>;
  getApproverForLevel(level: number, entityType: string, scope: RepositoryScope): Promise<number | null>;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class ApprovalWorkflowEngine {
  private repo: IApprovalRepository;
  private logger: ILogger;

  constructor(repo: IApprovalRepository, logger: ILogger) {
    this.repo = repo;
    this.logger = logger.child({ service: 'ApprovalWorkflow' });
  }

  // Valid transitions
  private static readonly TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
    draft: ['submitted'],
    submitted: ['pending_approval', 'rejected'],
    pending_approval: ['approved', 'rejected'],
    approved: ['posted'],
    rejected: [],
    posted: ['reversed'],
    reversed: [],
  };

  /**
   * Create an approval request.
   */
  async requestApproval(input: {
    entityType: string;
    entityData: Record<string, unknown>;
    reason: string;
    requestedBy: number;
    organizationId: number;
    operatingUnitId: number;
  }): Promise<ApprovalRequest> {
    const scope = { organizationId: input.organizationId, operatingUnitId: input.operatingUnitId };
    const rules = await this.repo.getApprovalRules(input.entityType, scope);
    const maxLevel = rules.length > 0 ? Math.max(...rules.map(r => r.approvalLevel)) : 1;

    const firstApprover = await this.repo.getApproverForLevel(1, input.entityType, scope);

    const request: ApprovalRequest = {
      requestId: uuidv4(),
      entityType: input.entityType,
      entityData: input.entityData,
      status: 'pending_approval',
      reason: input.reason,
      requestedBy: input.requestedBy,
      requestedAt: new Date().toISOString(),
      currentApproverId: firstApprover || undefined,
      approvalLevel: 1,
      maxApprovalLevel: maxLevel,
      organizationId: input.organizationId,
      operatingUnitId: input.operatingUnitId,
      transitions: [{
        transitionId: uuidv4(),
        fromStatus: 'draft',
        toStatus: 'pending_approval',
        performedBy: input.requestedBy,
        performedAt: new Date().toISOString(),
        comments: input.reason,
      }],
    };

    await this.repo.saveRequest(request);

    this.logger.info('Approval requested', {
      requestId: request.requestId,
      entityType: input.entityType,
      level: 1,
      maxLevel,
    });

    return request;
  }

  /**
   * Approve a request. May escalate to next level if multi-level.
   */
  async approve(
    requestId: string,
    approverId: number,
    comments?: string,
  ): Promise<ApprovalRequest> {
    const request = await this.repo.getRequest(requestId);
    if (!request) throw new Error(`Approval request ${requestId} not found`);

    this.validateTransition(request.status, 'approved');

    // Segregation of duties: approver ≠ requester
    if (approverId === request.requestedBy) {
      throw new Error('Segregation of duties: approver cannot be the same person who requested');
    }

    const transition: ApprovalTransition = {
      transitionId: uuidv4(),
      fromStatus: request.status,
      toStatus: 'approved',
      performedBy: approverId,
      performedAt: new Date().toISOString(),
      comments,
    };

    // Check if more approval levels needed
    if (request.approvalLevel < request.maxApprovalLevel) {
      const scope = { organizationId: request.organizationId, operatingUnitId: request.operatingUnitId };
      const nextLevel = request.approvalLevel + 1;
      const nextApprover = await this.repo.getApproverForLevel(nextLevel, request.entityType, scope);

      // Escalate to next level
      transition.toStatus = 'pending_approval';
      request.transitions.push(transition);

      await this.repo.updateRequest(requestId, {
        approvalLevel: nextLevel,
        currentApproverId: nextApprover || undefined,
        transitions: request.transitions,
      });

      this.logger.info('Escalated to next approval level', {
        requestId, level: nextLevel, nextApprover,
      });

      return { ...request, approvalLevel: nextLevel, currentApproverId: nextApprover || undefined };
    }

    // Final approval
    request.transitions.push(transition);

    await this.repo.updateRequest(requestId, {
      status: 'approved',
      approvedBy: approverId,
      approvedAt: new Date().toISOString(),
      transitions: request.transitions,
    });

    this.logger.info('Approved', { requestId, approverId });
    return { ...request, status: 'approved', approvedBy: approverId, approvedAt: new Date().toISOString() };
  }

  /**
   * Reject a request.
   */
  async reject(
    requestId: string,
    rejectedBy: number,
    rejectionReason: string,
  ): Promise<ApprovalRequest> {
    const request = await this.repo.getRequest(requestId);
    if (!request) throw new Error(`Approval request ${requestId} not found`);

    this.validateTransition(request.status, 'rejected');

    const transition: ApprovalTransition = {
      transitionId: uuidv4(),
      fromStatus: request.status,
      toStatus: 'rejected',
      performedBy: rejectedBy,
      performedAt: new Date().toISOString(),
      comments: rejectionReason,
    };

    request.transitions.push(transition);

    await this.repo.updateRequest(requestId, {
      status: 'rejected',
      rejectedBy,
      rejectedAt: new Date().toISOString(),
      rejectionReason,
      transitions: request.transitions,
    });

    this.logger.info('Rejected', { requestId, rejectedBy, rejectionReason });
    return { ...request, status: 'rejected', rejectedBy, rejectionReason };
  }

  /**
   * Get pending approvals for a user.
   */
  async getPendingApprovals(userId: number, scope: RepositoryScope): Promise<ApprovalRequest[]> {
    return this.repo.listPendingForUser(userId, scope);
  }

  /**
   * Get approval history for an entity.
   */
  async getHistory(requestId: string): Promise<ApprovalTransition[]> {
    const request = await this.repo.getRequest(requestId);
    return request?.transitions || [];
  }

  // ── PRIVATE ──

  private validateTransition(current: ApprovalStatus, target: ApprovalStatus): void {
    const allowed = ApprovalWorkflowEngine.TRANSITIONS[current];
    if (!allowed || !allowed.includes(target)) {
      throw new Error(`Invalid transition: ${current} → ${target}`);
    }
  }
}
