import { useTranslation } from '@/i18n/useTranslation';
import { trpc } from "@/lib/trpc";
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, AlertCircle, Clock, FileText } from "lucide-react";
import { useLocation } from "wouter";

/**
 * Finance Overview Tab Component
 * 
 * Features:
 * - Total Budget calculation across all projects
 * - Total Spent with utilization percentage
 * - Variance calculation (Under/Over budget)
 * - Pending Approvals count
 * - Budget Utilization progress bar with color coding
 * - Bilingual support (English/Arabic) with RTL/LTR switching
 * - Real-time data from tRPC queries
 * 
 * File Path: /client/src/components/finance/OverviewTab.tsx
 * 
 * Usage:
 * import OverviewTab from '@/components/finance/OverviewTab';
 * <OverviewTab />
 */
export default function OverviewTab() {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
 
 const [, setLocation] = useLocation();
 const { data: budgets } = trpc.budgets.list.useQuery();
 const { data: expenditures } = trpc.expenditures.list.useQuery();

 // Calculate financial metrics
 const totalBudget = budgets?.reduce((sum, b) => sum + parseFloat(b.budgetedAmount || "0"), 0) || 0;
 const totalSpent = expenditures?.filter(e => e.status === 'approved' || e.status === 'paid')
 .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0) || 0;
 const variance = totalBudget - totalSpent;
 const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
 const pendingApprovals = expenditures?.filter(e => e.status === 'submitted').length || 0;

 // Format currency with locale support
 const formatCurrency = (amount: number, currency: string = 'USD') => {
 return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
 style: 'currency',
 currency: currency,
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 }).format(amount);
 };

 return (
 <div className="space-y-6">
 {/* KPI Cards */}
 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
 {/* Total Budget Card */}
 <Card>
 <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2`}>
 <CardTitle className={`text-sm font-medium text-start`}>
 {t.overviewTab.totalBudget}
 </CardTitle>
 <DollarSign className="h-4 w-4 text-muted-foreground" />
 </CardHeader>
 <CardContent>
 <div className={`text-2xl font-bold text-start`}>
 {formatCurrency(totalBudget)}
 </div>
 <p className={`text-xs text-muted-foreground text-start`}>
 {t.overviewTab.acrossAllProjects}
 </p>
 </CardContent>
 </Card>

 {/* Total Spent Card */}
 <Card>
 <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2`}>
 <CardTitle className={`text-sm font-medium text-start`}>
 {t.overviewTab.totalSpent}
 </CardTitle>
 <TrendingUp className="h-4 w-4 text-muted-foreground" />
 </CardHeader>
 <CardContent>
 <div className={`text-2xl font-bold text-start`}>
 {formatCurrency(totalSpent)}
 </div>
 <p className={`text-xs text-muted-foreground text-start`}>
 {utilizationRate.toFixed(1)}% {t.overviewTab.utilized}
 </p>
 </CardContent>
 </Card>

 {/* Variance Card */}
 <Card>
 <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2`}>
 <CardTitle className={`text-sm font-medium text-start`}>
 {t.overviewTab.variance}
 </CardTitle>
 <AlertCircle className="h-4 w-4 text-muted-foreground" />
 </CardHeader>
 <CardContent>
 <div className={`text-2xl font-bold ${variance >= 0 ? "text-green-600" : "text-red-600"} text-start`}>
 {formatCurrency(Math.abs(variance))}
 </div>
 <p className={`text-xs text-muted-foreground text-start`}>
 {variance >= 0 ? t.overviewTab.underBudget : t.overviewTab.overBudget}
 </p>
 </CardContent>
 </Card>

 {/* Pending Approvals Card */}
 <Card>
 <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2`}>
 <CardTitle className={`text-sm font-medium text-start`}>
 {t.overviewTab.pendingApprovals}
 </CardTitle>
 <Clock className="h-4 w-4 text-muted-foreground" />
 </CardHeader>
 <CardContent>
 <div className={`text-2xl font-bold text-start`}>
 {pendingApprovals}
 </div>
 <p className={`text-xs text-muted-foreground text-start`}>
 {t.overviewTab.expendituresAwaitingReview}
 </p>
 </CardContent>
 </Card>
 </div>

 {/* Budget Utilization Progress Card */}
 <Card>
 <CardHeader>
 <CardTitle className={'text-start'}>
 {t.overviewTab.budgetUtilization}
 </CardTitle>
 <CardDescription className={'text-start'}>
 {t.overviewTab.overallSpending}
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className="space-y-2">
 <div className={`flex items-center justify-between text-sm`}>
 <span>{t.overviewTab.utilizationRate}</span>
 <span className="font-medium">{utilizationRate.toFixed(1)}%</span>
 </div>
 <div className="w-full bg-secondary rounded-full h-3">
 <div
 className={`h-3 rounded-full transition-all ${ utilizationRate > 90 ? "bg-red-500" : utilizationRate > 75 ? "bg-yellow-500" : "bg-green-500" }`}
 style={{ 
 width: `${Math.min(utilizationRate, 100)}%`,
 ...(isRTL && { float: 'right' })
 }}
 />
 </div>
 <div className={`flex items-center justify-between text-xs text-muted-foreground mt-2`}>
 <span>
 {utilizationRate > 90 
 ? t.overviewTab.criticalUtilization
 : utilizationRate > 75 
 ? t.overviewTab.highUtilization
 : t.overviewTab.healthyUtilization}
 </span>
 <span>
 {formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}
 </span>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 );
}
