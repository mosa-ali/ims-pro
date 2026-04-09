import { trpc } from '@/lib/trpc';

/**
 * Project interface matching the structure expected by tab components
 */
export interface Project {
 id: string;
 title: string;
 titleEn?: string;
 titleAr?: string;
 code: string;
 status: 'Ongoing' | 'Planned' | 'Completed' | 'Not Started' | 'Suspended' | 'Closed';
 startDate: string;
 endDate: string;
 currency: string;
 totalBudget: number;
 // Optional fields
 donor?: string;
 description?: string;
 country?: string;
 location?: string;
 sectors?: string;
}

/**
 * Hook to fetch project data by ID from database via tRPC
 * 
 * @param projectId - The project ID to fetch
 * @returns Project data or null if not found
 */
export function useProjectData(projectId: string | undefined) {
 // Fetch project data from database using tRPC
 const projectQuery = trpc.projects.getById.useQuery(
 { id: parseInt(projectId || '0') },
 { enabled: !!projectId && !isNaN(parseInt(projectId)) }
 );

 const loading = projectQuery.isLoading;
 const error = projectQuery.error ? projectQuery.error.message : null;

 // Transform database project to expected format
 const project: Project | null = projectQuery.data ? {
 id: projectQuery.data.id.toString(),
 title: projectQuery.data.titleEn || projectQuery.data.titleAr,
 titleEn: projectQuery.data.titleEn,
 titleAr: projectQuery.data.titleAr,
 code: projectQuery.data.code,
 status: projectQuery.data.status as Project['status'],
 // Handle both Date objects and string dates from database
 startDate: typeof projectQuery.data.startDate === 'string' 
 ? projectQuery.data.startDate.split('T')[0] 
 : projectQuery.data.startDate.toISOString().split('T')[0],
 endDate: typeof projectQuery.data.endDate === 'string' 
 ? projectQuery.data.endDate.split('T')[0] 
 : projectQuery.data.endDate.toISOString().split('T')[0],
 currency: projectQuery.data.currency,
 totalBudget: projectQuery.data.totalBudget,
 location: projectQuery.data.location || undefined,
 sectors: projectQuery.data.sectors,
 } : null;

 return { project, loading, error };
}
