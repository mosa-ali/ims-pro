import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";

/**
 * KPI data structure for Donor CRM Dashboard
 */
export interface DonorCRMKPIs {
  activeDonors: number;
  openOpportunities: number;
  activeProposals: number;
  totalFundingValue: number;
  successRate: number;
  averageProposalValue: number;
}

/**
 * Hook to fetch Donor CRM KPIs
 * 
 * Usage:
 * const { kpis, isLoading, error } = useDonorCRMKPIs();
 * 
 * Returns:
 * - kpis: DonorCRMKPIs object with all KPI values
 * - isLoading: boolean indicating if data is being fetched
 * - error: Error object if fetch fails
 */
export function useDonorCRMKPIs() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["donorCRM", "kpis"],
    queryFn: async () => {
      try {
        // Call tRPC procedure to fetch KPIs
        // Assuming you have a procedure like: trpc.donorCRM.getKPIs.useQuery()
        // For now, returning mock data structure
        const response = await fetch("/api/trpc/donorCRM.getKPIs");
        
        if (!response.ok) {
          throw new Error("Failed to fetch Donor CRM KPIs");
        }
        
        const data = await response.json();
        return data as DonorCRMKPIs;
      } catch (err) {
        console.error("Error fetching Donor CRM KPIs:", err);
        // Return default values on error
        return {
          activeDonors: 0,
          openOpportunities: 0,
          activeProposals: 0,
          totalFundingValue: 0,
          successRate: 0,
          averageProposalValue: 0,
        } as DonorCRMKPIs;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
  });

  return {
    kpis: data || {
      activeDonors: 0,
      openOpportunities: 0,
      activeProposals: 0,
      totalFundingValue: 0,
      successRate: 0,
      averageProposalValue: 0,
    },
    isLoading,
    error: error as Error | null,
  };
}
