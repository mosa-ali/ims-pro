/**
 * Finance Vendor Management — Read-Only Mirror of Logistics Vendor Master
 * 
 * This page mirrors the Logistics VendorManagement dashboard layout exactly,
 * consuming the same tRPC procedures (single source of truth).
 * All navigation stays within the Finance module (/organization/finance/vendors/*).
 * Finance users can view, search, filter, and export vendor data.
 * Finance users CANNOT create, edit, or delete vendor records.
 */

import { useTranslation } from '@/i18n/useTranslation';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  Users,
  HardHat,
  Briefcase,
  CheckCircle,
  Clock,
  DollarSign,
  Award,
  ShieldAlert,
  BarChart3,
  ClipboardCheck,
  LayoutDashboard,
  History,
  GitBranch,
  Eye,
  Lock,
  TrendingUp,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'wouter';
import { BackButton } from "@/components/BackButton";

export default function FinanceVendors() {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const { t } = useTranslation();
  const { currentOrganization } = useOrganization();

  const organizationId = currentOrganization?.id || 0;

  // Fetch vendor statistics (same endpoint as Logistics)
  const statsQuery = trpc.vendors.getStatistics.useQuery(
    undefined,
    { enabled: !!organizationId }
  );

  // Fetch qualification score dashboard data
  const dashboardQuery = trpc.vendors.qualificationScoreDashboard.useQuery(
    undefined,
    { enabled: !!organizationId }
  );
  const dashboardData = dashboardQuery.data;
  const qualStats = dashboardData?.stats || { total: 0, preferred: 0, approved: 0, conditional: 0, rejected: 0 };

  // Fetch vendor list count (for Vendor Qualification Checklist card)
  const vendorListQuery = trpc.vendors.listVendorsWithQualification.useQuery(
    {},
    { enabled: !!organizationId }
  );
  const totalVendors = vendorListQuery.data?.length || 0;

  // Fetch approval workflow data (for Approval Workflow card)
  const approvalQuery = trpc.vendors.listQualificationsForApproval.useQuery(
    { status: undefined },
    { enabled: !!organizationId }
  );
  const approvalRecords = approvalQuery.data || [];
  const pendingApprovals = approvalRecords.filter(
    (r: any) => r.approvalStatus === 'pending_logistics' || r.approvalStatus === 'pending_manager'
  ).length;
  const totalApprovalRecords = approvalRecords.length;

  // Fetch blacklist summary
  const blacklistSummaryQuery = trpc.blacklist?.getSummary?.useQuery(
    undefined,
    { enabled: !!organizationId }
  );
  const blacklistSummary = blacklistSummaryQuery?.data || { total: 0, approved: 0, pendingApproval: 0 };

  // Fetch real performance tracking data
  const perfTrackingQuery = trpc.vendors.getPerformanceTracking.useQuery(
    undefined,
    { enabled: !!organizationId }
  );
  const perfTracking = perfTrackingQuery.data || {
    topPerformers: [],
    pendingEvaluation: [],
    blacklisted: [],
    totalVendors: 0,
  };

  // Fetch evaluation history count
  const historyQuery = trpc.vendors.qualificationHistory.useQuery(
    undefined,
    { enabled: !!organizationId }
  );
  const historyCount = historyQuery.data?.length || 0;

  const stats = statsQuery.data || {
    totalVendors: 0,
    activeVendors: 0,
    financiallyActiveVendors: 0,
    pendingApproval: 0,
    blacklistedVendors: 0,
  };

  const isLoading = statsQuery.isLoading || dashboardQuery.isLoading || vendorListQuery.isLoading || approvalQuery.isLoading || perfTrackingQuery.isLoading;

  // Module cards configuration — navigate within Finance
  const moduleCards = [
    {
      title: t.vendorManagement2?.suppliers ?? (isRTL ? 'الموردون' : 'Suppliers'),
      description: t.vendorManagement2?.suppliersDesc ?? (isRTL ? 'إدارة سجل الموردين والامتثال' : 'Manage supplier records and compliance'),
      icon: Users,
      color: 'bg-green-500',
      stats: [
        { label: isRTL ? 'نشط' : 'Active', value: (stats as any).suppliers?.active ?? 0 },
        { label: isRTL ? 'الإجمالي' : 'Total', value: (stats as any).suppliers?.total ?? 0 },
      ],
      href: '/organization/finance/vendors/suppliers',
    },
    {
      title: t.vendorManagement2?.contractors ?? (isRTL ? 'المقاولون' : 'Contractors'),
      description: t.vendorManagement2?.contractorsDesc ?? (isRTL ? 'تتبع المقاولين واتفاقيات الخدمة' : 'Track contractors and service agreements'),
      icon: HardHat,
      color: 'bg-orange-500',
      stats: [
        { label: isRTL ? 'نشط' : 'Active', value: (stats as any).contractors?.active ?? 0 },
        { label: isRTL ? 'الإجمالي' : 'Total', value: (stats as any).contractors?.total ?? 0 },
      ],
      href: '/organization/finance/vendors/contractors',
    },
    {
      title: t.vendorManagement2?.serviceProviders ?? (isRTL ? 'مقدمو الخدمات' : 'Service Providers'),
      description: t.vendorManagement2?.serviceProvidersDesc ?? (isRTL ? 'إدارة علاقات مقدمي الخدمات' : 'Manage service provider relationships'),
      icon: Briefcase,
      color: 'bg-purple-500',
      stats: [
        { label: isRTL ? 'نشط' : 'Active', value: (stats as any).serviceProviders?.active ?? 0 },
        { label: isRTL ? 'الإجمالي' : 'Total', value: (stats as any).serviceProviders?.total ?? 0 },
      ],
      href: '/organization/finance/vendors/service-providers',
    },
  ];

  // Evaluation & Performance sub-cards — navigate within Finance
  const evalSubCards = [
    {
      title: isRTL ? 'قائمة تأهيل المورد' : 'Vendor Qualification Checklist',
      description: isRTL
        ? 'تقييم التأهيل: القانونية والإدارية، الخبرة والقدرة التقنية، التواجد التشغيلي، المراجع'
        : 'Qualification evaluation: Legal & Administrative, Experience & Technical, Operational Presence, References',
      icon: ClipboardCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      borderColor: 'border-blue-200',
      href: '/organization/finance/vendors/evaluation/qualification-list',
      stat: totalVendors,
      statLabel: isRTL ? 'موردين' : 'Vendors',
    },
    {
      title: isRTL ? 'لوحة النتائج' : 'Score Dashboard',
      description: isRTL ? 'النتيجة النهائية، تصنيف المورد، مستوى المخاطر، تاريخ آخر تقييم' : 'Final score, vendor classification, risk level, last evaluation date',
      icon: LayoutDashboard,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
      borderColor: 'border-emerald-200',
      href: '/organization/finance/vendors/evaluation/score-dashboard',
      stat: qualStats.total,
      statLabel: isRTL ? 'تم تقييمهم' : 'Evaluated',
    },
    {
      title: isRTL ? 'سجل التقييمات' : 'Evaluation History',
      description: isRTL ? 'تتبع المقيم، التاريخ، تغييرات النتائج، سجل الإصدارات' : 'Track evaluator, date, score changes, version history',
      icon: History,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      borderColor: 'border-amber-200',
      href: '/organization/finance/vendors/evaluation/history',
      stat: historyCount,
      statLabel: isRTL ? 'سجلات' : 'Records',
    },
    {
      title: isRTL ? 'سير عمل الموافقة' : 'Approval Workflow',
      description: isRTL ? 'مراجعة اللوجستيات → موافقة المدير' : 'Logistics Review → Manager Approval',
      icon: GitBranch,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50 dark:bg-violet-950/20',
      borderColor: 'border-violet-200',
      href: '/organization/finance/vendors/evaluation/approval-workflow',
      stat: totalApprovalRecords,
      statLabel: pendingApprovals > 0
        ? (isRTL ? `${pendingApprovals} معلق` : `${pendingApprovals} Pending`)
        : (isRTL ? 'سجلات' : 'Records'),
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/organization/finance">
              <BackButton label={isRTL ? 'العودة للمالية' : 'Back to Finance'} />
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">
                  {isRTL ? 'إدارة الموردين' : 'Vendor Management'}
                </h1>
                <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 gap-1">
                  <Lock className="h-3 w-3" />
                  {isRTL ? 'للقراءة فقط' : 'Read-Only'}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                {isRTL
                  ? 'عرض بيانات الموردين من السجل الرئيسي للخدمات اللوجستية — مصدر واحد للحقيقة'
                  : 'Vendor data from the Logistics Vendor Master — single source of truth'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        {/* KPI Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map(i => (
                <Card key={i}>
                  <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
                  <CardContent><Skeleton className="h-8 w-16" /></CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {t.vendorManagement2?.totalVendors ?? (isRTL ? 'إجمالي الموردين' : 'Total Vendors')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalVendors}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    {t.vendorManagement2?.activeVendors ?? (isRTL ? 'الموردون النشطون' : 'Active Vendors')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{stats.activeVendors}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {t.vendorManagement2?.totalPayables ?? (isRTL ? 'إجمالي المستحقات' : 'Total Payables')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {stats.totalPayables !== undefined
                      ? `$${Number(stats.totalPayables).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '$0.00'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t.vendorManagement2?.pendingPayments ?? (isRTL ? 'المدفوعات المعلقة' : 'Pending Payments')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">{stats.pendingPayments ?? 0}</div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Vendor Type Modules — Clickable cards navigating within Finance */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{isRTL ? 'فئات الموردين' : 'Vendor Categories'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {moduleCards.map((module, index) => {
              const Icon = module.icon;
              return (
                <Card
                  key={index}
                  className="hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => navigate(module.href)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`${module.color} p-3 rounded-lg text-white`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <Badge variant="secondary">{module.stats[0].value}</Badge>
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {module.title}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {module.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm">
                      {module.stats.map((stat, i) => (
                        <div key={i}>
                          <span className="text-muted-foreground">{stat.label}: </span>
                          <span className="font-semibold">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {isRTL ? 'عرض التفاصيل' : 'View Details'} →
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Evaluation & Performance Card — Clickable, navigates within Finance */}
        <div className="mb-8">
          <Card
            className="border-2 border-primary/20 hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => navigate('/organization/finance/vendors/evaluation')}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary p-3 rounded-lg text-primary-foreground">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        {isRTL ? 'التقييم والأداء' : 'Evaluation & Performance'}
                      </CardTitle>
                      <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 text-xs gap-1">
                        <Eye className="h-3 w-3" />
                        {isRTL ? 'عرض فقط' : 'View Only'}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">
                      {isRTL
                        ? 'قائمة تقييم موحدة للموردين مع التسجيل المرجح والتصنيف التلقائي وتتبع التدقيق'
                        : 'Unified vendor evaluation checklist with weighted scoring, classification automation, and audit tracking'}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Sub-cards grid — each clickable within Finance */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {evalSubCards.map((card, index) => {
                  const Icon = card.icon;
                  return (
                    <Card
                      key={index}
                      className={`${card.bgColor} ${card.borderColor} border hover:shadow-md transition-shadow cursor-pointer`}
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(card.href); }}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-5 w-5 ${card.color}`} />
                            <CardTitle className="text-sm font-semibold">{card.title}</CardTitle>
                          </div>
                          <Badge variant="secondary" className="text-xs">{card.stat}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground mb-2">{card.description}</p>
                        <p className="text-xs font-medium">{card.statLabel}: {card.stat}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* View All Evaluations button */}
              <div className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate('/organization/finance/vendors/evaluation'); }}
                >
                  <BarChart3 className="h-4 w-4 me-2" />
                  {isRTL ? 'عرض جميع التقييمات' : 'View All Evaluations'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Tracking Summary — Navigation Cards */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {isRTL ? 'تتبع الأداء' : 'Performance Tracking'}
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map(i => (
                <Card key={i} className="border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-5 w-28" />
                      </div>
                      <Skeleton className="h-5 w-10 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-48 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-9 w-12 mb-3" />
                    <Skeleton className="h-3 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Top Performers Card */}
              <Card
                className="border-green-200 bg-green-50/50 dark:bg-green-950/20 cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => navigate('/organization/finance/vendors/evaluation/qualification-list?filter=top_performers')}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-base">{isRTL ? 'أفضل الموردين' : 'Top Performers'}</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                      <TrendingUp className="h-3 w-3 me-1" />
                      {perfTracking.topPerformers.length}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {isRTL ? 'تأهيل ≥85% أو أداء ≥5/10' : 'Qualification ≥85% or Performance ≥5/10'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-700 mb-3">{perfTracking.topPerformers.length}</div>
                  <div className="flex items-center gap-1 text-xs font-medium text-green-600 group-hover:text-green-700 transition-colors">
                    <span>{isRTL ? 'عرض القائمة الكاملة' : 'View full list'}</span>
                    <ArrowRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
                  </div>
                </CardContent>
              </Card>

              {/* Pending Evaluation Card */}
              <Card
                className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => navigate('/organization/finance/vendors/evaluation/qualification-list?filter=pending')}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      <CardTitle className="text-base">{isRTL ? 'بانتظار التقييم' : 'Pending Evaluation'}</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                      {perfTracking.pendingEvaluation.length}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {isRTL ? 'موردون بدون تأهيل أو تقييم أداء' : 'Vendors without qualification or performance evaluation'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-700 mb-3">{perfTracking.pendingEvaluation.length}</div>
                  <div className="flex items-center gap-1 text-xs font-medium text-yellow-600 group-hover:text-yellow-700 transition-colors">
                    <span>{isRTL ? 'عرض القائمة الكاملة' : 'View full list'}</span>
                    <ArrowRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
                  </div>
                </CardContent>
              </Card>

              {/* Blacklisted Card */}
              <Card
                className="border-red-200 bg-red-50/50 dark:bg-red-950/20 cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => navigate('/organization/finance/vendors/evaluation/blacklist')}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-red-600" />
                      <CardTitle className="text-base">{isRTL ? 'القائمة السوداء' : 'Blacklisted'}</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                      <AlertCircle className="h-3 w-3 me-1" />
                      {blacklistSummary.total}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {isRTL ? 'حالات القائمة السوداء' : 'Blacklist cases'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-700 mb-3">{blacklistSummary.total}</div>
                  {blacklistSummary.approved > 0 && (
                    <p className="text-xs text-red-500 mb-1">
                      {isRTL ? `${blacklistSummary.approved} نشط` : `${blacklistSummary.approved} Active`}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-xs font-medium text-red-600 group-hover:text-red-700 transition-colors">
                    <span>{isRTL ? 'عرض القائمة الكاملة' : 'View full list'}</span>
                    <ArrowRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Data Source Notice */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                  {isRTL ? 'مصدر البيانات: السجل الرئيسي للموردين — الخدمات اللوجستية' : 'Data Source: Logistics Vendor Master'}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  {isRTL
                    ? 'جميع بيانات الموردين تأتي من وحدة الخدمات اللوجستية. لإنشاء أو تعديل أو حذف الموردين، يرجى استخدام إدارة الموردين في الخدمات اللوجستية.'
                    : 'All vendor data originates from the Logistics module. To create, edit, or delete vendors, please use Vendor Management in Logistics.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
