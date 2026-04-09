/**
 * ============================================================================
 * DISCIPLINARY LETTER PRINT MODAL - Official Disciplinary Action Document
 * ============================================================================
 * ✅ USES OFFICIAL DOCUMENT TEMPLATE (Global Standard)
 * ✅ A4 Layout, print-optimized
 * ✅ Organization branding from System Settings
 * ============================================================================
 */

import { X, Printer } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { DisciplinaryRecord } from '@/app/services/disciplinaryService';
import { useState, useEffect } from 'react';

interface Props {
  disciplinary: DisciplinaryRecord;
  onClose: () => void;
}

export function DisciplinaryLetterPrintModal({ disciplinary, onClose }: Props) {
  const [employee, setEmployee] = useState<StaffMember | null>(null);
  const [language] = useState('en');
  const [isRTL] = useState(false);

  useEffect(() => {
    const emp = staffService.getByStaffId(disciplinary.staffId);
    if (emp) setEmployee(emp);
  }, [disciplinary]);

  if (!employee) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Minor': return 'text-yellow-700 bg-yellow-100';
      case 'Major': return 'text-orange-700 bg-orange-100';
      case 'Severe': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const t = {
    title: language === 'en' ? 'Disciplinary Action Letter' : 'خطاب إجراء تأديبي',
    
    ref: language === 'en' ? 'Reference' : 'المرجع',
    date: language === 'en' ? 'Date' : 'التاريخ',
    to: language === 'en' ? 'TO' : 'إلى',
    subject: language === 'en' ? 'SUBJECT' : 'الموضوع',
    
    incidentDetails: language === 'en' ? 'Incident Details' : 'تفاصيل الحادثة',
    incidentDate: language === 'en' ? 'Incident Date' : 'تاريخ الحادثة',
    severity: language === 'en' ? 'Severity' : 'الخطورة',
    stage: language === 'en' ? 'Disciplinary Stage' : 'المرحلة التأديبية',
    
    description: language === 'en' ? 'Description of Incident' : 'وصف الحادثة',
    actionTaken: language === 'en' ? 'Action Taken' : 'الإجراء المتخذ',
    consequences: language === 'en' ? 'Consequences of Repeated Violations' : 'عواقب الانتهاكات المتكررة',
    
    opening: language === 'en'
      ? 'This letter serves as a formal notice of disciplinary action taken against you for the incident described below.'
      : 'يُعتبر هذا الخطاب إشعارًا رسميًا بالإجراء التأديبي المتخذ ضدك بشأن الحادثة الموضحة أدناه.',
    
    acknowledgement: language === 'en'
      ? 'You are required to acknowledge receipt of this letter within 3 business days. You have the right to appeal this decision within 7 business days.'
      : 'يُطلب منك الإقرار باستلام هذا الخطاب خلال 3 أيام عمل. لديك الحق في استئناف هذا القرار خلال 7 أيام عمل.',
    
    signatures: language === 'en' ? 'Signatures' : 'التوقيعات',
    issuedBy: language === 'en' ? 'Issued By' : 'صادر عن',
    acknowledgedBy: language === 'en' ? 'Acknowledged By' : 'تم الاطلاع عليه من قبل',
    witness: language === 'en' ? 'Witness (HR)' : 'شاهد (الموارد البشرية)',
    
    print: language === 'en' ? 'Print' : 'طباعة',
    close: language === 'en' ? 'Close' : 'إغلاق'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header (Print Hidden) */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-red-50 print:hidden">
          <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Printer className="w-4 h-4" />
              <span>{t.print}</span>
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-[210mm] mx-auto bg-white print:p-0">
            
            {/* Letter Header */}
            <div className="mb-8">
              <div className="flex justify-between items-start mb-4 text-sm">
                <div>
                  <strong>{t.ref}:</strong> DISC-{disciplinary.id}-{new Date(disciplinary.incidentDate).getFullYear()}
                </div>
                <div>
                  <strong>{t.date}:</strong> {formatDate(disciplinary.actionDate)}
                </div>
              </div>
            </div>

            {/* Recipient */}
            <div className="mb-8">
              <p className="font-bold text-lg mb-2">{t.to}:</p>
              <p className="text-gray-900 font-medium">{employee.fullName}</p>
              <p className="text-gray-700">{employee.position}</p>
              <p className="text-gray-700">{employee.department}</p>
              <p className="text-gray-700">{language === 'en' ? 'Staff ID' : 'رقم الموظف'}: {employee.staffId}</p>
            </div>

            {/* Subject */}
            <div className="mb-8">
              <p className="font-bold text-lg mb-2">{t.subject}:</p>
              <p className="text-gray-900 font-semibold uppercase">{t.title}</p>
            </div>

            {/* Opening Statement */}
            <div className="mb-8">
              <p className="text-sm leading-relaxed text-gray-800">{t.opening}</p>
            </div>

            {/* Incident Details Box */}
            <div className="mb-8 border-2 border-red-300 rounded-lg p-6 bg-red-50">
              <h3 className="text-lg font-bold text-red-900 mb-4">{t.incidentDetails}</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">{t.incidentDate}:</span>
                  <p className="text-sm text-gray-900 font-semibold">{formatDate(disciplinary.incidentDate)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">{t.severity}:</span>
                  <p className={`inline-block px-3 py-1 rounded font-bold text-sm ${getSeverityColor(disciplinary.severity)}`}>
                    {disciplinary.severity}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">{t.stage}:</span>
                  <p className="text-sm text-gray-900 font-semibold">{disciplinary.disciplinaryStage}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{t.description}:</h4>
                <div className="bg-white border border-red-200 rounded p-3 text-sm text-gray-800 whitespace-pre-wrap">
                  {disciplinary.description}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{t.actionTaken}:</h4>
                <div className="bg-white border border-red-200 rounded p-3 text-sm text-gray-800 whitespace-pre-wrap">
                  {disciplinary.actionTaken}
                </div>
              </div>
            </div>

            {/* Consequences Warning */}
            <div className="mb-8 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <h4 className="text-sm font-bold text-yellow-900 mb-2">{t.consequences}:</h4>
              <p className="text-sm text-yellow-800">
                {language === 'en'
                  ? 'Further violations of company policies may result in more severe disciplinary action, up to and including termination of employment.'
                  : 'قد تؤدي الانتهاكات الإضافية لسياسات الشركة إلى إجراءات تأديبية أكثر صرامة، بما في ذلك إنهاء التوظيف.'}
              </p>
            </div>

            {/* Acknowledgement Requirement */}
            <div className="mb-8 bg-blue-50 border border-blue-300 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-medium">{t.acknowledgement}</p>
            </div>

            {/* Signatures */}
            <div className="mt-12 pt-8 border-t-2 border-gray-300">
              <h3 className="text-sm font-bold text-gray-900 mb-6">{t.signatures}</h3>
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <div className="h-16 mb-2"></div>
                  <div className="border-t-2 border-gray-400 pt-2">
                    <p className="text-xs font-semibold text-gray-900">{t.issuedBy}</p>
                    <p className="text-xs text-gray-600 mt-1">{disciplinary.reportedBy}</p>
                    <p className="text-xs text-gray-500">{t.date}: {formatDate(disciplinary.actionDate)}</p>
                  </div>
                </div>
                <div>
                  <div className="h-16 mb-2"></div>
                  <div className="border-t-2 border-gray-400 pt-2">
                    <p className="text-xs font-semibold text-gray-900">{t.acknowledgedBy}</p>
                    <p className="text-xs text-gray-600 mt-1">{employee.fullName}</p>
                    <p className="text-xs text-gray-500">{t.date}: _______________</p>
                  </div>
                </div>
                <div>
                  <div className="h-16 mb-2"></div>
                  <div className="border-t-2 border-gray-400 pt-2">
                    <p className="text-xs font-semibold text-gray-900">{t.witness}</p>
                    <p className="text-xs text-gray-600 mt-1">{language === 'en' ? 'HR Manager' : 'مدير الموارد البشرية'}</p>
                    <p className="text-xs text-gray-500">{t.date}: _______________</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-8 pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">
                {language === 'en'
                  ? 'This is an official HR document. Please retain for your records.'
                  : 'هذه وثيقة رسمية للموارد البشرية. يرجى الاحتفاظ بها في سجلاتك.'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions (Print Hidden) */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Printer className="w-5 h-5" />
            <span>{t.print}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {t.close}
          </button>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          .fixed, .fixed * {
            visibility: visible;
          }
          
          .fixed {
            position: static;
            background: white;
          }
        }
      `}</style>
    </div>
  );
}