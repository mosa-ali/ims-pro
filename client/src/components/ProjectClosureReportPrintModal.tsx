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
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
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
 const { t } = useTranslation();
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
 return new Intl.NumberFormat(t.printTemplates.en, {
 style: 'currency',
 currency: currency || 'USD',
 minimumFractionDigits: 0
 }).format(amount);
 };

 const formatDate = (dateString: string) => {
 return new Date(dateString).toLocaleDateString(t.printTemplates.en, {
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

 const labels = {
 title: t.printTemplates.projectClosureReport,
 subtitle: t.printTemplates.finalProjectDocumentation,
 
 projectInfo: t.printTemplates.projectInformation,
 projectName: t.printTemplates.projectName,
 projectCode: t.printTemplates.projectCode,
 projectManager: t.printTemplates.projectManager,
 plannedDuration: t.printTemplates.plannedDuration,
 actualDuration: t.printTemplates.actualDuration,
 
 executiveSummary: t.printTemplates.k1ExecutiveSummary,
 
 deliverables: t.printTemplates.k2DeliverablesStatus,
 deliverable: t.printTemplates.deliverable,
 status: t.printTemplates.status,
 notes: t.printTemplates.notes,
 completed: t.printTemplates.completed,
 partiallyCompleted: t.printTemplates.partiallyCompleted,
 notCompleted: t.printTemplates.notCompleted,
 
 achievements: t.printTemplates.k3ProjectAchievements,
 objective: t.printTemplates.objective,
 target: t.printTemplates.target,
 achieved: t.printTemplates.achieved2,
 achievement: t.printTemplates.achievement,
 
 lessons: t.printTemplates.k4LessonsLearned,
 category: t.printTemplates.category,
 description: t.printTemplates.description,
 recommendation: t.printTemplates.recommendation,
 success: t.printTemplates.success,
 challenge: t.printTemplates.challenge,
 improvement: t.printTemplates.improvement,
 
 budget: t.printTemplates.k5FinalBudgetSummary,
 budgeted: t.printTemplates.budgeted,
 actual: t.printTemplates.actual,
 variance: t.printTemplates.variance,
 under: t.printTemplates.underBudget,
 over: t.printTemplates.overBudget,
 
 recommendations: t.printTemplates.k6RecommendationsForFutureProjects,
 acknowledgments: t.printTemplates.k7Acknowledgments,
 
 closure: t.printTemplates.projectClosureApproval,
 closedBy: t.printTemplates.closedBy,
 approvedBy: t.printTemplates.approvedBy,
 signature: t.printTemplates.signature,
 dateLabel: t.printTemplates.date,
 name: t.printTemplates.name,
 
 print: t.printTemplates.print,
 close: t.printTemplates.close,
 
 docNumber: t.printTemplates.document,
 generatedOn: t.printTemplates.generatedOn,
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
 return `${months} ${t.printTemplates.months} (${days} ${t.printTemplates.days})`;
 };

 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
 {/* Header - Hidden on print */}
 <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between print:hidden z-10">
 <div className={'text-start'}>
 <h2 className="text-xl font-semibold text-gray-900">{labels.title}</h2>
 <p className="text-sm text-gray-600 mt-1">{labels.subtitle}</p>
 </div>
 <div className={`flex items-center gap-2`}>
 <button
 onClick={handlePrint}
 className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700`}
 >
 <Printer className="w-4 h-4" />
 <span>{labels.print}</span>
 </button>
 <button
 onClick={onClose}
 className="p-2 hover:bg-gray-100 rounded-lg"
 aria-label={labels.close}
 >
 <X className="w-5 h-5 text-gray-500" />
 </button>
 </div>
 </div>

 {/* Print Content */}
 <div className="p-8">
 {/* Header with Logo */}
 <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-gray-300">
 <div className={'text-start'}>
 {orgSettings.logo && (
 <img 
 src={orgSettings.logo} 
 alt="Organization Logo" 
 className="h-16 mb-3"
 />
 )}
 <h1 className="text-2xl font-bold text-gray-900">{orgName}</h1>
 <p className="text-sm text-gray-600 mt-1">{labels.subtitle}</p>
 </div>
 <div className={`text-sm text-end`}>
 <p className="text-gray-600">{labels.docNumber}: PCR-{projectCode}-{new Date().getFullYear()}</p>
 <p className="text-gray-600">{labels.generatedOn}: {formatDate(new Date().toISOString())}</p>
 </div>
 </div>

 {/* Document Title with Success Badge */}
 <div className="text-center mb-8">
 <div className="flex items-center justify-center gap-3 mb-3">
 <CheckCircle className="w-12 h-12 text-green-600" />
 <h2 className="text-3xl font-bold text-gray-900">{labels.title}</h2>
 </div>
 <p className="text-xl text-blue-600 mb-3">{projectName}</p>
 <div className="inline-block px-4 py-2 bg-green-100 border border-green-300 rounded-lg">
 <p className="text-sm font-semibold text-green-800">{labels.officialClosure}</p>
 </div>
 </div>

 {/* Project Information */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-4">{labels.projectInfo}</h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-sm text-gray-600">{labels.projectCode}</p>
 <p className="text-base font-semibold text-gray-900">{projectCode}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">{labels.projectManager}</p>
 <p className="text-base font-semibold text-gray-900">{projectManager}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">{labels.plannedDuration}</p>
 <p className="text-base font-semibold text-gray-900">{calculateDuration(startDate, endDate)}</p>
 <p className="text-xs text-gray-600 mt-1">{formatDate(startDate)} - {formatDate(endDate)}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">{labels.actualDuration}</p>
 <p className="text-base font-semibold text-gray-900">{calculateDuration(startDate, actualEndDate)}</p>
 <p className="text-xs text-gray-600 mt-1">{formatDate(startDate)} - {formatDate(actualEndDate)}</p>
 </div>
 </div>
 </div>

 {/* 1. Executive Summary */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
 <Award className="w-5 h-5 text-blue-600" />
 {labels.executiveSummary}
 </h3>
 <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
 {executiveSummary}
 </p>
 </div>

 {/* 2. Deliverables */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{labels.deliverables}</h3>
 <table className="w-full border-collapse border border-gray-300">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.deliverable}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.status}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.notes}
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
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{labels.achievements}</h3>
 <table className="w-full border-collapse border border-gray-300">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.objective}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.target}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.achieved}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.achievement}
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
 <span className="text-xs font-semibold text-gray-900 w-12 text-end">
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
 {labels.lessons}
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
 <span className="font-medium">{labels.recommendation}:</span> {lesson.recommendation}
 </p>
 </div>
 ))}
 </div>
 </div>

 {/* 5. Final Budget */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
 <DollarSign className="w-5 h-5 text-blue-600" />
 {labels.budget}
 </h3>
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
 <div className="grid grid-cols-4 gap-4 mb-4">
 <div className="text-center">
 <p className="text-sm text-gray-600 mb-1">{labels.budgeted}</p>
 <p className="text-xl font-bold text-gray-900">{formatCurrency(finalBudget.budgeted)}</p>
 </div>
 <div className="text-center">
 <p className="text-sm text-gray-600 mb-1">{labels.actual}</p>
 <p className="text-xl font-bold text-blue-600">{formatCurrency(finalBudget.actual)}</p>
 </div>
 <div className="text-center">
 <p className="text-sm text-gray-600 mb-1">{labels.variance}</p>
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
 {finalBudget.variance >= 0 ? labels.under : labels.over}
 </p>
 </div>
 </div>
 </div>

 {/* 6. Recommendations */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{labels.recommendations}</h3>
 <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
 <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{recommendations}</p>
 </div>
 </div>

 {/* 7. Acknowledgments */}
 {acknowledgments && (
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{labels.acknowledgments}</h3>
 <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
 <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{acknowledgments}</p>
 </div>
 </div>
 )}

 {/* Closure Approval Section */}
 <div className="mt-8 pt-6 border-t-2 border-gray-300">
 <h3 className="text-lg font-semibold text-gray-900 mb-4">{labels.closure}</h3>
 <div className="grid grid-cols-2 gap-8">
 <div className="space-y-4">
 <p className="text-sm font-semibold text-gray-900">{labels.closedBy}</p>
 <div className="space-y-2">
 <div className="border-b border-gray-400 pb-12">
 <p className="text-xs text-gray-500">{labels.signature}</p>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-xs text-gray-500 mb-1">{labels.name}</p>
 <p className="text-sm font-semibold">{closedBy}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500 mb-1">{labels.dateLabel}</p>
 <p className="text-sm font-semibold">{formatDate(closureDate)}</p>
 </div>
 </div>
 </div>
 </div>
 <div className="space-y-4">
 <p className="text-sm font-semibold text-gray-900">{labels.approvedBy}</p>
 <div className="space-y-2">
 <div className="border-b border-gray-400 pb-12">
 <p className="text-xs text-gray-500">{labels.signature}</p>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-xs text-gray-500 mb-1">{labels.name}</p>
 <div className="border-b border-gray-400 h-6"></div>
 </div>
 <div>
 <p className="text-xs text-gray-500 mb-1">{labels.dateLabel}</p>
 <div className="border-b border-gray-400 h-6"></div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Footer */}
 <div className="mt-8 pt-4 border-t border-gray-200 text-center">
 <p className="text-xs text-gray-500">{labels.confidential}</p>
 </div>
 </div>
 </div>
 </div>
 );
}
