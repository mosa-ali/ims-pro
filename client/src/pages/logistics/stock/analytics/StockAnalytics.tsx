/**
 * Stock Movement Analytics Dashboard
 * Charts showing issuance trends, transfer volumes, adjustment frequency,
 * top items by movement, and stock value by warehouse using Recharts.
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3, TrendingUp, Package,
  ArrowLeftRight, Wrench, Loader2, Warehouse, DollarSign
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ComposedChart
} from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { BackButton } from "@/components/BackButton";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#f97316", "#14b8a6", "#6366f1"
];

export default function StockAnalytics() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [months, setMonths] = useState("6");
  const monthsNum = parseInt(months);

  const { data: monthlySummary, isLoading: summaryLoading } =
    trpc.logistics.stockMgmt.analytics.monthlySummary.useQuery({ months: monthsNum });
  const { data: transferVolume, isLoading: transferLoading } =
    trpc.logistics.stockMgmt.analytics.transferVolume.useQuery({ months: monthsNum });
  const { data: adjustmentFreq, isLoading: adjLoading } =
    trpc.logistics.stockMgmt.analytics.adjustmentFrequency.useQuery({ months: monthsNum });
  const { data: topItems, isLoading: topLoading } =
    trpc.logistics.stockMgmt.analytics.topItems.useQuery({ limit: 10 });
  const { data: stockByWarehouse, isLoading: whLoading } =
    trpc.logistics.stockMgmt.analytics.stockValueByWarehouse.useQuery();

  const adjTypeLabels: Record<string, string> = {
    write_off: isRTL ? "شطب" : "Write-Off",
    physical_count: isRTL ? "جرد فعلي" : "Physical Count",
    damage: isRTL ? "تلف" : "Damage",
    correction: isRTL ? "تصحيح" : "Correction",
    donation: isRTL ? "تبرع" : "Donation",
    other: isRTL ? "أخرى" : "Other",
  };

  const statusLabelsTransfer: Record<string, string> = {
    draft: isRTL ? "مسودة" : "Draft",
    submitted: isRTL ? "مقدم" : "Submitted",
    dispatched: isRTL ? "تم الإرسال" : "Dispatched",
    received: isRTL ? "مستلم" : "Received",
    completed: isRTL ? "مكتمل" : "Completed",
  };

  const monthlyChartData = useMemo(() => {
    if (!monthlySummary) return [];
    return (monthlySummary as any[]).map((row: any) => ({
      month: row.month,
      label: formatMonth(row.month, isRTL),
      [isRTL ? "مستلم" : "Received"]: parseFloat(row.grnQty || 0),
      [isRTL ? "صادر" : "Issued"]: parseFloat(row.issueQty || 0),
      [isRTL ? "تحويل صادر" : "Transfer Out"]: parseFloat(row.transferOutQty || 0),
      [isRTL ? "تحويل وارد" : "Transfer In"]: parseFloat(row.transferInQty || 0),
      [isRTL ? "تسويات" : "Adjustments"]: parseFloat(row.adjustmentQty || 0),
      [isRTL ? "مرتجعات" : "Returns"]: parseFloat(row.returnQty || 0),
      totalValue: parseFloat(row.totalValue || 0),
      transactions: row.txCount || 0,
    }));
  }, [monthlySummary, isRTL]);

  const transferChartData = useMemo(() => {
    if (!transferVolume) return [];
    const grouped: Record<string, any> = {};
    (transferVolume as any[]).forEach((row: any) => {
      if (!grouped[row.month]) grouped[row.month] = { month: row.month, label: formatMonth(row.month, isRTL) };
      grouped[row.month][row.status] = row.count;
    });
    return Object.values(grouped);
  }, [transferVolume, isRTL]);

  const adjustmentPieData = useMemo(() => {
    if (!adjustmentFreq) return [];
    const typeMap: Record<string, number> = {};
    (adjustmentFreq as any[]).forEach((row: any) => {
      const label = adjTypeLabels[row.type] || row.type;
      typeMap[label] = (typeMap[label] || 0) + row.count;
    });
    return Object.entries(typeMap).map(([name, value]) => ({ name, value }));
  }, [adjustmentFreq, isRTL]);

  const topItemsData = useMemo(() => {
    if (!topItems) return [];
    return (topItems as any[]).map((item: any) => ({
      name: item.itemName?.length > 20 ? item.itemName.slice(0, 20) + "..." : item.itemName,
      fullName: item.itemName,
      itemCode: item.itemCode,
      quantity: parseFloat(item.totalQty || 0),
      value: parseFloat(item.totalValue || 0),
      transactions: item.txCount,
    }));
  }, [topItems]);

  const warehousePieData = useMemo(() => {
    if (!stockByWarehouse) return [];
    return (stockByWarehouse as any[]).map((row: any) => ({
      name: row.warehouseName || (isRTL ? "غير محدد" : "Unassigned"),
      value: parseFloat(row.totalValue || 0),
      batchCount: row.batchCount,
      itemCount: row.itemCount,
    }));
  }, [stockByWarehouse, isRTL]);

  const isLoading = summaryLoading || transferLoading || adjLoading || topLoading || whLoading;

  const receivedKey = isRTL ? "مستلم" : "Received";
  const issuedKey = isRTL ? "صادر" : "Issued";
  const transferOutKey = isRTL ? "تحويل صادر" : "Transfer Out";
  const transferInKey = isRTL ? "تحويل وارد" : "Transfer In";
  const adjustmentsKey = isRTL ? "تسويات" : "Adjustments";
  const returnsKey = isRTL ? "مرتجعات" : "Returns";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <BackButton href="/organization/logistics/stock" label={t.logistics?.stockManagement || "Back to Stock Management"} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{t.logistics?.stockAnalytics || "Stock Movement Analytics"}</h1>
          <p className="text-sm text-muted-foreground">{t.logistics?.stockAnalyticsDesc || "Issuance trends, transfer volumes, and adjustment frequency over time"}</p>
        </div>
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">{isRTL ? "آخر ٣ أشهر" : "Last 3 months"}</SelectItem>
            <SelectItem value="6">{isRTL ? "آخر ٦ أشهر" : "Last 6 months"}</SelectItem>
            <SelectItem value="12">{isRTL ? "آخر ١٢ شهر" : "Last 12 months"}</SelectItem>
            <SelectItem value="24">{isRTL ? "آخر ٢٤ شهر" : "Last 24 months"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          {isRTL ? "جاري تحميل بيانات التحليلات..." : "Loading analytics data..."}
        </div>
      )}

      {/* Monthly Movement Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> {isRTL ? "حركة المخزون الشهرية" : "Monthly Stock Movements"}
          </CardTitle>
          <CardDescription>{isRTL ? "كمية الأصناف المستلمة والصادرة والمحولة والمسوّاة والمرتجعة شهرياً" : "Quantity of items received, issued, transferred, adjusted, and returned per month"}</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyChartData.length === 0 ? (
            <EmptyChart message={isRTL ? "لا توجد بيانات حركة مخزون لهذه الفترة" : "No stock movement data for this period"} />
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={(value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
                <Legend />
                <Bar dataKey={receivedKey} stackId="a" fill="#10b981" />
                <Bar dataKey={issuedKey} stackId="b" fill="#ef4444" />
                <Bar dataKey={transferOutKey} stackId="c" fill="#f59e0b" />
                <Bar dataKey={transferInKey} stackId="c" fill="#3b82f6" />
                <Bar dataKey={adjustmentsKey} stackId="d" fill="#8b5cf6" />
                <Bar dataKey={returnsKey} stackId="e" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transfer Volume */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" /> {isRTL ? "حجم التحويلات حسب الحالة" : "Transfer Volume by Status"}
            </CardTitle>
            <CardDescription>{isRTL ? "عدد تحويلات المستودعات الشهرية حسب الحالة" : "Monthly warehouse transfer counts by status"}</CardDescription>
          </CardHeader>
          <CardContent>
            {transferChartData.length === 0 ? (
              <EmptyChart message={isRTL ? "لا توجد بيانات تحويلات لهذه الفترة" : "No transfer data for this period"} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={transferChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  <Legend />
                  <Bar dataKey="draft" fill="#9ca3af" name={statusLabelsTransfer.draft} />
                  <Bar dataKey="submitted" fill="#60a5fa" name={statusLabelsTransfer.submitted} />
                  <Bar dataKey="dispatched" fill="#f59e0b" name={statusLabelsTransfer.dispatched} />
                  <Bar dataKey="received" fill="#10b981" name={statusLabelsTransfer.received} />
                  <Bar dataKey="completed" fill="#3b82f6" name={statusLabelsTransfer.completed} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Adjustment Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-5 w-5" /> {isRTL ? "توزيع التسويات" : "Adjustment Breakdown"}
            </CardTitle>
            <CardDescription>{isRTL ? "توزيع تسويات المخزون حسب النوع" : "Distribution of stock adjustments by type"}</CardDescription>
          </CardHeader>
          <CardContent>
            {adjustmentPieData.length === 0 ? (
              <EmptyChart message={isRTL ? "لا توجد بيانات تسويات لهذه الفترة" : "No adjustment data for this period"} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={adjustmentPieData} cx="50%" cy="50%" labelLine={true} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} fill="#8884d8" dataKey="value">
                    {adjustmentPieData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> {isRTL ? "أعلى ١٠ أصناف حركة" : "Top 10 Items by Movement"}
            </CardTitle>
            <CardDescription>{isRTL ? "الأصناف الأكثر نشاطاً حسب إجمالي الكمية المنقولة" : "Most active stock items by total quantity moved"}</CardDescription>
          </CardHeader>
          <CardContent>
            {topItemsData.length === 0 ? (
              <EmptyChart message={isRTL ? "لا توجد بيانات حركة أصناف" : "No item movement data available"} />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topItemsData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                    formatter={(value: number, name: string) => [value.toLocaleString(undefined, { maximumFractionDigits: 0 }), name === "quantity" ? (isRTL ? "الكمية المنقولة" : "Qty Moved") : (isRTL ? "القيمة ($)" : "Value ($)")]}
                    labelFormatter={(label) => { const item = topItemsData.find(i => i.name === label); return item?.fullName || label; }}
                  />
                  <Bar dataKey="quantity" fill="#3b82f6" name={isRTL ? "الكمية المنقولة" : "Qty Moved"} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Stock Value by Warehouse */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Warehouse className="h-5 w-5" /> {isRTL ? "قيمة المخزون حسب المستودع" : "Stock Value by Warehouse"}
            </CardTitle>
            <CardDescription>{isRTL ? "توزيع قيمة المخزون الحالية عبر المستودعات" : "Distribution of current stock value across warehouses"}</CardDescription>
          </CardHeader>
          <CardContent>
            {warehousePieData.length === 0 ? (
              <EmptyChart message={isRTL ? "لا توجد بيانات مخزون مستودعات" : "No warehouse stock data available"} />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={warehousePieData} cx="50%" cy="50%" outerRadius={90} fill="#8884d8" dataKey="value"
                      label={({ name, value }) => `${name}: $${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}>
                      {warehousePieData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={(value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {warehousePieData.map((wh, idx) => (
                    <div key={wh.name} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span>{wh.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span>{wh.itemCount} {isRTL ? "صنف" : "items"}</span>
                        <span className="font-medium text-foreground">${wh.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Value Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> {isRTL ? "قيمة المعاملات الشهرية" : "Monthly Transaction Value"}
          </CardTitle>
          <CardDescription>{isRTL ? "إجمالي قيمة جميع حركات المخزون شهرياً" : "Total value of all stock movements per month"}</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyChartData.length === 0 ? (
            <EmptyChart message={isRTL ? "لا توجد بيانات قيمة معاملات لهذه الفترة" : "No transaction value data for this period"} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyChartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, isRTL ? "إجمالي القيمة" : "Total Value"]} />
                <Area type="monotone" dataKey="totalValue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatMonth(monthStr: string, isRTL: boolean): string {
  if (!monthStr) return "";
  const [year, month] = monthStr.split("-");
  const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthsAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const m = parseInt(month) - 1;
  return isRTL ? `${monthsAr[m] || month} ${year}` : `${monthsEn[m] || month} ${year}`;
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
      <div className="text-center">
        <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}
