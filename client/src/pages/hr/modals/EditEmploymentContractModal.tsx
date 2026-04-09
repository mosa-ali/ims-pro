/**
 * ============================================================================
 * EDIT EMPLOYMENT & CONTRACT MODAL
 * ============================================================================
 * DEDICATED FORM - Updates ONLY contract and employment data
 * Does NOT touch: Identity, Salary, Performance, Exit data
 * ============================================================================
 */

import { useState } from 'react';
import { X, Save, Upload, Briefcase } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { StaffMember } from '../types/hrTypes';
import { staffService } from '@/app/services/hrService';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 employee: StaffMember;
 onClose: () => void;
 onSave: (updatedEmployee: StaffMember) => void;
}

export function EditEmploymentContractModal({
 employee, onClose, onSave }: Props) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 
 // ONLY contract & employment fields (NO identity, salary, etc.)
 const [formData, setFormData] = useState({
 contractType: employee.contractType || 'Fixed-Term',
 contractStartDate: employee.contractStartDate || '',
 contractEndDate: employee.contractEndDate || '',
 contractStatus: employee.status || 'Active',
 position: employee.position || '',
 department: employee.department || '',
 projects: Array.isArray(employee.projects) ? employee.projects.join(', ') : (employee.projects || '')
 });

 const [errors, setErrors] = useState<Record<string, string>>({});

 const localT = {
 title: t.hrModals.editEmploymentContract,
 subtitle: t.hrModals.updateContractAndEmploymentInformation,
 
 // Read-only
 readOnlySection: t.hrModals.employeeInformation,
 staffId: t.hrModals.staffId,
 fullName: t.hrModals.fullName,
 hireDate: t.hrModals.originalHireDate,
 
 // Contract Information
 contractSection: t.hrModals.contractInformation,
 contractType: t.hrModals.contractType,
 contractStartDate: t.hrModals.contractStartDate,
 contractEndDate: t.hrModals.contractEndDate,
 contractStatus: t.hrModals.contractStatus,
 
 // Job Details
 jobSection: t.hrModals.jobDetails,
 position: t.hrModals.jobTitlePosition,
 department: t.hrModals.department,
 project: t.hrModals.projects,
 
 // Documents
 documentsSection: t.hrModals.contractDocuments,
 signedContract: t.hrModals.signedContract,
 amendments: t.hrModals.contractAmendments,
 upload: t.hrModals.upload,
 
 // Options
 fullTime: t.hrModals.fulltime,
 partTime: t.hrModals.parttime,
 consultant: t.hrModals.consultant,
 intern: t.hrModals.intern,
 
 permanent: t.hrModals.permanent,
 fixedTerm: t.hrModals.fixedTerm,
 probation: t.hrModals.probation,
 
 statusActive: t.hrModals.active,
 statusExpired: t.hrModals.expired,
 statusRenewed: t.hrModals.renewed,
 
 // Actions
 cancel: t.hrModals.cancel,
 save: t.hrModals.saveChanges,
 required: t.hrModals.thisFieldIsRequired
 };

 const validateForm = (): boolean => {
 const newErrors: Record<string, string> = {};
 
 if (!formData.position.trim()) {
 newErrors.position = t.required;
 }
 
 if (!formData.department.trim()) {
 newErrors.department = t.required;
 }
 
 if (!formData.contractStartDate) {
 newErrors.contractStartDate = t.required;
 }
 
 setErrors(newErrors);
 return Object.keys(newErrors).length === 0;
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 
 if (!validateForm()) {
 return;
 }
 
 // Update ONLY contract & employment fields
 const updatedEmployee: StaffMember = {
 ...employee,
 contractType: formData.contractType as 'Fixed-Term' | 'Short-Term' | 'Consultancy' | 'Volunteer' | 'Daily Worker',
 contractStartDate: formData.contractStartDate,
 contractEndDate: formData.contractEndDate,
 position: formData.position.trim(),
 department: formData.department.trim(),
 projects: formData.projects.split(',').map(p => p.trim()).filter(p => p),
 updatedAt: new Date().toISOString()
 };
 
 // Save to localStorage
 staffService.update(employee.id, updatedEmployee);
 
 onSave(updatedEmployee);
 };

 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.hrModals.en, {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 });
 };

 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose} dir={isRTL ? 'rtl' : 'ltr'}>
 <div 
 className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
 onClick={(e) => e.stopPropagation()}
 
 >
 {/* Header */}
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-green-50">
 <div>
 <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
 <Briefcase className="w-5 h-5 text-green-600" />
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
 {/* Read-Only Employee Info */}
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
 <label className="block text-xs font-medium text-gray-500 mb-1">{t.fullName}</label>
 <div className="text-sm text-gray-900">{employee.fullName}</div>
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1">{t.hireDate}</label>
 <div className="text-sm text-gray-900">{formatDate(employee.hireDate)}</div>
 </div>
 </div>
 </div>

 {/* Contract Information */}
 <div>
 <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
 {t.contractSection}
 </h3>
 
 <div className="space-y-4">
 {/* Row 1: Contract Type, Employment Type */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.contractType} <span className="text-red-500">*</span>
 </label>
 <select
 required
 value={formData.contractType}
 onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
 >
 <option value="Fixed-Term">Fixed-Term</option>
 <option value="Short-Term">Short-Term</option>
 <option value="Consultancy">Consultancy</option>
 <option value="Volunteer">Volunteer</option>
 <option value="Daily Worker">Daily Worker</option>
 </select>
 </div>
 </div>

 {/* Row 2: Contract Dates */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.contractStartDate} <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 required
 value={formData.contractStartDate}
 onChange={(e) => setFormData({ ...formData, contractStartDate: e.target.value })}
 className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${ errors.contractStartDate ? 'border-red-500' : 'border-gray-300' }`}
 />
 {errors.contractStartDate && <p className="text-xs text-red-500 mt-1">{errors.contractStartDate}</p>}
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.contractEndDate}
 </label>
 <input
 type="date"
 value={formData.contractEndDate}
 onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
 />
 </div>
 </div>

 {/* Row 3: Contract Status */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.contractStatus} <span className="text-red-500">*</span>
 </label>
 <select
 required
 value={formData.contractStatus}
 onChange={(e) => setFormData({ ...formData, contractStatus: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
 >
 <option value="Active">{t.statusActive}</option>
 <option value="Expired">{t.statusExpired}</option>
 <option value="Renewed">{t.statusRenewed}</option>
 </select>
 </div>
 </div>
 </div>

 {/* Job Details */}
 <div>
 <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
 {t.jobSection}
 </h3>
 
 <div className="space-y-4">
 {/* Position */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.position} <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 required
 value={formData.position}
 onChange={(e) => setFormData({ ...formData, position: e.target.value })}
 className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${ errors.position ? 'border-red-500' : 'border-gray-300' }`}
 placeholder={t.placeholders.eGProgramManagerFieldOfficer}
 />
 {errors.position && <p className="text-xs text-red-500 mt-1">{errors.position}</p>}
 </div>

 {/* Department */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.department} <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 required
 value={formData.department}
 onChange={(e) => setFormData({ ...formData, department: e.target.value })}
 className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${ errors.department ? 'border-red-500' : 'border-gray-300' }`}
 placeholder={t.placeholders.eGProgramsOperationsFinance}
 />
 {errors.department && <p className="text-xs text-red-500 mt-1">{errors.department}</p>}
 </div>

 {/* Project */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {t.project}
 </label>
 <input
 type="text"
 value={formData.projects}
 onChange={(e) => setFormData({ ...formData, projects: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
 placeholder={t.hrModals.commaseparatedIfMultiple}
 />
 </div>
 </div>
 </div>

 {/* Contract Documents */}
 <div>
 <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
 {t.documentsSection}
 </h3>
 <div className="space-y-3">
 <div className="flex items-center gap-3">
 <div className="flex-1">
 <label className="text-sm text-gray-700">{t.signedContract}</label>
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
 <label className="text-sm text-gray-700">{t.amendments}</label>
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
 className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
 >
 <Save className="w-4 h-4" />
 {t.save}
 </button>
 </div>
 </div>
 </div>
 );
}