/**
 * Purchase Order Aging Report
 * Analyzes open POs grouped by age buckets
 */

import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useLanguage } from '@/contexts/LanguageContext';
import { BackButton } from "@/components/BackButton";

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#dc2626"];

export default function POAgingReport() {
  const { language, isRTL} = useLanguage();
 const { currentOrganization } = useOrganization();
 const organizationId = currentOrganization?.id || 1;

 const { data, isLoading } = trpc.logistics.analytics.getPOAgingReport.useQuery({
 organizationId,
 });

 const handleExport = () => {
 if (!data?.agingData) return;

 const csv = [
 ["PO Number", "PO Date", "Supplier", "Total Amount", "Status", "Age (Days)", "Age Bucket"],
 ...data.agingData.map((po: any) => [
 po.poNumber,
 new Date(po.poDate).toLocaleDateString(),
 po.supplierName || "-",
 po.totalAmount,
 po.status,
 po.ageInDays,
 po.ageBucket,
 ]),
 ]
 .map((row) => row.join(","))
 .join("\n");

 const blob = new Blob([csv], { type: "text/csv" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `po-aging-report-${Date.now()}.csv`;
 a.click();
 };

 return (
 <div className="container py-8 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <BackButton href="/organization/logistics/reports" iconOnly />
 <div>
 <h1 className="text-3xl font-bold">{isRTL ? 'تقرير أعمار أوامر الشراء' : 'Purchase Order Aging Report'}</h1>
 <p className="text-muted-foreground">Open POs grouped by age</p>
 </div>
 </div>

 <Button variant="outline" size="sm" onClick={handleExport}>
 <Download className="h-4 w-4 me-2" />
 Export CSV
 </Button>
 </div>

 {/* Key Metrics */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <p className="text-sm text-muted-foreground">{isRTL ? 'إجمالي أوامر الشراء المفتوحة' : 'Total Open POs'}</p>
 <p className="text-4xl font-bold">{isLoading ? "-" : data?.totalOpenPOs || 0}</p>
 </div>
 </CardContent>
 </Card>

 {data?.ageBucketSummary?.map((bucket: any, idx: number) => (
 <Card key={idx}>
 <CardContent className="pt-6">
 <div className="text-center">
 <p className="text-sm text-muted-foreground">{bucket.bucket}</p>
 <p className="text-4xl font-bold">{bucket.count}</p>
 <p className="text-xs text-muted-foreground mt-1">
 ${bucket.totalValue.toLocaleString()}
 </p>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>

 {/* Charts */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Age Distribution - Bar Chart */}
 <Card>
 <CardHeader>
 <CardTitle>PO Count by Age Bucket</CardTitle>
 <CardDescription>Number of open POs in each age group</CardDescription>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <div className="h-96 flex items-center justify-center">
 <p className="text-muted-foreground">Loading chart...</p>
 </div>
 ) : data?.ageBucketSummary && data.ageBucketSummary.length > 0 ? (
 <ResponsiveContainer width="100%" height={400}>
 <BarChart data={data.ageBucketSummary}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="bucket" />
 <YAxis label={{ value: "Count", angle: -90, position: "insideLeft" }} />
 <Tooltip />
 <Legend />
 <Bar dataKey="count" fill="#3b82f6" name="PO Count" />
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-96 flex items-center justify-center">
 <p className="text-muted-foreground">No open POs</p>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Value Distribution - Pie Chart */}
 <Card>
 <CardHeader>
 <CardTitle>{isRTL ? 'توزيع القيمة حسب العمر' : 'Value Distribution by Age'}</CardTitle>
 <CardDescription>Total value in each age bucket</CardDescription>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <div className="h-96 flex items-center justify-center">
 <p className="text-muted-foreground">Loading chart...</p>
 </div>
 ) : data?.ageBucketSummary && data.ageBucketSummary.length > 0 ? (
 <ResponsiveContainer width="100%" height={400}>
 <PieChart>
 <Pie
 data={data.ageBucketSummary}
 cx="50%"
 cy="50%"
 labelLine={false}
 label={(entry) => `${entry.bucket}: $${entry.totalValue.toLocaleString()}`}
 outerRadius={120}
 fill="#8884d8"
 dataKey="totalValue"
 >
 {data.ageBucketSummary.map((entry: any, index: number) => (
 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
 ))}
 </Pie>
 <Tooltip />
 </PieChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-96 flex items-center justify-center">
 <p className="text-muted-foreground">No open POs</p>
 </div>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Data Table */}
 <Card>
 <CardHeader>
 <CardTitle>Detailed PO Aging Data</CardTitle>
 <CardDescription>All open purchase orders</CardDescription>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <p className="text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
 ) : data?.agingData && data.agingData.length > 0 ? (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50 border-b">
 <tr>
 <th className="px-4 py-2 text-start">PO Number</th>
 <th className="px-4 py-2 text-start">{isRTL ? 'المورد' : 'Supplier'}</th>
 <th className="px-4 py-2 text-start">PO Date</th>
 <th className="px-4 py-2 text-end">{isRTL ? 'المبلغ' : 'Amount'}</th>
 <th className="px-4 py-2 text-end">Age (Days)</th>
 <th className="px-4 py-2 text-start">{isRTL ? 'فئة العمر' : 'Age Bucket'}</th>
 <th className="px-4 py-2 text-start">{isRTL ? 'الحالة' : 'Status'}</th>
 </tr>
 </thead>
 <tbody>
 {data.agingData.map((po: any, idx: number) => (
 <tr key={idx} className="border-b hover:bg-gray-50">
 <td className="px-4 py-2">{po.poNumber}</td>
 <td className="px-4 py-2">{po.supplierName || "-"}</td>
 <td className="px-4 py-2">{new Date(po.poDate).toLocaleDateString()}</td>
 <td className="px-4 py-2 text-end">${parseFloat(po.totalAmount).toLocaleString()}</td>
 <td className="px-4 py-2 text-end">{po.ageInDays}</td>
 <td className="px-4 py-2">
 <span
 className={`px-2 py-1 rounded text-xs ${ po.ageBucket === "0-30 days" ? "bg-green-100 text-green-800" : po.ageBucket === "30-60 days" ? "bg-yellow-100 text-yellow-800" : po.ageBucket === "60-90 days" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800" }`}
 >
 {po.ageBucket}
 </span>
 </td>
 <td className="px-4 py-2">
 <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
 {po.status}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 ) : (
 <p className="text-muted-foreground">No open POs</p>
 )}
 </CardContent>
 </Card>
 </div>
 );
}
