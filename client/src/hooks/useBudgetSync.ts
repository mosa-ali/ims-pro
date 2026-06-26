'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SyncStatus, type SyncResult, type FinancialSummary } from '@shared/types/budgetSync';

interface UseBudgetSyncOptions {
  onSuccess?: (result: SyncResult) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
}

interface UseBudgetSyncState {
  isLoading: boolean;
  error: Error | null;
  result: SyncResult | null;
  lastSyncedAt: Date | null;
  syncStatus: SyncStatus;
}

export function useBudgetSync(options: UseBudgetSyncOptions = {}) {
  const { onSuccess, onError, retryCount = 3, retryDelay = 1000 } = options;
  const [state, setState] = useState<UseBudgetSyncState>({
    isLoading: false,
    error: null,
    result: null,
    lastSyncedAt: null,
    syncStatus: SyncStatus.PENDING,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Execute async operation with exponential backoff retry logic
   * Retries on failure with delays: 1s, 2s, 4s
   */
  const executeWithRetry = useCallback(
    async <T,>(fn: () => Promise<T>, operation: string): Promise<T | null> => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
          setState((prev) => ({
            ...prev,
            isLoading: true,
            syncStatus: SyncStatus.SYNCING,
          }));

          const result = await fn();
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (attempt < retryCount) {
            const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff: 1s → 2s → 4s
            console.log(`[v0] ${operation} attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError;
    },
    [retryCount, retryDelay]
  );

  /**
   * Generate Project Budget from approved budget lines
   * Parameters use INTEGER IDs (not UUIDs)
   */
  const generateBudget = useCallback(
    async (budgetId: number, projectId: number, mode: 'create_missing' | 'synchronize_existing' | 'full_regeneration' = 'create_missing') => {
      try {
        abortControllerRef.current = new AbortController();

        const result = await executeWithRetry(async () => {
          const response = await fetch(`/api/budgets/${budgetId}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ budgetId, projectId, mode }),
            signal: abortControllerRef.current?.signal,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to generate budget');
          }
          return response.json();
        }, 'Generate Budget');

        setState((prev) => ({
          ...prev,
          isLoading: false,
          result,
          lastSyncedAt: new Date(),
          syncStatus: SyncStatus.COMPLETED,
          error: null,
        }));

        onSuccess?.(result);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err,
          syncStatus: SyncStatus.FAILED,
        }));
        onError?.(err);
        throw err;
      }
    },
    [executeWithRetry, onSuccess, onError]
  );

  /**
   * Sync expenses to budget items
   * Cascading update: expenses → items → lines → budget
   */
  const syncExpenses = useCallback(
    async (budgetId: number, projectId: number) => {
      try {
        abortControllerRef.current = new AbortController();

        const result = await executeWithRetry(async () => {
          const response = await fetch(`/api/budgets/${budgetId}/sync-expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ budgetId, projectId }),
            signal: abortControllerRef.current?.signal,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to sync expenses');
          }
          return response.json();
        }, 'Sync Expenses');

        setState((prev) => ({
          ...prev,
          isLoading: false,
          result,
          lastSyncedAt: new Date(),
          syncStatus: SyncStatus.COMPLETED,
          error: null,
        }));

        onSuccess?.(result);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err,
          syncStatus: SyncStatus.FAILED,
        }));
        onError?.(err);
        throw err;
      }
    },
    [executeWithRetry, onSuccess, onError]
  );

  /**
   * Recalculate all financial summary metrics
   * Calculates: totalBudget, totalSpent, burnRate, variance
   */
  const recalculateFinancials = useCallback(
    async (budgetId: number, projectId: number): Promise<FinancialSummary | null> => {
      try {
        abortControllerRef.current = new AbortController();

        const result = await executeWithRetry(async () => {
          const response = await fetch(`/api/budgets/${budgetId}/recalculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ budgetId, projectId }),
            signal: abortControllerRef.current?.signal,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to recalculate financials');
          }
          return response.json();
        }, 'Recalculate Financials');

        setState((prev) => ({
          ...prev,
          isLoading: false,
          lastSyncedAt: new Date(),
          syncStatus: SyncStatus.COMPLETED,
          error: null,
        }));

        onSuccess?.(result);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err,
          syncStatus: SyncStatus.FAILED,
        }));
        onError?.(err);
        throw err;
      }
    },
    [executeWithRetry, onSuccess, onError]
  );

  /**
   * Validate budget integrity
   * Checks: approved status, lines exist, items linked, totals match
   */
  const validateBudget = useCallback(
    async (budgetId: number) => {
      try {
        abortControllerRef.current = new AbortController();

        const result = await executeWithRetry(async () => {
          const response = await fetch(`/api/budgets/${budgetId}/validate?budgetId=${budgetId}`, {
            signal: abortControllerRef.current?.signal,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to validate budget');
          }
          return response.json();
        }, 'Validate Budget');

        setState((prev) => ({
          ...prev,
          isLoading: false,
          syncStatus: SyncStatus.COMPLETED,
          error: null,
        }));

        onSuccess?.(result);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err,
          syncStatus: SyncStatus.FAILED,
        }));
        onError?.(err);
        throw err;
      }
    },
    [executeWithRetry, onSuccess, onError]
  );

  /**
   * Cancel ongoing operation
   * Aborts fetch and resets state to pending
   */
  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setState((prev) => ({
      ...prev,
      isLoading: false,
      syncStatus: SyncStatus.PENDING,
    }));
  }, []);

  // Cleanup: abort on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    ...state,
    generateBudget,
    syncExpenses,
    recalculateFinancials,
    validateBudget,
    cancel,
  };
}
