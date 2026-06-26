import { z } from 'zod';

// ============================================================================
// ENUMS - Budget Status and Action Types
// ============================================================================

export enum SyncStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum SyncActionType {
  GENERATE_BUDGET = 'generate_budget',
  SYNC_EXPENSES = 'sync_expenses',
  VALIDATE_BUDGET = 'validate_budget',
  RECALCULATE_FINANCIALS = 'recalculate_financials',
}

// ============================================================================
// DATABASE ENTITIES - Using INTEGER IDs (NOT UUIDs)
// ============================================================================

export interface Budget {
  id: number;
  organizationId: number;
  operatingUnitId: number;
  projectId: number;
  budgetName: string;
  fiscalYear: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  totalApprovedAmount: number;
  totalActualAmount: number;
  totalRemainingAmount: number;
  versionNumber: number;
  parentBudgetId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetLine {
  id: number;
  budgetId: number;
  lineNumber: string;
  description: string;
  totalAmount: number;
  actualSpent: number;
  remainingBalance: number;
  projectId: number;
  organizationId: number;
  operatingUnitId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetItem {
  id: number;
  budgetId: number;
  budgetLineId: number;
  projectId: number;
  organizationId: number;
  operatingUnitId: number;
  lineNumber: string;
  description: string;
  totalAmount: number;
  actualSpent: number;
  commitmentAmount: number;
  remainingBalance: number;
  generatedFromBudget: boolean;
  syncStatus: SyncStatus;
  budgetVersion: number;
  lastSyncedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetSyncLog {
  id: number;
  budgetId: number;
  projectId: number;
  action: SyncActionType;
  status: 'pending' | 'completed' | 'failed';
  recordsAffected: number;
  oldTotal?: number | null;
  newTotal?: number | null;
  performedBy: string;
  performedAt: Date;
  message?: string | null;
  error?: string | null;
  createdAt: Date;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface SyncResult {
  success: boolean;
  message: string;
  recordsProcessed: number;
  recordsUpdated: number;
  errors: string[];
  duration: number;
  timestamp: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: string;
  timestamp: Date;
}

export interface FinancialSummary {
  budgetId: number;
  projectId: number;
  totalBudget: number;
  totalSpent: number;
  totalCommitted: number;
  totalAvailable: number;
  burnRate: number;
  variance: number;
  budgetVersion: number;
  lastUpdated: Date;
}

// ============================================================================
// ZOD VALIDATION SCHEMAS - INTEGER IDs ONLY (NOT UUIDs)
// ============================================================================

export const budgetIdSchema = z.coerce.number().int().positive('Budget ID must be a positive integer');
export const projectIdSchema = z.coerce.number().int().positive('Project ID must be a positive integer');
export const organizationIdSchema = z.coerce.number().int().positive('Organization ID must be a positive integer');
export const operatingUnitIdSchema = z.coerce.number().int().positive('Operating Unit ID must be a positive integer');
export const budgetLineIdSchema = z.coerce.number().int().positive('Budget Line ID must be a positive integer');

export const generateProjectBudgetInputSchema = z.object({
  budgetId: budgetIdSchema,
  projectId: projectIdSchema,
  mode: z.enum(['create_missing', 'synchronize_existing', 'full_regeneration']).default('create_missing'),
});

export const syncExpensesInputSchema = z.object({
  budgetId: budgetIdSchema,
  projectId: projectIdSchema,
});

export const validateBudgetInputSchema = z.object({
  budgetId: budgetIdSchema,
});

export const recalculateFinancialsInputSchema = z.object({
  budgetId: budgetIdSchema,
  projectId: projectIdSchema,
});

// ============================================================================
// TYPE EXPORTS - for use in functions and components
// ============================================================================

export type GenerateProjectBudgetInput = z.infer<typeof generateProjectBudgetInputSchema>;
export type SyncExpensesInput = z.infer<typeof syncExpensesInputSchema>;
export type ValidateBudgetInput = z.infer<typeof validateBudgetInputSchema>;
export type RecalculateFinancialsInput = z.infer<typeof recalculateFinancialsInputSchema>;
