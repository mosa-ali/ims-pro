/**
 * ============================================================================
 * RESIGNATION PRINT MODAL - Official Resignation Acceptance Letter
 * ============================================================================
 * ✅ USES OFFICIAL DOCUMENT TEMPLATE (Global Standard)
 * ✅ A4 Layout, print-optimized
 * ✅ Organization branding from System Settings
 * ============================================================================
 */

import { X, Printer } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { useState, useEffect } from 'react';

interface ResignationData {
  id: string;
  staffId: string;
  submissionDate: string;
  effectiveDate: string;
  noticePeriod: number;
  reason: string;
  comments?: string;
  status: string;
}

interface Props {
  resignation: ResignationData;
  onClose: () => void;
}

export function ResignationPrintModal({ resignation, onClose }: Props) {
  const [employee, setEmployee] = useState<StaffMember | null>(null);
  const [language] = useState('en');
  const [isRTL] = useState(false);

  useEffect(() => {
    const emp = staffService.getByStaffId(resignation.staffId);
    if (emp) setEmployee(emp);
  }, [resignation]);

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

  const t = {
    title: language === 'en' ? 'Resignation Acceptance Letter' : 'خطاب قبول الاستقالة',
    
    ref: language === 'en' ? 'Reference' : 'المرجع',
    date: language === 'en' ? 'Date' : 'التاريخ',
    to: language === 'en' ? 'TO' : 'إلى',
    subject: language === 'en' ? 'SUBJECT' : 'الموضوع',
    
    submissionDate: language === 'en' ? 'Resignation Submitted' : 'تاريخ تقديم الاستقالة',
    effectiveDate: language === 'en' ? 'Effective Date' : 'تاريخ السريان',
    noticePeriod: language === 'en' ? 'Notice Period' : 'فترة الإشعار',
    days: language === 'en' ? 'days' : 'يوم',
    
    opening: language === 'en'
      ? 'We acknowledge receipt of your resignation letter dated'
      : 'نقر باستلام خطاب استقالتك بتاريخ',
    
    acceptance: language === 'en'
      ? 'We hereby accept your resignation and confirm that your last working day will be'
      : 'نقبل بموجب هذا استقالتك ونؤكد أن آخر يوم عمل لك سيكون',
    
    obligations: language === 'en' ? 'Obligations During Notice Period' : 'الالتزامات خلال فترة الإشعار',
    obligationsList: language === 'en'
      ? [
          'Complete all assigned tasks and projects to the best of your ability',
          'Properly hand over responsibilities to designated personnel',
          'Return all company property (ID card, equipment, documents, etc.)',
          'Maintain confidentiality of company information',
          'Comply with all company policies and procedures'
        ]
      : [
          'إكمال جميع المهام والمشاريع المُعينة بأفضل ما لديك من قدرة',
          'تسليم المسؤوليات بشكل صحيح للأشخاص المعنيين',
          'إعادة جميع ممتلكات الشركة (بطاقة الهوية، المعدات، المستندات، إلخ)',
          'الحفاظ على سرية معلومات الشركة',
          'الالتزام بجميع سياسات وإجراءات الشركة'
        ],
    
    clearance: language === 'en' ? 'Exit Clearance' : 'تصفية الخروج',
    clearanceText: language === 'en'
      ? 'You are required to complete the exit clearance process with all departments before your last working day. HR will provide you with the clearance form.'
      : 'يُطلب منك إكمال عملية تصفية الخروج مع جميع الأقسام قبل آخر يوم عمل. ستوفر لك الموارد البشرية نموذج التصفية.',
    
    finalSettlement: language === 'en' ? 'Final Settlement' : 'التسوية النهائية',
    settlementText: language === 'en'
      ? 'Your final settlement, including any outstanding salary, end-of-service benefits, and leave encashment, will be processed according to company policy and applicable labor law.'
      : 'ستتم معالجة تسويتك النهائية، بما في ذلك أي راتب متبقي، ومكافأة نهاية الخدمة، وتعويض الإجازة، وفقًا لسياسة الشركة وقانون العمل المعمول به.',
    
    closing: language === 'en'
      ? 'We appreciate your contributions to the organization and wish you all the best in your future endeavors.'
      : 'نقدّر مساهماتك في المنظمة ونتمنى لك كل التوفيق في مساعيك المستقبلية.',
    
    signatures: language === 'en' ? 'Signatures' : 'التوقيعات',
    hrManager: language === 'en' ? 'HR Manager' : 'مدير الموارد البشرية',
    acknowledgedBy: language === 'en' ? 'Acknowledged By (Employee)' : 'تم الاطلاع عليه من قبل (الموظف)',
    
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
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-blue-50 print:hidden">
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
                  <strong>{t.ref}:</strong> RES-{resignation.id}-{new Date(resignation.submissionDate).getFullYear()}
                </div>
                <div>
                  <strong>{t.date}:</strong> {formatDate(new Date().toISOString())}
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
              <p className="text-sm leading-relaxed text-gray-800">
                {t.opening} <strong>{formatDate(resignation.submissionDate)}</strong>.
              </p>
              <p className="text-sm leading-relaxed text-gray-800 mt-4">
                {t.acceptance} <strong>{formatDate(resignation.effectiveDate)}</strong>.
              </p>
            </div>

            {/* Key Details Box */}
            <div className="mb-8 border border-blue-300 rounded-lg p-4 bg-blue-50">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">{t.submissionDate}:</span>
                  <p className="text-gray-900 font-semibold">{formatDate(resignation.submissionDate)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">{t.effectiveDate}:</span>
                  <p className="text-gray-900 font-semibold">{formatDate(resignation.effectiveDate)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">{t.noticePeriod}:</span>
                  <p className="text-gray-900 font-semibold">{resignation.noticePeriod} {t.days}</p>
                </div>
              </div>
            </div>

            {/* Obligations */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t.obligations}:</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-800">
                {t.obligationsList.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Clearance */}
            <div className="mb-8 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <h4 className="text-sm font-bold text-yellow-900 mb-2">{t.clearance}:</h4>
              <p className="text-sm text-yellow-800">{t.clearanceText}</p>
            </div>

            {/* Final Settlement */}
            <div className="mb-8 bg-green-50 border border-green-300 rounded-lg p-4">
              <h4 className="text-sm font-bold text-green-900 mb-2">{t.finalSettlement}:</h4>
              <p className="text-sm text-green-800">{t.settlementText}</p>
            </div>

            {/* Closing Statement */}
            <div className="mb-8">
              <p className="text-sm leading-relaxed text-gray-800">{t.closing}</p>
            </div>

            {/* Signatures */}
            <div className="mt-12 pt-8 border-t-2 border-gray-300">
              <h3 className="text-sm font-bold text-gray-900 mb-6">{t.signatures}</h3>
              <div className="grid grid-cols-2 gap-12">
                <div>
                  <div className="h-16 mb-2"></div>
                  <div className="border-t-2 border-gray-400 pt-2">
                    <p className="text-xs font-semibold text-gray-900">{t.hrManager}</p>
                    <p className="text-xs text-gray-500">{t.date}: {formatDate(new Date().toISOString())}</p>
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
              </div>
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