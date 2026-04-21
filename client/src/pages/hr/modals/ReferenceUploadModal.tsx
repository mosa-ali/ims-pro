/**
 * ============================================================================
 * REFERENCE UPLOAD MODAL - Upload External Reference Forms
 * ============================================================================
 * 
 * ✅ HR Manager / Admin Only
 * ✅ Upload signed reference forms from external organizations
 * ✅ No editing after upload
 * ============================================================================
 */

import { useState } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { StaffMember } from '../types/hrTypes';
import { referenceUploadService, ReferenceType } from '@/app/services/referenceUploadService';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 employee: StaffMember;
 onClose: () => void;
 onUpload: () => void;
}

export function ReferenceUploadModal({
 employee, onClose, onUpload }: Props) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 
 const [formData, setFormData] = useState({
 requestingOrganization: '',
 referenceType: 'Employment' as ReferenceType,
 dateRequested: new Date().toISOString().split('T')[0],
 dateIssued: '',
 notes: '',
 expiryDate: ''
 });

 const [selectedFile, setSelectedFile] = useState<File | null>(null);
 const [uploading, setUploading] = useState(false);

 const localT = {
 title: t.hrModals.uploadReferenceVerificationForm,
 subtitle: t.hrModals.hrManagerAdminOnly,
 
 employeeInfo: t.hrModals.employeeInformation,
 staffId: t.hrModals.staffId,
 fullName: t.hrModals.fullName,
 
 requestingOrganization: t.hrModals.requestingOrganization,
 requestingOrgPlaceholder: t.hrModals.egUnhcrWorldBankEmbassyOf,
 
 referenceType: t.hrModals.referenceType,
 employment: t.hrModals.employment,
 salary: t.hrModals.salary,
 conduct: t.hrModals.conduct,
 general: t.hrModals.general,
 
 dateRequested: t.hrModals.dateRequested,
 dateIssued: t.hrModals.dateIssuedOptional,
 expiryDate: t.hrModals.expiryDateOptional,
 
 uploadFile: t.hrModals.uploadReferenceDocument,
 selectFile: t.hrModals.selectFile,
 fileFormats: 'PDF, DOC, DOCX',
 noFileSelected: t.hrModals.noFileSelected,
 
 notes: t.hrModals.notesOptional,
 
 cancel: t.hrModals.cancel,
 uploadBtn: t.hrModals.uploadSave,
 uploading: t.hrModals.uploading,
 required: t.hrModals.pleaseFillInAllRequiredFields15,
 success: t.hrModals.referenceDocumentUploadedSuccessfully,
 
 infoNote: '💡 Upload signed reference forms received from external organizations. These documents cannot be edited after upload.'
 };

 const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (file) {
 // Check file type
 const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
 if (!validTypes.includes(file.type)) {
 alert(t.hrModals.invalidFileTypePleaseUploadPdf);
 return;
 }
 
 // Check file size (max 10MB)
 if (file.size > 10 * 1024 * 1024) {
 alert(t.hrModals.fileTooLargeMaximumSizeIs);
 return;
 }
 
 setSelectedFile(file);
 }
 };

 const handleUpload = async () => {
 // Validation
 if (!formData.requestingOrganization || !selectedFile) {
 alert(localT.required);
 return;
 }
 
 setUploading(true);
 
 try {
 // In a real app, this would upload to a file storage service
 // For now, we'll simulate with base64 or file name
 const fileUrl = `uploads/${selectedFile.name}`; // Simulated URL
 
 referenceUploadService.add({
 staffId: employee.staffId,
 employeeName: employee.fullName,
 requestingOrganization: formData.requestingOrganization,
 referenceType: formData.referenceType,
 dateRequested: formData.dateRequested,
 dateIssued: formData.dateIssued || undefined,
 fileName: selectedFile.name,
 fileType: selectedFile.type,
 fileSize: selectedFile.size,
 fileUrl: fileUrl,
 uploadedBy: 'Current User', // TODO: Replace with actual user
 notes: formData.notes || undefined,
 expiryDate: formData.expiryDate || undefined
 });
 
 alert(localT.success);
 onUpload();
 onClose();
 } catch (error) {
 alert(t.hrModals.uploadFailedPleaseTryAgain);
 } finally {
 setUploading(false);
 }
 };

 return (
 <ModalOverlay onClose={onClose}>
 <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-blue-50">
 <div className="flex items-center gap-3">
 <Upload className="w-6 h-6 text-blue-600" />
 <div>
 <h2 className="text-xl font-bold text-gray-900">{localT.title}</h2>
 <p className="text-sm text-blue-600">{localT.subtitle}</p>
 </div>
 </div>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-6 h-6" />
 </button>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto px-6 py-4">
 <div className="space-y-4">
 {/* Info Note */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
 <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
 <p className="text-sm text-blue-800">{localT.infoNote}</p>
 </div>

 {/* Employee Info */}
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <h3 className="text-sm font-semibold text-gray-900 mb-2">{localT.employeeInfo}</h3>
 <div className="grid grid-cols-2 gap-2 text-sm">
 <div><span className="text-gray-600">{localT.staffId}:</span> <span className="font-medium">{employee.staffId}</span></div>
 <div><span className="text-gray-600">{localT.fullName}:</span> <span className="font-medium">{employee.fullName}</span></div>
 </div>
 </div>

 {/* Requesting Organization */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.requestingOrganization} *</label>
 <input
 type="text"
 value={formData.requestingOrganization}
 onChange={(e) => setFormData({ ...formData, requestingOrganization: e.target.value })}
 placeholder={localT.requestingOrgPlaceholder}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>

 {/* Reference Type & Date Requested */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.referenceType} *</label>
 <select
 value={formData.referenceType}
 onChange={(e) => setFormData({ ...formData, referenceType: e.target.value as ReferenceType })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 >
 <option value="Employment">{localT.employment}</option>
 <option value="Salary">{localT.salary}</option>
 <option value="Conduct">{localT.conduct}</option>
 <option value="General">{localT.general}</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.dateRequested} *</label>
 <input
 type="date"
 value={formData.dateRequested}
 onChange={(e) => setFormData({ ...formData, dateRequested: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>

 {/* Date Issued & Expiry Date */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.dateIssued}</label>
 <input
 type="date"
 value={formData.dateIssued}
 onChange={(e) => setFormData({ ...formData, dateIssued: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.expiryDate}</label>
 <input
 type="date"
 value={formData.expiryDate}
 onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>

 {/* File Upload */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.uploadFile} *</label>
 <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
 <div className="flex flex-col items-center gap-3">
 <FileText className="w-12 h-12 text-gray-400" />
 
 <div className="text-center">
 <label className="cursor-pointer">
 <span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block">
 {localT.selectFile}
 </span>
 <input
 type="file"
 accept=".pdf,.doc,.docx"
 onChange={handleFileSelect}
 className="hidden"
 />
 </label>
 <p className="text-xs text-gray-500 mt-2">{localT.fileFormats}</p>
 </div>
 
 {selectedFile ? (
 <div className="mt-2 text-sm">
 <p className="font-medium text-green-600">✓ {selectedFile.name}</p>
 <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
 </div>
 ) : (
 <p className="text-sm text-gray-500">{localT.noFileSelected}</p>
 )}
 </div>
 </div>
 </div>

 {/* Notes */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{localT.notes}</label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>
 </div>

 {/* Footer */}
 <div className={`flex items-center gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50`}>
 <button
 onClick={onClose}
 className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
 disabled={uploading}
 >
 {localT.cancel}
 </button>
 <button
 onClick={handleUpload}
 disabled={uploading || !selectedFile}
 className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed`}
 >
 <Upload className="w-5 h-5" />
 <span>{uploading ? localT.uploading : localT.uploadBtn}</span>
 </button>
 </div>
 </div>
 </ModalOverlay>
 );
}
