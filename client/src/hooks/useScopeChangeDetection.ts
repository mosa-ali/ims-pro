/**
 * ============================================================================
 * SCOPE CHANGE DETECTION HOOK
 * ============================================================================
 * 
 * Detects changes in organization or operating unit scope and triggers:
 * - Cache invalidation
 * - Page reload (window.location.reload())
 * - User notification
 * - Cleanup of local state
 * 
 * COMPLIANCE:
 * ✅ Prevents data leakage when switching scopes
 * ✅ Ensures fresh data after scope change
 * ✅ Invalidates all cached queries
 * ✅ Clears localStorage scope-specific data
 * 
 * ============================================================================
 */

import { useEffect, useRef, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

// ============================================================================
// TYPES
// ============================================================================

export interface ScopeChangeEvent {
  previousOrganizationId: number;
  previousOperatingUnitId: number;
  currentOrganizationId: number;
  currentOperatingUnitId: number;
  changedAt: Date;
}

export type ScopeChangeListener = (event: ScopeChangeEvent) => void;

// ============================================================================
// SCOPE CHANGE DETECTOR
// ============================================================================

class ScopeChangeDetector {
  private listeners: Set<ScopeChangeListener> = new Set();
  private previousScope: { organizationId: number; operatingUnitId: number } | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Start monitoring for scope changes
   */
  start(checkIntervalMs: number = 1000): void {
    if (this.checkInterval) {
      return; // Already running
    }

    this.checkInterval = setInterval(() => {
      this.checkForScopeChange();
    }, checkIntervalMs);
  }

  /**
   * Stop monitoring for scope changes
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Register listener for scope changes
   */
  onScopeChange(listener: ScopeChangeListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Check for scope changes
   */
  private checkForScopeChange(): void {
    const currentScope = this.getCurrentScope();

    if (!currentScope) {
      return; // Not logged in
    }

    if (!this.previousScope) {
      // First check, just store the scope
      this.previousScope = currentScope;
      return;
    }

    // Check if scope changed
    const organizationChanged = currentScope.organizationId !== this.previousScope.organizationId;
    const operatingUnitChanged = currentScope.operatingUnitId !== this.previousScope.operatingUnitId;

    if (organizationChanged || operatingUnitChanged) {
      // ✅ Scope changed - notify all listeners
      const event: ScopeChangeEvent = {
        previousOrganizationId: this.previousScope.organizationId,
        previousOperatingUnitId: this.previousScope.operatingUnitId,
        currentOrganizationId: currentScope.organizationId,
        currentOperatingUnitId: currentScope.operatingUnitId,
        changedAt: new Date(),
      };

      // Update previous scope
      this.previousScope = currentScope;

      // Notify all listeners
      this.listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in scope change listener:', error);
        }
      });
    }
  }

  /**
   * Get current scope from context
   */
  private getCurrentScope(): { organizationId: number; operatingUnitId: number } | null {
    // Try to get from localStorage (set by context providers)
    const orgId = localStorage.getItem('current_organization_id');
    const ouId = localStorage.getItem('current_operating_unit_id');

    if (!orgId || !ouId) {
      return null;
    }

    try {
      return {
        organizationId: parseInt(orgId, 10),
        operatingUnitId: parseInt(ouId, 10),
      };
    } catch {
      return null;
    }
  }

  /**
   * Reset detector
   */
  reset(): void {
    this.previousScope = null;
  }
}

// ============================================================================
// GLOBAL DETECTOR INSTANCE
// ============================================================================

const globalDetector = new ScopeChangeDetector();

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to detect scope changes and trigger reload
 * 
 * Usage:
 * ```typescript
 * useScopeChangeDetection({
 *   onScopeChange: (event) => {
 *     console.log('Scope changed:', event);
 *   }
 * });
 * ```
 */
export function useScopeChangeDetection(options?: {
  onScopeChange?: ScopeChangeListener;
  checkIntervalMs?: number;
  autoReload?: boolean;
  showNotification?: boolean;
}): void {
  const utils = trpc.useUtils();
  const checkIntervalMs = options?.checkIntervalMs ?? 1000;
  const autoReload = options?.autoReload ?? true;
  const showNotification = options?.showNotification ?? true;

  useEffect(() => {
    // ✅ Register scope change listener
    const unsubscribe = globalDetector.onScopeChange((event) => {
      console.log('🔄 Scope changed:', event);

      // Call user-provided callback if any
      if (options?.onScopeChange) {
        options.onScopeChange(event);
      }

      // ✅ Step 1: Invalidate all tRPC queries
      utils.invalidate();

      // ✅ Step 2: Clear scope-specific localStorage
      clearScopeSpecificStorage();

      // ✅ Step 3: Show notification if enabled
      if (showNotification) {
        showScopeChangeNotification(event);
      }

      // ✅ Step 4: Reload page if enabled
      if (autoReload) {
        // Delay reload slightly to allow cleanup
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    });

    // Start monitoring
    globalDetector.start(checkIntervalMs);

    // Cleanup
    return () => {
      unsubscribe();
      globalDetector.stop();
    };
  }, [utils, checkIntervalMs, autoReload, showNotification, options]);
}

/**
 * Hook to manually trigger scope change detection
 */
export function useTriggerScopeChangeDetection(): () => void {
  const utils = trpc.useUtils();

  return useCallback(() => {
    // Force check for scope change
    globalDetector['checkForScopeChange']?.();
  }, [utils]);
}

/**
 * Hook to get current scope
 */
export function useCurrentScope(): { organizationId: number; operatingUnitId: number } | null {
  const [scope, setScope] = React.useState<{ organizationId: number; operatingUnitId: number } | null>(null);

  useEffect(() => {
    const updateScope = () => {
      const orgId = localStorage.getItem('current_organization_id');
      const ouId = localStorage.getItem('current_operating_unit_id');

      if (orgId && ouId) {
        setScope({
          organizationId: parseInt(orgId, 10),
          operatingUnitId: parseInt(ouId, 10),
        });
      }
    };

    updateScope();

    // Listen for storage changes
    window.addEventListener('storage', updateScope);

    return () => {
      window.removeEventListener('storage', updateScope);
    };
  }, []);

  return scope;
}

/**
 * Hook to watch for scope changes and execute callback
 */
export function useOnScopeChange(callback: ScopeChangeListener): void {
  useEffect(() => {
    return globalDetector.onScopeChange(callback);
  }, [callback]);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Clear scope-specific data from localStorage
 */
function clearScopeSpecificStorage(): void {
  // List of keys that are scope-specific and should be cleared
  const scopeSpecificKeys = [
    'survey_list_filters',
    'survey_sort_order',
    'submission_filters',
    'indicator_filters',
    'meal_survey_cache',
    'meal_submission_cache',
    'meal_indicator_cache',
    // Add more scope-specific keys as needed
  ];

  scopeSpecificKeys.forEach(key => {
    localStorage.removeItem(key);
  });

  console.log('✅ Cleared scope-specific localStorage');
}

/**
 * Show notification about scope change
 */
function showScopeChangeNotification(event: ScopeChangeEvent): void {
  const message = `Organization or Operating Unit changed. Reloading page...`;

  // Try to show toast notification if available
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    const customEvent = new CustomEvent('scope-change', {
      detail: {
        message,
        event,
      },
    });
    window.dispatchEvent(customEvent);
  }

  // Fallback to console
  console.warn('🔄 Scope changed - reloading page');
}

/**
 * Reset detector (useful for testing)
 */
export function resetScopeChangeDetector(): void {
  globalDetector.reset();
}

/**
 * Get detector instance (for advanced usage)
 */
export function getScopeChangeDetector(): ScopeChangeDetector {
  return globalDetector;
}

// ============================================================================
// REACT IMPORT
// ============================================================================

import React from 'react';

export default {
  useScopeChangeDetection,
  useTriggerScopeChangeDetection,
  useCurrentScope,
  useOnScopeChange,
  resetScopeChangeDetector,
  getScopeChangeDetector,
};
