import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency } from "@/utils/formatters";
import { 
  DollarSign, 
  Target, 
  TrendingUp, 
  Users, 
  Briefcase,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import type { ExecutiveKPIs } from "@shared/types/executive";
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
  data?: ExecutiveKPIs;
  isLoading: boolean;
}

/**
 * ExecutiveSummaryCards
 * Location: src/components/executive/ExecutiveSummaryCards.tsx
 * 
 * Top-row KPI cards providing the "Source of Truth" metrics.
 */
export default function ExecutiveSummaryCards({ data, isLoading }: Props) {
      const {language } = useLanguage();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();

  const cards = [
    {
      label: t.NewDashboardTranslations.totalBudgetAllocation ?? "Total Budget Allocation",
      value: formatCurrency(data?.totalBudget ?? 0, 'USD', language),
      icon: DollarSign,
      color: "text-blue-600",
      bg: "bg-blue-50",
      trend: "+5.2%",
      trendUp: true
    },
    {
        label: t.NewDashboardTranslations.budgetUtilizationRate ?? "Budget Utilization Rate",
        value: `${Number(data?.budgetExecution ?? 0).toFixed(2)}%`,
        icon: TrendingUp,
        color: "text-teal-600",
        bg: "bg-teal-50",
        trend: "-2.1%",
        trendUp: false
        },
    {
      label: t.NewDashboardTranslations.activeGrantsCount ?? "Active Grants",
      value: data?.activeGrants ?? 0,
      icon: Target,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      trend: "Stable",
      trendUp: true
    },
    {
      label: t.NewDashboardTranslations.totalWorkforce ?? "Total Workforce",
      value: data?.totalEmployees ?? 0, // Fallback to 0 if not in type
      icon: Users,
      color: "text-amber-600",
      bg: "bg-amber-50",
      trend: "+12",
      trendUp: true
    },
    {
      label: t.NewDashboardTranslations.beneficiariesReached ?? "Beneficiaries Reached",
      value: (data?.beneficiariesReached ?? 0).toLocaleString(),
      icon: Briefcase,
      color: "text-rose-600",
      bg: "bg-rose-50",
      trend: "+15%",
      trendUp: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card, i) => (
        <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`${card.bg} p-2 rounded-lg`}>
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                  <div className={`flex items-center text-[10px] font-bold ${card.trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {card.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {card.trend}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">
                    {card.label}
                  </p>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">
                    {card.value}
                  </h3>
                </div>
                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${card.color.replace('text', 'bg')} opacity-60`} 
                    style={{ width: '65%' }} 
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
