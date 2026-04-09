/**
 * ============================================================================
 * MEAL MODULE LANDING PAGE
 * ============================================================================
 * 
 * Main entry point for MEAL module with sub-module navigation
 * Follows the Cards Grid Landing pattern used in other modules
 * 
 * FEATURES:
 * - Dashboard metrics and KPIs
 * - Sub-module navigation cards
 * - Real-time status indicators
 * - Bilingual support (EN/AR)
 * 
 * ============================================================================
 */

import { useLocation, useRoute } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { Target, MessageSquare, ClipboardList, FileText, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

export function MEALLanding() {
  const [location, navigate] = useLocation();
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();

  // Determine base path based on current location
  const basePath = location.startsWith('/organization/meal') ? '/organization/meal' : '/meal';

  // Get organization context
  const organizationId = (user as any)?.organizationId || 1;
  const operatingUnitId = (user as any)?.operatingUnitId;

  // Fetch statistics from routers
  const { data: surveyStats } = trpc.mealSurveys.getStatistics.useQuery({
    organizationId,
    operatingUnitId,
  });

  const { data: accountabilityStats } = trpc.mealAccountability.getStatistics.useQuery({
    organizationId,
    operatingUnitId,
  });

  const { data: indicatorDataStats } = trpc.mealIndicatorData.getStatistics.useQuery({
    organizationId,
    operatingUnitId,
  });

  const { data: documentStats } = trpc.mealDocuments.getStatistics.useQuery({
    organizationId,
    operatingUnitId,
  });

  const t = {
    title: language === 'en' ? 'Monitoring, Evaluation & Learning' : 'المتابعة والتقييم والتعلم',
    subtitle: language === 'en' ? 'MEAL System Dashboard' : 'لوحة نظام المتابعة والتقييم',
    back: language === 'en' ? 'Back' : 'رجوع',
    dashboardStatus: language === 'en' ? 'Dashboard Status & Metrics' : 'حالة لوحة التحكم والمقاييس',
    totalSurveys: language === 'en' ? 'Total Surveys' : 'إجمالي الاستبيانات',
    activeSurveys: language === 'en' ? 'Active Surveys' : 'الاستبيانات النشطة',
    totalSubmissions: language === 'en' ? 'Total Submissions' : 'إجمالي الردود',
    openComplaints: language === 'en' ? 'Open Complaints' : 'الشكاوى المفتوحة',
    dataEntries: language === 'en' ? 'Data Entries' : 'إدخالات البيانات',
    documents: language === 'en' ? 'Documents' : 'الوثائق',
  };

  const subModules = [
    {
      id: 'indicators',
      title: language === 'en' ? 'Indicators Tracking' : 'تتبع المؤشرات',
      description: language === 'en' 
        ? 'Monitor project performance through indicator dashboards, visualize progress, and track achievements against targets.'
        : 'مراقبة أداء المشروع من خلال لوحات المؤشرات، وتصور التقدم، وتتبع الإنجازات مقابل الأهداف.',
      icon: Target,
      route: `${basePath}/indicators`,
      color: 'bg-emerald-100 text-emerald-600',
    },
    {
      id: 'accountability',
      title: language === 'en' ? 'Accountability & CRM' : 'المساءلة وإدارة العلاقات',
      description: language === 'en'
        ? 'Manage complaints and feedback, follow referral pathways, and ensure responses comply with AAP and safeguarding standards.'
        : 'إدارة الشكاوى والملاحظات، ومتابعة مسارات الإحالة، وضمان الامتثال لمعايير المساءلة والحماية.',
      icon: MessageSquare,
      route: `${basePath}/accountability`,
      color: 'bg-amber-100 text-amber-600',
    },
    {
      id: 'survey',
      title: language === 'en' ? 'Survey & Data Collection' : 'المسح وجمع البيانات',
      description: language === 'en'
        ? 'Collect project assessments, surveys, and monitoring data to inform decisions and strengthen evidence-based programming.'
        : 'جمع تقييمات المشروع والمسوحات وبيانات المراقبة لإعلام القرارات وتعزيز البرمجة القائمة على الأدلة.',
      icon: ClipboardList,
      route: `${basePath}/survey`,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'documents',
      title: language === 'en' ? 'Documents & Reports' : 'الوثائق والتقارير',
      description: language === 'en'
        ? 'Central hub for MEAL files—store assessments, reports, tools, and templates to support learning and organizational memory.'
        : 'مركز رئيسي لملفات المتابعة والتقييم - تخزين التقييمات والتقارير والأدوات والقوالب لدعم التعلم والذاكرة التنظيمية.',
      icon: FileText,
      route: `${basePath}/documents`,
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-3xl font-bold text-foreground">{t.title}</h1>
          <p className="text-base text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <BackIcon className="w-4 h-4" />
          <span>{t.back}</span>
        </Button>
      </div>

      {/* Sub-Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subModules.map((module) => {
          const Icon = module.icon;
          return (
            <Card
              key={module.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
              onClick={() => navigate(module.route)}
            >
              <CardHeader className={`pb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-14 h-14 rounded-lg ${module.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className={isRTL ? 'text-right' : 'text-left'}>
                <CardDescription className="text-sm">
                  {module.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dashboard Status & Metrics */}
      <div className="space-y-4 mt-6">
        <h2 className={`text-xl font-bold text-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.dashboardStatus}
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="text-center">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">{t.totalSurveys}</p>
              <p className="text-3xl font-bold text-primary">{surveyStats?.total || 0}</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">{t.activeSurveys}</p>
              <p className="text-3xl font-bold text-green-600">{surveyStats?.published || 0}</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">{t.totalSubmissions}</p>
              <p className="text-3xl font-bold text-blue-600">{surveyStats?.totalSubmissions || 0}</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">{t.openComplaints}</p>
              <p className="text-3xl font-bold text-amber-600">{accountabilityStats?.byStatus?.open || 0}</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">{t.dataEntries}</p>
              <p className="text-3xl font-bold text-purple-600">{indicatorDataStats?.total || 0}</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">{t.documents}</p>
              <p className="text-3xl font-bold text-gray-600">{documentStats?.total || 0}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default MEALLanding;
