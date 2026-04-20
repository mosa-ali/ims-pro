/**
 * ============================================================================
 * EDIT CURRENT SALARY STRUCTURE MODAL
 * ============================================================================
 * DEDICATED FORM - Updates ONLY salary data
 * Does NOT touch: Identity, Contract, Performance, Exit data
 * 
 * CRITICAL RULE: Saving creates NEW salary version
 * Previous salary is marked "Superseded" - NOT deleted
 * Payroll ONLY reads active salary
 * ============================================================================
 */

import { useState } from 'react';
import { X, Save, DollarSign, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { StaffMember } from '../types/hrTypes';
import { useTranslation } from '@/i18n/useTranslation';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface Props {
 employee: StaffMember;
 salaryRecordId?: number;
 onClose: () => void;
 onSave: (updatedEmployee: StaffMember) => void;
 onShowHistory?: () => void;
}

interface AllowanceConfig {
 value: number;
 isPercentage: boolean;
}

export function EditCurrentSalaryModal({
 employee, salaryRecordId, onClose, onSave, onShowHistory }: Props) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 
 // ONLY salary fields (NO identity, contract, etc.)
 const [formData, setFormData] = useState({
 grade: employee.grade || '',
 step: employee.step || '',
 basicSalary: employee.basicSalary || 0,
 housingAllowance: employee.housingAllowance || 0,
 housingIsPercentage: false,
 transportAllowance: employee.transportAllowance || 0,
 transportIsPercentage: false,
 representationAllowance: employee.representationAllowance || 0,
 representationIsPercentage: false,
 otherAllowances: employee.otherAllowances || 0,
 otherIsPercentage: false,
 effectiveDate: new Date().toISOString().split('T')[0]
 });

 const [errors, setErrors] = useState<Record<string, string>>({});
 const [showVersionWarning, setShowVersionWarning] = useState(true);

 const localT = {
 title: t.hrModals.editCurrentSalaryStructure,
 subtitle: t.hrModals.updateEmployeeSalaryAndAllowances,
 
 warningTitle: t.hrModals.importantSalaryVersioning,
 warningText: language === 'en' 
 ? 'Saving creates a NEW salary version. The previous salary will be marked "Superseded" and kept for audit purposes. Payroll will automatically use the new active salary.'
 : 'الحفظ ينشئ إصدار راتب جديد. سيتم وضع علامة "متجاوز" على الراتب السابق والاحتفاظ به لأغراض التدقيق. ستستخدم كشوف المرتبات تلقائياً الراتب النشط الجديد.',
 
 // Read-only
 readOnlySection: t.hrModals.employeeInformation,
 staffId: t.hrModals.staffId,
 fullName: t.hrModals.fullName,
 position: t.hrModals.position,
 department: t.hrModals.department,
 
 // Salary Structure
 salarySection: t.hrModals.salaryStructure,
 grade: t.hrModals.grade,
 step: t.hrModals.step,
 baseSalary: t.hrModals.baseSalary,
 
 // Allowances
 allowancesSection: t.hrModals.allowances,
 housingAllowance: t.hrModals.housingAllowance,
 transportAllowance: t.hrModals.transportAllowance,
 representationAllowance: t.hrModals.representationAllowance,
 otherAllowance: t.hrModals.otherAllowance,
 
 fixedAmount: t.hrModals.fixedAmount,
 percentage: t.hrModals.ofBase,
 
 // Effective Date
 effectiveDate: t.hrModals.effectiveStartDate,
 effectiveHelp: t.hrModals.whenDoesThisNewSalaryTake,
 
 // Summary
 summarySection: t.hrModals.totalCompensationSummary,
 totalGross: t.hrModals.totalGrossSalary,
 
 // Actions
 cancel: t.hrModals.cancel,
 save: t.hrModals.saveNewVersion,
 required: t.hrModals.thisFieldIsRequired,
 mustBePositive: t.hrModals.mustBeAPositiveNumber
 };

 const calculateAllowanceValue = (allowance: number, isPercentage: boolean): number => {
 if (isPercentage) {
 return (formData.basicSalary * allowance) / 100;
 }
 return allowance;
 };

 const calculateTotalGross = (): number => {
 const housing = calculateAllowanceValue(formData.housingAllowance, formData.housingIsPercentage);
 const transport = calculateAllowanceValue(formData.transportAllowance, formData.transportIsPercentage);
 const representation = calculateAllowanceValue(formData.representationAllowance, formData.representationIsPercentage);
 const other = calculateAllowanceValue(formData.otherAllowances, formData.otherIsPercentage);
 
 return formData.basicSalary + housing + transport + representation + other;
 };

 const validateForm = (): boolean => {
 const newErrors: Record<string, string> = {};
 
 if (!formData.basicSalary || formData.basicSalary <= 0) {
 newErrors.basicSalary = localT.mustBePositive;
 }
 
 if (!formData.effectiveDate) {
 newErrors.effectiveDate = localT.required;
 }
 
 setErrors(newErrors);
 return Object.keys(newErrors).length === 0;
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 
 if (!validateForm()) {
 return;
 }
 
 // Calculate final allowance values (convert percentages)
 const finalHousing = calculateAllowanceValue(formData.housingAllowance, formData.housingIsPercentage);
 const finalTransport = calculateAllowanceValue(formData.transportAllowance, formData.transportIsPercentage);
 const finalRepresentation = calculateAllowanceValue(formData.representationAllowance, formData.representationIsPercentage);
 const finalOther = calculateAllowanceValue(formData.otherAllowances, formData.otherIsPercentage);
 
 // Update ONLY salary fields
 const updatedEmployee: StaffMember = {
 ...employee,
 grade: formData.grade.trim(),
 step: formData.step.trim(),
 basicSalary: formData.basicSalary,
 housingAllowance: finalHousing,
 transportAllowance: finalTransport,
 representationAllowance: finalRepresentation,
 otherAllowances: finalOther,
 updatedAt: new Date().toISOString()
 };
 
 // Save to localStorage
 const staffData = JSON.parse(localStorage.getItem('staff') || '[]');
 const updatedStaffData = staffData.map((s: StaffMember) => s.id === employee.id ? updatedEmployee : s);
 localStorage.setItem('staff', JSON.stringify(updatedStaffData));
 
 // Also sync to database via tRPC if salaryRecordId provided
 if (salaryRecordId) {
 try {
 await trpc.hrSalaryScale.update.mutate({
 id: salaryRecordId,
 gradeCode: formData.grade.trim(),
 step: formData.step.trim(),
 approvedGrossSalary: calculateTotalGross(),
 housingAllowance: finalHousing,
 transportAllowance: finalTransport,
 representationAllowance: finalRepresentation,
 otherAllowances: finalOther,
 effectiveStartDate: formData.effectiveDate,
 status: 'active'
 });
 toast.success('Salary saved to database');
 } catch (error: any) {
 toast.error('Database sync failed: ' + (error?.message || 'Unknown error'));
 }
 }
 
 onSave(updatedEmployee);
 onClose();
 };

 const formatCurrency = (amount: number) => {
 const locale = language === 'ar' ? 'ar-SA' : 'en-US';
 return new Intl.NumberFormat(locale, {
 style: 'currency',
 currency: 'USD',
 minimumFractionDigits: 2
 }).format(amount);
 };

 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 const locale = language === 'ar' ? 'ar-SA' : 'en-US';
 return new Date(dateString).toLocaleDateString(locale, {
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
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-yellow-50">
 <div>
 <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
 <DollarSign className="w-5 h-5 text-yellow-600" />
 {localT.title}
 </h2>
 <p className="text-sm text-gray-600 mt-1">{localT.subtitle}</p>
 </div>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-6 h-6" />
 </button>
 </div>

 {/* Form */}
 <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
 <div className="space-y-6">
 {/* Version Warning */}
 {showVersionWarning && (
 <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
 <div className="flex items-start gap-3">
 <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
 <div className="flex-1">
 <h4 className="text-sm font-semibold text-orange-900 mb-1">{localT.warningTitle}</h4>
 <p className="text-xs text-orange-800">{localT.warningText}</p>
 </div>
 <button
 type="button"
 onClick={() => setShowVersionWarning(false)}
 className="text-orange-400 hover:text-orange-600"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 </div>
 )}

 {/* Read-Only Employee Info */}
 <div>
 <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
 {localT.readOnlySection}
 </h3>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1">{localT.staffId}</label>
 <div className="text-sm font-mono font-bold text-gray-900">{employee.staffId}</div>
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1">{localT.fullName}</label>
 <div className="text-sm text-gray-900">{employee.fullName}</div>
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1">{localT.position}</label>
 <div className="text-sm text-gray-900">{employee.position}</div>
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1">{localT.department}</label>
 <div className="text-sm text-gray-900">{employee.department}</div>
 </div>
 </div>
 </div>

 {/* Salary Structure */}
 <div>
 <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
 {localT.salarySection}
 </h3>
 
 <div className="space-y-4">
 {/* Row 1: Grade, Step, Base Salary */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.grade}
 </label>
 <input
 type="text"
 value={formData.grade}
 onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
 placeholder="e.g. G5, G6, G7"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.step}
 </label>
 <input
 type="text"
 value={formData.step}
 onChange={(e) => setFormData({ ...formData, step: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
 placeholder="e.g. 1, 2, 3"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.baseSalary} <span className="text-red-500">*</span>
 </label>
 <input
 type="number"
 required
 step="0.01"
 min="0"
 value={formData.basicSalary}
 onChange={(e) => setFormData({ ...formData, basicSalary: parseFloat(e.target.value) || 0 })}
 className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${errors.basicSalary ? 'border-red-500' : 'border-gray-300'}`}
 />
 {errors.basicSalary && <p className="text-xs text-red-500 mt-1">{errors.basicSalary}</p>}
 </div>
 </div>
 </div>
 </div>

 {/* Allowances */}
 <div>
 <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
 {localT.allowancesSection}
 </h3>
 
 <div className="space-y-4">
 {/* Housing Allowance */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.housingAllowance}
 </label>
 <input
 type="number"
 step="0.01"
 min="0"
 value={formData.housingAllowance}
 onChange={(e) => setFormData({ ...formData, housingAllowance: parseFloat(e.target.value) || 0 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
 />
 </div>
 <div>
 <select
 value={formData.housingIsPercentage ? 'percentage' : 'fixed'}
 onChange={(e) => setFormData({ ...formData, housingIsPercentage: e.target.value === 'percentage' })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
 >
 <option value="fixed">{localT.fixedAmount}</option>
 <option value="percentage">{localT.percentage}</option>
 </select>
 </div>
 </div>

 {/* Transport Allowance */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.transportAllowance}
 </label>
 <input
 type="number"
 step="0.01"
 min="0"
 value={formData.transportAllowance}
 onChange={(e) => setFormData({ ...formData, transportAllowance: parseFloat(e.target.value) || 0 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
 />
 </div>
 <div>
 <select
 value={formData.transportIsPercentage ? 'percentage' : 'fixed'}
 onChange={(e) => setFormData({ ...formData, transportIsPercentage: e.target.value === 'percentage' })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
 >
 <option value="fixed">{localT.fixedAmount}</option>
 <option value="percentage">{localT.percentage}</option>
 </select>
 </div>
 </div>

 {/* Representation Allowance */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.representationAllowance}
 </label>
 <input
 type="number"
 step="0.01"
 min="0"
 value={formData.representationAllowance}
 onChange={(e) => setFormData({ ...formData, representationAllowance: parseFloat(e.target.value) || 0 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
 />
 </div>
 <div>
 <select
 value={formData.representationIsPercentage ? 'percentage' : 'fixed'}
 onChange={(e) => setFormData({ ...formData, representationIsPercentage: e.target.value === 'percentage' })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
 >
 <option value="fixed">{localT.fixedAmount}</option>
 <option value="percentage">{localT.percentage}</option>
 </select>
 </div>
 </div>

 {/* Other Allowance */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.otherAllowance}
 </label>
 <input
 type="number"
 step="0.01"
 min="0"
 value={formData.otherAllowances}
 onChange={(e) => setFormData({ ...formData, otherAllowances: parseFloat(e.target.value) || 0 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
 />
 </div>
 <div>
 <select
 value={formData.otherIsPercentage ? 'percentage' : 'fixed'}
 onChange={(e) => setFormData({ ...formData, otherIsPercentage: e.target.value === 'percentage' })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
 >
 <option value="fixed">{localT.fixedAmount}</option>
 <option value="percentage">{localT.percentage}</option>
 </select>
 </div>
 </div>
 </div>
 </div>

 {/* Effective Date */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {localT.effectiveDate} <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 required
 value={formData.effectiveDate}
 onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
 className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${errors.effectiveDate ? 'border-red-500' : 'border-gray-300'}`}
 />
 <p className="text-xs text-gray-500 mt-1">{localT.effectiveHelp}</p>
 {errors.effectiveDate && <p className="text-xs text-red-500 mt-1">{errors.effectiveDate}</p>}
 </div>

 {/* Total Compensation Summary */}
 <div>
 <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
 {localT.summarySection}
 </h3>
 <div className="bg-gradient-to-r from-yellow-50 to-green-50 border border-yellow-200 rounded-lg p-6">
 <div className="flex items-center justify-between">
 <span className="text-lg font-semibold text-gray-700">{localT.totalGross}:</span>
 <span className="text-3xl font-bold text-green-700">{formatCurrency(calculateTotalGross())}</span>
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
 {localT.cancel}
 </button>
 <button
 onClick={handleSubmit}
 className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
 >
 <Save className="w-4 h-4" />
 {localT.save}
 </button>
 </div>
 </div>
 </div>
 );
}
