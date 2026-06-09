import { useState } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDocumentService } from '@/hooks/useDocumentService';
import { DocumentModuleType, DocumentType, MODULE_FOLDER_ROUTING } from '@/types/document.types';
import { useTranslation } from '@/i18n/useTranslation';

interface DocumentUploadModalProps {
 isOpen: boolean;
 onClose: () => void;
 projectId: string;
 projectCode: string;
 projectName: string;
 moduleContext: string; // e.g., 'project_details', 'finance', 'meal'
 onUploadComplete?: () => void;
}

export function DocumentUploadModal({
 isOpen,
 onClose,
 projectId,
 projectCode,
 projectName,
 moduleContext,
 onUploadComplete
}: DocumentUploadModalProps) {
 const { t } = useTranslation();
 const { isRTL } = useLanguage();
 const { uploadDocument } = useDocumentService();
 
 const [selectedFile, setSelectedFile] = useState<File | null>(null);
 const [documentType, setDocumentType] = useState<DocumentType>('OTHER');
 const [description, setDescription] = useState('');
 const [uploading, setUploading] = useState(false);

 // Get target folder based on module context
 const targetModuleType: DocumentModuleType = MODULE_FOLDER_ROUTING[moduleContext] || '99_Other';

 const labels = {
 title: t.documents.uploadDocument,
 project: t.documents.project,
 targetFolder: t.documents.targetFolder,
 selectFile: t.documents.selectFile,
 documentType: t.documents.documentType,
 description: t.documents.description,
 descriptionPlaceholder: t.documents.optionalDocumentDescription,
 upload: t.documents.upload,
 cancel: t.documents.cancel,
 uploading: t.documents.uploading,
 noFileSelected: t.documents.noFileSelected,
 dragDrop: t.documents.dragAndDropFileHereOr,
 autoRouting: t.documents.fileWillBeAutomaticallyStoredIn
 };

 const documentTypes = [
 { value: 'PROJECT_PROPOSAL', label: t.documents.projectProposal },
 { value: 'GRANT_AGREEMENT', label: t.documents.grantAgreement },
 { value: 'BUDGET', label: t.documents.budget },
 { value: 'FINANCIAL_REPORT', label: t.documents.financialReport },
 { value: 'PROGRESS_REPORT', label: t.documents.progressReport },
 { value: 'PROCUREMENT_PLAN', label: t.documents.procurementPlan },
 { value: 'CONTRACT', label: t.documents.contract },
 { value: 'INDICATOR_DATA', label: t.documents.indicatorData },
 { value: 'CASE_FILE', label: t.documents.caseFile },
 { value: 'HR_DOCUMENT', label: t.documents.hrDocument },
 { value: 'OTHER', label: t.documents.other }
 ];

 const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files && e.target.files[0]) {
 setSelectedFile(e.target.files[0]);
 }
 };

 const handleUpload = async (e: React.FormEvent) => {
 e.preventDefault();
 
 if (!selectedFile) {
 alert(labels.noFileSelected);
 return;
 }

 setUploading(true);
 
 try {
 const uploadedDoc = uploadDocument(
 selectedFile,
 projectId,
 targetModuleType,
 documentType as DocumentType,
 'Current User', // TODO: Get from auth context
 description || undefined
 );

 alert(`✅ ${t.documents.documentUploadedSuccessfully}!\n${uploadedDoc.name}`);
 
 // Reset and close
 setSelectedFile(null);
 setDescription('');
 setDocumentType('OTHER');
 onUploadComplete?.();
 onClose();
 } catch (error) {
 console.error('Upload failed:', error);
 alert(`❌ ${t.documents.uploadFailed}: ${error}`);
 } finally {
 setUploading(false);
 }
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
 <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
 
 {/* Header */}
 <div className={`flex items-center justify-between p-6 border-b border-gray-200`}>
 <h2 className="text-xl font-semibold text-gray-900">{labels.title}</h2>
 <button
 onClick={onClose}
 className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
 disabled={uploading}
 >
 <X className="w-5 h-5 text-gray-600" />
 </button>
 </div>

 {/* Body */}
 <form onSubmit={handleUpload} className="p-6 space-y-6">
 
 {/* Project Info */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <div className={`flex items-center gap-2 mb-2`}>
 <FileText className="w-4 h-4 text-blue-600" />
 <span className="text-sm font-medium text-blue-900">{labels.project}</span>
 </div>
 <p className={`text-sm text-blue-800 text-start`}>
 {projectCode} - {projectName}
 </p>
 </div>

 {/* Auto-routing notice */}
 <div className="bg-green-50 border border-green-200 rounded-lg p-4">
 <div className={`flex items-start gap-2`}>
 <AlertCircle className="w-4 h-4 text-green-600 mt-0.5" />
 <div className={'text-start'}>
 <p className="text-sm font-medium text-green-900 mb-1">{labels.targetFolder}</p>
 <p className="text-sm text-green-800">{targetModuleType}</p>
 <p className="text-xs text-green-700 mt-1">{labels.autoRouting}</p>
 </div>
 </div>
 </div>

 {/* File Input */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {labels.selectFile} *
 </label>
 <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
 <input
 type="file"
 onChange={handleFileSelect}
 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
 disabled={uploading}
 />
 <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
 <p className="text-sm text-gray-600 mb-2">{labels.dragDrop}</p>
 {selectedFile && (
 <div className={`mt-4 inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-md`}>
 <FileText className="w-4 h-4 text-blue-600" />
 <span className="text-sm text-blue-900 font-medium">{selectedFile.name}</span>
 </div>
 )}
 </div>
 </div>

 {/* Document Type */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {labels.documentType} *
 </label>
 <select
 value={documentType}
 onChange={(e) => setDocumentType(e.target.value as DocumentType)}
 className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 disabled={uploading}
 >
 {documentTypes.map((dt) => (
 <option key={dt.value} value={dt.value}>
 {dt.label}
 </option>
 ))}
 </select>
 </div>

 {/* Description */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {labels.description}
 </label>
 <textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 rows={3}
 className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 placeholder={labels.descriptionPlaceholder}
 disabled={uploading}
 />
 </div>

 {/* Actions */}
 <div className={`flex items-center gap-3 pt-4`}>
 <button
 type="submit"
 disabled={!selectedFile || uploading}
 className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2`}
 >
 {uploading ? (
 <>
 <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
 {labels.uploading}
 </>
 ) : (
 <>
 <Upload className="w-4 h-4" />
 {labels.upload}
 </>
 )}
 </button>
 
 <button
 type="button"
 onClick={onClose}
 disabled={uploading}
 className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
 >
 {labels.cancel}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}
