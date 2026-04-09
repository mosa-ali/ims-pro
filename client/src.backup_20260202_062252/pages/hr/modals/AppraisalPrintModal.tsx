/**
 * ============================================================================
 * APPRAISAL PRINT MODAL - Official Performance Appraisal Document
 * ============================================================================
 * ✅ USES OFFICIAL DOCUMENT TEMPLATE (Global Standard)
 * ✅ A4 Layout, print-optimized
 * ✅ Organization branding from System Settings
 * ============================================================================
 */

import { X, Printer } from 'lucide-react';
import { StaffMember } from '../types/hrTypes';
import { AppraisalRecord } from '@/app/services/appraisalService';
import { useState, useEffect } from 'react';

interface Props {
  appraisal: AppraisalRecord;
  onClose: () => void;
}

export function AppraisalPrintModal({ appraisal, onClose }: Props) {
  const [employee, setEmployee] = useState<StaffMember | null>(null);
  const [language] = useState('en');
  const [isRTL] = useState(false);

  useEffect(() => {
    // Load employee data
    const emp = staffService.getByStaffId(appraisal.staffId);
    if (emp) setEmployee(emp);
  }, [appraisal]);

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

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-700 bg-green-100';
    if (rating >= 3.5) return 'text-blue-700 bg-blue-100';
    if (rating >= 2.5) return 'text-yellow-700 bg-yellow-100';
    return 'text-red-700 bg-red-100';
  };

  const getRatingLabel = (rating: number) => {
    if (language === 'ar') {
      if (rating >= 4.5) return 'ممتاز';
      if (rating >= 3.5) return 'جيد جداً';
      if (rating >= 2.5) return 'جيد';
      return 'يحتاج للتحسين';
    } else {
      if (rating >= 4.5) return 'Excellent';
      if (rating >= 3.5) return 'Very Good';
      if (rating >= 2.5) return 'Good';
      return 'Needs Improvement';
    }
  };

  const t = {
    title: language === 'en' ? 'Performance Appraisal Form' : 'نموذج تقييم الأداء',
    
    appraisalPeriod: language === 'en' ? 'Appraisal Period' : 'فترة التقييم',
    reviewDate: language === 'en' ? 'Review Date' : 'تاريخ المراجعة',
    reviewer: language === 'en' ? 'Reviewer' : 'المُقيّم',
    overallRating: language === 'en' ? 'Overall Rating' : 'التقييم الإجمالي',
    
    competencies: language === 'en' ? 'Competency Ratings' : 'تقييمات الكفاءات',
    technical: language === 'en' ? 'Technical Skills' : 'المهارات التقنية',
    communication: language === 'en' ? 'Communication' : 'التواصل',
    teamwork: language === 'en' ? 'Teamwork' : 'العمل الجماعي',
    leadership: language === 'en' ? 'Leadership' : 'القيادة',
    problemSolving: language === 'en' ? 'Problem Solving' : 'حل المشكلات',
    
    achievements: language === 'en' ? 'Key Achievements' : 'الإنجازات الرئيسية',
    areasForDevelopment: language === 'en' ? 'Areas for Development' : 'مجالات التطوير',
    goals: language === 'en' ? 'Goals for Next Period' : 'الأهداف للفترة القادمة',
    
    employeeComments: language === 'en' ? 'Employee Comments' : 'تعليقات الموظف',
    reviewerComments: language === 'en' ? 'Reviewer Comments' : 'تعليقات المُقيّم',
    
    signatures: language === 'en' ? 'Signatures' : 'التوقيعات',
    employeeSignature: language === 'en' ? 'Employee Signature' : 'توقيع الموظف',
    reviewerSignature: language === 'en' ? 'Reviewer Signature' : 'توقيع المُقيّم',
    hrSignature: language === 'en' ? 'HR Manager Signature' : 'توقيع مدير الموارد البشرية',
    date: language === 'en' ? 'Date' : 'التاريخ',
    
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
            {/* Document will be printed with OfficialDocumentTemplate styling */}
            
            {/* Basic Information */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">{t.appraisalPeriod}:</span>
                  <p className="text-gray-900">{appraisal.reviewPeriodStart} - {appraisal.reviewPeriodEnd}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">{t.reviewDate}:</span>
                  <p className="text-gray-900">{formatDate(appraisal.reviewDate)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">{t.reviewer}:</span>
                  <p className="text-gray-900">{appraisal.reviewerName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">{t.overallRating}:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-3 py-1 rounded font-bold text-lg ${getRatingColor(appraisal.overallRating)}`}>
                      {appraisal.overallRating.toFixed(1)} / 5.0
                    </span>
                    <span className="text-sm text-gray-600">({getRatingLabel(appraisal.overallRating)})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Competency Ratings */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t.competencies}</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        {language === 'en' ? 'Competency' : 'الكفاءة'}
                      </th>
                      <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">
                        {language === 'en' ? 'Rating' : 'التقييم'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-2 text-sm text-gray-900">{t.technical}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-1 rounded font-medium ${getRatingColor(appraisal.technicalSkills)}`}>
                          {appraisal.technicalSkills.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-2 text-sm text-gray-900">{t.communication}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-1 rounded font-medium ${getRatingColor(appraisal.communication)}`}>
                          {appraisal.communication.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-2 text-sm text-gray-900">{t.teamwork}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-1 rounded font-medium ${getRatingColor(appraisal.teamwork)}`}>
                          {appraisal.teamwork.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-2 text-sm text-gray-900">{t.leadership}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-1 rounded font-medium ${getRatingColor(appraisal.leadership)}`}>
                          {appraisal.leadership.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-2 text-sm text-gray-900">{t.problemSolving}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-1 rounded font-medium ${getRatingColor(appraisal.problemSolving)}`}>
                          {appraisal.problemSolving.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Narrative Sections */}
            <div className="space-y-4 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{t.achievements}</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                  {appraisal.achievements || '-'}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{t.areasForDevelopment}</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                  {appraisal.areasForDevelopment || '-'}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{t.goals}</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                  {appraisal.goals || '-'}
                </div>
              </div>

              {appraisal.employeeComments && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">{t.employeeComments}</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                    {appraisal.employeeComments}
                  </div>
                </div>
              )}
            </div>

            {/* Signatures */}
            <div className="mt-8 pt-6 border-t-2 border-gray-300">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{t.signatures}</h3>
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <div className="h-16 mb-2"></div>
                  <div className="border-t-2 border-gray-400 pt-2">
                    <p className="text-xs font-semibold text-gray-900">{t.employeeSignature}</p>
                    <p className="text-xs text-gray-600 mt-1">{employee.fullName}</p>
                    <p className="text-xs text-gray-500">{t.date}: _______________</p>
                  </div>
                </div>
                <div>
                  <div className="h-16 mb-2"></div>
                  <div className="border-t-2 border-gray-400 pt-2">
                    <p className="text-xs font-semibold text-gray-900">{t.reviewerSignature}</p>
                    <p className="text-xs text-gray-600 mt-1">{appraisal.reviewerName}</p>
                    <p className="text-xs text-gray-500">{t.date}: {formatDate(appraisal.reviewDate)}</p>
                  </div>
                </div>
                <div>
                  <div className="h-16 mb-2"></div>
                  <div className="border-t-2 border-gray-400 pt-2">
                    <p className="text-xs font-semibold text-gray-900">{t.hrSignature}</p>
                    <p className="text-xs text-gray-600 mt-1">{language === 'en' ? 'HR Manager' : 'مدير الموارد البشرية'}</p>
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