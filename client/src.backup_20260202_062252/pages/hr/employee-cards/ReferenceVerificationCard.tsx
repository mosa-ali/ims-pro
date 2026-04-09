/**
 * ============================================================================
 * 8. REFERENCE & VERIFICATION CARD
 * ============================================================================
 * 
 * ✅ CONTROLLED INPUT (Upload-Only)
 * - NOT Read-Only - Uploads allowed
 * - External reference forms from UN, NGOs, banks, embassies, etc.
 * - Forms are filled externally, signed, and returned to HR
 * - System stores official documents
 * - Factual information only (no evaluation)
 * 
 * ============================================================================
 */

import { FileCheck, Printer, Upload, Download, FileText } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { useState, useEffect } from 'react';
import { ReferenceSummaryModal } from '../modals/ReferenceSummaryModal';
import { ReferenceUploadModal } from '../modals/ReferenceUploadModal';
import { referenceUploadService, ReferenceUpload } from '@/app/services/referenceUploadService';

interface Props {
  employee: StaffMember;
  language: string;
  isRTL: boolean;
}

export function ReferenceVerificationCard({ employee, language, isRTL }: Props) {
  const [uploads, setUploads] = useState<ReferenceUpload[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    loadUploads();
  }, [employee]);

  const loadUploads = () => {
    const data = referenceUploadService.getByStaffId(employee.staffId);
    setUploads(data);
  };

  const t = {
    title: language === 'en' ? 'Reference & Verification' : 'المراجع والتحقق',
    subtitle: language === 'en' ? 'Employment verification and references' : 'التحقق من التوظيف والمراجع',
    generateReference: language === 'en' ? 'Generate Reference Summary' : 'إنشاء ملخص المرجع',
    uploadReference: language === 'en' ? 'Upload Reference Form' : 'تحميل نموذج المرجع',
    
    employmentHistory: language === 'en' ? 'Employment History' : 'سجل التوظيف',
    employmentPeriod: language === 'en' ? 'Employment Period' : 'فترة التوظيف',
    lastPosition: language === 'en' ? 'Last Position' : 'آخر منصب',
    department: language === 'en' ? 'Department' : 'القسم',
    supervisor: language === 'en' ? 'Supervisor at Exit' : 'المشرف عند المغادرة',
    finalStatus: language === 'en' ? 'Final Status' : 'الحالة النهائية',
    
    uploadedReferences: language === 'en' ? 'Uploaded Reference Requests' : 'طلبات المراجع المحملة',
    noUploads: language === 'en' ? 'No reference forms uploaded yet' : 'لم يتم تحميل نماذج المراجع بعد',
    requestingOrg: language === 'en' ? 'Requesting Organization' : 'المنظمة الطالبة',
    referenceType: language === 'en' ? 'Reference Type' : 'نوع المرجع',
    dateRequested: language === 'en' ? 'Date Requested' : 'تاريخ الطلب',
    dateIssued: language === 'en' ? 'Date Issued' : 'تاريخ الإصدار',
    uploadedBy: language === 'en' ? 'Uploaded By' : 'تم التحميل بواسطة',
    uploadDate: language === 'en' ? 'Upload Date' : 'تاريخ التحميل',
    download: language === 'en' ? 'Download' : 'تحميل',
    
    note: language === 'en' 
      ? '📌 This section contains factual information only (no evaluation)'
      : '📌 يحتوي هذا القسم على معلومات واقعية فقط (بدون تقييم)'
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getReferenceTypeColor = (type: string) => {
    switch (type) {
      case 'Employment': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Salary': return 'bg-green-100 text-green-700 border-green-200';
      case 'Conduct': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'General': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h3 className="text-lg font-semibold text-gray-900">{t.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button 
            className={`flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 ${isRTL ? 'flex-row-reverse' : ''}`}
            onClick={() => setShowUploadModal(true)}
          >
            <Upload className="w-4 h-4" />
            <span>{t.uploadReference}</span>
          </button>
          <button 
            className={`flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${isRTL ? 'flex-row-reverse' : ''}`}
            onClick={() => setIsPrinting(true)}
          >
            <Printer className="w-4 h-4" />
            <span>{t.generateReference}</span>
          </button>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Employment History Summary */}
        <div className={`p-4 bg-gray-50 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">{t.employmentHistory}</h4>
          <div className="space-y-2">
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{t.employmentPeriod}:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatDate(employee.hireDate)} - {formatDate(employee.contractEndDate)}
              </span>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{t.lastPosition}:</span>
              <span className="text-sm font-medium text-gray-900">{employee.position}</span>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{t.department}:</span>
              <span className="text-sm font-medium text-gray-900">{employee.department}</span>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{t.supervisor}:</span>
              <span className="text-sm font-medium text-gray-900">
                {employee.supervisor || (language === 'en' ? 'Not assigned' : 'غير معين')}
              </span>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{t.finalStatus}:</span>
              <span className="text-sm font-medium text-green-600">
                {employee.status === 'active' ? (language === 'en' ? 'Currently Active' : 'نشط حالياً') : employee.status}
              </span>
            </div>
          </div>
        </div>

        {/* Uploaded Reference Forms */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">{t.uploadedReferences}</h4>
          {uploads.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{t.noUploads}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {uploads.map((upload) => (
                <div key={upload.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">{upload.fileName}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getReferenceTypeColor(upload.referenceType)}`}>
                          {upload.referenceType}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">
                        <span className="font-medium">{t.requestingOrg}:</span> {upload.requestingOrganization}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{t.dateRequested}: {formatDate(upload.dateRequested)}</span>
                        {upload.dateIssued && (
                          <span>{t.dateIssued}: {formatDate(upload.dateIssued)}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {t.uploadedBy}: {upload.uploadedBy} • {formatDate(upload.uploadDate)}
                      </p>
                    </div>
                    <button
                      className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded"
                      title={t.download}
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className={`text-sm text-blue-800 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.note}
          </p>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <ReferenceUploadModal
          employee={employee}
          onClose={() => setShowUploadModal(false)}
          onUpload={() => {
            loadUploads();
            setShowUploadModal(false);
          }}
        />
      )}

      {/* Reference Summary Modal */}
      {isPrinting && (
        <ReferenceSummaryModal
          employee={employee}
          language={language}
          isRTL={isRTL}
          onClose={() => setIsPrinting(false)}
        />
      )}
    </div>
  );
}