/**
 * ============================================================================
 * SALARY SCALE POLICY TAB
 * ============================================================================
 * Document management for organizational salary scale policy files
 * ============================================================================
 */

import { useState, useRef } from 'react';
import { Upload, Download, Trash2, FileText, AlertCircle, CheckCircle } from 'lucide-react';

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

export function SalaryScalePolicy({ language, isRTL, userName }: PolicyProps) {
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = {
    title: language === 'en' ? 'Salary Scale Policy Documents' : 'وثائق سياسة جدول الرواتب',
    subtitle: language === 'en'
      ? 'Official salary scale policy documents at organization level'
      : 'وثائق سياسة جدول الرواتب الرسمية على مستوى المنظمة',

    upload: language === 'en' ? 'Upload Policy' : 'رفع سياسة',
    download: language === 'en' ? 'Download' : 'تنزيل',
    delete: language === 'en' ? 'Delete' : 'حذف',
    archive: language === 'en' ? 'Archive' : 'أرشفة',
    
    policyName: language === 'en' ? 'Policy Name' : 'اسم السياسة',
    version: language === 'en' ? 'Version' : 'النسخة',
    effectiveDate: language === 'en' ? 'Effective Date' : 'تاريخ السريان',
    uploadedBy: language === 'en' ? 'Uploaded By' : 'رفع بواسطة',
    uploadDate: language === 'en' ? 'Upload Date' : 'تاريخ الرفع',
    status: language === 'en' ? 'Status' : 'الحالة',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    fileName: language === 'en' ? 'File Name' : 'اسم الملف',
    fileSize: language === 'en' ? 'Size' : 'الحجم',

    active: language === 'en' ? 'Active' : 'نشط',
    archived: language === 'en' ? 'Archived' : 'مؤرشف',

    noDocuments: language === 'en'
      ? 'No policy documents uploaded yet. Upload your organization\'s salary scale policy.'
      : 'لم يتم رفع وثائق سياسة بعد. قم برفع سياسة جدول الرواتب الخاصة بمنظمتك.',

    businessRule: language === 'en'
      ? 'Business Rule: Only ONE Active policy allowed at a time'
      : 'قاعدة العمل: يُسمح بسياسة نشطة واحدة فقط في وقت واحد',

    warningNote: language === 'en'
      ? 'Note: Payroll does NOT calculate from policy files. These are for reference and audit purposes only.'
      : 'ملاحظة: كشف الرواتب لا يحسب من ملفات السياسة. هذه للمرجعية وأغراض التدقيق فقط.',

    uploadNewPolicy: language === 'en' ? 'Upload New Policy' : 'رفع سياسة جديدة',
    selectFile: language === 'en' ? 'Select File' : 'اختر ملف',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    uploadBtn: language === 'en' ? 'Upload' : 'رفع',
    
    confirmArchive: language === 'en'
      ? 'Archive this policy? The current active policy will be archived and this will become active.'
      : 'أرشفة هذه السياسة؟ ستتم أرشفة السياسة النشطة الحالية وستصبح هذه نشطة.',
    
    confirmDelete: language === 'en'
      ? 'Delete this policy document? This action cannot be undone.'
      : 'حذف وثيقة السياسة هذه؟ لا يمكن التراجع عن هذا الإجراء.'
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
    if (!confirm(t.confirmArchive)) return;
    
    setDocuments(documents.map(doc =>
      doc.id === id ? { ...doc, status: 'archived' as const } : doc
    ));
  };

  // Handle delete
  const handleDelete = (id: string) => {
    if (!confirm(t.confirmDelete)) return;
    
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
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className={`flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h3 className="text-xl font-bold text-gray-900">{t.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
        </div>

        <button
          onClick={handleUpload}
          className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Upload className="w-4 h-4" />
          <span>{t.upload}</span>
        </button>
      </div>

      {/* Business Rule Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <AlertCircle className="w-5 h-5 text-blue-600" />
          <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="text-sm font-medium text-blue-900">{t.businessRule}</p>
            <p className="text-xs text-blue-700 mt-1">{t.warningNote}</p>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {documents.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>{t.noDocuments}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">{t.policyName}</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">{t.version}</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">{t.effectiveDate}</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">{t.uploadedBy}</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">{t.uploadDate}</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">{t.fileSize}</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700 text-center">{t.status}</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700 text-center">{t.actions}</th>
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
                            {t.active}
                          </span>
                        ) : (
                          t.archived
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title={t.download}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {doc.status === 'active' && (
                          <button
                            onClick={() => handleArchive(doc.id)}
                            className="text-amber-600 hover:text-amber-700 p-1"
                            title={t.archive}
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-600 hover:text-red-700 p-1"
                          title={t.delete}
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
