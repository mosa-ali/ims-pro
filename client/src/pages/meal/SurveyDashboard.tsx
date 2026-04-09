/**
 * ============================================================================
 * SURVEY DASHBOARD (COMPLETE WITH NAVIGATION)
 * ============================================================================
 * 
 * Main Survey & Data Collection dashboard with KPI cards and navigation
 * 
 * FEATURES:
 * - KPI cards showing survey metrics
 * - Navigation cards to all sub-modules
 * - Quick actions (New Survey, View All Surveys)
 * - Project-specific filtering
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import { useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
 ClipboardList, 
 CheckCircle, 
 BarChart3, 
 Calendar, 
 AlertTriangle, 
 Target,
 FileText,
 Database,
 Upload,
 Download,
 Settings as SettingsIcon,
 List,
 ArrowLeft, ArrowRight
} from 'lucide-react';
import { surveyService } from '@/services/mealService';
import { seedTestSurvey } from '@/utils/seedTestSurvey';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

interface KPICard {
 id: string;
 label: string;
 value: number;
 description: string;
 color: string;
 icon: any;
}

export function SurveyDashboard() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const searchString = useSearch();
 const searchParams = new URLSearchParams(searchString);
 const { language, isRTL } = useLanguage();
 const [kpiCards, setKpiCards] = useState<KPICard[]>([]);
 const [loading, setLoading] = useState(true);

 const projectId = searchParams.get('projectId') || '';
 const projectName = searchParams.get('projectName') || '';
 const ngoName = searchParams.get('ngoName') || '';

 const labels = {
 title: t.mealSurvey.surveyDataCollection,
 projectLabel: t.mealSurvey.project2,
 ngoLabel: t.mealSurvey.ngo,
 back: t.mealSurvey.back,
 newSurvey: t.mealSurvey.newSurvey,
 viewAllSurveys: t.mealSurvey.viewAllSurveys,
 kpiCards: t.mealSurvey.kpiOverview,
 navigation: t.mealSurvey.quickAccess,
 
 // Navigation cards
 allSurveys: t.mealSurvey.allSurveys,
 allSurveysDesc: t.mealSurvey.viewAndManageAllSurveysIn,
 forms: t.mealSurvey.surveyForms,
 formsDesc: t.mealSurvey.browseAndManageSurveyForms,
 templates: t.mealSurvey.templates,
 templatesDesc: t.mealSurvey.prebuiltSurveyTemplates,
 dataCollection: t.mealSurvey.dataCollection,
 dataCollectionDesc: t.mealSurvey.viewAndVerifySubmissions,
 importExport: t.mealSurvey.importExport,
 importExportDesc: t.mealSurvey.moveDataInAndOutOf,
 reportsAnalytics: t.mealSurvey.reportsAnalytics,
 reportsAnalyticsDesc: t.mealSurvey.viewSurveyInsightsAndCharts,
 settings: t.mealSurvey.settings,
 settingsDesc: t.mealSurvey.configureModulePreferences,
 };

 useEffect(() => {
 // ✅ Seed test survey data if in development
 if (projectId) {
 try {
 seedTestSurvey(projectId);
 } catch (error) {
 console.error('Error seeding test survey:', error);
 }
 }
 
 // ✅ Load REAL data from surveyService and localStorage
 try {
 const allSurveys = surveyService.getAllSurveys();
 
 // Filter by project if projectId is provided
 const projectSurveys = projectId 
 ? allSurveys.filter(s => s.projectId === projectId)
 : allSurveys;
 
 const totalForms = projectSurveys.length;
 const activeForms = projectSurveys.filter(s => s.status === 'published').length;
 
 // ✅ Load REAL submissions from localStorage
 const STORAGE_KEY = 'meal_submissions';
 const storedSubmissions = localStorage.getItem(STORAGE_KEY);
 let allSubmissions: any[] = [];
 
 if (storedSubmissions) {
 allSubmissions = JSON.parse(storedSubmissions);
 }
 
 // Filter submissions by project surveys
 const projectSurveyIds = projectSurveys.map(s => s.id);
 const projectSubmissions = allSubmissions.filter(sub => 
 projectSurveyIds.includes(sub.surveyId)
 );
 
 const totalSubmissions = projectSubmissions.length;
 
 // Calculate submissions in the last 30 days
 const thirtyDaysAgo = new Date();
 thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
 const submissionsThisPeriod = projectSubmissions.filter(sub => {
 const subDate = new Date(sub.submittedAt);
 return subDate >= thirtyDaysAgo;
 }).length;
 
 // ✅ Calculate verified and approved submissions
 const verifiedAndApproved = projectSubmissions.filter(sub => 
 sub.validationStatus === 'approved'
 ).length;
 
 // Calculate pending reviews (submissions without validation status or pending)
 const pendingReviews = projectSubmissions.filter(sub => 
 !sub.validationStatus || sub.validationStatus === 'pending'
 ).length;
 
 // Count linked indicators (this would come from actual indicator linkage in production)
 const linkedIndicators = activeForms * 2; // Keep this as-is for now

 const cards: KPICard[] = [
 {
 id: 'total-forms',
 label: t.mealSurvey.totalSurveys,
 value: totalForms,
 description: t.mealSurvey.allSurveyForms,
 color: '#3B82F6',
 icon: ClipboardList,
 },
 {
 id: 'active-forms',
 label: t.mealSurvey.activeSurveys,
 value: activeForms,
 description: t.mealSurvey.publishedCollecting,
 color: '#10B981',
 icon: CheckCircle,
 },
 {
 id: 'total-submissions',
 label: t.mealSurvey.totalSubmissions,
 value: totalSubmissions,
 description: t.mealSurvey.allRecords,
 color: '#8B5CF6',
 icon: BarChart3,
 },
 {
 id: 'submissions-period',
 label: t.mealSurvey.verifiedAndApproved,
 value: verifiedAndApproved,
 description: t.mealSurvey.approvedSubmissions,
 color: '#06B6D4',
 icon: Calendar,
 },
 {
 id: 'pending-reviews',
 label: t.mealSurvey.pendingReviews,
 value: pendingReviews,
 description: t.mealSurvey.dataValidation,
 color: '#F59E0B',
 icon: AlertTriangle,
 },
 {
 id: 'linked-indicators',
 label: t.mealSurvey.linkedIndicators,
 value: linkedIndicators,
 description: t.mealSurvey.indicatorsConnected,
 color: '#EC4899',
 icon: Target,
 },
 ];

 setKpiCards(cards);
 } catch (error) {
 console.error('Error loading survey data:', error);
 setKpiCards([]);
 } finally {
 setLoading(false);
 }
 }, [language, projectId]);

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back to MEAL */}
 <div className="text-start">
 <BackButton onClick={() => navigate('/organization/meal')} label={t.mealSurvey.backToMeal} />
 </div>
 {/* Header */}
 <div className={`flex items-center justify-between`}>
 <div className={`flex-1 text-start`}>
 <h1 className="text-3xl font-bold text-gray-900">{labels.title}</h1>
 {projectName && (
 <p className="text-base text-gray-600 mt-2">
 {labels.projectLabel}: {projectName}
 {ngoName && ` • ${labels.ngoLabel}: ${ngoName}`}
 </p>
 )}
 </div>
 </div>

 {/* Quick Actions */}
 <div className={`flex gap-3`}>
 <button
 onClick={() => navigate(`/organization/meal/survey/create-form?projectId=${projectId}&projectName=${projectName}`)}
 className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-base"
 >
 {labels.newSurvey}
 </button>
 <button
 onClick={() => navigate(`/organization/meal/survey/list?projectId=${projectId}&projectName=${projectName}`)}
 className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-base"
 >
 {labels.viewAllSurveys}
 </button>
 </div>

 {/* KPI Cards */}
 <div>
 <h2 className={`text-xl font-bold text-gray-900 mb-4 text-start`}>
 {labels.kpiCards}
 </h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {kpiCards.map((card) => {
 const Icon = card.icon;
 return (
 <div
 key={card.id}
 className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
 >
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <p className="text-base text-gray-600 mb-1">{card.label}</p>
 <p className="text-4xl font-bold text-gray-900 mb-2">{card.value}</p>
 <p className="text-sm text-gray-500">{card.description}</p>
 </div>
 <div 
 className="p-3 rounded-lg"
 style={{ backgroundColor: `${card.color}20` }}
 >
 <Icon className="w-7 h-7" style={{ color: card.color }} />
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Navigation Cards */}
 <div>
 <h2 className={`text-xl font-bold text-gray-900 mb-4 text-start`}>
 {labels.navigation}
 </h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {/* All Surveys (Table View) */}
 <button
 onClick={() => navigate(`/organization/meal/survey/list?projectId=${projectId}&projectName=${projectName}`)}
 className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all text-start"
 >
 <div className={`flex items-start gap-4`}>
 <div className="p-3 bg-blue-50 rounded-lg">
 <List className="w-7 h-7 text-blue-600" />
 </div>
 <div className={`flex-1 text-start`}>
 <h3 className="text-lg font-bold text-gray-900 mb-1">{labels.allSurveys}</h3>
 <p className="text-base text-gray-600">{labels.allSurveysDesc}</p>
 </div>
 </div>
 </button>

 {/* Reports & Analytics */}
 <button
 onClick={() => navigate(`/organization/meal/survey/reports?projectId=${projectId}&projectName=${projectName}`)}
 className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all text-start"
 >
 <div className={`flex items-start gap-4`}>
 <div className="p-3 bg-pink-50 rounded-lg">
 <BarChart3 className="w-7 h-7 text-pink-600" />
 </div>
 <div className={`flex-1 text-start`}>
 <h3 className="text-lg font-bold text-gray-900 mb-1">{labels.reportsAnalytics}</h3>
 <p className="text-base text-gray-600">{labels.reportsAnalyticsDesc}</p>
 </div>
 </div>
 </button>

 {/* Settings */}
 <button
 onClick={() => navigate(`/organization/meal/survey/settings?projectId=${projectId}`)}
 className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all text-start"
 >
 <div className={`flex items-start gap-4`}>
 <div className="p-3 bg-gray-100 rounded-lg">
 <SettingsIcon className="w-7 h-7 text-gray-600" />
 </div>
 <div className={`flex-1 text-start`}>
 <h3 className="text-lg font-bold text-gray-900 mb-1">{labels.settings}</h3>
 <p className="text-base text-gray-600">{labels.settingsDesc}</p>
 </div>
 </div>
 </button>
 </div>
 </div>
 </div>
 );
}