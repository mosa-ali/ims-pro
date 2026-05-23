/**
 * ============================================================================
 * BURN RATE ANALYTICS COMPONENT - FINAL VERSION
 * ============================================================================
 * 
 * Displays 12-month budget burn analysis with:
 * - Composed chart (monthly bars + cumulative line)
 * - Burn velocity indicator (accelerating/decelerating)
 * - Summary metrics (Total Budget, Spent, Remaining, Burn Rate)
 * - Variance analysis for last 3 months
 * - Risk warnings and alerts
 * - Full RTL/LTR and bilingual support
 * 
 * ============================================================================
 */

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface BurnRateDataPoint {
  month: string;
  monthNumber: number;
  budgeted: number;
  spent: number;
  projected: number;
  monthlySpent: number;
  monthlyBudgeted: number;
  variance: number;
  burnRate: number;
  cumulativeSpent: number;
  cumulativeBudgeted: number;
}

interface BurnRateAnalyticsProps {
  data: BurnRateDataPoint[];
  isLoading?: boolean;
  organizationId: number;
  t: any;
  isRTL?: boolean;
}

export function BurnRateAnalytics({
  data,
  isLoading = false,
  organizationId,
  t,
  isRTL = false,
}: BurnRateAnalyticsProps) {
  // Calculate metrics
  const metrics = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalBudget: 0,
        totalSpent: 0,
        remaining: 0,
        burnRate: 0,
        velocity: 'stable' as const,
        warnings: [] as string[],
      };
    }

    const totalBudget = data[data.length - 1]?.cumulativeBudgeted || 0;
    const totalSpent = data[data.length - 1]?.cumulativeSpent || 0;
    const remaining = totalBudget - totalSpent;
    const burnRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    // Calculate burn velocity (last 3 months trend)
    const last3Months = data.slice(-3);
    const velocities = last3Months.map(d => d.burnRate);
    const isAccelerating = velocities[velocities.length - 1] > velocities[0];
    const velocity = isAccelerating ? 'accelerating' : 'decelerating';

    // Generate warnings
    const warnings: string[] = [];
    if (burnRate > 100) {
      warnings.push('Over budget: Spending exceeds allocated budget');
    } else if (burnRate > 90) {
      warnings.push('Critical: Budget utilization above 90%');
    } else if (isAccelerating && burnRate > 70) {
      warnings.push('Warning: Burn rate accelerating with high utilization');
    }

    // Check for zero spending
    if (totalSpent === 0) {
      warnings.push('No expenditures recorded');
    }

    return {
      totalBudget,
      totalSpent,
      remaining,
      burnRate,
      velocity,
      warnings,
    };
  }, [data]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${Math.round(value)}%`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.burnRateAnalytics?.title || 'Budget Burn Analytics (12 Months)'}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading financial data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.burnRateAnalytics?.title || 'Budget Burn Analytics (12 Months)'}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">
              {t.burnRateAnalytics?.noData || 'No financial data available'}
            </p>
            <p className="text-sm text-muted-foreground">
              {t.burnRateAnalytics?.hint || 'Budget allocations and expenses will appear here once recorded'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.burnRateAnalytics?.title || 'Budget Burn Analytics (12 Months)'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warnings */}
        {metrics.warnings.length > 0 && (
          <div className="space-y-2">
            {metrics.warnings.map((warning, idx) => (
              <Alert key={idx} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-background p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">
              {t.burnRateAnalytics?.totalBudget || 'Total Budget'}
            </p>
            <p className="text-lg font-semibold">{formatCurrency(metrics.totalBudget)}</p>
          </div>
          <div className="bg-background p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">
              {t.burnRateAnalytics?.totalSpent || 'Total Spent'}
            </p>
            <p className="text-lg font-semibold text-red-600">{formatCurrency(metrics.totalSpent)}</p>
          </div>
          <div className="bg-background p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">
              {t.burnRateAnalytics?.remaining || 'Remaining'}
            </p>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(metrics.remaining)}</p>
          </div>
          <div className="bg-background p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">Burn Rate</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold">{formatPercent(metrics.burnRate)}</p>
              {metrics.velocity === 'accelerating' ? (
                <TrendingUp className="h-4 w-4 text-red-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-600" />
              )}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="w-full h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              layout={isRTL ? 'vertical' : 'horizontal'}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value: any) => formatCurrency(value)}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Legend />
              <Bar dataKey="monthlySpent" fill="#ef4444" name="Monthly Spent" />
              <Line
                type="monotone"
                dataKey="cumulativeSpent"
                stroke="#3b82f6"
                name="Cumulative Spent"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Variance Analysis */}
        {data.length >= 3 && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Last 3 Months Variance</h4>
            <div className="space-y-2">
              {data.slice(-3).map((month: BurnRateDataPoint, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span>{month.month}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      Variance: {month.variance > 0 ? '+' : ''}{formatCurrency(month.variance)}
                    </span>
                    <span
                      className={
                        month.variance > 0
                          ? 'text-red-600 font-medium'
                          : 'text-green-600 font-medium'
                      }
                    >
                      {month.variance > 0 ? '↑' : '↓'} {formatPercent(Math.abs(month.variance))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
