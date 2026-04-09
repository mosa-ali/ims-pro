/**
 * ============================================================================
 * PROJECT CLOSURE REPORT PRINT MODAL - Project Completion Document
 * ============================================================================
 * ✅ Final project documentation
 * ✅ A4 Layout, print-optimized
 * ✅ Organization branding
 * ✅ Final outcomes, lessons learned, final budget
 * ✅ Suitable for project archives & knowledge management
 * ============================================================================
 */

import { X, Printer, CheckCircle, Award, BookOpen, DollarSign } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getOrganizationSettings } from '@/services/organizationService';

interface Deliverable {
  name: string;
  status: 'Completed' | 'Partially Completed' | 'Not Completed';
  notes?: string;
}

interface Achievement {
  objective: string;
  target: string;
  achieved: string;
  percentage: number;
}

interface Lesson {
  category: 'Success' | 'Challenge' | 'Improvement';
  description: string;
  recommendation: string;
}

interface FinalBudget {
  budgeted: number;
  actual: number;
  variance: number;
  variancePercentage: number;
}

interface Props {
  projectName: string;
  projectCode: string;
  projectManager: string;
  startDate: string;
  endDate: string;
  actualEndDate: string;
  
  executiveSummary: string;
  deliverables: Deliverable[];
  achievements: Achievement[];
  lessonsLearned: Lesson[];
  
  finalBudget: FinalBudget;
  currency: string;
  
  recommendations: string;
  acknowledgments?: string;
  
  closedBy: string;
  closureDate: string;
  
  onClose: () => void;
}

export function ProjectClosureReportPrintModal({
  projectName,
  projectCode,
  projectManager,
  startDate,
  endDate,
  actualEndDate,
  executiveSummary,
  deliverables,
  achievements,
  lessonsLearned,
  finalBudget,
  currency,
  recommendations,
  acknowledgments,
  closedBy,
  closureDate,
  onClose
}: Props) {
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [isRTL, setIsRTL] = useState(false);
  const orgSettings = getOrganizationSettings();
  const orgName = language === 'ar' && orgSettings.nameAr ? orgSettings.nameAr : orgSettings.name;

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as 'en' | 'ar' || 'en';
    setLanguage(savedLanguage);
    setIsRTL(savedLanguage === 'ar');
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDeliverableStatusColor = (status: string) => {
    const colors = {
      'Completed': 'bg-green-100 text-green-700 border-green-200',
      'Partially Completed': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'Not Completed': 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getLessonCategoryColor = (category: string) => {
    const colors = {
      'Success': 'bg-green-100 text-green-700 border-green-200',
      'Challenge': 'bg-orange-100 text-orange-700 border-orange-200',
      'Improvement': 'bg-blue-100 text-blue-700 border-blue-200'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const t = {
    title: language === 'en' ? 'PROJECT CLOSURE REPORT' : 'تقرير إغلاق المشروع',
    subtitle: language === 'en' ? 'Final Project Documentation' : 'الوثائق النهائية للمشروع',
    
    projectInfo: language === 'en' ? 'Project Information' : 'معلومات المشروع',
    projectName: language === 'en' ? 'Project Name' : 'اسم المشروع',
    projectCode: language === 'en' ? 'Project Code' : 'رمز المشروع',
    projectManager: language === 'en' ? 'Project Manager' : 'مدير المشروع',
    plannedDuration: language === 'en' ? 'Planned Duration' : 'المدة المخططة',
    actualDuration: language === 'en' ? 'Actual Duration' : 'المدة الفعلية',
    
    executiveSummary: language === 'en' ? '1. Executive Summary' : '1. الملخص التنفيذي',
    
    deliverables: language === 'en' ? '2. Deliverables Status' : '2. حالة المخرجات',
    deliverable: language === 'en' ? 'Deliverable' : 'المخرج',
    status: language === 'en' ? 'Status' : 'الحالة',
    notes: language === 'en' ? 'Notes' : 'ملاحظات',
    completed: language === 'en' ? 'Completed' : 'مكتمل',
    partiallyCompleted: language === 'en' ? 'Partially Completed' : 'مكتمل جزئياً',
    notCompleted: language === 'en' ? 'Not Completed' : 'غير مكتمل',
    
    achievements: language === 'en' ? '3. Project Achievements' : '3. إنجازات المشروع',
    objective: language === 'en' ? 'Objective' : 'الهدف',
    target: language === 'en' ? 'Target' : 'المستهدف',
    achieved: language === 'en' ? 'Achieved' : 'المنجز',
    achievement: language === 'en' ? 'Achievement' : 'نسبة الإنجاز',
    
    lessons: language === 'en' ? '4. Lessons Learned' : '4. الدروس المستفادة',
    category: language === 'en' ? 'Category' : 'الفئة',
    description: language === 'en' ? 'Description' : 'الوصف',
    recommendation: language === 'en' ? 'Recommendation' : 'التوصية',
    success: language === 'en' ? 'Success' : 'نجاح',
    challenge: language === 'en' ? 'Challenge' : 'تحدي',
    improvement: language === 'en' ? 'Improvement' : 'تحسين',
    
    budget: language === 'en' ? '5. Final Budget Summary' : '5. ملخص الميزانية النهائية',
    budgeted: language === 'en' ? 'Budgeted' : 'المخطط',
    actual: language === 'en' ? 'Actual' : 'الفعلي',
    variance: language === 'en' ? 'Variance' : 'الفرق',
    under: language === 'en' ? 'Under Budget' : 'أقل من الميزانية',
    over: language === 'en' ? 'Over Budget' : 'أكثر من الميزانية',
    
    recommendations: language === 'en' ? '6. Recommendations for Future Projects' : '6. التوصيات للمشاريع المستقبلية',
    acknowledgments: language === 'en' ? '7. Acknowledgments' : '7. الشكر والتقدير',
    
    closure: language === 'en' ? 'Project Closure Approval' : 'اعتماد إغلاق المشروع',
    closedBy: language === 'en' ? 'Closed By:' : 'أغلقه:',
    approvedBy: language === 'en' ? 'Approved By:' : 'اعتمده:',
    signature: language === 'en' ? 'Signature' : 'التوقيع',
    dateLabel: language === 'en' ? 'Date' : 'التاريخ',
    name: language === 'en' ? 'Name' : 'الاسم',
    
    print: language === 'en' ? 'Print' : 'طباعة',
    close: language === 'en' ? 'Close' : 'إغلاق',
    
    docNumber: language === 'en' ? 'Document #' : 'رقم الوثيقة #',
    generatedOn: language === 'en' ? 'Generated on' : 'تم الإنشاء في',
    confidential: language === 'en' 
      ? 'This document is confidential and intended for authorized personnel only.' 
      : 'هذه الوثيقة سرية ومخصصة للموظفين المصرح لهم فقط.',
    officialClosure: language === 'en'
      ? '✅ This project has been officially closed and archived.'
      : '✅ تم إغلاق هذا المشروع وأرشفته رسمياً.'
  };

  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    return `${months} ${language === 'en' ? 'months' : 'أشهر'} (${days} ${language === 'en' ? 'days' : 'يوم'})`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header - Hidden on print */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between print:hidden z-10">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h2 className="text-xl font-semibold text-gray-900">{t.title}</h2>
            <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
          </div>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={handlePrint}
              className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Printer className="w-4 h-4" />
              <span>{t.print}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
              aria-label={t.close}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Print Content */}
        <div className="p-8" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Header with Logo */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-gray-300">
            <div className={isRTL ? 'text-right' : 'text-left'}>
              {orgSettings.logoUrl && (
                <img 
                  src={orgSettings.logoUrl} 
                  alt="Organization Logo" 
                  className="h-16 mb-3"
                />
              )}
              <h1 className="text-2xl font-bold text-gray-900">{orgName}</h1>
              <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
            </div>
            <div className={`text-sm ${isRTL ? 'text-left' : 'text-right'}`}>
              <p className="text-gray-600">{t.docNumber}: PCR-{projectCode}-{new Date().getFullYear()}</p>
              <p className="text-gray-600">{t.generatedOn}: {formatDate(new Date().toISOString())}</p>
            </div>
          </div>

          {/* Document Title with Success Badge */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <CheckCircle className="w-12 h-12 text-green-600" />
              <h2 className="text-3xl font-bold text-gray-900">{t.title}</h2>
            </div>
            <p className="text-xl text-blue-600 mb-3">{projectName}</p>
            <div className="inline-block px-4 py-2 bg-green-100 border border-green-300 rounded-lg">
              <p className="text-sm font-semibold text-green-800">{t.officialClosure}</p>
            </div>
          </div>

          {/* Project Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.projectInfo}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">{t.projectCode}</p>
                <p className="text-base font-semibold text-gray-900">{projectCode}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t.projectManager}</p>
                <p className="text-base font-semibold text-gray-900">{projectManager}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t.plannedDuration}</p>
                <p className="text-base font-semibold text-gray-900">{calculateDuration(startDate, endDate)}</p>
                <p className="text-xs text-gray-600 mt-1">{formatDate(startDate)} - {formatDate(endDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t.actualDuration}</p>
                <p className="text-base font-semibold text-gray-900">{calculateDuration(startDate, actualEndDate)}</p>
                <p className="text-xs text-gray-600 mt-1">{formatDate(startDate)} - {formatDate(actualEndDate)}</p>
              </div>
            </div>
          </div>

          {/* 1. Executive Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              {t.executiveSummary}
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {executiveSummary}
            </p>
          </div>

          {/* 2. Deliverables */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{t.deliverables}</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-left">
                    {t.deliverable}
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-left">
                    {t.status}
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-left">
                    {t.notes}
                  </th>
                </tr>
              </thead>
              <tbody>
                {deliverables.map((deliverable, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">
                      {deliverable.name}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getDeliverableStatusColor(deliverable.status)}`}>
                        {t[deliverable.status.toLowerCase().replace(' ', '') as 'completed' | 'partiallyCompleted' | 'notCompleted']}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700">
                      {deliverable.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 3. Achievements */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{t.achievements}</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-left">
                    {t.objective}
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-left">
                    {t.target}
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-left">
                    {t.achieved}
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-left">
                    {t.achievement}
                  </th>
                </tr>
              </thead>
              <tbody>
                {achievements.map((achievement, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">
                      {achievement.objective}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700">
                      {achievement.target}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700">
                      {achievement.achieved}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${achievement.percentage >= 100 ? 'bg-green-600' : achievement.percentage >= 75 ? 'bg-blue-600' : 'bg-yellow-600'}`}
                            style={{ width: `${Math.min(achievement.percentage, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-gray-900 w-12 text-right">
                          {achievement.percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 4. Lessons Learned */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              {t.lessons}
            </h3>
            <div className="space-y-3">
              {lessonsLearned.map((lesson, index) => (
                <div key={index} className="border border-gray-300 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getLessonCategoryColor(lesson.category)}`}>
                      {t[lesson.category.toLowerCase() as 'success' | 'challenge' | 'improvement']}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">{lesson.description}</p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{t.recommendation}:</span> {lesson.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Final Budget */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              {t.budget}
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">{t.budgeted}</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(finalBudget.budgeted)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">{t.actual}</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(finalBudget.actual)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">{t.variance}</p>
                  <p className={`text-xl font-bold ${finalBudget.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(finalBudget.variance))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">%</p>
                  <p className={`text-xl font-bold ${finalBudget.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(finalBudget.variancePercentage).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className={`p-3 rounded-lg text-center ${finalBudget.variance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <p className={`text-sm font-semibold ${finalBudget.variance >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                  {finalBudget.variance >= 0 ? t.under : t.over}
                </p>
              </div>
            </div>
          </div>

          {/* 6. Recommendations */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{t.recommendations}</h3>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{recommendations}</p>
            </div>
          </div>

          {/* 7. Acknowledgments */}
          {acknowledgments && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t.acknowledgments}</h3>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{acknowledgments}</p>
              </div>
            </div>
          )}

          {/* Closure Approval Section */}
          <div className="mt-8 pt-6 border-t-2 border-gray-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.closure}</h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-900">{t.closedBy}</p>
                <div className="space-y-2">
                  <div className="border-b border-gray-400 pb-12">
                    <p className="text-xs text-gray-500">{t.signature}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t.name}</p>
                      <p className="text-sm font-semibold">{closedBy}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t.dateLabel}</p>
                      <p className="text-sm font-semibold">{formatDate(closureDate)}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-900">{t.approvedBy}</p>
                <div className="space-y-2">
                  <div className="border-b border-gray-400 pb-12">
                    <p className="text-xs text-gray-500">{t.signature}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t.name}</p>
                      <div className="border-b border-gray-400 h-6"></div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t.dateLabel}</p>
                      <div className="border-b border-gray-400 h-6"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">{t.confidential}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
