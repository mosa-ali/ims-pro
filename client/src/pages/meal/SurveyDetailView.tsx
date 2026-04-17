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

import { useNavigate, useParams } from '@/lib/router-compat';
import { useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { useState, useEffect } from 'react';
import { FileText, Edit, Database, Settings as SettingsIcon, AlertCircle, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

// Import tab components
import { SurveySummaryTab } from './tabs/SurveySummaryTab';
import { SurveyFormTab } from './tabs/SurveyFormTab';
import { SurveyDataTab } from './tabs/SurveyDataTab';
import { SurveySettingsTab } from './tabs/SurveySettingsTab';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

type TabKey = 'summary' | 'form' | 'data' | 'settings';

export function SurveyDetailView() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const { id: surveyId } = useParams<{ id: string }>();
 const searchString = useSearch();
 const searchParams = new URLSearchParams(searchString);
 const { language, isRTL } = useLanguage();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();

 const projectId = searchParams.get('projectId') || '';
 const projectName = searchParams.get('projectName') || '';
 const initialTab = (searchParams.get('tab') as TabKey) || 'summary';

 const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

 const labels = {
 back: t.mealSurvey.backToSurveys3,
 summary: t.mealSurvey.summary,
 form: t.mealSurvey.form,
 data: t.mealSurvey.data,
 settings: t.mealSurvey.settings,
 loading: t.mealSurvey.loading,
 notFound: t.mealSurvey.surveyNotFound,
 missingScope: t.mealSurvey.missingScopeContext || 'Missing scope context. Organization and Operating Unit must be selected.',
 };

 const tabs: Array<{ key: TabKey; label: string; icon: any }> = [
 { key: 'summary', label: labels.summary, icon: FileText },
 { key: 'form', label: labels.form, icon: Edit },
 { key: 'data', label: labels.data, icon: Database },
 { key: 'settings', label: labels.settings, icon: SettingsIcon },
 ];

 // ✅ RTL: Reverse tab order for Arabic
 const displayTabs = isRTL ? [...tabs].reverse() : tabs;

 // ✅ FIXED: Use tRPC query with scope validation
 const { data: survey, isLoading: surveyLoading, error: surveyError } = trpc.mealSurveys.getById.useQuery(
   { id: surveyId ? parseInt(surveyId) : 0 },
   { 
     enabled: !!surveyId && !!currentOrganizationId && !!currentOperatingUnitId,
   }
 );

 const handleTabChange = (tabKey: TabKey) => {
 setActiveTab(tabKey);
 // Update URL
 navigate(`/organization/meal/survey/detail/${surveyId}?projectId=${projectId}&projectName=${projectName}&tab=${tabKey}`, { replace: true });
 };

 // ✅ Show error if scope context is missing
 if (!currentOrganizationId || !currentOperatingUnitId) {
   return (
     <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`}>
       <div className="max-w-md w-full">
         <div className="bg-white rounded-lg shadow-lg p-6">
           <div className="flex items-start gap-4">
             <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
             <div>
               <h2 className="text-lg font-semibold text-gray-900 mb-2">{labels.notFound}</h2>
               <p className="text-sm text-gray-600">{labels.missingScope}</p>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
 }

 // ✅ Show loading state
 if (surveyLoading) {
   return (
     <div className="flex items-center justify-center min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
       <div className="text-center">
         <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
         <p className="text-gray-600">{labels.loading}</p>
       </div>
     </div>
   );
 }

 // ✅ Show error if survey not found
 if (surveyError || !survey) {
   return (
     <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`}>
       <div className="max-w-md w-full">
         <div className="bg-white rounded-lg shadow-lg p-6">
           <div className="flex items-start gap-4">
             <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
             <div>
               <h2 className="text-lg font-semibold text-gray-900 mb-2">{labels.notFound}</h2>
               <p className="text-sm text-gray-600">The survey you are looking for does not exist or you do not have access to it.</p>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
 }

 return (
 <div className="min-h-screen bg-gray-50">
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal/survey')} label={t.mealSurvey.backToSurveys} />
 {/* Header */}
 <div className="bg-white border-b border-gray-200">
 <div className="max-w-7xl mx-auto px-6 py-4">
 <div className={`flex items-center justify-between`}>
 <div className={`flex items-center gap-4`}>
 <div className={'text-start'}>
 <h1 className="text-xl font-bold text-gray-900">{survey.title}</h1>
 <p className="text-sm text-gray-600">{projectName}</p>
 </div>
 </div>
 </div>

 {/* Tabs Navigation */}
 <div className={`flex gap-1 mt-4 border-b border-gray-200`}>
 {displayTabs.map((tab) => {
 const Icon = tab.icon;
 return (
 <button
 key={tab.key}
 onClick={() => handleTabChange(tab.key)}
 className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${ activeTab === tab.key ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50' }`}
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
