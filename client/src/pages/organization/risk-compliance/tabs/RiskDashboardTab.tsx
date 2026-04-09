/**
 * ============================================================================
 * RISK DASHBOARD TAB
 * ============================================================================
 * 
 * Displays analytics and KPIs for Risk & Compliance:
 * - Total Risks
 * - High/Critical Risks
 * - Mitigated Risks
 * - Risk Level Distribution
 * - 12-Month Trends
 * - Risks by Category
 * 
 * ============================================================================
 */

import { useTranslation } from '@/i18n/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, AlertTriangle, CheckCircle2, TrendingUp, PieChart } from 'lucide-react';
import { useRiskDashboard } from '@/hooks/useRisksData';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

export function RiskDashboardTab() {
const { t, language } = useTranslation();
  const { isRTL } = useLanguage();
 const { dashboard, isLoading, error } = useRiskDashboard();

 if (isLoading) {
 return (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {[...Array(4)].map((_, i) => (
 <Card key={i}>
 <CardHeader>
 <Skeleton className="h-4 w-24" />
 </CardHeader>
 <CardContent>
 <Skeleton className="h-8 w-16" />
 </CardContent>
 </Card>
 ))}
 </div>
 );
 }

 if (error) {
 return (
 <Alert variant="destructive">
 <AlertDescription>
 {t.organizationModule.failedToLoadDashboardData}
 </AlertDescription>
 </Alert>
 );
 }

 if (!dashboard) {
 return (
 <Alert>
 <AlertDescription>
 {t.riskCompliance.errorLoading}
 </AlertDescription>
 </Alert>
 );
 }

 const COLORS = {
 low: '#10b981',
 medium: '#f59e0b',
 high: '#f97316',
 critical: '#ef4444',
 };

 const levelDistributionData = [
 { name: t.organizationModule.low25, value: dashboard.levelDistribution.low, color: COLORS.low },
 { name: t.organizationModule.medium24, value: dashboard.levelDistribution.medium, color: COLORS.medium },
 { name: t.organizationModule.high23, value: dashboard.levelDistribution.high, color: COLORS.high },
 { name: t.organizationModule.critical, value: dashboard.levelDistribution.critical, color: COLORS.critical },
 ].filter(item => item.value > 0);

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* KPI Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <Card>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium">
 {t.riskCompliance.totalRisks}
 </CardTitle>
 <ShieldAlert className="h-4 w-4 text-blue-600" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{dashboard.totalRisks}</div>
 <p className="text-xs text-muted-foreground mt-1">
 {t.riskCompliance.activeRisks}
 </p>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium">
 {t.riskCompliance.highCriticalRisks}
 </CardTitle>
 <AlertTriangle className="h-4 w-4 text-red-600" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-red-600">{dashboard.highCriticalRisks}</div>
 <p className="text-xs text-muted-foreground mt-1">
 {t.riskCompliance.requireImmediateAttention}
 </p>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium">
 {t.riskCompliance.mitigatedRisks}
 </CardTitle>
 <CheckCircle2 className="h-4 w-4 text-green-600" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-green-600">{dashboard.mitigatedRisks}</div>
 <p className="text-xs text-muted-foreground mt-1">
 {t.riskCompliance.mitigatedOrClosed}
 </p>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium">
 {t.riskCompliance.mitigationRate}
 </CardTitle>
 <TrendingUp className="h-4 w-4 text-blue-600" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">
 {dashboard.totalRisks > 0 
 ? Math.round((dashboard.mitigatedRisks / dashboard.totalRisks) * 100)
 : 0}%
 </div>
 <p className="text-xs text-muted-foreground mt-1">
 {t.riskCompliance.ofTotalRisks}
 </p>
 </CardContent>
 </Card>
 </div>

 {/* Charts */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Risk Level Distribution */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <PieChart className="h-5 w-5" />
 {t.riskCompliance.riskLevelDistribution}
 </CardTitle>
 </CardHeader>
 <CardContent>
 {levelDistributionData.length > 0 ? (
 <ResponsiveContainer width="100%" height={300}>
 <RechartsPieChart>
 <Pie
 data={levelDistributionData}
 cx="50%"
 cy="50%"
 labelLine={false}
 label={({ name, value }) => `${name}: ${value}`}
 outerRadius={80}
 fill="#8884d8"
 dataKey="value"
 >
 {levelDistributionData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip />
 </RechartsPieChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-[300px] flex items-center justify-center text-muted-foreground">
 {t.riskCompliance.noData}
 </div>
 )}
 </CardContent>
 </Card>

 {/* 12-Month Trends */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <TrendingUp className="h-5 w-5" />
 {t.riskCompliance.twelveMonthTrends}
 </CardTitle>
 </CardHeader>
 <CardContent>
 {dashboard.monthlyTrends.length > 0 ? (
 <ResponsiveContainer width="100%" height={300}>
 <LineChart data={dashboard.monthlyTrends}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="month" />
 <YAxis />
 <Tooltip />
 <Legend />
 <Line type="monotone" dataKey="count" stroke="#3b82f6" name={t.organizationModule.total28} />
 <Line type="monotone" dataKey="high" stroke="#f97316" name={t.organizationModule.high23} />
 <Line type="monotone" dataKey="critical" stroke="#ef4444" name={t.organizationModule.critical} />
 </LineChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-[300px] flex items-center justify-center text-muted-foreground">
 {t.riskCompliance.noData}
 </div>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Risks by Category */}
 <Card>
 <CardHeader>
 <CardTitle>{t.riskCompliance.risksByCategory}</CardTitle>
 </CardHeader>
 <CardContent>
 {dashboard.categoryBreakdown.length > 0 ? (
 <ResponsiveContainer width="100%" height={400}>
 <BarChart data={dashboard.categoryBreakdown}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="category" />
 <YAxis />
 <Tooltip />
 <Legend />
 <Bar dataKey="count" fill="#3b82f6" name={t.organizationModule.count} />
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-[400px] flex items-center justify-center text-muted-foreground">
 {t.organizationModule.noData}
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 );
}
