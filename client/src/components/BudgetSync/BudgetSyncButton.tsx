'use client';

import React, { useState } from 'react';
import { useBudgetSync } from '@/hooks/useBudgetSync';

interface BudgetSyncButtonProps {
  budgetId: number; // INTEGER ID (not UUID)
  projectId: number; // INTEGER ID (not UUID)
  budgetStatus?: 'draft' | 'submitted' | 'approved' | 'rejected';
  onSyncComplete?: () => void;
}

/**
 * BudgetSyncButton Component
 * 
 * Dropdown button providing 4 sync operations:
 * 1. Generate Project Budget (approved budgets only)
 * 2. Sync Expenses
 * 3. Recalculate Financials
 * 4. Validate Budget
 * 
 * All operations require confirmation before execution.
 * Automatically refreshes parent component on completion.
 */
export function BudgetSyncButton({
  budgetId,
  projectId,
  budgetStatus = 'draft',
  onSyncComplete,
}: BudgetSyncButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  
  const { isLoading, error, generateBudget, syncExpenses, recalculateFinancials, validateBudget } =
    useBudgetSync({
      onSuccess: () => {
        onSyncComplete?.();
        setIsOpen(false);
        setConfirmAction(null);
      },
      onError: (err) => {
        console.error('[BudgetSyncButton] Sync error:', err.message);
      },
    });

  const isApproved = budgetStatus === 'approved';

  const handleGenerateBudget = async () => {
    try {
      await generateBudget(budgetId, projectId, 'create_missing');
    } catch (err) {
      console.error('[BudgetSyncButton] Generate budget error:', err);
    }
  };

  const handleSyncExpenses = async () => {
    try {
      await syncExpenses(budgetId, projectId);
    } catch (err) {
      console.error('[BudgetSyncButton] Sync expenses error:', err);
    }
  };

  const handleRecalculate = async () => {
    try {
      await recalculateFinancials(budgetId, projectId);
    } catch (err) {
      console.error('[BudgetSyncButton] Recalculate error:', err);
    }
  };

  const handleValidate = async () => {
    try {
      await validateBudget(budgetId);
    } catch (err) {
      console.error('[BudgetSyncButton] Validate error:', err);
    }
  };

  return (
    <div className="relative">
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Syncing...' : 'Budget Sync'}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-56">
          <div className="p-2">
            {/* Generate Project Budget - Only for Approved Budgets */}
            {isApproved && (
              <div>
                <button
                  onClick={() => setConfirmAction('generate')}
                  disabled={isLoading || confirmAction !== null}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Generate Project Budget
                </button>
                {confirmAction === 'generate' && (
                  <div className="ml-4 mt-1 mb-2 flex gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <button
                      onClick={handleGenerateBudget}
                      disabled={isLoading}
                      className="flex-1 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmAction(null)}
                      disabled={isLoading}
                      className="flex-1 bg-gray-300 px-2 py-1 rounded text-xs font-medium hover:bg-gray-400 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Sync Expenses */}
            <div>
              <button
                onClick={() => setConfirmAction('sync')}
                disabled={isLoading || confirmAction !== null}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Sync Expenses
              </button>
              {confirmAction === 'sync' && (
                <div className="ml-4 mt-1 mb-2 flex gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <button
                    onClick={handleSyncExpenses}
                    disabled={isLoading}
                    className="flex-1 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={isLoading}
                    className="flex-1 bg-gray-300 px-2 py-1 rounded text-xs font-medium hover:bg-gray-400 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Recalculate Financials */}
            <div>
              <button
                onClick={() => setConfirmAction('recalc')}
                disabled={isLoading || confirmAction !== null}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Recalculate Financials
              </button>
              {confirmAction === 'recalc' && (
                <div className="ml-4 mt-1 mb-2 flex gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <button
                    onClick={handleRecalculate}
                    disabled={isLoading}
                    className="flex-1 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={isLoading}
                    className="flex-1 bg-gray-300 px-2 py-1 rounded text-xs font-medium hover:bg-gray-400 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Validate Budget */}
            <div>
              <button
                onClick={() => setConfirmAction('validate')}
                disabled={isLoading || confirmAction !== null}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Validate Budget
              </button>
              {confirmAction === 'validate' && (
                <div className="ml-4 mt-1 mb-2 flex gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <button
                    onClick={handleValidate}
                    disabled={isLoading}
                    className="flex-1 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={isLoading}
                    className="flex-1 bg-gray-300 px-2 py-1 rounded text-xs font-medium hover:bg-gray-400 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-2 p-2 bg-red-100 text-red-800 rounded text-sm border border-red-200">
                <p className="font-medium">Error:</p>
                <p>{error.message}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
