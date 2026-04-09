/**
 * ============================================================================
 * EDIT EMPLOYEE MODAL
 * ============================================================================
 * Modal for editing employee basic information
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface EditEmployeeModalProps {
 employee: StaffMember;
 show: boolean;
 onClose: () => void;
 onEmployeeUpdated: (updated: StaffMember) => void;
}

export function EditEmployeeModal({
 employee, show, onClose, onEmployeeUpdated }: EditEmployeeModalProps) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const [formData, setFormData] = useState({
 fullName: employee.fullName,
 gender: employee.gender,
 nationality: employee.nationality,
 position: employee.position,
 department: employee.department,
 email: employee.email || '',
 phone: employee.phone || '',
 address: employee.address || '',
 dateOfBirth: employee.dateOfBirth || '',
 supervisor: employee.supervisor || ''
 });

 const localT = {
 title: t.hrModals.editEmployeeInformation,
 fullName: t.hrModals.fullName,
 gender: t.hrModals.gender,
 male: t.hrModals.male,
 female: t.hrModals.female,
 other: t.hrModals.other6,
 nationality: t.hrModals.nationality,
 position: t.hrModals.position,
 department: t.hrModals.department,
 email: t.hrModals.email,
 phone: t.hrModals.phone,
 address: t.hrModals.address,
 dateOfBirth: t.hrModals.dateOfBirth,
 supervisor: t.hrModals.supervisor,
 cancel: t.hrModals.cancel,
 save: t.hrModals.saveChanges
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 
 const updated = staffService.update(employee.id, formData);
 if (updated) {
 onEmployeeUpdated(updated);
 onClose();
 }
 };

 if (!show) return null;

 return (
 <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-50 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 {/* Header */}
 <div className={`flex items-center justify-between p-6 border-b border-gray-200`}>
 <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
 <button
 onClick={onClose}
 className="text-gray-400 hover:text-gray-600 transition-colors"
 >
 <X className="w-6 h-6" />
 </button>
 </div>

 {/* Form */}
 <form onSubmit={handleSubmit} className="p-6 space-y-4">
 {/* Full Name */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.fullName} *
 </label>
 <input
 type="text"
 value={formData.fullName}
 onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 required
 />
 </div>

 {/* Gender & Nationality */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.gender} *
 </label>
 <select
 value={formData.gender}
 onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 required
 >
 <option value="Male">{t.male}</option>
 <option value="Female">{t.female}</option>
 <option value="Other">{t.other}</option>
 </select>
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.nationality} *
 </label>
 <input
 type="text"
 value={formData.nationality}
 onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 required
 />
 </div>
 </div>

 {/* Position & Department */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.position} *
 </label>
 <input
 type="text"
 value={formData.position}
 onChange={(e) => setFormData({ ...formData, position: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 required
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.department} *
 </label>
 <input
 type="text"
 value={formData.department}
 onChange={(e) => setFormData({ ...formData, department: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 required
 />
 </div>
 </div>

 {/* Email & Phone */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.email}
 </label>
 <input
 type="email"
 value={formData.email}
 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.phone}
 </label>
 <input
 type="tel"
 value={formData.phone}
 onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 />
 </div>
 </div>

 {/* Date of Birth */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.dateOfBirth}
 </label>
 <input
 type="date"
 value={formData.dateOfBirth}
 onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 />
 </div>

 {/* Address */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.address}
 </label>
 <textarea
 value={formData.address}
 onChange={(e) => setFormData({ ...formData, address: e.target.value })}
 rows={3}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 />
 </div>

 {/* Supervisor */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-1 text-start`}>
 {t.supervisor}
 </label>
 <input
 type="text"
 value={formData.supervisor}
 onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-start`}
 />
 </div>

 {/* Actions */}
 <div className={`flex items-center gap-3 pt-4`}>
 <button
 type="submit"
 className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
 >
 {t.save}
 </button>
 <button
 type="button"
 onClick={onClose}
 className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
 >
 {t.cancel}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}