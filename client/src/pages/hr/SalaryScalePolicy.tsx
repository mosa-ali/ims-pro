/**
 * ============================================================================
 * SALARY SCALE POLICY TAB
 * ============================================================================
 * Document management for organizational salary scale policy files
 * ============================================================================
 */

import { useState, useRef } from 'react';
import { Upload, Download, Trash2, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface PolicyDocument {
 id: string;
 policyName: string;
 version: string;
 effectiveDate: string;
 uploadedBy: string;
 uploadDate: string;
 status: 'active' | 'archived';
 fileName: string;
 fileSize: number;
 fileType: string;
}

interface PolicyProps {
 language: string;
 isRTL: boolean;
 userName: string;
}

export function SalaryScalePolicy({
 language, isRTL, userName }: PolicyProps) {
 const { t } = useTranslation();
 const [documents, setDocuments] = useState<PolicyDocument[]>([]);
 const [showUploadModal, setShowUploadModal] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const localT = {
 title: t.hr.salaryScalePolicyDocuments,
 subtitle: t.hr.salaryScalePolicySubtitle,

 upload: t.hr.uploadPolicy,
 download: t.hr.download10,
 delete: t.hr.delete,
 archive: t.hr.archive,
 
 policyName: t.hr.policyName,
 version: t.hr.version,
 effectiveDate: t.hr.effectiveDate,
 uploadedBy: t.hr.uploadedBy,
 uploadDate: t.hr.uploadDate,
 status: t.hr.status,
 actions: t.hr.actions,
 fileName: t.hr.fileName,
 fileSize: t.hr.size,

 active: t.hr.active,
 archived: t.hr.archived,

 noDocuments: language === 'en'
 ? 'No policy documents uploaded yet. Upload your organization\'s salary scale policy.'
 : 'لم يتم رفع وثائق سياسة بعد. قم برفع سياسة جدول الرواتب الخاصة بمنظمتك.',

 businessRule: 'Business Rule: Only ONE Active policy allowed at a time',

 warningNote: 'Note: Payroll does NOT calculate from policy files. These are for reference and audit purposes only.',

 uploadNewPolicy: t.hr.uploadNewPolicy,
 selectFile: t.hr.selectFile,
 cancel: t.hr.cancel,
 uploadBtn: t.hr.upload,
 
 confirmArchive: 'Archive this policy? The current active policy will be archived and this will become active.',
 
 confirmDelete: 'Delete this policy document? This action cannot be undone.'
 };

 // Handle file upload
 const handleUpload = () => {
 fileInputRef.current?.click();
 };

 const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;

 // Archive current active policy
 const updatedDocs = documents.map(doc => 
 doc.status === 'active' ? { ...doc, status: 'archived' as const } : doc
 );

 // Add new policy
 const newPolicy: PolicyDocument = {
 id: Date.now().toString(),
 policyName: file.name.replace(/\.[^/.]+$/, ''),
 version: '1.0',
 effectiveDate: new Date().toISOString().split('T')[0],
 uploadedBy: userName,
 uploadDate: new Date().toISOString().split('T')[0],
 status: 'active',
 fileName: file.name,
 fileSize: file.size,
 fileType: file.type
 };

 setDocuments([...updatedDocs, newPolicy]);
 setShowUploadModal(false);
 
 if (fileInputRef.current) {
 fileInputRef.current.value = '';
 }
 };

 // Handle archive
 const handleArchive = (id: string) => {
 if (!confirm(localT.confirmArchive)) return;
 
 setDocuments(documents.map(doc =>
 doc.id === id ? { ...doc, status: 'archived' as const } : doc
 ));
 };

 // Handle delete
 const handleDelete = (id: string) => {
 if (!confirm(localT.confirmDelete)) return;
 
 setDocuments(documents.filter(doc => doc.id !== id));
 };

 // Format file size
 const formatFileSize = (bytes: number): string => {
 if (bytes < 1024) return bytes + ' B';
 if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
 return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
 };

 // Get status color
 const getStatusColor = (status: string) => {
 return status === 'active' 
 ? 'bg-green-50 text-green-700 border-green-200'
 : 'bg-gray-50 text-gray-600 border-gray-200';
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Hidden file input */}
 <input
 ref={fileInputRef}
 type="file"
 accept=".pdf,.doc,.docx"
 onChange={handleFileChange}
 className="hidden"
 />

 {/* Header */}
 <div className={`flex items-start justify-between gap-4`}>
 <div className={'text-start'}>
 <h3 className="text-xl font-bold text-gray-900">{localT.title}</h3>
 <p className="text-sm text-gray-600 mt-1">{localT.subtitle}</p>
 </div>

 <button
 onClick={handleUpload}
 className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors`}
 >
 <Upload className="w-4 h-4" />
 <span>{localT.upload}</span>
 </button>
 </div>

 {/* Business Rule Alert */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <div className={`flex items-center gap-3`}>
 <AlertCircle className="w-5 h-5 text-blue-600" />
 <div className={`flex-1 text-start`}>
 <p className="text-sm font-medium text-blue-900">{localT.businessRule}</p>
 <p className="text-xs text-blue-700 mt-1">{localT.warningNote}</p>
 </div>
 </div>
 </div>

 {/* Documents List */}
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 {documents.length === 0 ? (
 <div className="px-6 py-12 text-center text-gray-500">
 <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
 <p>{localT.noDocuments}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-sm font-semibold text-gray-700 text-start`}>{localT.policyName}</th>
 <th className={`px-4 py-3 text-sm font-semibold text-gray-700 text-start`}>{localT.version}</th>
 <th className={`px-4 py-3 text-sm font-semibold text-gray-700 text-start`}>{localT.effectiveDate}</th>
 <th className={`px-4 py-3 text-sm font-semibold text-gray-700 text-start`}>{localT.uploadedBy}</th>
 <th className={`px-4 py-3 text-sm font-semibold text-gray-700 text-start`}>{localT.uploadDate}</th>
 <th className={`px-4 py-3 text-sm font-semibold text-gray-700 text-start`}>{localT.fileSize}</th>
 <th className="px-4 py-3 text-sm font-semibold text-gray-700 text-center">{localT.status}</th>
 <th className="px-4 py-3 text-sm font-semibold text-gray-700 text-center">{localT.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {documents.map((doc) => (
 <tr key={doc.id} className="hover:bg-gray-50">
 <td className="px-4 py-3">
 <div className="flex items-center gap-2">
 <FileText className="w-5 h-5 text-blue-600" />
 <div>
 <div className="text-sm font-medium text-gray-900">{doc.policyName}</div>
 <div className="text-xs text-gray-500">{doc.fileName}</div>
 </div>
 </div>
 </td>
 <td className="px-4 py-3 text-sm text-gray-700">{doc.version}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{doc.effectiveDate}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{doc.uploadedBy}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{doc.uploadDate}</td>
 <td className="px-4 py-3 text-sm text-gray-600">{formatFileSize(doc.fileSize)}</td>
 <td className="px-4 py-3 text-center">
 <span className={`inline-block px-3 py-1 rounded border text-xs font-medium ${getStatusColor(doc.status)}`}>
 {doc.status === 'active' ? (
 <span className="flex items-center gap-1">
 <CheckCircle className="w-3 h-3" />
 {localT.active}
 </span>
 ) : (
 localT.archived
 )}
 </span>
 </td>
 <td className="px-4 py-3">
 <div className="flex items-center justify-center gap-2">
 <button
 className="text-blue-600 hover:text-blue-700 p-1"
 title={localT.download}
 >
 <Download className="w-4 h-4" />
 </button>
 {doc.status === 'active' && (
 <button
 onClick={() => handleArchive(doc.id)}
 className="text-amber-600 hover:text-amber-700 p-1"
 title={localT.archive}
 >
 <FileText className="w-4 h-4" />
 </button>
 )}
 <button
 onClick={() => handleDelete(doc.id)}
 className="text-red-600 hover:text-red-700 p-1"
 title={localT.delete}
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 );
}
