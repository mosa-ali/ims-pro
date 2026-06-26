import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n/useTranslation";
import { PieChart as PieIcon } from "lucide-react";

import { trpc } from "@/lib/trpc";

import BudgetUtilizationChart from "@/components/charts/BudgetUtilizationChart";
import ExecutiveProcurementPanel from "./ExecutiveProcurementPanel";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";


export default function ExecutiveFinancialPanel() {
  const { t } = useTranslation();

  const {
    data,
    isLoading,
  } = trpc.executiveDashboard.getFinancialAnalytics.useQuery();

  const utilization =
    Number(data?.utilization ?? 0);

      const { currentOrganization } = useOrganization();
      const { currentOperatingUnit } = useOperatingUnit();
      const organizationId = currentOrganization?.id || 0;
      const operatingUnitId = currentOperatingUnit?.id;



return (
  <div className="flex flex-col gap-6">
    {/* Portfolio Utilization — fixed height to prevent collapse */}
    <Card className="border border-slate-200 shadow-sm bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <PieIcon className="w-5 h-5 text-indigo-500" />
          {t.NewDashboardTranslations?.portfolioUtilization ?? "Portfolio Utilization"}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-[280px] flex items-center justify-center">
        {isLoading ? (
          <Skeleton className="h-[260px] w-full rounded-xl" />
        ) : (
          <BudgetUtilizationChart utilization={utilization} isLoading={false} />
        )}
      </CardContent>
    </Card>

    {/* Procurement & Logistics — clearly separated card below */}
    <ExecutiveProcurementPanel
      organizationId={organizationId}
      operatingUnitId={currentOperatingUnit?.id ? Number(currentOperatingUnit.id) : null}
    />
  </div>
);
}