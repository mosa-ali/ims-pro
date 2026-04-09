/**
 * ============================================================================
 * GRANT PROGRESS REPORT PRINT MODAL - Donor Progress Reporting
 * ============================================================================
 * ✅ Comprehensive progress report for donors/funders
 * ✅ A4 Layout, print-optimized
 * ✅ Organization + Donor branding
 * ✅ Activities, budget utilization, indicators
 * ✅ Suitable for donor submission & compliance
 * ============================================================================
 */

import { X, Printer, Award, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { getOrganizationSettings } from '@/services/organizationService';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
interface GrantActivity {
 activity: string;
 planned: string;
 actual: string;
 status: 'Completed' | 'In Progress' | 'Pending' | 'Delayed';
}

interface GrantIndicator {
 indicator: string;
 target: number | string;
 achieved: number | string;
 progress: number;
}

interface GrantBudget {
 category: string;
 budget: number;
 spent: number;
 remaining: number;
}

interface Props {
 grantTitle: string;
 grantNumber: string;
 donor: string;
 reportPeriod: string;
 startDate: string;
 endDate: string;
 
 executiveSummary: string;
 activities: GrantActivity[];
 indicators: GrantIndicator[];
 budgetLines: GrantBudget[];
 challenges?: string;
 nextSteps?: string;
 
 currency: string;
 onClose: () => void;
}

export function GrantProgressReportPrintModal({
 grantTitle,
 grantNumber,
 donor,
 reportPeriod,
 startDate,
 endDate,
 executiveSummary,
 activities,
 indicators,
 budgetLines,
 challenges,
 nextSteps,
 currency,
 onClose
}: Props) {
 const { t } = useTranslation();
 const [language] = useState<'en' | 'ar'>('en');
 const [isRTL] = useState(false);
 const orgSettings = getOrganizationSettings();
 const orgName = language === 'ar' && orgSettings.nameAr ? orgSettings.nameAr : orgSettings.name;

 const handlePrint = () => {
 window.print();
 };

 const formatCurrency = (amount: number) => {
 return new Intl.NumberFormat('en-US', {
 style: 'currency',
 currency: currency || 'USD',
 minimumFractionDigits: 0
 }).format(amount);
 };

 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.organizationModule.en, {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 });
 };

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'Completed': return 'bg-green-100 text-green-700 border-green-300';
 case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-300';
 case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
 case 'Delayed': return 'bg-red-100 text-red-700 border-red-300';
 default: return 'bg-gray-100 text-gray-700 border-gray-300';
 }
 };

 const getProgressColor = (progress: number) => {
 if (progress >= 100) return 'bg-green-500';
 if (progress >= 75) return 'bg-blue-500';
 if (progress >= 50) return 'bg-yellow-500';
 return 'bg-red-500';
 };

 // Calculate totals
 const totalBudget = budgetLines.reduce((sum, line) => sum + line.budget, 0);
 const totalSpent = budgetLines.reduce((sum, line) => sum + line.spent, 0);
 const totalRemaining = budgetLines.reduce((sum, line) => sum + line.remaining, 0);
 const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

 const labels = {
 title: t.organizationModule.grantProgressReport,
 grantInfo: t.organizationModule.grantInformation,
 grantNumber: t.organizationModule.grantNumber,
 donor: t.organizationModule.donorfunder,
 reportPeriod: t.organizationModule.reportingPeriod,
 grantPeriod: t.organizationModule.grantPeriod,
 
 executiveSummary: t.organizationModule.executiveSummary,
 
 activities: t.organizationModule.activitiesProgress,
 activity: t.organizationModule.activity,
 planned: t.organizationModule.planned,
 actual: t.organizationModule.actual,
 status: t.organizationModule.status,
 
 indicators: t.organizationModule.indicatorsAchievement,
 indicator: t.organizationModule.indicator,
 target: t.organizationModule.target,
 achieved: t.organizationModule.achieved,
 progress: t.organizationModule.progress,
 
 budget: t.organizationModule.budgetUtilization11,
 category: t.organizationModule.category,
 budgetAmount: t.organizationModule.budget12,
 spent: t.organizationModule.spent13,
 remaining: t.organizationModule.remaining,
 utilization: t.organizationModule.utilization,
 
 challenges: t.organizationModule.challengesIssues,
 nextSteps: t.organizationModule.nextStepsPlans,
 
 preparedBy: t.organizationModule.preparedBy,
 submittedTo: t.organizationModule.submittedTo,
 date: t.organizationModule.date,
 
 print: t.organizationModule.print,
 close: t.organizationModule.close
 };

 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose} dir={isRTL ? 'rtl' : 'ltr'}>
 <div 
 className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
 onClick={(e) => e.stopPropagation()}
 
 >
 {/* Header (Print Hidden) */}
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-green-50 print:hidden">
 <h2 className="text-xl font-bold text-gray-900">{labels.title}</h2>
 <div className="flex items-center gap-2">
 <button
 onClick={handlePrint}
 className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 >
 <Printer className="w-4 h-4" />
 <span>{labels.print}</span>
 </button>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-6 h-6" />
 </button>
 </div>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto p-8">
 <div className="max-w-[210mm] mx-auto bg-white print:p-0">
 
 {/* Organization + Donor Header */}
 <div className="mb-8 flex items-start justify-between border-b-2 border-green-600 pb-4">
 <div className="flex-1">
 {orgSettings.logo && (
 <img 
 src={orgSettings.logo} 
 alt={orgName} 
 className="h-16 mb-2 object-contain"
 />
 )}
 <h1 className="text-xl font-bold text-gray-900">{orgName}</h1>
 <p className="text-sm text-gray-600">{t.organizationModule.implementingPartner}</p>
 </div>
 <div className="flex-1 text-end">
 <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-lg mb-2">
 <Award className="w-6 h-6 text-green-600" />
 <span className="font-bold text-green-900">{donor}</span>
 </div>
 <p className="text-sm text-gray-600">{t.organizationModule.donorfunder}</p>
 </div>
 </div>

 {/* Report Title */}
 <div className="text-center mb-6">
 <h2 className="text-2xl font-bold text-gray-900 mb-2">{labels.title}</h2>
 <h3 className="text-lg text-gray-700">{grantTitle}</h3>
 </div>

 {/* Grant Info */}
 <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
 <h3 className="text-sm font-bold text-gray-900 mb-3">{labels.grantInfo}</h3>
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <span className="text-gray-600">{labels.grantNumber}:</span>
 <p className="font-semibold text-gray-900">{grantNumber}</p>
 </div>
 <div>
 <span className="text-gray-600">{labels.reportPeriod}:</span>
 <p className="font-semibold text-gray-900">{reportPeriod}</p>
 </div>
 <div className="col-span-2">
 <span className="text-gray-600">{labels.grantPeriod}:</span>
 <p className="font-semibold text-gray-900">
 {formatDate(startDate)} - {formatDate(endDate)}
 </p>
 </div>
 </div>
 </div>

 {/* Executive Summary */}
 <div className="mb-8">
 <h3 className="text-base font-bold text-gray-900 mb-3 bg-blue-100 px-3 py-2 rounded">
 {labels.executiveSummary}
 </h3>
 <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 text-sm text-gray-800 whitespace-pre-wrap">
 {executiveSummary}
 </div>
 </div>

 {/* Activities Progress */}
 <div className="mb-8">
 <h3 className="text-base font-bold text-gray-900 mb-3 bg-green-100 px-3 py-2 rounded">
 {labels.activities}
 </h3>
 <div className="border border-gray-300 rounded-lg overflow-hidden">
 <table className="w-full text-sm">
 <thead className="bg-green-100">
 <tr>
 <th className="px-4 py-3 text-start font-semibold text-green-900">{labels.activity}</th>
 <th className="px-4 py-3 text-start font-semibold text-green-900">{labels.planned}</th>
 <th className="px-4 py-3 text-start font-semibold text-green-900">{labels.actual}</th>
 <th className="px-4 py-3 text-center font-semibold text-green-900">{labels.status}</th>
 </tr>
 </thead>
 <tbody>
 {activities.map((activity, index) => (
 <tr key={index} className={`border-t border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
 <td className="px-4 py-3 text-gray-900">{activity.activity}</td>
 <td className="px-4 py-3 text-gray-700 text-sm">{activity.planned}</td>
 <td className="px-4 py-3 text-gray-700 text-sm">{activity.actual}</td>
 <td className="px-4 py-3 text-center">
 <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(activity.status)}`}>
 {activity.status}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Indicators Achievement */}
 <div className="mb-8">
 <h3 className="text-base font-bold text-gray-900 mb-3 bg-purple-100 px-3 py-2 rounded">
 {labels.indicators}
 </h3>
 <div className="border border-gray-300 rounded-lg overflow-hidden">
 <table className="w-full text-sm">
 <thead className="bg-purple-100">
 <tr>
 <th className="px-4 py-3 text-start font-semibold text-purple-900">{labels.indicator}</th>
 <th className="px-4 py-3 text-center font-semibold text-purple-900">{labels.target}</th>
 <th className="px-4 py-3 text-center font-semibold text-purple-900">{labels.achieved}</th>
 <th className="px-4 py-3 text-start font-semibold text-purple-900">{labels.progress}</th>
 </tr>
 </thead>
 <tbody>
 {indicators.map((indicator, index) => (
 <tr key={index} className={`border-t border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
 <td className="px-4 py-3 text-gray-900">{indicator.indicator}</td>
 <td className="px-4 py-3 text-center text-gray-700 font-semibold">{indicator.target}</td>
 <td className="px-4 py-3 text-center text-gray-900 font-bold">{indicator.achieved}</td>
 <td className="px-4 py-3">
 <div className="flex items-center gap-2">
 <div className="flex-1 bg-gray-200 rounded-full h-2">
 <div 
 className={`h-2 rounded-full ${getProgressColor(indicator.progress)}`}
 style={{ width: `${Math.min(indicator.progress, 100)}%` }}
 ></div>
 </div>
 <span className="text-xs font-semibold text-gray-700 min-w-[40px]">
 {indicator.progress.toFixed(0)}%
 </span>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Budget Utilization */}
 <div className="mb-8">
 <h3 className="text-base font-bold text-gray-900 mb-3 bg-yellow-100 px-3 py-2 rounded">
 {labels.budget}
 </h3>
 <div className="border border-gray-300 rounded-lg overflow-hidden">
 <table className="w-full text-sm">
 <thead className="bg-yellow-100">
 <tr>
 <th className="px-4 py-3 text-start font-semibold text-yellow-900">{labels.category}</th>
 <th className="px-4 py-3 text-end font-semibold text-yellow-900">{labels.budgetAmount}</th>
 <th className="px-4 py-3 text-end font-semibold text-yellow-900">{labels.spent}</th>
 <th className="px-4 py-3 text-end font-semibold text-yellow-900">{labels.remaining}</th>
 <th className="px-4 py-3 text-center font-semibold text-yellow-900">{labels.utilization}</th>
 </tr>
 </thead>
 <tbody>
 {budgetLines.map((line, index) => {
 const utilization = line.budget > 0 ? (line.spent / line.budget) * 100 : 0;
 return (
 <tr key={index} className={`border-t border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
 <td className="px-4 py-3 text-gray-900">{line.category}</td>
 <td className="px-4 py-3 text-end text-gray-700">{formatCurrency(line.budget)}</td>
 <td className="px-4 py-3 text-end text-gray-900 font-semibold">{formatCurrency(line.spent)}</td>
 <td className="px-4 py-3 text-end text-gray-700">{formatCurrency(line.remaining)}</td>
 <td className="px-4 py-3 text-center font-bold">
 <span className={utilization >= 100 ? 'text-red-600' : utilization >= 75 ? 'text-yellow-600' : 'text-green-600'}>
 {utilization.toFixed(0)}%
 </span>
 </td>
 </tr>
 );
 })}
 <tr className="border-t-2 border-yellow-600 bg-yellow-50">
 <td className="px-4 py-4 font-bold text-yellow-900 uppercase">{t.organizationModule.total}</td>
 <td className="px-4 py-4 text-end font-bold text-yellow-900">{formatCurrency(totalBudget)}</td>
 <td className="px-4 py-4 text-end font-bold text-yellow-900">{formatCurrency(totalSpent)}</td>
 <td className="px-4 py-4 text-end font-bold text-yellow-900">{formatCurrency(totalRemaining)}</td>
 <td className="px-4 py-4 text-center font-bold text-yellow-900">{budgetUtilization.toFixed(0)}%</td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>

 {/* Challenges */}
 {challenges && (
 <div className="mb-8">
 <h3 className="text-base font-bold text-gray-900 mb-3 bg-red-100 px-3 py-2 rounded">
 {labels.challenges}
 </h3>
 <div className="border border-red-200 rounded-lg p-4 bg-red-50 text-sm text-gray-800 whitespace-pre-wrap">
 {challenges}
 </div>
 </div>
 )}

 {/* Next Steps */}
 {nextSteps && (
 <div className="mb-8">
 <h3 className="text-base font-bold text-gray-900 mb-3 bg-green-100 px-3 py-2 rounded">
 {labels.nextSteps}
 </h3>
 <div className="border border-green-200 rounded-lg p-4 bg-green-50 text-sm text-gray-800 whitespace-pre-wrap">
 {nextSteps}
 </div>
 </div>
 )}

 {/* Signatures */}
 <div className="mt-12 pt-8 border-t-2 border-gray-300">
 <div className="grid grid-cols-2 gap-12">
 <div>
 <p className="text-xs text-gray-700 mb-2 font-semibold">{labels.preparedBy}:</p>
 <p className="text-sm text-gray-900 mb-1">{orgName}</p>
 <div className="h-12 mb-2"></div>
 <div className="border-t-2 border-gray-400 pt-2">
 <p className="text-xs text-gray-500">{labels.date}: {formatDate(new Date().toISOString())}</p>
 </div>
 </div>
 <div>
 <p className="text-xs text-gray-700 mb-2 font-semibold">{labels.submittedTo}:</p>
 <p className="text-sm text-gray-900 mb-1">{donor}</p>
 <div className="h-12 mb-2"></div>
 <div className="border-t-2 border-gray-400 pt-2">
 <p className="text-xs text-gray-500">&nbsp;</p>
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
 <span>{labels.print}</span>
 </button>
 <button
 onClick={onClose}
 className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 {labels.close}
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
