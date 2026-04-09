/**
 * ============================================================================
 * RECRUITMENT MODULE - MAIN DASHBOARD
 * ============================================================================
 * 
 * End-to-end recruitment management:
 * - Vacancy Management
 * - Candidate Management
 * - Interview & Evaluation
 * - Hiring Decisions
 * - Auto-employee creation
 * 
 * ============================================================================
 */
import { Link } from 'wouter';

import { useState, useEffect } from 'react';
import { 
 Briefcase, 
 Users, 
 Calendar, 
 CheckCircle, 
 Clock,
 Plus,
 FileText,
 UserPlus,
 Search,
 Filter,
 Download
, ArrowLeft, ArrowRight} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
 vacancyService,
 candidateService,
 interviewService,
 recruitmentKPIService
} from './recruitment/recruitmentService';
import { RecruitmentKPIs } from './recruitment/types';
import { VacancyList } from './recruitment/VacancyList';
import { CandidateList } from './recruitment/CandidateList';
import { InterviewScheduling } from './recruitment/InterviewScheduling';
import { InterviewList } from './recruitment/InterviewList';
import { HiringDecisionComponent } from './recruitment/HiringDecision';
import { VacancyForm } from './recruitment/VacancyForm';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

type TabView = 'dashboard' | 'vacancies' | 'candidates' | 'interviews' | 'hiring';

export function Recruitment() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const [activeTab, setActiveTab] = useState<TabView>('dashboard');
 const [showVacancyForm, setShowVacancyForm] = useState(false);
 const [kpis, setKPIs] = useState<RecruitmentKPIs>({
 openVacancies: 0,
 candidatesInPipeline: 0,
 interviewsScheduled: 0,
 positionsFilled: 0,
 averageTimeToHire: 0
 });

 useEffect(() => {
 loadKPIs();
 }, []);

 const loadKPIs = () => {
 const data = recruitmentKPIService.calculate();
 setKPIs(data);
 };

 const labels = {
 title: t.hr.recruitmentManagement,
 subtitle: t.hr.recruitmentSubtitle,

 // Tabs
 dashboard: t.hr.dashboard,
 vacancies: t.hr.vacancies,
 candidates: t.hr.candidates,
 interviews: t.hr.interviews,
 hiringDecisions: t.hr.hiringDecisions,

 // KPIs
 openVacancies: t.hr.openVacancies,
 candidatesInPipeline: t.hr.candidatesInPipeline,
 interviewsScheduled: t.hr.interviewsScheduled,
 positionsFilled: t.hr.positionsFilled,
 avgTimeToHire: t.hr.avgTimeToHire,
 days: t.hr.days,

 // Actions
 newVacancy: t.hr.newVacancy,
 viewAll: t.hr.viewAll,
 
 // Coming soon
 comingSoon: t.hr.fullRecruitmentModuleComingSoon
 };

 return (
 <div className="min-h-screen bg-gray-50 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="mb-6">
 <BackButton href="/organization/hr" label={t.hr.hrDashboard} />
 
 <div className="flex items-center justify-between mt-4">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-sm text-gray-600 mt-1">{labels.subtitle}</p>
 </div>
 
 <button 
 onClick={() => setShowVacancyForm(true)}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
 >
 <Plus className="w-4 h-4" />
 {labels.newVacancy}
 </button>
 </div>
 </div>

 {/* Tabs */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
 <div className="flex items-center gap-1 p-1">
 <button
 onClick={() => setActiveTab('dashboard')}
 className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${ activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50' }`}
 >
 <div className="flex items-center justify-center gap-2">
 <Briefcase className="w-4 h-4" />
 {labels.dashboard}
 </div>
 </button>
 
 <button
 onClick={() => setActiveTab('vacancies')}
 className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${ activeTab === 'vacancies' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50' }`}
 >
 <div className="flex items-center justify-center gap-2">
 <FileText className="w-4 h-4" />
 {labels.vacancies}
 </div>
 </button>
 
 <button
 onClick={() => setActiveTab('candidates')}
 className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${ activeTab === 'candidates' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50' }`}
 >
 <div className="flex items-center justify-center gap-2">
 <Users className="w-4 h-4" />
 {labels.candidates}
 </div>
 </button>
 
 <button
 onClick={() => setActiveTab('interviews')}
 className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${ activeTab === 'interviews' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50' }`}
 >
 <div className="flex items-center justify-center gap-2">
 <Calendar className="w-4 h-4" />
 {labels.interviews}
 </div>
 </button>
 
 <button
 onClick={() => setActiveTab('hiring')}
 className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${ activeTab === 'hiring' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50' }`}
 >
 <div className="flex items-center justify-center gap-2">
 <UserPlus className="w-4 h-4" />
 {labels.hiringDecisions}
 </div>
 </button>
 </div>
 </div>

 {/* Dashboard View */}
 {activeTab === 'dashboard' && (
 <div>
 {/* KPI Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
 {/* Open Vacancies */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
 <div className="flex items-center justify-between mb-2">
 <Briefcase className="w-8 h-8 text-blue-600" />
 <span className="text-3xl font-bold text-gray-900">{kpis.openVacancies}</span>
 </div>
 <div className="text-sm text-gray-600">{labels.openVacancies}</div>
 </div>

 {/* Candidates in Pipeline */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
 <div className="flex items-center justify-between mb-2">
 <Users className="w-8 h-8 text-purple-600" />
 <span className="text-3xl font-bold text-gray-900">{kpis.candidatesInPipeline}</span>
 </div>
 <div className="text-sm text-gray-600">{labels.candidatesInPipeline}</div>
 </div>

 {/* Interviews Scheduled */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
 <div className="flex items-center justify-between mb-2">
 <Calendar className="w-8 h-8 text-orange-600" />
 <span className="text-3xl font-bold text-gray-900">{kpis.interviewsScheduled}</span>
 </div>
 <div className="text-sm text-gray-600">{labels.interviewsScheduled}</div>
 </div>

 {/* Positions Filled */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
 <div className="flex items-center justify-between mb-2">
 <CheckCircle className="w-8 h-8 text-green-600" />
 <span className="text-3xl font-bold text-gray-900">{kpis.positionsFilled}</span>
 </div>
 <div className="text-sm text-gray-600">{labels.positionsFilled}</div>
 </div>

 {/* Average Time to Hire */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
 <div className="flex items-center justify-between mb-2">
 <Clock className="w-8 h-8 text-gray-600" />
 <div className="text-end">
 <span className="text-3xl font-bold text-gray-900">{kpis.averageTimeToHire}</span>
 <span className="text-sm text-gray-500 ms-1">{labels.days}</span>
 </div>
 </div>
 <div className="text-sm text-gray-600">{labels.avgTimeToHire}</div>
 </div>
 </div>

 {/* Quick Actions / Recent Activity */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
 <div className="text-center text-gray-500">
 <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
 <p className="text-lg">{labels.comingSoon}</p>
 </div>
 </div>
 </div>
 )}

 {/* Vacancies Tab */}
 {activeTab === 'vacancies' && (
 <VacancyList language={language} isRTL={isRTL} />
 )}

 {/* Candidates Tab */}
 {activeTab === 'candidates' && (
 <CandidateList language={language} isRTL={isRTL} />
 )}

 {/* Interviews Tab */}
 {activeTab === 'interviews' && (
 <InterviewList language={language} isRTL={isRTL} />
 )}

 {/* Hiring Decisions Tab */}
 {activeTab === 'hiring' && (
 <HiringDecisionComponent language={language} isRTL={isRTL} />
 )}

 {/* Vacancy Form Modal */}
 {showVacancyForm && (
 <VacancyForm
 language={language}
 isRTL={isRTL}
 onClose={() => setShowVacancyForm(false)}
 onSave={() => {
 setShowVacancyForm(false);
 loadKPIs();
 // Switch to vacancies tab to see the new vacancy
 setActiveTab('vacancies');
 }}
 />
 )}
 </div>
 );
}