export interface Budget {
  id: string;
  projectId: string;
  fiscalYear: number;
  totalApprovedAmount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt?: Date;
  generatedProjectBudget: boolean;
}

export interface BudgetItem {
  id: string;
  budgetId: string;
  projectId: string;
  lineNumber: string;
  description: string;
  totalAmount: number;
  actualSpent: number;
  commitmentAmount: number;
  syncStatus: 'pending' | 'synced' | 'out_of_sync';
  lastSyncedAt?: Date;
  generatedFromBudget: boolean;
}

export interface BudgetSyncLog {
  id: string;
  budgetId: string;
  projectId?: string;
  action: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  recordsAffected: number;
  executedBy: string;
  executedAt: Date;
  details?: Record<string, any>;
}

export interface BudgetSyncContextType {
  selectedBudget: Budget | null;
  setSelectedBudget: (budget: Budget | null) => void;
  syncHistory: BudgetSyncLog[];
  setSyncHistory: (history: BudgetSyncLog[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}
