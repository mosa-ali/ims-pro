/**
 * ============================================================================
 * SCOPE CHANGE PROVIDER
 * ============================================================================
 * 
 * React Context Provider that:
 * - Wraps the entire application
 * - Detects scope changes (organization/OU)
 * - Invalidates caches on scope change
 * - Reloads page on scope change
 * - Shows user notification
 * 
 * COMPLIANCE:
 * ✅ Prevents data leakage when switching scopes
 * ✅ Ensures fresh data after scope change
 * ✅ Invalidates all cached queries
 * ✅ Clears localStorage scope-specific data
 * 
 * USAGE:
 * ```typescript
 * // In main.tsx or App.tsx
 * import { ScopeChangeProvider } from '@/providers/ScopeChangeProvider';
 * 
 * createRoot(document.getElementById('root')!).render(
 *   <ScopeChangeProvider>
 *     <App />
 *   </ScopeChangeProvider>
 * );
 * ```
 * 
 * ============================================================================
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useScopeChangeDetection, ScopeChangeEvent } from '@/hooks/useScopeChangeDetection';

// ============================================================================
// CONTEXT
// ============================================================================

interface ScopeChangeContextType {
  lastScopeChange: ScopeChangeEvent | null;
  isReloading: boolean;
}

const ScopeChangeContext = createContext<ScopeChangeContextType | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface ScopeChangeProviderProps {
  children: ReactNode;
  checkIntervalMs?: number;
  autoReload?: boolean;
  showNotification?: boolean;
}

export function ScopeChangeProvider({
  children,
  checkIntervalMs = 1000,
  autoReload = true,
  showNotification = true,
}: ScopeChangeProviderProps): JSX.Element {
  const [lastScopeChange, setLastScopeChange] = React.useState<ScopeChangeEvent | null>(null);
  const [isReloading, setIsReloading] = React.useState(false);

  // ✅ Set up scope change detection
  useScopeChangeDetection({
    onScopeChange: (event) => {
      console.log('📍 Scope change detected:', event);
      setLastScopeChange(event);
      setIsReloading(true);
    },
    checkIntervalMs,
    autoReload,
    showNotification,
  });

  const value: ScopeChangeContextType = {
    lastScopeChange,
    isReloading,
  };

  return (
    <ScopeChangeContext.Provider value={value}>
      {/* Show loading overlay during reload */}
      {isReloading && <ScopeChangeReloadOverlay />}
      {children}
    </ScopeChangeContext.Provider>
  );
}

// ============================================================================
// CONTEXT HOOK
// ============================================================================

export function useScopeChangeContext(): ScopeChangeContextType {
  const context = useContext(ScopeChangeContext);

  if (!context) {
    throw new Error(
      'useScopeChangeContext must be used within ScopeChangeProvider'
    );
  }

  return context;
}

// ============================================================================
// RELOAD OVERLAY COMPONENT
// ============================================================================

function ScopeChangeReloadOverlay(): JSX.Element {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
        <div className="mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Scope Changed
        </h2>
        <p className="text-muted-foreground mb-4">
          Your organization or operating unit has changed. Reloading page to ensure data consistency...
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
          Reloading...
        </div>
      </div>
    </div>
  );
}

export default ScopeChangeProvider;
