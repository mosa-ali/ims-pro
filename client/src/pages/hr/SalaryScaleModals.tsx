/**
 * ============================================================================
 * SALARY SCALE MODALS - EDIT, HISTORY, ADD GRADE
 * ============================================================================
 */

import { useState } from 'react';
import { X, Save, AlertTriangle, Clock, CheckCircle, Trash2 } from 'lucide-react';
import { 
 SalaryScaleRecord, 
 GradeDefinition, 
 salaryScaleService,
 calculateAllowanceValue,
 calculateTotalCompensation
} from '@/app/services/salaryScaleService';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';

// ============================================================================
// EDIT SALARY MODAL
// ============================================================================

interface EditSalaryModalProps {
 record: SalaryScaleRecord;
 grades?: GradeDefinition[];
 language?: string;
 isRTL?: boolean;
 onClose: () => void;
 onSave: () => void;
 userName?: string;
}

export function EditSalaryModal({
 record, grades: propGrades, language = 'en', isRTL = false, onClose, onSave, userName = 'System' }: EditSalaryModalProps) {
 const { t } = useTranslation();
 // Get grades from service if not provided as prop
 const grades = propGrades || salaryScaleService.getAllGrades();
 const [formData, setFormData] = useState({
 grade: record.grade,
 step: record.step,
 approvedGrossSalary: record.approvedGrossSalary,
 housingAllowance: record.housingAllowance,
 housingAllowanceType: record.housingAllowanceType,
 transportAllowance: record.transportAllowance,
 transportAllowanceType: record.transportAllowanceType,
 representationAllowance: record.representationAllowance,
 representationAllowanceType: record.representationAllowanceType,
 annualAllowance: record.annualAllowance,
 bonus: record.bonus,
 otherAllowances: record.otherAllowances,
 effectiveStartDate: record.effectiveStartDate
 });

 const selectedGrade = grades.find(g => g.grade === formData.grade);
 const minSalary = selectedGrade?.minSalary || 0;
 const maxSalary = selectedGrade?.maxSalary || 0;

 // Update step when grade changes
 const handleGradeChange = (newGrade: string) => {
 const grade = grades.find(g => g.grade === newGrade);
 setFormData({
 ...formData,
 grade: newGrade,
 step: grade?.steps[0] || 'Step 1' // Default to first step when grade changes
 });
 };

 const localT = {
 title: t.hr.editSalaryRecord,
 staffInfo: t.hr.staffInformation,
 gradeScale: t.hr.gradeScale,
 grade: t.hr.grade,
 step: t.hr.step,
 salaryRange: t.hr.salaryRange,
 minSalary: t.hr.min,
 maxSalary: t.hr.max,
 approvedSalary: t.hr.approvedGrossSalary,
 allowances: t.hr.allowances,
 housing: t.hr.housingAllowance,
 transport: t.hr.transportAllowance,
 representation: t.hr.representationAllowance,
 annual: t.hr.annualAllowance,
 bonus: t.hr.bonus,
 other: t.hr.otherAllowances,
 effectiveDate: t.hr.effectiveStartDate,
 value: t.hr.value,
 percentage: t.hr.percentage,
 cancel: t.hr.cancel,
 save: t.hr.saveAsNewVersion,
 versionNote: 'Saving will create a new version and mark the current record as superseded'
 };

 const handleSave = () => {
 try {
 salaryScaleService.createNewVersion(record.staffId, formData, userName);
 onSave();
 onClose();
 } catch (error) {
 alert('Error saving: ' + (error as Error).message);
 }
 };

 return (
 <ModalOverlay onClose={onClose}>
 <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
 {/* Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
 <h3 className="text-lg font-semibold text-gray-900">{localT.title}</h3>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="px-6 py-4 space-y-6">
 {/* Staff Info */}
 <div className="bg-gray-50 p-4 rounded">
 <h4 className="font-semibold text-gray-900 mb-2">{localT.staffInfo}</h4>
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div><span className="text-gray-600">ID:</span> <span className="font-medium">{record.staffId}</span></div>
 <div><span className="text-gray-600">{t.hr.name}:</span> <span className="font-medium">{record.staffFullName}</span></div>
 <div><span className="text-gray-600">{t.hr.position}:</span> <span className="font-medium">{record.position}</span></div>
 <div><span className="text-gray-600">{t.hr.department}:</span> <span className="font-medium">{record.department}</span></div>
 </div>
 </div>

 {/* Grade & Scale */}
 <div>
 <h4 className="font-semibold text-gray-900 mb-3">{localT.gradeScale}</h4>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{localT.grade}</label>
 <select
 value={formData.grade}
 onChange={(e) => handleGradeChange(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
 <label className="block text-sm font-medium text-gray-700 mb-1">{localT.step}</label>
 <select
 value={formData.step}
 onChange={(e) => setFormData({ ...formData, step: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
 {localT.salaryRange}: ${minSalary.toLocaleString()} - ${maxSalary.toLocaleString()}
 </div>
 )}
 </div>

 {/* Approved Salary */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{localT.approvedSalary}</label>
 <input
 type="number"
 value={formData.approvedGrossSalary}
 onChange={(e) => setFormData({ ...formData, approvedGrossSalary: parseFloat(e.target.value) || 0 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>

 {/* Allowances */}
 <div>
 <h4 className="font-semibold text-gray-900 mb-3">{localT.allowances}</h4>
 <div className="space-y-3">
 {[
 { key: 'housingAllowance', label: localT.housing, typeKey: 'housingAllowanceType' },
 { key: 'transportAllowance', label: localT.transport, typeKey: 'transportAllowanceType' },
 { key: 'representationAllowance', label: localT.representation, typeKey: 'representationAllowanceType' }
 ].map(item => {
 const allowanceValue = formData[item.key as keyof typeof formData] as number;
 const allowanceType = formData[item.typeKey as keyof typeof formData] as 'value' | 'percentage';
 const calculatedValue = calculateAllowanceValue(
 formData.approvedGrossSalary,
 allowanceValue,
 allowanceType
 );

 return (
 <div key={item.key} dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="grid grid-cols-3 gap-2">
 <div className="col-span-2">
 <label className="block text-sm font-medium text-gray-700 mb-1">{item.label}</label>
 <input
 type="number"
 value={allowanceValue}
 onChange={(e) => setFormData({ ...formData, [item.key]: parseFloat(e.target.value) || 0 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.hr.type}</label>
 <select
 value={allowanceType}
 onChange={(e) => setFormData({ ...formData, [item.typeKey]: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="value">{localT.value}</option>
 <option value="percentage">{localT.percentage}</option>
 </select>
 </div>
 </div>
 {/* Calculated Value Preview */}
 {allowanceType === 'percentage' && formData.approvedGrossSalary > 0 && (
 <div className="mt-1 text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
 {allowanceValue}% {t.hr.of} ${formData.approvedGrossSalary.toLocaleString()} = ${calculatedValue.toLocaleString()}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>

 {/* Effective Date */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{localT.effectiveDate}</label>
 <input
 type="date"
 value={formData.effectiveStartDate}
 onChange={(e) => setFormData({ ...formData, effectiveStartDate: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>

 {/* Version Note */}
 <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
 <div className="flex items-center gap-2">
 <AlertTriangle className="w-4 h-4" />
 <span>{localT.versionNote}</span>
 </div>
 </div>
 </div>

 <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
 <button
 onClick={onClose}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 {localT.cancel}
 </button>
 <button
 onClick={handleSave}
 className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
 >
 <Save className="w-4 h-4" />
 {localT.save}
 </button>
 </div>
 </div>
 </ModalOverlay>
 );
}

// ============================================================================
// SALARY HISTORY MODAL
// ============================================================================

interface HistoryModalProps {
 staffId: string;
 staffName: string;
 language: string;
 isRTL: boolean;
 onClose: () => void;
}

export function SalaryHistoryModal({
 staffId, staffName, language, isRTL, onClose }: HistoryModalProps) {
 const { t } = useTranslation();
 const history = salaryScaleService.getByStaffId(staffId);

 const localT = {
 title: t.hr.salaryHistory,
 for: t.hr.for,
 version: t.hr.version,
 effectiveDate: t.hr.effectiveDate,
 endDate: t.hr.endDate,
 grade: t.hr.grade,
 step: t.hr.step,
 salary: t.hr.approvedSalary,
 status: t.hr.status,
 approvedBy: t.hr.approvedBy,
 close: t.hr.close,
 draft: t.hr.draft,
 active: t.hr.active,
 superseded: t.hr.superseded,
 current: t.hr.current,
 noHistory: t.hr.noHistoryFound
 };

 return (
 <ModalOverlay onClose={onClose}>
 <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
 <div>
 <h3 className="text-lg font-semibold text-gray-900">{localT.title}</h3>
 <p className="text-sm text-gray-600">{localT.for} {staffName}</p>
 </div>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="px-6 py-4">
 {history.length === 0 ? (
 <div className="text-center py-12 text-gray-500">
 <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
 <p>{localT.noHistory}</p>
 </div>
 ) : (
 <div className="space-y-4">
 {history.map((record, index) => (
 <div
 key={record.id}
 className={`border rounded-lg p-4 ${ record.status === 'active' ? 'border-green-300 bg-green-50' : 'border-gray-200' }`}
 >
 <div className="flex items-start justify-between mb-3">
 <div>
 <div className="flex items-center gap-2">
 <span className="font-semibold text-gray-900">{localT.version} {record.version}</span>
 {record.status === 'active' && (
 <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded font-medium">
 {localT.current}
 </span>
 )}
 </div>
 <div className="text-sm text-gray-600 mt-1">
 {localT.effectiveDate}: {record.effectiveStartDate}
 {record.effectiveEndDate && ` → ${localT.endDate}: ${record.effectiveEndDate}`}
 </div>
 </div>
 <span className={`px-2 py-1 rounded text-xs font-medium ${ record.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : record.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600' }`}>
 {t[record.status as keyof typeof t]}
 </span>
 </div>

 <div className="grid grid-cols-4 gap-4 text-sm">
 <div>
 <span className="text-gray-600">{localT.grade}:</span>
 <span className="font-medium ms-2">{record.grade}</span>
 </div>
 <div>
 <span className="text-gray-600">{localT.step}:</span>
 <span className="font-medium ms-2">{record.step}</span>
 </div>
 <div>
 <span className="text-gray-600">{localT.salary}:</span>
 <span className="font-medium ms-2">${record.approvedGrossSalary.toLocaleString()}</span>
 </div>
 <div>
 <span className="text-gray-600">{localT.approvedBy}:</span>
 <span className="font-medium ms-2">{record.lastApprovedBy || '-'}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="px-6 py-4 border-t border-gray-200 flex justify-end sticky bottom-0 bg-white">
 <button
 onClick={onClose}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 {localT.close}
 </button>
 </div>
 </div>
 </ModalOverlay>
 );
}

// ============================================================================
// ADD GRADE MODAL
// ============================================================================

interface AddGradeModalProps {
 language: string;
 isRTL: boolean;
 onClose: () => void;
 onSave: () => void;
}

export function AddGradeModal({
 language, isRTL, onClose, onSave }: AddGradeModalProps) {
 const { t } = useTranslation();
 const [formData, setFormData] = useState({
 grade: '',
 description: '',
 minSalary: 0,
 maxSalary: 0,
 steps: ['Step 1', 'Step 2', 'Step 3'],
 currency: 'USD'
 });

 const localT = {
 title: t.hr.addNewGrade,
 grade: t.hr.gradeCode,
 description: t.hr.description,
 minSalary: t.hr.minimumSalary,
 maxSalary: t.hr.maximumSalary,
 currency: t.hr.currency,
 cancel: t.hr.cancel,
 save: t.hr.addGrade,
 placeholder: {
 grade: t.hr.egG6,
 description: t.hr.egExecutiveLevel
 }
 };

 const handleSave = () => {
 if (!formData.grade || !formData.description) {
 alert(t.hr.pleaseFillAllRequiredFields9);
 return;
 }
 
 salaryScaleService.addGrade(formData);
 onSave();
 onClose();
 };

 return (
 <ModalOverlay onClose={onClose}>
 <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
 <h3 className="text-lg font-semibold text-gray-900">{localT.title}</h3>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="px-6 py-4 space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{localT.grade} *</label>
 <input
 type="text"
 value={formData.grade}
 onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
 placeholder={localT.placeholder.grade}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{localT.description} *</label>
 <input
 type="text"
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 placeholder={localT.placeholder.description}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{localT.minSalary}</label>
 <input
 type="number"
 value={formData.minSalary}
 onChange={(e) => setFormData({ ...formData, minSalary: parseFloat(e.target.value) || 0 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{localT.maxSalary}</label>
 <input
 type="number"
 value={formData.maxSalary}
 onChange={(e) => setFormData({ ...formData, maxSalary: parseFloat(e.target.value) || 0 })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>
 </div>
 </div>

 <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
 <button
 onClick={onClose}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 {localT.cancel}
 </button>
 <button
 onClick={handleSave}
 className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
 >
 {localT.save}
 </button>
 </div>
 </div>
 </ModalOverlay>
 );
}

// ============================================================================
// MANAGE GRADES MODAL (View & Delete Grades)
// ============================================================================

interface ManageGradesModalProps {
 language: string;
 isRTL: boolean;
 onClose: () => void;
 onUpdate: () => void;
}

export function ManageGradesModal({
 language, isRTL, onClose, onUpdate }: ManageGradesModalProps) {
 const { t } = useTranslation();
 const [grades, setGrades] = useState<GradeDefinition[]>(salaryScaleService.getAllGrades());

 const loadGrades = () => {
 setGrades(salaryScaleService.getAllGrades());
 };

 const localT = {
 title: t.hr.manageSalaryGrades,
 subtitle: t.hr.viewAndDeleteGradeDefinitions,
 grade: t.hr.grade,
 description: t.hr.description,
 salaryRange: t.hr.salaryRange,
 steps: t.hr.steps,
 actions: t.hr.actions,
 delete: t.hr.delete,
 close: t.hr.close,
 confirmDelete: 'Are you sure you want to delete this grade?',
 noGrades: t.hr.noGradesFound
 };

 const handleDelete = (grade: GradeDefinition) => {
 if (!confirm(`${localT.confirmDelete}\n\n${grade.grade} - ${grade.description}`)) {
 return;
 }

 salaryScaleService.deleteGrade(grade.id);
 loadGrades();
 onUpdate();
 };

 return (
 <ModalOverlay onClose={onClose}>
 <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
 <div>
 <h3 className="text-lg font-semibold text-gray-900">{localT.title}</h3>
 <p className="text-sm text-gray-600">{localT.subtitle}</p>
 </div>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="px-6 py-4">
 {grades.length === 0 ? (
 <div className="text-center py-12 text-gray-500">
 <p>{localT.noGrades}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-sm font-semibold text-gray-700 text-start`}>{localT.grade}</th>
 <th className={`px-4 py-3 text-sm font-semibold text-gray-700 text-start`}>{localT.description}</th>
 <th className={`px-4 py-3 text-sm font-semibold text-gray-700 text-start`}>{localT.salaryRange}</th>
 <th className={`px-4 py-3 text-sm font-semibold text-gray-700 text-start`}>{localT.steps}</th>
 <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">{localT.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {grades.map((grade) => (
 <tr key={grade.id} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm font-medium text-gray-900">{grade.grade}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{grade.description}</td>
 <td className="px-4 py-3 text-sm text-gray-700">
 ${grade.minSalary.toLocaleString()} - ${grade.maxSalary.toLocaleString()}
 </td>
 <td className="px-4 py-3 text-sm text-gray-700">{grade.steps.join(', ')}</td>
 <td className="px-4 py-3 text-center">
 <button
 onClick={() => handleDelete(grade)}
 className="text-red-600 hover:text-red-700 p-1"
 title={localT.delete}
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 <div className="px-6 py-4 border-t border-gray-200 flex justify-end sticky bottom-0 bg-white">
 <button
 onClick={onClose}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 {localT.close}
 </button>
 </div>
 </div>
 </ModalOverlay>
 );
}