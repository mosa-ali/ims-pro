/**
 * Annual Programs Report Data Hook
 * 
 * AUTO-AGGREGATES data from ALL system modules:
 * - Projects (by date overlap, not financial activity)
 * - Grants
 * - Proposals & Pipeline
 * - Budgets & Expenditures
 * - MEAL Indicators
 * 
 * CRITICAL PHILOSOPHY:
 * - A project is "in year X" if its start/end dates OVERLAP with year X
 * - Projects with ZERO spending are still VALID projects
 * - Zero data is MEANINGFUL data (early-year reporting is normal in NGO contexts)
 * - APR must ALWAYS render fully, even with all zeros
 * - Charts and KPIs show zeros, not "N/A" or hidden states
 */

import { useMemo } from 'react';
import { projectsDatabase } from '@/services/projectsDatabase';
import { grantsDatabase } from '@/services/grantsDatabase';
import { proposalsDatabase } from '@/services/proposalsDatabase';
import { getAPRNarrativeForYear } from '@/services/aprDataService';

export interface APRAggregationFilters {
 year: number;
 country?: string;
 sector?: string;
}

export interface APRData {
 // Year context
 year: number;
 projectCount: number; // Explicit count for informational banner
 
 // SECTION A: Executive Summary (EDITABLE NARRATIVE)
 executiveSummary: {
 narrative: string;
 lastModified: string;
 };
 
 // SECTION B: Key Achievements (AUTO KPIs + highlights)
 keyAchievements: {
 totalProjects: number;
 completedProjects: number;
 ongoingProjects: number;
 plannedProjects: number;
 totalBeneficiaries: number;
 totalBudget: number;
 totalSpent: number;
 sectors: string[];
 highlights: string[]; // Auto-generated from data
 };
 
 // SECTION C: Program & Grant Performance (AUTO CHARTS - ALWAYS RENDER)
 programPerformance: {
 projectsByStatus: { name: string; value: number; color: string }[];
 budgetVsSpent: { name: string; budget: number; spent: number }[];
 monthlyTrend: { month: string; projects: number; budget: number }[];
 };
 
 // Grant Performance (AUTO)
 grantPerformance: {
 activeGrants: number;
 closedGrants: number;
 totalGrantValue: number;
 utilizationRate: number;
 };
 
 // SECTION D: Challenges & Constraints (EDITABLE NARRATIVE)
 challenges: {
 narrative: string;
 lastModified: string;
 };
 
 // SECTION E: Pipeline & Future Outlook (AUTO + EDITABLE)
 pipelineOutlook: {
 proposalsSubmitted: number;
 proposalsApproved: number;
 proposalsRejected: number;
 pipelineValue: number;
 approvalRate: number;
 strategicOutlook: string; // EDITABLE
 lastModified: string;
 };
 
 // SECTION F: Management Notes (FLEXIBLE EDITABLE)
 managementNotes: {
 notes: string;
 lastModified: string;
 };
}

/**
 * Main APR Data Hook
 * Aggregates from ALL authoritative data sources
 */
export function useAnnualProgramsData(filters: APRAggregationFilters): APRData {
 const { year, country, sector } = filters;
 
 // Load narrative data for this year (editable sections)
 const narrativeData = getAPRNarrativeForYear(year);
 
 // Auto-aggregate system data
 const aggregatedData = useMemo(() => {
 return aggregateAPRData(year, country, sector);
 }, [year, country, sector]);
 
 return {
 year,
 projectCount: aggregatedData.projectCount,
 
 // SECTION A: Executive Summary (EDITABLE)
 executiveSummary: {
 narrative: narrativeData.executiveSummary,
 lastModified: narrativeData.lastModified
 },
 
 // SECTION B: Key Achievements (AUTO)
 keyAchievements: aggregatedData.keyAchievements,
 
 // SECTION C: Program Performance (AUTO)
 programPerformance: aggregatedData.programPerformance,
 
 // Grant Performance (AUTO)
 grantPerformance: aggregatedData.grantPerformance,
 
 // SECTION D: Challenges (EDITABLE)
 challenges: {
 narrative: narrativeData.challenges,
 lastModified: narrativeData.lastModified
 },
 
 // SECTION E: Pipeline Outlook (AUTO + EDITABLE)
 pipelineOutlook: {
 ...aggregatedData.pipelineOutlook,
 strategicOutlook: narrativeData.strategicOutlook,
 lastModified: narrativeData.lastModified
 },
 
 // SECTION F: Management Notes (EDITABLE)
 managementNotes: {
 notes: narrativeData.managementNotes,
 lastModified: narrativeData.lastModified
 }
 };
}

/**
 * Aggregate APR data from ALL authoritative sources
 * 
 * KEY LOGIC: Projects are included if their date range OVERLAPS with the selected year
 * This means: projectStartYear <= selectedYear AND projectEndYear >= selectedYear
 */
function aggregateAPRData(
 year: number,
 country?: string,
 sector?: string
) {
 // Get all projects
 const allProjects = projectsDatabase.getAllProjects();
 
 console.log('APR DATA AGGREGATION DEBUG:', {
 year,
 country,
 totalProjectsInDB: allProjects.length,
 sampleProject: allProjects[0] ? {
 id: allProjects[0].id,
 title: allProjects[0].title,
 startDate: allProjects[0].startDate,
 endDate: allProjects[0].endDate,
 country: allProjects[0].country,
 status: allProjects[0].status
 } : 'NO PROJECTS'
 });
 
 // Filter projects by DATE OVERLAP (not financial activity)
 const yearProjects = allProjects.filter(project => {
 try {
 const startDate = new Date(project.startDate);
 const endDate = new Date(project.endDate);
 
 const projectStartYear = startDate.getFullYear();
 const projectEndYear = endDate.getFullYear();
 
 // Include if project's date range overlaps with the selected year
 const isInYear = projectStartYear <= year && projectEndYear >= year;
 
 console.log('Checking project:', {
 id: project.id,
 title: project.title,
 startDate: project.startDate,
 endDate: project.endDate,
 projectStartYear,
 projectEndYear,
 selectedYear: year,
 isInYear,
 country: project.country,
 matchesCountry: !country || project.country === country
 });
 
 if (!isInYear) return false;
 
 // Filter by country if specified
 if (country && project.country !== country) return false;
 
 // Filter by sector if specified
 if (sector) {
 const hasSector = project.project_sectors?.some(s => 
 s.sector_name === sector || s.sector === sector
 );
 if (!hasSector) return false;
 }
 
 return true;
 } catch (error) {
 console.warn('Invalid date in project:', project.id, error);
 return false;
 }
 });
 
 console.log('APR FILTERING RESULT:', {
 year,
 country,
 totalProjectsFound: yearProjects.length,
 filteredProjects: yearProjects.map(p => ({ id: p.id, title: p.title, country: p.country }))
 });
 
 // Calculate key achievements (zeros are valid!)
 const completedProjects = yearProjects.filter(p => p.status === 'Completed').length;
 const ongoingProjects = yearProjects.filter(p => p.status === 'Ongoing').length;
 const plannedProjects = yearProjects.filter(p => p.status === 'Planned').length;
 
 const totalBudget = yearProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
 const totalSpent = yearProjects.reduce((sum, p) => sum + (p.spent || 0), 0);
 
 // Extract unique sectors
 const sectors = Array.from(new Set(
 yearProjects.flatMap(p => 
 (p.project_sectors || []).map(s => s.sector_name || s.sector || '')
 ).filter(Boolean)
 ));
 
 // Total beneficiaries (sum from all projects)
 const totalBeneficiaries = yearProjects.reduce((sum, p) => 
 sum + (p.total_beneficiaries || 0), 0
 );
 
 // Auto-generate highlights from data
 const highlights = generateHighlights(yearProjects, year);
 
 // Projects by status for chart - ALWAYS INCLUDE ALL STATUSES
 const statusCounts = {
 Completed: yearProjects.filter(p => p.status === 'Completed').length,
 Ongoing: yearProjects.filter(p => p.status === 'Ongoing').length,
 Planned: yearProjects.filter(p => p.status === 'Planned').length,
 Suspended: yearProjects.filter(p => p.status === 'Suspended').length,
 };
 
 // Always show all statuses, even with zero values
 const projectsByStatus = [
 { name: 'Completed', value: statusCounts.Completed, color: '#10b981' },
 { name: 'Ongoing', value: statusCounts.Ongoing, color: '#3b82f6' },
 { name: 'Planned', value: statusCounts.Planned, color: '#f59e0b' },
 { name: 'Suspended', value: statusCounts.Suspended, color: '#ef4444' }
 ];
 
 // Budget vs Spent by sector
 let budgetVsSpent: { name: string; budget: number; spent: number }[] = [];
 
 if (yearProjects.length > 0) {
 const budgetBySector = new Map<string, { budget: number; spent: number }>();
 
 yearProjects.forEach(project => {
 const projectSectors = project.project_sectors || [];
 const budget = project.budget || 0;
 const spent = project.spent || 0;
 
 if (projectSectors.length > 0) {
 projectSectors.forEach(s => {
 const sectorName = s.sector_name || s.sector || 'Other';
 const current = budgetBySector.get(sectorName) || { budget: 0, spent: 0 };
 budgetBySector.set(sectorName, {
 budget: current.budget + (budget / projectSectors.length),
 spent: current.spent + (spent / projectSectors.length)
 });
 });
 } else {
 const current = budgetBySector.get('Other') || { budget: 0, spent: 0 };
 budgetBySector.set('Other', {
 budget: current.budget + budget,
 spent: current.spent + spent
 });
 }
 });
 
 budgetVsSpent = Array.from(budgetBySector.entries()).map(([name, data]) => ({
 name,
 budget: Math.round(data.budget),
 spent: Math.round(data.spent)
 }));
 }
 
 // Monthly trend - ALWAYS RETURN 12 MONTHS (zeros are valid)
 const monthlyTrend = generateMonthlyTrend(yearProjects, year);
 
 // Grant performance (from grants database)
 const allGrants = grantsDatabase.getAllGrants();
 const yearGrants = allGrants.filter(grant => {
 try {
 const startDate = new Date(grant.startDate);
 const endDate = new Date(grant.endDate);
 const grantStartYear = startDate.getFullYear();
 const grantEndYear = endDate.getFullYear();
 
 // Date overlap logic for grants too
 return grantStartYear <= year && grantEndYear >= year;
 } catch (error) {
 return false;
 }
 });
 
 const activeGrants = yearGrants.filter(g => g.status === 'Active').length;
 const closedGrants = yearGrants.filter(g => g.status === 'Closed').length;
 const totalGrantValue = yearGrants.reduce((sum, g) => sum + (g.totalAmount || 0), 0);
 const grantSpent = yearGrants.reduce((sum, g) => sum + (g.spent || 0), 0);
 const utilizationRate = totalGrantValue > 0 
 ? Math.round((grantSpent / totalGrantValue) * 100) 
 : 0;
 
 // Pipeline outlook (from proposals database)
 const allProposals = proposalsDatabase.getAllProposals();
 const yearProposals = allProposals.filter(proposal => {
 try {
 const submissionDate = new Date(proposal.submissionDate);
 const proposalYear = submissionDate.getFullYear();
 return proposalYear === year;
 } catch (error) {
 return false;
 }
 });
 
 const proposalsSubmitted = yearProposals.length;
 const proposalsApproved = yearProposals.filter(p => p.status === 'Approved').length;
 const proposalsRejected = yearProposals.filter(p => p.status === 'Rejected').length;
 const pipelineValue = yearProposals.reduce((sum, p) => sum + (p.requestedAmount || 0), 0);
 const approvalRate = proposalsSubmitted > 0 
 ? Math.round((proposalsApproved / proposalsSubmitted) * 100) 
 : 0;
 
 return {
 projectCount: yearProjects.length,
 keyAchievements: {
 totalProjects: yearProjects.length,
 completedProjects,
 ongoingProjects,
 plannedProjects,
 totalBeneficiaries,
 totalBudget,
 totalSpent,
 sectors,
 highlights
 },
 programPerformance: {
 projectsByStatus, // Always include, even with zeros
 budgetVsSpent, // Can be empty array if no projects
 monthlyTrend // Always 12 months
 },
 grantPerformance: {
 activeGrants,
 closedGrants,
 totalGrantValue,
 utilizationRate
 },
 pipelineOutlook: {
 proposalsSubmitted,
 proposalsApproved,
 proposalsRejected,
 pipelineValue,
 approvalRate
 }
 };
}

/**
 * Auto-generate achievement highlights from real data
 * Returns meaningful messages even for zero-data scenarios
 */
function generateHighlights(projects: any[], year: number): string[] {
 const highlights: string[] = [];
 
 if (projects.length === 0) {
 // Zero projects is still meaningful information
 return [`No projects active in ${year} - this may indicate early planning phase or delayed start`];
 }
 
 const completed = projects.filter(p => p.status === 'Completed');
 const ongoing = projects.filter(p => p.status === 'Ongoing');
 const totalBeneficiaries = projects.reduce((sum, p) => sum + (p.total_beneficiaries || 0), 0);
 const totalSpent = projects.reduce((sum, p) => sum + (p.spent || 0), 0);
 const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
 
 const sectors = Array.from(new Set(
 projects.flatMap(p => (p.project_sectors || []).map(s => s.sector_name || s.sector))
 )).filter(Boolean);
 
 // Highlight 1: Project portfolio summary
 highlights.push(`${projects.length} project${projects.length > 1 ? 's' : ''} in portfolio (${completed.length} completed, ${ongoing.length} ongoing)`);
 
 // Highlight 2: Beneficiaries
 if (totalBeneficiaries > 0) {
 highlights.push(`Reached ${totalBeneficiaries.toLocaleString()} beneficiaries across all programs`);
 } else {
 highlights.push(`No beneficiary data recorded yet - projects may be in early implementation`);
 }
 
 // Highlight 3: Sectors
 if (sectors.length > 0) {
 highlights.push(`Active in ${sectors.length} sector${sectors.length > 1 ? 's' : ''}: ${sectors.slice(0, 3).join(', ')}${sectors.length > 3 ? '...' : ''}`);
 }
 
 // Highlight 4: Budget execution
 if (totalBudget > 0) {
 const utilization = Math.round((totalSpent / totalBudget) * 100);
 if (utilization === 0) {
 highlights.push(`Budget allocated: ${totalBudget.toLocaleString()} USD - No expenditure recorded yet`);
 } else {
 highlights.push(`${utilization}% budget utilization (${totalSpent.toLocaleString()} USD spent of ${totalBudget.toLocaleString()} USD)`);
 }
 }
 
 return highlights;
}

/**
 * Generate monthly trend data
 * ALWAYS returns 12 months - zeros are meaningful (shows seasonality, delays, etc.)
 */
function generateMonthlyTrend(projects: any[], year: number): { month: string; projects: number; budget: number }[] {
 const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
 
 const monthlyData = monthNames.map((month, index) => {
 const monthProjects = projects.filter(p => {
 try {
 const startDate = new Date(p.startDate);
 return startDate.getFullYear() === year && startDate.getMonth() === index;
 } catch (error) {
 return false;
 }
 });
 
 const monthBudget = monthProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
 
 return {
 month,
 projects: monthProjects.length,
 budget: Math.round(monthBudget)
 };
 });
 
 // ALWAYS return all 12 months - even if all zeros
 // This shows the full year and helps identify implementation patterns
 return monthlyData;
}