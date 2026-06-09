import { useState, useMemo } from 'react';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
 ArrowLeft, ArrowRight, Download, RefreshCw, Calendar, DollarSign, Building2, 
 TrendingUp, Clock, CheckCircle, AlertTriangle, BarChart3, PieChart,
 FileText, Users, Banknote, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Link } from 'wouter';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// Translations
export default function FinancePaymentReports() {
 const { t } = useTranslation();
 const { currentOrganization, currentOperatingUnit} = useOperatingUnit();
 const { language, isRTL} = useLanguage();

 // State
 const [activeTab, setActiveTab] = useState('aging');
 const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
 const [startDate, setStartDate] = useState(() => {
 const date = new Date();
 date.setMonth(date.getMonth() - 3);
 return date.toISOString().split('T')[0];
 });
 const [endDate, setEndDate] = useState(() => {
 const date = new Date();
 date.setMonth(date.getMonth() + 3);
 return date.toISOString().split('T')[0];
 });
 const [selectedVendor, setSelectedVendor] = useState<string>('all');
 const [selectedProject, setSelectedProject] = useState<string>('all');
 const [selectedBankAccount, setSelectedBankAccount] = useState<string>('all');

 const organizationId = currentOrganization?.id ? Number(String(currentOrganization.id).replace(/\D/g, '')) : 0;
 const operatingUnitId = currentOperatingUnit?.id ? Number(String(currentOperatingUnit.id).replace(/\D/g, '')) : undefined;

 // Queries
 const { data: agingData, isLoading: agingLoading, refetch: refetchAging } = trpc.paymentReports.agingReport.useQuery({
 organizationId,
 operatingUnitId,
 asOfDate: new Date(asOfDate),
 vendorId: selectedVendor !== 'all' ? Number(selectedVendor) : undefined,
 projectId: selectedProject !== 'all' ? Number(selectedProject) : undefined,
 }, {
 enabled: organizationId > 0 && activeTab === 'aging',
 });

 const { data: vendorHistoryData, isLoading: vendorHistoryLoading, refetch: refetchVendorHistory } = trpc.paymentReports.vendorHistory.useQuery({
 organizationId,
 operatingUnitId,
 vendorId: selectedVendor !== 'all' ? Number(selectedVendor) : undefined,
 startDate: new Date(startDate),
 endDate: new Date(endDate),
 }, {
 enabled: organizationId > 0 && activeTab === 'vendor',
 });

 const { data: cashFlowData, isLoading: cashFlowLoading, refetch: refetchCashFlow } = trpc.paymentReports.cashFlowForecast.useQuery({
 organizationId,
 operatingUnitId,
 startDate: new Date(startDate),
 endDate: new Date(endDate),
 bankAccountId: selectedBankAccount !== 'all' ? Number(selectedBankAccount) : undefined,
 }, {
 enabled: organizationId > 0 && activeTab === 'cashflow',
 });

 const { data: statusSummaryData, isLoading: statusLoading, refetch: refetchStatus } = trpc.paymentReports.statusSummary.useQuery({
 organizationId,
 operatingUnitId,
 startDate: new Date(startDate),
 endDate: new Date(endDate),
 }, {
 enabled: organizationId > 0 && activeTab === 'status',
 });

 const { data: vendorsData } = trpc.vendors.getForDropdown.useQuery({
 organizationId,
 operatingUnitId,
 }, {
 enabled: organizationId > 0,
 });

 const { data: projectsData } = trpc.projects.list.useQuery({organizationId}, {
 enabled: organizationId > 0 && operatingUnitId !== undefined,
 });

 const { data: bankAccountsData } = trpc.treasury.bankAccounts.list.useQuery({
 organizationId,
 operatingUnitId,
 }, {
 enabled: organizationId > 0,
 });

 const formatCurrency = (amount: string | number) => {
 const num = typeof amount === 'string' ? parseFloat(amount) : amount;
 return new Intl.NumberFormat('en-US', {
 style: 'currency',
 currency: 'USD',
 }).format(num || 0);
 };

 const formatDate = (date: string | Date) => {
 return new Date(date).toLocaleDateString('en-US', {
 year: 'numeric',
 month: 'short',
 day: 'numeric',
 });
 };

 const handleRefresh = () => {
 switch (activeTab) {
 case 'aging':
 refetchAging();
 break;
 case 'vendor':
 refetchVendorHistory();
 break;
 case 'cashflow':
 refetchCashFlow();
 break;
 case 'status':
 refetchStatus();
 break;
 }
 };

 const handleExport = () => {
 toast('Export feature coming soon');
 };

 return (
 <div className="min-h-screen bg-gray-50">
 <div className="container mx-auto py-6 px-4">
 {/* Header */}
 <div className="mb-6">
 <BackButton href="/organization/finance/payments" label={t.financePaymentReports.backToPayments} />
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold">{t.financePaymentReports.paymentReports}</h1>
 <p className="text-muted-foreground">{t.financePaymentReports.paymentReportsDescription}</p>
 </div>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={handleExport}>
 <Download className="h-4 w-4 me-2" />
 {t.financePaymentReports.exportReport}
 </Button>
 <Button variant="outline" size="icon" onClick={handleRefresh}>
 <RefreshCw className="h-4 w-4" />
 </Button>
 </div>
 </div>
 </div>

 {/* Tabs */}
 <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
 <TabsList className="grid w-full grid-cols-4">
 <TabsTrigger value="aging" className="gap-2">
 <Clock className="h-4 w-4" />
 {t.financePaymentReports.agingReport}
 </TabsTrigger>
 <TabsTrigger value="vendor" className="gap-2">
 <Building2 className="h-4 w-4" />
 {t.financePaymentReports.vendorHistory}
 </TabsTrigger>
 <TabsTrigger value="cashflow" className="gap-2">
 <TrendingUp className="h-4 w-4" />
 {t.financePaymentReports.cashFlowForecast}
 </TabsTrigger>
 <TabsTrigger value="status" className="gap-2">
 <PieChart className="h-4 w-4" />
 {t.financePaymentReports.statusSummary}
 </TabsTrigger>
 </TabsList>

 {/* Aging Report Tab */}
 <TabsContent value="aging" className="space-y-6">
 {/* Filters */}
 <Card>
 <CardContent className="pt-6">
 <div className="flex flex-wrap items-end gap-4">
 <div className="space-y-2">
 <Label>{t.financePaymentReports.asOfDate}</Label>
 <Input
 type="date"
 value={asOfDate}
 onChange={(e) => setAsOfDate(e.target.value)}
 className="w-[180px]"
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financePaymentReports.vendor}</Label>
 <Select value={selectedVendor} onValueChange={setSelectedVendor}>
 <SelectTrigger className="w-[200px]">
 <SelectValue placeholder={t.financePaymentReports.allVendors} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.financePaymentReports.allVendors}</SelectItem>
 {vendorsData?.map((vendor: any) => (
 <SelectItem key={vendor.id} value={vendor.id.toString()}>
 {vendor.vendorCode} - {vendor.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>{t.financePaymentReports.project}</Label>
 <Select value={selectedProject} onValueChange={setSelectedProject}>
 <SelectTrigger className="w-[200px]">
 <SelectValue placeholder={t.financePaymentReports.allProjects} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.financePaymentReports.allProjects}</SelectItem>
 {(projectsData || []).map((project: any) => (
 <SelectItem key={project.id} value={project.id.toString()}>
 {project.projectCode} - {isRTL && project.titleAr ? project.titleAr : project.title}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Aging Summary Cards */}
 {agingLoading ? (
 <div className="flex items-center justify-center py-12">
 <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
 </div>
 ) : agingData ? (
 <>
 <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <p className="text-sm text-muted-foreground">{t.financePaymentReports.current}</p>
 <p className="text-xl font-bold text-green-600">{formatCurrency(agingData.summary.current.total)}</p>
 <p className="text-xs text-muted-foreground">{agingData.summary.current.count} {t.financePaymentReports.payments}</p>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <p className="text-sm text-muted-foreground">{t.financePaymentReports.days1to30}</p>
 <p className="text-xl font-bold text-yellow-600">{formatCurrency(agingData.summary.days1to30.total)}</p>
 <p className="text-xs text-muted-foreground">{agingData.summary.days1to30.count} {t.financePaymentReports.payments}</p>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <p className="text-sm text-muted-foreground">{t.financePaymentReports.days31to60}</p>
 <p className="text-xl font-bold text-orange-600">{formatCurrency(agingData.summary.days31to60.total)}</p>
 <p className="text-xs text-muted-foreground">{agingData.summary.days31to60.count} {t.financePaymentReports.payments}</p>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <p className="text-sm text-muted-foreground">{t.financePaymentReports.days61to90}</p>
 <p className="text-xl font-bold text-red-500">{formatCurrency(agingData.summary.days61to90.total)}</p>
 <p className="text-xs text-muted-foreground">{agingData.summary.days61to90.count} {t.financePaymentReports.payments}</p>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <p className="text-sm text-muted-foreground">{t.financePaymentReports.over90}</p>
 <p className="text-xl font-bold text-red-700">{formatCurrency(agingData.summary.over90.total)}</p>
 <p className="text-xs text-muted-foreground">{agingData.summary.over90.count} {t.financePaymentReports.payments}</p>
 </div>
 </CardContent>
 </Card>
 <Card className="bg-primary/5">
 <CardContent className="pt-6">
 <div className="text-center">
 <p className="text-sm text-muted-foreground font-medium">{t.financePaymentReports.grandTotal}</p>
 <p className="text-xl font-bold">{formatCurrency(agingData.summary.grandTotal.total)}</p>
 <p className="text-xs text-muted-foreground">{agingData.summary.grandTotal.count} {t.financePaymentReports.payments}</p>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Aging Details Table */}
 <Card>
 <CardHeader>
 <CardTitle>{t.financePaymentReports.agingReport}</CardTitle>
 <CardDescription>As of {formatDate(agingData.asOfDate)}</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b">
 <th className="py-3 px-4 text-start font-medium text-muted-foreground">Payment #</th>
 <th className="py-3 px-4 text-start font-medium text-muted-foreground">Payee</th>
 <th className="py-3 px-4 text-start font-medium text-muted-foreground">Date</th>
 <th className="py-3 px-4 text-end font-medium text-muted-foreground">{t.financePaymentReports.amount}</th>
 <th className="py-3 px-4 text-start font-medium text-muted-foreground">Aging</th>
 </tr>
 </thead>
 <tbody>
 {[
 ...agingData.details.current.map(p => ({ ...p, bucket: t.financePaymentReports.current, color: 'text-green-600' })),
 ...agingData.details.days1to30.map(p => ({ ...p, bucket: t.financePaymentReports.days1to30, color: 'text-yellow-600' })),
 ...agingData.details.days31to60.map(p => ({ ...p, bucket: t.financePaymentReports.days31to60, color: 'text-orange-600' })),
 ...agingData.details.days61to90.map(p => ({ ...p, bucket: t.financePaymentReports.days61to90, color: 'text-red-500' })),
 ...agingData.details.over90.map(p => ({ ...p, bucket: t.financePaymentReports.over90, color: 'text-red-700' })),
 ].map((payment: any) => (
 <tr key={payment.id} className="border-b hover:bg-muted/50">
 <td className="py-3 px-4 font-mono text-sm">{payment.paymentNumber}</td>
 <td className="py-3 px-4">{payment.payeeName}</td>
 <td className="py-3 px-4">{formatDate(payment.paymentDate)}</td>
 <td className="py-3 px-4 font-medium text-end">
 {formatCurrency(payment.amount)}
 </td>
 <td className={`py-3 px-4 ${payment.color}`}>{payment.bucket}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>
 </>
 ) : (
 <Card>
 <CardContent className="py-12 text-center text-muted-foreground">
 {t.financePaymentReports.noData}
 </CardContent>
 </Card>
 )}
 </TabsContent>

 {/* Vendor History Tab */}
 <TabsContent value="vendor" className="space-y-6">
 {/* Filters */}
 <Card>
 <CardContent className="pt-6">
 <div className="flex flex-wrap items-end gap-4">
 <div className="space-y-2">
 <Label>{t.financePaymentReports.startDate}</Label>
 <Input
 type="date"
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 className="w-[180px]"
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financePaymentReports.endDate}</Label>
 <Input
 type="date"
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 className="w-[180px]"
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financePaymentReports.vendor}</Label>
 <Select value={selectedVendor} onValueChange={setSelectedVendor}>
 <SelectTrigger className="w-[200px]">
 <SelectValue placeholder={t.financePaymentReports.allVendors} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.financePaymentReports.allVendors}</SelectItem>
 {vendorsData?.map((vendor: any) => (
 <SelectItem key={vendor.id} value={vendor.id.toString()}>
 {vendor.vendorCode} - {vendor.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 </CardContent>
 </Card>

 {vendorHistoryLoading ? (
 <div className="flex items-center justify-center py-12">
 <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
 </div>
 ) : vendorHistoryData?.vendors?.length ? (
 <>
 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">Total Vendors</p>
 <p className="text-2xl font-bold">{vendorHistoryData.summary.totalVendors}</p>
 </div>
 <Users className="h-8 w-8 text-muted-foreground" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{t.financePaymentReports.totalPayments}</p>
 <p className="text-2xl font-bold">{vendorHistoryData.summary.totalPayments}</p>
 </div>
 <FileText className="h-8 w-8 text-muted-foreground" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{t.financePaymentReports.paidAmount}</p>
 <p className="text-2xl font-bold text-green-600">{formatCurrency(vendorHistoryData.summary.totalPaid)}</p>
 </div>
 <CheckCircle className="h-8 w-8 text-green-500" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{t.financePaymentReports.pendingAmount}</p>
 <p className="text-2xl font-bold text-yellow-600">{formatCurrency(vendorHistoryData.summary.totalPending)}</p>
 </div>
 <Clock className="h-8 w-8 text-yellow-500" />
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Vendor List */}
 <Card>
 <CardHeader>
 <CardTitle>{t.financePaymentReports.vendorHistory}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-4">
 {vendorHistoryData.vendors.map((vendor: any) => (
 <Card key={vendor.vendorId} className="border">
 <CardContent className="pt-6">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h3 className="font-semibold">{vendor.vendorName}</h3>
 {vendor.vendorNameAr && (
 <p className="text-sm text-muted-foreground" dir="rtl">{vendor.vendorNameAr}</p>
 )}
 </div>
 <div className="text-end">
 <p className="text-lg font-bold">{formatCurrency(vendor.totalAmount)}</p>
 <p className="text-xs text-muted-foreground">{vendor.totalPayments} {t.financePaymentReports.payments}</p>
 </div>
 </div>
 <div className="grid grid-cols-3 gap-4 text-sm">
 <div>
 <p className="text-muted-foreground">{t.financePaymentReports.paidAmount}</p>
 <p className="font-medium text-green-600">{formatCurrency(vendor.paidAmount)}</p>
 </div>
 <div>
 <p className="text-muted-foreground">{t.financePaymentReports.pendingAmount}</p>
 <p className="font-medium text-yellow-600">{formatCurrency(vendor.pendingAmount)}</p>
 </div>
 <div>
 <p className="text-muted-foreground">{t.financePaymentReports.totalPayments}</p>
 <p className="font-medium">{vendor.totalPayments}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 </CardContent>
 </Card>
 </>
 ) : (
 <Card>
 <CardContent className="py-12 text-center text-muted-foreground">
 {t.financePaymentReports.noVendorPayments}
 </CardContent>
 </Card>
 )}
 </TabsContent>

 {/* Cash Flow Forecast Tab */}
 <TabsContent value="cashflow" className="space-y-6">
 {/* Filters */}
 <Card>
 <CardContent className="pt-6">
 <div className="flex flex-wrap items-end gap-4">
 <div className="space-y-2">
 <Label>{t.financePaymentReports.startDate}</Label>
 <Input
 type="date"
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 className="w-[180px]"
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financePaymentReports.endDate}</Label>
 <Input
 type="date"
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 className="w-[180px]"
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financePaymentReports.bankAccount}</Label>
 <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
 <SelectTrigger className="w-[200px]">
 <SelectValue placeholder={t.financePaymentReports.allBankAccounts} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.financePaymentReports.allBankAccounts}</SelectItem>
 {bankAccountsData?.bankAccounts?.map((account: any) => (
 <SelectItem key={account.id} value={account.id.toString()}>
 {account.accountName}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 </CardContent>
 </Card>

 {cashFlowLoading ? (
 <div className="flex items-center justify-center py-12">
 <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
 </div>
 ) : cashFlowData ? (
 <>
 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{t.financePaymentReports.totalOutflows}</p>
 <p className="text-2xl font-bold text-red-600">{formatCurrency(cashFlowData.summary.totalOutflows)}</p>
 </div>
 <ArrowDownRight className="h-8 w-8 text-red-500" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{t.financePaymentReports.totalPayments}</p>
 <p className="text-2xl font-bold">{cashFlowData.summary.totalPayments}</p>
 </div>
 <FileText className="h-8 w-8 text-muted-foreground" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{t.financePaymentReports.averageWeekly}</p>
 <p className="text-2xl font-bold">{formatCurrency(cashFlowData.summary.averageWeeklyOutflow)}</p>
 </div>
 <BarChart3 className="h-8 w-8 text-muted-foreground" />
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Monthly Forecast */}
 <Card>
 <CardHeader>
 <CardTitle>{t.financePaymentReports.monthlyForecast}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b">
 <th className="py-3 px-4 text-start font-medium text-muted-foreground">{t.financePaymentReports.month}</th>
 <th className="py-3 px-4 text-end font-medium text-muted-foreground">{t.financePaymentReports.outflows}</th>
 <th className="py-3 px-4 text-end font-medium text-muted-foreground">{t.financePaymentReports.payments}</th>
 </tr>
 </thead>
 <tbody>
 {cashFlowData.monthlyForecast.map((month: any) => (
 <tr key={month.month} className="border-b hover:bg-muted/50">
 <td className="py-3 px-4 font-medium">{month.month}</td>
 <td className="py-3 px-4 font-medium text-red-600 text-end">
 {formatCurrency(month.outflows)}
 </td>
 <td className="py-3 px-4 text-end">
 {month.paymentCount}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>

 {/* Weekly Forecast */}
 <Card>
 <CardHeader>
 <CardTitle>{t.financePaymentReports.weeklyForecast}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b">
 <th className="py-3 px-4 text-start font-medium text-muted-foreground">{t.financePaymentReports.week}</th>
 <th className="py-3 px-4 text-end font-medium text-muted-foreground">{t.financePaymentReports.outflows}</th>
 <th className="py-3 px-4 text-end font-medium text-muted-foreground">{t.financePaymentReports.payments}</th>
 </tr>
 </thead>
 <tbody>
 {cashFlowData.weeklyForecast.slice(0, 12).map((week: any, index: number) => (
 <tr key={index} className="border-b hover:bg-muted/50">
 <td className="py-3 px-4">
 {formatDate(week.weekStart)} - {formatDate(week.weekEnd)}
 </td>
 <td className="py-3 px-4 font-medium text-red-600 text-end">
 {formatCurrency(week.outflows)}
 </td>
 <td className="py-3 px-4 text-end">
 {week.paymentCount}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>
 </>
 ) : (
 <Card>
 <CardContent className="py-12 text-center text-muted-foreground">
 {t.financePaymentReports.noData}
 </CardContent>
 </Card>
 )}
 </TabsContent>

 {/* Status Summary Tab */}
 <TabsContent value="status" className="space-y-6">
 {/* Filters */}
 <Card>
 <CardContent className="pt-6">
 <div className="flex flex-wrap items-end gap-4">
 <div className="space-y-2">
 <Label>{t.financePaymentReports.startDate}</Label>
 <Input
 type="date"
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 className="w-[180px]"
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financePaymentReports.endDate}</Label>
 <Input
 type="date"
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 className="w-[180px]"
 />
 </div>
 </div>
 </CardContent>
 </Card>

 {statusLoading ? (
 <div className="flex items-center justify-center py-12">
 <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
 </div>
 ) : statusSummaryData ? (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {/* By Status */}
 <Card>
 <CardHeader>
 <CardTitle>{t.financePaymentReports.byStatus}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 {statusSummaryData.byStatus.map((item: any) => (
 <div key={item.status} className="flex items-center justify-between">
 <span className="text-sm">
 {t[item.status as keyof typeof t] || item.status}
 </span>
 <div className="text-end">
 <span className="font-medium">{formatCurrency(item.totalAmount)}</span>
 <span className="text-xs text-muted-foreground ms-2">({item.count})</span>
 </div>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>

 {/* By Method */}
 <Card>
 <CardHeader>
 <CardTitle>{t.financePaymentReports.byMethod}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 {statusSummaryData.byMethod.map((item: any) => (
 <div key={item.paymentMethod} className="flex items-center justify-between">
 <span className="text-sm">
 {t[item.paymentMethod as keyof typeof t] || item.paymentMethod}
 </span>
 <div className="text-end">
 <span className="font-medium">{formatCurrency(item.totalAmount)}</span>
 <span className="text-xs text-muted-foreground ms-2">({item.count})</span>
 </div>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>

 {/* By Type */}
 <Card>
 <CardHeader>
 <CardTitle>{t.financePaymentReports.byType}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 {statusSummaryData.byType.map((item: any) => (
 <div key={item.paymentType} className="flex items-center justify-between">
 <span className="text-sm">
 {t[item.paymentType as keyof typeof t] || item.paymentType}
 </span>
 <div className="text-end">
 <span className="font-medium">{formatCurrency(item.totalAmount)}</span>
 <span className="text-xs text-muted-foreground ms-2">({item.count})</span>
 </div>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 </div>
 ) : (
 <Card>
 <CardContent className="py-12 text-center text-muted-foreground">
 {t.financePaymentReports.noData}
 </CardContent>
 </Card>
 )}
 </TabsContent>
 </Tabs>
 </div>
 </div>
 );
}
