import { useState } from 'react';
import { Plus, Edit, Trash2, Download, Upload, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber, formatCurrency } from '@/utils/formatters';
import { useTranslation } from '@/i18n/useTranslation';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Activity {
 id: number;
 beneficiaryId: string;
 beneficiaryName: string;
 activityDate: string;
 serviceType: 'Awareness Session' | 'Legal Counseling' | 'Health Support' | 'Livelihood Support' | 'Education Support' | 'Other';
 activityDescription: string;
 location: string;
 duration: number; // minutes
 providedBy: string;
 followUpRequired: boolean;
 followUpDate?: string;
 notes: string;
}

export function ActivitiesServices({
 projectId }: { projectId: number }) {
 const { t } = useTranslation();
 const { isRTL } = useLanguage();
const [activities, setActivities] = useState<Activity[]>([
 {
 id: 1,
 beneficiaryId: 'BEN-001',
 beneficiaryName: 'Ahmed Ali',
 activityDate: '2024-01-15',
 serviceType: 'Legal Counseling',
 activityDescription: 'Legal consultation on documentation',
 location: 'Main Office',
 duration: 45,
 providedBy: 'Legal Team',
 followUpRequired: true,
 followUpDate: '2024-01-22',
 notes: 'Requires additional documentation'
 },
 {
 id: 2,
 beneficiaryId: 'BEN-002',
 beneficiaryName: 'Fatima Hassan',
 activityDate: '2024-01-14',
 serviceType: 'Awareness Session',
 activityDescription: 'Gender-based violence awareness',
 location: 'Community Center',
 duration: 90,
 providedBy: 'Protection Team',
 followUpRequired: false,
 notes: 'Good participation and engagement'
 }
 ]);

 const [showAddModal, setShowAddModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);
 const [showDeleteModal, setShowDeleteModal] = useState(false);
 const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
 const [deletingActivityId, setDeletingActivityId] = useState<number | null>(null);
 const [formData, setFormData] = useState<Partial<Activity>>({
 serviceType: 'Awareness Session',
 duration: 60,
 followUpRequired: false
 });

 const resetForm = () => {
 setFormData({
 serviceType: 'Awareness Session',
 duration: 60,
 followUpRequired: false
 });
 };

 const handleAdd = () => {
 if (!formData.beneficiaryId || !formData.beneficiaryName || !formData.activityDate || !formData.activityDescription || !formData.providedBy) {
 alert(t.caseManagement.fillRequiredFields);
 return;
 }

 const newActivity: Activity = {
 id: Math.max(0, ...activities.map(a => a.id)) + 1,
 beneficiaryId: formData.beneficiaryId!,
 beneficiaryName: formData.beneficiaryName!,
 activityDate: formData.activityDate!,
 serviceType: formData.serviceType as Activity['serviceType'],
 activityDescription: formData.activityDescription!,
 location: formData.location || '',
 duration: formData.duration || 60,
 providedBy: formData.providedBy!,
 followUpRequired: formData.followUpRequired || false,
 followUpDate: formData.followUpDate,
 notes: formData.notes || ''
 };

 setActivities([...activities, newActivity]);
 setShowAddModal(false);
 resetForm();
 alert(t.caseManagement.activityAddedSuccess);
 };

 const handleEdit = () => {
 if (!editingActivity || !formData.beneficiaryId || !formData.beneficiaryName || !formData.activityDate) {
 alert(t.caseManagement.fillRequiredFields);
 return;
 }

 setActivities(activities.map(a =>
 a.id === editingActivity.id
 ? { ...a, ...formData } as Activity
 : a
 ));

 setShowEditModal(false);
 setEditingActivity(null);
 resetForm();
 alert(t.caseManagement.activityUpdatedSuccess);
 };

 const handleDelete = () => {
 if (deletingActivityId !== null) {
 setActivities(activities.filter(a => a.id !== deletingActivityId));
 setShowDeleteModal(false);
 setDeletingActivityId(null);
 alert(t.caseManagement.activityDeletedSuccess);
 }
 };

 const openEdit = (activity: Activity) => {
 setEditingActivity(activity);
 setFormData(activity);
 setShowEditModal(true);
 };

 const openDelete = (activityId: number) => {
 setDeletingActivityId(activityId);
 setShowDeleteModal(true);
 };

 // Excel Export
 const handleExportExcel = async () => {
 const workbook = new ExcelJS.Workbook();
 const worksheet = workbook.addWorksheet(t.caseManagement.activitiesTitle);

 worksheet.columns = [
 { header: 'Activity ID', key: 'id', width: 12 },
 { header: t.caseManagement.beneficiaryCode, key: 'beneficiaryId', width: 15 },
 { header: t.common.name, key: 'beneficiaryName', width: 25 },
 { header: t.caseManagement.activityDate, key: 'activityDate', width: 15 },
 { header: t.caseManagement.serviceType, key: 'serviceType', width: 20 },
 { header: t.common.description, key: 'activityDescription', width: 40 },
 { header: t.caseManagement.location, key: 'location', width: 20 },
 { header: t.caseManagement.duration, key: 'duration', width: 15 },
 { header: 'Provided By', key: 'providedBy', width: 25 },
 { header: 'Follow-up Required', key: 'followUpRequired', width: 18 },
 { header: t.caseManagement.followUpDate, key: 'followUpDate', width: 15 },
 { header: t.caseManagement.notes, key: 'notes', width: 40 }
 ];

 worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
 worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
 worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

 activities.forEach(activity => {
 worksheet.addRow({
 id: activity.id,
 beneficiaryId: activity.beneficiaryId,
 beneficiaryName: activity.beneficiaryName,
 activityDate: activity.activityDate,
 serviceType: activity.serviceType,
 activityDescription: activity.activityDescription,
 location: activity.location,
 duration: activity.duration,
 providedBy: activity.providedBy,
 followUpRequired: activity.followUpRequired ? t.common.yes : t.common.no,
 followUpDate: activity.followUpDate || '',
 notes: activity.notes
 });
 });

 const buffer = await workbook.xlsx.writeBuffer();
 const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
 saveAs(blob, `Activities_Services_${new Date().toISOString().split('T')[0]}.xlsx`);
 };

 // Excel Import Template
 const handleDownloadTemplate = async () => {
 const workbook = new ExcelJS.Workbook();
 const worksheet = workbook.addWorksheet('Activities Template');

 worksheet.columns = [
 { header: `${t.caseManagement.beneficiaryCode}*`, key: 'beneficiaryId', width: 15 },
 { header: `${t.common.name}*`, key: 'beneficiaryName', width: 25 },
 { header: `${t.caseManagement.activityDate}* (YYYY-MM-DD)`, key: 'activityDate', width: 25 },
 { header: `${t.caseManagement.serviceType}*`, key: 'serviceType', width: 25 },
 { header: `${t.common.description}*`, key: 'activityDescription', width: 40 },
 { header: t.caseManagement.location, key: 'location', width: 20 },
 { header: `${t.caseManagement.duration} (${t.caseManagement.minutes})*`, key: 'duration', width: 20 },
 { header: 'Provided By*', key: 'providedBy', width: 25 },
 { header: `Follow-up Required (${t.common.yes}/${t.common.no})`, key: 'followUpRequired', width: 25 },
 { header: `${t.caseManagement.followUpDate} (YYYY-MM-DD)`, key: 'followUpDate', width: 25 },
 { header: t.caseManagement.notes, key: 'notes', width: 40 }
 ];

 worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
 worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };

 // Add sample row
 worksheet.addRow({
 beneficiaryId: 'BEN-001',
 beneficiaryName: 'Ahmed Ali',
 activityDate: '2024-01-15',
 serviceType: 'Legal Counseling',
 activityDescription: 'Legal consultation on documentation',
 location: 'Main Office',
 duration: 45,
 providedBy: 'Legal Team',
 followUpRequired: 'Yes',
 followUpDate: '2024-01-22',
 notes: 'Sample activity record'
 });

 const buffer = await workbook.xlsx.writeBuffer();
 const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
 saveAs(blob, 'Activities_Services_Import_Template.xlsx');
 };

 // Excel Import
 const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;

 const workbook = new ExcelJS.Workbook();
 const arrayBuffer = await file.arrayBuffer();
 await workbook.xlsx.load(arrayBuffer);

 const worksheet = workbook.getWorksheet(1);
 if (!worksheet) {
 alert('No worksheet found in the Excel file');
 return;
 }

 const importedActivities: Activity[] = [];
 let maxId = Math.max(0, ...activities.map(a => a.id));

 worksheet.eachRow((row, rowNumber) => {
 if (rowNumber === 1) return; // Skip header

 const activityData = {
 id: ++maxId,
 beneficiaryId: row.getCell(1).value?.toString() || '',
 beneficiaryName: row.getCell(2).value?.toString() || '',
 activityDate: row.getCell(3).value?.toString() || '',
 serviceType: row.getCell(4).value?.toString() as Activity['serviceType'] || 'Other',
 activityDescription: row.getCell(5).value?.toString() || '',
 location: row.getCell(6).value?.toString() || '',
 duration: Number(row.getCell(7).value) || 60,
 providedBy: row.getCell(8).value?.toString() || '',
 followUpRequired: row.getCell(9).value?.toString()?.toLowerCase() === 'yes',
 followUpDate: row.getCell(10).value?.toString() || undefined,
 notes: row.getCell(11).value?.toString() || ''
 };

 if (activityData.beneficiaryId && activityData.beneficiaryName && activityData.activityDate) {
 importedActivities.push(activityData);
 }
 });

 setActivities([...activities, ...importedActivities]);
 alert(`${t.common.success}: ${importedActivities.length} activities imported`);
 event.target.value = '';
 };

 return (
 <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className={`flex items-center justify-between`}>
 <div className={'text-start'}>
 <h3 className="text-sm font-semibold text-gray-900">{t.caseManagement.activitiesTitle}</h3>
 <p className="text-xs text-gray-600 mt-0.5">{t.caseManagement.activitiesDescription}</p>
 </div>
 <div className={`flex items-center gap-2`}>
 <button
 onClick={handleDownloadTemplate}
 className={`px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2`}
 >
 <Download className="w-4 h-4" />
 {t.caseManagement.exportActivitiesTemplate}
 </button>
 <label className={`px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 cursor-pointer`}>
 <Upload className="w-4 h-4" />
 {t.caseManagement.importActivities}
 <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />
 </label>
 <button
 onClick={handleExportExcel}
 className={`px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2`}
 >
 <Download className="w-4 h-4" />
 {t.caseManagement.exportActivities}
 </button>
 <button
 onClick={() => setShowAddModal(true)}
 className={`px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2`}
 >
 <Plus className="w-4 h-4" />
 {t.caseManagement.addActivity}
 </button>
 </div>
 </div>

 {/* Activities Table */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>ID</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.caseManagement.beneficiaryCode}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.caseManagement.activityDate}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.caseManagement.serviceType}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.common.description}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>Provided By</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>Follow-up</th>
 <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t.common.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {activities.length === 0 ? (
 <tr>
 <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
 {t.caseManagement.noActivitiesFound}
 </td>
 </tr>
 ) : (
 activities.map(activity => (
 <tr key={activity.id} className="hover:bg-gray-50">
 <td className={`px-4 py-3 text-gray-900 text-start`}>{activity.beneficiaryId}</td>
 <td className={`px-4 py-3 text-gray-900 text-start`}>{activity.beneficiaryName}</td>
 <td className={`ltr-safe px-4 py-3 text-gray-600 text-start`}>{activity.activityDate}</td>
 <td className={`px-4 py-3 text-start`}>
 <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
 {activity.serviceType}
 </span>
 </td>
 <td className={`px-4 py-3 text-gray-600 text-start`}>{activity.activityDescription}</td>
 <td className={`px-4 py-3 text-gray-600 text-start`}>{activity.providedBy}</td>
 <td className={`ltr-safe px-4 py-3 text-gray-600 text-start`}>
 {activity.followUpRequired ? activity.followUpDate || '-' : t.common.no}
 </td>
 <td className="px-4 py-3">
 <div className="flex items-center justify-center gap-2">
 <button
 onClick={() => openEdit(activity)}
 className="p-1 text-blue-600 hover:bg-blue-50 rounded"
 title={t.caseManagement.editActivity}
 >
 <Edit className="w-4 h-4" />
 </button>
 <button
 onClick={() => openDelete(activity.id)}
 className="p-1 text-red-600 hover:bg-red-50 rounded"
 title={t.caseManagement.deleteActivity}
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Add/Edit Modal */}
 {(showAddModal || showEditModal) && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
 <div className={`sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between`}>
 <h3 className="text-lg font-semibold text-gray-900">
 {showAddModal ? t.caseManagement.addNewActivity : t.caseManagement.updateActivity}
 </h3>
 <button
 onClick={() => {
 setShowAddModal(false);
 setShowEditModal(false);
 setEditingActivity(null);
 resetForm();
 }}
 className="p-1 hover:bg-gray-100 rounded"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="p-6 space-y-4">
 {/* Beneficiary Info */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.caseManagement.beneficiaryCode} <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={formData.beneficiaryId || ''}
 onChange={(e) => setFormData({ ...formData, beneficiaryId: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.common.name} <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={formData.beneficiaryName || ''}
 onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 </div>

 {/* Activity Details */}
 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.caseManagement.activityDate} <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 value={formData.activityDate || ''}
 onChange={(e) => setFormData({ ...formData, activityDate: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.caseManagement.serviceType} <span className="text-red-500">*</span>
 </label>
 <select
 value={formData.serviceType || 'Awareness Session'}
 onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as Activity['serviceType'] })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 >
 <option value="Awareness Session">Awareness Session</option>
 <option value="Legal Counseling">Legal Counseling</option>
 <option value="Health Support">Health Support</option>
 <option value="Livelihood Support">Livelihood Support</option>
 <option value="Education Support">Education Support</option>
 <option value="Other">Other</option>
 </select>
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.caseManagement.duration} ({t.caseManagement.minutes}) <span className="text-red-500">*</span>
 </label>
 <input
 type="number"
 value={formData.duration || 60}
 onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 min="1"
 />
 </div>
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.common.description} <span className="text-red-500">*</span>
 </label>
 <textarea
 value={formData.activityDescription || ''}
 onChange={(e) => setFormData({ ...formData, activityDescription: e.target.value })}
 rows={2}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.caseManagement.location}
 </label>
 <input
 type="text"
 value={formData.location || ''}
 onChange={(e) => setFormData({ ...formData, location: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 Provided By <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={formData.providedBy || ''}
 onChange={(e) => setFormData({ ...formData, providedBy: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 </div>

 <div className="flex items-center gap-4">
 <label className={`flex items-center gap-2 cursor-pointer`}>
 <input
 type="checkbox"
 checked={formData.followUpRequired || false}
 onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })}
 className="w-4 h-4"
 />
 <span className="text-sm text-gray-700">Follow-up Required</span>
 </label>
 {formData.followUpRequired && (
 <div className="flex-1">
 <input
 type="date"
 value={formData.followUpDate || ''}
 onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 )}
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.caseManagement.notes}
 </label>
 <textarea
 value={formData.notes || ''}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={2}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>
 </div>

 <div className={`sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center gap-3 justify-end`}>
 <button
 onClick={() => {
 setShowAddModal(false);
 setShowEditModal(false);
 setEditingActivity(null);
 resetForm();
 }}
 className="px-6 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
 >
 {t.common.cancel}
 </button>
 <button
 onClick={showAddModal ? handleAdd : handleEdit}
 className="px-6 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90"
 >
 {showAddModal ? t.caseManagement.addNewActivity : t.caseManagement.updateActivity}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Delete Modal */}
 {showDeleteModal && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg w-full max-w-md p-6">
 <h3 className={`text-lg font-semibold text-gray-900 mb-2 text-start`}>
 {t.caseManagement.confirmDeleteActivity}
 </h3>
 <p className={`text-sm text-gray-600 mb-6 text-start`}>
 {t.caseManagement.activityDeleteMessage}
 </p>
 <div className={`flex items-center gap-3 justify-end`}>
 <button
 onClick={() => {
 setShowDeleteModal(false);
 setDeletingActivityId(null);
 }}
 className="px-6 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
 >
 {t.common.cancel}
 </button>
 <button
 onClick={handleDelete}
 className="px-6 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
 >
 {t.common.delete}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
