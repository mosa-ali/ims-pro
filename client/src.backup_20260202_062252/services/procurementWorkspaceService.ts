// ============================================================================
// PROCUREMENT WORKSPACE SERVICE
// Manages PR-centric procurement workflow with auto-creation
// ============================================================================

import type { 
  ProcurementRequest, 
  QuotationAnalysis, 
  BidsAnalysis,
  PurchaseOrder,
  GoodsReceiptNote 
} from '@/app/types/logistics.types';
import { determineProcurementProcess } from '@/app/types/logistics.types';

const WORKSPACE_STORAGE_KEY = 'procurement_workspaces_v1';

// ============================================================================
// WORKSPACE DATA STRUCTURE
// ============================================================================

export interface ProcurementWorkspace {
  prId: string;
  prNumber: string;
  processType: 'single_quotation' | 'multiple_quotations' | 'extended_quotations' | 'tender';
  requiresCBA: boolean;
  
  // Step Status
  criteriaStatus: 'not_started' | 'in_progress' | 'completed';
  analysisStatus: 'not_started' | 'in_progress' | 'completed';
  poStatus: 'not_started' | 'in_progress' | 'completed';
  grnStatus: 'not_started' | 'in_progress' | 'completed';
  deliveryStatus: 'not_started' | 'in_progress' | 'completed';
  paymentStatus: 'not_started' | 'in_progress' | 'completed';
  
  // Auto-Created IDs
  qaId?: string;
  baId?: string;
  poId?: string;
  grnId?: string;
  deliveryNoteId?: string;
  
  // Timestamps
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

// ============================================================================
// SERVICE METHODS
// ============================================================================

export const procurementWorkspaceService = {
  
  /**
   * Initialize workspace for an approved PR
   * This creates the workspace structure and all placeholder records
   */
  initializeWorkspace(pr: ProcurementRequest, userId: string): ProcurementWorkspace {
    // Check if workspace already exists
    const existing = this.getWorkspaceByPRId(pr.id);
    if (existing) {
      console.log('[Workspace] Found existing workspace for PR:', pr.prNumber);
      return existing;
    }

    // Determine process type based on cost
    const processInfo = determineProcurementProcess(pr.totalEstimatedCost);

    // Create workspace
    const workspace: ProcurementWorkspace = {
      prId: pr.id,
      prNumber: pr.prNumber,
      processType: processInfo.processType,
      requiresCBA: processInfo.requiresCBA,
      
      criteriaStatus: 'not_started',
      analysisStatus: 'not_started',
      poStatus: 'not_started',
      grnStatus: 'not_started',
      deliveryStatus: 'not_started',
      paymentStatus: 'not_started',
      
      createdAt: new Date().toISOString(),
      createdBy: userId,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    // Save workspace
    this.saveWorkspace(workspace);

    console.log('[Workspace] ✅ Initialized new workspace for PR:', pr.prNumber);
    console.log('[Workspace] Process Type:', processInfo.processType);
    console.log('[Workspace] Requires CBA:', processInfo.requiresCBA);

    return workspace;
  },

  /**
   * Get workspace by PR ID
   */
  getWorkspaceByPRId(prId: string): ProcurementWorkspace | null {
    const all = this.getAllWorkspaces();
    return all.find(w => w.prId === prId) || null;
  },

  /**
   * Get all workspaces
   */
  getAllWorkspaces(): ProcurementWorkspace[] {
    const data = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  /**
   * Save workspace
   */
  saveWorkspace(workspace: ProcurementWorkspace): void {
    const all = this.getAllWorkspaces();
    const index = all.findIndex(w => w.prId === workspace.prId);

    if (index >= 0) {
      all[index] = workspace;
    } else {
      all.push(workspace);
    }

    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(all));
  },

  /**
   * Update workspace status
   */
  updateStatus(
    prId: string, 
    step: 'criteria' | 'analysis' | 'po' | 'grn' | 'delivery' | 'payment',
    status: 'not_started' | 'in_progress' | 'completed',
    userId: string
  ): boolean {
    const workspace = this.getWorkspaceByPRId(prId);
    if (!workspace) return false;

    const statusKey = `${step}Status` as keyof ProcurementWorkspace;
    (workspace as any)[statusKey] = status;
    workspace.updatedAt = new Date().toISOString();
    workspace.updatedBy = userId;

    this.saveWorkspace(workspace);
    return true;
  },

  /**
   * Link QA/BA to workspace
   */
  linkAnalysis(prId: string, analysisId: string, isCBA: boolean, userId: string): boolean {
    const workspace = this.getWorkspaceByPRId(prId);
    if (!workspace) return false;

    if (isCBA) {
      workspace.baId = analysisId;
    } else {
      workspace.qaId = analysisId;
    }

    workspace.analysisStatus = 'in_progress';
    workspace.updatedAt = new Date().toISOString();
    workspace.updatedBy = userId;

    this.saveWorkspace(workspace);
    return true;
  },

  /**
   * Link PO to workspace
   */
  linkPO(prId: string, poId: string, userId: string): boolean {
    const workspace = this.getWorkspaceByPRId(prId);
    if (!workspace) return false;

    workspace.poId = poId;
    workspace.poStatus = 'in_progress';
    workspace.updatedAt = new Date().toISOString();
    workspace.updatedBy = userId;

    this.saveWorkspace(workspace);
    return true;
  },

  /**
   * Link GRN to workspace
   */
  linkGRN(prId: string, grnId: string, userId: string): boolean {
    const workspace = this.getWorkspaceByPRId(prId);
    if (!workspace) return false;

    workspace.grnId = grnId;
    workspace.grnStatus = 'in_progress';
    workspace.updatedAt = new Date().toISOString();
    workspace.updatedBy = userId;

    this.saveWorkspace(workspace);
    return true;
  }
};
