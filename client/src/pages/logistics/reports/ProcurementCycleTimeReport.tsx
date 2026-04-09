/**
 * Procurement Cycle Time Report
 * Analyzes time from PR creation to completion with interactive charts
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useLanguage } from '@/contexts/LanguageContext';
import { BackButton } from "@/components/BackButton";

export default function ProcurementCycleTimeReport() {
  const { language, isRTL} = useLanguage();
 const { currentOrganization } = useOrganization();
 const organizationId = currentOrganization?.id || 1;

 const [dateRange, setDateRange] = useState({
 startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 90 days ago
 endDate: new Date().toISOString().split("T")[0],
 });

 const { data, isLoading, refetch } = trpc.logistics.analytics.getProcurementCycleTime.useQuery({
 organizationId,
 startDate: dateRange.startDate,
 endDate: dateRange.endDate,
 });

 const handleExport = () => {
 // Export to CSV
 if (!data?.cycleData) return;

 const csv = [
 ["PR Number", "Days to Approval", "Status"],
 ...data.cycleData.map((item) => [item.prNumber, item.prToApproval || "-", item.status]),
 ]
 .map((row) => row.join(","))
 .join("\n");

 const blob = new Blob([csv], { type: "text/csv" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `procurement-cycle-time-${Date.now()}.csv`;
 a.click();
 };

 return (
 <div className="container py-8 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <BackButton href="/organization/logistics/reports" iconOnly />
 <div>
 <h1 className="text-3xl font-bold">{isRTL ? 'تقرير وقت دورة المشتريات' : 'Procurement Cycle Time Report'}</h1>
 <p className="text-muted-foreground">Time from PR creation to approval</p>
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
 <p className="text-sm text-muted-foreground">Total PRs</p>
 <p className="text-4xl font-bold">{isLoading ? "-" : data?.totalPRs || 0}</p>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <p className="text-sm text-muted-foreground">Completed PRs</p>
 <p className="text-4xl font-bold">{isLoading ? "-" : data?.completedPRs || 0}</p>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <p className="text-sm text-muted-foreground">Avg. Days to Approval</p>
 <p className="text-4xl font-bold">{isLoading ? "-" : data?.avgPrToApproval || 0}</p>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Chart */}
 <Card>
 <CardHeader>
 <CardTitle>{isRTL ? 'وقت الدورة حسب طلب الشراء' : 'Cycle Time by PR'}</CardTitle>
 <CardDescription>Days from PR creation to approval (Top 50 PRs)</CardDescription>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <div className="h-96 flex items-center justify-center">
 <p className="text-muted-foreground">Loading chart...</p>
 </div>
 ) : data?.cycleData && data.cycleData.length > 0 ? (
 <ResponsiveContainer width="100%" height={400}>
 <BarChart data={data.cycleData}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="prNumber" angle={-45} textAnchor="end" height={100} />
 <YAxis label={{ value: "Days", angle: -90, position: "insideLeft" }} />
 <Tooltip />
 <Legend />
 <Bar dataKey="prToApproval" fill="#3b82f6" name="Days to Approval" />
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-96 flex items-center justify-center">
 <p className="text-muted-foreground">No data available for the selected period</p>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Data Table */}
 <Card>
 <CardHeader>
 <CardTitle>{isRTL ? 'البيانات التفصيلية' : 'Detailed Data'}</CardTitle>
 <CardDescription>All PRs in the selected date range</CardDescription>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <p className="text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
 ) : data?.cycleData && data.cycleData.length > 0 ? (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50 border-b">
 <tr>
 <th className="px-4 py-2 text-start">PR Number</th>
 <th className="px-4 py-2 text-end">Days to Approval</th>
 <th className="px-4 py-2 text-start">{isRTL ? 'الحالة' : 'Status'}</th>
 </tr>
 </thead>
 <tbody>
 {data.cycleData.map((item, idx) => (
 <tr key={idx} className="border-b hover:bg-gray-50">
 <td className="px-4 py-2">{item.prNumber}</td>
 <td className="px-4 py-2 text-end">{item.prToApproval || "-"}</td>
 <td className="px-4 py-2">
 <span
 className={`px-2 py-1 rounded text-xs ${ item.status === "approved" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800" }`}
 >
 {item.status}
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
