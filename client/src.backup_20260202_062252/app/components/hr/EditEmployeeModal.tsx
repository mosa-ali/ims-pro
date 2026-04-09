/**
 * ============================================================================
 * EDIT EMPLOYEE MODAL - Identity & Personal Information
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { StaffMember } from '@/app/services/hrService';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: StaffMember;
  onSave: (updatedEmployee: Partial<StaffMember>) => Promise<void>;
}

export function EditEmployeeModal({ isOpen, onClose, employee, onSave }: EditEmployeeModalProps) {
  const { language, isRTL } = useLanguage();
  const [formData, setFormData] = useState<Partial<StaffMember>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && employee) {
      setFormData({
        fullName: employee.fullName,
        gender: employee.gender,
        nationality: employee.nationality,
        fullAddress: employee.fullAddress,
        email: employee.email,
        phone: employee.phone,
        position: employee.position,
        department: employee.department,
        supervisor: employee.supervisor,
        hireDate: employee.hireDate,
        contractType: employee.contractType,
        contractEndDate: employee.contractEndDate,
      });
    }
  }, [isOpen, employee]);

  const t = {
    title: language === 'en' ? 'Edit Employee Information' : 'تحرير معلومات الموظف',
    close: language === 'en' ? 'Close' : 'إغلاق',
    save: language === 'en' ? 'Save Changes' : 'حفظ التغييرات',
    saving: language === 'en' ? 'Saving...' : 'جاري الحفظ...',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    
    // Fields
    fullName: language === 'en' ? 'Full Name' : 'الاسم الكامل',
    gender: language === 'en' ? 'Gender' : 'الجنس',
    nationality: language === 'en' ? 'Nationality' : 'الجنسية',
    fullAddress: language === 'en' ? 'Full Address' : 'العنوان الكامل',
    email: language === 'en' ? 'Email' : 'البريد الإلكتروني',
    phone: language === 'en' ? 'Phone' : 'الهاتف',
    position: language === 'en' ? 'Position' : 'المنصب',
    department: language === 'en' ? 'Department' : 'القسم',
    supervisor: language === 'en' ? 'Supervisor' : 'المشرف',
    hireDate: language === 'en' ? 'Hire Date' : 'تاريخ التعيين',
    contractType: language === 'en' ? 'Contract Type' : 'نوع العقد',
    contractEndDate: language === 'en' ? 'Contract End Date' : 'تاريخ انتهاء العقد',
    
    // Options
    male: language === 'en' ? 'Male' : 'ذكر',
    female: language === 'en' ? 'Female' : 'أنثى',
    fullTime: language === 'en' ? 'Full-time' : 'دوام كامل',
    partTime: language === 'en' ? 'Part-time' : 'دوام جزئي',
    consultant: language === 'en' ? 'Consultant' : 'استشاري',
    
    required: language === 'en' ? 'This field is required' : 'هذا الحقل مطلوب',
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.fullName || !formData.email || !formData.position) {
      setError(t.required);
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(language === 'en' ? 'Failed to save changes' : 'فشل حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof StaffMember, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h2 className="text-lg font-semibold text-gray-900">{t.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="px-6 py-4 space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className={`text-sm font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'en' ? 'Personal Information' : 'المعلومات الشخصية'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.fullName} *
                  </label>
                  <input
                    type="text"
                    value={formData.fullName || ''}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.gender}
                  </label>
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="Male">{t.male}</option>
                    <option value="Female">{t.female}</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.nationality}
                  </label>
                  <input
                    type="text"
                    value={formData.nationality || ''}
                    onChange={(e) => handleChange('nationality', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.phone}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.email} *
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.fullAddress}
                  </label>
                  <textarea
                    value={formData.fullAddress || ''}
                    onChange={(e) => handleChange('fullAddress', e.target.value)}
                    rows={2}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
              </div>
            </div>

            {/* Employment Information */}
            <div>
              <h3 className={`text-sm font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'en' ? 'Employment Information' : 'معلومات التوظيف'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.position} *
                  </label>
                  <input
                    type="text"
                    value={formData.position || ''}
                    onChange={(e) => handleChange('position', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.department}
                  </label>
                  <input
                    type="text"
                    value={formData.department || ''}
                    onChange={(e) => handleChange('department', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.supervisor}
                  </label>
                  <input
                    type="text"
                    value={formData.supervisor || ''}
                    onChange={(e) => handleChange('supervisor', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.hireDate}
                  </label>
                  <input
                    type="date"
                    value={formData.hireDate || ''}
                    onChange={(e) => handleChange('hireDate', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.contractType}
                  </label>
                  <select
                    value={formData.contractType || ''}
                    onChange={(e) => handleChange('contractType', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="Full-time">{t.fullTime}</option>
                    <option value="Part-time">{t.partTime}</option>
                    <option value="Consultant">{t.consultant}</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.contractEndDate}
                  </label>
                  <input
                    type="date"
                    value={formData.contractEndDate || ''}
                    onChange={(e) => handleChange('contractEndDate', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className={`flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Save className="w-4 h-4" />
              <span>{saving ? t.saving : t.save}</span>
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}