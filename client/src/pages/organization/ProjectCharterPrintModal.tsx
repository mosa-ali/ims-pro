/**
 * ============================================================================
 * PROJECT CHARTER PRINT MODAL - Project Initiation Document
 * ============================================================================
 * ✅ Official project authorization document
 * ✅ A4 Layout, print-optimized
 * ✅ Organization branding
 * ✅ Project overview, objectives, team structure, timeline
 * ✅ Suitable for stakeholder approval & project kickoff
 * ============================================================================
 */

import { X, Printer, FileText, Target, Users, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getOrganizationSettings } from '@/services/organizationService';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
interface TeamMember {
 name: string;
 role: string;
 department?: string;
}

interface Objective {
 id: string;
 description: string;
 priority: 'High' | 'Medium' | 'Low';
}

interface Milestone {
 name: string;
 date: string;
 deliverable?: string;
}

interface Props {
 projectName: string;
 projectCode: string;
 projectManager: string;
 sponsor: string;
 startDate: string;
 endDate: string;
 
 background: string;
 objectives: Objective[];
 scope: string;
 outOfScope?: string;
 
 teamMembers: TeamMember[];
 milestones: Milestone[];
 
 budget: number;
 currency: string;
 
 risks?: string;
 assumptions?: string;
 
 onClose: () => void;
}

export function ProjectCharterPrintModal({
 projectName,
 projectCode,
 projectManager,
 sponsor,
 startDate,
 endDate,
 background,
 objectives,
 scope,
 outOfScope,
 teamMembers,
 milestones,
 budget,
 currency,
 risks,
 assumptions,
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

 const formatDate = (dateString: string) => {
 return new Date(dateString).toLocaleDateString(t.organizationModule.en, {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 });
 };

 const getPriorityBadge = (priority: string) => {
 const colors = {
 'High': 'bg-red-100 text-red-700 border-red-200',
 'Medium': 'bg-yellow-100 text-yellow-700 border-yellow-200',
 'Low': 'bg-green-100 text-green-700 border-green-200'
 };
 return colors[priority as keyof typeof colors] || colors.Medium;
 };

 const labels = {
 title: t.organizationModule.projectCharter,
 subtitle: t.organizationModule.projectInitiationDocument,
 
 projectInfo: t.organizationModule.projectInformation,
 projectName: t.organizationModule.projectName20,
 projectCode: t.organizationModule.projectCode,
 projectManager: t.organizationModule.projectManager,
 sponsor: t.organizationModule.projectSponsor,
 duration: t.organizationModule.duration21,
 budget: t.organizationModule.totalBudget14,
 
 background: t.organizationModule.k1ProjectBackground,
 objectives: t.organizationModule.k2ProjectObjectives,
 priority: t.organizationModule.priority,
 high: t.organizationModule.high,
 medium: t.organizationModule.medium,
 low: t.organizationModule.low,
 
 scope: t.organizationModule.k3ProjectScope,
 inScope: t.organizationModule.inScope,
 outOfScope: t.organizationModule.outOfScope,
 
 team: t.organizationModule.k4ProjectTeamStructure,
 name: t.organizationModule.name,
 role: t.organizationModule.role,
 department: t.organizationModule.department,
 
 milestones: t.organizationModule.k5KeyMilestones,
 milestone: t.organizationModule.milestone,
 date: t.organizationModule.date,
 deliverable: t.organizationModule.deliverable,
 
 risks: t.organizationModule.k6KeyRisks,
 assumptions: t.organizationModule.k7KeyAssumptions,
 
 approval: t.organizationModule.approvalSignoff,
 preparedBy: t.organizationModule.preparedBy19,
 approvedBy: t.organizationModule.approvedBy,
 signature: t.organizationModule.signature,
 dateLabel: t.organizationModule.date,
 
 print: t.organizationModule.print,
 close: t.organizationModule.close,
 
 docNumber: t.organizationModule.document,
 generatedOn: t.organizationModule.generatedOn,
 confidential: 'This document is confidential and intended for authorized personnel only.'
 };

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
 <p className="text-gray-600">{labels.docNumber}: PC-{projectCode}-{new Date().getFullYear()}</p>
 <p className="text-gray-600">{labels.generatedOn}: {formatDate(new Date().toISOString())}</p>
 </div>
 </div>

 {/* Document Title */}
 <div className="text-center mb-8">
 <h2 className="text-3xl font-bold text-gray-900">{labels.title}</h2>
 <p className="text-xl text-blue-600 mt-2">{projectName}</p>
 </div>

 {/* Project Information Box */}
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
 <p className="text-sm text-gray-600">{labels.sponsor}</p>
 <p className="text-base font-semibold text-gray-900">{sponsor}</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">{labels.duration}</p>
 <p className="text-base font-semibold text-gray-900">
 {formatDate(startDate)} - {formatDate(endDate)}
 </p>
 </div>
 <div className="col-span-2">
 <p className="text-sm text-gray-600">{labels.budget}</p>
 <p className="text-xl font-bold text-green-600">{formatCurrency(budget)}</p>
 </div>
 </div>
 </div>

 {/* 1. Background */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
 <FileText className="w-5 h-5 text-blue-600" />
 {labels.background}
 </h3>
 <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
 {background}
 </p>
 </div>

 {/* 2. Objectives */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
 <Target className="w-5 h-5 text-blue-600" />
 {labels.objectives}
 </h3>
 <div className="space-y-3">
 {objectives.map((obj, index) => (
 <div key={obj.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
 <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
 {index + 1}
 </div>
 <div className="flex-1">
 <p className="text-sm text-gray-900">{obj.description}</p>
 </div>
 <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityBadge(obj.priority)}`}>
 {t[obj.priority.toLowerCase() as 'high' | 'medium' | 'low']}
 </span>
 </div>
 ))}
 </div>
 </div>

 {/* 3. Scope */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{labels.scope}</h3>
 <div className="space-y-3">
 <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
 <p className="text-sm font-semibold text-green-900 mb-2">{labels.inScope}</p>
 <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{scope}</p>
 </div>
 {outOfScope && (
 <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
 <p className="text-sm font-semibold text-red-900 mb-2">{labels.outOfScope}</p>
 <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{outOfScope}</p>
 </div>
 )}
 </div>
 </div>

 {/* 4. Team Structure */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
 <Users className="w-5 h-5 text-blue-600" />
 {labels.team}
 </h3>
 <table className="w-full border-collapse border border-gray-300">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.name}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.role}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.department}
 </th>
 </tr>
 </thead>
 <tbody>
 {teamMembers.map((member, index) => (
 <tr key={index}>
 <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">
 {member.name}
 </td>
 <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700">
 {member.role}
 </td>
 <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700">
 {member.department || '-'}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* 5. Milestones */}
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
 <Calendar className="w-5 h-5 text-blue-600" />
 {labels.milestones}
 </h3>
 <table className="w-full border-collapse border border-gray-300">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.milestone}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.date}
 </th>
 <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-start">
 {labels.deliverable}
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
 {formatDate(milestone.date)}
 </td>
 <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700">
 {milestone.deliverable || '-'}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* 6. Risks */}
 {risks && (
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{labels.risks}</h3>
 <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
 <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{risks}</p>
 </div>
 </div>
 )}

 {/* 7. Assumptions */}
 {assumptions && (
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-3">{labels.assumptions}</h3>
 <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
 <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{assumptions}</p>
 </div>
 </div>
 )}

 {/* Approval Section */}
 <div className="mt-8 pt-6 border-t-2 border-gray-300">
 <h3 className="text-lg font-semibold text-gray-900 mb-4">{labels.approval}</h3>
 <div className="grid grid-cols-2 gap-8">
 <div className="space-y-4">
 <p className="text-sm font-semibold text-gray-900">{labels.preparedBy}</p>
 <div className="space-y-2">
 <div className="border-b border-gray-400 pb-12">
 <p className="text-xs text-gray-500">{labels.signature}</p>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-xs text-gray-500 mb-1">{labels.name}</p>
 <p className="text-sm font-semibold">{projectManager}</p>
 </div>
 <div>
 <p className="text-xs text-gray-500 mb-1">{labels.dateLabel}</p>
 <div className="border-b border-gray-400 h-6"></div>
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
 <p className="text-sm font-semibold">{sponsor}</p>
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
