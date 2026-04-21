/**
 * ============================================================================
 * TRAINING RECORD FORM MODAL - Training & Development
 * ============================================================================
 */

import { useState } from 'react';
import { X, Save, GraduationCap } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { StaffMember } from '../types/hrTypes';
import { trainingService, TrainingRecord } from '@/app/services/trainingService';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 employee: StaffMember;
 existingRecord?: TrainingRecord;
 onClose: () => void;
 onSave: (record: TrainingRecord) => void;
}

export function TrainingFormModal({
 employee, existingRecord, onClose, onSave }: Props) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const isEdit = !!existingRecord;
 
 const [formData, setFormData] = useState({
 trainingTitle: existingRecord?.trainingTitle || '',
 provider: existingRecord?.provider || '',
 trainingType: existingRecord?.trainingType || 'Technical' as const,
 startDate: existingRecord?.startDate || new Date().toISOString().split('T')[0],
 endDate: existingRecord?.endDate || '',
 duration: existingRecord?.duration || '',
 status: existingRecord?.status || 'Scheduled' as const,
 certificateIssued: existingRecord?.certificateIssued || false,
 certificateNumber: existingRecord?.certificateNumber || '',
 cost: existingRecord?.cost || 0,
 currency: existingRecord?.currency || 'USD',
 fundedBy: existingRecord?.fundedBy || '',
 notes: existingRecord?.notes || '',
 skills: existingRecord?.skills || []
 });

 const localT = {
 titleAdd: t.hrModals.addTrainingRecord,
 titleEdit: t.hrModals.editTrainingRecord,
 
 employeeInfo: t.hrModals.employeeInformation,
 staffId: t.hrModals.staffId,
 fullName: t.hrModals.fullName,
 
 trainingTitle: t.hrModals.trainingTitle,
 provider: t.hrModals.trainingProvider,
 trainingType: t.hrModals.trainingType,
 
 technical: t.hrModals.technical,
 softSkills: t.hrModals.softSkills,
 management: t.hrModals.management17,
 compliance: t.hrModals.compliance,
 safety: t.hrModals.safety,
 other: t.hrModals.other,
 
 startDate: t.hrModals.startDate,
 endDate: t.hrModals.endDate,
 duration: t.hrModals.duration,
 durationPlaceholder: t.hrModals.eg3Days40Hours,
 
 status: t.hrModals.status,
 scheduled: t.hrModals.scheduled,
 inProgress: t.hrModals.inProgress,
 completed: t.hrModals.completed,
 cancelled: t.hrModals.cancelled,
 
 certificateIssued: t.hrModals.certificateIssued,
 certificateNumber: t.hrModals.certificateNumber,
 
 cost: t.hrModals.trainingCost,
 currency: t.hrModals.currency,
 fundedBy: t.hrModals.fundedBy,
 
 notes: t.hrModals.notes,
 
 cancel: t.hrModals.cancel,
 save: t.hrModals.save,
 required: t.hrModals.pleaseFillInAllRequiredFields,
 success: t.hrModals.trainingRecordSavedSuccessfully
 };

 const handleSave = () => {
 if (!formData.trainingTitle || !formData.provider || !formData.startDate || !formData.endDate) {
 alert(localT.required);
 return;
 }
 
 if (isEdit && existingRecord) {
 const updated = trainingService.update(existingRecord.id, {
 ...formData,
 lastModifiedBy: 'Current User'
 });
 if (updated) {
 alert(localT.success);
 onSave(updated);
 }
 } else {
 const record = trainingService.add({
 staffId: employee.staffId,
 employeeName: employee.fullName,
 position: employee.position,
 department: employee.department,
 
 ...formData,
 cost: formData.cost || undefined,
 fundedBy: formData.fundedBy || undefined,
 certificateNumber: formData.certificateNumber || undefined,
 notes: formData.notes || undefined,
 
 createdBy: 'Current User'
 });
 
 alert(localT.success);
 onSave(record);
 }
 
 onClose();
 };

 return (
 <ModalOverlay onClose={onClose}>
 <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
 <div className="flex items-center gap-3">
 <GraduationCap className="w-6 h-6 text-blue-600" />
 <h2 className="text-xl font-bold text-gray-900">{isEdit ? localT.titleEdit : localT.titleAdd}</h2>
 </div>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-6 h-6" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto px-6 py-4">
 <div className="space-y-4">
 {!isEdit && (
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <h3 className="text-sm font-semibold text-blue-900 mb-2">{localT.employeeInfo}</h3>
 <div className="grid grid-cols-2 gap-2 text-sm">
 <div><span className="text-gray-600">{localT.staffId}:</span> <span className="font-medium">{employee.staffId}</span></div>
 <div><span className="text-gray-600">{localT.fullName}:</span> <span className="font-medium">{employee.fullName}</span></div>
 </div>
 </div>
 )}

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.trainingTitle} *</label>
 <input
 type="text"
 value={formData.trainingTitle}
 onChange={(e) => setFormData({ ...formData, trainingTitle: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.provider} *</label>
 <input
 type="text"
 value={formData.provider}
 onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.trainingType} *</label>
 <select
 value={formData.trainingType}
 onChange={(e) => setFormData({ ...formData, trainingType: e.target.value as any })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 >
 <option value="Technical">{localT.technical}</option>
 <option value="Soft Skills">{localT.softSkills}</option>
 <option value="Management">{localT.management}</option>
 <option value="Compliance">{localT.compliance}</option>
 <option value="Safety">{localT.safety}</option>
 <option value="Other">{localT.other}</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.startDate} *</label>
 <input
 type="date"
 value={formData.startDate}
 onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.endDate} *</label>
 <input
 type="date"
 value={formData.endDate}
 onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.duration}</label>
 <input
 type="text"
 value={formData.duration}
 onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
 placeholder={localT.durationPlaceholder}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.status} *</label>
 <select
 value={formData.status}
 onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 >
 <option value="Scheduled">{localT.scheduled}</option>
 <option value="In Progress">{localT.inProgress}</option>
 <option value="Completed">{localT.completed}</option>
 <option value="Cancelled">{localT.cancelled}</option>
 </select>
 </div>

 <div className="flex items-center gap-3">
 <input
 type="checkbox"
 id="certificateIssued"
 checked={formData.certificateIssued}
 onChange={(e) => setFormData({ ...formData, certificateIssued: e.target.checked })}
 />
 <label htmlFor="certificateIssued" className="text-sm text-gray-700">{localT.certificateIssued}</label>
 </div>

 {formData.certificateIssued && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.certificateNumber}</label>
 <input
 type="text"
 value={formData.certificateNumber}
 onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 )}

 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.cost}</label>
 <input
 type="number"
 value={formData.cost}
 onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.currency}</label>
 <select
 value={formData.currency}
 onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 >
 <option value="USD">USD</option>
 <option value="EUR">EUR</option>
 <option value="YER">YER</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.fundedBy}</label>
 <input
 type="text"
 value={formData.fundedBy}
 onChange={(e) => setFormData({ ...formData, fundedBy: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.notes}</label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>
 </div>

 <div className={`flex items-center gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50`}>
 <button
 onClick={onClose}
 className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 {localT.cancel}
 </button>
 <button
 onClick={handleSave}
 className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700`}
 >
 <Save className="w-5 h-5" />
 <span>{localT.save}</span>
 </button>
 </div>
 </div>
 </ModalOverlay>
 );
}
