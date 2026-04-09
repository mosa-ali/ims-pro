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

interface Props {
  employee: StaffMember;
  existingRecord?: TrainingRecord;
  onClose: () => void;
  onSave: (record: TrainingRecord) => void;
}

export function TrainingFormModal({ employee, existingRecord, onClose, onSave }: Props) {
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

  const t = {
    titleAdd: language === 'en' ? 'Add Training Record' : 'إضافة سجل تدريب',
    titleEdit: language === 'en' ? 'Edit Training Record' : 'تعديل سجل تدريب',
    
    employeeInfo: language === 'en' ? 'Employee Information' : 'معلومات الموظف',
    staffId: language === 'en' ? 'Staff ID' : 'رقم الموظف',
    fullName: language === 'en' ? 'Full Name' : 'الاسم الكامل',
    
    trainingTitle: language === 'en' ? 'Training Title' : 'عنوان التدريب',
    provider: language === 'en' ? 'Training Provider' : 'مزود التدريب',
    trainingType: language === 'en' ? 'Training Type' : 'نوع التدريب',
    
    technical: language === 'en' ? 'Technical' : 'تقني',
    softSkills: language === 'en' ? 'Soft Skills' : 'المهارات الشخصية',
    management: language === 'en' ? 'Management' : 'إدارة',
    compliance: language === 'en' ? 'Compliance' : 'امتثال',
    safety: language === 'en' ? 'Safety' : 'السلامة',
    other: language === 'en' ? 'Other' : 'أخرى',
    
    startDate: language === 'en' ? 'Start Date' : 'تاريخ البدء',
    endDate: language === 'en' ? 'End Date' : 'تاريخ الانتهاء',
    duration: language === 'en' ? 'Duration' : 'المدة',
    durationPlaceholder: language === 'en' ? 'e.g., 3 days, 40 hours' : 'مثال: 3 أيام، 40 ساعة',
    
    status: language === 'en' ? 'Status' : 'الحالة',
    scheduled: language === 'en' ? 'Scheduled' : 'مجدول',
    inProgress: language === 'en' ? 'In Progress' : 'قيد التنفيذ',
    completed: language === 'en' ? 'Completed' : 'مكتمل',
    cancelled: language === 'en' ? 'Cancelled' : 'ملغي',
    
    certificateIssued: language === 'en' ? 'Certificate Issued' : 'تم إصدار الشهادة',
    certificateNumber: language === 'en' ? 'Certificate Number' : 'رقم الشهادة',
    
    cost: language === 'en' ? 'Training Cost' : 'تكلفة التدريب',
    currency: language === 'en' ? 'Currency' : 'العملة',
    fundedBy: language === 'en' ? 'Funded By' : 'ممول من قبل',
    
    notes: language === 'en' ? 'Notes' : 'ملاحظات',
    
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    save: language === 'en' ? 'Save' : 'حفظ',
    required: language === 'en' ? 'Please fill in all required fields' : 'يرجى ملء جميع الحقول المطلوبة',
    success: language === 'en' ? 'Training record saved successfully' : 'تم حفظ سجل التدريب بنجاح'
  };

  const handleSave = () => {
    if (!formData.trainingTitle || !formData.provider || !formData.startDate || !formData.endDate) {
      alert(t.required);
      return;
    }
    
    if (isEdit && existingRecord) {
      const updated = trainingService.update(existingRecord.id, {
        ...formData,
        lastModifiedBy: 'Current User'
      });
      if (updated) {
        alert(t.success);
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
      
      alert(t.success);
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
            <h2 className="text-xl font-bold text-gray-900">{isEdit ? t.titleEdit : t.titleAdd}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {!isEdit && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">{t.employeeInfo}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-600">{t.staffId}:</span> <span className="font-medium">{employee.staffId}</span></div>
                  <div><span className="text-gray-600">{t.fullName}:</span> <span className="font-medium">{employee.fullName}</span></div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.trainingTitle} *</label>
              <input
                type="text"
                value={formData.trainingTitle}
                onChange={(e) => setFormData({ ...formData, trainingTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.provider} *</label>
                <input
                  type="text"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.trainingType} *</label>
                <select
                  value={formData.trainingType}
                  onChange={(e) => setFormData({ ...formData, trainingType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Technical">{t.technical}</option>
                  <option value="Soft Skills">{t.softSkills}</option>
                  <option value="Management">{t.management}</option>
                  <option value="Compliance">{t.compliance}</option>
                  <option value="Safety">{t.safety}</option>
                  <option value="Other">{t.other}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.startDate} *</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.endDate} *</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.duration}</label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder={t.durationPlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.status} *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Scheduled">{t.scheduled}</option>
                <option value="In Progress">{t.inProgress}</option>
                <option value="Completed">{t.completed}</option>
                <option value="Cancelled">{t.cancelled}</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="certificateIssued"
                checked={formData.certificateIssued}
                onChange={(e) => setFormData({ ...formData, certificateIssued: e.target.checked })}
              />
              <label htmlFor="certificateIssued" className="text-sm text-gray-700">{t.certificateIssued}</label>
            </div>

            {formData.certificateIssued && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.certificateNumber}</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.cost}</label>
                <input
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.currency}</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.fundedBy}</label>
                <input
                  type="text"
                  value={formData.fundedBy}
                  onChange={(e) => setFormData({ ...formData, fundedBy: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.notes}</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className={`flex items-center gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Save className="w-5 h-5" />
            <span>{t.save}</span>
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
