/**
 * ============================================================================
 * CENTRAL DOCUMENTS MODULE - PROJECT-BASED FOLDER STRUCTURE
 * ============================================================================
 * 
 * Flow:
 * 1. Workspace Selection (PROJECT WORKSPACE selected by default)
 * 2. Project Selection (shows all projects from database)
 * 3. Folder View (shows 12 folders matching project tabs)
 * 4. Document List (shows documents in selected folder)
 * 
 * 12 Folders per Project:
 * 01_Financial_Overview, 02_Variance_Alerts, 03_Activities, 04_Indicators,
 * 05_Beneficiaries, 06_Case_Management, 07_Tasks, 08_Project_Plan,
 * 09_Forecast_Plan, 10_Procurement_Plan, 11_Project_Report, 12_Monthly_Report
 */

import { useState } from 'react';
import { 
 Folder, 
 FileText, 
 Download,
 Eye,
 Search,
 ChevronRight,
 ArrowLeft, ArrowRight,
 Package,
 FileSpreadsheet,
 FileBadge,
 Database,
 AlertCircle,
 BarChart3,
 CalendarDays,
 ClipboardList,
 Target,
 FileCheck,
 TrendingUp,
 Receipt,
 Users,
 Briefcase,
 Trash2
} from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { useTranslation } from '@/i18n/useTranslation';
import { ProcurementDocumentWorkspace } from '@/components/ProcurementDocumentWorkspace';
import { VendorDocumentWorkspace } from '@/components/VendorDocumentWorkspace';
import { StockDocumentWorkspace } from '@/components/StockDocumentWorkspace';
import { DonorDocumentWorkspace } from '@/components/DonorDocumentWorkspace';
import { RiskDocumentWorkspace } from '@/components/RiskDocumentWorkspace';

// 12 Folder Structure matching project tabs
const PROJECT_FOLDERS = [
 { code: '01_Financial_Overview', nameEn: 'Financial Overview', nameAr: 'النظرة المالية', icon: Receipt },
 { code: '02_Variance_Alerts', nameEn: 'Variance Alerts', nameAr: 'تنبيهات التباين', icon: AlertCircle },
 { code: '03_Activities', nameEn: 'Activities', nameAr: 'الأنشطة', icon: ClipboardList },
 { code: '04_Indicators', nameEn: 'Indicators', nameAr: 'المؤشرات', icon: Target },
 { code: '05_Beneficiaries', nameEn: 'Beneficiaries', nameAr: 'المستفيدون', icon: Users },
 { code: '06_Case_Management', nameEn: 'Case Management', nameAr: 'إدارة الحالات', icon: Briefcase },
 { code: '07_Tasks', nameEn: 'Tasks', nameAr: 'المهام', icon: FileCheck },
 { code: '08_Project_Plan', nameEn: 'Project Plan', nameAr: 'خطة المشروع', icon: BarChart3 },
 { code: '09_Forecast_Plan', nameEn: 'Forecast Plan', nameAr: 'خطة التوقعات', icon: TrendingUp },
 { code: '10_Procurement_Plan', nameEn: 'Procurement Plan', nameAr: 'خطة المشتريات', icon: Package },
 { code: '11_Project_Report', nameEn: 'Project Report', nameAr: 'تقرير المشروع', icon: FileText },
 { code: '12_Monthly_Report', nameEn: 'Monthly Report', nameAr: 'التقرير الشهري', icon: CalendarDays },
];

export function CentralDocumentsFinal() {
 const { t } = useTranslation();
 const { isRTL, language } = useLanguage();
 
 // Navigation State
 const [selectedWorkspace, setSelectedWorkspace] = useState<'projects' | 'meal' | 'hr' | 'finance' | 'logistics' | 'donor_crm' | 'risk_compliance'>('projects');
 const [viewState, setViewState] = useState<'workspaces' | 'projects' | 'folders' | 'files' | 'logistics_sub'>('workspaces');
 const [selectedLogisticsSubWorkspace, setSelectedLogisticsSubWorkspace] = useState<'procurement' | 'vendor' | 'stock' | null>(null);
 const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
 const [selectedFolderCode, setSelectedFolderCode] = useState<string | null>(null);
 const [searchQuery, setSearchQuery] = useState('');

 // Fetch all workspaces
 const { data: workspacesData, isLoading: workspacesLoading } = trpc.documents.getWorkspaces.useQuery();
 const workspaces = workspacesData || [];

 // Fetch all projects (only for projects workspace)
 const { data: projectsData, isLoading: projectsLoading } = trpc.projects.list.useQuery({}, { enabled: selectedWorkspace === 'projects' });
 const projects = projectsData || [];

 // Fetch folders for selected workspace (non-projects)
 const { data: workspaceFolders, isLoading: workspaceFoldersLoading } = trpc.documents.getFolders.useQuery(
 { workspace: selectedWorkspace },
 { enabled: selectedWorkspace !== 'projects' && viewState === 'folders' }
 );

 // Fetch documents for selected project
 const { data: documentsData, isLoading: documentsLoading } = trpc.documents.getDocumentsByProject.useQuery(
 { projectCode: selectedProjectId! },
 { enabled: !!selectedProjectId && selectedWorkspace === 'projects' }
 );

 // Fetch documents for selected folder
 const { data: folderDocuments, isLoading: folderLoading } = trpc.documents.getDocumentsByFolder.useQuery(
 { 
 workspace: selectedWorkspace,
 folderCode: selectedFolderCode!,
 projectCode: selectedWorkspace === 'projects' ? selectedProjectId! : undefined
 },
 { enabled: !!selectedFolderCode }
 );

 // Delete document mutation
 const deleteDocumentMutation = trpc.documents.deleteDocument.useMutation();

 // Translations
 const labels = {
 title: t.common.centralDocuments,
 subtitle: language === 'en' 
 ? 'Unified Audit Repository: Multi-workspace structure with project isolation and functional governance.'
 : 'مستودع التدقيق الموحد: هيكل متعدد مساحات العمل مع عزل المشروع والحوكمة الوظيفية.',
 workspaces: t.common.operationalWorkspaces,
 projectWorkspace: t.common.projectWorkspace,
 selectProject: t.common.selectPortfolioProject,
 moduleFolders: t.common.moduleFolders,
 documentRegistry: t.common.documentRegistry,
 back: t.common.back,
 search: t.common.searchRecords,
 items: t.common.items,
 fileName: t.common.fileName,
 uploadedBy: t.common.uploadedBy,
 uploadedAt: t.common.uploadDate,
 version: t.common.version,
 actions: t.common.actions,
 view: t.common.view,
 download: t.common.download,
 delete: t.common.delete,
 noDocuments: t.common.noSynchronizedDocumentsFoundInThis,
 repositoryRecords: t.common.repositoryRecords,
 portfolio: t.common.portfolio,
 };

 const formatSqlDate = (dateValue?: string | Date | null) => {
  if (!dateValue) return null;

  return new Date(dateValue)
    .toISOString()
    .split("T")[0]; // YYYY-MM-DD
};

 // Get folder document count
 const getFolderCount = (folderCode: string) => {
 if (!documentsData?.folders) return 0;
 return documentsData.folders[folderCode]?.length || 0;
 };

 // Handle project selection
 const handleProjectSelect = (projectId: string) => {
 setSelectedProjectId(projectId);
 setViewState('folders');
 };

 // Handle folder selection
 const handleFolderSelect = (folderCode: string) => {
 setSelectedFolderCode(folderCode);
 setViewState('files');
 };

 // Handle workspace selection
 const handleWorkspaceSelect = (workspace: typeof selectedWorkspace) => {
 setSelectedWorkspace(workspace);
 // For logistics, show sub-workspace selection
 // For projects, go to projects view
 // For other workspaces (meal, hr, finance, donor_crm, risk_compliance), go to folders view
 if (workspace === 'projects') {
 setViewState('projects');
 } else if (workspace === 'logistics') {
 setViewState('logistics_sub');
 setSelectedLogisticsSubWorkspace(null);
 } else {
 setViewState('folders');
 }
 setSelectedProjectId(null);
 setSelectedFolderCode(null);
 };

 // Handle logistics sub-workspace selection
 const handleLogisticsSubWorkspaceSelect = (subWorkspace: 'procurement' | 'vendor' | 'stock') => {
 setSelectedLogisticsSubWorkspace(subWorkspace);
 setViewState('folders'); // Show the workspace component directly
 };

 // Handle back navigation
 const handleBack = () => {
 if (viewState === 'files') {
 setSelectedFolderCode(null);
 setViewState('folders');
 } else if (viewState === 'folders') {
 if (selectedWorkspace === 'projects') {
 setSelectedProjectId(null);
 setViewState('projects');
 } else if (selectedWorkspace === 'logistics' && selectedLogisticsSubWorkspace) {
 setSelectedLogisticsSubWorkspace(null);
 setViewState('logistics_sub');
 } else {
 setViewState('workspaces');
 }
 } else if (viewState === 'projects') {
 setViewState('workspaces');
 } else if (viewState === 'logistics_sub') {
 setViewState('workspaces');
 }
 };

 // Handle document delete
 const handleDelete = async (documentId: string) => {
 if (confirm(t.common.areYouSureYouWantTo)) {
 await deleteDocumentMutation.mutateAsync({ documentId });
 }
 };

 // Format date
 const formatDate = (date: Date) => {
 return new Date(date).toLocaleDateString(t.common.enus, {
 year: 'numeric',
 month: 'short',
 day: 'numeric'
 });
 };

 // Get selected project details
 const selectedProject = projects.find(p => p.code === selectedProjectId);

 return (
 <div className="min-h-screen bg-gray-50 p-6">
 <div className="max-w-7xl mx-auto">
 {/* Header */}
 <div className="mb-6">
 <div className="flex items-center gap-2 text-sm text-blue-600 font-semibold mb-2">
 <span>CENTRAL DOCUMENTS</span>
 </div>
 <h1 className={`text-3xl font-bold text-gray-900 mb-2 text-start`}>
 {labels.title}
 </h1>
 <p className={`text-sm text-gray-600 text-start`}>
 {labels.subtitle}
 </p>
 </div>

 {/* Back Button */}
 {viewState !== 'workspaces' && (
 <button
 onClick={handleBack}
 className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
 >
 {isRTL ? <ArrowRight className="w-4 h-4"  /> : <ArrowLeft className="w-4 h-4"  />}
 {labels.back}
 </button>
 )}

 {/* WORKSPACE SELECTION VIEW */}
 {viewState === 'workspaces' && (
 <div>
 <h2 className={`text-xl font-semibold text-gray-700 mb-4 uppercase text-start`}>
 {t.common.selectWorkspace}
 </h2>
 
 {workspacesLoading ? (
 <div className="text-center py-12">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {workspaces.map((workspace) => (
 <button
 key={workspace.code}
 onClick={() => handleWorkspaceSelect(workspace.code as any)}
 className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition-all text-start"
 >
 <div className="flex items-start justify-between mb-3">
 <Folder className="w-12 h-12 text-blue-600" />
 <Badge variant="secondary" className="text-xs">
 {workspace.documentCount}
 </Badge>
 </div>
 <div className="text-lg font-bold text-gray-900 mb-2">
 {language === 'en' ? workspace.name : workspace.nameAr}
 </div>
 <div className="text-sm text-gray-500">
 {workspace.documentCount} {t.common.documents}
 </div>
 <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
 <ChevronRight className="w-4 h-4" />
 </div>
 </button>
 ))}
 </div>
 )}
 </div>
 )}

 {/* PROJECT SELECTION VIEW (for projects workspace) */}
 {viewState === 'projects' && selectedWorkspace === 'projects' && (
 <div>
 <h2 className={`text-xl font-semibold text-gray-700 mb-4 uppercase text-start`}>
 {labels.selectProject}
 </h2>
 
 {projectsLoading ? (
 <div className="text-center py-12">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {projects.map((project) => (
 <button
 key={project.projectCode}
 onClick={() => handleProjectSelect(project.projectCode)}
 className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition-all text-start"
 >
 <div className="flex items-start justify-between mb-3">
 <Package className="w-12 h-12 text-gray-400" />
 </div>
 <div className="text-sm font-semibold text-blue-600 mb-1">
 {project.projectCode}
 </div>
 <div className="text-lg font-bold text-gray-900 mb-2">
 {language === 'en' ? project.title : project.titleAr}
 </div>
 <div className="text-sm text-gray-500">
 {project.startDate && new Date(project.startDate).getFullYear()} {labels.portfolio}
 </div>
 <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
 <ChevronRight className="w-4 h-4" />
 </div>
 </button>
 ))}
 </div>
 )}
 </div>
 )}

 {/* LOGISTICS SUB-WORKSPACE SELECTION VIEW */}
 {viewState === 'logistics_sub' && (
 <div>
 <h2 className={`text-xl font-semibold text-gray-700 mb-4 uppercase text-start`}>
 Logistics & Procurement
 </h2>
 
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 <button
 onClick={() => handleLogisticsSubWorkspaceSelect('procurement')}
 className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition-all text-start"
 >
 <div className="flex items-start justify-between mb-3">
 <FileText className="w-12 h-12 text-blue-600" />
 </div>
 <div className="text-lg font-bold text-gray-900 mb-2">
 Procurement Workspace
 </div>
 <div className="text-sm text-gray-500">
 Manage procurement lifecycle documents
 </div>
 <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
 <ChevronRight className="w-4 h-4" />
 </div>
 </button>

 <button
 onClick={() => handleLogisticsSubWorkspaceSelect('vendor')}
 className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition-all text-start"
 >
 <div className="flex items-start justify-between mb-3">
 <FileText className="w-12 h-12 text-orange-500" />
 </div>
 <div className="text-lg font-bold text-gray-900 mb-2">
 Vendor Documents
 </div>
 <div className="text-sm text-gray-500">
 Manage vendor lifecycle documents
 </div>
 <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
 <ChevronRight className="w-4 h-4" />
 </div>
 </button>

 <button
 onClick={() => handleLogisticsSubWorkspaceSelect('stock')}
 className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition-all text-start"
 >
 <div className="flex items-start justify-between mb-3">
 <Package className="w-12 h-12 text-teal-500" />
 </div>
 <div className="text-lg font-bold text-gray-900 mb-2">
 Stock Documents
 </div>
 <div className="text-sm text-gray-500">
 Manage stock lifecycle documents
 </div>
 <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
 <ChevronRight className="w-4 h-4" />
 </div>
 </button>
 </div>
 </div>
 )}

 {/* FOLDER SELECTION VIEW */}
 {viewState === 'folders' && (
 <div>
 {/* Header for projects workspace */}
 {selectedWorkspace === 'projects' && selectedProject && (
 <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
 <div className="text-sm font-semibold text-blue-600 mb-1">
 {selectedProject.code}
 </div>
 <div className="text-2xl font-bold text-gray-900">
 {language === 'en' ? selectedProject.title : selectedProject.titleAr}
 </div>
 </div>
 )}

 {/* Header for other workspaces */}
 {/* Special rendering for Logistics sub-workspaces */}
 {selectedWorkspace === 'logistics' && selectedLogisticsSubWorkspace === 'procurement' && (
 <ProcurementDocumentWorkspace />
 )}

 {selectedWorkspace === 'logistics' && selectedLogisticsSubWorkspace === 'vendor' && (
 <VendorDocumentWorkspace />
 )}

 {selectedWorkspace === 'logistics' && selectedLogisticsSubWorkspace === 'stock' && (
 <StockDocumentWorkspace />
 )}

 {/* Special rendering for Donor CRM workspace */}
 {selectedWorkspace === 'donor_crm' && (
 <DonorDocumentWorkspace />
 )}

 {/* Special rendering for Risk & Compliance workspace */}
 {selectedWorkspace === 'risk_compliance' && (
 <RiskDocumentWorkspace />
 )}

 {/* Header for other workspaces */}
 {selectedWorkspace !== 'projects' && selectedWorkspace !== 'logistics' && selectedWorkspace !== 'donor_crm' && selectedWorkspace !== 'risk_compliance' && (
 <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
 <div className="text-2xl font-bold text-gray-900">
 {language === 'en' ? workspaces.find(w => w.code === selectedWorkspace)?.name : workspaces.find(w => w.code === selectedWorkspace)?.nameAr}
 </div>
 </div>
 )}

 {selectedWorkspace !== 'logistics' && selectedWorkspace !== 'donor_crm' && selectedWorkspace !== 'risk_compliance' && viewState !== 'logistics_sub' && (
 <>
 <h2 className={`text-xl font-semibold text-gray-700 mb-4 uppercase text-start`}>
 {labels.moduleFolders}
 </h2>

 {(selectedWorkspace === 'projects' ? documentsLoading : workspaceFoldersLoading) ? (
 <div className="text-center py-12">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
 </div>
 ) : (
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
 {selectedWorkspace === 'projects' ? (
 // Project folders
 PROJECT_FOLDERS.map((folder) => {
 const Icon = folder.icon;
 const count = getFolderCount(folder.code);
 
 return (
 <button
 key={folder.code}
 onClick={() => handleFolderSelect(folder.code)}
 className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-lg transition-all"
 >
 <div className="flex items-center justify-between mb-3">
 <Icon className="w-8 h-8 text-blue-600" />
 <Badge variant="secondary" className="text-xs">
 {count}
 </Badge>
 </div>
 <div className={`font-semibold text-sm text-gray-900 mb-1 text-start`}>
 {language === 'en' ? folder.nameEn : folder.nameAr}
 </div>
 <div className={`text-xs text-gray-500 text-start`}>
 {folder.code}
 </div>
 <div className="mt-3 text-xs text-gray-400 uppercase">
 {count} {labels.repositoryRecords}
 </div>
 </button>
 );
 })
 ) : (
 // Workspace folders (MEAL, HR, Finance, etc.)
 workspaceFolders?.map((folder: any) => (
 <button
 key={folder.folderCode}
 onClick={() => handleFolderSelect(folder.folderCode)}
 className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-lg transition-all"
 >
 <div className="flex items-center justify-between mb-3">
 <Folder className="w-8 h-8 text-blue-600" />
 <Badge variant="secondary" className="text-xs">
 {folder.documentCount || 0}
 </Badge>
 </div>
 <div className={`font-semibold text-sm text-gray-900 mb-1 text-start`}>
 {folder.folderName}
 </div>
 <div className="mt-3 text-xs text-gray-400 uppercase">
 {folder.documentCount || 0} {labels.repositoryRecords}
 </div>
 </button>
 ))
 )}
 </div>
 )}
 </>
 )}
 </div>
 )}

 {/* DOCUMENT LIST VIEW */}
 {viewState === 'files' && selectedFolderCode && (
 <div>
 {/* Folder Header */}
 <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
 <div className="text-sm font-semibold text-blue-600 mb-1">
 {selectedFolderCode}
 </div>
 <div className="text-2xl font-bold text-gray-900">
 {PROJECT_FOLDERS.find(f => f.code === selectedFolderCode)?.[t.common.nameen]}
 </div>
 </div>

 <h2 className={`text-xl font-semibold text-gray-700 mb-4 uppercase text-start`}>
 {labels.documentRegistry}
 </h2>

 {/* Search */}
 <div className="mb-4">
 <Input
 type="text"
 placeholder={labels.search}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="max-w-md"
 />
 </div>

 {/* Documents Table */}
 <div className="bg-white rounded-lg shadow-sm overflow-hidden">
 {folderLoading ? (
 <div className="text-center py-12">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
 </div>
 ) : folderDocuments && folderDocuments.length > 0 ? (
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-6 py-3 text-xs font-semibold text-gray-700 uppercase text-start`}>
 {labels.fileName}
 </th>
 <th className={`px-6 py-3 text-xs font-semibold text-gray-700 uppercase text-start`}>
 {labels.uploadedBy}
 </th>
 <th className={`px-6 py-3 text-xs font-semibold text-gray-700 uppercase text-start`}>
 {labels.uploadedAt}
 </th>
 <th className={`px-6 py-3 text-xs font-semibold text-gray-700 uppercase text-start`}>
 {labels.version}
 </th>
 <th className={`px-6 py-3 text-xs font-semibold text-gray-700 uppercase text-start`}>
 {labels.actions}
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {folderDocuments
 .filter(doc => 
 searchQuery === '' || 
 doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())
 )
 .map((doc) => (
 <tr key={doc.documentId} className="hover:bg-gray-50">
 <td className="px-6 py-4">
 <div className="flex items-center gap-2">
 <FileText className="w-5 h-5 text-gray-400" />
 <span className="text-sm font-medium text-gray-900">{doc.fileName}</span>
 </div>
 </td>
 <td className="px-6 py-4 text-sm text-gray-600">
 User #{doc.uploadedBy}
 </td>
 <td className="px-6 py-4 text-sm text-gray-600">
 {formatDate(doc.uploadedAt)}
 </td>
 <td className="px-6 py-4 text-sm text-gray-600">
 v{doc.version}
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-2">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => window.open(doc.filePath, '_blank')}
 >
 <Eye className="w-4 h-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => window.open(doc.filePath, '_blank')}
 >
 <Download className="w-4 h-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDelete(doc.documentId)}
 >
 <Trash2 className="w-4 h-4 text-red-600" />
 </Button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 ) : (
 <div className="text-center py-12">
 <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
 <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
 {labels.noDocuments}
 </p>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 );
}

export default CentralDocumentsFinal;
