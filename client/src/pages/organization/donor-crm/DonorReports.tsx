import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
 Plus,
 Search,
 Edit,
 Trash2,
 Eye,
 Download,
 ArrowLeft, ArrowRight,
 RefreshCw,
 FileText,
 FileSpreadsheet,
 Calendar,
 RotateCcw,
 BarChart3,
 PieChart,
 TrendingUp,
} from "lucide-react";
import { Link } from "wouter";
import * as XLSX from "xlsx";
import { useLanguage } from '@/contexts/LanguageContext';
import { BackButton } from "@/components/BackButton";

// Report types
const REPORT_TYPES = [
 { value: "donor_summary", label: "Donor Summary", labelAr: "ملخص المانح", icon: FileText },
 { value: "funding_history", label: "Funding History", labelAr: "تاريخ التمويل", icon: TrendingUp },
 { value: "pipeline_status", label: "Pipeline Status", labelAr: "حالة خط الأنابيب", icon: BarChart3 },
 { value: "budget_vs_actual", label: "Budget vs Actual", labelAr: "الميزانية مقابل الفعلي", icon: PieChart },
 { value: "grant_performance", label: "Grant Performance", labelAr: "أداء المنحة", icon: BarChart3 },
 { value: "communication_log", label: "Communication Log", labelAr: "سجل الاتصالات", icon: FileText },
 { value: "custom", label: "Custom Report", labelAr: "تقرير مخصص", icon: FileText },
] as const;

const STATUSES = [
 { value: "draft", label: "Draft", labelAr: "مسودة" },
 { value: "final", label: "Final", labelAr: "نهائي" },
 { value: "archived", label: "Archived", labelAr: "مؤرشف" },
] as const;

type ReportType = typeof REPORT_TYPES[number]["value"];
type StatusType = typeof STATUSES[number]["value"];

interface ReportFormData {
 donorId: number | null;
 projectId: number | null;
 grantId: number | null;
 reportType: ReportType;
 title: string;
 titleAr: string;
 periodStart: string;
 periodEnd: string;
 status: StatusType;
}

const initialFormData: ReportFormData = {
 donorId: null,
 projectId: null,
 grantId: null,
 reportType: "donor_summary",
 title: "",
 titleAr: "",
 periodStart: "",
 periodEnd: "",
 status: "draft",
};

export default function DonorReports() {
 const { t, language } = useTranslation();
  const { isRTL } = useLanguage();
const utils = trpc.useUtils();

 // State
 const [page, setPage] = useState(1);
 const [search, setSearch] = useState("");
 const [donorFilter, setDonorFilter] = useState<number | "all">("all");
 const [typeFilter, setTypeFilter] = useState<ReportType | "all">("all");
 const [statusFilter, setStatusFilter] = useState<StatusType | "all">("all");
 const [showDeleted, setShowDeleted] = useState(false);

 // Dialogs
 const [createDialogOpen, setCreateDialogOpen] = useState(false);
 const [editDialogOpen, setEditDialogOpen] = useState(false);
 const [viewDialogOpen, setViewDialogOpen] = useState(false);
 const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
 const [selectedReport, setSelectedReport] = useState<any>(null);
 const [formData, setFormData] = useState<ReportFormData>(initialFormData);

 // Queries
 const { data: reportsData, isLoading, refetch } = trpc.donorReports.list.useQuery({
 page,
 pageSize: 20,
 search: search || undefined,
 donorId: donorFilter !== "all" ? donorFilter : undefined,
 reportType: typeFilter !== "all" ? typeFilter : undefined,
 status: statusFilter !== "all" ? statusFilter : undefined,
 includeDeleted: showDeleted,
 });

 const { data: donorsData } = trpc.donors.list.useQuery({ page: 1, pageSize: 100 });
 const { data: projectsData } = trpc.projects.list.useQuery({ page: 1, pageSize: 100 });
 const { data: grantsData } = trpc.grants.list.useQuery({ page: 1, pageSize: 100 });
 const { data: kpis } = trpc.donorReports.getKPIs.useQuery();

 // Mutations
 const generateMutation = trpc.donorReports.generate.useMutation({
 onSuccess: () => {
 toast.success(t.donorReports.reportGeneratedSuccessfully);
 setCreateDialogOpen(false);
 setFormData(initialFormData);
 utils.donorReports.list.invalidate();
 utils.donorReports.getKPIs.invalidate();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const updateMutation = trpc.donorReports.update.useMutation({
 onSuccess: () => {
 toast.success(t.donorReports.reportUpdatedSuccessfully);
 setEditDialogOpen(false);
 setSelectedReport(null);
 utils.donorReports.list.invalidate();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const deleteMutation = trpc.donorReports.softDelete.useMutation({
 onSuccess: () => {
 toast.success(t.donorReports.reportDeletedSuccessfully);
 setDeleteDialogOpen(false);
 setSelectedReport(null);
 utils.donorReports.list.invalidate();
 utils.donorReports.getKPIs.invalidate();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const restoreMutation = trpc.donorReports.restore.useMutation({
 onSuccess: () => {
 toast.success(t.donorReports.reportRestoredSuccessfully);
 utils.donorReports.list.invalidate();
 utils.donorReports.getKPIs.invalidate();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const generatePDFMutation = trpc.donorReports.generatePDF.useMutation({
 onSuccess: (data) => {
 toast.success(t.donorReports.pdfGeneratedSuccessfully);
 // Open the PDF in a new tab
 window.open(data.pdfUrl, '_blank');
 utils.donorReports.list.invalidate();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 // Export query
 const { refetch: exportData } = trpc.donorReports.exportData.useQuery(
 {
 donorId: donorFilter !== "all" ? donorFilter : undefined,
 reportType: typeFilter !== "all" ? typeFilter : undefined,
 status: statusFilter !== "all" ? statusFilter : undefined,
 },
 { enabled: false }
 );

 // Handlers
 const handleGenerate = () => {
 generateMutation.mutate({
 donorId: formData.donorId,
 projectId: formData.projectId,
 grantId: formData.grantId,
 reportType: formData.reportType,
 title: formData.title,
 titleAr: formData.titleAr || null,
 periodStart: formData.periodStart ? new Date(formData.periodStart) : null,
 periodEnd: formData.periodEnd ? new Date(formData.periodEnd) : null,
 status: formData.status,
 });
 };

 const handleUpdate = () => {
 if (!selectedReport) return;
 updateMutation.mutate({
 id: selectedReport.id,
 donorId: formData.donorId,
 projectId: formData.projectId,
 grantId: formData.grantId,
 reportType: formData.reportType,
 title: formData.title,
 titleAr: formData.titleAr || null,
 periodStart: formData.periodStart ? new Date(formData.periodStart) : null,
 periodEnd: formData.periodEnd ? new Date(formData.periodEnd) : null,
 status: formData.status,
 });
 };

 const handleDelete = () => {
 if (!selectedReport) return;
 deleteMutation.mutate({ id: selectedReport.id });
 };

 const handleRestore = (report: any) => {
 restoreMutation.mutate({ id: report.id });
 };

 const handleExport = async () => {
 const result = await exportData();
 if (result.data?.reports) {
 const exportRows = result.data.reports.map((r) => ({
 Title: r.title,
 Type: r.reportType,
 Donor: r.donorName || "",
 Project: r.projectName || "",
 Grant: r.grantTitle || "",
 "Period Start": r.periodStart ? new Date(r.periodStart).toLocaleDateString() : "",
 "Period End": r.periodEnd ? new Date(r.periodEnd).toLocaleDateString() : "",
 Status: r.status,
 "Generated At": r.generatedAt ? new Date(r.generatedAt).toLocaleDateString() : "",
 }));

 const ws = XLSX.utils.json_to_sheet(exportRows);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, "Reports");
 XLSX.writeFile(wb, `donor_reports_${new Date().toISOString().split("T")[0]}.xlsx`);

 toast.success(t.donorReports.reportsExportedToExcel);
 }
 };

 const openEditDialog = (report: any) => {
 setSelectedReport(report);
 setFormData({
 donorId: report.donorId,
 projectId: report.projectId,
 grantId: report.grantId,
 reportType: report.reportType || "donor_summary",
 title: report.title || "",
 titleAr: report.titleAr || "",
 periodStart: report.periodStart ? new Date(report.periodStart).toISOString().split("T")[0] : "",
 periodEnd: report.periodEnd ? new Date(report.periodEnd).toISOString().split("T")[0] : "",
 status: report.status || "draft",
 });
 setEditDialogOpen(true);
 };

 const openViewDialog = (report: any) => {
 setSelectedReport(report);
 setViewDialogOpen(true);
 };

 const openDeleteDialog = (report: any) => {
 setSelectedReport(report);
 setDeleteDialogOpen(true);
 };

 const getTypeLabel = (type: string) => {
 const found = REPORT_TYPES.find((t) => t.value === type);
 return language === "en" ? found?.label || type : found?.labelAr || type;
 };

 const getStatusLabel = (status: string) => {
 const found = STATUSES.find((s) => s.value === status);
 return language === "en" ? found?.label || status : found?.labelAr || status;
 };

 const getTypeIcon = (type: string) => {
 const found = REPORT_TYPES.find((t) => t.value === type);
 return found?.icon || FileText;
 };

 const reports = reportsData?.reports || [];
 const pagination = reportsData?.pagination;
 const donors = donorsData?.donors || [];
 const projects = projectsData?.projects || [];
 const grants = grantsData?.grants || [];

 return (
 <div className="min-h-screen bg-gray-50">
 {/* Header */}
 <div className="bg-white border-b border-gray-200 px-8 py-6">
 <div className="max-w-7xl mx-auto">
 <div className="flex items-center gap-4 mb-4">
 <Link href="/organization/donor-crm">
 <BackButton label={t.donorReports.back} />
 </Link>
 </div>
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-gray-900">
 {t.donorReports.donorReports}
 </h1>
 <p className="text-gray-600 mt-2">
 {t.donorReports.generateAndManageDonorrelatedReportsAndA}
 </p>
 </div>
 <div className="flex gap-2">
 <Button variant="outline" onClick={handleExport}>
 <Download className="w-4 h-4 me-2" />
 {t.donorReports.export}
 </Button>
 <Button onClick={() => {
 setFormData(initialFormData);
 setCreateDialogOpen(true);
 }}>
 <Plus className="w-4 h-4 me-2" />
 {t.donorReports.generateReport}
 </Button>
 </div>
 </div>
 </div>
 </div>

 {/* KPI Cards */}
 <div className="max-w-7xl mx-auto px-8 py-6">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">
 {t.donorReports.totalReports}
 </p>
 <p className="text-2xl font-bold">{kpis?.totalReports || 0}</p>
 </div>
 <FileText className="w-8 h-8 text-blue-500" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">
 {t.donorReports.reportTypes}
 </p>
 <p className="text-2xl font-bold">{kpis?.byType?.length || 0}</p>
 </div>
 <BarChart3 className="w-8 h-8 text-purple-500" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">
 {t.donorReports.finalReports}
 </p>
 <p className="text-2xl font-bold text-green-600">
 {kpis?.byStatus?.find((s) => s.status === "final")?.count || 0}
 </p>
 </div>
 <FileSpreadsheet className="w-8 h-8 text-green-500" />
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Filters */}
 <Card className="mb-6">
 <CardContent className="pt-6">
 <div className="flex flex-wrap gap-4">
 <div className="flex-1 min-w-[200px]">
 <div className="relative">
 <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
 <Input
 placeholder={t.donorReports.searchReports}
 value={search}
 onChange={(e) => {
 setSearch(e.target.value);
 setPage(1);
 }}
 className="ps-10"
 />
 </div>
 </div>
 <Select
 value={donorFilter === "all" ? "all" : donorFilter.toString()}
 onValueChange={(v) => {
 setDonorFilter(v === "all" ? "all" : parseInt(v));
 setPage(1);
 }}
 >
 <SelectTrigger className="w-[200px]">
 <SelectValue placeholder={t.donorReports.allDonors} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.donorReports.allDonors}</SelectItem>
 {donors.map((donor) => (
 <SelectItem key={donor.id} value={donor.id.toString()}>
 {language === "en" ? donor.name : donor.nameAr || donor.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Select
 value={typeFilter}
 onValueChange={(v) => {
 setTypeFilter(v as ReportType | "all");
 setPage(1);
 }}
 >
 <SelectTrigger className="w-[180px]">
 <SelectValue placeholder={t.donorReports.allTypes} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.donorReports.allTypes}</SelectItem>
 {REPORT_TYPES.map((type) => (
 <SelectItem key={type.value} value={type.value}>
 {language === "en" ? type.label : type.labelAr}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Select
 value={statusFilter}
 onValueChange={(v) => {
 setStatusFilter(v as StatusType | "all");
 setPage(1);
 }}
 >
 <SelectTrigger className="w-[150px]">
 <SelectValue placeholder={t.donorReports.allStatus} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.donorReports.allStatus}</SelectItem>
 {STATUSES.map((status) => (
 <SelectItem key={status.value} value={status.value}>
 {language === "en" ? status.label : status.labelAr}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Button
 variant={showDeleted ? "default" : "outline"}
 onClick={() => setShowDeleted(!showDeleted)}
 >
 <Trash2 className="w-4 h-4 me-2" />
 {t.donorReports.showDeleted}
 </Button>
 <Button variant="outline" onClick={() => refetch()}>
 <RefreshCw className="w-4 h-4" />
 </Button>
 </div>
 </CardContent>
 </Card>

 {/* Table */}
 <Card>
 <CardContent className="p-0">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.donorReports.title}</TableHead>
 <TableHead>{t.donorReports.type}</TableHead>
 <TableHead>{t.donorReports.donorproject}</TableHead>
 <TableHead>{t.donorReports.period}</TableHead>
 <TableHead>{t.donorReports.status}</TableHead>
 <TableHead>{t.donorReports.generated}</TableHead>
 <TableHead className="text-center">{t.donorReports.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8">
 {t.donorReports.loading}
 </TableCell>
 </TableRow>
 ) : reports.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
 {t.donorReports.noReportsFound}
 </TableCell>
 </TableRow>
 ) : (
 reports.map((report) => {
 const TypeIcon = getTypeIcon(report.reportType || "custom");
 return (
 <TableRow key={report.id} className={report.deletedAt ? "opacity-50" : ""}>
 <TableCell>
 <div className="flex items-center gap-2">
 <TypeIcon className="w-4 h-4 text-muted-foreground" />
 <span className="font-medium">
 {language === "en" ? report.title : report.titleAr || report.title}
 </span>
 </div>
 </TableCell>
 <TableCell>
 <Badge variant="outline">{getTypeLabel(report.reportType || "custom")}</Badge>
 </TableCell>
 <TableCell>
 <div className="text-sm">
 {report.donorName && <p>{report.donorName}</p>}
 {report.projectName && (
 <p className="text-muted-foreground">{report.projectName}</p>
 )}
 {report.grantTitle && (
 <p className="text-xs text-muted-foreground">{report.grantTitle}</p>
 )}
 {!report.donorName && !report.projectName && "-"}
 </div>
 </TableCell>
 <TableCell>
 {report.periodStart || report.periodEnd ? (
 <div className="text-sm">
 {report.periodStart && (
 <span>{new Date(report.periodStart).toLocaleDateString()}</span>
 )}
 {report.periodStart && report.periodEnd && " - "}
 {report.periodEnd && (
 <span>{new Date(report.periodEnd).toLocaleDateString()}</span>
 )}
 </div>
 ) : (
 "-"
 )}
 </TableCell>
 <TableCell>
 {report.deletedAt ? (
 <Badge variant="destructive">{t.donorReports.deleted}</Badge>
 ) : report.status === "final" ? (
 <Badge variant="default" className="bg-green-500">{getStatusLabel(report.status)}</Badge>
 ) : report.status === "draft" ? (
 <Badge variant="secondary">{getStatusLabel(report.status)}</Badge>
 ) : (
 <Badge variant="outline">{getStatusLabel(report.status || "draft")}</Badge>
 )}
 </TableCell>
 <TableCell>
 {report.generatedAt
 ? new Date(report.generatedAt).toLocaleDateString()
 : "-"}
 </TableCell>
 <TableCell className="text-end">
 <div className="flex justify-end gap-2">
 <Button variant="ghost" size="sm" onClick={() => openViewDialog(report)}>
 <Eye className="w-4 h-4" />
 </Button>
 {report.deletedAt ? (
 <Button variant="ghost" size="sm" onClick={() => handleRestore(report)}>
 <RotateCcw className="w-4 h-4" />
 </Button>
 ) : (
 <>
 <Button variant="ghost" size="sm" onClick={() => openEditDialog(report)}>
 <Edit className="w-4 h-4" />
 </Button>
 <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(report)}>
 <Trash2 className="w-4 h-4 text-destructive" />
 </Button>
 </>
 )}
 </div>
 </TableCell>
 </TableRow>
 );
 })
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>

 {/* Pagination */}
 {pagination && pagination.totalPages > 1 && (
 <div className="flex justify-center gap-2 mt-4">
 <Button
 variant="outline"
 disabled={page === 1}
 onClick={() => setPage(page - 1)}
 >
 {t.donorReports.previous}
 </Button>
 <span className="flex items-center px-4">
 {`Page ${page} of ${pagination.totalPages}`}
 </span>
 <Button
 variant="outline"
 disabled={page === pagination.totalPages}
 onClick={() => setPage(page + 1)}
 >
 {t.donorReports.next}
 </Button>
 </div>
 )}
 </div>

 {/* Generate Report Dialog */}
 <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{t.donorReports.generateReport}</DialogTitle>
 <DialogDescription>
 {t.donorReports.configureAndGenerateANewDonorReport}
 </DialogDescription>
 </DialogHeader>
 <ReportForm
 formData={formData}
 setFormData={setFormData}
 donors={donors}
 projects={projects}
 grants={grants}
 language={language}
 />
 <DialogFooter>
 <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
 {t.donorReports.cancel}
 </Button>
 <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
 {generateMutation.isPending
 ? (t.donorReports.generating)
 : (t.donorReports.generateReport)}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Edit Dialog */}
 <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{t.donorReports.editReport}</DialogTitle>
 </DialogHeader>
 <ReportForm
 formData={formData}
 setFormData={setFormData}
 donors={donors}
 projects={projects}
 grants={grants}
 language={language}
 />
 <DialogFooter>
 <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
 {t.donorReports.cancel}
 </Button>
 <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
 {updateMutation.isPending
 ? (t.donorReports.saving)
 : (t.donorReports.saveChanges)}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* View Dialog */}
 <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle>{t.donorReports.reportDetails}</DialogTitle>
 </DialogHeader>
 {selectedReport && (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-muted-foreground">{t.donorReports.title}</Label>
 <p className="font-medium">{selectedReport.title}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.donorReports.type}</Label>
 <p className="font-medium">{getTypeLabel(selectedReport.reportType || "custom")}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.donorReports.status}</Label>
 <p className="font-medium">{getStatusLabel(selectedReport.status || "draft")}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.donorReports.generated}</Label>
 <p className="font-medium">
 {selectedReport.generatedAt
 ? new Date(selectedReport.generatedAt).toLocaleDateString()
 : "-"}
 </p>
 </div>
 </div>
 {(selectedReport.donorName || selectedReport.projectName || selectedReport.grantTitle) && (
 <div className="border-t pt-4">
 <h4 className="font-medium mb-2">{t.donorReports.relatedTo}</h4>
 <div className="grid grid-cols-2 gap-4">
 {selectedReport.donorName && (
 <div>
 <Label className="text-muted-foreground">{t.donorReports.donor}</Label>
 <p className="font-medium">{selectedReport.donorName}</p>
 </div>
 )}
 {selectedReport.projectName && (
 <div>
 <Label className="text-muted-foreground">{t.donorReports.project}</Label>
 <p className="font-medium">{selectedReport.projectName}</p>
 </div>
 )}
 {selectedReport.grantTitle && (
 <div>
 <Label className="text-muted-foreground">{t.donorReports.grant}</Label>
 <p className="font-medium">{selectedReport.grantTitle}</p>
 </div>
 )}
 </div>
 </div>
 )}
 {(selectedReport.periodStart || selectedReport.periodEnd) && (
 <div className="border-t pt-4">
 <h4 className="font-medium mb-2">{t.donorReports.reportingPeriod}</h4>
 <div className="flex items-center gap-2">
 <Calendar className="w-4 h-4 text-muted-foreground" />
 <span>
 {selectedReport.periodStart && new Date(selectedReport.periodStart).toLocaleDateString()}
 {selectedReport.periodStart && selectedReport.periodEnd && " - "}
 {selectedReport.periodEnd && new Date(selectedReport.periodEnd).toLocaleDateString()}
 </span>
 </div>
 </div>
 )}
 </div>
 )}
 <DialogFooter className="flex gap-2">
 <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
 {t.donorReports.close}
 </Button>
 <Button
 onClick={() => selectedReport && generatePDFMutation.mutate({ id: selectedReport.id })}
 disabled={generatePDFMutation.isPending}
 >
 <Download className="w-4 h-4 me-2" />
 {generatePDFMutation.isPending
 ? (t.donorReports.generating)
 : (t.donorReports.downloadPdf)}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Delete Confirmation Dialog */}
 <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.donorReports.deleteReport}</DialogTitle>
 <DialogDescription>
 {`Are you sure you want to delete "${selectedReport?.title}"? This action can be undone.`}
 </DialogDescription>
 </DialogHeader>
 <DialogFooter>
 <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
 {t.donorReports.cancel}
 </Button>
 <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
 {deleteMutation.isPending
 ? (t.donorReports.deleting)
 : (t.donorReports.delete)}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}

// Report Form Component
function ReportForm({
 formData,
 setFormData,
 donors,
 projects,
 grants,
 language,
}: {
 formData: ReportFormData;
 setFormData: React.Dispatch<React.SetStateAction<ReportFormData>>;
 donors: any[];
 projects: any[];
 grants: any[];
 language: string;
}) {
 const { t } = useTranslation();
 return (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.donorReports.reportType}</Label>
 <Select
 value={formData.reportType}
 onValueChange={(v) => setFormData({ ...formData, reportType: v as ReportType })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {REPORT_TYPES.map((type) => (
 <SelectItem key={type.value} value={type.value}>
 {language === "en" ? type.label : type.labelAr}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.donorReports.status}</Label>
 <Select
 value={formData.status}
 onValueChange={(v) => setFormData({ ...formData, status: v as StatusType })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {STATUSES.map((status) => (
 <SelectItem key={status.value} value={status.value}>
 {language === "en" ? status.label : status.labelAr}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.donorReports.titleEnglish}</Label>
 <Input
 value={formData.title}
 onChange={(e) => setFormData({ ...formData, title: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.donorReports.titleArabic}</Label>
 <Input
 value={formData.titleAr}
 onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
 dir="rtl"
 />
 </div>
 </div>

 <div className="border-t pt-4">
 <h4 className="font-medium mb-3">{t.donorReports.scopeOptional}</h4>
 <div className="grid grid-cols-3 gap-4">
 <div>
 <Label>{t.donorReports.donor}</Label>
 <Select
 value={formData.donorId?.toString() || "none"}
 onValueChange={(v) => setFormData({ ...formData, donorId: v === "none" ? null : parseInt(v) })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.donorReports.selectDonor} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">{t.donorReports.none}</SelectItem>
 {donors.map((donor) => (
 <SelectItem key={donor.id} value={donor.id.toString()}>
 {language === "en" ? donor.name : donor.nameAr || donor.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.donorReports.project}</Label>
 <Select
 value={formData.projectId?.toString() || "none"}
 onValueChange={(v) => setFormData({ ...formData, projectId: v === "none" ? null : parseInt(v) })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.donorReports.selectProject} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">{t.donorReports.none}</SelectItem>
 {projects.map((project) => (
 <SelectItem key={project.id} value={project.id.toString()}>
 {language === "en" ? project.name : project.nameAr || project.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.donorReports.grant}</Label>
 <Select
 value={formData.grantId?.toString() || "none"}
 onValueChange={(v) => setFormData({ ...formData, grantId: v === "none" ? null : parseInt(v) })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.donorReports.selectGrant} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">{t.donorReports.none}</SelectItem>
 {grants.map((grant) => (
 <SelectItem key={grant.id} value={grant.id.toString()}>
 {language === "en" ? grant.title : grant.titleAr || grant.title}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 </div>

 <div className="border-t pt-4">
 <h4 className="font-medium mb-3">{t.donorReports.reportingPeriodOptional}</h4>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.donorReports.startDate}</Label>
 <Input
 type="date"
 value={formData.periodStart}
 onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.donorReports.endDate}</Label>
 <Input
 type="date"
 value={formData.periodEnd}
 onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
 />
 </div>
 </div>
 </div>
 </div>
 );
}
