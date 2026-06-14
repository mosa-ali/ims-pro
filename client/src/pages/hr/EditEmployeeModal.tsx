/**
 * ============================================================================
 * EDIT EMPLOYEE MODAL - Identity & Personal Information
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { StaffMember } from '@/services/hrService';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { useTranslation } from '@/i18n/useTranslation';

interface EditEmployeeModalProps {
 isOpen: boolean;
 onClose: () => void;
 employee: StaffMember;
 onSave: (updatedEmployee: Partial<StaffMember>) => Promise<void>;
}

export function EditEmployeeModal({
 isOpen, onClose, employee, onSave }: EditEmployeeModalProps) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const [formData, setFormData] = useState<Partial<StaffMember>>({});
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState('');

 useEffect(() => {
 if (isOpen && employee) {
 setFormData({
id: String(employee.id),
 fullName: employee.fullName,
 gender: employee.gender,
 nationality: employee.nationality,
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

 const localT = {
 title: t.hr.editEmployeeInformation,
 close: t.hr.close,
 save: t.hr.saveChanges,
 saving: t.hr.saving,
 cancel: t.hr.cancel,
 
 // Fields
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
 
 // Options
 male: t.hr.male,
 female: t.hr.female,
 fullTime: t.hr.fulltime,
 partTime: t.hr.parttime,
 consultant: t.hr.consultant,
 
 required: t.hr.thisFieldIsRequired,
 };

 if (!isOpen) return null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 
 // Basic validation
 if (!formData.fullName || !formData.email || !formData.position) {
 setError(localT.required);
 return;
 }

 setSaving(true);
 setError('');

 try {
 await onSave(formData);
 onClose();
 } catch (err) {
 setError(t.hr.failedToSaveChanges);
 } finally {
 setSaving(false);
 }
 };

 const handleChange = (field: keyof StaffMember, value: any) => {
 setFormData(prev => ({ ...prev, [field]: value }));
 };

 return (
 <ModalOverlay onClose={onClose}>
 <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
 {/* Header */}
 <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-200`}>
 <h2 className="text-lg font-semibold text-gray-900">{localT.title}</h2>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Form */}
 <form dir={isRTL ? 'rtl' : 'ltr'} onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
 <div className="px-6 py-4 space-y-6">
 {/* Personal Information */}
 <div>
 <h3 className={`text-sm font-semibold text-gray-900 mb-4 text-start`}>
 {t.hr.personalInformation}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {localT.fullName} *
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
 {localT.gender}
 </label>
 <select
 value={formData.gender || ''}
 onChange={(e) => handleChange('gender', e.target.value)}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 >
 <option value="Male">{localT.male}</option>
 <option value="Female">{localT.female}</option>
 </select>
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {localT.nationality}
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
 {localT.phone}
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
 {localT.email} *
 </label>
 <input
 type="email"
 value={formData.email || ''}
 onChange={(e) => handleChange('email', e.target.value)}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 required
 />
 </div>
 </div>
 </div>

 {/* Employment Information */}
 <div>
 <h3 className={`text-sm font-semibold text-gray-900 mb-4 text-start`}>
 {t.hr.employmentInformation}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {localT.position} *
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
 {localT.department}
 </label>
 <input
 type="text"
 value={formData.department || ''}
 onChange={(e) => handleChange('department', e.target.value)}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 />
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {localT.supervisor}
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
 {localT.hireDate}
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
 {localT.contractType}
 </label>
 <select
 value={formData.contractType || ''}
 onChange={(e) => handleChange('contractType', e.target.value)}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 >
 <option value="Full-time">{localT.fullTime}</option>
 <option value="Part-time">{localT.partTime}</option>
 <option value="Consultant">{localT.consultant}</option>
 </select>
 </div>

 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {localT.contractEndDate}
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

 {/* Footer */}
 <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200`}>
 <button
 type="button"
 onClick={onClose}
 disabled={saving}
 className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
 >
 {localT.cancel}
 </button>
 <button
 type="submit"
 disabled={saving}
 className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50`}
 >
 <Save className="w-4 h-4" />
 <span>{saving ? localT.saving : localT.save}</span>
 </button>
 </div>
 </form>
 </div>
 </ModalOverlay>
 );
}