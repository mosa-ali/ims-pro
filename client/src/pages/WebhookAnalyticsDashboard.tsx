/**
 * ============================================================================
 * Webhook Delivery Analytics Dashboard
 * ============================================================================
 * 
 * Real-time analytics and monitoring for webhook deliveries:
 * - Success rates and failure rates
 * - Retry patterns and effectiveness
 * - Performance metrics (response times, SLA compliance)
 * - Event type distribution
 * - Delivery trends over time
 * - Webhook health scores
 * 
 * Supports RTL/LTR and bilingual (English/Arabic)
 * ============================================================================
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, AlertCircle, CheckCircle, Clock, TrendingUp, Download } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface WebhookMetrics {
  webhookId: string;
  totalDeliveries: number;
  successRate: number;
  failureRate: number;
  retryRate: number;
  timeoutRate: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  healthScore: number;
}

interface EventDistribution {
  eventType: string;
  count: number;
  percentage: number;
  successRate: number;
}

interface DeliveryTrend {
  timestamp: string;
  successCount: number;
  failureCount: number;
  retryCount: number;
  timeoutCount: number;
}

export default function WebhookAnalyticsDashboard() {

  const { t } = useTranslation();  const { user, loading } = useAuth();
  const { language, isRTL } = useLanguage();
  const [selectedWebhook, setSelectedWebhook] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [metrics, setMetrics] = useState<WebhookMetrics | null>(null);
  const [eventDistribution, setEventDistribution] = useState<EventDistribution[]>([]);
  const [deliveryTrends, setDeliveryTrends] = useState<DeliveryTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - in production, fetch from tRPC
  useEffect(() => {
    const mockMetrics: WebhookMetrics = {
      webhookId: selectedWebhook,
      totalDeliveries: 1250,
      successRate: 94.5,
      failureRate: 3.2,
      retryRate: 8.1,
      timeoutRate: 2.3,
      averageResponseTime: 1240,
      p95ResponseTime: 3500,
      p99ResponseTime: 5200,
      healthScore: 92,
    };

    const mockEvents: EventDistribution[] = [
      { eventType: 'organization_created', count: 450, percentage: 36, successRate: 98 },
      { eventType: 'onboarding_started', count: 380, percentage: 30.4, successRate: 95 },
      { eventType: 'onboarding_completed', count: 320, percentage: 25.6, successRate: 92 },
      { eventType: 'onboarding_failed', count: 100, percentage: 8, successRate: 78 },
    ];

    const mockTrends: DeliveryTrend[] = [
      { timestamp: '00:00', successCount: 45, failureCount: 2, retryCount: 3, timeoutCount: 1 },
      { timestamp: '04:00', successCount: 52, failureCount: 3, retryCount: 4, timeoutCount: 1 },
      { timestamp: '08:00', successCount: 68, failureCount: 2, retryCount: 5, timeoutCount: 2 },
      { timestamp: '12:00', successCount: 75, failureCount: 4, retryCount: 6, timeoutCount: 1 },
      { timestamp: '16:00', successCount: 62, failureCount: 3, retryCount: 4, timeoutCount: 2 },
      { timestamp: '20:00', successCount: 58, failureCount: 2, retryCount: 3, timeoutCount: 1 },
    ];

    setMetrics(mockMetrics);
    setEventDistribution(mockEvents);
    setDeliveryTrends(mockTrends);
    setIsLoading(false);
  }, [selectedWebhook, timeRange]);

  if (loading || !user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const labels = {
    en: {
      title: 'Webhook Delivery Analytics',
      subtitle: 'Real-time monitoring and performance metrics',
      selectWebhook: 'Select Webhook',
      timeRange: 'Time Range',
      successRate: 'Success Rate',
      failureRate: 'Failure Rate',
      retryRate: 'Retry Rate',
      timeoutRate: 'Timeout Rate',
      avgResponseTime: 'Avg Response Time',
      p95ResponseTime: '95th Percentile',
      p99ResponseTime: '99th Percentile',
      healthScore: 'Health Score',
      eventDistribution: 'Event Type Distribution',
      deliveryTrends: 'Delivery Trends (24h)',
      slaCompliance: 'SLA Compliance',
      export: 'Export Report',
      healthy: 'Healthy',
      degraded: 'Degraded',
      unhealthy: 'Unhealthy',
    },
    ar: {
      title: 'تحليلات تسليم الخطافات',
      subtitle: 'المراقبة في الوقت الفعلي ومقاييس الأداء',
      selectWebhook: 'اختر الخطاف',
      timeRange: 'نطاق الوقت',
      successRate: 'معدل النجاح',
      failureRate: 'معدل الفشل',
      retryRate: 'معدل إعادة المحاولة',
      timeoutRate: 'معدل انتهاء المهلة الزمنية',
      avgResponseTime: 'متوسط وقت الاستجابة',
      p95ResponseTime: 'المئين 95',
      p99ResponseTime: 'المئين 99',
      healthScore: 'درجة الصحة',
      eventDistribution: 'توزيع نوع الحدث',
      deliveryTrends: 'اتجاهات التسليم (24 ساعة)',
      slaCompliance: 'امتثال اتفاقية مستوى الخدمة',
      export: 'تصدير التقرير',
      healthy: 'سليم',
      degraded: 'متدهور',
      unhealthy: 'غير سليم',
    },
  };

  const t = labels[language as keyof typeof labels] || labels.en;

  const getHealthBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getHealthStatus = (score: number) => {
    if (score >= 80) return t.healthy;
    if (score >= 60) return t.degraded;
    return t.unhealthy;
  };

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className={`min-h-screen bg-background p-8 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">{t.title}</h1>
        <p className="text-muted-foreground">{t.subtitle}</p>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-8 flex-wrap">
        <Select value={selectedWebhook} onValueChange={setSelectedWebhook}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder={t.selectWebhook} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Webhooks</SelectItem>
            <SelectItem value="webhook-1">Webhook 1</SelectItem>
            <SelectItem value="webhook-2">Webhook 2</SelectItem>
            <SelectItem value="webhook-3">Webhook 3</SelectItem>
          </SelectContent>
        </Select>

        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder={t.timeRange} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          {t.export}
        </Button>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {t.successRate}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.successRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">{metrics.totalDeliveries} total deliveries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {t.failureRate}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.failureRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">Failed deliveries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t.avgResponseTime}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{metrics.averageResponseTime}ms</div>
              <p className="text-xs text-muted-foreground mt-1">P95: {metrics.p95ResponseTime}ms</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" />
                {t.healthScore}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getHealthBadgeColor(metrics.healthScore)}`}>
                {metrics.healthScore.toFixed(0)}/100
              </div>
              <Badge className={`mt-2 ${getHealthBadgeColor(metrics.healthScore)}`}>
                {getHealthStatus(metrics.healthScore)}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Delivery Trends */}
        <Card>
          <CardHeader>
            <CardTitle>{t.deliveryTrends}</CardTitle>
            <CardDescription>Success, failure, retry, and timeout counts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={deliveryTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="successCount" stroke="#10b981" name="Success" />
                <Line type="monotone" dataKey="failureCount" stroke="#ef4444" name="Failed" />
                <Line type="monotone" dataKey="retryCount" stroke="#f59e0b" name="Retried" />
                <Line type="monotone" dataKey="timeoutCount" stroke="#8b5cf6" name="Timeout" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Event Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{t.eventDistribution}</CardTitle>
            <CardDescription>Breakdown by event type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={eventDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {eventDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Event Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t.eventDistribution}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Event Type</th>
                  <th className="text-right py-2 px-4">Count</th>
                  <th className="text-right py-2 px-4">Percentage</th>
                  <th className="text-right py-2 px-4">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {eventDistribution.map((event) => (
                  <tr key={event.eventType} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-4">{event.eventType}</td>
                    <td className="text-right py-2 px-4">{event.count}</td>
                    <td className="text-right py-2 px-4">{event.percentage.toFixed(1)}%</td>
                    <td className="text-right py-2 px-4">
                      <Badge variant={event.successRate >= 90 ? 'default' : 'secondary'}>
                        {event.successRate.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
