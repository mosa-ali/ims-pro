/**
 * ============================================================================
 * FINANCE CONTEXT
 * Centralized state management for Finance Module
 * ============================================================================
 * 
 * COMPLIANCE:
 * - International financial standards
 * - Audit-ready
 * - Full traceability
 * 
 * ARCHITECTURE:
 * 1. ChartOfAccounts → Account structure
 * 2. Budgets → Budget headers
 * 3. BudgetLineItems → Budget line details
 * 4. Expenditures → Actual spending
 * 5. ExchangeRates → InfoEuro rates
 * 6. FinancialApprovals → Approval workflow
 * ============================================================================
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';

// ============================================================================
// AUTHORITATIVE DATA INTERFACES
// ============================================================================

/**
 * Chart of Accounts - Hierarchical accounting structure
 * IMMUTABLE: Account codes cannot be changed after use
 */
export interface ChartOfAccount {
  id: string;
  accountCode: string; // Unique, immutable after transactions exist
  accountName: string;
  accountNameAr?: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EXPENSE' | 'INCOME' | 'EQUITY';
  parentAccountId?: string; // For hierarchical structure
  level: number; // 1 = top level, 2 = sub-account, etc.
  status: 'ACTIVE' | 'INACTIVE';
  organizationId: string;
  isUsedInTransactions: boolean; // Flag to prevent deletion
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string; // Soft delete
}

/**
 * Budget Header - Main budget record
 * VERSIONED: Revisions create new versions
 */
export interface Budget {
  id: string;
  budgetNumber: string; // Auto-generated unique identifier
  organizationId: string;
  projectId?: string; // Optional: Can be org-level or project-level
  grantId?: string; // Optional: Link to specific grant
  budgetName: string;
  budgetNameAr?: string;
  fiscalYear: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  totalBudgetOriginalCurrency: number;
  originalCurrency: string; // ISO code (EUR, USD, YER, etc.)
  totalBudgetUSD: number; // Always store USD equivalent
  exchangeRateUsed: number; // Rate at time of budget creation
  exchangeRateSource: string; // 'InfoEuro', 'Manual', etc.
  exchangeRateDate: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REVISED';
  version: number; // 1, 2, 3... for revisions
  parentBudgetId?: string; // Link to original if this is a revision
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Budget Line Item - Individual budget line
 * LINKED: Must map to Chart of Accounts
 */
export interface BudgetLineItem {
  id: string;
  budgetId: string;
  accountCode: string; // MUST exist in ChartOfAccounts
  accountName: string; // Cached from CoA for performance
  costCategory?: string; // e.g., "Personnel", "Equipment", "Travel"
  description: string;
  descriptionAr?: string;
  quantity?: number;
  unitCost?: number;
  allocatedAmountOriginalCurrency: number;
  allocatedAmountUSD: number;
  committedAmount: number; // Amount committed but not spent
  spentAmount: number; // Actual expenditures
  availableBalance: number; // Calculated: allocated - committed - spent
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Expenditure - Actual spending record
 * WORKFLOW: Draft → Submitted → Approved → Paid
 */
export interface Expenditure {
  id: string;
  expenditureNumber: string; // Auto-generated unique identifier
  organizationId: string;
  projectId?: string;
  budgetId: string;
  budgetLineItemId: string;
  accountCode: string; // From ChartOfAccounts
  expenditureDate: string;
  description: string;
  descriptionAr?: string;
  amountOriginalCurrency: number;
  originalCurrency: string;
  amountUSD: number;
  exchangeRateUsed: number;
  exchangeRateSource: string;
  exchangeRateDate: string;
  vendor?: string;
  invoiceNumber?: string;
  supportingDocumentUrl?: string;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'MOBILE_MONEY' | 'OTHER';
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  paidBy?: string;
  paidAt?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Exchange Rate - InfoEuro rates
 * SOURCE: https://commission.europa.eu/funding-tenders/procedures-guidelines-tenders/information-contractors-and-beneficiaries/exchange-rate-inforeuro_en
 */
export interface ExchangeRate {
  id: string;
  currency: string; // ISO code
  rateToUSD: number;
  rateToEUR: number;
  effectiveDate: string;
  source: 'InfoEuro' | 'Manual' | 'Central_Bank';
  importedBy?: string;
  importedAt?: string;
  notes?: string;
  createdAt: string;
}

/**
 * Financial Approval - Audit trail for approvals
 */
export interface FinancialApproval {
  id: string;
  entityType: 'BUDGET' | 'EXPENDITURE';
  entityId: string;
  action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'REVISE';
  performedBy: string;
  performedAt: string;
  comments?: string;
  previousStatus: string;
  newStatus: string;
}

// ============================================================================
// CONTEXT INTERFACE
// ============================================================================

interface FinanceContextType {
  // Chart of Accounts
  chartOfAccounts: ChartOfAccount[];
  activeAccounts: ChartOfAccount[];
  createAccount: (account: Omit<ChartOfAccount, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateAccount: (id: string, updates: Partial<ChartOfAccount>) => void;
  deactivateAccount: (id: string) => void;
  getAccountByCode: (code: string) => ChartOfAccount | undefined;
  getChildAccounts: (parentId: string) => ChartOfAccount[];
  
  // Budgets
  budgets: Budget[];
  activeBudgets: Budget[];
  createBudget: (budget: Omit<Budget, 'id' | 'budgetNumber' | 'version' | 'createdAt' | 'updatedAt'>) => string;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  submitBudget: (id: string) => void;
  approveBudget: (id: string, approvedBy: string) => void;
  rejectBudget: (id: string, reason: string, rejectedBy: string) => void;
  reviseBudget: (id: string) => string; // Creates new version
  deleteBudget: (id: string) => void;
  
  // Budget Line Items
  budgetLineItems: BudgetLineItem[];
  getBudgetLines: (budgetId: string) => BudgetLineItem[];
  createBudgetLine: (line: Omit<BudgetLineItem, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateBudgetLine: (id: string, updates: Partial<BudgetLineItem>) => void;
  deleteBudgetLine: (id: string) => void;
  recalculateBudgetLineTotals: (budgetId: string) => void;
  
  // Expenditures
  expenditures: Expenditure[];
  createExpenditure: (expenditure: Omit<Expenditure, 'id' | 'expenditureNumber' | 'createdAt' | 'updatedAt'>) => string;
  updateExpenditure: (id: string, updates: Partial<Expenditure>) => void;
  submitExpenditure: (id: string) => void;
  approveExpenditure: (id: string, approvedBy: string) => void;
  rejectExpenditure: (id: string, reason: string, rejectedBy: string) => void;
  markExpenditurePaid: (id: string, paidBy: string) => void;
  deleteExpenditure: (id: string) => void;
  
  // Exchange Rates
  exchangeRates: ExchangeRate[];
  getExchangeRate: (currency: string, date: string) => ExchangeRate | undefined;
  createExchangeRate: (rate: Omit<ExchangeRate, 'id' | 'createdAt'>) => string;
  
  // Financial Approvals
  approvals: FinancialApproval[];
  getApprovalsForEntity: (entityType: 'BUDGET' | 'EXPENDITURE', entityId: string) => FinancialApproval[];
  
  // Aggregations (for Overview)
  getTotalBudget: (projectId?: string) => number;
  getTotalSpent: (projectId?: string) => number;
  getPendingApprovals: () => number;
  getBudgetUtilizationRate: (projectId?: string) => number;
  
  // Utilities
  loading: boolean;
  refresh: () => void;
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetLineItems, setBudgetLineItems] = useState<BudgetLineItem[]>([]);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [approvals, setApprovals] = useState<FinancialApproval[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from localStorage (simulates database)
  const loadData = () => {
    setLoading(true);
    try {
      const coaData = localStorage.getItem('pms_chart_of_accounts');
      const budgetsData = localStorage.getItem('pms_budgets');
      const budgetLinesData = localStorage.getItem('pms_budget_line_items');
      const expendituresData = localStorage.getItem('pms_expenditures');
      const exchangeRatesData = localStorage.getItem('pms_exchange_rates');
      const approvalsData = localStorage.getItem('pms_financial_approvals');

      setChartOfAccounts(coaData ? JSON.parse(coaData) : []);
      setBudgets(budgetsData ? JSON.parse(budgetsData) : []);
      setBudgetLineItems(budgetLinesData ? JSON.parse(budgetLinesData) : []);
      setExpenditures(expendituresData ? JSON.parse(expendituresData) : []);
      setExchangeRates(exchangeRatesData ? JSON.parse(exchangeRatesData) : []);
      setApprovals(approvalsData ? JSON.parse(approvalsData) : []);
    } catch (error) {
      console.error('Failed to load finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentOrganization?.id]);

  // Save data to localStorage
  const saveChartOfAccounts = (data: ChartOfAccount[]) => {
    setChartOfAccounts(data);
    localStorage.setItem('pms_chart_of_accounts', JSON.stringify(data));
  };

  const saveBudgets = (data: Budget[]) => {
    setBudgets(data);
    localStorage.setItem('pms_budgets', JSON.stringify(data));
  };

  const saveBudgetLineItems = (data: BudgetLineItem[]) => {
    setBudgetLineItems(data);
    localStorage.setItem('pms_budget_line_items', JSON.stringify(data));
  };

  const saveExpenditures = (data: Expenditure[]) => {
    setExpenditures(data);
    localStorage.setItem('pms_expenditures', JSON.stringify(data));
  };

  const saveExchangeRates = (data: ExchangeRate[]) => {
    setExchangeRates(data);
    localStorage.setItem('pms_exchange_rates', JSON.stringify(data));
  };

  const saveApprovals = (data: FinancialApproval[]) => {
    setApprovals(data);
    localStorage.setItem('pms_financial_approvals', JSON.stringify(data));
  };

  // ============================================================================
  // CHART OF ACCOUNTS OPERATIONS
  // ============================================================================

  const createAccount = (account: Omit<ChartOfAccount, 'id' | 'createdAt' | 'updatedAt'>): string => {
    const id = `coa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newAccount: ChartOfAccount = {
      ...account,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveChartOfAccounts([...chartOfAccounts, newAccount]);
    return id;
  };

  const updateAccount = (id: string, updates: Partial<ChartOfAccount>) => {
    const account = chartOfAccounts.find(a => a.id === id);
    if (!account) return;

    // Prevent changing account code if used in transactions
    if (updates.accountCode && account.isUsedInTransactions) {
      throw new Error('Cannot change account code after it has been used in transactions');
    }

    const updated = chartOfAccounts.map(a =>
      a.id === id
        ? { ...a, ...updates, updatedAt: new Date().toISOString() }
        : a
    );
    saveChartOfAccounts(updated);
  };

  const deactivateAccount = (id: string) => {
    updateAccount(id, { status: 'INACTIVE', deletedAt: new Date().toISOString() });
  };

  const getAccountByCode = (code: string) => {
    return chartOfAccounts.find(a => a.accountCode === code && a.status === 'ACTIVE');
  };

  const getChildAccounts = (parentId: string) => {
    return chartOfAccounts.filter(a => a.parentAccountId === parentId && a.status === 'ACTIVE');
  };

  const activeAccounts = chartOfAccounts.filter(a => a.status === 'ACTIVE' && !a.deletedAt);

  // ============================================================================
  // BUDGET OPERATIONS
  // ============================================================================

  const createBudget = (budget: Omit<Budget, 'id' | 'budgetNumber' | 'version' | 'createdAt' | 'updatedAt'>): string => {
    const id = `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const budgetNumber = `BDG-${new Date().getFullYear()}-${String(budgets.length + 1).padStart(4, '0')}`;
    
    const newBudget: Budget = {
      ...budget,
      id,
      budgetNumber,
      version: 1,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    saveBudgets([...budgets, newBudget]);
    return id;
  };

  const updateBudget = (id: string, updates: Partial<Budget>) => {
    const budget = budgets.find(b => b.id === id);
    if (!budget) return;

    // Prevent editing approved budgets
    if (budget.status === 'APPROVED' && updates.status !== 'REVISED') {
      throw new Error('Cannot edit approved budget. Create a revision instead.');
    }

    const updated = budgets.map(b =>
      b.id === id
        ? { ...b, ...updates, updatedAt: new Date().toISOString() }
        : b
    );
    saveBudgets(updated);
  };

  const submitBudget = (id: string) => {
    updateBudget(id, {
      status: 'SUBMITTED',
      submittedBy: user?.id,
      submittedAt: new Date().toISOString()
    });

    // Create approval record
    const budget = budgets.find(b => b.id === id);
    if (budget) {
      const approval: FinancialApproval = {
        id: `approval_${Date.now()}`,
        entityType: 'BUDGET',
        entityId: id,
        action: 'SUBMIT',
        performedBy: user?.id || '',
        performedAt: new Date().toISOString(),
        previousStatus: 'DRAFT',
        newStatus: 'SUBMITTED'
      };
      saveApprovals([...approvals, approval]);
    }
  };

  const approveBudget = (id: string, approvedBy: string) => {
    updateBudget(id, {
      status: 'APPROVED',
      approvedBy,
      approvedAt: new Date().toISOString()
    });

    const approval: FinancialApproval = {
      id: `approval_${Date.now()}`,
      entityType: 'BUDGET',
      entityId: id,
      action: 'APPROVE',
      performedBy: approvedBy,
      performedAt: new Date().toISOString(),
      previousStatus: 'SUBMITTED',
      newStatus: 'APPROVED'
    };
    saveApprovals([...approvals, approval]);
  };

  const rejectBudget = (id: string, reason: string, rejectedBy: string) => {
    updateBudget(id, {
      status: 'REJECTED',
      rejectedBy,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason
    });

    const approval: FinancialApproval = {
      id: `approval_${Date.now()}`,
      entityType: 'BUDGET',
      entityId: id,
      action: 'REJECT',
      performedBy: rejectedBy,
      performedAt: new Date().toISOString(),
      comments: reason,
      previousStatus: 'SUBMITTED',
      newStatus: 'REJECTED'
    };
    saveApprovals([...approvals, approval]);
  };

  const reviseBudget = (id: string): string => {
    const originalBudget = budgets.find(b => b.id === id);
    if (!originalBudget) throw new Error('Budget not found');

    const newId = `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const revisedBudget: Budget = {
      ...originalBudget,
      id: newId,
      version: originalBudget.version + 1,
      parentBudgetId: id,
      status: 'DRAFT',
      submittedBy: undefined,
      submittedAt: undefined,
      approvedBy: undefined,
      approvedAt: undefined,
      rejectedBy: undefined,
      rejectedAt: undefined,
      rejectionReason: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveBudgets([...budgets, revisedBudget]);

    // Copy budget line items
    const originalLines = budgetLineItems.filter(l => l.budgetId === id);
    const newLines = originalLines.map(line => ({
      ...line,
      id: `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      budgetId: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    saveBudgetLineItems([...budgetLineItems, ...newLines]);

    return newId;
  };

  const deleteBudget = (id: string) => {
    const budget = budgets.find(b => b.id === id);
    if (budget?.status === 'APPROVED') {
      throw new Error('Cannot delete approved budget');
    }

    // Soft delete
    updateBudget(id, { deletedAt: new Date().toISOString() });
  };

  const activeBudgets = budgets.filter(b => !b.deletedAt);

  // ============================================================================
  // BUDGET LINE ITEMS OPERATIONS
  // ============================================================================

  const getBudgetLines = (budgetId: string) => {
    return budgetLineItems.filter(l => l.budgetId === budgetId && !l.deletedAt);
  };

  const createBudgetLine = (line: Omit<BudgetLineItem, 'id' | 'createdAt' | 'updatedAt'>): string => {
    const id = `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newLine: BudgetLineItem = {
      ...line,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveBudgetLineItems([...budgetLineItems, newLine]);
    recalculateBudgetLineTotals(line.budgetId);
    return id;
  };

  const updateBudgetLine = (id: string, updates: Partial<BudgetLineItem>) => {
    const line = budgetLineItems.find(l => l.id === id);
    if (!line) return;

    const updated = budgetLineItems.map(l =>
      l.id === id
        ? { ...l, ...updates, updatedAt: new Date().toISOString() }
        : l
    );
    saveBudgetLineItems(updated);
    
    if (line.budgetId) {
      recalculateBudgetLineTotals(line.budgetId);
    }
  };

  const deleteBudgetLine = (id: string) => {
    const line = budgetLineItems.find(l => l.id === id);
    if (!line) return;

    const updated = budgetLineItems.map(l =>
      l.id === id
        ? { ...l, deletedAt: new Date().toISOString() }
        : l
    );
    saveBudgetLineItems(updated);
    recalculateBudgetLineTotals(line.budgetId);
  };

  const recalculateBudgetLineTotals = (budgetId: string) => {
    const lines = budgetLineItems.filter(l => l.budgetId === budgetId && !l.deletedAt);
    const totalUSD = lines.reduce((sum, l) => sum + l.allocatedAmountUSD, 0);
    
    updateBudget(budgetId, { totalBudgetUSD: totalUSD });
  };

  // ============================================================================
  // EXPENDITURE OPERATIONS
  // ============================================================================

  const createExpenditure = (expenditure: Omit<Expenditure, 'id' | 'expenditureNumber' | 'createdAt' | 'updatedAt'>): string => {
    const id = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expenditureNumber = `EXP-${new Date().getFullYear()}-${String(expenditures.length + 1).padStart(5, '0')}`;
    
    const newExpenditure: Expenditure = {
      ...expenditure,
      id,
      expenditureNumber,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    saveExpenditures([...expenditures, newExpenditure]);
    return id;
  };

  const updateExpenditure = (id: string, updates: Partial<Expenditure>) => {
    const exp = expenditures.find(e => e.id === id);
    if (!exp) return;

    if (exp.status === 'APPROVED' || exp.status === 'PAID') {
      throw new Error('Cannot edit approved or paid expenditure');
    }

    const updated = expenditures.map(e =>
      e.id === id
        ? { ...e, ...updates, updatedAt: new Date().toISOString() }
        : e
    );
    saveExpenditures(updated);
  };

  const submitExpenditure = (id: string) => {
    updateExpenditure(id, {
      status: 'SUBMITTED',
      submittedBy: user?.id,
      submittedAt: new Date().toISOString()
    });
  };

  const approveExpenditure = (id: string, approvedBy: string) => {
    const exp = expenditures.find(e => e.id === id);
    if (!exp) return;

    // Update expenditure
    updateExpenditure(id, {
      status: 'APPROVED',
      approvedBy,
      approvedAt: new Date().toISOString()
    });

    // Update budget line spent amount
    const budgetLine = budgetLineItems.find(l => l.id === exp.budgetLineItemId);
    if (budgetLine) {
      updateBudgetLine(budgetLine.id, {
        spentAmount: budgetLine.spentAmount + exp.amountUSD,
        availableBalance: budgetLine.allocatedAmountUSD - budgetLine.committedAmount - (budgetLine.spentAmount + exp.amountUSD)
      });
    }

    // Create approval record
    const approval: FinancialApproval = {
      id: `approval_${Date.now()}`,
      entityType: 'EXPENDITURE',
      entityId: id,
      action: 'APPROVE',
      performedBy: approvedBy,
      performedAt: new Date().toISOString(),
      previousStatus: 'SUBMITTED',
      newStatus: 'APPROVED'
    };
    saveApprovals([...approvals, approval]);
  };

  const rejectExpenditure = (id: string, reason: string, rejectedBy: string) => {
    updateExpenditure(id, {
      status: 'REJECTED',
      rejectedBy,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason
    });
  };

  const markExpenditurePaid = (id: string, paidBy: string) => {
    updateExpenditure(id, {
      status: 'PAID',
      paidBy,
      paidAt: new Date().toISOString()
    });
  };

  const deleteExpenditure = (id: string) => {
    const exp = expenditures.find(e => e.id === id);
    if (exp?.status === 'APPROVED' || exp?.status === 'PAID') {
      throw new Error('Cannot delete approved or paid expenditure');
    }

    const updated = expenditures.map(e =>
      e.id === id
        ? { ...e, deletedAt: new Date().toISOString() }
        : e
    );
    saveExpenditures(updated);
  };

  // ============================================================================
  // EXCHANGE RATE OPERATIONS
  // ============================================================================

  const getExchangeRate = (currency: string, date: string): ExchangeRate | undefined => {
    // Find the most recent rate on or before the given date
    const rates = exchangeRates
      .filter(r => r.currency === currency && r.effectiveDate <= date)
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
    
    return rates[0];
  };

  const createExchangeRate = (rate: Omit<ExchangeRate, 'id' | 'createdAt'>): string => {
    const id = `rate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRate: ExchangeRate = {
      ...rate,
      id,
      createdAt: new Date().toISOString()
    };
    saveExchangeRates([...exchangeRates, newRate]);
    return id;
  };

  // ============================================================================
  // APPROVAL OPERATIONS
  // ============================================================================

  const getApprovalsForEntity = (entityType: 'BUDGET' | 'EXPENDITURE', entityId: string) => {
    return approvals.filter(a => a.entityType === entityType && a.entityId === entityId);
  };

  // ============================================================================
  // AGGREGATION OPERATIONS (FOR OVERVIEW)
  // ============================================================================

  const getTotalBudget = (projectId?: string): number => {
    let relevantBudgets = activeBudgets.filter(b => b.status === 'APPROVED');
    
    if (projectId) {
      relevantBudgets = relevantBudgets.filter(b => b.projectId === projectId);
    }
    
    return relevantBudgets.reduce((sum, b) => sum + b.totalBudgetUSD, 0);
  };

  const getTotalSpent = (projectId?: string): number => {
    let relevantExpenditures = expenditures.filter(e => 
      e.status === 'APPROVED' || e.status === 'PAID'
    );
    
    if (projectId) {
      relevantExpenditures = relevantExpenditures.filter(e => e.projectId === projectId);
    }
    
    return relevantExpenditures.reduce((sum, e) => sum + e.amountUSD, 0);
  };

  const getPendingApprovals = (): number => {
    const pendingBudgets = budgets.filter(b => b.status === 'SUBMITTED').length;
    const pendingExpenditures = expenditures.filter(e => e.status === 'SUBMITTED').length;
    return pendingBudgets + pendingExpenditures;
  };

  const getBudgetUtilizationRate = (projectId?: string): number => {
    const totalBudget = getTotalBudget(projectId);
    const totalSpent = getTotalSpent(projectId);
    
    if (totalBudget === 0) return 0;
    return (totalSpent / totalBudget) * 100;
  };

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: FinanceContextType = {
    // Chart of Accounts
    chartOfAccounts,
    activeAccounts,
    createAccount,
    updateAccount,
    deactivateAccount,
    getAccountByCode,
    getChildAccounts,
    
    // Budgets
    budgets,
    activeBudgets,
    createBudget,
    updateBudget,
    submitBudget,
    approveBudget,
    rejectBudget,
    reviseBudget,
    deleteBudget,
    
    // Budget Line Items
    budgetLineItems,
    getBudgetLines,
    createBudgetLine,
    updateBudgetLine,
    deleteBudgetLine,
    recalculateBudgetLineTotals,
    
    // Expenditures
    expenditures,
    createExpenditure,
    updateExpenditure,
    submitExpenditure,
    approveExpenditure,
    rejectExpenditure,
    markExpenditurePaid,
    deleteExpenditure,
    
    // Exchange Rates
    exchangeRates,
    getExchangeRate,
    createExchangeRate,
    
    // Approvals
    approvals,
    getApprovalsForEntity,
    
    // Aggregations
    getTotalBudget,
    getTotalSpent,
    getPendingApprovals,
    getBudgetUtilizationRate,
    
    // Utilities
    loading,
    refresh: loadData
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}