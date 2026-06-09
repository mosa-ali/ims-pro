/**
 * ============================================================================
 * EXIT INTERVIEW FORM MODAL - Structured Exit Feedback
 * ============================================================================
 */

import { useState } from 'react';
import { X, Save, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { StaffMember } from '../types/hrTypes';
import { exitService, ExitInterviewRecord } from '@/app/services/exitService';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 employee: StaffMember;
 onClose: () => void;
 onSave: (record: ExitInterviewRecord) => void;
}

export function ExitInterviewFormModal({
 employee, onClose, onSave }: Props) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 
 const [formData, setFormData] = useState({
 interviewDate: new Date().toISOString().split('T')[0],
 interviewedBy: '',
 interviewedByRole: '',
 exitType: 'Resignation' as const,
 primaryReasonForLeaving: '',
 whatWorkedWell: '',
 areasForImprovement: '',
 wouldReturn: false,
 additionalComments: '',
 workEnvironmentRating: 3,
 managementRating: 3,
 compensationRating: 3,
 careerDevelopmentRating: 3,
 notes: ''
 });

 const localT = {
 title: t.hrModals.exitInterviewNotes,
 subtitle: t.hrModals.structuredExitFeedback,
 
 employeeInfo: t.hrModals.employeeInformation,
 staffId: t.hrModals.staffId,
 fullName: t.hrModals.fullName,
 position: t.hrModals.position,
 department: t.hrModals.department,
 
 interviewDate: t.hrModals.interviewDate,
 interviewedBy: t.hrModals.interviewedBy,
 interviewedByRole: t.hrModals.rolePosition,
 
 exitType: t.hrModals.exitType,
 resignation: t.hrModals.resignation,
 endOfContract: t.hrModals.endOfContract,
 termination: t.hrModals.termination,
 
 feedback: t.hrModals.exitFeedback,
 primaryReasonForLeaving: t.hrModals.primaryReasonForLeaving,
 whatWorkedWell: t.hrModals.whatWorkedWell,
 areasForImprovement: t.hrModals.areasForImprovement,
 wouldReturn: t.hrModals.wouldYouConsiderReturning,
 additionalComments: t.hrModals.additionalComments,
 
 ratings: t.hrModals.experienceRatings15,
 workEnvironment: t.hrModals.workEnvironment,
 management: t.hrModals.management,
 compensation: t.hrModals.compensation,
 careerDevelopment: t.hrModals.careerDevelopment,
 
 notes: t.hrModals.interviewerNotes,
 
 cancel: t.hrModals.cancel,
 save: t.hrModals.saveLock,
 required: t.hrModals.pleaseFillInAllRequiredFields,
 success: t.hrModals.exitInterviewSavedSuccessfully
 };

 const handleSave = () => {
 if (!formData.interviewedBy || !formData.interviewedByRole || 
 !formData.primaryReasonForLeaving || !formData.whatWorkedWell || !formData.areasForImprovement) {
 alert(localT.required);
 return;
 }
 
 const record = exitService.addExitInterview({
 staffId: employee.staffId,
 employeeName: employee.fullName,
 position: employee.position,
 department: employee.department,
 
 interviewDate: formData.interviewDate,
 interviewedBy: formData.interviewedBy,
 interviewedByRole: formData.interviewedByRole,
 exitType: formData.exitType,
 primaryReasonForLeaving: formData.primaryReasonForLeaving,
 whatWorkedWell: formData.whatWorkedWell,
 areasForImprovement: formData.areasForImprovement,
 wouldReturn: formData.wouldReturn,
 additionalComments: formData.additionalComments || undefined,
 workEnvironmentRating: formData.workEnvironmentRating,
 managementRating: formData.managementRating,
 compensationRating: formData.compensationRating,
 careerDevelopmentRating: formData.careerDevelopmentRating,
 notes: formData.notes || undefined,
 
 createdBy: 'Current User'
 });
 
 alert(localT.success);
 onSave(record);
 onClose();
 };

 return (
 <ModalOverlay onClose={onClose}>
 <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
 <div className="flex items-center gap-3">
 <MessageSquare className="w-6 h-6 text-purple-600" />
 <div>
 <h2 className="text-xl font-bold text-gray-900">{localT.title}</h2>
 <p className="text-sm text-gray-500">{localT.subtitle}</p>
 </div>
 </div>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-6 h-6" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto px-6 py-4">
 <div className="space-y-4">
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <h3 className="text-sm font-semibold text-blue-900 mb-2">{localT.employeeInfo}</h3>
 <div className="grid grid-cols-2 gap-2 text-sm">
 <div><span className="text-gray-600">{localT.staffId}:</span> <span className="font-medium">{employee.staffId}</span></div>
 <div><span className="text-gray-600">{localT.fullName}:</span> <span className="font-medium">{employee.fullName}</span></div>
 <div><span className="text-gray-600">{localT.position}:</span> <span className="font-medium">{employee.position}</span></div>
 <div><span className="text-gray-600">{localT.department}:</span> <span className="font-medium">{employee.department}</span></div>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.interviewDate} *</label>
 <input
 type="date"
 value={formData.interviewDate}
 onChange={(e) => setFormData({ ...formData, interviewDate: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.interviewedBy} *</label>
 <input
 type="text"
 value={formData.interviewedBy}
 onChange={(e) => setFormData({ ...formData, interviewedBy: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.interviewedByRole} *</label>
 <input
 type="text"
 value={formData.interviewedByRole}
 onChange={(e) => setFormData({ ...formData, interviewedByRole: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.exitType} *</label>
 <select
 value={formData.exitType}
 onChange={(e) => setFormData({ ...formData, exitType: e.target.value as any })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 >
 <option value="Resignation">{localT.resignation}</option>
 <option value="End of Contract">{localT.endOfContract}</option>
 <option value="Termination">{localT.termination}</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.primaryReasonForLeaving} *</label>
 <textarea
 value={formData.primaryReasonForLeaving}
 onChange={(e) => setFormData({ ...formData, primaryReasonForLeaving: e.target.value })}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.whatWorkedWell} *</label>
 <textarea
 value={formData.whatWorkedWell}
 onChange={(e) => setFormData({ ...formData, whatWorkedWell: e.target.value })}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.areasForImprovement} *</label>
 <textarea
 value={formData.areasForImprovement}
 onChange={(e) => setFormData({ ...formData, areasForImprovement: e.target.value })}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 {/* Ratings */}
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
 <h3 className="text-sm font-semibold text-gray-900">{localT.ratings}</h3>
 
 {[
 { key: 'workEnvironmentRating', label: localT.workEnvironment },
 { key: 'managementRating', label: localT.management },
 { key: 'compensationRating', label: localT.compensation },
 { key: 'careerDevelopmentRating', label: localT.careerDevelopment }
 ].map(({ key, label }) => (
 <div key={key} className="flex items-center justify-between">
 <span className="text-sm text-gray-700">{label}</span>
 <div className="flex gap-2">
 {[1, 2, 3, 4, 5].map(rating => (
 <button
 key={rating}
 onClick={() => setFormData({ ...formData, [key]: rating })}
 className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${ formData[key as keyof typeof formData] === rating ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300' }`}
 >
 {rating}
 </button>
 ))}
 </div>
 </div>
 ))}
 </div>

 <div className="flex items-center gap-3">
 <input
 type="checkbox"
 id="wouldReturn"
 checked={formData.wouldReturn}
 onChange={(e) => setFormData({ ...formData, wouldReturn: e.target.checked })}
 />
 <label htmlFor="wouldReturn" className="text-sm text-gray-700">{localT.wouldReturn}</label>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.additionalComments}</label>
 <textarea
 value={formData.additionalComments}
 onChange={(e) => setFormData({ ...formData, additionalComments: e.target.value })}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.notes}</label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={2}
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
 {localT.cancel}
 </button>
 <button
 onClick={handleSave}
 className={`flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700`}
 >
 <Save className="w-5 h-5" />
 <span>{localT.save}</span>
 </button>
 </div>
 </div>
 </ModalOverlay>
 );
}
