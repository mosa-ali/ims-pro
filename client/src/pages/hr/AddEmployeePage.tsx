/**
 * ============================================================================
 * ADD EMPLOYEE PAGE - Create New Employee
 * ============================================================================
 */

import { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Save, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

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
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState('');

 const labels = {
 title: t.hr.addNewEmployee,
 subtitle: t.hr.createANewEmployeeProfile,
 
 personalInfo: t.hr.personalInformation,
 employmentInfo: t.hr.employmentInformation,
 
 fullName: t.hr.fullName,
 gender: t.hr.gender,
 nationality: t.hr.nationality,
 fullAddress: t.hr.fullAddress,
 email: t.hr.email,
 phone: t.hr.phone,
 position: t.hr.position,
 department: t.hr.department,
 supervisor: t.hr.supervisor,
 hireDate: t.hr.hireDate,
 contractType: t.hr.contractType,
 contractEndDate: t.hr.contractEndDate,
 
 male: t.hr.male,
 female: t.hr.female,
 fullTime: t.hr.fulltime,
 partTime: t.hr.parttime,
 consultant: t.hr.consultant,
 
 cancel: t.hr.cancel,
 save: t.hr.createEmployee,
 saving: t.hr.creating,
 
 required: t.hr.pleaseFillAllRequiredFields,
 success: t.hr.employeeCreatedSuccessfully,
 };

 const createEmployeeMutation = trpc.hrEmployees.create.useMutation({
 onSuccess: () => {
 alert(labels.success);
 navigate('/organization/hr/employees-profiles/directory');
 },
 onError: (err) => {
 setError(`Failed to create employee: ${err.message}`);
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
 setError(labels.required);
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

 // Use organization context for proper data isolation
 if (!currentOrganizationId || !currentOperatingUnitId) {
 setError(t.hr.organizationContextNotAvailable);
 setSaving(false);
 return;
 }
 
 const organizationId = currentOrganizationId;
 const operatingUnitId = currentOperatingUnitId;

 try {
 await createEmployeeMutation.mutateAsync({
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
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Button */}
 <BackButton onClick={() => navigate('/organization/hr/employees-profiles/directory')} iconOnly />

 {/* Header */}
 <div className={'text-start'}>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-gray-600 mt-1">{labels.subtitle}</p>
 </div>

 {/* Form */}
 <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
 <div className="space-y-8">
 {/* Personal Information */}
 <div>
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {labels.personalInfo}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {labels.fullName} *
 </label>
 <input
 type="text"
 value={formData.fullName || ''}
 onChange={(e) => handleChange('fullName', e.target.value)}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 required
 />
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {labels.gender}
 </label>
 <select
 value={formData.gender || 'male'}
 onChange={(e) => handleChange('gender', e.target.value)}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 >
 <option value="male">{labels.male}</option>
 <option value="female">{labels.female}</option>
 </select>
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {labels.nationality}
 </label>
 <input
 type="text"
 value={formData.nationality || ''}
 onChange={(e) => handleChange('nationality', e.target.value)}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 />
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {labels.phone}
 </label>
 <input
 type="tel"
 value={formData.phone || ''}
 onChange={(e) => handleChange('phone', e.target.value)}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 />
 </div>

 <div className="md:col-span-2">
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {labels.email} *
 </label>
 <input
 type="email"
 value={formData.email || ''}
 onChange={(e) => handleChange('email', e.target.value)}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 required
 />
 </div>

 <div className="md:col-span-2">
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {labels.fullAddress}
 </label>
 <textarea
 value={formData.fullAddress || ''}
 onChange={(e) => handleChange('fullAddress', e.target.value)}
 rows={2}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 />
 </div>
 </div>
 </div>

 {/* Employment Information */}
 <div>
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {labels.employmentInfo}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {labels.position} *
 </label>
 <input
 type="text"
 value={formData.position || ''}
 onChange={(e) => handleChange('position', e.target.value)}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 required
 />
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {labels.department} *
 </label>
 <input
 type="text"
 value={formData.department || ''}
 onChange={(e) => handleChange('department', e.target.value)}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 required
 />
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {labels.supervisor}
 </label>
 <input
 type="text"
 value={formData.supervisor || ''}
 onChange={(e) => handleChange('supervisor', e.target.value)}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 />
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {labels.hireDate}
 </label>
 <input
 type="date"
 value={formData.hireDate || ''}
 onChange={(e) => handleChange('hireDate', e.target.value)}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 />
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {labels.contractType}
 </label>
 <select
 value={formData.contractType || 'full_time'}
 onChange={(e) => handleChange('contractType', e.target.value)}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 >
 <option value="full_time">{labels.fullTime}</option>
 <option value="part_time">{labels.partTime}</option>
 <option value="consultant">{labels.consultant}</option>
 </select>
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {labels.contractEndDate}
 </label>
 <input
 type="date"
 value={formData.contractEndDate || ''}
 onChange={(e) => handleChange('contractEndDate', e.target.value)}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 />
 </div>
 </div>
 </div>

 {/* Error Message */}
 {error && (
 <div className={`flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg`}>
 <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
 <p className="text-sm text-red-700">{error}</p>
 </div>
 )}
 </div>

 {/* Footer Actions */}
 <div className={`flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200`}>
 <button
 type="button"
 onClick={() => navigate('/organization/hr/employees-profiles/directory')}
 disabled={saving}
 className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
 >
 {labels.cancel}
 </button>
 <button
 type="submit"
 disabled={saving}
 className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50`}
 >
 <Save className="w-4 h-4" />
 <span>{saving ? labels.saving : labels.save}</span>
 </button>
 </div>
 </form>
 </div>
 );
}
