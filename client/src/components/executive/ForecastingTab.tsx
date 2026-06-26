import React from 'react';
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  Calendar, 
  AlertCircle, 
  Clock, 
  ArrowUpRight, 
  Zap,
  Info
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { useTranslation } from '@/i18n/useTranslation';


// Visualization Components (Assumed directory: src/components/charts/)
import ForecastChart from "@/components/charts/ForecastChart";
import BurnRateChart from "@/components/charts/BurnRateChart";

/**
 * ForecastingTab
 * Location: src/pages/dashboard/tabs/ForecastingTab.tsx
 * 
 * Strategic projection panel for organization leadership.
 * Provides real-time visibility into funding longevity and spending velocity.
 */
export default function ForecastingTab() {
      const {language } = useLanguage();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
  const { currentOrganizationId } = useOrganization();
  const { currentOperatingUnitId } = useOperatingUnit();

  // ── DATA FETCHING ──
  const queryEnabled = !!currentOrganizationId;
  const commonOptions = { 
    enabled: queryEnabled, 
    staleTime: 300000, 
    refetchOnWindowFocus: false 
  };

  // Aggregated forecasting data from GrantForecastingService via tRPC
  const {
  data: forecast,
  isLoading: forecastLoading,
    } = trpc.executiveDashboard.getForecastingData.useQuery(
    undefined,
    commonOptions
    );

  // Portfolio-wide spending trends for burn rate visualization
  const trends = forecast?.monthlyTrend ?? [];

  const isLoading = forecastLoading;

  // ── RENDER HELPERS ──
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'critical': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'warning': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ── TOP ROW: STRATEGIC PROJECTION CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm overflow-hidden bg-white">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="bg-teal-50 p-2 rounded-lg text-teal-600">
                <Calendar className="w-5 h-5" />
              </div>
              <Badge variant="outline" className={`font-black uppercase tracking-widest text-[9px] ${getStatusColor(forecast?.forecastStatus)}`}>
                {forecast?.forecastStatus ?? 'Healthy'}
              </Badge>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                {t.NewDashboardTranslations.projectedExhaustion ?? "Projected Exhaustion"}
              </p>
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter">
                {isLoading ? <Skeleton className="h-10 w-24" /> : `${forecast?.projectedExhaustionMonths ?? 0} Months`}
              </h3>
            </div>
            <p className="text-[10px] font-medium text-slate-500 italic">
              Estimated duration based on current 3-month trailing burn rate.
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden bg-white">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3 h-3" />
                8.4%
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                {t.NewDashboardTranslations.avgMonthlyBurn ?? "Avg. Monthly Burn"}
              </p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                {isLoading ? <Skeleton className="h-10 w-32" /> : formatCurrency(forecast?.avgMonthlyBurn ?? 0, 'USD', language)}
              </h3>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
               <div className="h-full bg-blue-500 rounded-full w-[65%]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden bg-slate-900 text-white">
          <CardContent className="p-6 space-y-4">
            <div className="bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-teal-400/60 uppercase tracking-[0.2em] mb-1">
                {t.NewDashboardTranslations.unallocatedLiquidity ?? "Unallocated Liquidity"}
              </p>
              <h3 className="text-3xl font-black text-white tracking-tighter">
                {isLoading ? <Skeleton className="h-10 w-32 bg-white/10" /> : formatCurrency(forecast?.remainingBalance ?? 0, 'USD', language)}
              </h3>
            </div>
            <button className="text-[10px] font-bold text-teal-400 uppercase tracking-widest hover:text-teal-300 transition-colors flex items-center gap-2">
              Optimize Resource Allocation
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* ── MAIN CHARTING AREA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Expenditure Projection Chart */}
        <Card className="lg:col-span-8 border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b py-5 px-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">Expenditure Forecasting & Exhaustion Point</CardTitle>
                <CardDescription className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1">
                  Predictive spending analysis vs liquidity threshold
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border-emerald-100">Actual</Badge>
                <Badge variant="outline" className="text-[9px] font-bold text-slate-400 border-slate-200">Forecasted</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : (
              <ForecastChart 
                data={trends} 
                height={320} 
              />
            )}
          </CardContent>
        </Card>

        {/* Tactical Insights Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="border-none shadow-sm bg-slate-50 border-slate-100 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {t.NewDashboardTranslations.strategicAlerts ?? "Strategic Insights"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="bg-rose-100 p-2 rounded-lg text-rose-600 h-fit">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">Velocity Threshold Warning</p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    Spending velocity has increased by 14% this month. If maintained, exhaustion will accelerate by 1.2 months.
                  </p>
                </div>
              </div>
              
              <div className="h-[1px] w-full bg-slate-200" />

              <div className="flex gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600 h-fit">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">Unspent Grant Alert</p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    Grant #YER-24-102 is currently 22% behind planned burn rate. Review implementation bottlenecks.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden flex-1">
            <CardHeader className="pb-2">
               <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Velocity History</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
               <BurnRateChart 
                 data={trends.map(t => ({
                    month: t.month,
                    cumulativeBudget: t.forecast,
                    cumulativeActual: t.actual
                    }))} 
                 height={180} 
               />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
