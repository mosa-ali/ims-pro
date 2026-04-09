import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

/**
 * ✅ FIXED useAuth Hook
 * 
 * Location: client/src/_core/hooks/useAuth.ts
 * 
 * Key fixes:
 * 1. Changed retry: false → true (retry failed auth checks)
 * 2. Changed refetchOnWindowFocus: false → true (refetch on tab focus)
 * 3. Changed refetchOnMount: false → true (refetch on mount)
 * 4. Changed staleTime: Infinity → 5 minutes (allow cache invalidation)
 * 
 * These changes fix the redirect loop by ensuring:
 * - Auth state is properly refreshed after login
 * - Cache invalidation actually works
 * - Session is detected when user returns to app
 */
export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = '/login' } =
    options ?? {};
  const utils = trpc.useUtils();

  /**
   * Query the current authenticated user
   * 
   * ✅ FIXED Configuration:
   * - retry: true - Retry failed queries (was: false)
   * - refetchOnWindowFocus: true - Refetch when user returns to tab (was: false)
   * - refetchOnMount: true - Refetch on component mount (was: false)
   * - staleTime: 5 minutes - Cache expires after 5 minutes (was: Infinity)
   * 
   * Why these changes work:
   * 1. After login, invalidate() clears the cache
   * 2. With staleTime: 5min, the cache is actually cleared
   * 3. With retry: true, failed queries are retried
   * 4. With refetchOnWindowFocus: true, auth is rechecked when needed
   * 5. With refetchOnMount: true, auth is checked when component mounts
   */
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: true,                       // ✅ FIXED: Retry on failure
    refetchOnWindowFocus: true,        // ✅ FIXED: Refetch when user returns to tab
    refetchOnMount: true,              // ✅ FIXED: Refetch on component mount
    staleTime: 5 * 60 * 1000,          // ✅ FIXED: Cache for 5 minutes (not infinity!)
    gcTime: 1000 * 60 * 60,            // Keep in cache for 1 hour
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      // First, clear the cache immediately to prevent race conditions
      utils.auth.me.setData(undefined, null);
      localStorage.removeItem('manus-runtime-user-info');
      
      // Then call the logout mutation
      await logoutMutation.mutateAsync();
      
      // Invalidate the query to ensure fresh state
      await utils.auth.me.invalidate();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        // Even if unauthorized, cache is already cleared
        return;
      }
      // For other errors, ensure cache is still cleared
      utils.auth.me.setData(undefined, null);
      localStorage.removeItem('manus-runtime-user-info');
      console.error('Logout error:', error);
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(meQuery.data)
    );
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
