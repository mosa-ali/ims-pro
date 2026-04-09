/**
 * ============================================================================
 * VACANCY DETAIL VIEW
 * ============================================================================
 * 
 * Display complete vacancy information including criteria
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { X, ExternalLink, Copy, Check } from 'lucide-react';
import { vacancyCriteriaService } from './recruitmentService';
import { Vacancy, VacancyCriteria } from './types';

interface Props {
  language: string;
  isRTL: boolean;
  vacancy: Vacancy;
  onClose: () => void;
}

export function VacancyDetail({ language, isRTL, vacancy, onClose }: Props) {
  const [criteria, setCriteria] = useState<VacancyCriteria[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const data = vacancyCriteriaService.getByVacancy(vacancy.id);
    setCriteria(data);
  }, [vacancy.id]);

  const getApplicationUrl = () => {
    return `${window.location.origin}/apply/${vacancy.vacancyRef}`;
  };

  const copyApplicationLink = () => {
    navigator.clipboard.writeText(getApplicationUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const t = {
    title: language === 'en' ? 'Vacancy Details' : 'تفاصيل الشاغر',
    vacancyInfo: language === 'en' ? 'Vacancy Information' : 'معلومات الشاغر',
    selectionCriteria: language === 'en' ? 'Selection Criteria' : 'معايير الاختيار',
    
    ref: language === 'en' ? 'Reference' : 'المرجع',
    position: language === 'en' ? 'Position' : 'المنصب',
    department: language === 'en' ? 'Department' : 'القسم',
    project: language === 'en' ? 'Project' : 'المشروع',
    dutyStation: language === 'en' ? 'Duty Station' : 'مكان العمل',
    contractType: language === 'en' ? 'Contract Type' : 'نوع العقد',
    grade: language === 'en' ? 'Grade' : 'الدرجة',
    vacancyType: language === 'en' ? 'Vacancy Type' : 'نوع الشاغر',
    justification: language === 'en' ? 'Justification' : 'المبرر',
    openingDate: language === 'en' ? 'Opening Date' : 'تاريخ الفتح',
    closingDate: language === 'en' ? 'Closing Date' : 'تاريخ الإغلاق',
    hiringManager: language === 'en' ? 'Hiring Manager' : 'مدير التوظيف',
    shortlistThreshold: language === 'en' ? 'Shortlist Threshold' : 'حد القائمة المختصرة',
    status: language === 'en' ? 'Status' : 'الحالة',
    
    applicationLink: language === 'en' ? 'Public Application Link' : 'رابط التقديم العام',
    copyLink: language === 'en' ? 'Copy Link' : 'نسخ الرابط',
    linkCopied: language === 'en' ? 'Link Copied!' : 'تم نسخ الرابط!',
    
    criteriaName: language === 'en' ? 'Criterion' : 'المعيار',
    type: language === 'en' ? 'Type' : 'النوع',
    weight: language === 'en' ? 'Weight' : 'الوزن',
    required: language === 'en' ? 'Required' : 'مطلوب',
    yes: language === 'en' ? 'Yes' : 'نعم',
    no: language === 'en' ? 'No' : 'لا',
    
    noCriteria: language === 'en' ? 'No selection criteria defined' : 'لم يتم تحديد معايير الاختيار',
    
    close: language === 'en' ? 'Close' : 'إغلاق'
  };

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{t.title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Vacancy Information */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t.vacancyInfo}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.ref}</label>
                <p className="mt-1 text-sm font-mono text-gray-900">{vacancy.vacancyRef}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.status}</label>
                <p className="mt-1">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    vacancy.status === 'Open' ? 'bg-green-100 text-green-700' :
                    vacancy.status === 'Closed' ? 'bg-red-100 text-red-700' :
                    vacancy.status === 'Draft' ? 'bg-gray-100 text-gray-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {vacancy.status}
                  </span>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.position}</label>
                <p className="mt-1 text-sm font-medium text-gray-900">{vacancy.positionTitle}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.department}</label>
                <p className="mt-1 text-sm text-gray-900">{vacancy.department}</p>
              </div>
              
              {vacancy.project && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">{t.project}</label>
                  <p className="mt-1 text-sm text-gray-900">{vacancy.project}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.dutyStation}</label>
                <p className="mt-1 text-sm text-gray-900">{vacancy.dutyStation}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.contractType}</label>
                <p className="mt-1 text-sm text-gray-900">{vacancy.contractType}</p>
              </div>
              
              {vacancy.grade && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">{t.grade}</label>
                  <p className="mt-1 text-sm text-gray-900">{vacancy.grade}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.vacancyType}</label>
                <p className="mt-1 text-sm text-gray-900">{vacancy.vacancyType}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.hiringManager}</label>
                <p className="mt-1 text-sm text-gray-900">{vacancy.hiringManager}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.openingDate}</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(vacancy.openingDate).toLocaleDateString()}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.closingDate}</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(vacancy.closingDate).toLocaleDateString()}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">{t.shortlistThreshold}</label>
                <p className="mt-1 text-sm text-gray-900">{vacancy.shortlistThreshold}%</p>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500">{t.justification}</label>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{vacancy.justification}</p>
              </div>
            </div>
          </div>

          {/* Application Link (if Open) */}
          {vacancy.status === 'Open' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-green-900 mb-2">
                {t.applicationLink}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={getApplicationUrl()}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-lg text-sm font-mono"
                />
                <button
                  onClick={copyApplicationLink}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4" />
                      {t.linkCopied}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      {t.copyLink}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Selection Criteria */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t.selectionCriteria}</h3>
            
            {criteria.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500">{t.noCriteria}</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t.criteriaName}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t.type}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t.weight}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t.required}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {criteria.map((criterion) => (
                      <tr key={criterion.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {criterion.criteriaName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {criterion.criteriaType}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {criterion.weightPercentage}%
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {criterion.required ? (
                            <span className="text-green-600">{t.yes}</span>
                          ) : (
                            <span className="text-gray-400">{t.no}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-sm font-medium text-gray-900">
                        {t.weight} {language === 'en' ? 'Total' : 'الإجمالي'}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">
                        {criteria.reduce((sum, c) => sum + c.weightPercentage, 0)}%
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
