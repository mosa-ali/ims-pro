import React from 'react';
import { useExecutiveDashboard } from "./useExecutiveDashboard";
import { KpiCard } from "./KpiCard";
import { PortfolioSummaryCard } from "./PortfolioSummaryCard";
import { ExecutiveAlertsPanel } from "./ExecutiveAlertsPanel";
import { BudgetUtilizationChart } from "@/components/charts/BudgetUtilizationChart";
import { ProjectStatusChart } from "@/components/charts/ProjectStatusChart";
import { 
  DollarSign, 
  TrendingUp, 
  Briefcase, 
  Target, 
  Users, 
  AlertTriangle 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExecutiveSummaryTab() {
  const {
  kpis,
  trends,
  alerts,
  isLoading
} = useExecutiveDashboard();

  if (isLoading) return <SummarySkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Portfolio Budget"
          value={kpis?.totalBudget}
          icon={<DollarSign className="text-teal-600" />}
          trend={+12.5}
          format="currency"
        />
        <KpiCard
          title="Total Actual Spending"
          value={kpis?.totalSpent}
          icon={<TrendingUp className="text-emerald-600" />}
          trend={+8.2}
          format="currency"
        />
        <KpiCard
          title="Active Projects"
          value={kpis?.activeProjects}
          icon={<Briefcase className="text-blue-600" />}
          trend={-2}
        />
        <KpiCard
          title="Burn Rate"
          value={kpis?.burnRate}
          icon={<Target className="text-rose-600" />}
          suffix="%"
          threshold={{ warning: 80, critical: 95 }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <PortfolioSummaryCard data={data?.portfolioSummary} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BudgetUtilizationChart
                utilization={kpis?.burnRate ?? 0}
                isLoading={isLoading}
              />
            <ProjectStatusChart data={data?.projectStatus} />
          </div>
        </div>
        <div className="lg:col-span-4">
        <ExecutiveAlertsPanel alerts={alerts ?? []} />
        </div>
      </div>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          <Skeleton className="h-[400px] rounded-xl" />
          <div className="grid grid-cols-2 gap-6">
            <Skeleton className="h-[300px] rounded-xl" />
            <Skeleton className="h-[300px] rounded-xl" />
          </div>
        </div>
        <div className="col-span-4">
          <Skeleton className="h-[700px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
