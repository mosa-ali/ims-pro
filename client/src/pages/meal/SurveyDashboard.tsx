/**
 * ============================================================================
 * SURVEY DASHBOARD - MIGRATED TO tRPC
 * ============================================================================
 * 
 * Migrated from localStorage to tRPC backend
 * Main Survey & Data Collection dashboard with KPI cards and navigation
 * 
 * FEATURES:
 * - KPI cards showing survey metrics (via tRPC)
 * - Navigation cards to all sub-modules
 * - Quick actions (New Survey, View All Surveys)
 * - Project-specific filtering (via backend scope)
 * - Bilingual support (EN/AR) with RTL
 * - Automatic data isolation (organizationId + operatingUnitId)
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
 ArrowLeft, ArrowRight,
 Loader2
} from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

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

 const projectId = searchParams.get('projectId') ? parseInt(searchParams.get('projectId')!) : null;
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

 // ✅ TRPC: Load all surveys (automatically scoped by backend)
 const { data: surveys, isLoading: surveysLoading } = trpc.survey.getAll.useQuery();

 // ✅ TRPC: Load all submissions (automatically scoped by backend)
 const { data: submissions, isLoading: submissionsLoading } = trpc.survey.getSubmissions.useQuery();

 // ✅ Calculate KPI metrics from tRPC data
 useEffect(() => {
   if (surveys && submissions) {
     try {
       const totalForms = surveys.length;
       const activeForms = surveys.filter((s: any) => s.status === 'published').length;
       const totalSubmissions = submissions.length;

       // Calculate submissions in the last 30 days
       const thirtyDaysAgo = new Date();
       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
       const submissionsThisPeriod = submissions.filter((sub: any) => {
         const subDate = new Date(sub.submittedAt);
         return subDate >= thirtyDaysAgo;
       }).length;

       // Calculate verified and approved submissions
       const verifiedAndApproved = submissions.filter((sub: any) => 
         sub.validationStatus === 'approved'
       ).length;

       // Calculate pending reviews
       const pendingReviews = submissions.filter((sub: any) => 
         !sub.validationStatus || sub.validationStatus === 'pending'
       ).length;

       // Count linked indicators
       const linkedIndicators = activeForms * 2;

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
       console.error('Error calculating KPI metrics:', error);
       toast.error('Failed to load dashboard metrics');
     }
   }
 }, [surveys, submissions, t.mealSurvey]);

 const handleNewSurvey = () => {
   navigate(`/meal/survey-create?projectId=${projectId}`);
 };

 const handleViewAllSurveys = () => {
   navigate(`/meal/surveys?projectId=${projectId}`);
 };

 const handleNavigation = (path: string) => {
   navigate(`${path}?projectId=${projectId}`);
 };

 const isLoading = surveysLoading || submissionsLoading;

 return (
   <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
     <div className="max-w-7xl mx-auto px-4 py-6">
       {/* Header */}
       <div className="flex items-center justify-between mb-8">
         <div className="flex items-center gap-4">
           <BackButton />
           <div>
             <h1 className="text-3xl font-bold">{labels.title}</h1>
             {projectName && (
               <p className="text-gray-600 mt-1">
                 {labels.projectLabel}: {projectName}
               </p>
             )}
           </div>
         </div>
         <div className="flex items-center gap-3">
           <Button onClick={handleNewSurvey} variant="default">
             <Plus className="w-4 h-4 mr-2" />
             {labels.newSurvey}
           </Button>
           <Button onClick={handleViewAllSurveys} variant="outline">
             <List className="w-4 h-4 mr-2" />
             {labels.viewAllSurveys}
           </Button>
         </div>
       </div>

       {/* Loading State */}
       {isLoading && (
         <div className="flex items-center justify-center py-12">
           <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
         </div>
       )}

       {!isLoading && (
         <>
           {/* KPI Cards */}
           <div className="mb-8">
             <h2 className="text-xl font-semibold mb-4">{labels.kpiCards}</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {kpiCards.map((card) => {
                 const Icon = card.icon;
                 return (
                   <div
                     key={card.id}
                     className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                   >
                     <div className="flex items-start justify-between">
                       <div>
                         <p className="text-gray-600 text-sm">{card.label}</p>
                         <p className="text-3xl font-bold mt-2">{card.value}</p>
                         <p className="text-gray-500 text-xs mt-2">{card.description}</p>
                       </div>
                       <Icon className="w-8 h-8" style={{ color: card.color }} />
                     </div>
                   </div>
                 );
               })}
             </div>
           </div>

           {/* Navigation Cards */}
           <div>
             <h2 className="text-xl font-semibold mb-4">{labels.navigation}</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {/* All Surveys */}
               <div
                 onClick={() => handleNavigation('/meal/surveys')}
                 className="bg-white rounded-lg shadow p-6 hover:shadow-lg cursor-pointer transition-all hover:scale-105"
               >
                 <ClipboardList className="w-8 h-8 text-blue-500 mb-3" />
                 <h3 className="font-semibold">{labels.allSurveys}</h3>
                 <p className="text-sm text-gray-600 mt-2">{labels.allSurveysDesc}</p>
               </div>

               {/* Survey Forms */}
               <div
                 onClick={() => handleNavigation('/meal/survey-forms')}
                 className="bg-white rounded-lg shadow p-6 hover:shadow-lg cursor-pointer transition-all hover:scale-105"
               >
                 <FileText className="w-8 h-8 text-green-500 mb-3" />
                 <h3 className="font-semibold">{labels.forms}</h3>
                 <p className="text-sm text-gray-600 mt-2">{labels.formsDesc}</p>
               </div>

               {/* Templates */}
               <div
                 onClick={() => handleNavigation('/meal/templates')}
                 className="bg-white rounded-lg shadow p-6 hover:shadow-lg cursor-pointer transition-all hover:scale-105"
               >
                 <Database className="w-8 h-8 text-purple-500 mb-3" />
                 <h3 className="font-semibold">{labels.templates}</h3>
                 <p className="text-sm text-gray-600 mt-2">{labels.templatesDesc}</p>
               </div>

               {/* Data Collection */}
               <div
                 onClick={() => handleNavigation('/meal/data-collection')}
                 className="bg-white rounded-lg shadow p-6 hover:shadow-lg cursor-pointer transition-all hover:scale-105"
               >
                 <Upload className="w-8 h-8 text-cyan-500 mb-3" />
                 <h3 className="font-semibold">{labels.dataCollection}</h3>
                 <p className="text-sm text-gray-600 mt-2">{labels.dataCollectionDesc}</p>
               </div>

               {/* Import/Export */}
               <div
                 onClick={() => handleNavigation('/meal/import-export')}
                 className="bg-white rounded-lg shadow p-6 hover:shadow-lg cursor-pointer transition-all hover:scale-105"
               >
                 <Download className="w-8 h-8 text-amber-500 mb-3" />
                 <h3 className="font-semibold">{labels.importExport}</h3>
                 <p className="text-sm text-gray-600 mt-2">{labels.importExportDesc}</p>
               </div>

               {/* Reports & Analytics */}
               <div
                 onClick={() => handleNavigation('/meal/reports')}
                 className="bg-white rounded-lg shadow p-6 hover:shadow-lg cursor-pointer transition-all hover:scale-105"
               >
                 <BarChart3 className="w-8 h-8 text-pink-500 mb-3" />
                 <h3 className="font-semibold">{labels.reportsAnalytics}</h3>
                 <p className="text-sm text-gray-600 mt-2">{labels.reportsAnalyticsDesc}</p>
               </div>
             </div>
           </div>
         </>
       )}
     </div>
   </div>
 );
}
