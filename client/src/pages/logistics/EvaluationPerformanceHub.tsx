/**
 * Evaluation & Performance Hub
 * Central page for vendor evaluation management with 4 sub-card navigation,
 * Performance Tracking cards (navigation shortcuts), Quick Actions, and expiry alerts.
 * 
 * This dashboard is for MONITORING only — vendor creation happens in Vendor Management.
 * Procurement baselines are auto-generated during Bid Evaluation → Award selection.
 * 
 * Data sources:
 * - Classification cards & sub-cards: vendors.qualificationScoreDashboard (vendor_qualification_scores)
 * - Vendor Qualification Checklist count: vendors.listVendorsWithQualification (total vendors)
 * - Approval Workflow count: vendors.listQualificationsForApproval (pending approvals)
 * - Performance Tracking: vendors.getPerformanceTracking
 * - Blacklist count: blacklist.getSummary
 * - Expiry alerts: vendors.getExpiringQualifications
 */
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Award,
  ClipboardCheck,
  LayoutDashboard,
  History,
  GitBranch,
  TrendingUp,
  AlertCircle,
  ShieldAlert,
  Clock,
  BarChart3,
  CalendarClock,
  ExternalLink,
  AlertTriangle,
  XCircle,
  ArrowRight,
  UserPlus,
  Truck,
  Wrench,
} from 'lucide-react';
import { Link } from 'wouter';
import { BackButton } from "@/components/BackButton";
import { Skeleton } from "@/components/ui/skeleton";

export default function EvaluationPerformanceHub() {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || 0;

  // Fetch qualification score dashboard data (correct data source)
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

  // Fetch blacklist summary (for Blacklisted card)
  const blacklistSummaryQuery = trpc.blacklist.getSummary.useQuery(
    undefined,
    { enabled: !!organizationId }
  );
  const blacklistSummary = blacklistSummaryQuery.data || { total: 0, approved: 0, pendingApproval: 0 };

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

  // Fetch expiring qualifications (90 days ahead)
  const expiringQuery = trpc.vendors.getExpiringQualifications.useQuery(
    { daysAhead: 90 },
    { enabled: !!organizationId }
  );
  const expiringQualifications = expiringQuery.data || [];

  // Loading state for skeleton placeholders
  const isLoading = dashboardQuery.isLoading || vendorListQuery.isLoading || approvalQuery.isLoading || blacklistSummaryQuery.isLoading || perfTrackingQuery.isLoading;

  // Fetch evaluation history count
  const historyQuery = trpc.vendors.qualificationHistory.useQuery(
    undefined,
    { enabled: !!organizationId }
  );
  const historyCount = historyQuery.data?.length || 0;

  const subCards = [
    {
      title: isRTL ? 'قائمة تأهيل المورد' : 'Vendor Qualification Checklist',
      description: isRTL
        ? 'تقييم التأهيل: القانونية والإدارية، الخبرة والقدرة التقنية، التواجد التشغيلي، المراجع (30 نقطة)'
        : 'Qualification evaluation: Legal & Administrative, Experience & Technical, Operational Presence, References (30 pts)',
      icon: ClipboardCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      borderColor: 'border-blue-200',
      href: '/organization/logistics/evaluation-performance/qualification-list',
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
      href: '/organization/logistics/evaluation-performance/score-dashboard',
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
      href: '/organization/logistics/evaluation-performance/history',
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
      href: '/organization/logistics/evaluation-performance/approval-workflow',
      stat: totalApprovalRecords,
      statLabel: pendingApprovals > 0
        ? (isRTL ? `${pendingApprovals} معلق` : `${pendingApprovals} Pending`)
        : (isRTL ? 'سجلات' : 'Records'),
    },
  ];

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'expired':
        return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 me-1" />{isRTL ? 'منتهي' : 'Expired'}</Badge>;
      case 'critical':
        return <Badge className="bg-red-100 text-red-700 border-red-300 text-xs"><AlertTriangle className="h-3 w-3 me-1" />{isRTL ? 'حرج' : 'Critical'}</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs"><AlertCircle className="h-3 w-3 me-1" />{isRTL ? 'تحذير' : 'Warning'}</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs"><Clock className="h-3 w-3 me-1" />{isRTL ? 'إشعار' : 'Notice'}</Badge>;
    }
  };

  // Quick Action buttons for vendor creation (navigate to Vendor Management)
  const quickActions = [
    {
      label: isRTL ? 'إضافة مورد جديد' : 'Add New Supplier',
      icon: Truck,
      color: 'text-blue-600 hover:text-blue-700',
      bgColor: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/40',
      borderColor: 'border-blue-200 hover:border-blue-300',
      href: '/organization/logistics/vendors/suppliers?action=create',
    },
    {
      label: isRTL ? 'إضافة مقاول' : 'Add New Contractor',
      icon: UserPlus,
      color: 'text-emerald-600 hover:text-emerald-700',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40',
      borderColor: 'border-emerald-200 hover:border-emerald-300',
      href: '/organization/logistics/vendors/contractors?action=create',
    },
    {
      label: isRTL ? 'إضافة مقدم خدمة' : 'Add New Service Provider',
      icon: Wrench,
      color: 'text-violet-600 hover:text-violet-700',
      bgColor: 'bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/20 dark:hover:bg-violet-950/40',
      borderColor: 'border-violet-200 hover:border-violet-300',
      href: '/organization/logistics/vendors/service-providers?action=create',
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/organization/logistics/vendors">
              <BackButton label={isRTL ? 'العودة لإدارة الموردين' : 'Back to Vendor Management'} />
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-3 rounded-lg text-primary-foreground">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {isRTL ? 'التقييم والأداء' : 'Evaluation & Performance'}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {isRTL ? 'قائمة تقييم الموردين الموحدة مع التسجيل المرجح وأتمتة التصنيف وتتبع التدقيق' : 'Unified vendor evaluation checklist with weighted scoring, classification automation, and audit tracking'}
                </p>
              </div>
            </div>
            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {quickActions.map((action, idx) => {
                const ActionIcon = action.icon;
                return (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className={`${action.bgColor} ${action.borderColor} ${action.color} transition-colors`}
                    onClick={() => navigate(action.href)}
                  >
                    <ActionIcon className="h-4 w-4 me-1.5" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Expiry Alerts Banner */}
        {expiringQualifications.length > 0 && (
          <div className="mb-6 border border-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                {isRTL ? 'تنبيهات انتهاء صلاحية التأهيل' : 'Qualification Expiry Alerts'}
              </h3>
              <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                {expiringQualifications.length}
              </Badge>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {expiringQualifications.map((eq: any) => (
                <div key={eq.id} className="flex items-center justify-between bg-white dark:bg-background rounded px-3 py-2 border border-amber-200">
                  <div className="flex items-center gap-3">
                    {getUrgencyBadge(eq.urgency)}
                    <div>
                      <span className="font-medium text-sm">{eq.vendorName}</span>
                      <span className="text-xs text-muted-foreground ms-2">({eq.vendorCode})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {eq.expiryDate ? new Date(eq.expiryDate).toLocaleDateString() : '—'}
                    </span>
                    <span className={`text-xs font-medium ${eq.daysLeft && eq.daysLeft <= 0 ? 'text-red-600' : eq.daysLeft && eq.daysLeft <= 30 ? 'text-red-500' : 'text-amber-600'}`}>
                      {eq.daysLeft !== null ? (
                        eq.daysLeft <= 0 
                          ? (isRTL ? `منتهي منذ ${Math.abs(eq.daysLeft)} يوم` : `Expired ${Math.abs(eq.daysLeft)}d ago`)
                          : (isRTL ? `${eq.daysLeft} يوم متبقي` : `${eq.daysLeft}d left`)
                      ) : '—'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => navigate('/organization/logistics/evaluation-performance/qualification-list')}
                    >
                      {isRTL ? 'تجديد' : 'Renew'}
                      <ExternalLink className="h-3 w-3 ms-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Classification Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[0,1,2,3].map(i => (
              <Card key={i} className="border">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-8 w-12 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Award className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">{isRTL ? 'مفضل' : 'Preferred'}</span>
              </div>
              <div className="text-2xl font-bold text-green-700">{qualStats.preferred}</div>
              <p className="text-xs text-muted-foreground">{isRTL ? 'تقييم 85-100' : 'Score 85-100'}</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">{isRTL ? 'معتمد' : 'Approved'}</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{qualStats.approved}</div>
              <p className="text-xs text-muted-foreground">{isRTL ? 'تقييم 70-84' : 'Score 70-84'}</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700">{isRTL ? 'مشروط' : 'Conditional'}</span>
              </div>
              <div className="text-2xl font-bold text-yellow-700">{qualStats.conditional}</div>
              <p className="text-xs text-muted-foreground">{isRTL ? 'تقييم 50-69' : 'Score 50-69'}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">{isRTL ? 'مرفوض' : 'Rejected'}</span>
              </div>
              <div className="text-2xl font-bold text-red-700">{qualStats.rejected}</div>
              <p className="text-xs text-muted-foreground">{isRTL ? 'تقييم أقل من 50' : 'Score below 50'}</p>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Sub-cards Navigation */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[0,1,2,3].map(i => (
              <Card key={i} className="border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-5 w-8 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {subCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card
                key={index}
                className={`${card.bgColor} ${card.borderColor} border hover:shadow-lg transition-shadow cursor-pointer group`}
                onClick={() => navigate(card.href)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${card.color}`} />
                      <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors">
                        {card.title}
                      </CardTitle>
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
        )}

        {/* Performance Tracking Summary — Navigation Cards */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {isRTL ? 'تتبع الأداء' : 'Performance Tracking'}
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0,1,2].map(i => (
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
              onClick={() => navigate('/organization/logistics/evaluation-performance/qualification-list?filter=top_performers')}
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
              onClick={() => navigate('/organization/logistics/evaluation-performance/qualification-list?filter=pending')}
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

            {/* Blacklisted Card — Uses blacklist.getSummary for accurate count */}
            <Card
              className="border-red-200 bg-red-50/50 dark:bg-red-950/20 cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => navigate('/organization/logistics/evaluation-performance/blacklist')}
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
      </div>
    </div>
  );
}
