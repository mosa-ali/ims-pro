import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
 BarChart,
 Bar,
 PieChart,
 Pie,
 Cell,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 Legend,
 ResponsiveContainer,
 LineChart,
 Line,
} from "recharts";
import {
 AlertCircle,
 Calendar,
 Download,
 Filter,
 TrendingUp,
 Clock,
 CheckCircle,
 DollarSign,
} from "lucide-react";
import { useLanguage } from "@/_core/contexts/LanguageContext";

interface PayableData {
 id: number;
 payableId: string;
 vendorName: string;
 amount: number;
 dueDate: Date;
 status: "pending_invoice" | "pending_approval" | "approved" | "paid";
 paidAmount: number;
 currency: string;
}

interface PaymentReconciliationDashboardProps {
 payables: PayableData[];
 onExport?: (format: "pdf" | "excel") => void;
}

export function PaymentReconciliationDashboard({
 payables,
 onExport,
}: PaymentReconciliationDashboardProps) {
 const { language, isRTL} = useLanguage();
 const isArabic = language === "ar";
 const [statusFilter, setStatusFilter] = useState<string>("all");
 const [vendorFilter, setVendorFilter] = useState<string>("");
 const [dateRange, setDateRange] = useState<"all" | "30" | "60" | "90">("all");

 const t = {
 en: {
 title: "Payment Reconciliation Report",
 agingReport: "Payment Aging Report",
 statusBreakdown: "Payment Status Breakdown",
 kpis: "Key Performance Indicators",
 totalOutstanding: "Total Outstanding",
 totalOverdue: "Total Overdue",
 averagePaymentDays: "Average Payment Days",
 paymentPerformance: "Payment Performance",
 current: "Current (0-30 days)",
 days30to60: "30-60 Days",
 days60to90: "60-90 Days",
 days90Plus: "90+ Days",
 pending: "Pending",
 approved: "Approved",
 paid: "Paid",
 overdue: "Overdue",
 filter: "Filter",
 vendor: "Vendor",
 status: "Status",
 dateRange: "Date Range",
 export: "Export",
 exportPDF: "Export to PDF",
 exportExcel: "Export to Excel",
 noData: "No data available",
 daysOutstanding: "Days Outstanding",
 amount: "Amount",
 count: "Count",
 },
 ar: {
 title: "تقرير التسوية المالية",
 agingReport: "تقرير تقادم الدفعات",
 statusBreakdown: "توزيع حالة الدفع",
 kpis: "مؤشرات الأداء الرئيسية",
 totalOutstanding: "إجمالي المستحق",
 totalOverdue: "إجمالي المتأخر",
 averagePaymentDays: "متوسط أيام الدفع",
 paymentPerformance: "أداء الدفع",
 current: "الحالي (0-30 يوم)",
 days30to60: "30-60 يوم",
 days60to90: "60-90 يوم",
 days90Plus: "90+ يوم",
 pending: "قيد الانتظار",
 approved: "موافق عليه",
 paid: "مدفوع",
 overdue: "متأخر",
 filter: "تصفية",
 vendor: "المورد",
 status: "الحالة",
 dateRange: "نطاق التاريخ",
 export: "تصدير",
 exportPDF: "تصدير إلى PDF",
 exportExcel: "تصدير إلى Excel",
 noData: "لا توجد بيانات متاحة",
 daysOutstanding: "أيام المستحق",
 amount: "المبلغ",
 count: "العدد",
 },
 };

 const texts = isArabic ? t.ar : t.en;

 // Calculate aging buckets
 const agingData = useMemo(() => {
 const today = new Date();
 const buckets = {
 current: 0,
 days30to60: 0,
 days60to90: 0,
 days90Plus: 0,
 };

 payables.forEach((p) => {
 if (p.status === "paid") return;

 const daysOutstanding = Math.floor(
 (today.getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24)
 );

 if (daysOutstanding <= 30) buckets.current += p.amount - p.paidAmount;
 else if (daysOutstanding <= 60) buckets.days30to60 += p.amount - p.paidAmount;
 else if (daysOutstanding <= 90) buckets.days60to90 += p.amount - p.paidAmount;
 else buckets.days90Plus += p.amount - p.paidAmount;
 });

 return [
 { name: texts.current, value: buckets.current },
 { name: texts.days30to60, value: buckets.days30to60 },
 { name: texts.days60to90, value: buckets.days60to90 },
 { name: texts.days90Plus, value: buckets.days90Plus },
 ];
 }, [payables, texts]);

 // Calculate status breakdown
 const statusData = useMemo(() => {
 const breakdown: Record<string, number> = {
 pending_invoice: 0,
 pending_approval: 0,
 approved: 0,
 paid: 0,
 };

 payables.forEach((p) => {
 breakdown[p.status] = (breakdown[p.status] || 0) + (p.amount - p.paidAmount);
 });

 return [
 { name: texts.pending, value: breakdown.pending_invoice, fill: "#fbbf24" },
 { name: texts.approved, value: breakdown.approved, fill: "#60a5fa" },
 { name: texts.paid, value: breakdown.paid, fill: "#34d399" },
 ];
 }, [payables, texts]);

 // Calculate KPIs
 const kpis = useMemo(() => {
 const today = new Date();
 let totalOutstanding = 0;
 let totalOverdue = 0;
 let totalDaysOutstanding = 0;
 let overdueCount = 0;

 payables.forEach((p) => {
 const outstanding = p.amount - p.paidAmount;
 if (outstanding > 0) {
 totalOutstanding += outstanding;
 const daysOutstanding = Math.floor(
 (today.getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24)
 );
 totalDaysOutstanding += daysOutstanding;

 if (daysOutstanding > 0) {
 totalOverdue += outstanding;
 overdueCount++;
 }
 }
 });

 const avgDays =
 payables.length > 0 ? Math.round(totalDaysOutstanding / payables.length) : 0;

 return {
 totalOutstanding,
 totalOverdue,
 avgDays,
 overdueCount,
 };
 }, [payables]);

 const COLORS = ["#fbbf24", "#f87171", "#fb7185", "#dc2626"];

 return (
 <div className={`space-y-6 ${isArabic ? "rtl" : "ltr"}`} dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="flex items-center justify-between">
 <h2 className="text-3xl font-bold">{texts.title}</h2>
 <div className="flex gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => onExport?.("pdf")}
 className="flex items-center gap-2"
 >
 <Download className="w-4 h-4" />
 {texts.exportPDF}
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={() => onExport?.("excel")}
 className="flex items-center gap-2"
 >
 <Download className="w-4 h-4" />
 {texts.exportExcel}
 </Button>
 </div>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <Card className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{texts.totalOutstanding}</p>
 <p className="text-2xl font-bold">${kpis.totalOutstanding.toFixed(0)}</p>
 </div>
 <DollarSign className="w-8 h-8 text-blue-500" />
 </div>
 </Card>

 <Card className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{texts.totalOverdue}</p>
 <p className="text-2xl font-bold text-red-600">${kpis.totalOverdue.toFixed(0)}</p>
 </div>
 <AlertCircle className="w-8 h-8 text-red-500" />
 </div>
 </Card>

 <Card className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{texts.averagePaymentDays}</p>
 <p className="text-2xl font-bold">{kpis.avgDays} {texts.daysOutstanding}</p>
 </div>
 <Calendar className="w-8 h-8 text-orange-500" />
 </div>
 </Card>

 <Card className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{texts.overdue}</p>
 <p className="text-2xl font-bold">{kpis.overdueCount}</p>
 </div>
 <Clock className="w-8 h-8 text-yellow-500" />
 </div>
 </Card>
 </div>

 {/* Charts */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Aging Report */}
 <Card className="p-6">
 <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
 <TrendingUp className="w-5 h-5" />
 {texts.agingReport}
 </h3>
 <ResponsiveContainer width="100%" height={300}>
 <BarChart data={agingData}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="name" />
 <YAxis />
 <Tooltip formatter={(value) => `$${value.toFixed(0)}`} />
 <Bar dataKey="value" fill="#3b82f6" />
 </BarChart>
 </ResponsiveContainer>
 </Card>

 {/* Status Breakdown */}
 <Card className="p-6">
 <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
 <CheckCircle className="w-5 h-5" />
 {texts.statusBreakdown}
 </h3>
 <ResponsiveContainer width="100%" height={300}>
 <PieChart>
 <Pie
 data={statusData}
 cx="50%"
 cy="50%"
 labelLine={false}
 label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
 outerRadius={100}
 fill="#8884d8"
 dataKey="value"
 >
 {statusData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.fill} />
 ))}
 </Pie>
 <Tooltip formatter={(value) => `$${value.toFixed(0)}`} />
 </PieChart>
 </ResponsiveContainer>
 </Card>
 </div>

 {/* Filters */}
 <Card className="p-4">
 <div className="flex items-center gap-4 flex-wrap">
 <Filter className="w-5 h-5 text-muted-foreground" />
 <Input
 placeholder={texts.vendor}
 value={vendorFilter}
 onChange={(e) => setVendorFilter(e.target.value)}
 className="max-w-xs"
 />
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="max-w-xs">
 <SelectValue placeholder={texts.status} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All</SelectItem>
 <SelectItem value="pending_invoice">{texts.pending}</SelectItem>
 <SelectItem value="approved">{texts.approved}</SelectItem>
 <SelectItem value="paid">{texts.paid}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </Card>
 </div>
 );
}
