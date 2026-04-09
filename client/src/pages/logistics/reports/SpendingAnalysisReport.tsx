/**
 * Spending Analysis Report
 * Analyzes spending trends by month/quarter
 */

import { useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { Download, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useLanguage } from '@/contexts/LanguageContext';
import { BackButton } from "@/components/BackButton";

export default function SpendingAnalysisReport() {
  const { language, isRTL} = useLanguage();
 const { currentOrganization } = useOrganization();
 const organizationId = currentOrganization?.id || 1;

 const [dateRange, setDateRange] = useState({
 startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 6 months ago
 endDate: new Date().toISOString().split("T")[0],
 });

 const { data, isLoading, refetch } = trpc.logistics.analytics.getSpendingAnalysis.useQuery({
 organizationId,
 startDate: dateRange.startDate,
 endDate: dateRange.endDate,
 groupBy: "month",
 });

 const handleExport = () => {
 if (!data?.spendingByMonth) return;

 const csv = [
 ["Month", "Total Spending", "Order Count", "Avg Order Value"],
 ...data.spendingByMonth.map((item: any) => [
 item.month,
 item.totalSpending.toFixed(2),
 item.orderCount,
 (item.totalSpending / item.orderCount).toFixed(2),
 ]),
 ]
 .map((row) => row.join(","))
 .join("\n");

 const blob = new Blob([csv], { type: "text/csv" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `spending-analysis-${Date.now()}.csv`;
 a.click();
 };

 // Calculate trend
 const calculateTrend = () => {
 if (!data?.spendingByMonth || data.spendingByMonth.length < 2) return null;
 const recent = data.spendingByMonth[data.spendingByMonth.length - 1].totalSpending;
 const previous = data.spendingByMonth[data.spendingByMonth.length - 2].totalSpending;
 const change = ((recent - previous) / previous) * 100;
 return { change, isIncrease: change > 0 };
 };

 const trend = calculateTrend();

 return (
 <div className="container py-8 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <BackButton href="/organization/logistics/reports" iconOnly />
 <div>
 <h1 className="text-3xl font-bold">{isRTL ? 'تقرير تحليل الإنفاق' : 'Spending Analysis Report'}</h1>
 <p className="text-muted-foreground">Monthly spending trends and patterns</p>
 </div>
 </div>

 <Button variant="outline" size="sm" onClick={handleExport}>
 <Download className="h-4 w-4 me-2" />
 Export CSV
 </Button>
 </div>

 {/* Filters */}
 <Card>
 <CardHeader>
 <CardTitle>Filters</CardTitle>
 <CardDescription>Select date range to analyze</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <Label>{isRTL ? 'تاريخ البداية' : 'Start Date'}</Label>
 <Input
 type="date"
 value={dateRange.startDate}
 onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
 />
 </div>
 <div>
 <Label>{isRTL ? 'تاريخ النهاية' : 'End Date'}</Label>
 <Input
 type="date"
 value={dateRange.endDate}
 onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
 />
 </div>
 <div className="flex items-end">
 <Button onClick={() => refetch()}>
 <Calendar className="h-4 w-4 me-2" />
 Apply Filters
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Key Metrics */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <p className="text-sm text-muted-foreground">{isRTL ? 'إجمالي الإنفاق' : 'Total Spending'}</p>
 <p className="text-4xl font-bold">
 {isLoading ? "-" : `$${(data?.totalSpending || 0).toLocaleString()}`}
 </p>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <p className="text-sm text-muted-foreground">{isRTL ? 'إجمالي الطلبات' : 'Total Orders'}</p>
 <p className="text-4xl font-bold">{isLoading ? "-" : data?.totalOrders || 0}</p>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <p className="text-sm text-muted-foreground">{isRTL ? 'متوسط قيمة الطلب' : 'Avg Order Value'}</p>
 <p className="text-4xl font-bold">
 {isLoading ? "-" : `$${(data?.avgOrderValue || 0).toLocaleString()}`}
 </p>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <p className="text-sm text-muted-foreground">{isRTL ? 'الاتجاه الشهري' : 'Monthly Trend'}</p>
 <div className="flex items-center justify-center gap-2">
 {trend ? (
 <>
 {trend.isIncrease ? (
 <TrendingUp className="h-6 w-6 text-red-500" />
 ) : (
 <TrendingDown className="h-6 w-6 text-green-500" />
 )}
 <p className={`text-2xl font-bold ${trend.isIncrease ? "text-red-500" : "text-green-500"}`}>
 {Math.abs(trend.change).toFixed(1)}%
 </p>
 </>
 ) : (
 <p className="text-2xl font-bold text-muted-foreground">-</p>
 )}
 </div>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Charts */}
 <div className="grid grid-cols-1 gap-6">
 {/* Spending Trend - Line Chart */}
 <Card>
 <CardHeader>
 <CardTitle>{isRTL ? 'اتجاه الإنفاق عبر الزمن' : 'Spending Trend Over Time'}</CardTitle>
 <CardDescription>Monthly spending pattern</CardDescription>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <div className="h-96 flex items-center justify-center">
 <p className="text-muted-foreground">Loading chart...</p>
 </div>
 ) : data?.spendingByMonth && data.spendingByMonth.length > 0 ? (
 <ResponsiveContainer width="100%" height={400}>
 <LineChart data={data.spendingByMonth}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="month" />
 <YAxis label={{ value: "Spending ($)", angle: -90, position: "insideLeft" }} />
 <Tooltip />
 <Legend />
 <Line type="monotone" dataKey="totalSpending" stroke="#3b82f6" strokeWidth={2} name="Total Spending" />
 </LineChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-96 flex items-center justify-center">
 <p className="text-muted-foreground">{isRTL ? 'لا توجد بيانات متاحة' : 'No data available'}</p>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Order Volume - Bar Chart */}
 <Card>
 <CardHeader>
 <CardTitle>{isRTL ? 'حجم الطلبات حسب الشهر' : 'Order Volume by Month'}</CardTitle>
 <CardDescription>Number of purchase orders per month</CardDescription>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <div className="h-96 flex items-center justify-center">
 <p className="text-muted-foreground">Loading chart...</p>
 </div>
 ) : data?.spendingByMonth && data.spendingByMonth.length > 0 ? (
 <ResponsiveContainer width="100%" height={400}>
 <BarChart data={data.spendingByMonth}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="month" />
 <YAxis label={{ value: "Order Count", angle: -90, position: "insideLeft" }} />
 <Tooltip />
 <Legend />
 <Bar dataKey="orderCount" fill="#10b981" name="Order Count" />
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-96 flex items-center justify-center">
 <p className="text-muted-foreground">{isRTL ? 'لا توجد بيانات متاحة' : 'No data available'}</p>
 </div>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Data Table */}
 <Card>
 <CardHeader>
 <CardTitle>{isRTL ? 'تفاصيل الإنفاق الشهري' : 'Monthly Spending Details'}</CardTitle>
 <CardDescription>Breakdown by month</CardDescription>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <p className="text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
 ) : data?.spendingByMonth && data.spendingByMonth.length > 0 ? (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50 border-b">
 <tr>
 <th className="px-4 py-2 text-start">Month</th>
 <th className="px-4 py-2 text-end">{isRTL ? 'إجمالي الإنفاق' : 'Total Spending'}</th>
 <th className="px-4 py-2 text-end">{isRTL ? 'عدد الطلبات' : 'Order Count'}</th>
 <th className="px-4 py-2 text-end">{isRTL ? 'متوسط قيمة الطلب' : 'Avg Order Value'}</th>
 </tr>
 </thead>
 <tbody>
 {data.spendingByMonth.map((item: any, idx: number) => (
 <tr key={idx} className="border-b hover:bg-gray-50">
 <td className="px-4 py-2">{item.month}</td>
 <td className="px-4 py-2 text-end">${item.totalSpending.toLocaleString()}</td>
 <td className="px-4 py-2 text-end">{item.orderCount}</td>
 <td className="px-4 py-2 text-end">
 ${(item.totalSpending / item.orderCount).toLocaleString()}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 ) : (
 <p className="text-muted-foreground">{isRTL ? 'لا توجد بيانات متاحة' : 'No data available'}</p>
 )}
 </CardContent>
 </Card>
 </div>
 );
}
