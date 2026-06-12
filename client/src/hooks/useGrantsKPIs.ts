import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";

/**
 * KPI data structure for Grants Dashboard
 */
export interface GrantsKPIs {
  activeGrants: number;
  totalGrantAmount: number;
  utilizationRate: number;
  completedGrants: number;
  pendingGrants: number;
  atRiskGrants: number;
}

/**
 * Hook to fetch Grants KPIs
 * 
 * Usage:
 * const { kpis, isLoading, error } = useGrantsKPIs();
 * 
 * Returns:
 * - kpis: GrantsKPIs object with all KPI values
 * - isLoading: boolean indicating if data is being fetched
 * - error: Error object if fetch fails
 */
export function useGrantsKPIs() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["grants", "kpis"],
    queryFn: async () => {
      try {
        // Call tRPC procedure to fetch KPIs
        // Assuming you have a procedure like: trpc.grants.getKPIs.useQuery()
        // For now, returning mock data structure
        const response = await fetch("/api/trpc/grants.getKPIs");
        
        if (!response.ok) {
          throw new Error("Failed to fetch Grants KPIs");
        }
        
        const data = await response.json();
        return data as GrantsKPIs;
      } catch (err) {
        console.error("Error fetching Grants KPIs:", err);
        // Return default values on error
        return {
          activeGrants: 0,
          totalGrantAmount: 0,
          utilizationRate: 0,
          completedGrants: 0,
          pendingGrants: 0,
          atRiskGrants: 0,
        } as GrantsKPIs;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
  });

  return {
    kpis: data || {
      activeGrants: 0,
      totalGrantAmount: 0,
      utilizationRate: 0,
      completedGrants: 0,
      pendingGrants: 0,
      atRiskGrants: 0,
    },
    isLoading,
    error: error as Error | null,
  };
}
