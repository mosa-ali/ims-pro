/**
 * ============================================================================
 * ADD EMPLOYEE PAGE - Create New Employee
 * ============================================================================
 */

import { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';

interface FormData {
  fullName: string;
  gender: 'male' | 'female' | 'other';
  nationality: string;
  fullAddress: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  supervisor: string;
  hireDate: string;
  contractType: string;
  contractEndDate: string;
}

export function AddEmployeePage() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const t = {
    title: language === 'en' ? 'Add New Employee' : 'إضافة موظف جديد',
    subtitle: language === 'en' ? 'Create a new employee profile' : 'إنشاء ملف موظف جديد',
    
    personalInfo: language === 'en' ? 'Personal Information' : 'المعلومات الشخصية',
    employmentInfo: language === 'en' ? 'Employment Information' : 'معلومات التوظيف',
    
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
    
    male: language === 'en' ? 'Male' : 'ذكر',
    female: language === 'en' ? 'Female' : 'أنثى',
    fullTime: language === 'en' ? 'Full-time' : 'دوام كامل',
    partTime: language === 'en' ? 'Part-time' : 'دوام جزئي',
    consultant: language === 'en' ? 'Consultant' : 'استشاري',
    
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    save: language === 'en' ? 'Create Employee' : 'إنشاء الموظف',
    saving: language === 'en' ? 'Creating...' : 'جاري الإنشاء...',
    
    required: language === 'en' ? 'Please fill all required fields' : 'يرجى ملء جميع الحقول المطلوبة',
    success: language === 'en' ? 'Employee created successfully' : 'تم إنشاء الموظف بنجاح',
  };

  const createEmployeeMutation = trpc.hrEmployees.create.useMutation({
    onSuccess: () => {
      alert(t.success);
      navigate('/organization/hr/employees-profiles/directory');
    },
    onError: (err) => {
      setError(language === 'en' ? `Failed to create employee: ${err.message}` : 'فشل إنشاء الموظف');
      setSaving(false);
    }
  });

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    gender: 'male',
    nationality: '',
    fullAddress: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    supervisor: '',
    hireDate: new Date().toISOString().split('T')[0],
    contractType: 'full_time',
    contractEndDate: '',
  });

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.fullName || !formData.email || !formData.position || !formData.department) {
      setError(t.required);
      return;
    }

    setSaving(true);

    // Parse full name into first and last name
    const nameParts = formData.fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Generate employee code
    const timestamp = Date.now();
    const employeeCode = `STF-${timestamp.toString().slice(-6)}`;

    // Map contract type to employment type
    let employmentType: 'full_time' | 'part_time' | 'contract' | 'consultant' | 'intern' = 'full_time';
    if (formData.contractType === 'part_time') employmentType = 'part_time';
    if (formData.contractType === 'consultant') employmentType = 'consultant';

    // Use user's organizationId and operatingUnitId from auth (these are numeric)
    const organizationId = user?.organizationId || 30001;
    const operatingUnitId = user?.operatingUnitId || 30001;

    try {
      await createEmployeeMutation.mutateAsync({
        organizationId,
        operatingUnitId,
        employeeCode,
        firstName,
        lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        gender: formData.gender,
        nationality: formData.nationality || undefined,
        position: formData.position || undefined,
        department: formData.department || undefined,
        employmentType,
        hireDate: formData.hireDate || undefined,
        contractEndDate: formData.contractEndDate || undefined,
        address: formData.fullAddress || undefined,
        status: 'active',
      });
    } catch (err) {
      // Error handled in mutation onError
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/organization/hr/employees-profiles/directory')}
        className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
      </button>

      {/* Header */}
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-600 mt-1">{t.subtitle}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-8">
          {/* Personal Information */}
          <div>
            <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.personalInfo}
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
                  value={formData.gender || 'male'}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <option value="male">{t.male}</option>
                  <option value="female">{t.female}</option>
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
            <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.employmentInfo}
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
                  {t.department} *
                </label>
                <input
                  type="text"
                  value={formData.department || ''}
                  onChange={(e) => handleChange('department', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  required
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
                  value={formData.contractType || 'full_time'}
                  onChange={(e) => handleChange('contractType', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <option value="full_time">{t.fullTime}</option>
                  <option value="part_time">{t.partTime}</option>
                  <option value="consultant">{t.consultant}</option>
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

        {/* Footer Actions */}
        <div className={`flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            type="button"
            onClick={() => navigate('/organization/hr/employees-profiles/directory')}
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
  );
}
