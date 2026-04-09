/**
 * ============================================================================
 * EDIT STAFF MODAL - 5 Tabs for Complete Staff Profile
 * ============================================================================
 */

import { useState } from 'react';
import { X, Save, User, Briefcase, FolderKanban, CreditCard, FileText } from 'lucide-react';
import { StaffMember, staffService } from '@/app/services/hrService';
import { salaryScaleService } from '@/app/services/salaryScaleService';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface EditStaffModalProps {
 employee?: StaffMember;
 staffMember?: StaffMember;
 onClose: () => void;
 onSave: (updated: StaffMember) => void;
}

export function EditStaffModal({
 employee, staffMember, onClose, onSave }: EditStaffModalProps) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const staff = employee || staffMember;
 
 if (!staff) {
 return null;
 }
 const [activeTab, setActiveTab] = useState<number>(0);
 const [formData, setFormData] = useState<StaffMember>({ ...staff });

 // Load grades from salary scale service
 const grades = salaryScaleService.getAllGrades();
 const selectedGrade = grades.find(g => g.grade === formData.grade);

 // Handle grade change
 const handleGradeChange = (newGrade: string) => {
 const grade = grades.find(g => g.grade === newGrade);
 setFormData({
 ...formData,
 grade: newGrade,
 step: grade?.steps[0] || 'Step 1'
 });
 };

 const localT = {
 // Modal title
 editStaff: t.hrStaff.editStaffMember,
 
 // Tabs
 personalInfo: t.hrStaff.personalInformation,
 employmentInfo: t.hrStaff.employmentInformation,
 projectAssignment: t.hrStaff.projectAssignment,
 bankPayment: t.hrStaff.bankPayment,
 documents: t.hrStaff.documents,
 
 // Personal Info fields
 staffId: t.hrStaff.staffId,
 fullName: t.hrStaff.fullName,
 gender: t.hrStaff.gender,
 male: t.hrStaff.male,
 female: t.hrStaff.female,
 other: t.hrStaff.other,
 nationality: t.hrStaff.nationality,
 dateOfBirth: t.hrStaff.dateOfBirth,
 phone: t.hrStaff.phoneNumber,
 email: t.hrStaff.emailAddress,
 
 // Employment Info fields
 position: t.hrStaff.position,
 department: t.hrStaff.department,
 grade: t.hrStaff.grade,
 step: t.hrStaff.step,
 salaryRange: t.hrStaff.salaryRange,
 contractType: t.hrStaff.contractType,
 fixedTerm: t.hrStaff.fixedterm,
 shortTerm: t.hrStaff.shortterm,
 consultancy: t.hrStaff.consultancy,
 volunteer: t.hrStaff.volunteer,
 dailyWorker: t.hrStaff.dailyWorker,
 status: t.hrStaff.status,
 // ✅ CANONICAL THREE-STATUS MODEL (LOCKED)
 active: t.hrStaff.active,
 archived: t.hrStaff.archived,
 exited: t.hrStaff.exited,
 hireDate: t.hrStaff.hireDate,
 contractStartDate: t.hrStaff.contractStartDate,
 contractEndDate: t.hrStaff.contractEndDate,
 
 // Salary fields
 basicSalary: t.hrStaff.basicSalary,
 housingAllowance: t.hrStaff.housingAllowance,
 transportAllowance: t.hrStaff.transportAllowance,
 representationAllowance: t.hrStaff.representationAllowance1,
 otherAllowances: t.hrStaff.otherAllowances,
 socialSecurityRate: t.hrStaff.socialSecurityRate,
 healthInsuranceRate: t.hrStaff.healthInsuranceRate,
 taxRate: t.hrStaff.taxRate,
 currency: t.hrStaff.currency,
 
 // Project Assignment fields
 projects: t.hrStaff.assignedProjects,
 projectPlaceholder: t.hrStaff.egEchoyem001,
 addProject: t.hrStaff.addProject,
 
 // Bank fields
 bankName: t.hrStaff.bankName,
 accountNumber: t.hrStaff.accountNumber,
 iban: t.hrStaff.iban,
 
 // Documents fields
 documentsNote: 'Document management will be available in the next update.',
 
 // Buttons
 cancel: t.hrStaff.cancel,
 save: t.hrStaff.saveChanges,
 required: t.hrStaff.requiredField
 };

 const tabs = [
 { id: 0, label: t.personalInfo, icon: User },
 { id: 1, label: t.employmentInfo, icon: Briefcase },
 { id: 2, label: t.projectAssignment, icon: FolderKanban },
 { id: 3, label: t.bankPayment, icon: CreditCard },
 { id: 4, label: t.documents, icon: FileText }
 ];

 const handleChange = (field: keyof StaffMember, value: any) => {
 setFormData({ ...formData, [field]: value });
 };

 const handleProjectChange = (index: number, value: string) => {
 const newProjects = [...formData.projects];
 newProjects[index] = value;
 setFormData({ ...formData, projects: newProjects });
 };

 const handleAddProject = () => {
 setFormData({ ...formData, projects: [...formData.projects, ''] });
 };

 const handleRemoveProject = (index: number) => {
 const newProjects = formData.projects.filter((_, i) => i !== index);
 setFormData({ ...formData, projects: newProjects });
 };

 const handleSave = () => {
 // Validation
 if (!formData.fullName || !formData.position) {
 alert(t.required);
 return;
 }

 // Update staff member
 const updated = staffService.update(formData.id, formData);
 if (updated) {
 onSave(updated);
 }
 onClose();
 };

 return (
 <ModalOverlay onClose={onClose}>
 <div className="bg-gray-50 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white rounded-t-lg">
 <h2 className="text-xl font-bold text-gray-900">{t.editStaff}</h2>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-6 h-6" />
 </button>
 </div>

 {/* Tabs */}
 <div className="flex border-b border-gray-200 px-6 overflow-x-auto bg-white">
 {tabs.map((tab) => {
 const Icon = tab.icon;
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${ activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900' }`}
 >
 <Icon className="w-4 h-4" />
 <span>{tab.label}</span>
 </button>
 );
 })}
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto px-6 py-6">
 {/* Tab 0: Personal Information */}
 {activeTab === 0 && (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.staffId} <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={formData.staffId}
 disabled
 className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.fullName} <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={formData.fullName}
 onChange={(e) => handleChange('fullName', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.gender}</label>
 <select
 value={formData.gender}
 onChange={(e) => handleChange('gender', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 >
 <option value="Male">{t.male}</option>
 <option value="Female">{t.female}</option>
 <option value="Other">{t.other}</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.nationality}</label>
 <input
 type="text"
 value={formData.nationality}
 onChange={(e) => handleChange('nationality', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.dateOfBirth}</label>
 <input
 type="date"
 value={formData.dateOfBirth || ''}
 onChange={(e) => handleChange('dateOfBirth', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.phone}</label>
 <input
 type="tel"
 value={formData.phone || ''}
 onChange={(e) => handleChange('phone', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
 <input
 type="email"
 value={formData.email || ''}
 onChange={(e) => handleChange('email', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>
 )}

 {/* Tab 1: Employment Information */}
 {activeTab === 1 && (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.position} <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={formData.position}
 onChange={(e) => handleChange('position', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.department}</label>
 <input
 type="text"
 value={formData.department}
 onChange={(e) => handleChange('department', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>

 {/* Grade & Step */}
 <div className="mt-2 pt-2 border-t border-gray-100">
 <h4 className="text-sm font-semibold text-gray-900 mb-3">{t.hrStaff.gradeScale}</h4>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.grade}</label>
 <select
 value={formData.grade || ''}
 onChange={(e) => handleGradeChange(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 >
 {grades.length > 0 ? (
 grades.map(g => (
 <option key={g.id} value={g.grade}>
 {g.grade} - {g.description}
 </option>
 ))
 ) : (
 <option value="">No grades available</option>
 )}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.step}</label>
 <select
 value={formData.step || 'Step 1'}
 onChange={(e) => handleChange('step', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 disabled={!selectedGrade}
 >
 {selectedGrade ? (
 selectedGrade.steps.map(s => (
 <option key={s} value={s}>{s}</option>
 ))
 ) : (
 <option value="">Select grade first</option>
 )}
 </select>
 </div>
 </div>
 {selectedGrade && (
 <div className="mt-2 text-sm text-gray-600">
 {t.salaryRange}: ${selectedGrade.minSalary.toLocaleString()} - ${selectedGrade.maxSalary.toLocaleString()}
 </div>
 )}
 </div>

 <div className="grid grid-cols-2 gap-4 mt-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.contractType}</label>
 <select
 value={formData.contractType}
 onChange={(e) => handleChange('contractType', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 >
 <option value="Fixed-Term">{t.fixedTerm}</option>
 <option value="Short-Term">{t.shortTerm}</option>
 <option value="Consultancy">{t.consultancy}</option>
 <option value="Volunteer">{t.volunteer}</option>
 <option value="Daily Worker">{t.dailyWorker}</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.status}</label>
 <select
 value={formData.status}
 onChange={(e) => handleChange('status', e.target.value as any)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 >
 <option value="active">{t.active}</option>
 <option value="archived">{t.archived}</option>
 <option value="exited">{t.exited}</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.hireDate}</label>
 <input
 type="date"
 value={formData.hireDate || ''}
 onChange={(e) => handleChange('hireDate', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.contractStartDate}</label>
 <input
 type="date"
 value={formData.contractStartDate || ''}
 onChange={(e) => handleChange('contractStartDate', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.contractEndDate}</label>
 <input
 type="date"
 value={formData.contractEndDate || ''}
 onChange={(e) => handleChange('contractEndDate', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>

 {/* Salary Section */}
 <div className="mt-6 pt-6 border-t border-gray-200">
 <h3 className="text-base font-semibold text-gray-900 mb-4">{t.hrStaff.salaryInformation}</h3>
 
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.basicSalary}</label>
 <input
 type="number"
 value={formData.basicSalary}
 onChange={(e) => handleChange('basicSalary', parseFloat(e.target.value))}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.currency}</label>
 <input
 type="text"
 value={formData.currency}
 onChange={(e) => handleChange('currency', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4 mt-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.housingAllowance}</label>
 <input
 type="number"
 value={formData.housingAllowance}
 onChange={(e) => handleChange('housingAllowance', parseFloat(e.target.value))}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.transportAllowance}</label>
 <input
 type="number"
 value={formData.transportAllowance}
 onChange={(e) => handleChange('transportAllowance', parseFloat(e.target.value))}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4 mt-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.representationAllowance}</label>
 <input
 type="number"
 value={formData.representationAllowance}
 onChange={(e) => handleChange('representationAllowance', parseFloat(e.target.value))}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.otherAllowances}</label>
 <input
 type="number"
 value={formData.otherAllowances}
 onChange={(e) => handleChange('otherAllowances', parseFloat(e.target.value))}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>

 <div className="grid grid-cols-3 gap-4 mt-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.socialSecurityRate}</label>
 <input
 type="number"
 value={formData.socialSecurityRate}
 onChange={(e) => handleChange('socialSecurityRate', parseFloat(e.target.value))}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.healthInsuranceRate}</label>
 <input
 type="number"
 value={formData.healthInsuranceRate}
 onChange={(e) => handleChange('healthInsuranceRate', parseFloat(e.target.value))}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.taxRate}</label>
 <input
 type="number"
 value={formData.taxRate}
 onChange={(e) => handleChange('taxRate', parseFloat(e.target.value))}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Tab 2: Project Assignment */}
 {activeTab === 2 && (
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{t.projects}</label>
 {formData.projects.map((project, index) => (
 <div key={index} className="flex gap-2 mb-2">
 <input
 type="text"
 value={project}
 onChange={(e) => handleProjectChange(index, e.target.value)}
 placeholder={t.projectPlaceholder}
 className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 <button
 onClick={() => handleRemoveProject(index)}
 className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 ))}
 <button
 onClick={handleAddProject}
 className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 >
 {t.addProject}
 </button>
 </div>
 </div>
 )}

 {/* Tab 3: Bank & Payment */}
 {activeTab === 3 && (
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.bankName}</label>
 <input
 type="text"
 value={formData.bankName || ''}
 onChange={(e) => handleChange('bankName', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.accountNumber}</label>
 <input
 type="text"
 value={formData.accountNumber || ''}
 onChange={(e) => handleChange('accountNumber', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.iban}</label>
 <input
 type="text"
 value={formData.iban || ''}
 onChange={(e) => handleChange('iban', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>
 </div>
 )}

 {/* Tab 4: Documents */}
 {activeTab === 4 && (
 <div className="py-12 text-center text-gray-500">
 <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
 <p>{t.documentsNote}</p>
 </div>
 )}
 </div>

 {/* Footer */}
 <div className={`flex items-center gap-3 px-6 py-4 border-t border-gray-200`}>
 <button
 onClick={handleSave}
 className={`flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700`}
 >
 <Save className="w-4 h-4" />
 <span>{t.save}</span>
 </button>
 <button
 onClick={onClose}
 className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
 >
 {t.cancel}
 </button>
 </div>
 </div>
 </ModalOverlay>
 );
}