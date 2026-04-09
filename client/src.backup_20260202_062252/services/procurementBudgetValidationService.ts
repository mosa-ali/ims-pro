// ============================================================================
// PROCUREMENT BUDGET VALIDATION SERVICE
// Real-time validation against actual project budget data
// ERP-Grade Financial Controls
// Integrated Management System (IMS)
// ============================================================================

import { projectsDatabase } from './projectsDatabase';
import type { Budget, BudgetLineItem } from '@/app/contexts/FinanceContext';

const BUDGETS_STORAGE_KEY = 'ims_budgets';
const BUDGET_LINES_STORAGE_KEY = 'ims_budget_lines';

export interface BudgetValidationResult {
  isValid: boolean;
  errorMessage?: string;
  budgetLine?: BudgetLineItem;
  availableBalance?: number;
  requestedAmount?: number;
}

class ProcurementBudgetValidationService {
  /**
   * Get all budgets from storage
   */
  private getAllBudgets(): Budget[] {
    try {
      const stored = localStorage.getItem(BUDGETS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[Budget Validation] Error reading budgets:', error);
      return [];
    }
  }

  /**
   * Get all budget lines from storage
   */
  private getAllBudgetLines(): BudgetLineItem[] {
    try {
      const stored = localStorage.getItem(BUDGET_LINES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[Budget Validation] Error reading budget lines:', error);
      return [];
    }
  }

  /**
   * Get budget lines for a specific project
   */
  getProjectBudgetLines(projectId: string): BudgetLineItem[] {
    const budgets = this.getAllBudgets();
    const budgetLines = this.getAllBudgetLines();

    // Find budgets for this project (only approved budgets)
    const projectBudgets = budgets.filter(
      b => b.projectId === projectId && b.status === 'APPROVED'
    );

    if (projectBudgets.length === 0) {
      console.log('[Budget Validation] No approved budgets found for project:', projectId);
      return [];
    }

    // Get budget lines for these budgets
    const budgetIds = projectBudgets.map(b => b.id);
    const projectBudgetLines = budgetLines.filter(bl => budgetIds.includes(bl.budgetId));

    console.log('[Budget Validation] Found budget lines for project:', projectBudgetLines.length);
    return projectBudgetLines;
  }

  /**
   * ✅ CRITICAL: Validate budget code exists in project budget
   * This is called when user enters budget code in PR form
   */
  validateBudgetCode(projectId: string, budgetCode: string): BudgetValidationResult {
    console.log('[Budget Validation] Validating budget code:', budgetCode, 'for project:', projectId);

    if (!projectId) {
      return {
        isValid: false,
        errorMessage: 'Project must be selected before entering budget code'
      };
    }

    if (!budgetCode || budgetCode.trim() === '') {
      return {
        isValid: false,
        errorMessage: 'Budget code is required'
      };
    }

    // Get project budget lines
    const projectBudgetLines = this.getProjectBudgetLines(projectId);

    if (projectBudgetLines.length === 0) {
      return {
        isValid: false,
        errorMessage: 'No approved budget found for this project. Please create and approve a budget first.'
      };
    }

    // Find budget line with matching account code
    const matchingLine = projectBudgetLines.find(
      bl => bl.accountCode.toLowerCase() === budgetCode.trim().toLowerCase()
    );

    if (!matchingLine) {
      const availableCodes = projectBudgetLines.map(bl => bl.accountCode).join(', ');
      return {
        isValid: false,
        errorMessage: `Invalid Budget Code. This code does not exist in the selected project budget. Available codes: ${availableCodes}`
      };
    }

    console.log('[Budget Validation] ✅ Budget code valid:', budgetCode);
    return {
      isValid: true,
      budgetLine: matchingLine,
      availableBalance: matchingLine.availableBalance
    };
  }

  /**
   * ✅ CRITICAL: Validate PR amount does not exceed available budget
   * This is called when user submits PR
   */
  validateBudgetBalance(
    projectId: string,
    budgetCode: string,
    requestedAmount: number
  ): BudgetValidationResult {
    console.log('[Budget Validation] Validating budget balance for:', budgetCode, 'amount:', requestedAmount);

    // First validate the code exists
    const codeValidation = this.validateBudgetCode(projectId, budgetCode);
    if (!codeValidation.isValid) {
      return codeValidation;
    }

    const budgetLine = codeValidation.budgetLine!;
    const availableBalance = budgetLine.availableBalance;

    // Check if requested amount exceeds available balance
    if (requestedAmount > availableBalance) {
      return {
        isValid: false,
        errorMessage: `Budget line ${budgetCode} has insufficient balance. Available: USD ${availableBalance.toLocaleString()}, Requested: USD ${requestedAmount.toLocaleString()}`,
        budgetLine,
        availableBalance,
        requestedAmount
      };
    }

    console.log('[Budget Validation] ✅ Budget balance sufficient');
    return {
      isValid: true,
      budgetLine,
      availableBalance,
      requestedAmount
    };
  }

  /**
   * Get formatted list of available budget codes for a project
   */
  getAvailableBudgetCodes(projectId: string): Array<{ code: string; name: string; available: number }> {
    const projectBudgetLines = this.getProjectBudgetLines(projectId);
    
    return projectBudgetLines.map(bl => ({
      code: bl.accountCode,
      name: bl.accountName,
      available: bl.availableBalance
    }));
  }

  /**
   * Get budget line details by code
   */
  getBudgetLineByCode(projectId: string, budgetCode: string): BudgetLineItem | null {
    const projectBudgetLines = this.getProjectBudgetLines(projectId);
    return projectBudgetLines.find(
      bl => bl.accountCode.toLowerCase() === budgetCode.trim().toLowerCase()
    ) || null;
  }
}

export const procurementBudgetValidationService = new ProcurementBudgetValidationService();
