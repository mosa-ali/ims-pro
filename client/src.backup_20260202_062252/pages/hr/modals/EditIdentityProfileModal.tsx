/**
 * ============================================================================
 * EDIT IDENTITY & PERSONAL PROFILE MODAL
 * ============================================================================
 * DEDICATED FORM - Updates ONLY identity and personal data
 * Does NOT touch: Contract, Salary, Performance, Exit data
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { X, Save, Upload, User } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { StaffMember } from '../types/hrTypes';

interface Props {
  employee: StaffMember;
  onClose: () => void;
  onSave: (updatedEmployee: StaffMember) => void;
}

export function EditIdentityProfileModal({ employee, onClose, onSave }: Props) {
  const { language, isRTL } = useLanguage();
  
  // ONLY identity & personal fields (NO contract, salary, etc.)
  const [formData, setFormData] = useState({
    fullName: employee.fullName || '',
    gender: employee.gender || 'Male',
    nationality: employee.nationality || '',
    dateOfBirth: employee.dateOfBirth || '',
    phone: employee.phone || '',
    email: employee.email || '',
    address: employee.address || '',
    supervisor: employee.supervisor || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const t = {
    title: language === 'en' ? 'Edit Identity & Personal Profile' : 'تعديل الهوية والبيانات الشخصية',
    subtitle: language === 'en' ? 'Update core employee information' : 'تحديث المعلومات الأساسية للموظف',
    
    // Read-only fields labels
    readOnlySection: language === 'en' ? 'Read-Only Information' : 'معلومات للقراءة فقط',
    staffId: language === 'en' ? 'Staff ID' : 'رقم الموظف',
    hireDate: language === 'en' ? 'Hire Date' : 'تاريخ التعيين',
    status: language === 'en' ? 'Status' : 'الحالة',
    
    // Editable fields
    editableSection: language === 'en' ? 'Editable Information' : 'معلومات قابلة للتعديل',
    fullName: language === 'en' ? 'Full Name' : 'الاسم الكامل',
    gender: language === 'en' ? 'Gender' : 'الجنس',
    male: language === 'en' ? 'Male' : 'ذكر',
    female: language === 'en' ? 'Female' : 'أنثى',
    nationality: language === 'en' ? 'Nationality' : 'الجنسية',
    dateOfBirth: language === 'en' ? 'Date of Birth' : 'تاريخ الميلاد',
    phone: language === 'en' ? 'Phone Number' : 'رقم الهاتف',
    email: language === 'en' ? 'Email Address' : 'البريد الإلكتروني',
    address: language === 'en' ? 'Full Address' : 'العنوان الكامل',
    supervisor: language === 'en' ? 'Supervisor' : 'المشرف',
    
    // Uploads
    uploadsSection: language === 'en' ? 'Document Uploads' : 'رفع المستندات',
    identification: language === 'en' ? 'Identification Copy' : 'نسخة الهوية',
    cv: language === 'en' ? 'CV / Resume' : 'السيرة الذاتية',
    upload: language === 'en' ? 'Upload' : 'رفع',
    
    // Actions
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    save: language === 'en' ? 'Save Changes' : 'حفظ التغييرات',
    required: language === 'en' ? 'This field is required' : 'هذا الحقل مطلوب',
    invalidEmail: language === 'en' ? 'Invalid email format' : 'صيغة البريد الإلكتروني غير صحيحة'
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = t.required;
    }
    
    if (!formData.email.trim()) {
      newErrors.email = t.required;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t.invalidEmail;
    }
    
    if (!formData.nationality.trim()) {
      newErrors.nationality = t.required;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Update ONLY identity & personal fields
    const updatedEmployee: StaffMember = {
      ...employee,
      fullName: formData.fullName.trim(),
      gender: formData.gender as 'Male' | 'Female',
      nationality: formData.nationality.trim(),
      dateOfBirth: formData.dateOfBirth,
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
      supervisor: formData.supervisor.trim(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to localStorage using the correct method
    staffService.update(employee.id, updatedEmployee);
    
    onSave(updatedEmployee);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, { en: string; ar: string }> = {
      active: { en: 'Active', ar: 'نشط' },
      archived: { en: 'Archived', ar: 'مؤرشف' },
      exited: { en: 'Exited', ar: 'خرج' }
    };
    return statusMap[status]?.[language] || status;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-blue-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              {t.title}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Read-Only Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
                {t.readOnlySection}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.staffId}</label>
                  <div className="text-sm font-mono font-bold text-gray-900">{employee.staffId}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.hireDate}</label>
                  <div className="text-sm text-gray-900">{formatDate(employee.hireDate)}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.status}</label>
                  <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    employee.status === 'active' ? 'bg-green-100 text-green-800' :
                    employee.status === 'archived' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {getStatusLabel(employee.status)}
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
                {t.editableSection}
              </h3>
              
              <div className="space-y-4">
                {/* Row 1: Full Name, Gender */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.fullName} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.fullName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.gender} <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Male">{t.male}</option>
                      <option value="Female">{t.female}</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Nationality, Date of Birth */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.nationality} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.nationality ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.nationality && <p className="text-xs text-red-500 mt-1">{errors.nationality}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.dateOfBirth}
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Row 3: Phone, Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.phone}
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.email} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                  </div>
                </div>

                {/* Row 4: Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.address}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Row 5: Supervisor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.supervisor}
                  </label>
                  <input
                    type="text"
                    value={formData.supervisor}
                    onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={language === 'en' ? 'Name of direct supervisor' : 'اسم المشرف المباشر'}
                  />
                </div>
              </div>
            </div>

            {/* Document Uploads Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
                {t.uploadsSection}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-sm text-gray-700">{t.identification}</label>
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Upload className="w-4 h-4" />
                    {t.upload}
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-sm text-gray-700">{t.cv}</label>
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Upload className="w-4 h-4" />
                    {t.upload}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}