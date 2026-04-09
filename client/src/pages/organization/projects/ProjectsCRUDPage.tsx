// ============================================================================
// PROJECTS MANAGEMENT CRUD PAGE
// Complete CRUD operations for all projects
// Integrated Management System (IMS)
// ============================================================================

import { useState } from 'react';
import { 
 Search,
 Download,
 Upload,
 Plus,
 Eye,
 Edit,
 Trash2,
 Loader2,
 ArrowLeft, ArrowRight
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { ProjectFormModal } from '@/components/ProjectFormModal';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import toast, { Toaster } from 'react-hot-toast';
import { Link } from 'wouter';
import ExcelJS from 'exceljs';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

type ProjectStatus = 'all' | 'ongoing' | 'planned' | 'completed' | 'not_started';

export default function ProjectsCRUDPage() {
 const { t } = useTranslation();
 const { language, direction, isRTL} = useLanguage();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();
 
 const [searchTerm, setSearchTerm] = useState('');
 const [statusFilter, setStatusFilter] = useState<ProjectStatus>('all');
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);
 const [showDeleteModal, setShowDeleteModal] = useState(false);
 const [selectedProject, setSelectedProject] = useState<any>(null);

 // tRPC queries and mutations
 const utils = trpc.useUtils();
 
 const { data: projects = [], isLoading: projectsLoading } = trpc.projects.list.useQuery(
 {
 status: statusFilter === 'all' ? undefined : statusFilter,
 searchTerm: searchTerm || undefined,
 },
 {
 enabled: !!currentOrganizationId && !!currentOperatingUnitId,
 }
 );

 const createMutation = trpc.projects.create.useMutation({
 onSuccess: async () => {
 await utils.projects.list.invalidate();
 await utils.projects.getDashboardKPIs.invalidate();
 setShowCreateModal(false);
 toast.success('Project created successfully!');
 },
 onError: (error) => {
 toast.error(error.message || 'Failed to create project');
 },
 });

 const updateMutation = trpc.projects.update.useMutation({
 onSuccess: async () => {
 await utils.projects.list.invalidate();
 await utils.projects.getDashboardKPIs.invalidate();
 setShowEditModal(false);
 setSelectedProject(null);
 toast.success('Project updated successfully!');
 },
 onError: (error) => {
 toast.error(error.message || 'Failed to update project');
 },
 });

 const deleteMutation = trpc.projects.delete.useMutation({
 onSuccess: async () => {
 await utils.projects.list.invalidate();
 await utils.projects.getDashboardKPIs.invalidate();
 setShowDeleteModal(false);
 setSelectedProject(null);
 toast.success('Project deleted successfully!');
 },
 onError: (error) => {
 toast.error(error.message || 'Failed to delete project');
 },
 });

 const handleCreateProject = (data: any) => {
 createMutation.mutate({
 ...data,
 organizationId: currentOrganizationId || 1,
 operatingUnitId: currentOperatingUnitId || 1,
 });
 };

 const handleUpdateProject = (data: any) => {
 if (selectedProject) {
 updateMutation.mutate({
 ...data,
 id: selectedProject.id,
 });
 }
 };

 const handleDeleteProject = () => {
 if (selectedProject) {
 deleteMutation.mutate({ id: selectedProject.id });
 }
 };

 const handleExportExcel = async () => {
 try {
 const workbook = new ExcelJS.Workbook();
 const worksheet = workbook.addWorksheet('Projects');

 worksheet.columns = [
 { header: 'Project Code', key: 'code', width: 20 },
 { header: 'Title', key: 'title', width: 40 },
 { header: 'Status', key: 'status', width: 15 },
 { header: 'Start Date', key: 'startDate', width: 15 },
 { header: 'End Date', key: 'endDate', width: 15 },
 { header: 'Total Budget', key: 'totalBudget', width: 15 },
 { header: 'Spent', key: 'spent', width: 15 },
 { header: 'Balance', key: 'balance', width: 15 },
 { header: 'Currency', key: 'currency', width: 10 },
 { header: 'Budget Utilization %', key: 'budgetUtilization', width: 20 },
 { header: 'Sectors', key: 'sectors', width: 30 },
 { header: 'Donor', key: 'donor', width: 25 },
 { header: 'Location', key: 'location', width: 25 },
 ];

 worksheet.getRow(1).font = { bold: true };
 worksheet.getRow(1).fill = {
 type: 'pattern',
 pattern: 'solid',
 fgColor: { argb: 'FF4472C4' },
 };
 worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

 projects.forEach((project: any) => {
 worksheet.addRow({
 code: project.projectCode,
 title: project.title,
 status: project.status,
 startDate: project.startDate,
 endDate: project.endDate,
 totalBudget: Number(project.totalBudget),
 spent: Number(project.spent),
 balance: project.balance,
 currency: project.currency,
 budgetUtilization: project.budgetUtilization.toFixed(2),
 sectors: Array.isArray(project.sectors) ? project.sectors.join(', ') : '',
 donor: project.donor || '',
 location: project.location || '',
 });
 });

 const buffer = await workbook.xlsx.writeBuffer();
 const blob = new Blob([buffer], {
 type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 });
 const url = window.URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = `projects_export_${new Date().toISOString().split('T')[0]}.xlsx`;
 link.click();
 window.URL.revokeObjectURL(url);

 toast.success('Projects exported successfully!');
 } catch (error) {
 console.error('Export error:', error);
 toast.error('Failed to export projects');
 }
 };

 const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;

 try {
 const buffer = await file.arrayBuffer();
 const workbook = new ExcelJS.Workbook();
 await workbook.xlsx.load(buffer);
 
 const worksheet = workbook.getWorksheet('Projects');
 if (!worksheet) {
 toast.error('No "Projects" worksheet found in the file');
 return;
 }

 const importedProjects: any[] = [];
 worksheet.eachRow((row, rowNumber) => {
 if (rowNumber === 1) return;

 const sectors = row.getCell(11).value?.toString().split(',').map((s: string) => s.trim()) || [];
 
 importedProjects.push({
 code: row.getCell(1).value?.toString() || '',
 title: row.getCell(2).value?.toString() || '',
 status: row.getCell(3).value?.toString() || 'planned',
 startDate: row.getCell(4).value?.toString() || '',
 endDate: row.getCell(5).value?.toString() || '',
 totalBudget: Number(row.getCell(6).value) || 0,
 spent: Number(row.getCell(7).value) || 0,
 currency: row.getCell(9).value?.toString() || 'USD',
 sectors,
 donor: row.getCell(12).value?.toString() || '',
 location: row.getCell(13).value?.toString() || '',
 });
 });

 let successCount = 0;
 let errorCount = 0;

 for (const project of importedProjects) {
 try {
 await createMutation.mutateAsync({
 ...project,
 organizationId: currentOrganizationId || 1,
 });
 successCount++;
 } catch (error) {
 errorCount++;
 }
 }

 if (successCount > 0) {
 toast.success(`Successfully imported ${successCount} project(s)`);
 }
 if (errorCount > 0) {
 toast.error(`Failed to import ${errorCount} project(s)`);
 }

 event.target.value = '';
 } catch (error) {
 console.error('Import error:', error);
 toast.error('Failed to import projects');
 }
 };
 return (
 <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
 <Toaster position="top-right" />
 
 <div className="container mx-auto px-6 py-8">
 <Link href="/organization/projects">
 <BackButton label={t.projectsCRUDPage.backToDashboard} />
 </Link>

 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 <div className="p-6 border-b border-gray-200 flex items-center justify-between">
 <h3 className="text-lg font-semibold text-gray-900">{t.projectsCRUDPage.projectList}</h3>
 <div className="flex items-center gap-3">
 <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={projects.length === 0}>
 <Download className="w-4 h-4 me-2" />
 {t.projectsCRUDPage.exportExcel}
 </Button>
 <label>
 <Button variant="outline" size="sm" as="span">
 <Upload className="w-4 h-4 me-2" />
 {t.projectsCRUDPage.importExcel}
 </Button>
 <input
 type="file"
 accept=".xlsx,.xls"
 onChange={handleImportExcel}
 className="hidden"
 />
 </label>
 <Button size="sm" onClick={() => setShowCreateModal(true)}>
 <Plus className="w-4 h-4 me-2" />
 {t.projectsCRUDPage.addNewProject}
 </Button>
 </div>
 </div>

 <div className="p-6 border-b border-gray-200 flex items-center gap-4">
 <div className="flex-1 relative">
 <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
 <Input
 type="text"
 placeholder={t.projectsCRUDPage.searchByTitle}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="ps-10"
 />
 </div>
 <div className="flex items-center gap-2">
 {(['all', 'ongoing', 'planned', 'completed', 'not_started'] as const).map((status) => (
 <Button
 key={status}
 variant={statusFilter === status ? 'default' : 'outline'}
 size="sm"
 onClick={() => setStatusFilter(status)}
 >
 {t[status === 'not_started' ? 'notStarted' : status]}
 </Button>
 ))}
 </div>
 </div>

 <div className="p-6 space-y-4">
 {projectsLoading ? (
 <div className="flex items-center justify-center py-12">
 <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
 <span className="ms-3 text-gray-600">{t.projectsCRUDPage.loading}</span>
 </div>
 ) : projects.length === 0 ? (
 <div className="text-center py-12 text-gray-500">
 {t.projectsCRUDPage.noProjects}
 </div>
 ) : (
 projects.map((project: any) => (
 <div key={project.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
 <div className="flex items-start justify-between mb-4">
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-2">
 <h4 className="text-lg font-semibold text-gray-900">
 {language === 'en' ? project.title : (project.titleAr || project.title)}
 </h4>
 <span className={`px-2 py-1 text-xs font-semibold rounded ${
 project.status === 'active' ? 'bg-green-100 text-green-700' :
 project.status === 'planning' ? 'bg-blue-100 text-blue-700' :
 project.status === 'completed' ? 'bg-gray-100 text-gray-700' :
 project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-700' :
 'bg-red-100 text-red-700'
 }`}>
 {project.status === 'active' ? (t.projectsCRUDPage.active) :
 project.status === 'planning' ? (t.projectsCRUDPage.planning) :
 project.status === 'on_hold' ? (t.projectsCRUDPage.onHold) :
 project.status === 'completed' ? (t.projectsCRUDPage.completed) :
 project.status === 'cancelled' ? (t.projectsCRUDPage.cancelled) :
 project.status}
 </span>
 </div>
 <div className="text-sm text-gray-600 mb-1">
 {t.projectsCRUDPage.projectCode}: <span className="font-mono font-semibold">{project.projectCode}</span>
 </div>
 {project.donor && (
 <div className="text-sm text-gray-600">
 {t.projectsCRUDPage.donor}: <span className="font-semibold">{project.donor}</span>
 </div>
 )}
 </div>
 <div className="text-end">
 <div className="text-sm text-gray-600 mb-1">{t.projectsCRUDPage.budgetUtilization}</div>
 <div className="text-lg font-bold text-gray-900 mb-2">{project.budgetUtilization.toFixed(1)}%</div>
 <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
 <div 
 className={`h-full ${ project.budgetUtilization >= 90 ? 'bg-red-500' : project.budgetUtilization >= 75 ? 'bg-yellow-500' : 'bg-green-500' }`}
 style={{ width: `${Math.min(project.budgetUtilization, 100)}%` }}
 />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
 <div>
 <div className="text-xs text-gray-600 mb-1">{t.projectsCRUDPage.startDate}</div>
 <div className="text-sm font-semibold text-gray-900">
 {project.startDate instanceof Date 
 ? project.startDate.toLocaleDateString() 
 : new Date(project.startDate).toLocaleDateString()}
 </div>
 </div>
 <div>
 <div className="text-xs text-gray-600 mb-1">{t.projectsCRUDPage.endDate}</div>
 <div className="text-sm font-semibold text-gray-900">
 {project.endDate instanceof Date 
 ? project.endDate.toLocaleDateString() 
 : new Date(project.endDate).toLocaleDateString()}
 </div>
 </div>
 <div>
 <div className="text-xs text-gray-600 mb-1">{t.projectsCRUDPage.daysRemaining}</div>
 <div className="text-sm font-semibold text-gray-900">
 {(() => {
 const endDate = project.endDate instanceof Date ? project.endDate : new Date(project.endDate);
 const today = new Date();
 const diffTime = endDate.getTime() - today.getTime();
 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
 return diffDays > 0 ? `${diffDays} ${t.projectsCRUDPage.days}` : t.projectsCRUDPage.expired;
 })()}
 </div>
 </div>
 <div>
 <div className="text-xs text-gray-600 mb-1">{t.projectsCRUDPage.totalBudgetLabel}</div>
 <div className="text-sm font-semibold text-gray-900">{Number(project.totalBudget).toLocaleString()}</div>
 </div>
 <div>
 <div className="text-xs text-gray-600 mb-1">{t.projectsCRUDPage.currency}</div>
 <div className="text-sm font-semibold text-gray-900">{project.currency}</div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4 mb-4">
 <div>
 <div className="text-xs text-gray-600 mb-1">{t.projectsCRUDPage.spent}</div>
 <div className="text-sm font-semibold text-gray-900">{Number(project.spent).toLocaleString()}</div>
 </div>
 <div>
 <div className="text-xs text-gray-600 mb-1">{t.projectsCRUDPage.balance}</div>
 <div className="text-sm font-semibold text-gray-900">{project.balance.toLocaleString()}</div>
 </div>
 </div>

 <div className="mb-4">
 <div className="text-xs text-gray-600 mb-2">{t.projectsCRUDPage.sectors}</div>
 <div className="flex flex-wrap gap-2">
 {Array.isArray(project.sectors) && project.sectors.map((sector: string, idx: number) => (
 <span key={idx} className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded">
 {sector}
 </span>
 ))}
 </div>
 </div>

 <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
 <Button
 variant="default"
 size="sm"
 onClick={() => {
 window.location.href = `/organization/projects/${project.id}`;
 }}
 >
 <Eye className="w-4 h-4 me-2" />
 {t.projectsCRUDPage.viewDetails}
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setSelectedProject(project);
 setShowEditModal(true);
 }}
 >
 <Edit className="w-4 h-4 me-2" />
 {t.projectsCRUDPage.update}
 </Button>
 <Button
 variant="outline"
 size="sm"
 className="text-red-600 hover:text-red-700"
 onClick={() => {
 setSelectedProject(project);
 setShowDeleteModal(true);
 }}
 >
 <Trash2 className="w-4 h-4 me-2" />
 {t.projectsCRUDPage.deleteProject}
 </Button>
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 <ProjectFormModal
 open={showCreateModal}
 onClose={() => setShowCreateModal(false)}
 onSubmit={handleCreateProject}
 isLoading={createMutation.isPending}
 />

 <ProjectFormModal
 open={showEditModal}
 onClose={() => {
 setShowEditModal(false);
 setSelectedProject(null);
 }}
 onSubmit={handleUpdateProject}
 project={selectedProject}
 isLoading={updateMutation.isPending}
 />

 <DeleteConfirmationModal
 isOpen={showDeleteModal}
 onClose={() => {
 setShowDeleteModal(false);
 setSelectedProject(null);
 }}
 onConfirm={handleDeleteProject}
 recordName={selectedProject?.title || ''}
 recordType="Project"
 isPermanent={false}
 />
 </div>
 </div>
 );
}
