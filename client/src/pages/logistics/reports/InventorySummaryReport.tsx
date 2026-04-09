/**
 * Inventory Summary Report
 * Analyzes stock levels, valuation, and low stock alerts
 */

import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Download, AlertTriangle, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useLanguage } from '@/contexts/LanguageContext';
import { BackButton } from "@/components/BackButton";

const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export default function InventorySummaryReport() {
  const { language, isRTL} = useLanguage();
 const { currentOrganization } = useOrganization();
 const organizationId = currentOrganization?.id || 1;

 const { data, isLoading } = trpc.logistics.analytics.getInventorySummary.useQuery({
 organizationId,
 });

 const handleExport = () => {
 if (!data?.items) return;

 const csv = [
 ["Item Name", "SKU", "Category", "Quantity", "Unit Cost", "Total Value", "Reorder Level", "Status"],
 ...data.items.map((item: any) => [
 item.itemName,
 item.sku || "-",
 item.category || "-",
 item.quantity,
 item.unitCost,
 (item.quantity * parseFloat(item.unitCost || "0")).toFixed(2),
 item.reorderLevel || "-",
 item.quantity === 0 ? "Out of Stock" : item.quantity <= (item.reorderLevel || 0) ? "Low Stock" : "In Stock",
 ]),
 ]
 .map((row) => row.join(","))
 .join("\n");

 const blob = new Blob([csv], { type: "text/csv" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `inventory-summary-${Date.now()}.csv`;
 a.click();
 };

 // Prepare stock status data for pie chart
 const stockStatusData = data
 ? [
 { name: "In Stock", value: data.totalItems - data.lowStockItems - data.outOfStockItems },
 { name: "Low Stock", value: data.lowStockItems },
 { name: "Out of Stock", value: data.outOfStockItems },
 ]
 : [];

 return (
 <div className="container py-8 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <BackButton href="/organization/logistics/reports" iconOnly />
 <div>
 <h1 className="text-3xl font-bold">{isRTL ? 'تقرير ملخص المخزون' : 'Inventory Summary Report'}</h1>
 <p className="text-muted-foreground">Current stock levels and valuation</p>
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
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{isRTL ? 'إجمالي العناصر' : 'Total Items'}</p>
 <p className="text-4xl font-bold">{isLoading ? "-" : data?.totalItems || 0}</p>
 </div>
 <Package className="h-8 w-8 text-blue-500" />
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{isRTL ? 'عناصر المخزون المنخفض' : 'Low Stock Items'}</p>
 <p className="text-4xl font-bold text-yellow-600">
 {isLoading ? "-" : data?.lowStockItems || 0}
 </p>
 </div>
 <AlertTriangle className="h-8 w-8 text-yellow-500" />
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">Out of Stock</p>
 <p className="text-4xl font-bold text-red-600">
 {isLoading ? "-" : data?.outOfStockItems || 0}
 </p>
 </div>
 <AlertTriangle className="h-8 w-8 text-red-500" />
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <p className="text-sm text-muted-foreground">{isRTL ? 'إجمالي قيمة المخزون' : 'Total Inventory Value'}</p>
 <p className="text-4xl font-bold">
 {isLoading ? "-" : `$${(data?.totalValue || 0).toLocaleString()}`}
 </p>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Charts */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Stock Status Distribution */}
 <Card>
 <CardHeader>
 <CardTitle>{isRTL ? 'توزيع حالة المخزون' : 'Stock Status Distribution'}</CardTitle>
 <CardDescription>Items by stock status</CardDescription>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <div className="h-96 flex items-center justify-center">
 <p className="text-muted-foreground">Loading chart...</p>
 </div>
 ) : stockStatusData.length > 0 ? (
 <ResponsiveContainer width="100%" height={400}>
 <PieChart>
 <Pie
 data={stockStatusData}
 cx="50%"
 cy="50%"
 labelLine={false}
 label={(entry) => `${entry.name}: ${entry.value}`}
 outerRadius={120}
 fill="#8884d8"
 dataKey="value"
 >
 {stockStatusData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
 ))}
 </Pie>
 <Tooltip />
 </PieChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-96 flex items-center justify-center">
 <p className="text-muted-foreground">No inventory data</p>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Top Items by Value */}
 <Card>
 <CardHeader>
 <CardTitle>Top 10 Items by Value</CardTitle>
 <CardDescription>Highest value inventory items</CardDescription>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <div className="h-96 flex items-center justify-center">
 <p className="text-muted-foreground">Loading chart...</p>
 </div>
 ) : data?.items && data.items.length > 0 ? (
 <ResponsiveContainer width="100%" height={400}>
 <BarChart
 data={data.items
 .map((item: any) => ({
 name: item.itemName,
 value: item.quantity * parseFloat(item.unitCost || "0"),
 }))
 .sort((a: any, b: any) => b.value - a.value)
 .slice(0, 10)}
 >
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
 <YAxis label={{ value: "Value ($)", angle: -90, position: "insideLeft" }} />
 <Tooltip />
 <Legend />
 <Bar dataKey="value" fill="#3b82f6" name="Total Value" />
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-96 flex items-center justify-center">
 <p className="text-muted-foreground">No inventory data</p>
 </div>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Low Stock Alert Table */}
 {data?.items && data.items.filter((item: any) => item.quantity <= (item.reorderLevel || 0)).length > 0 && (
 <Card className="border-yellow-200 bg-yellow-50">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <AlertTriangle className="h-5 w-5 text-yellow-600" />
 Low Stock Alerts
 </CardTitle>
 <CardDescription>Items that need reordering</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-yellow-100 border-b">
 <tr>
 <th className="px-4 py-2 text-start">{isRTL ? 'اسم البند' : 'Item Name'}</th>
 <th className="px-4 py-2 text-start">SKU</th>
 <th className="px-4 py-2 text-end">{isRTL ? 'الكمية الحالية' : 'Current Qty'}</th>
 <th className="px-4 py-2 text-end">{isRTL ? 'مستوى إعادة الطلب' : 'Reorder Level'}</th>
 <th className="px-4 py-2 text-end">{isRTL ? 'تكلفة الوحدة' : 'Unit Cost'}</th>
 <th className="px-4 py-2 text-start">{isRTL ? 'الحالة' : 'Status'}</th>
 </tr>
 </thead>
 <tbody>
 {data.items
 .filter((item: any) => item.quantity <= (item.reorderLevel || 0))
 .map((item: any, idx: number) => (
 <tr key={idx} className="border-b hover:bg-yellow-100">
 <td className="px-4 py-2">{item.itemName}</td>
 <td className="px-4 py-2">{item.sku || "-"}</td>
 <td className="px-4 py-2 text-end">{item.quantity}</td>
 <td className="px-4 py-2 text-end">{item.reorderLevel || "-"}</td>
 <td className="px-4 py-2 text-end">${parseFloat(item.unitCost || "0").toFixed(2)}</td>
 <td className="px-4 py-2">
 <span
 className={`px-2 py-1 rounded text-xs ${ item.quantity === 0 ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800" }`}
 >
 {item.quantity === 0 ? "Out of Stock" : "Low Stock"}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Full Inventory Table */}
 <Card>
 <CardHeader>
 <CardTitle>{isRTL ? 'قائمة المخزون الكاملة' : 'Complete Inventory List'}</CardTitle>
 <CardDescription>All items in stock</CardDescription>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <p className="text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
 ) : data?.items && data.items.length > 0 ? (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50 border-b">
 <tr>
 <th className="px-4 py-2 text-start">{isRTL ? 'اسم البند' : 'Item Name'}</th>
 <th className="px-4 py-2 text-start">SKU</th>
 <th className="px-4 py-2 text-start">{isRTL ? 'الفئة' : 'Category'}</th>
 <th className="px-4 py-2 text-end">{isRTL ? 'الكمية' : 'Quantity'}</th>
 <th className="px-4 py-2 text-end">{isRTL ? 'تكلفة الوحدة' : 'Unit Cost'}</th>
 <th className="px-4 py-2 text-end">{isRTL ? 'القيمة الإجمالية' : 'Total Value'}</th>
 <th className="px-4 py-2 text-start">{isRTL ? 'الحالة' : 'Status'}</th>
 </tr>
 </thead>
 <tbody>
 {data.items.map((item: any, idx: number) => (
 <tr key={idx} className="border-b hover:bg-gray-50">
 <td className="px-4 py-2">{item.itemName}</td>
 <td className="px-4 py-2">{item.sku || "-"}</td>
 <td className="px-4 py-2">{item.category || "-"}</td>
 <td className="px-4 py-2 text-end">{item.quantity}</td>
 <td className="px-4 py-2 text-end">${parseFloat(item.unitCost || "0").toFixed(2)}</td>
 <td className="px-4 py-2 text-end">
 ${(item.quantity * parseFloat(item.unitCost || "0")).toFixed(2)}
 </td>
 <td className="px-4 py-2">
 <span
 className={`px-2 py-1 rounded text-xs ${ item.quantity === 0 ? "bg-red-100 text-red-800" : item.quantity <= (item.reorderLevel || 0) ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800" }`}
 >
 {item.quantity === 0
 ? "Out of Stock"
 : item.quantity <= (item.reorderLevel || 0)
 ? "Low Stock"
 : "In Stock"}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 ) : (
 <p className="text-muted-foreground">No inventory data</p>
 )}
 </CardContent>
 </Card>
 </div>
 );
}
