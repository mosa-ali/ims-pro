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
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// ============================================================================
// CURRENCY CONVERSION RATES (EU InforEuro Source)
// Official rates: https://commission.europa.eu/funding-tenders/procedures-guidelines-tenders/information-contractors-and-beneficiaries/exchange-rate-inforeuro_en
// Updated: January 2024
// ============================================================================
const EXCHANGE_RATES_TO_USD: Record<string, number> = {
  'USD': 1.0,
  'EUR': 1.10,    // 1 EUR = 1.10 USD (example rate - should be updated monthly)
  'GBP': 1.27,    // 1 GBP = 1.27 USD
  'CHF': 1.17,    // 1 CHF = 1.17 USD
  'JPY': 0.0068,  // 1 JPY = 0.0068 USD
  'CAD': 0.75,    // 1 CAD = 0.75 USD
  'AUD': 0.66     // 1 AUD = 0.66 USD
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
    totalBudget: number;        // In original currency
    actualSpent: number;        // In original currency
    committed: number;          // In original currency
    available: number;          // In original currency
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
  const [projects, setProjects] = useState<Project[]>(mockProjects); // State for managing projects
  const [newProjectSectors, setNewProjectSectors] = useState<ProjectSectorType[]>([]); // State for new project sectors
  const [showActiveGrants, setShowActiveGrants] = useState(false); // State for Active Grants screen

  const { deleteRecord } = useRecordDelete();
  const { createProjectFolder } = useDocumentService();
  const { user } = useAuth();

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

  // Initialize localStorage with mock projects if empty OR migrate old data
  useEffect(() => {
    const projectsData = localStorage.getItem('pms_projects');
    
    if (!projectsData) {
      // ✅ First-time initialization: Save complete project structure including project_sectors
      const authorativeProjects = mockProjects.map(project => ({
        id: project.id,
        title: project.title,
        code: project.code,
        projectCode: project.code,
        projectName: project.title,
        donor: 'UEFA Foundation',
        implementingPartner: 'Local NGO',
        startDate: project.startDate,
        endDate: project.endDate,
        currency: project.currency,
        totalBudget: project.financeOverview.totalBudget,
        status: project.status,
        project_sectors: project.project_sectors,
        financeOverview: project.financeOverview,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      localStorage.setItem('pms_projects', JSON.stringify(authorativeProjects));
      setProjects(mockProjects);
    } else {
      // ✅ MIGRATION: Check if existing data has project_sectors field
      const existingProjects = JSON.parse(projectsData);
      const needsMigration = existingProjects.some((p: any) => !p.project_sectors);
      
      if (needsMigration) {
        console.warn('⚠️ Migrating project data to include project_sectors field...');
        
        // Migrate by matching with mockProjects by ID or code
        const migratedProjects = existingProjects.map((existing: any) => {
          const mockMatch = mockProjects.find(m => m.id === existing.id || m.code === existing.code);
          
          return {
            ...existing,
            title: existing.title || existing.projectName || mockMatch?.title || 'Unknown Project',
            code: existing.code || existing.projectCode || mockMatch?.code || 'UNKNOWN',
            project_sectors: existing.project_sectors || mockMatch?.project_sectors || [],
            currency: existing.currency || 'USD',
            financeOverview: existing.financeOverview || mockMatch?.financeOverview || {
              totalBudget: existing.totalBudget || 0,
              actualSpent: 0,
              committed: 0,
              available: existing.totalBudget || 0,
              completionPercentage: 0
            }
          };
        });
        
        localStorage.setItem('pms_projects', JSON.stringify(migratedProjects));
        setProjects(migratedProjects);
        console.log('✅ Migration complete!');
      } else {
        // Load existing valid data
        setProjects(existingProjects);
      }
    }
    
    // Also initialize empty arrays for other required tables
    if (!localStorage.getItem('pms_budgets')) {
      localStorage.setItem('pms_budgets', JSON.stringify([]));
    }
    if (!localStorage.getItem('pms_budget_line_items')) {
      localStorage.setItem('pms_budget_line_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('pms_financial_transactions')) {
      localStorage.setItem('pms_financial_transactions', JSON.stringify([]));
    }
    if (!localStorage.getItem('pms_activities')) {
      localStorage.setItem('pms_activities', JSON.stringify([]));
    }
    if (!localStorage.getItem('pms_tasks')) {
      localStorage.setItem('pms_tasks', JSON.stringify([]));
    }
    if (!localStorage.getItem('pms_indicators')) {
      localStorage.setItem('pms_indicators', JSON.stringify([]));
    }
    if (!localStorage.getItem('pms_beneficiaries')) {
      localStorage.setItem('pms_beneficiaries', JSON.stringify([]));
    }
    if (!localStorage.getItem('pms_cases')) {
      localStorage.setItem('pms_cases', JSON.stringify([]));
    }
    if (!localStorage.getItem('pms_risks')) {
      localStorage.setItem('pms_risks', JSON.stringify([]));
    }
  }, []);

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
                          project.code.toLowerCase().includes(searchTerm.toLowerCase());
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
        code: project.code,
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
      code: project.code,
      projectCode: project.code,
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
      code: project.code,
      projectCode: project.code,
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

  return (
    <div className="project-page">
      {/* Header */}
      <div className={`flex items-center justify-between mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
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
          <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className="project-kpi-label mb-2">{t.projects.grantManagement}</div>
              <div className="project-kpi-value">5</div>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className={`project-meta-text mt-3 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.projects.grantManagementDesc}
          </p>
          <div className={`text-xs text-primary font-medium mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL ? 'انقر لعرض المنح النشطة →' : 'Click to view Active Grants →'}
          </div>
        </div>

        <div className="project-card relative">
          {/* Project Reporting Schedule */}
          <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className="project-kpi-label mb-2">{t.projects.reportingSchedule}</div>
              <div className="project-kpi-value">2</div>
              <div className="project-meta-text mt-1">{t.projects.active}</div>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className={`project-meta-text mt-3 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.projects.reportingScheduleDesc}
          </p>
          <Link 
            to="/reporting-schedule"
            className={`block text-primary hover:text-primary/80 font-medium mt-3 text-sm transition-colors ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {isRTL ? 'انقر لعرض جدول التقارير ←' : 'Click to view Reporting Schedule →'}
          </Link>
        </div>

        <div className="project-card relative">
          {/* Proposal & Pipeline */}
          <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className="project-kpi-label mb-2">{t.projects.proposalPipeline}</div>
              <div className="project-kpi-value">8</div>
              <div className="project-meta-text mt-1">{t.projects.opportunities}</div>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
              <Lightbulb className="w-5 h-5" />
            </div>
          </div>
          <p className={`project-meta-text mt-3 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.projects.proposalPipelineDesc}
          </p>
          <Link 
            to="/proposal-pipeline"
            className={`block text-primary hover:text-primary/80 font-medium mt-3 text-sm transition-colors ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {isRTL ? 'انقر لعرض خط الفرص ←' : 'Click to view Proposal Pipeline →'}
          </Link>
        </div>

        <div className="project-card relative">
          {/* Annual Programs Report */}
          <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className="project-kpi-label mb-2">{isRTL ? 'التقرير السنوي للبرامج' : 'Annual Programs Report'}</div>
              <div className="project-kpi-value">{new Date().getFullYear()}</div>
              <div className="project-meta-text mt-1">{isRTL ? 'التقرير الاستراتيجي السنوي' : 'Strategic Annual Report'}</div>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <p className={`project-meta-text mt-3 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL 
              ? 'تقرير مرئي شامل للإنجازات والأداء والتخطيط السنوي' 
              : 'Comprehensive visual report on achievements, performance and annual planning'}
          </p>
          <Link 
            to="/annual-programs-report"
            className={`block text-primary hover:text-primary/80 font-medium mt-3 text-sm transition-colors ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {isRTL ? 'انقر لعرض ال��قرير السنوي ←' : 'Click to view Annual Report →'}
          </Link>
        </div>
      </div>

      {/* Financial KPI Cards - 5 Column Grid */}
      <div className="project-grid-5 project-section">
        {/* Active Programs */}
        <div className="project-kpi-card">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="project-card-description mb-1">{t.projects.activePrograms}</div>
            <div className="project-kpi-value">{dashboardKPIs.activePrograms}</div>
          </div>
        </div>

        {/* Total Budget (USD) */}
        <div className="project-kpi-card">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="project-card-description mb-1">{t.projects.totalBudgetUSD}</div>
            <div className="project-kpi-value text-green-600">{formatUSD(dashboardKPIs.totalBudgetUSD)}</div>
          </div>
        </div>

        {/* Actual Spent (USD) */}
        <div className="project-kpi-card">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="project-card-description mb-1">{t.projects.actualSpentUSD}</div>
            <div className="project-kpi-value">{formatUSD(dashboardKPIs.actualSpentUSD)}</div>
          </div>
        </div>

        {/* Balance (USD) */}
        <div className="project-kpi-card">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="project-card-description mb-1">{t.projects.balanceUSD}</div>
            <div className="project-kpi-value text-green-600">{formatUSD(dashboardKPIs.balanceUSD)}</div>
          </div>
        </div>

        {/* Avg. Completion Rate */}
        <div className="project-kpi-card">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="project-card-description mb-1">{t.projects.avgCompletionRate}</div>
            <div className={`project-kpi-value ${
              dashboardKPIs.avgCompletionRate >= 70 ? 'text-green-600' : 
              dashboardKPIs.avgCompletionRate >= 40 ? 'text-yellow-600' : 
              'text-red-600'
            }`}>
              {dashboardKPIs.avgCompletionRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Project List Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header with buttons */}
        <div className={`p-4 border-b border-gray-200 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h2 className="text-lg font-semibold text-gray-900">{t.projects.projectList}</h2>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <UnifiedExportButton
              hasData={filteredProjects.length > 0}
              onExportData={handleExportExcel}
              onExportTemplate={handleExportTemplate}
              moduleName="Projects"
              showModal={true}
            />
            <button
              onClick={() => setShowImportModal(true)}
              className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Upload className="w-4 h-4" />
              {t.projects.importExcel}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Plus className="w-4 h-4" />
              {t.projects.addNewProject}
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {/* Search */}
            <div className="flex-1 relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${isRTL ? 'end-3' : 'start-3'}`} />
              <input
                type="text"
                placeholder={t.projects.searchByTitle}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'pe-10 ps-4 text-right' : 'ps-10 pe-4 text-left'}`}
              />
            </div>

            {/* Filter Tabs */}
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      statusFilter === status
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    {getStatusLabel(status)}
                  </button>
                );
              })}
            </div>

            {/* Sort */}
            <select className={`px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
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
                <div className={`flex items-start justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="flex-1">
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <h3 className="font-semibold text-gray-900">{project.title}</h3>
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
                        project.status === 'Ongoing' ? 'bg-green-100 text-green-700' :
                        project.status === 'Planned' ? 'bg-blue-100 text-blue-700' :
                        project.status === 'Completed' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {project.status === 'Ongoing' ? t.projects.statusOngoing :
                         project.status === 'Planned' ? t.projects.statusPlanned :
                         project.status === 'Completed' ? t.projects.statusCompleted :
                         project.status === 'Not Started' ? t.projects.statusNotStarted :
                         project.status === 'Suspended' ? t.projects.statusSuspended :
                         project.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{t.projects.projectCode}: {project.code}</p>
                  </div>
                </div>

                {/* Budget Utilization */}
                <div className="mb-3">
                  <div className={`flex items-center justify-between mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
                <div className={`flex items-center gap-2 pt-3 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Link
                    to={`/projects/${project.id}`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Eye className="w-4 h-4" />
                    {t.projects.viewDetails}
                  </Link>
                  <button
                    onClick={() => {
                      setEditingProject(project);
                      setShowEditModal(true);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Edit className="w-4 h-4" />
                    {t.projects.updateProject}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setShowDeleteModal(true);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRTL ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
                  </svg>
                </button>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h2 className="text-xl font-semibold text-gray-900">Create New Project</h2>
                  <p className="text-sm text-gray-500 mt-1">Fill in the project details below.</p>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <form className="p-6 space-y-6">
              {/* Section 1: Basic Information */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h3 className="text-base font-semibold text-gray-900">Basic Information</h3>
                  <p className="text-sm text-gray-500 mt-1">Enter the core project details.</p>
                </div>

                <div className="mt-4 space-y-4">
                  {/* Row 1: Project Title (EN) + Project Title (AR) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Project Title (EN) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="title"
                        placeholder="Enter project title"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Project Title (AR)
                      </label>
                      <input
                        type="text"
                        name="titleAr"
                        placeholder="Enter project title in Arabic"
                        dir="rtl"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-right"
                      />
                    </div>
                  </div>

                  {/* Row 2: Project Code + Associated Grant */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Project Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="code"
                        placeholder="Project code"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Associated Grant
                      </label>
                      <select className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <option value="">{isRTL ? 'اختر المساهمة' : 'Select Grant'}</option>
                        <option value="grant1">UEFA Foundation Grant 2024</option>
                        <option value="grant2">UNICEF Emergency Fund</option>
                        <option value="grant3">ECHO Humanitarian Aid</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Project Status + Start Date + End Date */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Project Status <span className="text-red-500">*</span>
                      </label>
                      <select className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <option value="Planning">{isRTL ? 'مخطط له' : 'Planning'}</option>
                        <option value="Ongoing">{isRTL ? 'مستمر' : 'Ongoing'}</option>
                        <option value="Not Started">{isRTL ? 'لم يبدأ بعد' : 'Not Started'}</option>
                        <option value="Completed">{isRTL ? 'مكتمل' : 'Completed'}</option>
                        <option value="Suspended">{isRTL ? 'معلق' : 'Suspended'}</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
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
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
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
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Project Sectors <span className="text-red-500">*</span>
                      <span className="text-xs text-gray-500 font-normal ml-2">(Select at least one)</span>
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
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h3 className="text-base font-semibold text-gray-900">Location & Details</h3>
                  <p className="text-sm text-gray-500 mt-1">Enter the project location and description.</p>
                </div>

                <div className="mt-4 space-y-4">
                  {/* Row 1: Location (EN) + Location (AR) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Location (EN)
                      </label>
                      <input
                        type="text"
                        placeholder="Enter location"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Location (AR)
                      </label>
                      <input
                        type="text"
                        placeholder="Enter location in Arabic"
                        dir="rtl"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-right"
                      />
                    </div>
                  </div>

                  {/* Row 2: Description (EN) + Description (AR) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Description (EN)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Enter project description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Description (AR)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Enter project description in Arabic"
                        dir="rtl"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-right"
                      />
                    </div>
                  </div>

                  {/* Row 3: Objectives (EN) + Objectives (AR) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Objectives (EN)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Enter project objectives"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Objectives (AR)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Enter project objectives in Arabic"
                        dir="rtl"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Project Management */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h3 className="text-base font-semibold text-gray-900">Project Management</h3>
                  <p className="text-sm text-gray-500 mt-1">Enter project management and beneficiary information.</p>
                </div>

                <div className="mt-4">
                  {/* Row 1: Project Manager + Target Beneficiary Count */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Project Manager
                      </label>
                      <input
                        type="text"
                        placeholder="Enter project manager name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Target Beneficiary Count
                      </label>
                      <input
                        type="number"
                        placeholder="Enter beneficiary count"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className={`flex items-center justify-end gap-3 pt-4 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
                  className={`px-6 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRTL ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
                  </svg>
                </button>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h2 className="text-xl font-semibold text-gray-900">Edit Project</h2>
                  <p className="text-sm text-gray-500 mt-1">Update the project details below.</p>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleUpdateProject} className="p-6 space-y-6">
              {/* Section 1: Basic Information */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h3 className="text-base font-semibold text-gray-900">Basic Information</h3>
                  <p className="text-sm text-gray-500 mt-1">Enter the core project details.</p>
                </div>

                <div className="mt-4 space-y-4">
                  {/* Row 1: Project Title (EN) + Project Title (AR) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Project Title (EN) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter project title"
                        value={editingProject.title}
                        onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Project Title (AR)
                      </label>
                      <input
                        type="text"
                        placeholder="Enter project title in Arabic"
                        dir="rtl"
                        value={editingProject.title}
                        onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-right"
                      />
                    </div>
                  </div>

                  {/* Row 2: Project Code + Associated Grant */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Project Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Project code"
                        value={editingProject.code}
                        onChange={(e) => setEditingProject({ ...editingProject, code: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Associated Grant
                      </label>
                      <select className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <option value="">{isRTL ? 'اختر المساهمة' : 'Select Grant'}</option>
                        <option value="grant1">UEFA Foundation Grant 2024</option>
                        <option value="grant2">UNICEF Emergency Fund</option>
                        <option value="grant3">ECHO Humanitarian Aid</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Project Status + Start Date + End Date */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Project Status <span className="text-red-500">*</span>
                      </label>
                      <select 
                        value={editingProject.status}
                        onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value })}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        <option value="Planned">{isRTL ? 'مخطط له' : 'Planned'}</option>
                        <option value="Ongoing">{isRTL ? 'مستمر' : 'Ongoing'}</option>
                        <option value="Not Started">{isRTL ? 'لم يبدأ بعد' : 'Not Started'}</option>
                        <option value="Completed">{isRTL ? 'مكتمل' : 'Completed'}</option>
                        <option value="Suspended">{isRTL ? 'معلق' : 'Suspended'}</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
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
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
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
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Project Sectors <span className="text-red-500">*</span>
                      <span className="text-xs text-gray-500 font-normal ml-2">(Select at least one)</span>
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
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h3 className="text-base font-semibold text-gray-900">Location & Details</h3>
                  <p className="text-sm text-gray-500 mt-1">Enter the project location and description.</p>
                </div>

                <div className="mt-4 space-y-4">
                  {/* Row 1: Location (EN) + Location (AR) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Location (EN)
                      </label>
                      <input
                        type="text"
                        placeholder="Enter location"
                        value={editingProject.location || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, location: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Location (AR)
                      </label>
                      <input
                        type="text"
                        placeholder="Enter location in Arabic"
                        value={editingProject.locationAr || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, locationAr: e.target.value })}
                        dir="rtl"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-right"
                      />
                    </div>
                  </div>

                  {/* Row 2: Description (EN) + Description (AR) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Description (EN)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Enter project description"
                        value={editingProject.description || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Description (AR)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Enter project description in Arabic"
                        value={editingProject.descriptionAr || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, descriptionAr: e.target.value })}
                        dir="rtl"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-right"
                      />
                    </div>
                  </div>

                  {/* Row 3: Objectives (EN) + Objectives (AR) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Objectives (EN)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Enter project objectives"
                        value={editingProject.objectives || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, objectives: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Objectives (AR)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Enter project objectives in Arabic"
                        value={editingProject.objectivesAr || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, objectivesAr: e.target.value })}
                        dir="rtl"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Project Management */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h3 className="text-base font-semibold text-gray-900">Project Management</h3>
                  <p className="text-sm text-gray-500 mt-1">Enter project management and beneficiary information.</p>
                </div>

                <div className="mt-4">
                  {/* Row 1: Project Manager + Target Beneficiary Count */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Project Manager
                      </label>
                      <input
                        type="text"
                        placeholder="Enter project manager name"
                        value={editingProject.manager || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, manager: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        Target Beneficiary Count
                      </label>
                      <input
                        type="number"
                        placeholder="Enter beneficiary count"
                        value={editingProject.targetBeneficiaries || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, targetBeneficiaries: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className={`flex items-center justify-end gap-3 pt-4 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
                  className={`px-6 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
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
                  code: project.code,
                  projectCode: project.code,
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