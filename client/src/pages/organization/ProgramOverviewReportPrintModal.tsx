/**
 * ============================================================================
 * PROGRAM OVERVIEW REPORT PRINT MODAL - Portfolio Summary Document
 * ============================================================================
 * ✅ Strategic program-level reporting
 * ✅ A4 Layout, print-optimized
 * ✅ Organization branding
 * ✅ Portfolio summary, cross-project metrics, resource allocation
 * ✅ Suitable for executive reporting & donor communication
 * ============================================================================
 */

import { X, Printer, Layers, TrendingUp, Users, DollarSign, Target } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getOrganizationSettings } from '@/services/organizationService';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
interface ProjectSummary {
 projectName: string;
 projectCode: string;
 status: 'On Track' | 'At Risk' | 'Completed' | 'Delayed';
 budget: number;
 spent: number;
 progress: number;
}

interface ProgramMetric {
 indicator: string;
 target: number | string;
 achieved: number | string;
 unit: string;
 progress: number;
}

interface ResourceAllocation {
 category: string;
 allocated: number;
 utilized: number;
 available: number;
}

interface ThematicArea {
 name: string;
 projects: number;
 budget: number;
 beneficiaries: number;
}

interface Props {
 programName: string;
 programCode: string;
 programManager: string;
 reportingPeriod: string;
 reportDate: string;
 
 executiveSummary: string;
 strategicObjectives: string;
 
 projects: ProjectSummary[];
 programMetrics: ProgramMetric[];
 resourceAllocation: ResourceAllocation[];
 thematicAreas: ThematicArea[];
 
 totalBudget: number;
 totalSpent: number;
 totalBeneficiaries: number;
 activeProjects: number;
 
 currency: string;
 
 keyAchievements: string;
 challenges: string;
 nextSteps: string;
 
 onClose: () => void;
}

export function ProgramOverviewReportPrintModal({
 programName,
 programCode,
 programManager,
 reportingPeriod,
 reportDate,
 executiveSummary,
 strategicObjectives,
 projects,
 programMetrics,
 resourceAllocation,
 thematicAreas,
 totalBudget,
 totalSpent,
 totalBeneficiaries,
 activeProjects,
 currency,
 keyAchievements,
 challenges,
 nextSteps,
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
 return new Intl.NumberFormat(t.organizationModule.en, {
 style: 'currency',
 currency: currency || 'USD',
 minimumFractionDigits: 0
 }).format(amount);
 };

 const formatNumber = (num: number) => {
 return new Intl.NumberFormat(t.organizationModule.en).format(num);
 };

 const formatDate = (dateString: string) => {
 return new Date(dateString).toLocaleDateString(t.organizationModule.en, {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 });
 };

 const getStatusColor = (status: string) => {
 const colors = {
 'On Track': 'bg-green-100 text-green-700 border-green-200',
 'At Risk': 'bg-yellow-100 text-yellow-700 border-yellow-200',
 'Completed': 'bg-blue-100 text-blue-700 border-blue-200',
 'Delayed': 'bg-red-100 text-red-700 border-red-200'
 };
 return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
 };

 const labels = {
 title: t.organizationModule.programOverviewReport,
 subtitle: t.organizationModule.strategicPortfolioSummary,
 
 programInfo: t.organizationModule.programInformation,
 programName: t.organizationModule.programName,
 programCode: t.organizationModule.programCode,
 programManager: t.organizationModule.programManager,
 reportingPeriod: t.organizationModule.reportingPeriod,
 reportDate: t.organizationModule.reportDate,
 
 dashboard: t.organizationModule.programDashboard,
 totalBudget: t.organizationModule.totalBudget14,
 totalSpent: t.organizationModule.totalSpent,
 beneficiaries: t.organizationModule.totalBeneficiaries,
 activeProjects: t.organizationModule.activeProjects,
 
 executiveSummary: t.organizationModule.k1ExecutiveSummary,
 strategicObjectives: t.organizationModule.k2StrategicObjectives,
 
 portfolio: t.organizationModule.k3ProjectPortfolio,
 projectName: t.organizationModule.project,
 code: t.organizationModule.code,
 status: t.organizationModule.status,
 budget: t.organizationModule.budget12,
 spent: t.organizationModule.spent15,
 progress: t.organizationModule.progress,
 
 metrics: t.organizationModule.k4ProgramlevelMetrics,
 indicator: t.organizationModule.indicator,
 target: t.organizationModule.target,
 achieved: t.organizationModule.achieved16,
 achievement: t.organizationModule.achievement,
 
 resources: t.organizationModule.k5ResourceAllocation,
 category: t.organizationModule.category,
 allocated: t.organizationModule.allocated,
 utilized: t.organizationModule.utilized,
 available: t.organizationModule.available,
 
 thematic: t.organizationModule.k6ThematicAreas,
 area: t.organizationModule.area,
 projects: t.organizationModule.projects17,
 
 achievements: t.organizationModule.k7KeyAchievements,
 challenges: t.organizationModule.k8ChallengesMitigation,
 nextSteps: t.organizationModule.k9NextSteps,
 
 onTrack: t.organizationModule.onTrack18,
 atRisk: t.organizationModule.atRisk,
 completed: t.organizationModule.completed,
 delayed: t.organizationModule.delayed,
 
 preparedBy: t.organizationModule.preparedBy19,
 signature: t.organizationModule.signature,
 dateLabel: t.organizationModule.date,
 
 print: t.organizationModule.print,
 close: t.organizationModule.close,
 
 docNumber: t.organizationModule.document,
 generatedOn: t.organizationModule.generatedOn,
 confidential: 'This document is confidential and intended for authorized personnel only.'
 };

 const utilizationPercentage = (totalBudget > 0) ? ((totalSpent / totalBudget) * 100) : 0;

 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
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
 {orgSettings.logoUrl && (
 <img 
 src={orgSettings.logoUrl} 
 alt="Organization Logo" 
 className="h-16 mb-3"
 />
 )}
 <h1 className="text-2xl font-bold text-gray-900">{orgName}</h1>
 <p className="text-sm text-gray-600 mt-1">{labels.subtitle}</p>
 </div>
 <div className={`text-sm text-end`}>
 <p className="text-gray-600">{labels.docNumber}: POR-{programCode}-{new Date().getFullYear()}</p>
 <p className="text-gray-600">{labels.generatedOn}: {formatDate(new Date().toISOString())}</p>
 </div>
 </div>

 {/* Document Title */}
 <div className="text-center mb-8">
 <div className="flex items-center justify-center gap-3 mb-3">
 <Layers className="w-10 h-10 text-blue-600" />
 <h2 className="text-3xl font-bold text-gray-900">{labels.title}</h2>
 </div>
 <p className="text-xl text-blue-600">{programName}</p>
 </div>

 {/* Program Information & Dashboard */}
 <div className="grid grid-cols-2 gap-4 mb-6">
 {/* Program Info */}
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <h3 className="text-base font-semibold text-gray-900 mb-3">{labels.programInfo}</h3>
 <div className="space-y-2">
 <div>
 <p className="text-xs text-gray-600">{labels.programCode}</p>
 <p className="text-sm font-semibold text-gray-900">{programCode}</p>
 </div>
 <div>
 <p className="text-xs text-gray-600">{labels.programManager}</p>
 <p className="text-sm font-semibold text-gray-900">{programManager}</p>
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

 {/* Program Dashboard */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <h3 className="text-base font-semibold text-gray-900 mb-3">{labels.dashboard}</h3>
 <div className="grid grid-cols-2 gap-3">
 <div className="bg-white rounded p-2 border border-blue-100">
 <p className="text-xs text-gray-600">{labels.totalBudget}</p>
 <p className="text-sm font-bold text-gray-900">{formatCurrency(totalBudget)}</p>
 </div>
 <div className="bg-white rounded p-2 border border-blue-100">
 <p className="text-xs text-gray-600">{labels.totalSpent}</p>
 <p className="text-sm font-bold text-red-600">{formatCurrency(totalSpent)}</p>
 </div>
 <div className="bg-white rounded p-2 border border-blue-100">
 <p className="text-xs text-gray-600">{labels.beneficiaries}</p>
 <p className="text-sm font-bold text-green-600">{formatNumber(totalBeneficiaries)}</p>
 </div>
 <div className="bg-white rounded p-2 border border-blue-100">
 <p className="text-xs text-gray-600">{labels.activeProjects}</p>
 <p className="text-sm font-bold text-blue-600">{activeProjects}</p>
 </div>
 </div>
 <div className="mt-3">
 <p className="text-xs text-gray-600 mb-1">{labels.budget} {labels.utilized}</p>
 <div className="flex items-center gap-2">
 <div className="flex-1 bg-gray-200 rounded-full h-2">
 <div 
 className="bg-blue-600 h-2 rounded-full transition-all"
 style={{ width: `${utilizationPercentage}%` }}
 ></div>
 </div>
 <span className="text-xs font-semibold text-gray-900">{utilizationPercentage.toFixed(1)}%</span>
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

 {/* 2. Strategic Objectives */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
 <Target className="w-5 h-5 text-blue-600" />
 {labels.strategicObjectives}
 </h3>
 <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
 <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{strategicObjectives}</p>
 </div>
 </div>

 {/* 3. Project Portfolio */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{labels.portfolio}</h3>
 <table className="w-full border-collapse border border-gray-300">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-900 text-start">
 {labels.projectName}
 </th>
 <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-900 text-start">
 {labels.code}
 </th>
 <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-900 text-start">
 {labels.status}
 </th>
 <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-900 text-end">
 {labels.budget}
 </th>
 <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-900 text-end">
 {labels.spent}
 </th>
 <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-900 text-center">
 {labels.progress}
 </th>
 </tr>
 </thead>
 <tbody>
 {projects.map((project, index) => (
 <tr key={index}>
 <td className="border border-gray-300 px-2 py-2 text-xs text-gray-900">
 {project.projectName}
 </td>
 <td className="border border-gray-300 px-2 py-2 text-xs text-gray-700">
 {project.projectCode}
 </td>
 <td className="border border-gray-300 px-2 py-2">
 <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(project.status)}`}>
 {t[project.status.toLowerCase().replace(' ', '') as keyof typeof t] || project.status}
 </span>
 </td>
 <td className="border border-gray-300 px-2 py-2 text-xs text-gray-700 text-end">
 {formatCurrency(project.budget)}
 </td>
 <td className="border border-gray-300 px-2 py-2 text-xs text-gray-700 text-end">
 {formatCurrency(project.spent)}
 </td>
 <td className="border border-gray-300 px-2 py-2 text-center">
 <div className="flex items-center gap-1 justify-center">
 <div className="w-16 bg-gray-200 rounded-full h-2">
 <div 
 className="bg-blue-600 h-2 rounded-full"
 style={{ width: `${project.progress}%` }}
 ></div>
 </div>
 <span className="text-xs font-semibold">{project.progress}%</span>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* 4. Program Metrics */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{labels.metrics}</h3>
 <table className="w-full border-collapse border border-gray-300">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.indicator}
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
 {programMetrics.map((metric, index) => (
 <tr key={index}>
 <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">
 {metric.indicator}
 </td>
 <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700">
 {metric.target} {metric.unit}
 </td>
 <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700">
 {metric.achieved} {metric.unit}
 </td>
 <td className="border border-gray-300 px-3 py-2">
 <div className="flex items-center gap-2">
 <div className="flex-1 bg-gray-200 rounded-full h-2">
 <div 
 className={`h-2 rounded-full ${metric.progress >= 100 ? 'bg-green-600' : metric.progress >= 75 ? 'bg-blue-600' : 'bg-yellow-600'}`}
 style={{ width: `${Math.min(metric.progress, 100)}%` }}
 ></div>
 </div>
 <span className="text-xs font-semibold text-gray-900 w-12 text-end">
 {metric.progress}%
 </span>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* 5. Resource Allocation */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
 <DollarSign className="w-5 h-5 text-blue-600" />
 {labels.resources}
 </h3>
 <table className="w-full border-collapse border border-gray-300">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.category}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-end">
 {labels.allocated}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-end">
 {labels.utilized}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-end">
 {labels.available}
 </th>
 </tr>
 </thead>
 <tbody>
 {resourceAllocation.map((resource, index) => (
 <tr key={index}>
 <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">
 {resource.category}
 </td>
 <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700 text-end">
 {formatCurrency(resource.allocated)}
 </td>
 <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700 text-end">
 {formatCurrency(resource.utilized)}
 </td>
 <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700 text-end">
 {formatCurrency(resource.available)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* 6. Thematic Areas */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{labels.thematic}</h3>
 <div className="grid grid-cols-2 gap-4">
 {thematicAreas.map((area, index) => (
 <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <h4 className="text-sm font-semibold text-gray-900 mb-2">{area.name}</h4>
 <div className="space-y-1">
 <div className="flex justify-between text-xs">
 <span className="text-gray-600">{labels.projects}</span>
 <span className="font-semibold text-gray-900">{area.projects}</span>
 </div>
 <div className="flex justify-between text-xs">
 <span className="text-gray-600">{labels.budget}</span>
 <span className="font-semibold text-gray-900">{formatCurrency(area.budget)}</span>
 </div>
 <div className="flex justify-between text-xs">
 <span className="text-gray-600">{labels.beneficiaries}</span>
 <span className="font-semibold text-gray-900">{formatNumber(area.beneficiaries)}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* 7. Key Achievements */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{labels.achievements}</h3>
 <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
 <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{keyAchievements}</p>
 </div>
 </div>

 {/* 8. Challenges */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{labels.challenges}</h3>
 <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
 <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{challenges}</p>
 </div>
 </div>

 {/* 9. Next Steps */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{labels.nextSteps}</h3>
 <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
 <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{nextSteps}</p>
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
 <p className="text-sm font-semibold">{programManager}</p>
 <p className="text-xs text-gray-500">{labels.programManager}</p>
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
