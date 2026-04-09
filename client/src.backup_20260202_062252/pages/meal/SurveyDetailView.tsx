/**
 * ============================================================================
 * SURVEY DETAIL VIEW (KOBO/ODK STYLE)
 * ============================================================================
 * 
 * Complete survey detail view with tabbed interface
 * 
 * TABS:
 * - Summary: Overview and KPIs
 * - Form: Form builder with versioning
 * - Data: Parent tab with sub-tabs (Table, Reports, Gallery, Downloads, Map)
 * - Settings: Survey metadata and configuration
 * 
 * RTL/LTR Support: Tabs flow RIGHT→LEFT in Arabic, LEFT→RIGHT in English
 * 
 * ============================================================================
 */

import { useLocation, useSearch, useParams } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Edit, Database, Settings as SettingsIcon } from 'lucide-react';
import { surveyService } from '@/services/mealService';

// Import tab components
import { SurveySummaryTab } from './tabs/SurveySummaryTab';
import { SurveyFormTab } from './tabs/SurveyFormTab';
import { SurveyDataTab } from './tabs/SurveyDataTab';
import { SurveySettingsTab } from './tabs/SurveySettingsTab';

type TabKey = 'summary' | 'form' | 'data' | 'settings';

export function SurveyDetailView() {
  const [, navigate] = useLocation();
  const { id: surveyId } = useParams<{ id: string }>();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const { language, isRTL } = useLanguage();

  const projectId = searchParams.get('projectId') || '';
  const projectName = searchParams.get('projectName') || '';
  const initialTab = (searchParams.get('tab') as TabKey) || 'summary';

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [survey, setSurvey] = useState<any>(null);

  const t = {
    back: language === 'en' ? 'Back to Surveys' : 'العودة للمسوحات',
    summary: language === 'en' ? 'Summary' : 'ملخص',
    form: language === 'en' ? 'Form' : 'النموذج',
    data: language === 'en' ? 'Data' : 'البيانات',
    settings: language === 'en' ? 'Settings' : 'الإعدادات',
    loading: language === 'en' ? 'Loading...' : 'جاري التحميل...',
    notFound: language === 'en' ? 'Survey not found' : 'المسح غير موجود',
  };

  const tabs: Array<{ key: TabKey; label: string; icon: any }> = [
    { key: 'summary', label: t.summary, icon: FileText },
    { key: 'form', label: t.form, icon: Edit },
    { key: 'data', label: t.data, icon: Database },
    { key: 'settings', label: t.settings, icon: SettingsIcon },
  ];

  // ✅ RTL: Reverse tab order for Arabic
  const displayTabs = isRTL ? [...tabs].reverse() : tabs;

  useEffect(() => {
    if (surveyId) {
      const loadedSurvey = surveyService.getSurveyById(surveyId);
      setSurvey(loadedSurvey);
    }
  }, [surveyId]);

  const handleTabChange = (tabKey: TabKey) => {
    setActiveTab(tabKey);
    // Update URL
    navigate(`/meal/survey/detail/${surveyId}?projectId=${projectId}&projectName=${projectName}&tab=${tabKey}`, { replace: true });
  };

  if (!survey) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => navigate(`/meal/survey?projectId=${projectId}&projectName=${projectName}`)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                <span className="text-sm font-medium text-gray-700">{t.back}</span>
              </button>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h1 className="text-xl font-bold text-gray-900">{survey.name}</h1>
                <p className="text-sm text-gray-600">{projectName}</p>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className={`flex gap-1 mt-4 border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {displayTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${isRTL ? 'flex-row-reverse' : ''} ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'summary' && <SurveySummaryTab survey={survey} projectId={projectId} projectName={projectName} />}
        {activeTab === 'form' && <SurveyFormTab survey={survey} projectId={projectId} projectName={projectName} />}
        {activeTab === 'data' && <SurveyDataTab survey={survey} projectId={projectId} projectName={projectName} />}
        {activeTab === 'settings' && <SurveySettingsTab survey={survey} projectId={projectId} projectName={projectName} />}
      </div>
    </div>
  );
}