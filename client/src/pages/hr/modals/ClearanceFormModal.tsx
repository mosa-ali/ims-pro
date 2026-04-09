/**
 * ============================================================================
 * CLEARANCE FORM MODAL - Exit Clearance Checklist
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { X, Save, CheckSquare } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { StaffMember } from '../types/hrTypes';
import { exitService, ClearanceRecord, ClearanceItem } from '@/app/services/exitService';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 employee: StaffMember;
 onClose: () => void;
 onSave: (record: ClearanceRecord) => void;
}

export function ClearanceFormModal({
 employee, onClose, onSave }: Props) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 
 // Check if clearance already exists
 const existingClearance = exitService.getClearanceByStaffId(employee.staffId);
 
 const defaultChecklist: ClearanceItem[] = [
 { department: 'HR - Final Settlement', cleared: false, remarks: '' },
 { department: 'Finance - Outstanding Payments', cleared: false, remarks: '' },
 { department: 'IT - Equipment Return (Laptop)', cleared: false, remarks: '' },
 { department: 'IT - Equipment Return (Mobile Phone)', cleared: false, remarks: '' },
 { department: 'IT - Access Revocation (Email, Systems)', cleared: false, remarks: '' },
 { department: 'Logistics - Office Keys', cleared: false, remarks: '' },
 { department: 'Logistics - ID Card', cleared: false, remarks: '' },
 { department: 'Logistics - Other Assets', cleared: false, remarks: '' },
 { department: 'Administration - Project Handover', cleared: false, remarks: '' },
 { department: 'Administration - Documentation', cleared: false, remarks: '' }
 ];
 
 const [checklist, setChecklist] = useState<ClearanceItem[]>(
 existingClearance?.checklist || defaultChecklist
 );
 const [confirmedBy, setConfirmedBy] = useState(existingClearance?.confirmedBy || '');
 const [confirmedByRole, setConfirmedByRole] = useState(existingClearance?.confirmedByRole || '');
 const [notes, setNotes] = useState(existingClearance?.notes || '');

 const allCleared = checklist.every(item => item.cleared);

 const localT = {
 title: t.hrModals.clearanceForm,
 subtitle: t.hrModals.departmentClearanceChecklist,
 
 employeeInfo: t.hrModals.employeeInformation,
 staffId: t.hrModals.staffId,
 fullName: t.hrModals.fullName,
 position: t.hrModals.position2,
 department: t.hrModals.department,
 
 clearanceChecklist: t.hrModals.clearanceChecklist,
 departmentCol: t.hrModals.department,
 clearedCol: t.hrModals.cleared,
 remarksCol: t.hrModals.remarks,
 
 allClearedStatus: t.hrModals.allDepartmentsCleared,
 pendingStatus: t.hrModals.pendingClearanceFromSomeDepartments,
 
 confirmedBy: t.hrModals.confirmedByHrManager,
 confirmedByRole: t.hrModals.role,
 notes: t.hrModals.additionalNotes,
 
 cancel: t.hrModals.cancel,
 save: t.hrModals.saveProgress,
 complete: t.hrModals.completeLock,
 required: t.hrModals.pleaseFillInAllRequiredFields,
 allMustBeClearedWarning: 'All departments must be cleared before completing',
 success: t.hrModals.clearanceSavedSuccessfully,
 completeSuccess: t.hrModals.clearanceCompletedSuccessfully
 };

 const handleChecklistChange = (index: number, field: keyof ClearanceItem, value: any) => {
 const newChecklist = [...checklist];
 newChecklist[index] = { ...newChecklist[index], [field]: value };
 if (field === 'cleared' && value) {
 newChecklist[index].clearedDate = new Date().toISOString();
 newChecklist[index].clearedBy = 'Current User'; // TODO: Replace with actual user
 }
 setChecklist(newChecklist);
 };

 const handleSave = (completeAndLock: boolean = false) => {
 if (completeAndLock && !allCleared) {
 alert(t.allMustBeClearedWarning);
 return;
 }
 
 if (completeAndLock && (!confirmedBy || !confirmedByRole)) {
 alert(t.required);
 return;
 }
 
 if (existingClearance) {
 // Update existing clearance
 const updated = exitService.updateClearance(existingClearance.id, {
 checklist,
 confirmedBy: completeAndLock ? confirmedBy : undefined,
 confirmedByRole: completeAndLock ? confirmedByRole : undefined,
 notes: notes || undefined,
 lastModifiedBy: 'Current User'
 });
 
 if (updated) {
 alert(completeAndLock ? t.completeSuccess : t.success);
 onSave(updated);
 onClose();
 }
 } else {
 // Create new clearance
 const record = exitService.addClearance({
 staffId: employee.staffId,
 employeeName: employee.fullName,
 position: employee.position,
 department: employee.department,
 
 checklist,
 allCleared: false,
 confirmedBy: completeAndLock ? confirmedBy : undefined,
 confirmedByRole: completeAndLock ? confirmedByRole : undefined,
 notes: notes || undefined,
 
 createdBy: 'Current User'
 });
 
 alert(t.success);
 onSave(record);
 
 if (!completeAndLock) {
 // Don't close if just saving progress - allow continued editing
 } else {
 onClose();
 }
 }
 };

 return (
 <ModalOverlay onClose={onClose}>
 <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
 <div className="flex items-center gap-3">
 <CheckSquare className="w-6 h-6 text-green-600" />
 <div>
 <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
 <p className="text-sm text-gray-500">{t.subtitle}</p>
 </div>
 </div>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-6 h-6" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto px-6 py-4">
 <div className="space-y-4">
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <h3 className="text-sm font-semibold text-blue-900 mb-2">{t.employeeInfo}</h3>
 <div className="grid grid-cols-2 gap-2 text-sm">
 <div><span className="text-gray-600">{t.staffId}:</span> <span className="font-medium">{employee.staffId}</span></div>
 <div><span className="text-gray-600">{t.fullName}:</span> <span className="font-medium">{employee.fullName}</span></div>
 <div><span className="text-gray-600">{t.position}:</span> <span className="font-medium">{employee.position}</span></div>
 <div><span className="text-gray-600">{t.department}:</span> <span className="font-medium">{employee.department}</span></div>
 </div>
 </div>

 {/* Status Badge */}
 <div className={`p-3 rounded-lg border ${ allCleared ? 'bg-green-50 border-green-200 text-green-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800' }`}>
 <p className="text-sm font-medium">
 {allCleared ? t.allClearedStatus : t.pendingStatus}
 </p>
 </div>

 {/* Clearance Checklist Table */}
 <div>
 <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.clearanceChecklist}</h3>
 <div className="border border-gray-300 rounded-lg overflow-hidden">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-300">
 <tr>
 <th className={`px-4 py-2 text-sm font-medium text-gray-700 text-start`}>{t.departmentCol}</th>
 <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">{t.clearedCol}</th>
 <th className={`px-4 py-2 text-sm font-medium text-gray-700 text-start`}>{t.remarksCol}</th>
 </tr>
 </thead>
 <tbody>
 {checklist.map((item, index) => (
 <tr key={index} className="border-b border-gray-200 last:border-0">
 <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.department}</td>
 <td className="px-4 py-3 text-center">
 <input
 type="checkbox"
 checked={item.cleared}
 onChange={(e) => handleChecklistChange(index, 'cleared', e.target.checked)}
 disabled={existingClearance?.isLocked}
 className="w-5 h-5"
 />
 </td>
 <td className="px-4 py-3">
 <input
 type="text"
 value={item.remarks || ''}
 onChange={(e) => handleChecklistChange(index, 'remarks', e.target.value)}
 disabled={existingClearance?.isLocked}
 placeholder={t.hrModals.addRemarks}
 className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
 />
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* HR Confirmation (only if all cleared) */}
 {allCleared && (
 <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
 <h3 className="text-sm font-semibold text-green-900">Final Confirmation</h3>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.confirmedBy} *</label>
 <input
 type="text"
 value={confirmedBy}
 onChange={(e) => setConfirmedBy(e.target.value)}
 disabled={existingClearance?.isLocked}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.confirmedByRole} *</label>
 <input
 type="text"
 value={confirmedByRole}
 onChange={(e) => setConfirmedByRole(e.target.value)}
 disabled={existingClearance?.isLocked}
 placeholder={t.hrModals.egHrManager}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>
 </div>
 )}

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{t.notes}</label>
 <textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 disabled={existingClearance?.isLocked}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>
 </div>

 <div className={`flex items-center gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50`}>
 <button
 onClick={onClose}
 className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 {t.cancel}
 </button>
 
 {!existingClearance?.isLocked && (
 <>
 <button
 onClick={() => handleSave(false)}
 className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700`}
 >
 <Save className="w-5 h-5" />
 <span>{t.save}</span>
 </button>
 
 {allCleared && (
 <button
 onClick={() => handleSave(true)}
 className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700`}
 >
 <CheckSquare className="w-5 h-5" />
 <span>{t.complete}</span>
 </button>
 )}
 </>
 )}
 </div>
 </div>
 </ModalOverlay>
 );
}