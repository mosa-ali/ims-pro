import React, { useState, useEffect } from 'react';
import { X, Plus, Search, Download, Upload, Edit, Trash2, Eye, FileSpreadsheet, Calendar, DollarSign, Building2, AlertCircle, FileText, Clock, FolderOpen, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber } from '@/lib/utils/formatting';
import { useAuth } from '@/_core/hooks/useAuth';
import { GrantFormModal } from '@/pages/organization/GrantFormModal';
import { GrantDetailsModal } from '@/pages/organization/GrantDetailsModal';
import { ProjectSectorType } from '@/types/database.types';
import { formatProjectSectors } from '@/utils/projectHelpers';
import ExcelJS from 'exceljs';
import { UnifiedExportButton } from '@/components/exports/UnifiedExportButton';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// ============================================================================
// INTERFACES
// ============================================================================

// Project interface (matching ProjectsManagementDashboard)
interface Project {
 id: string;
 title: string;
 code: string;
 description?: string;
 startDate?: string;
 endDate?: string;
 budget?: number;
 currency?: string;
 status?: string;
 donor?: string;
 project_sectors?: ProjectSectorType[]; // Updated to match ProjectsManagementDashboard
 sectors?: string[]; // Legacy field for backward compatibility
 manager?: string;
 // NEW: Support for finance overview structure
 financeOverview?: {
 totalBudget: number;
 actualSpent: number;
 committed: number;
 available: number;
 completionPercentage: number;
 };
}

interface Milestone {
 id: string;
 name: string;
 type: 'Contract' | 'Report' | 'Amendment' | 'Payment' | 'Audit';
 description: string;
 dueDate: string;
 submittedDate: string | null;
 status: 'Pending' | 'Submitted' | 'Approved' | 'Overdue';
 responsibleUnit: string;
 remarks: string;
}

interface Document {
 id: string;
 name: string;
 type: string;
 category: 'Contractual' | 'Financial' | 'Programmatic' | 'Supporting';
 version: string;
 uploadedBy: string;
 uploadDate: string;
 status: 'Draft' | 'Final' | 'Approved';
}

interface Grant {
 id: string;
 grantNumber: string;
 grantName: string;
 donorName: string;
 donorReference: string;
 currency: string;
 grantAmount: number;
 startDate: string;
 endDate: string;
 status: 'Active' | 'Completed' | 'Pending' | 'On Hold';
 reportingStatus: 'On track' | 'Due' | 'Overdue';
 projectId: string;
 projectName: string;
 sector: string;
 responsible: string;
 description: string;
 reportingFrequency: string;
 coFunding: boolean;
 coFunderName: string;
 createdAt: string;
 updatedAt: string;
 milestones: Milestone[];
 documents: Document[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Currency conversion rates (same as ProjectsManagementDashboard)
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
 * Calculate Total Budget (USD) from projects
 * This matches the "Total Budget (USD)" KPI in Project Management Dashboard
 * CRITICAL: Only sums ONGOING projects to match Dashboard calculation
 */
function calculateTotalBudgetUSD(projects: Project[], filterProjectId?: string): number {
 let relevantProjects = projects;
 
 // Filter by specific project if needed
 if (filterProjectId && filterProjectId !== 'all') {
 relevantProjects = projects.filter(p => p.id === filterProjectId);
 }
 
 // CRITICAL: Only count ONGOING projects (matches Dashboard logic)
 const ongoingProjects = relevantProjects.filter(p => 
 p.status === 'Ongoing' || p.status === 'ongoing'
 );
 
 return ongoingProjects.reduce((sum, project) => {
 // Support both old structure (budget) and new structure (financeOverview.totalBudget)
 const budgetAmount = project.financeOverview?.totalBudget ?? project.budget ?? 0;
 const budgetInUSD = convertToUSD(budgetAmount, project.currency || 'USD');
 return sum + budgetInUSD;
 }, 0);
}

/**
 * Map Project Status to Grant Status (AUTO-DERIVED)
 * CRITICAL: Grant status MUST be derived from Project status, not manually set
 */
function mapProjectStatusToGrantStatus(projectStatus?: string): Grant['status'] {
 const status = projectStatus?.toLowerCase() || '';
 
 // Ongoing → Active
 if (status === 'ongoing') return 'Active';
 
 // Completed → Completed
 if (status === 'completed') return 'Completed';
 
 // Planned, Not Started → Pending
 if (status === 'planned' || status === 'not started') return 'Pending';
 
 // Suspended, Closed → On Hold
 if (status === 'suspended' || status === 'closed') return 'On Hold';
 
 // Default
 return 'Pending';
}

function generateGrantsFromProjects(projects: Project[]): Grant[] {
 return projects.map((project, index) => {
 const year = new Date().getFullYear();
 const grantNumber = `GR-${year}-${String(index + 1).padStart(3, '0')}`;
 
 // Auto-calculate grant amount from project budget (supports both old and new structure)
 const budgetAmount = project.financeOverview?.totalBudget ?? project.budget ?? 0;
 
 // AUTO-DERIVE grant status from project status
 const grantStatus = mapProjectStatusToGrantStatus(project.status);
 
 return {
 id: `grant-${project.id}`,
 grantNumber,
 grantName: project.title,
 donorName: project.donor || 'Not specified',
 donorReference: '',
 currency: project.currency || 'USD',
 grantAmount: budgetAmount, // AUTO: Uses project's total budget
 startDate: project.startDate || '',
 endDate: project.endDate || '',
 status: grantStatus, // AUTO-DERIVED from project status
 reportingStatus: 'On track',
 projectId: project.id,
 projectName: project.title,
 sector: formatProjectSectors(project.project_sectors) || 'Not specified',
 responsible: project.manager || 'Not assigned',
 description: project.description || '',
 reportingFrequency: 'Quarterly',
 coFunding: false,
 coFunderName: '',
 milestones: [],
 documents: [],
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString()
 };
 });
}

function loadGrants(): Grant[] {
 const storedGrants = localStorage.getItem('pms_grants');
 if (storedGrants) {
 try {
 return JSON.parse(storedGrants);
 } catch (error) {
 console.error('Error loading grants:', error);
 }
 }
 
 return [];
}

function saveGrants(grants: Grant[]) {
 localStorage.setItem('pms_grants', JSON.stringify(grants));
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================
interface ActiveGrantsProps {
 projectId: string | 'all';
 onClose: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================
export function ActiveGrants({
 projectId, onClose }: ActiveGrantsProps) {
 const { t } = useTranslation();
 const { isRTL } = useLanguage();
const { user } = useAuth();
 
 const [grants, setGrants] = useState<Grant[]>(loadGrants());
 const [searchTerm, setSearchTerm] = useState('');
 const [statusFilter, setStatusFilter] = useState('All');
 const [donorFilter, setDonorFilter] = useState('All');
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);
 const [showDetailsModal, setShowDetailsModal] = useState(false);
 const [showDeleteModal, setShowDeleteModal] = useState(false);
 const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null);
 const [currentPage, setCurrentPage] = useState(1);
 const itemsPerPage = 10;

 const isAdmin = user?.role === 'Admin' || user?.role === 'Finance';
 const canEdit = isAdmin;
 const canExport = isAdmin || user?.role === 'Manager';

 // ============================================================================
 // AUTO-SYNC: Automatically sync grants with projects on component mount
 // ============================================================================
 useEffect(() => {
 const syncGrantsWithProjects = () => {
 const projects = loadProjects();
 const existingGrants = loadGrants(); // Load fresh from localStorage
 
 // Create a map of existing grants by projectId for quick lookup
 const grantsByProjectId = new Map(
 existingGrants.map(grant => [grant.projectId, grant])
 );
 
 // Update or create grants from projects
 const updatedGrants: Grant[] = [];
 
 projects.forEach((project, index) => {
 const existingGrant = grantsByProjectId.get(project.id);
 const budgetAmount = project.financeOverview?.totalBudget ?? project.budget ?? 0;
 const year = new Date().getFullYear();
 const grantNumber = existingGrant?.grantNumber || `GR-${year}-${String(index + 1).padStart(3, '0')}`;
 
 // AUTO-DERIVE grant status from project status (CRITICAL FIX)
 const grantStatus = mapProjectStatusToGrantStatus(project.status);
 
 const grant: Grant = {
 id: existingGrant?.id || `grant-${project.id}`,
 grantNumber,
 grantName: project.title,
 donorName: project.donor || existingGrant?.donorName || 'Not specified',
 donorReference: existingGrant?.donorReference || '',
 currency: project.currency || 'USD',
 grantAmount: budgetAmount, // AUTO-UPDATED from project budget
 startDate: project.startDate || '',
 endDate: project.endDate || '',
 status: grantStatus, // AUTO-DERIVED: Ongoing → Active, Completed → Completed, etc.
 reportingStatus: existingGrant?.reportingStatus || 'On track',
 projectId: project.id,
 projectName: project.title,
 sector: formatProjectSectors(project.project_sectors) || existingGrant?.sector || 'Not specified',
 responsible: project.manager || existingGrant?.responsible || 'Not assigned',
 description: project.description || existingGrant?.description || '',
 reportingFrequency: existingGrant?.reportingFrequency || 'Quarterly',
 coFunding: existingGrant?.coFunding || false,
 coFunderName: existingGrant?.coFunderName || '',
 milestones: existingGrant?.milestones || [],
 documents: existingGrant?.documents || [],
 createdAt: existingGrant?.createdAt || new Date().toISOString(),
 updatedAt: new Date().toISOString()
 };
 
 updatedGrants.push(grant);
 grantsByProjectId.delete(project.id);
 });
 
 // Keep grants that don't have matching projects (manually created grants)
 grantsByProjectId.forEach(grant => {
 updatedGrants.push(grant);
 });
 
 // Update state and localStorage
 setGrants(updatedGrants);
 saveGrants(updatedGrants);
 console.log('✅ Grants auto-synced with projects on mount');
 };
 
 // Sync on component mount
 syncGrantsWithProjects();
 
 // Set up periodic sync every 2 seconds to catch project updates
 const syncInterval = setInterval(() => {
 const projects = loadProjects();
 const currentGrants = loadGrants(); // Fresh load from localStorage
 
 // Check if project data has changed by comparing timestamps
 const projectsChanged = projects.some(project => {
 const matchingGrant = currentGrants.find(g => g.projectId === project.id);
 if (!matchingGrant) return true; // New project
 
 // Check if critical fields have changed
 const budgetAmount = project.financeOverview?.totalBudget ?? project.budget ?? 0;
 const grantStatus = mapProjectStatusToGrantStatus(project.status);
 
 return (
 matchingGrant.grantName !== project.title ||
 matchingGrant.grantAmount !== budgetAmount ||
 matchingGrant.status !== grantStatus ||
 matchingGrant.donorName !== (project.donor || 'Not specified') ||
 matchingGrant.currency !== (project.currency || 'USD') ||
 matchingGrant.responsible !== (project.manager || 'Not assigned') ||
 matchingGrant.projectName !== project.title ||
 matchingGrant.startDate !== (project.startDate || '') ||
 matchingGrant.endDate !== (project.endDate || '')
 );
 });
 
 if (projectsChanged) {
 console.log('🔄 Detected project changes, auto-syncing grants...');
 syncGrantsWithProjects();
 }
 }, 2000); // Check every 2 seconds
 
 return () => clearInterval(syncInterval);
 }, []); // Run once on mount and set up interval

 // Manual sync function for the Sync button
 const handleSyncWithProjects = () => {
 const projects = loadProjects();
 const updatedGrants = generateGrantsFromProjects(projects);
 setGrants(updatedGrants);
 saveGrants(updatedGrants);
 alert('✅ Grants synchronized with projects successfully');
 };

 const projectGrants = projectId === 'all' 
 ? grants 
 : grants.filter(grant => grant.projectId === projectId);

 const filteredGrants = projectGrants.filter(grant => {
 const matchesSearch = 
 grant.grantNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
 grant.grantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
 grant.donorName.toLowerCase().includes(searchTerm.toLowerCase());
 
 const matchesStatus = statusFilter === 'All' || grant.status === statusFilter;
 const matchesDonor = donorFilter === 'All' || grant.donorName === donorFilter;
 
 return matchesSearch && matchesStatus && matchesDonor;
 });

 const uniqueDonors = ['All', ...Array.from(new Set(projectGrants.map(g => g.donorName)))];

 const totalPages = Math.ceil(filteredGrants.length / itemsPerPage);
 const paginatedGrants = filteredGrants.slice(
 (currentPage - 1) * itemsPerPage,
 currentPage * itemsPerPage
 );

 // ✅ Load projects from database via trpc
 const { data: trpcProjects = [] } = trpc.projects.list.useQuery({});
 const allProjects: Project[] = trpcProjects.map(p => ({
 id: String(p.id),
 title: p.title || '',
 code: p.code || '',
 status: p.status || '',
 startDate: p.startDate ? String(p.startDate) : '',
 endDate: p.endDate ? String(p.endDate) : '',
 budget: p.budget ? Number(p.budget) : 0,
 donor: (p as any).donor || '',
 sector: (p as any).sector || '',
 }));
 const relevantProjects = projectId === 'all' 
 ? allProjects 
 : allProjects.filter(p => p.id === projectId);

 const kpis = {
 totalGrants: projectGrants.length,
 activeGrants: projectGrants.filter(g => g.status === 'Active').length,
 totalAmount: calculateTotalBudgetUSD(relevantProjects),
 completedGrants: projectGrants.filter(g => g.status === 'Completed').length
 };

 const handleExportExcel = async () => {
 const workbook = new ExcelJS.Workbook();
 const worksheet = workbook.addWorksheet('Active Grants');

 worksheet.columns = [
 { header: 'Grant Number', key: 'grantNumber', width: 15 },
 { header: 'Grant Name', key: 'grantName', width: 30 },
 { header: 'Donor', key: 'donorName', width: 20 },
 { header: 'Donor Reference', key: 'donorReference', width: 20 },
 { header: 'Amount', key: 'grantAmount', width: 15 },
 { header: 'Currency', key: 'currency', width: 10 },
 { header: 'Start Date', key: 'startDate', width: 12 },
 { header: 'End Date', key: 'endDate', width: 12 },
 { header: 'Status', key: 'status', width: 12 },
 { header: 'Reporting Status', key: 'reportingStatus', width: 15 }
 ];

 worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
 worksheet.getRow(1).fill = {
 type: 'pattern',
 pattern: 'solid',
 fgColor: { argb: 'FF3B82F6' }
 };

 filteredGrants.forEach(grant => {
 worksheet.addRow(grant);
 });

 const buffer = await workbook.xlsx.writeBuffer();
 const blob = new Blob([buffer], { 
 type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
 });
 saveAs(blob, `Active_Grants_${new Date().toISOString().split('T')[0]}.xlsx`);
 };

 const handleExportTemplate = async () => {
 const workbook = new ExcelJS.Workbook();
 const worksheet = workbook.addWorksheet('Grant Import Template');

 worksheet.columns = [
 { header: 'Grant Number', key: 'grantNumber', width: 15 },
 { header: 'Grant Name', key: 'grantName', width: 30 },
 { header: 'Donor', key: 'donorName', width: 20 },
 { header: 'Donor Reference', key: 'donorReference', width: 20 },
 { header: 'Amount', key: 'grantAmount', width: 15 },
 { header: 'Currency', key: 'currency', width: 10 },
 { header: 'Start Date (YYYY-MM-DD)', key: 'startDate', width: 20 },
 { header: 'End Date (YYYY-MM-DD)', key: 'endDate', width: 20 },
 { header: 'Status (Active/Pending/Completed/On Hold)', key: 'status', width: 35 },
 { header: 'Reporting Status (On track/Due/Overdue)', key: 'reportingStatus', width: 35 },
 { header: 'Sector', key: 'sector', width: 30 },
 { header: 'Responsible', key: 'responsible', width: 20 },
 { header: 'Description', key: 'description', width: 40 },
 { header: 'Reporting Frequency', key: 'reportingFrequency', width: 20 },
 { header: 'Co-Funding (Yes/No)', key: 'coFunding', width: 15 },
 { header: 'Co-Funder Name', key: 'coFunderName', width: 20 }
 ];

 worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
 worksheet.getRow(1).fill = {
 type: 'pattern',
 pattern: 'solid',
 fgColor: { argb: 'FF3B82F6' }
 };

 worksheet.addRow({
 grantNumber: 'GR-2024-XXX',
 grantName: 'Example Grant Name',
 donorName: 'Example Donor',
 donorReference: 'DON-REF-001',
 grantAmount: 100000,
 currency: 'EUR',
 startDate: '2024-01-01',
 endDate: '2025-12-31',
 status: 'Active',
 reportingStatus: 'On track',
 sector: 'Education',
 responsible: 'John Doe',
 description: 'Example description',
 reportingFrequency: 'Quarterly',
 coFunding: 'No',
 coFunderName: ''
 });

 const buffer = await workbook.xlsx.writeBuffer();
 const blob = new Blob([buffer], { 
 type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
 });
 saveAs(blob, `Grant_Import_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
 };

 const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;

 try {
 const workbook = new ExcelJS.Workbook();
 await workbook.xlsx.load(await file.arrayBuffer());
 const worksheet = workbook.getWorksheet('Grant Import Template') || workbook.worksheets[0];

 const importedGrants: Grant[] = [];
 worksheet.eachRow((row, rowNumber) => {
 if (rowNumber === 1) return;

 const grant: Grant = {
 id: `grant-${Date.now()}-${rowNumber}`,
 grantNumber: String(row.getCell(1).value || ''),
 grantName: String(row.getCell(2).value || ''),
 donorName: String(row.getCell(3).value || ''),
 donorReference: String(row.getCell(4).value || ''),
 grantAmount: Number(row.getCell(5).value || 0),
 currency: String(row.getCell(6).value || 'USD'),
 startDate: String(row.getCell(7).value || ''),
 endDate: String(row.getCell(8).value || ''),
 status: (String(row.getCell(9).value || 'Pending')) as Grant['status'],
 reportingStatus: (String(row.getCell(10).value || 'On track')) as Grant['reportingStatus'],
 sector: String(row.getCell(11).value || ''),
 responsible: String(row.getCell(12).value || ''),
 description: String(row.getCell(13).value || ''),
 reportingFrequency: String(row.getCell(14).value || 'Quarterly'),
 coFunding: String(row.getCell(15).value || 'No') === 'Yes',
 coFunderName: String(row.getCell(16).value || ''),
 projectId: projectId === 'all' ? '' : projectId,
 projectName: '',
 milestones: [],
 documents: [],
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString()
 };

 const isDuplicate = grants.some(g => g.grantNumber === grant.grantNumber);
 if (!isDuplicate && grant.grantNumber) {
 importedGrants.push(grant);
 }
 });

 if (importedGrants.length > 0) {
 const updated = [...grants, ...importedGrants];
 setGrants(updated);
 saveGrants(updated);
 alert(`✅ Successfully imported ${importedGrants.length} grants`);
 } else {
 alert('⚠️ No new grants to import or all grants already exist');
 }
 } catch (error) {
 console.error('Import error:', error);
 alert('❌ Error importing Excel file. Please check the format.');
 }

 event.target.value = '';
 };

 const handleDelete = () => {
 if (!selectedGrant) return;
 
 const updated = grants.filter(g => g.id !== selectedGrant.id);
 setGrants(updated);
 saveGrants(updated);
 setShowDeleteModal(false);
 setSelectedGrant(null);
 alert('✅ Grant deleted successfully');
 };

 const getStatusColor = (status: Grant['status']) => {
 switch (status) {
 case 'Active': return 'bg-green-100 text-green-800 border-green-200';
 case 'Completed': return 'bg-blue-100 text-blue-800 border-blue-200';
 case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
 case 'On Hold': return 'bg-red-100 text-red-800 border-red-200';
 default: return 'bg-gray-100 text-gray-800 border-gray-200';
 }
 };

 return (
 <div className="project-page" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className={`flex items-center justify-between mb-6`}>
 <div className={`flex items-center gap-4`}>
 <BackButton onClick={onClose} label={t.organizationModule.back} />
 <div className={'text-start'}>
 <h1 className="project-page-title">
 {t.organizationModule.activeGrantsManagement}
 {projectId === 'all' && (
 <span className="text-sm font-normal text-gray-500 ms-2">
 {t.organizationModule.allProjects}
 </span>
 )}
 </h1>
 <p className="project-page-subtitle">
 {t.organizationModule.manageAndTrackGrantedFunds}
 </p>
 </div>
 </div>
 {canEdit && (
 <button
 onClick={() => setShowCreateModal(true)}
 className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2`}
 >
 <Plus className="w-4 h-4" />
 {t.organizationModule.addGrant}
 </button>
 )}
 </div>

 {/* KPI Cards */}
 <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6`}>
 <div className="project-card">
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <div className="project-card-description mb-2">{t.organizationModule.totalGrants}</div>
 <div className="project-kpi-value text-gray-900">{kpis.totalGrants}</div>
 </div>
 <div className="p-3 bg-blue-100 rounded-lg">
 <FileSpreadsheet className="w-5 h-5 text-blue-600" />
 </div>
 </div>
 </div>

 <div className="project-card">
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <div className="project-card-description mb-2">{t.organizationModule.activeGrants}</div>
 <div className="project-kpi-value text-green-600">{kpis.activeGrants}</div>
 </div>
 <div className="p-3 bg-green-100 rounded-lg">
 <FileText className="w-5 h-5 text-green-600" />
 </div>
 </div>
 </div>

 <div className="project-card">
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <div className="project-card-description mb-2">{t.organizationModule.totalAmount}</div>
 <div className="ltr-safe project-kpi-value text-gray-900">{formatNumber(kpis.totalAmount)}</div>
 </div>
 <div className="p-3 bg-purple-100 rounded-lg">
 <DollarSign className="w-5 h-5 text-purple-600" />
 </div>
 </div>
 </div>

 <div className="project-card">
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <div className="project-card-description mb-2">{t.organizationModule.completedGrants}</div>
 <div className="project-kpi-value text-gray-900">{kpis.completedGrants}</div>
 </div>
 <div className="p-3 bg-gray-100 rounded-lg">
 <FileSpreadsheet className="w-5 h-5 text-gray-600" />
 </div>
 </div>
 </div>
 </div>

 {/* Main Content */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200">
 {/* Action Bar */}
 <div className={`p-4 border-b border-gray-200 flex flex-wrap items-center gap-3`}>
 <div className={`relative flex-1 min-w-[250px] text-start`}>
 <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${'start-3'}`} />
 <input
 type="text"
 placeholder={t.organizationModule.searchGrants}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className={`w-full border border-gray-300 rounded-md py-2 text-sm focus:ring-2 focus:ring-primary ps-10`}
 />
 </div>

 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
 className={`px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary ${isRTL ? 'text-end' : ''}`}
 >
 <option value="All">{t.organizationModule.allStatus}</option>
 <option value="Active">{t.organizationModule.active}</option>
 <option value="Completed">{t.organizationModule.completed}</option>
 <option value="Pending">{t.organizationModule.pending}</option>
 <option value="On Hold">{t.organizationModule.onHold}</option>
 </select>

 <select
 value={donorFilter}
 onChange={(e) => setDonorFilter(e.target.value)}
 className={`px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary ${isRTL ? 'text-end' : ''}`}
 >
 {uniqueDonors.map(donor => (
 <option key={donor} value={donor}>
 {donor === 'All' ? (t.organizationModule.allDonors) : donor}
 </option>
 ))}
 </select>

 <div className="flex-1"></div>

 {/* Sync with Projects Button */}
 {canEdit && (
 <button
 onClick={handleSyncWithProjects}
 className={`px-3 py-2 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 flex items-center gap-2`}
 title={t.organizationModule.syncWithProjects}
 >
 <RefreshCw className="w-4 h-4" />
 {t.organizationModule.sync}
 </button>
 )}

 {/* Export/Import Buttons */}
 <UnifiedExportButton
 hasData={filteredGrants.length > 0}
 onExportData={handleExportExcel}
 onExportTemplate={handleExportTemplate}
 moduleName="Active Grants"
 showModal={true}
 />
 
 {canEdit && (
 <label className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 cursor-pointer`}>
 <Upload className="w-4 h-4" />
 {t.organizationModule.import}
 <input
 type="file"
 accept=".xlsx,.xls"
 onChange={handleImportExcel}
 className="hidden"
 />
 </label>
 )}
 </div>

 {/* Table */}
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200">
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-start">
 {t.organizationModule.grantNumber}
 </th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-start">
 {t.organizationModule.grantName}
 </th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-start">
 {t.organizationModule.donor}
 </th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-end">
 {t.organizationModule.amount}
 </th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">
 {t.organizationModule.dates}
 </th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">
 {t.organizationModule.status}
 </th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">
 {t.organizationModule.actions}
 </th>
 </tr>
 </thead>
 <tbody>
 {paginatedGrants.map((grant, index) => (
 <tr key={grant.id} className={`border-b border-gray-200 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
 <td className="px-4 py-3 text-sm font-medium text-primary">
 {grant.grantNumber}
 </td>
 <td className="px-4 py-3 text-sm text-gray-900">
 {grant.grantName}
 </td>
 <td className="px-4 py-3 text-sm text-gray-700">
 <div className={`flex items-center gap-2`}>
 <Building2 className="w-4 h-4 text-gray-400" />
 {grant.donorName}
 </div>
 </td>
 <td className="ltr-safe px-4 py-3 text-sm font-medium text-end">
 {formatNumber(grant.grantAmount)} {grant.currency}
 </td>
 <td className="px-4 py-3 text-xs text-gray-600 text-center">
 <div className="flex flex-col gap-1">
 <div>{grant.startDate}</div>
 <div className="text-gray-500">{grant.endDate}</div>
 </div>
 </td>
 <td className="px-4 py-3 text-center">
 <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(grant.status)}`}>
 {isRTL ? (grant.status === 'Active' ? 'نشط' : grant.status === 'Completed' ? 'مكتمل' : grant.status === 'Pending' ? 'قيد الانتظار' : 'معلق') : grant.status}
 </span>
 </td>
 <td className="px-4 py-3 text-center">
 <div className={`flex items-center justify-center gap-2`}>
 {canEdit && (
 <button
 onClick={() => {
 setSelectedGrant(grant);
 setShowEditModal(true);
 }}
 className="p-1 text-blue-600 hover:bg-blue-50 rounded"
 title={t.organizationModule.edit}
 >
 <Edit className="w-4 h-4" />
 </button>
 )}
 <button
 onClick={() => {
 setSelectedGrant(grant);
 setShowDetailsModal(true);
 }}
 className="p-1 text-green-600 hover:bg-green-50 rounded"
 title={t.organizationModule.view}
 >
 <Eye className="w-4 h-4" />
 </button>
 {canEdit && (
 <button
 onClick={() => {
 setSelectedGrant(grant);
 setShowDeleteModal(true);
 }}
 className="p-1 text-red-600 hover:bg-red-50 rounded"
 title={t.organizationModule.delete}
 >
 <Trash2 className="w-4 h-4" />
 </button>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 {totalPages > 1 && (
 <div className={`p-4 border-t border-gray-200 flex items-center justify-between`}>
 <div className="text-sm text-gray-700">
 {`Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredGrants.length)} of ${filteredGrants.length}`
 }
 </div>
 <div className={`flex gap-2`}>
 <button
 onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
 disabled={currentPage === 1}
 className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {t.organizationModule.previous}
 </button>
 <span className="px-3 py-1 text-sm">
 {`${currentPage} of ${totalPages}`}
 </span>
 <button
 onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
 disabled={currentPage === totalPages}
 className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {t.organizationModule.next}
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Modals */}
 {showCreateModal && (
 <GrantFormModal
 mode="create"
 projectId={projectId === 'all' ? undefined : projectId}
 onClose={() => setShowCreateModal(false)}
 onSave={(newGrant) => {
 const updated = [...grants, newGrant];
 setGrants(updated);
 saveGrants(updated);
 setShowCreateModal(false);
 alert('✅ Grant created successfully');
 }}
 />
 )}

 {showEditModal && selectedGrant && (
 <GrantFormModal
 mode="edit"
 grant={selectedGrant}
 onClose={() => {
 setShowEditModal(false);
 setSelectedGrant(null);
 }}
 onSave={(updatedGrant) => {
 const updated = grants.map(g => g.id === updatedGrant.id ? updatedGrant : g);
 setGrants(updated);
 saveGrants(updated);
 setShowEditModal(false);
 setSelectedGrant(null);
 alert('✅ Grant updated successfully');
 }}
 />
 )}

 {showDeleteModal && selectedGrant && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
 <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
 <h3 className="text-lg font-semibold mb-4">{t.organizationModule.confirmDelete}</h3>
 <p className="text-gray-600 mb-6">
 {`Are you sure you want to delete grant "${selectedGrant.grantName}"?`
 }
 </p>
 <div className={`flex gap-3`}>
 <button
 onClick={handleDelete}
 className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
 >
 {t.organizationModule.delete}
 </button>
 <button
 onClick={() => {
 setShowDeleteModal(false);
 setSelectedGrant(null);
 }}
 className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
 >
 {t.organizationModule.cancel}
 </button>
 </div>
 </div>
 </div>
 )}

 {showDetailsModal && selectedGrant && (
 <GrantDetailsModal
 grant={selectedGrant}
 onClose={() => {
 setShowDetailsModal(false);
 setSelectedGrant(null);
 }}
 onDocumentAdded={() => {
 // Reload grants from localStorage to get updated documents
 const storedGrants = localStorage.getItem('pms_active_grants');
 if (storedGrants) {
 const parsedGrants = JSON.parse(storedGrants);
 setGrants(parsedGrants);
 // Update selected grant to show new documents immediately
 const updatedSelectedGrant = parsedGrants.find((g: Grant) => g.id === selectedGrant.id);
 if (updatedSelectedGrant) {
 setSelectedGrant(updatedSelectedGrant);
 }
 }
 }}
 />
 )}
 </div>
 );
}