/**
 * Supplier Performance Report
 * Analyzes supplier on-time delivery, quality, and value metrics
 */

import { useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { Download, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useLanguage } from '@/contexts/LanguageContext';
import { BackButton } from "@/components/BackButton";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function SupplierPerformanceReport() {
  const { language, isRTL} = useLanguage();
 const { currentOrganization } = useOrganization();
 const organizationId = currentOrganization?.id || 1;

 const [dateRange, setDateRange] = useState({
 startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
 endDate: new Date().toISOString().split("T")[0],
 });

 const { data, isLoading, refetch } = trpc.logistics.analytics.getSupplierPerformance.useQuery({
 organizationId,
 startDate: dateRange.startDate,
 endDate: dateRange.endDate,
 });

 const handleExport = () => {
 if (!data?.allSuppliers) return;

 const csv = [
 ["Supplier Name", "Total Orders", "Total Value", "Avg Order Value", "Completion Rate %", "On-Time Rate %"],
 ...data.allSuppliers.map((s: any) => [
 s.supplierName,
 s.totalOrders,
 s.totalValue.toFixed(2),
 s.avgOrderValue.toFixed(2),
 s.completionRate.toFixed(1),
 s.onTimeRate.toFixed(1),
 ]),
 ]
 .map((row) => row.join(","))
 .join("\n");

 const blob = new Blob([csv], { type: "text/csv" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `supplier-performance-${Date.now()}.csv`;
 a.click();
 };

 return (
 <div className="container py-8 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <BackButton href="/organization/logistics/reports" iconOnly />
 <div>
 <h1 className="text-3xl font-bold">{isRTL ? 'تقرير أداء الموردين' : 'Supplier Performance Report'}</h1>
 <p className="text-muted-foreground">On-time delivery and quality metrics</p>
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
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <p className="text-sm text-muted-foreground">{isRTL ? 'إجمالي الموردين' : 'Total Suppliers'}</p>
 <p className="text-4xl font-bold">{isLoading ? "-" : data?.totalSuppliers || 0}</p>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <p className="text-sm text-muted-foreground">{isRTL ? 'أعلى طلبات الموردين' : 'Top Supplier Orders'}</p>
 <p className="text-4xl font-bold">
 {isLoading ? "-" : data?.topSuppliers?.[0]?.totalOrders || 0}
 </p>
 <p className="text-xs text-muted-foreground mt-1">
 {data?.topSuppliers?.[0]?.supplierName || "-"}
 </p>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <p className="text-sm text-muted-foreground">{isRTL ? 'متوسط معدل التسليم في الوقت' : 'Avg On-Time Rate'}</p>
 <p className="text-4xl font-bold">
 {isLoading
 ? "-"
 : data?.allSuppliers && data.allSuppliers.length > 0
 ? `${(
 data.allSuppliers.reduce((sum: number, s: any) => sum + s.onTimeRate, 0) /
 data.allSuppliers.length
 ).toFixed(0)}%`
 : "0%"}
 </p>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Charts */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Top Suppliers by Value */}
 <Card>
 <CardHeader>
 <CardTitle>Top 10 Suppliers by Value</CardTitle>
 <CardDescription>Total purchase order value</CardDescription>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <div className="h-96 flex items-center justify-center">
 <p className="text-muted-foreground">Loading chart...</p>
 </div>
 ) : data?.topSuppliers && data.topSuppliers.length > 0 ? (
 <ResponsiveContainer width="100%" height={400}>
 <BarChart data={data.topSuppliers}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="supplierName" angle={-45} textAnchor="end" height={100} />
 <YAxis label={{ value: "Total Value ($)", angle: -90, position: "insideLeft" }} />
 <Tooltip />
 <Legend />
 <Bar dataKey="totalValue" fill="#3b82f6" name="Total Value" />
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-96 flex items-center justify-center">
 <p className="text-muted-foreground">{isRTL ? 'لا توجد بيانات متاحة' : 'No data available'}</p>
 </div>
 )}
 </CardContent>
 </Card>

 {/* On-Time Delivery Rate */}
 <Card>
 <CardHeader>
 <CardTitle>On-Time Delivery Rate</CardTitle>
 <CardDescription>Top 5 suppliers</CardDescription>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <div className="h-96 flex items-center justify-center">
 <p className="text-muted-foreground">Loading chart...</p>
 </div>
 ) : data?.topSuppliers && data.topSuppliers.length > 0 ? (
 <ResponsiveContainer width="100%" height={400}>
 <BarChart data={data.topSuppliers.slice(0, 5)}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="supplierName" angle={-45} textAnchor="end" height={100} />
 <YAxis label={{ value: "On-Time Rate (%)", angle: -90, position: "insideLeft" }} />
 <Tooltip />
 <Legend />
 <Bar dataKey="onTimeRate" fill="#10b981" name="On-Time Rate %" />
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
 <CardTitle>{isRTL ? 'أداء الموردين التفصيلي' : 'Detailed Supplier Performance'}</CardTitle>
 <CardDescription>All suppliers in the selected date range</CardDescription>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <p className="text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
 ) : data?.allSuppliers && data.allSuppliers.length > 0 ? (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50 border-b">
 <tr>
 <th className="px-4 py-2 text-start">{isRTL ? 'اسم المورد' : 'Supplier Name'}</th>
 <th className="px-4 py-2 text-end">{isRTL ? 'إجمالي الطلبات' : 'Total Orders'}</th>
 <th className="px-4 py-2 text-end">{isRTL ? 'القيمة الإجمالية' : 'Total Value'}</th>
 <th className="px-4 py-2 text-end">{isRTL ? 'متوسط قيمة الطلب' : 'Avg Order Value'}</th>
 <th className="px-4 py-2 text-end">{isRTL ? 'معدل الإنجاز' : 'Completion Rate'}</th>
 <th className="px-4 py-2 text-end">On-Time Rate</th>
 </tr>
 </thead>
 <tbody>
 {data.allSuppliers.map((supplier: any, idx: number) => (
 <tr key={idx} className="border-b hover:bg-gray-50">
 <td className="px-4 py-2">{supplier.supplierName}</td>
 <td className="px-4 py-2 text-end">{supplier.totalOrders}</td>
 <td className="px-4 py-2 text-end">${supplier.totalValue.toLocaleString()}</td>
 <td className="px-4 py-2 text-end">${supplier.avgOrderValue.toLocaleString()}</td>
 <td className="px-4 py-2 text-end">
 <span
 className={`px-2 py-1 rounded text-xs ${ supplier.completionRate >= 80 ? "bg-green-100 text-green-800" : supplier.completionRate >= 60 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800" }`}
 >
 {supplier.completionRate.toFixed(1)}%
 </span>
 </td>
 <td className="px-4 py-2 text-end">
 <span
 className={`px-2 py-1 rounded text-xs ${ supplier.onTimeRate >= 80 ? "bg-green-100 text-green-800" : supplier.onTimeRate >= 60 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800" }`}
 >
 {supplier.onTimeRate.toFixed(1)}%
 </span>
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
