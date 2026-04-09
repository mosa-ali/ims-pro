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
} from 'lucide-react';
import { BackToModulesButton } from './BackToModulesButton';
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

type TabView = 'dashboard' | 'vacancies' | 'candidates' | 'interviews' | 'hiring';

export function Recruitment() {
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

  const t = {
    title: language === 'en' ? 'Recruitment Management' : 'إدارة التوظيف',
    subtitle: language === 'en' 
      ? 'End-to-end hiring lifecycle management' 
      : 'إدارة دورة التوظيف الكاملة',

    // Tabs
    dashboard: language === 'en' ? 'Dashboard' : 'لوحة التحكم',
    vacancies: language === 'en' ? 'Vacancies' : 'الشواغر',
    candidates: language === 'en' ? 'Candidates' : 'المرشحون',
    interviews: language === 'en' ? 'Interviews' : 'المقابلات',
    hiringDecisions: language === 'en' ? 'Hiring Decisions' : 'قرارات التوظيف',

    // KPIs
    openVacancies: language === 'en' ? 'Open Vacancies' : 'الشواغر المفتوحة',
    candidatesInPipeline: language === 'en' ? 'Candidates in Pipeline' : 'المرشحون قيد المعالجة',
    interviewsScheduled: language === 'en' ? 'Interviews Scheduled' : 'المقابلات المجدولة',
    positionsFilled: language === 'en' ? 'Positions Filled' : 'الوظائف المشغولة',
    avgTimeToHire: language === 'en' ? 'Avg. Time to Hire' : 'متوسط وقت التوظيف',
    days: language === 'en' ? 'days' : 'يوم',

    // Actions
    newVacancy: language === 'en' ? 'New Vacancy' : 'شاغر جديد',
    viewAll: language === 'en' ? 'View All' : 'عرض الكل',
    
    // Coming soon
    comingSoon: language === 'en' ? 'Full recruitment module coming soon...' : 'سيتم إطلاق وحدة التوظيف الكاملة قريباً...'
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-6">
        <BackToModulesButton 
          targetPath="/organization/hr"
          parentModuleName={language === 'en' ? 'HR Dashboard' : 'لوحة الموارد البشرية'}
        />
        
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
          </div>
          
          <button 
            onClick={() => setShowVacancyForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t.newVacancy}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center gap-1 p-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Briefcase className="w-4 h-4" />
              {t.dashboard}
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('vacancies')}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'vacancies'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              {t.vacancies}
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('candidates')}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'candidates'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              {t.candidates}
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('interviews')}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'interviews'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              {t.interviews}
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('hiring')}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'hiring'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <UserPlus className="w-4 h-4" />
              {t.hiringDecisions}
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
              <div className="text-sm text-gray-600">{t.openVacancies}</div>
            </div>

            {/* Candidates in Pipeline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-purple-600" />
                <span className="text-3xl font-bold text-gray-900">{kpis.candidatesInPipeline}</span>
              </div>
              <div className="text-sm text-gray-600">{t.candidatesInPipeline}</div>
            </div>

            {/* Interviews Scheduled */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-orange-600" />
                <span className="text-3xl font-bold text-gray-900">{kpis.interviewsScheduled}</span>
              </div>
              <div className="text-sm text-gray-600">{t.interviewsScheduled}</div>
            </div>

            {/* Positions Filled */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <span className="text-3xl font-bold text-gray-900">{kpis.positionsFilled}</span>
              </div>
              <div className="text-sm text-gray-600">{t.positionsFilled}</div>
            </div>

            {/* Average Time to Hire */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-gray-600" />
                <div className="text-right">
                  <span className="text-3xl font-bold text-gray-900">{kpis.averageTimeToHire}</span>
                  <span className="text-sm text-gray-500 ml-1">{t.days}</span>
                </div>
              </div>
              <div className="text-sm text-gray-600">{t.avgTimeToHire}</div>
            </div>
          </div>

          {/* Quick Actions / Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center text-gray-500">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg">{t.comingSoon}</p>
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