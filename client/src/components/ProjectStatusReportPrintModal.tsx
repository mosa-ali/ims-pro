/**
 * ============================================================================
 * PROJECT STATUS REPORT PRINT MODAL - Progress Tracking Document
 * ============================================================================
 * ✅ Periodic project status updates
 * ✅ A4 Layout, print-optimized
 * ✅ Organization branding
 * ✅ Progress summary, milestones, issues/risks, budget status
 * ✅ Suitable for stakeholder updates & management reporting
 * ============================================================================
 */

import { X, Printer, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getOrganizationSettings } from '@/services/organizationService';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
interface Milestone {
 name: string;
 plannedDate: string;
 actualDate?: string;
 status: 'Completed' | 'On Track' | 'At Risk' | 'Delayed';
}

interface Issue {
 description: string;
 impact: 'High' | 'Medium' | 'Low';
 status: 'Open' | 'In Progress' | 'Resolved';
}

interface Risk {
 description: string;
 probability: 'High' | 'Medium' | 'Low';
 impact: 'High' | 'Medium' | 'Low';
 mitigation: string;
}

interface BudgetStatus {
 budgeted: number;
 spent: number;
 committed: number;
 remaining: number;
 variance: number;
}

interface Props {
 projectName: string;
 projectCode: string;
 projectManager: string;
 reportingPeriod: string;
 reportDate: string;
 
 overallStatus: 'On Track' | 'At Risk' | 'Off Track';
 completionPercentage: number;
 
 executiveSummary: string;
 accomplishments: string;
 plannedActivities: string;
 
 milestones: Milestone[];
 issues: Issue[];
 risks: Risk[];
 
 budgetStatus: BudgetStatus;
 currency: string;
 
 onClose: () => void;
}

export function ProjectStatusReportPrintModal({
 projectName,
 projectCode,
 projectManager,
 reportingPeriod,
 reportDate,
 overallStatus,
 completionPercentage,
 executiveSummary,
 accomplishments,
 plannedActivities,
 milestones,
 issues,
 risks,
 budgetStatus,
 currency,
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

 const getStatusColor = (status: string) => {
 const colors = {
 'On Track': 'bg-green-100 text-green-700 border-green-200',
 'At Risk': 'bg-yellow-100 text-yellow-700 border-yellow-200',
 'Off Track': 'bg-red-100 text-red-700 border-red-200',
 'Delayed': 'bg-red-100 text-red-700 border-red-200',
 'Completed': 'bg-green-100 text-green-700 border-green-200',
 'Open': 'bg-red-100 text-red-700 border-red-200',
 'In Progress': 'bg-yellow-100 text-yellow-700 border-yellow-200',
 'Resolved': 'bg-green-100 text-green-700 border-green-200',
 'High': 'bg-red-100 text-red-700 border-red-200',
 'Medium': 'bg-yellow-100 text-yellow-700 border-yellow-200',
 'Low': 'bg-green-100 text-green-700 border-green-200'
 };
 return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
 };

 const labels = {
 title: t.printTemplates.projectStatusReport,
 subtitle: t.printTemplates.progressPerformanceUpdate,
 
 projectInfo: t.printTemplates.projectInformation,
 projectName: t.printTemplates.projectName,
 projectCode: t.printTemplates.projectCode,
 projectManager: t.printTemplates.projectManager,
 reportingPeriod: t.printTemplates.reportingPeriod,
 reportDate: t.printTemplates.reportDate,
 
 overallStatus: t.printTemplates.overallStatus,
 completion: t.printTemplates.completion,
 
 onTrack: t.printTemplates.onTrack5,
 atRisk: t.printTemplates.atRisk,
 offTrack: t.printTemplates.offTrack,
 completed: t.printTemplates.completed,
 delayed: t.printTemplates.delayed,
 
 executiveSummary: t.printTemplates.k1ExecutiveSummary,
 accomplishments: t.printTemplates.k2KeyAccomplishments,
 planned: t.printTemplates.k3PlannedActivitiesNextPeriod,
 
 milestones: t.printTemplates.k4MilestoneStatus,
 milestone: t.printTemplates.milestone,
 plannedDate: t.printTemplates.plannedDate,
 actualDate: t.printTemplates.actualDate,
 status: t.printTemplates.status,
 
 issues: t.printTemplates.k5IssuesConcerns,
 issue: t.printTemplates.issue,
 impact: t.printTemplates.impact,
 
 risks: t.printTemplates.k6RiskRegister,
 risk: t.printTemplates.risk,
 probability: t.printTemplates.probability,
 mitigation: t.printTemplates.mitigation,
 
 budget: t.printTemplates.k7BudgetStatus,
 budgeted: t.printTemplates.budgeted,
 spent: t.printTemplates.spent1,
 committed: t.printTemplates.committed,
 remaining: t.printTemplates.remaining,
 variance: t.printTemplates.variance,
 
 high: t.printTemplates.high6,
 medium: t.printTemplates.medium7,
 low: t.printTemplates.low8,
 open: t.printTemplates.open,
 inProgress: t.printTemplates.inProgress,
 resolved: t.printTemplates.resolved,
 
 preparedBy: t.printTemplates.preparedBy3,
 signature: t.printTemplates.signature,
 dateLabel: t.printTemplates.date,
 
 print: t.printTemplates.print,
 close: t.printTemplates.close,
 
 docNumber: t.printTemplates.document,
 generatedOn: t.printTemplates.generatedOn,
 confidential: language === 'en' 
 ? 'This document is confidential and intended for authorized personnel only.' 
 : 'هذه الوثيقة سرية ومخصصة للموظفين المصرح لهم فقط.'
 };

 const getOverallStatusIcon = () => {
 switch (overallStatus) {
 case 'On Track':
 return <CheckCircle className="w-6 h-6 text-green-600" />;
 case 'At Risk':
 return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
 case 'Off Track':
 return <AlertTriangle className="w-6 h-6 text-red-600" />;
 default:
 return <Clock className="w-6 h-6 text-gray-600" />;
 }
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
 <p className="text-gray-600">{labels.docNumber}: PSR-{projectCode}-{new Date().getFullYear()}</p>
 <p className="text-gray-600">{labels.generatedOn}: {formatDate(new Date().toISOString())}</p>
 </div>
 </div>

 {/* Document Title */}
 <div className="text-center mb-8">
 <h2 className="text-3xl font-bold text-gray-900">{labels.title}</h2>
 <p className="text-xl text-blue-600 mt-2">{projectName}</p>
 </div>

 {/* Project Information & Status */}
 <div className="grid grid-cols-2 gap-4 mb-6">
 {/* Project Info */}
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <h3 className="text-base font-semibold text-gray-900 mb-3">{labels.projectInfo}</h3>
 <div className="space-y-2">
 <div>
 <p className="text-xs text-gray-600">{labels.projectCode}</p>
 <p className="text-sm font-semibold text-gray-900">{projectCode}</p>
 </div>
 <div>
 <p className="text-xs text-gray-600">{labels.projectManager}</p>
 <p className="text-sm font-semibold text-gray-900">{projectManager}</p>
 </div>
 <div>
 <p className="text-xs text-gray-600">{labels.reportingPeriod}</p>
 <p className="text-sm font-semibold text-gray-900">{reportingPeriod}</p>
 </div>
 <div>
 <p className="text-xs text-gray-600">{labels.reportDate}</p>
 <p className="text-sm font-semibold text-gray-900">{formatDate(reportDate)}</p>
 </div>
 </div>
 </div>

 {/* Status Dashboard */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <h3 className="text-base font-semibold text-gray-900 mb-3">{labels.overallStatus}</h3>
 <div className="space-y-3">
 <div className="flex items-center gap-3">
 {getOverallStatusIcon()}
 <span className={`px-3 py-1 rounded-lg text-sm font-semibold border ${getStatusColor(overallStatus)}`}>
 {t[overallStatus.toLowerCase().replace(' ', '') as 'onTrack' | 'atRisk' | 'offTrack']}
 </span>
 </div>
 <div>
 <p className="text-xs text-gray-600 mb-1">{labels.completion}</p>
 <div className="flex items-center gap-2">
 <div className="flex-1 bg-gray-200 rounded-full h-3">
 <div 
 className="bg-blue-600 h-3 rounded-full transition-all"
 style={{ width: `${completionPercentage}%` }}
 ></div>
 </div>
 <span className="text-lg font-bold text-blue-600">{completionPercentage}%</span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* 1. Executive Summary */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
 <TrendingUp className="w-5 h-5 text-blue-600" />
 {labels.executiveSummary}
 </h3>
 <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
 {executiveSummary}
 </p>
 </div>

 {/* 2. Accomplishments */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{labels.accomplishments}</h3>
 <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
 <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{accomplishments}</p>
 </div>
 </div>

 {/* 3. Planned Activities */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{labels.planned}</h3>
 <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
 <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{plannedActivities}</p>
 </div>
 </div>

 {/* 4. Milestones */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{labels.milestones}</h3>
 <table className="w-full border-collapse border border-gray-300">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.milestone}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.plannedDate}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.actualDate}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.status}
 </th>
 </tr>
 </thead>
 <tbody>
 {milestones.map((milestone, index) => (
 <tr key={index}>
 <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">
 {milestone.name}
 </td>
 <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700">
 {formatDate(milestone.plannedDate)}
 </td>
 <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700">
 {milestone.actualDate ? formatDate(milestone.actualDate) : '-'}
 </td>
 <td className="border border-gray-300 px-3 py-2">
 <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(milestone.status)}`}>
 {t[milestone.status.toLowerCase().replace(' ', '') as keyof typeof t] || milestone.status}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* 5. Issues */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
 <AlertTriangle className="w-5 h-5 text-orange-600" />
 {labels.issues}
 </h3>
 <table className="w-full border-collapse border border-gray-300">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.issue}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.impact}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.status}
 </th>
 </tr>
 </thead>
 <tbody>
 {issues.map((issue, index) => (
 <tr key={index}>
 <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">
 {issue.description}
 </td>
 <td className="border border-gray-300 px-3 py-2">
 <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(issue.impact)}`}>
 {t[issue.impact.toLowerCase() as 'high' | 'medium' | 'low']}
 </span>
 </td>
 <td className="border border-gray-300 px-3 py-2">
 <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(issue.status)}`}>
 {t[issue.status.toLowerCase().replace(' ', '') as 'open' | 'inProgress' | 'resolved']}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* 6. Risks */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{labels.risks}</h3>
 <table className="w-full border-collapse border border-gray-300">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.risk}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.probability}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.impact}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.mitigation}
 </th>
 </tr>
 </thead>
 <tbody>
 {risks.map((risk, index) => (
 <tr key={index}>
 <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">
 {risk.description}
 </td>
 <td className="border border-gray-300 px-3 py-2">
 <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(risk.probability)}`}>
 {t[risk.probability.toLowerCase() as 'high' | 'medium' | 'low']}
 </span>
 </td>
 <td className="border border-gray-300 px-3 py-2">
 <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(risk.impact)}`}>
 {t[risk.impact.toLowerCase() as 'high' | 'medium' | 'low']}
 </span>
 </td>
 <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700">
 {risk.mitigation}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* 7. Budget Status */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{labels.budget}</h3>
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <div className="grid grid-cols-5 gap-4">
 <div className="text-center">
 <p className="text-xs text-gray-600 mb-1">{labels.budgeted}</p>
 <p className="text-lg font-bold text-gray-900">{formatCurrency(budgetStatus.budgeted)}</p>
 </div>
 <div className="text-center">
 <p className="text-xs text-gray-600 mb-1">{labels.spent}</p>
 <p className="text-lg font-bold text-red-600">{formatCurrency(budgetStatus.spent)}</p>
 </div>
 <div className="text-center">
 <p className="text-xs text-gray-600 mb-1">{labels.committed}</p>
 <p className="text-lg font-bold text-yellow-600">{formatCurrency(budgetStatus.committed)}</p>
 </div>
 <div className="text-center">
 <p className="text-xs text-gray-600 mb-1">{labels.remaining}</p>
 <p className="text-lg font-bold text-green-600">{formatCurrency(budgetStatus.remaining)}</p>
 </div>
 <div className="text-center">
 <p className="text-xs text-gray-600 mb-1">{labels.variance}</p>
 <p className={`text-lg font-bold ${budgetStatus.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {formatCurrency(budgetStatus.variance)}
 </p>
 </div>
 </div>
 <div className="mt-4">
 <div className="flex items-center gap-2 mb-1">
 <span className="text-xs text-gray-600">{labels.spent}</span>
 <span className="text-xs font-semibold text-gray-900">
 {((budgetStatus.spent / budgetStatus.budgeted) * 100).toFixed(1)}%
 </span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-3">
 <div 
 className="bg-red-600 h-3 rounded-full transition-all"
 style={{ width: `${(budgetStatus.spent / budgetStatus.budgeted) * 100}%` }}
 ></div>
 </div>
 </div>
 </div>
 </div>

 {/* Signature Section */}
 <div className="mt-8 pt-6 border-t-2 border-gray-300">
 <div className="space-y-4">
 <p className="text-sm font-semibold text-gray-900">{labels.preparedBy}</p>
 <div className="grid grid-cols-2 gap-8">
 <div>
 <div className="border-b border-gray-400 pb-12 mb-2">
 <p className="text-xs text-gray-500">{labels.signature}</p>
 </div>
 <p className="text-sm font-semibold">{projectManager}</p>
 <p className="text-xs text-gray-500">{labels.projectManager}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500 mb-1">{labels.dateLabel}</p>
 <div className="border-b border-gray-400 h-12 mb-2"></div>
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
