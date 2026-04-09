import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router';
import { Plus, Search, Download, Upload, FileSpreadsheet, Eye, Trash2, Filter, Calendar, DollarSign, TrendingUp, Target, Edit, Lightbulb, BarChart3 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { useRecordDelete } from '@/hooks/useRecordDelete';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { ProjectSectorType } from '@/types/database.types';
import { getAllProjectSectors, formatProjectSectors, parseSectorsFromString } from '@/utils/projectHelpers';
import { ActiveGrants } from '@/pages/organization/ActiveGrants';
import { UnifiedExportButton } from '@/components/exports/UnifiedExportButton';
import { useDocumentService } from '@/hooks/useDocumentService';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// ============================================================================
// CURRENCY CONVERSION RATES (EU InforEuro Source)
// Official rates: https://commission.europa.eu/funding-tenders/procedures-guidelines-tenders/information-contractors-and-beneficiaries/exchange-rate-inforeuro_en
// Updated: January 2024
// ============================================================================
const EXCHANGE_RATES_TO_USD: Record<string, number> = {
 'USD': 1.0,
 'EUR': 1.10, // 1 EUR = 1.10 USD (example rate - should be updated monthly)
 'GBP': 1.27, // 1 GBP = 1.27 USD
 'CHF': 1.17, // 1 CHF = 1.17 USD
 'JPY': 0.0068, // 1 JPY = 0.0068 USD
 'CAD': 0.75, // 1 CAD = 0.75 USD
 'AUD': 0.66 // 1 AUD = 0.66 USD
};

/**
 * Convert any currency amount to USD
 * @param amount - Amount in original currency
 * @param currency - Currency code (EUR, GBP, CHF, etc.)
 * @returns Amount converted to USD
 */
function convertToUSD(amount: number, currency: string): number {
 const rate = EXCHANGE_RATES_TO_USD[currency.toUpperCase()] || 1.0;
 return amount * rate;
}

/**
 * Format USD amount for display
 * @param amount - Amount in USD
 * @returns Formatted string with $ symbol and commas
 */
function formatUSD(amount: number): string {
 return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ============================================================================
// PROJECT INTERFACE WITH FINANCE DATA
// ============================================================================
interface Project {
 id: string;
 title: string;
 code: string;
 status: 'Ongoing' | 'Planned' | 'Completed' | 'Not Started' | 'Suspended' | 'Closed';
 startDate: string;
 endDate: string;
 currency: string; // Original project currency
 project_sectors: ProjectSectorType[]; // NEW: Multi-select project sectors
 
 // Additional fields for grants sync and project details
 donor?: string;
 manager?: string;
 description?: string;
 descriptionAr?: string;
 sectors?: string[]; // Legacy field for backward compatibility
 location?: string;
 locationAr?: string;
 objectives?: string;
 objectivesAr?: string;
 targetBeneficiaries?: number;
 
 // Financial data from Finance Overview Tab
 financeOverview: {
 totalBudget: number; // In original currency
 actualSpent: number; // In original currency
 committed: number; // In original currency
 available: number; // In original currency
 completionPercentage: number; // Derived from Finance Overview
 };
}

// ============================================================================
// MOCK DATA - Realistic projects with different currencies
// In production, this would come from API: GET /api/projects/dashboard
// ============================================================================
const mockProjects: Project[] = [
 {
 id: '1',
 title: 'Promoting Inclusion and Social Change through Sports',
 code: 'UEFA-FOUND-001',
 status: 'Ongoing',
 startDate: '1/1/2026',
 endDate: '6/30/2027',
 currency: 'EUR',
 donor: 'UEFA Foundation',
 manager: 'Sarah Johnson',
 location: 'Multiple Locations, Yemen',
 locationAr: 'مواقع متعددة، اليمن',
 description: 'Using sports as a tool for social inclusion and positive change in conflict-affected communities',
 descriptionAr: 'استخدام الرياضة كأداة للإدماج الاجتماعي والتغيير الإيجابي في المجتمعات المتأثرة بالنزاع',
 objectives: 'Promote social cohesion through sports activities; Build resilience among youth; Foster community integration; Provide safe spaces for children and youth',
 objectivesAr: 'تعزيز التماسك الاجتماعي من خلال الأنشطة الرياضية؛ بناء القدرة على الصمود بين الشباب؛ تعزيز التكامل المجتمعي؛ توفير مساحات آمنة للأطفال والشباب',
 targetBeneficiaries: 5000,
 project_sectors: [ProjectSectorType.CHILD_PROTECTION, ProjectSectorType.EDUCATION_IN_EMERGENCY],
 financeOverview: {
 totalBudget: 77634,
 actualSpent: 0,
 committed: 0,
 available: 77634,
 completionPercentage: 0.0
 }
 },
 {
 id: '2',
 title: 'Emergency Education Support in Conflict Areas',
 code: 'UNICEF-YEM-2024-EDU-007',
 status: 'Ongoing',
 startDate: '2024-03-01',
 endDate: '2024-12-31',
 currency: 'EUR',
 donor: 'UNICEF',
 manager: 'Ahmed Al-Mansouri',
 location: 'Sana\'a, Hodeidah',
 locationAr: 'صنعاء، الحديدة',
 description: 'Providing emergency education services to children affected by conflict',
 descriptionAr: 'تقديم خدمات التعليم الطارئ للأطفال المتأثرين بالنزاع',
 objectives: 'Ensure continuity of education for conflict-affected children; Provide safe learning environments; Train teachers in emergency education methods',
 objectivesAr: 'ضمان استمرارية التعليم للأطفال المتأثرين بالنزاع؛ توفير بيئات تعليمية آمنة؛ تدريب المعلمين على أساليب التعليم في حالات الطوارئ',
 targetBeneficiaries: 8500,
 project_sectors: [ProjectSectorType.EDUCATION_IN_EMERGENCY, ProjectSectorType.CHILD_PROTECTION],
 financeOverview: {
 totalBudget: 400000, // EUR
 actualSpent: 150000, // EUR
 committed: 100000,
 available: 150000,
 completionPercentage: 37.5 // (150000 / 400000) * 100
 }
 },
 {
 id: '3',
 title: 'WASH Infrastructure Rehabilitation',
 code: 'ECHO-YEM-2024-WASH-001',
 status: 'Ongoing',
 startDate: '2024-02-01',
 endDate: '2025-01-31',
 currency: 'EUR',
 donor: 'European Commission - ECHO',
 manager: 'Fatima Hassan',
 location: 'Taiz, Aden',
 locationAr: 'تعز، عدن',
 description: 'Rehabilitating WASH infrastructure in conflict-affected areas',
 descriptionAr: 'إعادة تأهيل البنية التحتية للمياه والصرف الصحي في المناطق المتأثرة بالنزاع',
 objectives: 'Restore access to safe water; Improve sanitation facilities; Promote hygiene practices; Build resilient WASH systems',
 objectivesAr: 'استعادة الوصول إلى المياه الآمنة؛ تحسين مرافق الصرف الصحي؛ تعزيز ممارسات النظافة؛ بناء أنظمة مياه مرنة',
 targetBeneficiaries: 25000,
 project_sectors: [ProjectSectorType.WASH],
 financeOverview: {
 totalBudget: 1200000, // EUR
 actualSpent: 480000, // EUR
 committed: 300000,
 available: 420000,
 completionPercentage: 40.0 // (480000 / 1200000) * 100
 }
 },
 {
 id: '4',
 title: 'Child Protection and Psychosocial Support',
 code: 'SC-MENA-2024-CP-003',
 status: 'Planned',
 startDate: '2024-07-01',
 endDate: '2025-06-30',
 currency: 'GBP',
 donor: 'Save the Children',
 manager: 'Michael Roberts',
 location: 'Marib, Hajjah',
 locationAr: 'مأرب، حجة',
 description: 'Providing child protection and psychosocial support services to vulnerable children',
 descriptionAr: 'تقديم خدمات حماية الطفل والدعم النفسي الاجتماعي للأطفال المستضعفين',
 objectives: 'Protect children from abuse and exploitation; Provide psychosocial support; Strengthen community protection mechanisms',
 objectivesAr: 'حماية الأطفال من سوء المعاملة والاستغلال؛ توفير الدعم النفسي الاجتماعي؛ تعزيز آليات الحماية المجتمعية',
 targetBeneficiaries: 3200,
 project_sectors: [ProjectSectorType.CHILD_PROTECTION, ProjectSectorType.PROTECTION],
 financeOverview: {
 totalBudget: 600000, // GBP
 actualSpent: 0,
 committed: 0,
 available: 600000,
 completionPercentage: 0
 }
 },
 {
 id: '5',
 title: 'Nutrition Support for IDPs',
 code: 'WFP-YEM-2023-NUT-008',
 status: 'Completed',
 startDate: '2023-01-01',
 endDate: '2023-12-31',
 currency: 'USD',
 donor: 'World Food Programme',
 manager: 'Nadia Al-Zahra',
 location: 'IDP Camps, Multiple Governorates',
 locationAr: 'مخيمات النازحين، محافظات متعددة',
 description: 'Providing nutrition support and supplementation to internally displaced persons',
 descriptionAr: 'توفير الدعم الغذائي والمكملات الغذائية للنازحين داخلياً',
 objectives: 'Address acute malnutrition among IDPs; Provide nutritional supplements; Conduct nutrition awareness programs',
 objectivesAr: 'معالجة سوء التغذية الحاد بين النازحين؛ توفير المكملات الغذائية؛ إجراء برامج توعية غذائية',
 targetBeneficiaries: 15000,
 project_sectors: [ProjectSectorType.HEALTH],
 financeOverview: {
 totalBudget: 750000,
 actualSpent: 745000,
 committed: 5000,
 available: 0,
 completionPercentage: 99.3
 }
 }
];

type ProjectStatus = 'All' | 'Ongoing' | 'Planned' | 'Completed' | 'Not Started';

export function ProjectsManagementDashboard() {
 const { isRTL } = useLanguage();
 const { t } = useTranslation();
const location = useLocation();
 const [searchTerm, setSearchTerm] = useState('');
 const [statusFilter, setStatusFilter] = useState<ProjectStatus>('All');
 const [showImportModal, setShowImportModal] = useState(false);
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);
 const [showDeleteModal, setShowDeleteModal] = useState(false);
 const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
 const [selectedProjectForGrants, setSelectedProjectForGrants] = useState<string | null>(null); // For Active Grants
 const [editingProject, setEditingProject] = useState<Project | null>(null);
 const [projects, setProjects] = useState<Project[]>([]); // Initialize empty, will be filled from database
 const [newProjectSectors, setNewProjectSectors] = useState<ProjectSectorType[]>([]); // State for new project sectors
 const [showActiveGrants, setShowActiveGrants] = useState(false); // State for Active Grants screen

 const { deleteRecord } = useRecordDelete();
 const { createProjectFolder } = useDocumentService();
 const { user } = useAuth();
 
 // Get organization and operating unit context
 const { currentOrganizationId, currentOrganization, isLoading: orgLoading } = useOrganization();
 const { currentOperatingUnitId, currentOperatingUnit, isLoading: ouLoading } = useOperatingUnit();
 
 // Helper function to safely extract numeric ID from potentially prefixed string IDs
 // Handles cases like "ou-30001-hq" -> 30001, "30001" -> 30001, 30001 -> 30001
 const extractNumericId = (id: string | number | null | undefined): number => {
 if (id === null || id === undefined) return 0;
 if (typeof id === 'number') return id;
 // Try to extract numeric part from string (handles prefixed IDs like "ou-30001-hq")
 const numericMatch = String(id).match(/\d+/);
 if (numericMatch) {
 return parseInt(numericMatch[0], 10);
 }
 return 0;
 };
 
 // Extract numeric IDs safely
 const numericOrgId = extractNumericId(currentOrganizationId);
 const numericOuId = extractNumericId(currentOperatingUnitId);
 
 // Debug logging for context values
 useEffect(() => {
 console.log('[ProjectsDashboard] Context values:', {
 currentOrganizationId,
 currentOrganizationIdType: typeof currentOrganizationId,
 currentOperatingUnitId,
 currentOperatingUnitIdType: typeof currentOperatingUnitId,
 numericOrgId,
 numericOuId,
 orgLoading,
 ouLoading,
 queryEnabled: numericOrgId > 0 && numericOuId > 0 && !orgLoading && !ouLoading,
 });
 }, [currentOrganizationId, currentOperatingUnitId, numericOrgId, numericOuId, orgLoading, ouLoading]);
 
 // Fetch projects from database via tRPC
 const { data: dbProjects, isLoading: projectsLoading, refetch: refetchProjects, error: projectsError } = trpc.projects.list.useQuery(
 {status: 'all',
 limit: 100},
 {
 enabled: numericOrgId > 0 && numericOuId > 0 && !orgLoading && !ouLoading,
 }
 );
 
 // Debug logging for query results
 useEffect(() => {
 console.log('[ProjectsDashboard] Query results:', {
 dbProjectsCount: dbProjects?.length || 0,
 projectsLoading,
 projectsError: projectsError?.message
 });
 }, [dbProjects, projectsLoading, projectsError]);
 
 // Fetch reporting schedules count
 const { data: reportingSchedulesData } = trpc.reportingSchedules.list.useQuery(
 {
 organizationId: numericOrgId,
 operatingUnitId: numericOuId,
 },
 {
 enabled: numericOrgId > 0 && numericOuId > 0 && !orgLoading && !ouLoading,
 }
 );
 
 const reportingSchedulesCount = reportingSchedulesData?.length || 0;

 // Handle edit from navigation state (from ProjectDetail page)
 useEffect(() => {
 if (location.state && (location.state as any).editProjectId) {
 const projectId = (location.state as any).editProjectId;
 const project = projects.find(p => p.id === projectId);
 if (project) {
 setEditingProject(project);
 setShowEditModal(true);
 }
 // Clear the state
 window.history.replaceState({}, document.title);
 }
 }, [location, projects]);

 // Sync projects from database when data is loaded
 useEffect(() => {
 if (dbProjects && dbProjects.length > 0) {
 // Map database status to UI status
 const statusMap: Record<string, 'Ongoing' | 'Planned' | 'Completed' | 'Not Started' | 'Suspended' | 'Closed'> = {
 'active': 'Ongoing',
 'ongoing': 'Ongoing',
 'planning': 'Planned',
 'planned': 'Planned',
 'completed': 'Completed',
 'not_started': 'Not Started',
 'suspended': 'Suspended',
 'closed': 'Closed',
 };
 
 const mappedProjects: Project[] = dbProjects.map((p: any) => ({
 id: String(p.id),
 title: p.title || p.titleEn || 'Untitled Project',
 code: p.code || p.projectCode || 'N/A',
 status: statusMap[p.status?.toLowerCase()] || 'Ongoing',
 startDate: p.startDate ? new Date(p.startDate).toLocaleDateString() : '',
 endDate: p.endDate ? new Date(p.endDate).toLocaleDateString() : '',
 currency: p.currency || 'USD',
 project_sectors: Array.isArray(p.sectors) ? p.sectors : [],
 donor: p.donor || '',
 manager: p.projectManager || '',
 description: p.description || '',
 descriptionAr: p.descriptionAr || '',
 location: p.location || '',
 locationAr: p.locationAr || '',
 objectives: p.objectives || '',
 objectivesAr: p.objectivesAr || '',
 targetBeneficiaries: p.beneficiaryCount || 0,
 financeOverview: {
 totalBudget: Number(p.totalBudget) || 0,
 actualSpent: Number(p.spent) || 0,
 committed: 0,
 available: (Number(p.totalBudget) || 0) - (Number(p.spent) || 0),
 completionPercentage: p.budgetUtilization || 0,
 },
 }));
 
 setProjects(mappedProjects);
 }
 }, [dbProjects]);

 // ============================================================================
 // KPI CALCULATIONS (Single Source of Truth from Finance Overview)
 // ============================================================================
 
 const dashboardKPIs = useMemo(() => {
 // 1️⃣ Active Programs: Count ONLY "Ongoing" projects
 const ongoingProjects = projects.filter(p => p.status === 'Ongoing');
 const activePrograms = ongoingProjects.length;

 // 2️⃣ Total Budget (USD): Sum of all Ongoing project budgets converted to USD
 const totalBudgetUSD = ongoingProjects.reduce((sum, project) => {
 const budgetInUSD = convertToUSD(project.financeOverview.totalBudget, project.currency);
 return sum + budgetInUSD;
 }, 0);

 // 3️⃣ Actual Spent (USD): Sum of all Ongoing project expenditures converted to USD
 const actualSpentUSD = ongoingProjects.reduce((sum, project) => {
 const spentInUSD = convertToUSD(project.financeOverview.actualSpent, project.currency);
 return sum + spentInUSD;
 }, 0);

 // 4️⃣ Balance (USD): Total Budget - Actual Spent
 const balanceUSD = totalBudgetUSD - actualSpentUSD;

 // 5️⃣ Average Completion Rate: Average of completion percentages from Finance Overview
 const avgCompletionRate = ongoingProjects.length > 0
 ? ongoingProjects.reduce((sum, p) => sum + p.financeOverview.completionPercentage, 0) / ongoingProjects.length
 : 0;

 return {
 activePrograms,
 totalBudgetUSD,
 actualSpentUSD,
 balanceUSD,
 avgCompletionRate
 };
 }, [projects]); // Recalculate when projects data changes

 // Filter projects for display
 const filteredProjects = projects.filter(project => {
 const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
 project.projectCode.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesStatus = statusFilter === 'All' || project.status === statusFilter;
 return matchesSearch && matchesStatus;
 });

 // Export to Excel
 const handleExportExcel = async () => {
 const workbook = new ExcelJS.Workbook();
 const worksheet = workbook.addWorksheet('Projects');

 // Add headers
 worksheet.columns = [
 { header: 'Project Code', key: 'code', width: 20 },
 { header: 'Project Title', key: 'title', width: 50 },
 { header: 'Project Sectors', key: 'sectors', width: 40 },
 { header: 'Status', key: 'status', width: 15 },
 { header: 'Start Date', key: 'startDate', width: 15 },
 { header: 'End Date', key: 'endDate', width: 15 },
 { header: 'Currency', key: 'currency', width: 10 },
 { header: 'Budget (Original)', key: 'budget', width: 18 },
 { header: 'Budget (USD)', key: 'budgetUSD', width: 18 },
 { header: 'Spent (Original)', key: 'spent', width: 18 },
 { header: 'Spent (USD)', key: 'spentUSD', width: 18 },
 { header: 'Completion (%)', key: 'completion', width: 15 }
 ];

 // Style header row
 worksheet.getRow(1).font = { bold: true };
 worksheet.getRow(1).fill = {
 type: 'pattern',
 pattern: 'solid',
 fgColor: { argb: 'FF3B82F6' }
 };
 worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

 // Add data
 filteredProjects.forEach(project => {
 worksheet.addRow({
 code: project.projectCode,
 title: project.title,
 sectors: formatProjectSectors(project.project_sectors || []),
 status: project.status,
 startDate: project.startDate,
 endDate: project.endDate,
 currency: project.currency,
 budget: project.financeOverview.totalBudget,
 budgetUSD: convertToUSD(project.financeOverview.totalBudget, project.currency),
 spent: project.financeOverview.actualSpent,
 spentUSD: convertToUSD(project.financeOverview.actualSpent, project.currency),
 completion: project.financeOverview.completionPercentage
 });
 });

 // Generate buffer
 const buffer = await workbook.xlsx.writeBuffer();
 const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
 saveAs(blob, `Projects_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
 };

 // Export Empty Template
 const handleExportTemplate = async () => {
 const workbook = new ExcelJS.Workbook();
 const worksheet = workbook.addWorksheet('Projects Template');

 // Add headers
 worksheet.columns = [
 { header: 'Project Code*', key: 'code', width: 20 },
 { header: 'Project Title*', key: 'title', width: 50 },
 { header: 'Project Sectors* (comma-separated)', key: 'sectors', width: 50 },
 { header: 'Status', key: 'status', width: 15 },
 { header: 'Start Date (YYYY-MM-DD)', key: 'startDate', width: 20 },
 { header: 'End Date (YYYY-MM-DD)', key: 'endDate', width: 20 },
 { header: 'Currency', key: 'currency', width: 10 },
 { header: 'Budget', key: 'budget', width: 15 },
 { header: 'Spent', key: 'spent', width: 15 },
 { header: 'Completion (%)', key: 'completion', width: 15 }
 ];

 // Style header
 worksheet.getRow(1).font = { bold: true };
 worksheet.getRow(1).fill = {
 type: 'pattern',
 pattern: 'solid',
 fgColor: { argb: 'FF059669' }
 };
 worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

 // Add instruction row
 worksheet.addRow({
 code: 'PROJ-001',
 title: 'Example: My Project Title',
 sectors: 'Child Protection, Education in Emergency',
 status: 'Ongoing',
 startDate: '2024-01-01',
 endDate: '2024-12-31',
 currency: 'USD',
 budget: '100000',
 spent: '25000',
 completion: '25'
 });

 // Add available sectors reference
 worksheet.addRow({});
 worksheet.addRow({ code: 'Available Sectors:', title: 'WASH, EFSL, Livelihood, Child Protection, Protection, Education in Emergency, Health' });

 // Add data validation for Status column
 worksheet.getColumn('status').eachCell({ includeEmpty: true }, (cell, rowNumber) => {
 if (rowNumber > 1) {
 cell.dataValidation = {
 type: 'list',
 allowBlank: true,
 formulae: ['"Ongoing,Planned,Completed,Not Started,Suspended,Closed"']
 };
 }
 });

 // Add data validation for Currency column
 worksheet.getColumn('currency').eachCell({ includeEmpty: true }, (cell, rowNumber) => {
 if (rowNumber > 1) {
 cell.dataValidation = {
 type: 'list',
 allowBlank: true,
 formulae: ['"USD,EUR,GBP,CHF,JPY,CAD,AUD"']
 };
 }
 });

 // Generate buffer
 const buffer = await workbook.xlsx.writeBuffer();
 const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
 saveAs(blob, `Projects_Template_Empty.xlsx`);
 };

 // Import from Excel
 const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;

 const workbook = new ExcelJS.Workbook();
 const arrayBuffer = await file.arrayBuffer();
 await workbook.xlsx.load(arrayBuffer);

 const worksheet = workbook.worksheets[0];
 const importedData: any[] = [];
 const errors: string[] = [];

 worksheet.eachRow((row, rowNumber) => {
 if (rowNumber === 1) return; // Skip header
 if (rowNumber > 2 && !row.getCell(1).value) return; // Skip empty rows after reference rows

 const code = row.getCell(1).value?.toString() || '';
 const title = row.getCell(2).value?.toString() || '';
 const sectorsString = row.getCell(3).value?.toString() || '';
 
 // Validation
 if (!code) {
 errors.push(`Row ${rowNumber}: Project Code is required`);
 }
 if (!title) {
 errors.push(`Row ${rowNumber}: Project Title is required`);
 }
 if (!sectorsString) {
 errors.push(`Row ${rowNumber}: Project Sectors are required (at least one)`);
 }

 // Parse sectors from comma-separated string
 const project_sectors = parseSectorsFromString(sectorsString);

 importedData.push({
 code,
 title,
 project_sectors,
 status: row.getCell(4).value?.toString() || 'Planned',
 startDate: row.getCell(5).value?.toString() || '',
 endDate: row.getCell(6).value?.toString() || '',
 currency: row.getCell(7).value?.toString() || 'USD',
 budget: parseFloat(row.getCell(8).value?.toString() || '0'),
 spent: parseFloat(row.getCell(9).value?.toString() || '0'),
 completion: parseFloat(row.getCell(10).value?.toString() || '0')
 });
 });

 if (errors.length > 0) {
 alert(`Import errors:\n${errors.join('\n')}`);
 return;
 }

 console.log('Imported projects:', importedData);
 alert(`Successfully imported ${importedData.length} projects!`);
 setShowImportModal(false);
 };

 // Handle project update
 const handleUpdateProject = (e: React.FormEvent) => {
 e.preventDefault();
 
 if (!editingProject) return;

 // Validation
 if (!editingProject.title || !editingProject.code) {
 alert('Please fill in all required fields (Title and Code)');
 return;
 }

 if (!editingProject.project_sectors || editingProject.project_sectors.length === 0) {
 alert('Please select at least one Project Sector');
 return;
 }

 // Update the project in the projects array
 const updatedProjects = projects.map(p => 
 p.id === editingProject.id ? { ...editingProject } : p
 );
 
 setProjects(updatedProjects);

 // ✅ CRITICAL: Persist to localStorage to maintain sectors and ALL fields
 localStorage.setItem('pms_projects', JSON.stringify(updatedProjects.map(project => ({
 id: project.id,
 title: project.title,
 code: project.projectCode,
 projectCode: project.projectCode,
 projectName: project.title,
 donor: project.donor || 'UEFA Foundation',
 implementingPartner: project.implementingPartner || 'Local NGO',
 startDate: project.startDate,
 endDate: project.endDate,
 currency: project.currency,
 totalBudget: project.financeOverview?.totalBudget || 0,
 budget: project.budget || project.financeOverview?.totalBudget || 0,
 status: project.status,
 project_sectors: project.project_sectors,
 sectors: project.sectors || project.project_sectors?.map(s => s.sector_name),
 financeOverview: project.financeOverview,
 description: project.description || '',
 descriptionAr: project.descriptionAr || '',
 manager: project.manager || '',
 location: project.location || '',
 locationAr: project.locationAr || '',
 objectives: project.objectives || '',
 objectivesAr: project.objectivesAr || '',
 targetBeneficiaries: project.targetBeneficiaries || 0,
 createdAt: project.createdAt || new Date().toISOString(),
 updatedAt: new Date().toISOString()
 }))));

 // Show success message
 alert('✅ Project updated successfully!');
 
 // Close modal and reset
 setShowEditModal(false);
 setEditingProject(null);
 };

 // Handle project creation
 const handleCreateProject = (e: React.FormEvent) => {
 e.preventDefault();
 
 // Get form data
 const formData = new FormData(e.target as HTMLFormElement);
 const title = formData.get('title') as string;
 const code = formData.get('code') as string;

 // Validation
 if (!title || !code) {
 alert('Please fill in all required fields (Title and Code)');
 return;
 }

 if (newProjectSectors.length === 0) {
 alert('Please select at least one Project Sector');
 return;
 }

 // Create new project
 const newProject: Project = {
 id: `${Date.now()}`, // Simple ID generation
 title,
 code,
 status: 'Planned',
 startDate: formData.get('startDate') as string || new Date().toISOString().split('T')[0],
 endDate: formData.get('endDate') as string || new Date().toISOString().split('T')[0],
 currency: 'USD',
 project_sectors: newProjectSectors,
 financeOverview: {
 totalBudget: 0,
 actualSpent: 0,
 committed: 0,
 available: 0,
 completionPercentage: 0
 }
 };

 // Add to projects array
 const updatedProjects = [...projects, newProject];
 setProjects(updatedProjects);

 // ✅ CRITICAL: Persist to localStorage to maintain sectors and ALL fields
 localStorage.setItem('pms_projects', JSON.stringify(updatedProjects.map(project => ({
 id: project.id,
 title: project.title,
 code: project.projectCode,
 projectCode: project.projectCode,
 projectName: project.title,
 donor: project.donor || 'UEFA Foundation',
 implementingPartner: project.implementingPartner || 'Local NGO',
 startDate: project.startDate,
 endDate: project.endDate,
 currency: project.currency,
 totalBudget: project.financeOverview?.totalBudget || 0,
 budget: project.budget || project.financeOverview?.totalBudget || 0,
 status: project.status,
 project_sectors: project.project_sectors,
 sectors: project.sectors || project.project_sectors?.map(s => s.sector_name),
 financeOverview: project.financeOverview,
 description: project.description || '',
 descriptionAr: project.descriptionAr || '',
 manager: project.manager || '',
 location: project.location || '',
 locationAr: project.locationAr || '',
 objectives: project.objectives || '',
 objectivesAr: project.objectivesAr || '',
 targetBeneficiaries: project.targetBeneficiaries || 0,
 createdAt: project.createdAt || new Date().toISOString(),
 updatedAt: new Date().toISOString()
 }))));

 // ✅ Auto-create document folder structure (non-blocking, optional)
 if (createProjectFolder) {
 try {
 createProjectFolder(
 newProject.id,
 newProject.code,
 newProject.title,
 user?.email || 'System'
 );
 console.log(`✅ Document folder auto-created for project: ${newProject.code}`);
 } catch (error) {
 console.error('⚠️ Failed to create project folder:', error);
 // Don't block - just log
 }
 }

 // Show success message
 alert('✅ Project created successfully!');
 
 // Close modal and reset
 setShowCreateModal(false);
 setNewProjectSectors([]);
 };

 // If Active Grants screen is open, show it instead of dashboard
 if (showActiveGrants) {
 return (
 <ActiveGrants 
 projectId={selectedProjectForGrants || 'all'} // 'all' shows all grants across projects
 onClose={() => {
 setShowActiveGrants(false);
 setSelectedProjectForGrants(null);
 }} 
 />
 );
 }

 // Show loading state while contexts are loading
 const isContextLoading = orgLoading || ouLoading;
 const isDataLoading = projectsLoading;
 const hasContextError = numericOrgId === 0 || numericOuId === 0;

 return (
 <div className="project-page">
 {/* Header */}
 <div className={`flex items-center justify-between mb-8`}>
 <div className={'text-start'}>
 <h1 className="project-page-title">{t.projects.dashboardTitle}</h1>
 <p className="project-page-subtitle">{t.projects.dashboardSubtitle}</p>
 </div>
 </div>

 {/* Top Row - 4 Info Cards */}
 <div className="project-grid-4 project-section">
 <div 
 className="project-card relative cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 border-transparent hover:border-primary"
 onClick={() => {
 // Show all grants (not filtered by specific project)
 setSelectedProjectForGrants(null);
 setShowActiveGrants(true);
 }}
 >
 {/* Grant Management - CLICKABLE */}
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <div className="project-kpi-label mb-2">{t.projects.grantManagement}</div>
 <div className="project-kpi-value">5</div>
 </div>
 <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
 <DollarSign className="w-5 h-5" />
 </div>
 </div>
 <p className={`project-meta-text mt-3 text-start`}>
 {t.projects.grantManagementDesc}
 </p>
 <div className={`text-xs text-primary font-medium mt-2 text-start`}>
 {t.organizationModule.clickToViewActiveGrants}
 </div>
 </div>

 <div className="project-card relative">
 {/* Project Reporting Schedule */}
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <div className="project-kpi-label mb-2">{t.projects.reportingSchedule}</div>
 <div className="project-kpi-value">{reportingSchedulesCount}</div>
 <div className="project-meta-text mt-1">{t.projects.active}</div>
 </div>
 <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
 <Calendar className="w-5 h-5" />
 </div>
 </div>
 <p className={`project-meta-text mt-3 text-start`}>
 {t.projects.reportingScheduleDesc}
 </p>
 <Link 
 to="/reporting-schedule"
 className={`block text-primary hover:text-primary/80 font-medium mt-3 text-sm transition-colors text-start`}
 >
 {t.organizationModule.clickToViewReportingSchedule}
 </Link>
 </div>

 <div className="project-card relative">
 {/* Proposal & Pipeline */}
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <div className="project-kpi-label mb-2">{t.projects.proposalPipeline}</div>
 <div className="project-kpi-value">8</div>
 <div className="project-meta-text mt-1">{t.projects.opportunities}</div>
 </div>
 <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
 <Lightbulb className="w-5 h-5" />
 </div>
 </div>
 <p className={`project-meta-text mt-3 text-start`}>
 {t.projects.proposalPipelineDesc}
 </p>
 <Link 
 to="/proposal-pipeline"
 className={`block text-primary hover:text-primary/80 font-medium mt-3 text-sm transition-colors text-start`}
 >
 {t.organizationModule.clickToViewProposalPipeline}
 </Link>
 </div>

 <div className="project-card relative">
 {/* Annual Programs Report */}
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <div className="project-kpi-label mb-2">{t.organizationModule.annualProgramsReport}</div>
 <div className="project-kpi-value">{new Date().getFullYear()}</div>
 <div className="project-meta-text mt-1">{t.organizationModule.strategicAnnualReport}</div>
 </div>
 <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
 <BarChart3 className="w-5 h-5" />
 </div>
 </div>
 <p className={`project-meta-text mt-3 text-start`}>
 {'Comprehensive visual report on achievements, performance and annual planning'}
 </p>
 <Link 
 to="/annual-programs-report"
 className={`block text-primary hover:text-primary/80 font-medium mt-3 text-sm transition-colors text-start`}
 >
 {t.organizationModule.clickToViewAnnualReport}
 </Link>
 </div>
 </div>

 {/* Context Loading/Error State */}
 {isContextLoading && (
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
 <div className="flex items-center gap-3">
 <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
 <p className="text-blue-700">
 {t.organizationModule.loadingOrganizationAndOperatingUnitData}
 </p>
 </div>
 </div>
 )}

 {!isContextLoading && hasContextError && (
 <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
 <div className="flex items-start gap-3">
 <div className="text-amber-600 mt-0.5">
 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
 <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
 </svg>
 </div>
 <div>
 <p className="text-amber-800 font-medium">
 {t.organizationModule.noOperatingUnitSelected}
 </p>
 <p className="text-amber-700 text-sm mt-1">
 {'Please ensure you are assigned to an operating unit. Contact your system administrator if this issue persists.'}
 </p>
 <p className="text-amber-600 text-xs mt-2">
 {`Organization ID: ${currentOrganizationId || 'Not set'} | Operating Unit ID: ${currentOperatingUnitId || 'Not set'}`}
 </p>
 </div>
 </div>
 </div>
 )}

 {isDataLoading && !isContextLoading && !hasContextError && (
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
 <div className="flex items-center gap-3">
 <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
 <p className="text-gray-700">
 {t.organizationModule.loadingProjects}
 </p>
 </div>
 </div>
 )}

 {/* Financial KPI Cards - 5 Column Grid */}
 <div className="project-grid-5 project-section">
 {/* Active Programs */}
 <div className="project-kpi-card">
 <div className={'text-start'}>
 <div className="project-card-description mb-1">{t.projects.activePrograms}</div>
 <div className="project-kpi-value">
 {isContextLoading || isDataLoading ? (
 <span className="animate-pulse bg-gray-200 rounded w-8 h-6 inline-block"></span>
 ) : (
 dashboardKPIs.activePrograms
 )}
 </div>
 </div>
 </div>

 {/* Total Budget (USD) */}
 <div className="project-kpi-card">
 <div className={'text-start'}>
 <div className="project-card-description mb-1">{t.projects.totalBudgetUSD}</div>
 <div className="project-kpi-value text-green-600">
 {isContextLoading || isDataLoading ? (
 <span className="animate-pulse bg-gray-200 rounded w-20 h-6 inline-block"></span>
 ) : (
 formatUSD(dashboardKPIs.totalBudgetUSD)
 )}
 </div>
 </div>
 </div>

 {/* Actual Spent (USD) */}
 <div className="project-kpi-card">
 <div className={'text-start'}>
 <div className="project-card-description mb-1">{t.projects.actualSpentUSD}</div>
 <div className="project-kpi-value">
 {isContextLoading || isDataLoading ? (
 <span className="animate-pulse bg-gray-200 rounded w-20 h-6 inline-block"></span>
 ) : (
 formatUSD(dashboardKPIs.actualSpentUSD)
 )}
 </div>
 </div>
 </div>

 {/* Balance (USD) */}
 <div className="project-kpi-card">
 <div className={'text-start'}>
 <div className="project-card-description mb-1">{t.projects.balanceUSD}</div>
 <div className="project-kpi-value text-green-600">
 {isContextLoading || isDataLoading ? (
 <span className="animate-pulse bg-gray-200 rounded w-20 h-6 inline-block"></span>
 ) : (
 formatUSD(dashboardKPIs.balanceUSD)
 )}
 </div>
 </div>
 </div>

 {/* Avg. Completion Rate */}
 <div className="project-kpi-card">
 <div className={'text-start'}>
 <div className="project-card-description mb-1">{t.projects.avgCompletionRate}</div>
 <div className={`project-kpi-value ${ dashboardKPIs.avgCompletionRate >= 70 ? 'text-green-600' : dashboardKPIs.avgCompletionRate >= 40 ? 'text-yellow-600' : 'text-red-600' }`}>
 {isContextLoading || isDataLoading ? (
 <span className="animate-pulse bg-gray-200 rounded w-12 h-6 inline-block"></span>
 ) : (
 `${dashboardKPIs.avgCompletionRate.toFixed(1)}%`
 )}
 </div>
 </div>
 </div>
 </div>

 {/* Project List Section */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200">
 {/* Header with buttons */}
 <div className={`p-4 border-b border-gray-200 flex items-center justify-between`}>
 <h2 className="text-lg font-semibold text-gray-900">{t.projects.projectList}</h2>
 <div className={`flex items-center gap-2`}>
 <UnifiedExportButton
 hasData={filteredProjects.length > 0}
 onExportData={handleExportExcel}
 onExportTemplate={handleExportTemplate}
 moduleName="Projects"
 showModal={true}
 />
 <button
 onClick={() => setShowImportModal(true)}
 className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2`}
 >
 <Upload className="w-4 h-4" />
 {t.projects.importExcel}
 </button>
 <button
 onClick={() => setShowCreateModal(true)}
 className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2`}
 >
 <Plus className="w-4 h-4" />
 {t.projects.addNewProject}
 </button>
 </div>
 </div>

 {/* Search and Filters */}
 <div className="p-4 bg-gray-50 border-b border-gray-200">
 <div className={`flex items-center gap-4`}>
 {/* Search */}
 <div className="flex-1 relative">
 <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${'start-3'}`} />
 <input
 type="text"
 placeholder={t.projects.searchByTitle}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className={`w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ps-10 pe-4 text-start`}
 />
 </div>

 {/* Filter Tabs */}
 <div className={`flex items-center gap-2`}>
 {(['All', 'Ongoing', 'Planned', 'Completed', 'Not Started'] as ProjectStatus[]).map((status) => {
 // Map status to translation key
 const getStatusLabel = (s: ProjectStatus): string => {
 switch(s) {
 case 'All': return t.projects.all;
 case 'Ongoing': return t.projects.statusOngoing;
 case 'Planned': return t.projects.statusPlanned;
 case 'Completed': return t.projects.statusCompleted;
 case 'Not Started': return t.projects.statusNotStarted;
 default: return s;
 }
 };
 
 return (
 <button
 key={status}
 onClick={() => setStatusFilter(status)}
 className={`px-3 py-1.5 text-sm rounded-md transition-colors ${ statusFilter === status ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300' }`}
 >
 {getStatusLabel(status)}
 </button>
 );
 })}
 </div>

 {/* Sort */}
 <select className={`px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}>
 <option>A to Z</option>
 <option>Z to A</option>
 <option>Newest First</option>
 <option>Oldest First</option>
 </select>
 </div>
 </div>

 {/* Project Cards */}
 <div className="p-4 space-y-3">
 {filteredProjects.length === 0 ? (
 <div className="py-12 text-center text-gray-500">
 {t.projects.noProjects}
 </div>
 ) : (
 filteredProjects.map((project) => (
 <div key={project.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
 {/* Header */}
 <div className={`flex items-start justify-between mb-3`}>
 <div className="flex-1">
 <div className={`flex items-center gap-3`}>
 <h3 className="font-semibold text-gray-900">{project.title}</h3>
 <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${ project.status === 'Ongoing' ? 'bg-green-100 text-green-700' : project.status === 'Planned' ? 'bg-blue-100 text-blue-700' : project.status === 'Completed' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700' }`}>
 {project.status === 'Ongoing' ? t.projects.statusOngoing :
 project.status === 'Planned' ? t.projects.statusPlanned :
 project.status === 'Completed' ? t.projects.statusCompleted :
 project.status === 'Not Started' ? t.projects.statusNotStarted :
 project.status === 'Suspended' ? t.projects.statusSuspended :
 project.status}
 </span>
 </div>
 <p className="text-sm text-gray-600 mt-1">{t.projects.projectCode}: {project.projectCode}</p>
 </div>
 </div>

 {/* Budget Utilization */}
 <div className="mb-3">
 <div className={`flex items-center justify-between mb-1`}>
 <span className="text-xs text-gray-500">{t.projects.budgetUtilization}</span>
 <span className="text-xs font-medium text-red-600">{project.financeOverview.completionPercentage.toFixed(1)}%</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-1.5">
 <div
 className="bg-red-600 h-1.5 rounded-full transition-all"
 style={{ width: `${project.financeOverview.completionPercentage}%` }}
 />
 </div>
 </div>

 {/* Details Grid */}
 <div className="grid grid-cols-3 gap-4 mb-4">
 <div>
 <div className="text-xs text-gray-500 mb-0.5">{t.projects.startDate}</div>
 <div className="text-sm font-medium text-gray-900">{project.startDate}</div>
 </div>
 <div>
 <div className="text-xs text-gray-500 mb-0.5">{t.projects.endDate}</div>
 <div className="text-sm font-medium text-gray-900">{project.endDate}</div>
 </div>
 <div>
 <div className="text-xs text-gray-500 mb-0.5">{t.projects.sectors}</div>
 <div className="text-sm font-medium text-gray-900">
 {project.project_sectors && project.project_sectors.length > 0 
 ? project.project_sectors.slice(0, 2).join(', ') + (project.project_sectors.length > 2 ? '...' : '')
 : t.projects.notAvailable}
 </div>
 </div>
 <div>
 <div className="text-xs text-gray-500 mb-0.5">{t.projects.totalBudget}</div>
 <div className="text-sm font-medium text-gray-900">{project.financeOverview.totalBudget.toLocaleString()}</div>
 </div>
 <div>
 <div className="text-xs text-gray-500 mb-0.5">{t.projects.currency}</div>
 <div className="text-sm font-medium text-gray-900">{project.currency}</div>
 </div>
 <div>
 <div className="text-xs text-gray-500 mb-0.5">{t.projects.spent}</div>
 <div className="text-sm font-medium text-gray-900">{project.financeOverview.actualSpent.toLocaleString()}</div>
 </div>
 <div>
 <div className="text-xs text-gray-500 mb-0.5">{t.projects.balance}</div>
 <div className="text-sm font-medium text-gray-900">{project.financeOverview.available.toLocaleString()}</div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className={`flex items-center gap-2 pt-3 border-t border-gray-200`}>
 <Link
 to={`/projects/${project.id}`}
 className={`flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors`}
 >
 <Eye className="w-4 h-4" />
 {t.projects.viewDetails}
 </Link>
 <button
 onClick={() => {
 setEditingProject(project);
 setShowEditModal(true);
 }}
 className={`flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors`}
 >
 <Edit className="w-4 h-4" />
 {t.projects.updateProject}
 </button>
 <button
 onClick={() => {
 setSelectedProjectId(project.id);
 setShowDeleteModal(true);
 }}
 className={`flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors`}
 >
 <Trash2 className="w-4 h-4" />
 {t.projects.deleteProject}
 </button>
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 {/* Import Modal */}
 {showImportModal && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
 <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
 <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Projects from Excel</h3>
 <p className="text-sm text-gray-600 mb-4">
 Upload an Excel file with project data. Make sure to use the correct template format.
 </p>
 <input
 type="file"
 accept=".xlsx,.xls"
 onChange={handleImportExcel}
 className="w-full px-3 py-2 border border-gray-300 rounded-md"
 />
 <div className="mt-4 flex items-center justify-end gap-2">
 <button
 onClick={() => setShowImportModal(false)}
 className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Create Modal */}
 {showCreateModal && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
 {/* Header */}
 <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
 <div className={`flex items-center gap-4`}>
 <button
 onClick={() => setShowCreateModal(false)}
 className="p-1 hover:bg-gray-100 rounded-md transition-colors"
 >
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.organizationModule.m1519l7777} />
 </svg>
 </button>
 <div className={'text-start'}>
 <h2 className="text-xl font-semibold text-gray-900">Create New Project</h2>
 <p className="text-sm text-gray-500 mt-1">Fill in the project details below.</p>
 </div>
 </div>
 </div>

 {/* Form Content */}
 <form className="p-6 space-y-6">
 {/* Section 1: Basic Information */}
 <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
 <div className={'text-start'}>
 <h3 className="text-base font-semibold text-gray-900">Basic Information</h3>
 <p className="text-sm text-gray-500 mt-1">Enter the core project details.</p>
 </div>

 <div className="mt-4 space-y-4">
 {/* Row 1: Project Title (EN) + Project Title (AR) */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Project Title (EN) <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 name="title"
 placeholder={t.placeholders.enterProjectTitle}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 required
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Project Title (AR)
 </label>
 <input
 type="text"
 name="titleAr"
 placeholder={t.placeholders.enterProjectTitleInArabic}
 dir="rtl"
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-end"
 />
 </div>
 </div>

 {/* Row 2: Project Code + Associated Grant */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Project Code <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 name="code"
 placeholder={t.placeholders.projectCode}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 required
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Associated Grant
 </label>
 <select className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}>
 <option value="">{t.organizationModule.selectGrant}</option>
 <option value="grant1">UEFA Foundation Grant 2024</option>
 <option value="grant2">UNICEF Emergency Fund</option>
 <option value="grant3">ECHO Humanitarian Aid</option>
 </select>
 </div>
 </div>

 {/* Row 3: Project Status + Start Date + End Date */}
 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Project Status <span className="text-red-500">*</span>
 </label>
 <select className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}>
 <option value="Planning">{t.organizationModule.planning}</option>
 <option value="Ongoing">{t.organizationModule.ongoing}</option>
 <option value="Not Started">{t.organizationModule.notStarted}</option>
 <option value="Completed">{t.organizationModule.completed}</option>
 <option value="Suspended">{t.organizationModule.suspended}</option>
 </select>
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Start Date <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 name="startDate"
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 required
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 End Date <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 name="endDate"
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 required
 />
 </div>
 </div>

 {/* Row 4: Project Sectors (Multi-Select) */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 Project Sectors <span className="text-red-500">*</span>
 <span className="text-xs text-gray-500 font-normal ms-2">(Select at least one)</span>
 </label>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {getAllProjectSectors().map((sector) => (
 <label key={sector} className="flex items-center gap-2 p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
 <input
 type="checkbox"
 value={sector}
 checked={newProjectSectors.includes(sector)}
 onChange={(e) => {
 if (e.target.checked) {
 setNewProjectSectors([...newProjectSectors, sector]);
 } else {
 setNewProjectSectors(newProjectSectors.filter(s => s !== sector));
 }
 }}
 className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
 />
 <span className="text-sm text-gray-700">{sector}</span>
 </label>
 ))}
 </div>
 <p className="text-xs text-blue-600 mt-2">
 💡 Case Management tab will appear only for: Child Protection, Protection, or Education in Emergency
 </p>
 </div>
 </div>
 </div>

 {/* Section 2: Location & Details */}
 <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
 <div className={'text-start'}>
 <h3 className="text-base font-semibold text-gray-900">Location & Details</h3>
 <p className="text-sm text-gray-500 mt-1">Enter the project location and description.</p>
 </div>

 <div className="mt-4 space-y-4">
 {/* Row 1: Location (EN) + Location (AR) */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Location (EN)
 </label>
 <input
 type="text"
 placeholder={t.placeholders.enterLocation}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Location (AR)
 </label>
 <input
 type="text"
 placeholder={t.placeholders.enterLocationInArabic}
 dir="rtl"
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-end"
 />
 </div>
 </div>

 {/* Row 2: Description (EN) + Description (AR) */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Description (EN)
 </label>
 <textarea
 rows={3}
 placeholder={t.placeholders.enterProjectDescription}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Description (AR)
 </label>
 <textarea
 rows={3}
 placeholder={t.placeholders.enterProjectDescriptionInArabic}
 dir="rtl"
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-end"
 />
 </div>
 </div>

 {/* Row 3: Objectives (EN) + Objectives (AR) */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Objectives (EN)
 </label>
 <textarea
 rows={3}
 placeholder={t.placeholders.enterProjectObjectives}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Objectives (AR)
 </label>
 <textarea
 rows={3}
 placeholder={t.placeholders.enterProjectObjectivesInArabic}
 dir="rtl"
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-end"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Section 3: Project Management */}
 <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
 <div className={'text-start'}>
 <h3 className="text-base font-semibold text-gray-900">Project Management</h3>
 <p className="text-sm text-gray-500 mt-1">Enter project management and beneficiary information.</p>
 </div>

 <div className="mt-4">
 {/* Row 1: Project Manager + Target Beneficiary Count */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Project Manager
 </label>
 <input
 type="text"
 placeholder={t.placeholders.enterProjectManagerName}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Target Beneficiary Count
 </label>
 <input
 type="number"
 placeholder={t.placeholders.enterBeneficiaryCount}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className={`flex items-center justify-end gap-3 pt-4 border-t border-gray-200`}>
 <button
 type="button"
 onClick={() => {
 setShowCreateModal(false);
 setNewProjectSectors([]);
 }}
 className="px-6 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className={`px-6 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2`}
 >
 <Plus className="w-4 h-4" />
 Create Project
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Edit Modal */}
 {showEditModal && editingProject && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
 {/* Header */}
 <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
 <div className={`flex items-center gap-4`}>
 <button
 onClick={() => setShowEditModal(false)}
 className="p-1 hover:bg-gray-100 rounded-md transition-colors"
 >
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.organizationModule.m1519l7777} />
 </svg>
 </button>
 <div className={'text-start'}>
 <h2 className="text-xl font-semibold text-gray-900">Edit Project</h2>
 <p className="text-sm text-gray-500 mt-1">Update the project details below.</p>
 </div>
 </div>
 </div>

 {/* Form Content */}
 <form onSubmit={handleUpdateProject} className="p-6 space-y-6">
 {/* Section 1: Basic Information */}
 <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
 <div className={'text-start'}>
 <h3 className="text-base font-semibold text-gray-900">Basic Information</h3>
 <p className="text-sm text-gray-500 mt-1">Enter the core project details.</p>
 </div>

 <div className="mt-4 space-y-4">
 {/* Row 1: Project Title (EN) + Project Title (AR) */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Project Title (EN) <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 placeholder={t.placeholders.enterProjectTitle}
 value={editingProject.title}
 onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 required
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Project Title (AR)
 </label>
 <input
 type="text"
 placeholder={t.placeholders.enterProjectTitleInArabic}
 dir="rtl"
 value={editingProject.title}
 onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-end"
 />
 </div>
 </div>

 {/* Row 2: Project Code + Associated Grant */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Project Code <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 placeholder={t.placeholders.projectCode}
 value={editingProject.code}
 onChange={(e) => setEditingProject({ ...editingProject, code: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 required
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Associated Grant
 </label>
 <select className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}>
 <option value="">{t.organizationModule.selectGrant}</option>
 <option value="grant1">UEFA Foundation Grant 2024</option>
 <option value="grant2">UNICEF Emergency Fund</option>
 <option value="grant3">ECHO Humanitarian Aid</option>
 </select>
 </div>
 </div>

 {/* Row 3: Project Status + Start Date + End Date */}
 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Project Status <span className="text-red-500">*</span>
 </label>
 <select 
 value={editingProject.status}
 onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 >
 <option value="Planned">{t.organizationModule.planned26}</option>
 <option value="Ongoing">{t.organizationModule.ongoing}</option>
 <option value="Not Started">{t.organizationModule.notStarted}</option>
 <option value="Completed">{t.organizationModule.completed}</option>
 <option value="Suspended">{t.organizationModule.suspended}</option>
 </select>
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Start Date <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 value={editingProject.startDate}
 onChange={(e) => setEditingProject({ ...editingProject, startDate: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 required
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 End Date <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 value={editingProject.endDate}
 onChange={(e) => setEditingProject({ ...editingProject, endDate: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 required
 />
 </div>
 </div>

 {/* Row 4: Project Sectors (Multi-Select) */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 Project Sectors <span className="text-red-500">*</span>
 <span className="text-xs text-gray-500 font-normal ms-2">(Select at least one)</span>
 </label>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {getAllProjectSectors().map((sector) => (
 <label key={sector} className="flex items-center gap-2 p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
 <input
 type="checkbox"
 value={sector}
 checked={editingProject.project_sectors?.includes(sector) || false}
 onChange={(e) => {
 const newSectors = e.target.checked
 ? [...(editingProject.project_sectors || []), sector]
 : (editingProject.project_sectors || []).filter(s => s !== sector);
 setEditingProject({ ...editingProject, project_sectors: newSectors });
 }}
 className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
 />
 <span className="text-sm text-gray-700">{sector}</span>
 </label>
 ))}
 </div>
 <p className="text-xs text-blue-600 mt-2">
 💡 Case Management tab will appear only for: Child Protection, Protection, or Education in Emergency
 </p>
 </div>
 </div>
 </div>

 {/* Section 2: Location & Details */}
 <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
 <div className={'text-start'}>
 <h3 className="text-base font-semibold text-gray-900">Location & Details</h3>
 <p className="text-sm text-gray-500 mt-1">Enter the project location and description.</p>
 </div>

 <div className="mt-4 space-y-4">
 {/* Row 1: Location (EN) + Location (AR) */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Location (EN)
 </label>
 <input
 type="text"
 placeholder={t.placeholders.enterLocation}
 value={editingProject.location || ''}
 onChange={(e) => setEditingProject({ ...editingProject, location: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Location (AR)
 </label>
 <input
 type="text"
 placeholder={t.placeholders.enterLocationInArabic}
 value={editingProject.locationAr || ''}
 onChange={(e) => setEditingProject({ ...editingProject, locationAr: e.target.value })}
 dir="rtl"
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-end"
 />
 </div>
 </div>

 {/* Row 2: Description (EN) + Description (AR) */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Description (EN)
 </label>
 <textarea
 rows={3}
 placeholder={t.placeholders.enterProjectDescription}
 value={editingProject.description || ''}
 onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Description (AR)
 </label>
 <textarea
 rows={3}
 placeholder={t.placeholders.enterProjectDescriptionInArabic}
 value={editingProject.descriptionAr || ''}
 onChange={(e) => setEditingProject({ ...editingProject, descriptionAr: e.target.value })}
 dir="rtl"
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-end"
 />
 </div>
 </div>

 {/* Row 3: Objectives (EN) + Objectives (AR) */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Objectives (EN)
 </label>
 <textarea
 rows={3}
 placeholder={t.placeholders.enterProjectObjectives}
 value={editingProject.objectives || ''}
 onChange={(e) => setEditingProject({ ...editingProject, objectives: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Objectives (AR)
 </label>
 <textarea
 rows={3}
 placeholder={t.placeholders.enterProjectObjectivesInArabic}
 value={editingProject.objectivesAr || ''}
 onChange={(e) => setEditingProject({ ...editingProject, objectivesAr: e.target.value })}
 dir="rtl"
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-end"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Section 3: Project Management */}
 <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
 <div className={'text-start'}>
 <h3 className="text-base font-semibold text-gray-900">Project Management</h3>
 <p className="text-sm text-gray-500 mt-1">Enter project management and beneficiary information.</p>
 </div>

 <div className="mt-4">
 {/* Row 1: Project Manager + Target Beneficiary Count */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Project Manager
 </label>
 <input
 type="text"
 placeholder={t.placeholders.enterProjectManagerName}
 value={editingProject.manager || ''}
 onChange={(e) => setEditingProject({ ...editingProject, manager: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Target Beneficiary Count
 </label>
 <input
 type="number"
 placeholder={t.placeholders.enterBeneficiaryCount}
 value={editingProject.targetBeneficiaries || ''}
 onChange={(e) => setEditingProject({ ...editingProject, targetBeneficiaries: Number(e.target.value) })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className={`flex items-center justify-end gap-3 pt-4 border-t border-gray-200`}>
 <button
 type="button"
 onClick={() => setShowEditModal(false)}
 className="px-6 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 onClick={handleUpdateProject}
 className={`px-6 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2`}
 >
 <Edit className="w-4 h-4" />
 Update Project
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Delete Confirmation Modal */}
 {showDeleteModal && selectedProjectId && (() => {
 const project = projects.find(p => p.id === selectedProjectId);
 return (
 <DeleteConfirmationModal
 isOpen={showDeleteModal}
 recordName={project?.title || 'Unknown Project'}
 recordType="Project"
 onClose={() => {
 setSelectedProjectId(null);
 setShowDeleteModal(false);
 }}
 onConfirm={async () => {
 if (selectedProjectId) {
 // Remove from state
 const updatedProjects = projects.filter(p => p.id !== selectedProjectId);
 setProjects(updatedProjects);
 
 // Remove from localStorage
 localStorage.setItem('pms_projects', JSON.stringify(updatedProjects.map(project => ({
 id: project.id,
 title: project.title,
 code: project.projectCode,
 projectCode: project.projectCode,
 projectName: project.title,
 donor: project.donor || 'UEFA Foundation',
 implementingPartner: project.implementingPartner || 'Local NGO',
 startDate: project.startDate,
 endDate: project.endDate,
 currency: project.currency,
 totalBudget: project.financeOverview?.totalBudget || 0,
 budget: project.budget || project.financeOverview?.totalBudget || 0,
 status: project.status,
 project_sectors: project.project_sectors,
 sectors: project.sectors || project.project_sectors?.map(s => s.sector_name),
 financeOverview: project.financeOverview,
 description: project.description || '',
 descriptionAr: project.descriptionAr || '',
 manager: project.manager || '',
 location: project.location || '',
 locationAr: project.locationAr || '',
 objectives: project.objectives || '',
 objectivesAr: project.objectivesAr || '',
 targetBeneficiaries: project.targetBeneficiaries || 0,
 createdAt: project.createdAt || new Date().toISOString(),
 updatedAt: new Date().toISOString()
 }))));
 
 // Track deletion
 await deleteRecord(selectedProjectId);
 
 // Show success message
 alert('✅ Project deleted successfully!');
 
 // Close modal
 setSelectedProjectId(null);
 setShowDeleteModal(false);
 }
 }}
 />
 );
 })()}
 </div>
 );
}