/**
 * ============================================================================
 * RESIGNATION FORM MODAL - Employee Exit Process
 * ============================================================================
 */

import { useState } from 'react';
import { X, Save, FileText } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { StaffMember } from '../types/hrTypes';
import { exitService, ResignationRecord } from '@/app/services/exitService';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';

interface Props {
  employee: StaffMember;
  onClose: () => void;
  onSave: (record: ResignationRecord) => void;
}

export function ResignationFormModal({ employee, onClose, onSave }: Props) {
  const { language, isRTL } = useLanguage();
  
  const [formData, setFormData] = useState({
    resignationDate: new Date().toISOString().split('T')[0],
    lastWorkingDay: '',
    reason: '',
    noticePeriod: 30,
    acknowledgedBy: '',
    acknowledgedByRole: '',
    notes: ''
  });

  const t = {
    title: language === 'en' ? 'Resignation Letter' : 'خطاب الاستقالة',
    subtitle: language === 'en' ? 'Official Employee Resignation' : 'استقالة الموظف الرسمية',
    
    employeeInfo: language === 'en' ? 'Employee Information' : 'معلومات الموظف',
    staffId: language === 'en' ? 'Staff ID' : 'رقم الموظف',
    fullName: language === 'en' ? 'Full Name' : 'الاسم الكامل',
    position: language === 'en' ? 'Position' : 'المنصب',
    department: language === 'en' ? 'Department' : 'القسم',
    
    resignationDate: language === 'en' ? 'Resignation Date' : 'تاريخ الاستقالة',
    lastWorkingDay: language === 'en' ? 'Last Working Day' : 'آخر يوم عمل',
    reason: language === 'en' ? 'Reason for Resignation' : 'سبب الاستقالة',
    noticePeriod: language === 'en' ? 'Notice Period (Days)' : 'فترة الإشعار (أيام)',
    
    acknowledgedBy: language === 'en' ? 'Acknowledged By' : 'تم الإقرار من قبل',
    acknowledgedByRole: language === 'en' ? 'Role / Position' : 'الدور / المنصب',
    
    notes: language === 'en' ? 'Additional Notes' : 'ملاحظات إضافية',
    
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    save: language === 'en' ? 'Save & Lock' : 'حفظ وقفل',
    required: language === 'en' ? 'Please fill in all required fields' : 'يرجى ملء جميع الحقول المطلوبة',
    success: language === 'en' ? 'Resignation submitted successfully. Exit process started.' : 'تم تقديم الاستقالة بنجاح. بدأت عملية الخروج.',
    warning: language === 'en' 
      ? 'Submitting resignation will start the exit process. This cannot be undone.' 
      : 'تقديم الاستقالة سيبدأ عملية الخروج. لا يمكن التراجع عن ذلك.'
  };

  const handleSave = () => {
    if (!formData.lastWorkingDay || !formData.reason || !formData.acknowledgedBy || !formData.acknowledgedByRole) {
      alert(t.required);
      return;
    }
    
    if (!confirm(t.warning)) return;
    
    const record = exitService.addResignation({
      staffId: employee.staffId,
      employeeName: employee.fullName,
      position: employee.position,
      department: employee.department,
      
      resignationDate: formData.resignationDate,
      lastWorkingDay: formData.lastWorkingDay,
      reason: formData.reason,
      noticePeriod: formData.noticePeriod,
      acknowledgedBy: formData.acknowledgedBy,
      acknowledgedByRole: formData.acknowledgedByRole,
      acknowledgementDate: new Date().toISOString(),
      notes: formData.notes || undefined,
      
      createdBy: 'Current User'
    });
    
    alert(t.success);
    onSave(record);
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-orange-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
              <p className="text-sm text-gray-500">{t.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">{t.employeeInfo}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-600">{t.staffId}:</span> <span className="font-medium">{employee.staffId}</span></div>
                <div><span className="text-gray-600">{t.fullName}:</span> <span className="font-medium">{employee.fullName}</span></div>
                <div><span className="text-gray-600">{t.position}:</span> <span className="font-medium">{employee.position}</span></div>
                <div><span className="text-gray-600">{t.department}:</span> <span className="font-medium">{employee.department}</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.resignationDate} *</label>
                <input
                  type="date"
                  value={formData.resignationDate}
                  onChange={(e) => setFormData({ ...formData, resignationDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.lastWorkingDay} *</label>
                <input
                  type="date"
                  value={formData.lastWorkingDay}
                  onChange={(e) => setFormData({ ...formData, lastWorkingDay: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.noticePeriod} *</label>
              <input
                type="number"
                value={formData.noticePeriod}
                onChange={(e) => setFormData({ ...formData, noticePeriod: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.reason} *</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.acknowledgedBy} *</label>
                <input
                  type="text"
                  value={formData.acknowledgedBy}
                  onChange={(e) => setFormData({ ...formData, acknowledgedBy: e.target.value })}
                  placeholder={language === 'en' ? 'HR / Supervisor Name' : 'اسم الموارد البشرية / المشرف'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.acknowledgedByRole} *</label>
                <input
                  type="text"
                  value={formData.acknowledgedByRole}
                  onChange={(e) => setFormData({ ...formData, acknowledgedByRole: e.target.value })}
                  placeholder={language === 'en' ? 'e.g., HR Manager' : 'مثال: مدير الموارد البشرية'}
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
            className={`flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Save className="w-5 h-5" />
            <span>{t.save}</span>
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
