// =============================================================================
// ROWS 7-8: FINANCIAL & PROCUREMENT ANALYTICS
// Budget Utilization + Monthly Expenditure + Cost Pool + PR Status + Categories + Cycle Time
// =============================================================================

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HorizontalBarChartComponent,
  LineChartComponent,
  DonutChartComponent,
  VerticalBarChartComponent,
} from "../charts/ChartComponents";
import type {
  FinancialIntelligenceRow,
  ProcurementAnalyticsRow,
} from "@shared/types/executiveDashboard";
import { POWER_BI_COLORS } from "@shared/constants/executiveDashboard";
import { ExecutiveProcurementPanel } from "./ExecutiveProcurementPanel";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";


interface FinancialProcurementRowProps {
  financialData: FinancialIntelligenceRow;
  procurementData: ProcurementAnalyticsRow;
  isLoading?: boolean;
  language?: "en" | "ar" | "it";
  isRTL?: boolean;
}

export function FinancialProcurementRowComponent({
  financialData,
  procurementData,
  isLoading = false,
  language = "en",
  isRTL = false,
}: FinancialProcurementRowProps) {
  const labels = {
  en: {
    financialTitle: "Financial Intelligence",
    budgetUtilTitle: "Budget Utilization by Grant",
    budgetUtilDesc: "Spending progress against approved budgets",
    expenditureTitle: "Monthly Expenditure",
    expenditureDesc: "Cash outflow trends",
    costPoolTitle: "Cost Pool Distribution",
    costPoolDesc: "Budget allocation by cost category",
    procurementTitle: "Procurement Analytics",
    prStatusTitle: "PR Status Distribution",
    prStatusDesc: "Purchase requests by approval stage",
    categoriesTitle: "Procurement Categories",
    categoriesDesc: "Spending by procurement type",
    cycleTimeTitle: "Procurement Cycle Time",
    cycleTimeDesc: "Average approval duration",
    budget: "Budget",
    spent: "Spent",
    remaining: "Remaining",
    utilization: "Utilization",
    amount: "Amount",
    month: "Month",
  },

  ar: {
    financialTitle: "الذكاء المالي",
    budgetUtilTitle: "استخدام الميزانية حسب المنحة",
    budgetUtilDesc: "تقدم الإنفاق مقابل الميزانيات الموافق عليها",
    expenditureTitle: "الإنفاق الشهري",
    expenditureDesc: "اتجاهات التدفق النقدي",
    costPoolTitle: "توزيع مجموعة التكاليف",
    costPoolDesc: "تخصيص الميزانية حسب فئة التكلفة",
    procurementTitle: "تحليلات المشتريات",
    prStatusTitle: "توزيع حالة طلب الشراء",
    prStatusDesc: "طلبات الشراء حسب مرحلة الموافقة",
    categoriesTitle: "فئات المشتريات",
    categoriesDesc: "الإنفاق حسب نوع المشتريات",
    cycleTimeTitle: "وقت دورة المشتريات",
    cycleTimeDesc: "متوسط مدة الموافقة",
    budget: "الميزانية",
    spent: "المصروف",
    remaining: "المتبقي",
    utilization: "الاستخدام",
    amount: "المبلغ",
    month: "الشهر",
  },

  it: {
    financialTitle: "Intelligenza Finanziaria",
    budgetUtilTitle: "Utilizzo del Budget per Sovvenzione",
    budgetUtilDesc: "Avanzamento della spesa rispetto ai budget approvati",
    expenditureTitle: "Spesa Mensile",
    expenditureDesc: "Andamento dei flussi di cassa in uscita",
    costPoolTitle: "Distribuzione dei Centri di Costo",
    costPoolDesc: "Allocazione del budget per categoria di costo",
    procurementTitle: "Analisi degli Approvvigionamenti",
    prStatusTitle: "Distribuzione dello Stato delle Richieste di Acquisto",
    prStatusDesc: "Richieste di acquisto per fase di approvazione",
    categoriesTitle: "Categorie di Approvvigionamento",
    categoriesDesc: "Spesa per tipologia di approvvigionamento",
    cycleTimeTitle: "Tempo del Ciclo di Approvvigionamento",
    cycleTimeDesc: "Durata media del processo di approvazione",
    budget: "Budget",
    spent: "Speso",
    remaining: "Residuo",
    utilization: "Utilizzo",
    amount: "Importo",
    month: "Mese",
  },
} as const;

const currentLabels = labels[language];

  const { currentOrganization } = useOrganization();
  const { currentOperatingUnit } = useOperatingUnit();
   const organizationId = currentOrganization?.id || 0;
   const operatingUnitId = currentOperatingUnit?.id;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-gray-100 animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-6 bg-gray-300 rounded w-1/2" />
              </CardHeader>
              <CardContent className="h-80" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-gray-100 animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-6 bg-gray-300 rounded w-1/2" />
              </CardHeader>
              <CardContent className="h-80" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`space-y-4 ${isRTL ? "direction-rtl" : ""}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Row 7: Financial Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Budget Utilization by Grant */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {currentLabels.budgetUtilTitle}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {currentLabels.budgetUtilDesc}
            </p>
          </CardHeader>
          <CardContent>
            <HorizontalBarChartComponent
              data={financialData.budgetUtilizationByGrant.map((item) => ({
                label: language === "ar" ? item.grantNameAr : item.grantName,
                value: item.utilizationPercentage,
              }))}
              dataKey="value"
              nameKey="label"
              colors={[POWER_BI_COLORS.primary]}
              height={300}
              isRTL={isRTL}
            />
          </CardContent>
        </Card>

        {/* Procurement & Logistics Performance - Replaces Monthly Expenditure */}
        {/* Real-time PR analytics from database (zero mock data) */}
        <ExecutiveProcurementPanel
            organizationId={organizationId}
            operatingUnitId={
                currentOperatingUnit?.id
                    ? Number(currentOperatingUnit.id)
                    : null
                }
            />

        {/* Cost Pool Distribution */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {currentLabels.costPoolTitle}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {currentLabels.costPoolDesc}
            </p>
          </CardHeader>
          <CardContent>
            <DonutChartComponent
              data={financialData.costPoolDistribution.map((item) => ({
                label:
                language === "ar"
                    ? item.labelAr ?? item.label ?? "Unknown"
                    : item.label ?? item.labelAr ?? "Unknown",
                value: item.value,
                percentage: item.percentage,
                color: item.color,
              }))}
              height={300}
              isRTL={isRTL}
            />
          </CardContent>
        </Card>
      </div>

      {/* Row 8: Procurement Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* PR Status Distribution */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {currentLabels.prStatusTitle}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {currentLabels.prStatusDesc}
            </p>
          </CardHeader>
          <CardContent>
            <DonutChartComponent
              data={procurementData.prStatus.map((item) => ({
                label:
                    language === "ar"
                        ? item.statusAr ?? item.status ?? "Unknown"
                        : item.status ?? item.statusAr ?? "Unknown",
                value: item.count,
                percentage: item.percentage,
                color: item.color,
              }))}
              height={300}
              isRTL={isRTL}
            />
          </CardContent>
        </Card>

        {/* Procurement Categories */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {currentLabels.categoriesTitle}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {currentLabels.categoriesDesc}
            </p>
          </CardHeader>
          <CardContent>
            <VerticalBarChartComponent
              data={procurementData.procurementCategories.map((item) => ({
                label: language === "ar" ? item.labelAr : item.label,
                value: item.value,
              }))}
              dataKey="value"
              nameKey="label"
              colors={procurementData.procurementCategories.map((item) => item.color)}
              height={300}
              isRTL={isRTL}
            />
          </CardContent>
        </Card>

        {/* Procurement Cycle Time */}
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {currentLabels.cycleTimeTitle}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {currentLabels.cycleTimeDesc}
            </p>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={procurementData.procurementCycleTime.map(item => ({
                x: item.month,
                month: item.month,
                averageApprovalDays: item.averageApprovalDays,
                }))}
              lines={[
                {
                  key: "averageApprovalDays",
                  stroke: POWER_BI_COLORS.danger,
                  name: "Avg Days",
                },
              ]}
              xAxisKey="month"
              height={300}
              isRTL={isRTL}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default FinancialProcurementRowComponent;
