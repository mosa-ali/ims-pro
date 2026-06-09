import { useTranslation } from '@/i18n/useTranslation';
import { useState } from 'react';
import { Plus, Edit2, Trash2, Calendar, AlertTriangle, X, Clock, FileText, CheckCircle } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { BackButton } from "@/components/BackButton";

interface ReportingScheduleProps {
 projectId?: number;
 embedded?: boolean;
}
export default function ReportingSchedulePage({ projectId, embedded = false }: ReportingScheduleProps) {
 const { isRTL } = useLanguage();
 const { user } = useAuth();
 const { t } = useTranslation();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();
 
 const [showAddForm, setShowAddForm] = useState(false);
 const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
 const [showDeleteConfirm, setShowDeleteConfirm] = useState<any | null>(null);

const localT = {
  title: t.reportingSchedulePage.title,
  subtitle: t.reportingSchedulePage.subtitle,
  addReport: t.reportingSchedulePage.addReport,
  reportingSchedule: t.reportingSchedulePage.reportingSchedule,
  editReportingSchedule: t.reportingSchedulePage.editReportingSchedule,
  addReportingSchedule: t.reportingSchedulePage.addReportingSchedule,
  selectProject: t.reportingSchedulePage.selectProject,
  reportType: t.reportingSchedulePage.reportType,
  selectReportType: t.reportingSchedulePage.selectReportType,
  periodFrom: t.reportingSchedulePage.periodFrom,
  periodTo: t.reportingSchedulePage.periodTo,
  reportStatus: t.reportingSchedulePage.reportStatus,
  reportDeadline: t.reportingSchedulePage.reportDeadline,
  notes: t.reportingSchedulePage.notes,
  create: t.reportingSchedulePage.create,
  update: t.reportingSchedulePage.update,
  cancel: t.reportingSchedulePage.cancel,
  noReportingSchedules: t.reportingSchedulePage.noReportingSchedules,
  confirmDeletion: t.reportingSchedulePage.confirmDeletion,

  period: t.reportingSchedulePage.period,
  deadline: t.reportingSchedulePage.deadline,

  lockedSubmittedToDonor: t.reportingSchedulePage.lockedSubmittedToDonor,

  narrativeReport: t.reportingSchedulePage.narrativeReport,
  financialReport: t.reportingSchedulePage.financialReport,
  progressReport: t.reportingSchedulePage.progressReport,
  finalReport: t.reportingSchedulePage.finalReport,
  interimReport: t.reportingSchedulePage.interimReport,
  quarterlyReport: t.reportingSchedulePage.quarterlyReport,
  annualReport: t.reportingSchedulePage.annualReport,
  other: t.reportingSchedulePage.other,

  notStarted: t.reportingSchedulePage.notStarted,
  planned: t.reportingSchedulePage.planned,
  underPreparation: t.reportingSchedulePage.underPreparation,
  underReview: t.reportingSchedulePage.underReview,
  submittedToHQ: t.reportingSchedulePage.submittedToHQ,
  submittedToDonor: t.reportingSchedulePage.submittedToDonor,
};
 
const REPORT_TYPES: ReportType[] = [
  'NARRATIVE',
  'FINANCIAL',
  'PROGRESS',
  'FINAL',
  'INTERIM',
  'QUARTERLY',
  'ANNUAL',
  'OTHER',
];

const REPORT_STATUSES: ReportStatus[] = [
  'NOT_STARTED',
  'PLANNED',
  'UNDER_PREPARATION',
  'UNDER_REVIEW',
  'SUBMITTED_TO_HQ',
  'SUBMITTED_TO_DONOR',
];

type ReportType =
  | 'NARRATIVE'
  | 'FINANCIAL'
  | 'PROGRESS'
  | 'FINAL'
  | 'INTERIM'
  | 'QUARTERLY'
  | 'ANNUAL'
  | 'OTHER';

type ReportStatus =
  | 'NOT_STARTED'
  | 'PLANNED'
  | 'UNDER_PREPARATION'
  | 'UNDER_REVIEW'
  | 'SUBMITTED_TO_HQ'
  | 'SUBMITTED_TO_DONOR';

 const [formData, setFormData] = useState<{
 projectId: number;
 reportType: ReportType | '';
 reportTypeOther: string;
 periodFrom: string;
 periodTo: string;
 reportStatus: ReportStatus;
 reportDeadline: string;
 notes: string;
 }>({
 projectId: 0,
 reportType: '',
 reportTypeOther: '',
 periodFrom: '',
 periodTo: '',
 reportStatus: 'PLANNED',
 reportDeadline: '',
 notes: ''
 });

 // Load reporting schedules
 const { data: schedules = [], refetch } = trpc.reportingSchedules.list.useQuery({
 projectId: projectId,
})
 
 // Load projects for dropdown
 const { data: projects = [] } = trpc.projects.list.useQuery({
  limit: 1000,
  status: 'active',
});

 // Mutations
 const createMutation = trpc.reportingSchedules.create.useMutation({
 onSuccess: () => {
 refetch();
 setShowAddForm(false);
 alert(t.reportingSchedulePage.reportCreatedSuccessfully);
 },
 onError: (error) => {
 alert(error.message);
 }
 });

 const updateMutation = trpc.reportingSchedules.update.useMutation({
 onSuccess: () => {
 refetch();
 setShowAddForm(false);
 alert(t.reportingSchedulePage.reportUpdatedSuccessfully);
 },
 onError: (error) => {
 alert(error.message);
 }
 });

 const deleteMutation = trpc.reportingSchedules.delete.useMutation({
 onSuccess: () => {
 refetch();
 setShowDeleteConfirm(null);
 alert(t.reportingSchedulePage.reportDeletedSuccessfully);
 },
 onError: (error) => {
 alert(error.message);
 setShowDeleteConfirm(null);
 }
 });

 // Permissions (simplified for now)
 const canCreate = true;
 const canEdit = true;
 const canDelete = user?.role === 'platform_admin';

 const handleOpenAddForm = () => {
 setFormData({
 projectId: projectId || 0,
 reportType: '',
 reportTypeOther: '',
 periodFrom: '',
 periodTo: '',
 reportStatus: 'PLANNED',
 reportDeadline: '',
 notes: ''
 });
 setEditingScheduleId(null);
 setShowAddForm(true);
 };

 const handleOpenEditForm = (schedule: any) => {
 setEditingScheduleId(schedule.id);
 setFormData({
 projectId: schedule.projectId,
 reportType: schedule.reportType,
 reportTypeOther: schedule.reportTypeOther || '',
 periodFrom: schedule.periodFrom,
 periodTo: schedule.periodTo,
 reportStatus: schedule.reportStatus,
 reportDeadline: schedule.reportDeadline,
 notes: schedule.notes || ''
 });
 setShowAddForm(true);
 };

 const handleCreate = () => {
 if (!formData.reportType) {
 alert(t.reportingSchedulePage.reportTypeRequired);
 return;
 }
 if (!formData.projectId) {
 alert(t.reportingSchedulePage.projectRequired);
 return;
 }

 createMutation.mutate({
 projectId: formData.projectId,
 reportType: formData.reportType as ReportType,
 reportTypeOther: formData.reportTypeOther,
 periodFrom: formData.periodFrom,
 periodTo: formData.periodTo,
 reportStatus: formData.reportStatus,
 reportDeadline: formData.reportDeadline,
 notes: formData.notes,
 });
 };

 const handleUpdate = () => {
 if (!editingScheduleId) return;
 if (!formData.reportType) {
 alert('Type of Report is required');
 return;
 }

 updateMutation.mutate({
 id: editingScheduleId,
 reportType: formData.reportType as ReportType,
 reportTypeOther: formData.reportTypeOther,
 periodFrom: formData.periodFrom,
 periodTo: formData.periodTo,
 reportStatus: formData.reportStatus,
 reportDeadline: formData.reportDeadline,
 notes: formData.notes,
 });
 };

 const handleDelete = (schedule: any) => {
 setShowDeleteConfirm(schedule);
 };

 const confirmDelete = () => {
 if (!showDeleteConfirm) return;
 deleteMutation.mutate({ id: showDeleteConfirm.id });
 };

 const getStatusColor = (status: ReportStatus) => {
 switch (status) {
 case 'NOT_STARTED': return 'bg-gray-100 text-gray-800 border-gray-200';
 case 'PLANNED': return 'bg-blue-100 text-blue-800 border-blue-200';
 case 'UNDER_PREPARATION': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
 case 'UNDER_REVIEW': return 'bg-purple-100 text-purple-800 border-purple-200';
 case 'SUBMITTED_TO_HQ': return 'bg-orange-100 text-orange-800 border-orange-200';
 case 'SUBMITTED_TO_DONOR': return 'bg-green-100 text-green-800 border-green-200';
 default: return 'bg-gray-100 text-gray-800 border-gray-200';
 }
 };

 const getReportTypeLabel = (
  type: ReportType,
  typeOther?: string
) => {
  if (type === 'OTHER' && typeOther) {
    return typeOther;
  }

  const labels = {
    NARRATIVE: localT.narrativeReport,
    FINANCIAL: localT.financialReport,
    PROGRESS: localT.progressReport,
    FINAL: localT.finalReport,
    INTERIM: localT.interimReport,
    QUARTERLY: localT.quarterlyReport,
    ANNUAL: localT.annualReport,
    OTHER: localT.other,
  };

  return labels[type];
};

 const getStatusLabel = (
  status: ReportStatus
) => {
  const labels = {
    NOT_STARTED: localT.notStarted,
    PLANNED: localT.planned,
    UNDER_PREPARATION: localT.underPreparation,
    UNDER_REVIEW: localT.underReview,
    SUBMITTED_TO_HQ: localT.submittedToHQ,
    SUBMITTED_TO_DONOR: localT.submittedToDonor,
  };

  return labels[status];
};

 return (
 <div className={embedded ? 'space-y-4' : 'p-6 space-y-6'} dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header with Back Button */}
 {!embedded && (
 <>
 <Link href="/projects">
 <BackButton label={t.common.backToDashboard} />
 </Link>

 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-gray-900">
 {localT.title}
 </h1>
 <p className="text-gray-600 mt-1">
 {localT.subtitle}
 </p>
 </div>
 {canCreate && (
 <Button
 onClick={handleOpenAddForm}
 className="flex items-center gap-2"
 >
 <Plus className="w-5 h-5" />
 {localT.addReport}
 </Button>
 )}
 </div>
 </>
 )}

 {embedded && canCreate && (
 <div className="flex items-center justify-between">
 <h3 className="text-lg font-semibold text-gray-900">
  {localT.reportingSchedule}
 </h3>
 <Button
 onClick={handleOpenAddForm}
 size="sm"
 className="flex items-center gap-2"
 >
 <Plus className="w-4 h-4" />
 {t.common.add}
 </Button>
 </div>
 )}

 {/* Add/Edit Form Modal */}
 {showAddForm && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-xl font-semibold text-gray-900">
 {editingScheduleId
 ? localT.editReportingSchedule
 : localT.addReportingSchedule}
 </h3>
 <button
 onClick={() => {
 setShowAddForm(false);
 setEditingScheduleId(null);
 }}
 className="p-1 hover:bg-gray-100 rounded-md transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="space-y-4">
 {/* Project Selection */}
 {!projectId && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {localT.selectProject} *
 </label>
 <select
 value={formData.projectId}
 onChange={(e) => setFormData({ ...formData, projectId: Number(e.target.value) })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 required
 >
 <option value="">{localT.selectProject}</option>
 {projects.map((project) => (
 <option key={project.id} value={project.id}>
 {project.projectCode} - {project.title}
 </option>
 ))}
 </select>
 </div>
 )}

 {/* Report Type */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {localT.reportType} *
 </label>
 <select
 value={formData.reportType}
 onChange={(e) => setFormData({ ...formData, reportType: e.target.value as ReportType })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 required
 >
 <option value="">{localT.selectReportType}</option>
 {REPORT_TYPES.map((type) => (
  <option key={type} value={type}>
    {getReportTypeLabel(type)}
  </option>
))}
 </select>
 </div>

 {/* Other Report Type */}
 {formData.reportType === 'OTHER' && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.reportingSchedulePage.specifyReportType}
 </label>
 <input
 type="text"
 value={formData.reportTypeOther}
 onChange={(e) => setFormData({ ...formData, reportTypeOther: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 placeholder={t.placeholders.enterCustomReportType}
 />
 </div>
 )}

 {/* Period From */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {localT.periodFrom} *
 </label>
 <input
 type="date"
 value={formData.periodFrom}
 onChange={(e) => setFormData({ ...formData, periodFrom: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 required
 />
 </div>

 {/* Period To */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {localT.periodTo} *
 </label>
 <input
 type="date"
 value={formData.periodTo}
 onChange={(e) => setFormData({ ...formData, periodTo: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 required
 />
 </div>

 {/* Report Status */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {localT.reportStatus} *
 </label>
 <select
 value={formData.reportStatus}
 onChange={(e) => setFormData({ ...formData, reportStatus: e.target.value as ReportStatus })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 required
 >
 {REPORT_STATUSES.map((status) => (
  <option key={status} value={status}>
    {getStatusLabel(status)}
  </option>
))}
 </select>
 </div>

 {/* Report Deadline */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {localT.reportDeadline} *
 </label>
 <input
 type="date"
 value={formData.reportDeadline}
 onChange={(e) => setFormData({ ...formData, reportDeadline: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 required
 />
 </div>

 {/* Notes */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {localT.notes}
 </label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 placeholder={t.placeholders.additionalNotesOrComments}
 />
 </div>

 {/* Action Buttons */}
 <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
 <Button
 onClick={() => {
 setShowAddForm(false);
 setEditingScheduleId(null);
 }}
 variant="outline"
 >
 {localT.cancel}
 </Button>
 <Button
 onClick={editingScheduleId ? handleUpdate : handleCreate}
 >
 {editingScheduleId
 ? localT.update
 : localT.create}
 </Button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Schedules List */}
 {schedules.length > 0 ? (
 <div className="grid grid-cols-1 gap-4">
 {schedules.map((schedule) => (
 <div
 key={schedule.id}
 className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
 >
 <div className="flex items-start justify-between">
 <div className="flex-1">
 {/* Project Info */}
 <div className="mb-3">
 <h3 className="font-semibold text-gray-900">{schedule.projectName}</h3>
 <p className="text-sm text-gray-600">{schedule.projectCode}</p>
 </div>

 {/* Report Type & Status */}
 <div className="flex items-center gap-3 mb-3 flex-wrap">
 <div className="flex items-center gap-2">
 <FileText className="w-4 h-4 text-blue-600" />
 <span className="text-sm font-medium text-gray-700">
 {getReportTypeLabel(schedule.reportType as ReportType, schedule.reportTypeOther || undefined)}
 </span>
 </div>
 <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(schedule.reportStatus as ReportStatus)}`}>
 {getStatusLabel(schedule.reportStatus as ReportStatus)}
 </span>
 </div>

 {/* Period & Deadline */}
 <div className="text-sm text-gray-700 space-y-1">
 <div className="flex items-center gap-2">
 <Calendar className="w-4 h-4 text-gray-400" />
 <span>
 {localT.period}: {new Date(schedule.periodFrom).toLocaleDateString()} - {new Date(schedule.periodTo).toLocaleDateString()}
 </span>
 </div>
 <div className="flex items-center gap-2">
 <Clock className="w-4 h-4 text-red-500" />
 <span>
 {localT.deadline}:: {new Date(schedule.reportDeadline).toLocaleDateString()}
 </span>
 </div>
 </div>

 {/* Notes */}
 {schedule.notes && (
 <p className="text-sm text-gray-600 mt-2">
 {schedule.notes}
 </p>
 )}

 {/* Locked Indicator */}
 {schedule.isLocked && (
 <div className="flex items-center gap-2 mt-2 text-xs text-orange-700">
 <CheckCircle className="w-4 h-4" />
 <span>{localT.lockedSubmittedToDonor}</span>
 </div>
 )}
 </div>

 {/* Actions */}
 {!schedule.isLocked && (
 <div className="flex items-center gap-2">
 {canEdit && (
 <button
 onClick={() => handleOpenEditForm(schedule)}
 className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
 title="Edit"
 >
 <Edit2 className="w-4 h-4" />
 </button>
 )}
 {canDelete && (
 <button
 onClick={() => handleDelete(schedule)}
 className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
 title="Delete"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 )}
 </div>
 )}
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
 <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
 <p className="text-gray-600">
 {localT.noReportingSchedules}
 </p>
 </div>
 )}

 {/* Delete Confirmation Modal */}
 {showDeleteConfirm && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
 <div className="flex items-center gap-3 mb-4">
 <AlertTriangle className="w-6 h-6 text-red-600" />
 <h3 className="text-lg font-semibold text-gray-900">
 {localT.confirmDeletion}
 </h3>
 </div>

 <p className="text-gray-700 mb-6">
 {t.reportingSchedulePage.deleteScheduleConfirmation} "{getReportTypeLabel(showDeleteConfirm.reportType, showDeleteConfirm.reportTypeOther)}" schedule?
 </p>

 <div className="flex items-center justify-end gap-3">
 <Button
 onClick={() => setShowDeleteConfirm(null)}
 variant="outline"
 >
 Cancel
 </Button>
 <Button
 onClick={confirmDelete}
 className="bg-red-600 hover:bg-red-700"
 >
 {t.common.delete}
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
