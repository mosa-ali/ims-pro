import { useMemo, useState, useEffect } from 'react';

export interface AnnualProgramsData {
 year: number;
 executiveSummary: {
 narrative: string;
 lastUpdated: string;
 updatedBy: string;
 };
 keyAchievements: {
 totalProjects: number;
 totalBeneficiaries: number;
 totalBudget: number;
 totalSpent: number;
 completedProjects: number;
 ongoingProjects: number;
 sectors: Array<{ name: string; count: number; budget: number }>;
 highlights: string[];
 };
 programPerformance: {
 projectsByStatus: Array<{ name: string; value: number; color: string }>;
 budgetVsSpent: Array<{ name: string; budget: number; spent: number }>;
 sectorDistribution: Array<{ name: string; value: number; percentage: number }>;
 monthlyTrend: Array<{ month: string; projects: number; budget: number }>;
 };
 grantPerformance: {
 activeGrants: number;
 closedGrants: number;
 totalGrantValue: number;
 utilizationRate: number;
 };
 challenges: {
 narrative: string;
 constraints: string[];
 lastUpdated: string;
 };
 pipelineOutlook: {
 proposalsSubmitted: number;
 pipelineValue: number;
 approvalRate: number;
 strategicOutlook: string;
 prioritySectors: string[];
 };
 managementNotes: {
 notes: string;
 lessonsLearned: string[];
 donorNotes: string;
 lastUpdated: string;
 };
}

interface AnnualDataFilters {
 year: number;
 country?: string;
 sector?: string;
}

interface Project {
 id: string;
 title?: string;
 projectName?: string;
 code?: string;
 projectCode?: string;
 status: string;
 startDate: string;
 endDate: string;
 totalBudget: number;
 location?: {
 country?: string;
 governorate?: string;
 };
 country?: string;
 sectors?: string[];
 project_sectors?: Array<{ sector: string }>;
 beneficiaries?: Array<{ category: string; target: number }>;
 budgetLines?: Array<{ spent: number; allocated?: number }>;
}

/**
 * Hook to aggregate Annual Programs Report data from all system modules
 * Auto-generates KPIs, charts data, and supports editable narrative sections
 * Reads from localStorage: pms_projects, pms_grants
 */
export function useAnnualProgramsData(filters: AnnualDataFilters): AnnualProgramsData {
 const [projects, setProjects] = useState<Project[]>([]);

 // Load projects from localStorage
 useEffect(() => {
 const projectsData = localStorage.getItem('pms_projects');
 if (projectsData) {
 try {
 const parsedProjects = JSON.parse(projectsData);
 setProjects(parsedProjects);
 } catch (error) {
 console.error('Error loading projects for Annual Report:', error);
 setProjects([]);
 }
 }
 }, []);

 return useMemo(() => {
 // Filter projects by year
 const yearProjects = projects.filter((p) => {
 const projectYear = new Date(p.startDate).getFullYear();
 const endYear = new Date(p.endDate).getFullYear();
 const matchesYear = projectYear === filters.year || 
 (projectYear <= filters.year && endYear >= filters.year);
 
 const projectCountry = p.location?.country || p.country || '';
 const matchesCountry = !filters.country || projectCountry === filters.country;
 
 return matchesYear && matchesCountry;
 });

 // ========== KEY ACHIEVEMENTS ==========
 const totalProjects = yearProjects.length;
 
 const completedProjects = yearProjects.filter((p) => {
 const status = p.status?.toLowerCase() || '';
 return status === 'completed' || status === 'closed';
 }).length;
 
 const ongoingProjects = yearProjects.filter((p) => {
 const status = p.status?.toLowerCase() || '';
 return status === 'ongoing' || status === 'on_track' || status === 'at_risk' || 
 status === 'delayed' || status === 'active';
 }).length;

 const totalBeneficiaries = yearProjects.reduce((sum, p) => {
 if (!p.beneficiaries) return sum;
 const target = p.beneficiaries.find((b) => b.category === 'Direct');
 return sum + (target?.target || 0);
 }, 0);

 const totalBudget = yearProjects.reduce((sum, p) => p.totalBudget || 0, 0);
 
 const totalSpent = yearProjects.reduce((sum, p) => {
 if (!p.budgetLines) return sum;
 const spent = p.budgetLines.reduce((s, bl) => s + (bl.spent || 0), 0);
 return sum + spent;
 }, 0);

 // Sector aggregation
 const sectorMap = new Map<string, { count: number; budget: number }>();
 yearProjects.forEach((p) => {
 // Handle both formats: sectors array or project_sectors objects
 const projectSectors = p.sectors || p.project_sectors?.map(ps => ps.sector) || [];
 
 projectSectors.forEach((sector) => {
 const existing = sectorMap.get(sector) || { count: 0, budget: 0 };
 sectorMap.set(sector, {
 count: existing.count + 1,
 budget: existing.budget + (p.totalBudget || 0)
 });
 });
 });
 
 const sectors = Array.from(sectorMap.entries())
 .map(([name, data]) => ({ name, ...data }))
 .sort((a, b) => b.count - a.count);

 // ========== PROGRAM PERFORMANCE ==========
 const statusCounts = {
 completed: 0,
 onTrack: 0,
 atRisk: 0,
 delayed: 0,
 notStarted: 0
 };

 yearProjects.forEach((p) => {
 const status = p.status?.toLowerCase() || '';
 if (status === 'completed' || status === 'closed') {
 statusCounts.completed++;
 } else if (status === 'on_track' || status === 'on track' || status === 'ongoing') {
 statusCounts.onTrack++;
 } else if (status === 'at_risk' || status === 'at risk') {
 statusCounts.atRisk++;
 } else if (status === 'delayed') {
 statusCounts.delayed++;
 } else if (status === 'not_started' || status === 'not started' || status === 'planned') {
 statusCounts.notStarted++;
 }
 });

 const projectsByStatus = [
 { name: 'Completed', value: statusCounts.completed, color: '#10b981' },
 { name: 'On Track', value: statusCounts.onTrack, color: '#3b82f6' },
 { name: 'At Risk', value: statusCounts.atRisk, color: '#f59e0b' },
 { name: 'Delayed', value: statusCounts.delayed, color: '#ef4444' },
 { name: 'Not Started', value: statusCounts.notStarted, color: '#6b7280' }
 ].filter(item => item.value > 0);

 // Budget vs Spent by Sector
 const budgetVsSpent = sectors.slice(0, 6).map((s) => {
 const sectorProjects = yearProjects.filter((p) => {
 const projectSectors = p.sectors || p.project_sectors?.map(ps => ps.sector) || [];
 return projectSectors.includes(s.name);
 });
 
 const spent = sectorProjects.reduce((sum, p) => {
 if (!p.budgetLines) return sum;
 const projectSpent = p.budgetLines.reduce((s, bl) => s + (bl.spent || 0), 0);
 return sum + projectSpent;
 }, 0);
 
 return {
 name: s.name,
 budget: s.budget,
 spent: spent
 };
 });

 // Sector Distribution
 const sectorDistribution = sectors.map((s) => ({
 name: s.name,
 value: s.budget,
 percentage: totalBudget > 0 ? Math.round((s.budget / totalBudget) * 100) : 0
 }));

 // Monthly Trend (simplified - group by quarter)
 const monthlyTrend = [
 { month: 'Q1', projects: 0, budget: 0 },
 { month: 'Q2', projects: 0, budget: 0 },
 { month: 'Q3', projects: 0, budget: 0 },
 { month: 'Q4', projects: 0, budget: 0 }
 ];
 
 yearProjects.forEach((p) => {
 const startMonth = new Date(p.startDate).getMonth();
 const quarter = Math.floor(startMonth / 3);
 if (quarter >= 0 && quarter < 4) {
 monthlyTrend[quarter].projects += 1;
 monthlyTrend[quarter].budget += (p.totalBudget || 0);
 }
 });

 // ========== GRANT PERFORMANCE ==========
 const activeGrants = yearProjects.filter(p => {
 const status = p.status?.toLowerCase() || '';
 return status !== 'completed' && status !== 'closed' && status !== 'cancelled';
 }).length;
 
 const closedGrants = completedProjects;
 const totalGrantValue = totalBudget;
 const utilizationRate = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

 // ========== PIPELINE OUTLOOK (Mock data - would pull from Proposals module) ==========
 const proposalsSubmitted = 12; // Mock
 const pipelineValue = 4500000; // Mock
 const approvalRate = 65; // Mock

 return {
 year: filters.year,
 executiveSummary: {
 narrative: '',
 lastUpdated: new Date().toISOString(),
 updatedBy: 'System Admin'
 },
 keyAchievements: {
 totalProjects,
 totalBeneficiaries,
 totalBudget,
 totalSpent,
 completedProjects,
 ongoingProjects,
 sectors,
 highlights: [
 `Delivered ${completedProjects} projects across ${sectors.length} sectors`,
 `Reached ${totalBeneficiaries.toLocaleString()} beneficiaries`,
 `Achieved ${utilizationRate}% budget utilization rate`,
 `Maintained ${ongoingProjects} ongoing programs`
 ]
 },
 programPerformance: {
 projectsByStatus,
 budgetVsSpent,
 sectorDistribution,
 monthlyTrend
 },
 grantPerformance: {
 activeGrants,
 closedGrants,
 totalGrantValue,
 utilizationRate
 },
 challenges: {
 narrative: '',
 constraints: [],
 lastUpdated: new Date().toISOString()
 },
 pipelineOutlook: {
 proposalsSubmitted,
 pipelineValue,
 approvalRate,
 strategicOutlook: '',
 prioritySectors: []
 },
 managementNotes: {
 notes: '',
 lessonsLearned: [],
 donorNotes: '',
 lastUpdated: new Date().toISOString()
 }
 };
 }, [projects, filters.year, filters.country, filters.sector]);
}
