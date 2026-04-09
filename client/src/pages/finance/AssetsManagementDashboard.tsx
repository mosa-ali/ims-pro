/**
 * Assets Management Dashboard
 * Shows MEAL-style cards for navigation to different sections
 */

import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Package,
  Tag,
  ArrowRightLeft,
  Trash2,
} from 'lucide-react';
import { Link } from 'wouter';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function AssetsManagementDashboard() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const { currentOrganization, currentOperatingUnit } = useOrganization();
  const organizationId = currentOrganization?.id || 30001;
  const operatingUnitId = currentOperatingUnit?.id;
  const navigate = useNavigate();

  // Fetch statistics for KPI cards
  const assetStatsQuery = trpc.assets.getAssetStatistics.useQuery({ organizationId, operatingUnitId });

  const formatCurrency = (amount: number | null, currency: string = 'USD') => {
    if (!amount) return `${currency} 0.00`;
    return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const sections = [
    {
      id: 'asset-registry',
      icon: Package,
      title: isRTL ? 'سجل الأصول' : 'Asset Registry',
      description: isRTL
        ? 'عرض وإدارة جميع الأصول الثابتة مع تفاصيل الاستهلاك'
        : 'View and manage all fixed assets with depreciation details.',
      color: 'bg-blue-100 text-blue-600',
      route: '/organization/finance/assets/registry',
    },
    {
      id: 'categories',
      icon: Tag,
      title: isRTL ? 'الفئات' : 'Categories',
      description: isRTL
        ? 'تنظيم الأصول إلى فئات لتسهيل التتبع والإبلاغ'
        : 'Organize assets into categories for easier tracking and reporting.',
      color: 'bg-green-100 text-green-600',
      route: '/organization/finance/assets/categories',
    },
    {
      id: 'transfers',
      icon: ArrowRightLeft,
      title: isRTL ? 'التحويلات' : 'Transfers',
      description: isRTL
        ? 'تسجيل وتتبع تحويلات الأصول بين الوحدات والمواقع'
        : 'Record and track asset transfers between units and locations.',
      color: 'bg-purple-100 text-purple-600',
      route: '/organization/finance/assets/transfers',
    },
    {
      id: 'disposals',
      icon: Trash2,
      title: isRTL ? 'التخلص' : 'Disposals',
      description: isRTL
        ? 'إدارة عمليات التخلص من الأصول بما في ذلك البيع والتبرع'
        : 'Manage asset disposal processes including sales and donations.',
      color: 'bg-orange-100 text-orange-600',
      route: '/organization/finance/assets/disposals',
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          {/* Back arrow */}
          <div className="mb-4">
            <Link href="/organization/finance">
              <BackButton label={t.financeModule.backToFinance} />
            </Link>
          </div>

          {/* Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2 mb-2">
              <Package className="h-8 w-8 text-primary" />
              {t.financeModule.assetsManagement || 'Assets Management'}
            </h1>
            <p className="text-muted-foreground">
              {isRTL
                ? 'إدارة سجل الأصول الثابتة والاستهلاك والتخلص'
                : 'Manage fixed asset registry, depreciation tracking, and disposal workflows'}
            </p>
          </div>

          {/* KPI Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.financeModule.totalAssets || 'Total Assets'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assetStatsQuery.data?.totalAssets || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.financeModule.activeAssets || 'Active Assets'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{assetStatsQuery.data?.activeAssets || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.financeModule.totalValue || 'Total Value'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(assetStatsQuery.data?.totalValue || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.financeModule.inMaintenance || 'In Maintenance'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{assetStatsQuery.data?.inMaintenance || 0}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* MEAL-style Navigation Cards */}
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sections.map(({ id, icon: Icon, title, description, color, route }) => (
            <div
              key={id}
              onClick={() => navigate(route)}
              className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg cursor-pointer p-6 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                  ✅ {isRTL ? 'نشط' : 'Active'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-start">{title}</h3>
              <p className="text-sm text-gray-600 text-start mb-4">{description}</p>
              <div className="pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-blue-600 font-medium">
                <span>{isRTL ? 'انقر لفتح القسم' : 'Click to open section'}</span>
                {!isRTL && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
