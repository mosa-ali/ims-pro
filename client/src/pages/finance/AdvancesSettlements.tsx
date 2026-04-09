/**
 * Advances & Settlements Module
 * 
 * Full implementation with:
 * - Staff advance requests list with filters
 * - Add/Edit advance modal
 * - Approval workflow (Submit, Approve, Reject)
 * - Settlement/Liquidation tracking
 * - Excel import/export
 * - RTL/LTR support
 */
import { useState, useMemo } from"react";
import { useLanguage } from"@/contexts/LanguageContext";
import { useOrganization } from"@/contexts/OrganizationContext";
import { useNavigate } from"@/lib/router-compat";
import { trpc } from"@/lib/trpc";
import { Button } from"@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Badge } from"@/components/ui/badge";
import { Textarea } from"@/components/ui/textarea";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from"@/components/ui/dialog";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from"@/components/ui/select";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from"@/components/ui/table";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from"@/components/ui/dropdown-menu";
import {
 ArrowLeft,
 ArrowRight,
 Plus,
 Search,
 Filter,
 Download,
 Upload,
 MoreHorizontal,
 Edit,
 Trash2,
 CheckCircle,
 XCircle,
 Send,
 FileText,
 DollarSign,
 Clock,
 AlertCircle,
 RefreshCw,
 Layers,
 Eye,
} from"lucide-react";
import { toast } from"sonner";
import ExcelJS from"exceljs";
import { VersionHistoryModal } from '@/components/finance/VersionHistoryModal';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// Types
interface Advance {
 id: number;
 advanceNumber: string;
 employeeName: string;
 employeeNameAr?: string;
 department?: string;
 advanceType: string;
 purpose: string;
 purposeAr?: string;
 requestedAmount: string;
 approvedAmount?: string;
 settledAmount?: string;
 outstandingBalance?: string;
 currency: string;
 requestDate: Date;
 expectedSettlementDate?: Date;
 actualSettlementDate?: Date;
 status: string;
 notes?: string;
}

interface Settlement {
 id: number;
 settlementNumber: string;
 settlementDate: Date;
 settledAmount: string;
 currency: string;
 receiptNumber?: string;
 description?: string;
 status: string;
}

export default function AdvancesSettlements() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const { currentOrganization } = useOrganization();
 const navigate = useNavigate();
 const organizationId = currentOrganization?.id || 1;

 // State
 const [searchTerm, setSearchTerm] = useState("");
 const [statusFilter, setStatusFilter] = useState<string>("all");
 const [typeFilter, setTypeFilter] = useState<string>("all");
 const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
 const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
 const [isSettlementDialogOpen, setIsSettlementDialogOpen] = useState(false);
 const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
 const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
 const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
 const [selectedAdvance, setSelectedAdvance] = useState<Advance | null>(null);
 const [importFile, setImportFile] = useState<File | null>(null);
 const [importPreview, setImportPreview] = useState<any[]>([]);
 const [allowDuplicates, setAllowDuplicates] = useState(false);
 const [showVersionHistory, setShowVersionHistory] = useState(false);
 const [versionHistoryAdvanceId, setVersionHistoryAdvanceId] = useState<number | null>(null);

 // Form state
 const [formData, setFormData] = useState({
 employeeName:"",
 employeeNameAr:"",
 department:"",
 advanceType:"TRAVEL" as const,
 purpose:"",
 purposeAr:"",
 requestedAmount:"",
 currency:"USD",
 requestDate: new Date().toISOString().split("T")[0],
 expectedSettlementDate:"",
 notes:"",
 });

 const [approveAmount, setApproveAmount] = useState("");
 const [rejectReason, setRejectReason] = useState("");

 const [settlementData, setSettlementData] = useState({
 settlementDate: new Date().toISOString().split("T")[0],
 settledAmount:"",
 receiptNumber:"",
 description:"",
 descriptionAr:"",
 expenseCategory:"",
 refundAmount:"",
 });

 // Translations
 const labels = {
 title: t.financeModule.advancesSettlements,
 subtitle: t.financeModule.advancesSubtitle,
 backToFinance: t.financeModule.backToFinance,
 newAdvance: t.financeModule.newAdvanceRequest,
 search: t.financeModule.searchAdvances,
 filter: t.financeModule.filter,
 export: t.financeModule.export,
 import: t.financeModule.import,
 allStatuses: t.financeModule.allStatuses,
 allTypes: t.financeModule.allTypes,
 
 // Table headers
 advanceNo: t.financeModule.advance,
 employee: t.financeModule.employee,
 type: t.financeModule.type,
 amount: t.financeModule.amount,
 approved: t.financeModule.approved,
 settled: t.financeModule.settled,
 outstanding: t.financeModule.outstanding,
 status: t.financeModule.status,
 date: t.financeModule.date,
 actions: t.financeModule.actions,
 
 // Status labels
 draft: t.financeModule.draft,
 pending: t.financeModule.pending,
 approvedStatus: t.financeModule.approved1,
 rejected: t.financeModule.rejected,
 partiallySettled: t.financeModule.partiallySettled,
 fullySettled: t.financeModule.fullySettled,
 cancelled: t.financeModule.cancelled,
 
 // Type labels
 travel: t.financeModule.travel,
 project: t.financeModule.project,
 operational: t.financeModule.operational,
 salary: t.financeModule.salary,
 other: t.financeModule.other,
 
 // Actions
 edit: t.financeModule.edit,
 delete: t.financeModule.delete,
 submit: t.financeModule.submitForApproval,
 approve: t.financeModule.approve,
 reject: t.financeModule.reject,
 cancel: t.financeModule.cancel,
 addSettlement: t.financeModule.addSettlement,
 viewDetails: t.financeModule.viewDetails,
 versionHistory: t.financeModule.versionHistory,
 
 // Form labels
 employeeName: t.financeModule.employeeName,
 department: t.financeModule.department,
 advanceType: t.financeModule.advanceType,
 purpose: t.financeModule.purpose,
 purposeAr: t.financeModule.purposeArabic,
 requestedAmount: t.financeModule.requestedAmount,
 currency: t.financeModule.currency,
 requestDate: t.financeModule.requestDate,
 expectedSettlementDate: t.financeModule.expectedSettlementDate,
 notes: t.financeModule.notes,
 
 // Dialog titles
 addAdvanceTitle: t.financeModule.newAdvanceRequest,
 editAdvanceTitle: t.financeModule.editAdvanceRequest,
 approveTitle: t.financeModule.approveAdvance,
 rejectTitle: t.financeModule.rejectAdvance,
 settlementTitle: t.financeModule.addSettlement,
 importTitle: t.financeModule.importAdvances,
 
 // Messages
 createSuccess: t.financeModule.advanceRequestCreatedSuccessfully,
 updateSuccess: t.financeModule.advanceRequestUpdatedSuccessfully,
 deleteSuccess: t.financeModule.advanceRequestDeletedSuccessfully,
 submitSuccess: t.financeModule.advanceSubmittedForApproval,
 approveSuccess: t.financeModule.advanceApprovedSuccessfully,
 rejectSuccess: t.financeModule.advanceRejected,
 settlementSuccess: t.financeModule.settlementAddedSuccessfully,
 noData: t.financeModule.noAdvancesFound,
 
 // Statistics
 totalAdvances: t.financeModule.totalAdvances,
 pendingApproval: t.financeModule.pendingApproval,
 totalOutstanding: t.financeModule.totalOutstanding,
 settledThisMonth: t.financeModule.settledThisMonth,
 
 // Buttons
 save: t.financeModule.save,
 close: t.financeModule.close,
 confirmApprove: t.financeModule.confirmApproval,
 confirmReject: t.financeModule.confirmRejection,
 approvedAmountLabel: t.financeModule.approvedAmount,
 rejectionReason: t.financeModule.rejectionReason,
 
 // Settlement form
 settlementDate: t.financeModule.settlementDate,
 settledAmountLabel: t.financeModule.settledAmount,
 receiptNumber: t.financeModule.receiptNumber,
 description: t.financeModule.description,
 expenseCategory: t.financeModule.expenseCategory,
 refundAmount: t.financeModule.refundAmount,
 };

 // tRPC queries and mutations
 const { data: advances, isLoading, refetch } = trpc.advances.list.useQuery({
 organizationId,
 status: statusFilter !=="all" ? statusFilter as any : undefined,
 advanceType: typeFilter !=="all" ? typeFilter as any : undefined,
 employeeName: searchTerm || undefined,
 });

 const { data: statistics } = trpc.advances.getStatistics.useQuery({
 organizationId,
 });

 const { data: nextNumber } = trpc.advances.getNextNumber.useQuery({
 organizationId,
 });

 const { data: nextSettlementNumber } = trpc.advances.getNextSettlementNumber.useQuery({
 organizationId,
 });

 // Version history query
 const { data: versionHistoryData, isLoading: isLoadingVersions } = trpc.advances.getVersionHistory.useQuery(
 { id: versionHistoryAdvanceId! },
 { enabled: versionHistoryAdvanceId !== null }
 );

 const createMutation = trpc.advances.create.useMutation({
 onSuccess: () => {
 toast.success(labels.createSuccess);
 setIsAddDialogOpen(false);
 resetForm();
 refetch();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const updateMutation = trpc.advances.update.useMutation({
 onSuccess: () => {
 toast.success(labels.updateSuccess);
 setIsEditDialogOpen(false);
 setSelectedAdvance(null);
 refetch();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const deleteMutation = trpc.advances.delete.useMutation({
 onSuccess: () => {
 toast.success(labels.deleteSuccess);
 refetch();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const submitMutation = trpc.advances.submit.useMutation({
 onSuccess: () => {
 toast.success(labels.submitSuccess);
 refetch();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const approveMutation = trpc.advances.approve.useMutation({
 onSuccess: () => {
 toast.success(labels.approveSuccess);
 setIsApproveDialogOpen(false);
 setSelectedAdvance(null);
 setApproveAmount("");
 refetch();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const rejectMutation = trpc.advances.reject.useMutation({
 onSuccess: () => {
 toast.success(labels.rejectSuccess);
 setIsRejectDialogOpen(false);
 setSelectedAdvance(null);
 setRejectReason("");
 refetch();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const createSettlementMutation = trpc.advances.createSettlement.useMutation({
 onSuccess: () => {
 toast.success(labels.settlementSuccess);
 setIsSettlementDialogOpen(false);
 setSelectedAdvance(null);
 resetSettlementForm();
 refetch();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const bulkImportMutation = trpc.advances.bulkImport.useMutation({
 onSuccess: (result) => {
 toast.success(`Imported ${result.imported} advances. Skipped: ${result.skipped}`);
 setIsImportDialogOpen(false);
 setImportFile(null);
 setImportPreview([]);
 refetch();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 // Helper functions
 const resetForm = () => {
 setFormData({
 employeeName:"",
 employeeNameAr:"",
 department:"",
 advanceType:"TRAVEL",
 purpose:"",
 purposeAr:"",
 requestedAmount:"",
 currency:"USD",
 requestDate: new Date().toISOString().split("T")[0],
 expectedSettlementDate:"",
 notes:"",
 });
 };

 const resetSettlementForm = () => {
 setSettlementData({
 settlementDate: new Date().toISOString().split("T")[0],
 settledAmount:"",
 receiptNumber:"",
 description:"",
 descriptionAr:"",
 expenseCategory:"",
 refundAmount:"",
 });
 };

 const getStatusBadge = (status: string) => {
 const statusConfig: Record<string, { label: string; variant:"default" |"secondary" |"destructive" |"outline" }> = {
 DRAFT: { label: labels.draft, variant:"secondary" },
 PENDING: { label: labels.pending, variant:"outline" },
 APPROVED: { label: labels.approvedStatus, variant:"default" },
 REJECTED: { label: labels.rejected, variant:"destructive" },
 PARTIALLY_SETTLED: { label: labels.partiallySettled, variant:"outline" },
 FULLY_SETTLED: { label: labels.fullySettled, variant:"default" },
 CANCELLED: { label: labels.cancelled, variant:"secondary" },
 };
 const config = statusConfig[status] || { label: status, variant:"secondary" as const };
 return <Badge variant={config.variant}>{config.label}</Badge>;
 };

 const getTypeLabel = (type: string) => {
 const typeLabels: Record<string, string> = {
 TRAVEL: labels.travel,
 PROJECT: labels.project,
 OPERATIONAL: labels.operational,
 SALARY: labels.salary,
 OTHER: labels.other,
 };
 return typeLabels[type] || type;
 };

 const formatCurrency = (amount: string | number, currency: string) => {
 const num = typeof amount ==="string" ? parseFloat(amount) : amount;
 return new Intl.NumberFormat('en-US', {
 style:"currency",
 currency: currency,
 }).format(num || 0);
 };

 const formatDate = (date: Date | string) => {
 const d = new Date(date);
 return d.toLocaleDateString('en-US');
 };

 // Handlers
 const handleCreate = () => {
 if (!nextNumber) return;
 createMutation.mutate({
 organizationId,
 advanceNumber: nextNumber,
 employeeName: formData.employeeName,
 employeeNameAr: formData.employeeNameAr || undefined,
 department: formData.department || undefined,
 advanceType: formData.advanceType,
 purpose: formData.purpose,
 purposeAr: formData.purposeAr || undefined,
 requestedAmount: parseFloat(formData.requestedAmount),
 currency: formData.currency,
 requestDate: formData.requestDate,
 expectedSettlementDate: formData.expectedSettlementDate || undefined,
 notes: formData.notes || undefined,
 });
 };

 const handleUpdate = () => {
 if (!selectedAdvance) return;
 updateMutation.mutate({
 id: selectedAdvance.id,
 employeeName: formData.employeeName,
 employeeNameAr: formData.employeeNameAr || undefined,
 department: formData.department || undefined,
 advanceType: formData.advanceType,
 purpose: formData.purpose,
 purposeAr: formData.purposeAr || undefined,
 requestedAmount: parseFloat(formData.requestedAmount),
 currency: formData.currency,
 requestDate: formData.requestDate,
 expectedSettlementDate: formData.expectedSettlementDate || undefined,
 notes: formData.notes || undefined,
 });
 };

 const handleEdit = (advance: Advance) => {
 setSelectedAdvance(advance);
 setFormData({
 employeeName: advance.employeeName,
 employeeNameAr: advance.employeeNameAr ||"",
 department: advance.department ||"",
 advanceType: advance.advanceType as any,
 purpose: advance.purpose,
 purposeAr: advance.purposeAr ||"",
 requestedAmount: advance.requestedAmount,
 currency: advance.currency,
 requestDate: new Date(advance.requestDate).toISOString().split("T")[0],
 expectedSettlementDate: advance.expectedSettlementDate 
 ? new Date(advance.expectedSettlementDate).toISOString().split("T")[0] 
 :"",
 notes: advance.notes ||"",
 });
 setIsEditDialogOpen(true);
 };

 const handleDelete = (id: number) => {
 if (confirm(t.financeModule.areYouSureYouWantTo)) {
 deleteMutation.mutate({ id });
 }
 };

 const handleApprove = () => {
 if (!selectedAdvance || !approveAmount) return;
 approveMutation.mutate({
 id: selectedAdvance.id,
 approvedAmount: parseFloat(approveAmount),
 });
 };

 const handleReject = () => {
 if (!selectedAdvance || !rejectReason) return;
 rejectMutation.mutate({
 id: selectedAdvance.id,
 rejectionReason: rejectReason,
 });
 };

 const handleAddSettlement = () => {
 if (!selectedAdvance || !nextSettlementNumber) return;
 createSettlementMutation.mutate({
 organizationId,
 advanceId: selectedAdvance.id,
 settlementNumber: nextSettlementNumber,
 settlementDate: settlementData.settlementDate,
 settledAmount: parseFloat(settlementData.settledAmount),
 currency: selectedAdvance.currency,
 receiptNumber: settlementData.receiptNumber || undefined,
 description: settlementData.description || undefined,
 descriptionAr: settlementData.descriptionAr || undefined,
 expenseCategory: settlementData.expenseCategory || undefined,
 refundAmount: settlementData.refundAmount ? parseFloat(settlementData.refundAmount) : undefined,
 });
 };

 // Export to Excel
 const handleExport = async () => {
 if (!advances || advances.length === 0) {
 toast.error(t.financeModule.noDataToExport);
 return;
 }

 const workbook = new ExcelJS.Workbook();
 const worksheet = workbook.addWorksheet(t.financeModule.advances);

 // Headers
 const headers = [
 t.financeModule.advance,
 t.financeModule.employee,
 t.financeModule.department,
 t.financeModule.type,
 t.financeModule.purpose,
 t.financeModule.requested,
 t.financeModule.approved,
 t.financeModule.settled,
 t.financeModule.outstanding,
 t.financeModule.currency,
 t.financeModule.requestDate,
 t.financeModule.status,
 ];

 worksheet.addRow(headers);

 // Style header row
 const headerRow = worksheet.getRow(1);
 headerRow.font = { bold: true, color: { argb:"FFFFFF" } };
 headerRow.fill = {
 type:"pattern",
 pattern:"solid",
 fgColor: { argb:"4472C4" },
 };

 // Data rows
 advances.forEach((advance: any) => {
 worksheet.addRow([
 advance.advanceNumber,
 language ==="ar" && advance.employeeNameAr ? advance.employeeNameAr : advance.employeeName,
 advance.department ||"",
 getTypeLabel(advance.advanceType),
 language ==="ar" && advance.purposeAr ? advance.purposeAr : advance.purpose,
 parseFloat(advance.requestedAmount || 0),
 parseFloat(advance.approvedAmount || 0),
 parseFloat(advance.settledAmount || 0),
 parseFloat(advance.outstandingBalance || 0),
 advance.currency,
 formatDate(advance.requestDate),
 advance.status,
 ]);
 });

 // Auto-fit columns
 worksheet.columns.forEach((column) => {
 column.width = 15;
 });

 // Download
 const buffer = await workbook.xlsx.writeBuffer();
 const blob = new Blob([buffer], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `advances_${new Date().toISOString().split("T")[0]}.xlsx`;
 a.click();
 URL.revokeObjectURL(url);
 };

 // Import from Excel
 const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 setImportFile(file);

 const workbook = new ExcelJS.Workbook();
 const buffer = await file.arrayBuffer();
 await workbook.xlsx.load(buffer);

 const worksheet = workbook.worksheets[0];
 const preview: any[] = [];

 worksheet.eachRow((row, rowNumber) => {
 if (rowNumber === 1) return; // Skip header
 const values = row.values as any[];
 preview.push({
 advanceNumber: values[1] || `ADV-${Date.now()}-${rowNumber}`,
 employeeName: values[2] ||"",
 department: values[3] ||"",
 advanceType: values[4]?.toUpperCase() ||"OTHER",
 purpose: values[5] ||"",
 requestedAmount: parseFloat(values[6]) || 0,
 currency: values[7] ||"USD",
 requestDate: values[8] || new Date().toISOString().split("T")[0],
 });
 });

 setImportPreview(preview);
 };

 const handleImport = () => {
 if (importPreview.length === 0) return;

 bulkImportMutation.mutate({
 organizationId,
 advances: importPreview.map((item) => ({
 ...item,
 advanceType: item.advanceType as any,
 })),
 allowDuplicates,
 });
 };

 // Download template
 const handleDownloadTemplate = async () => {
 const workbook = new ExcelJS.Workbook();
 const worksheet = workbook.addWorksheet(t.financeModule.advancesTemplate);

 const headers = [
 t.financeModule.advance,
 t.financeModule.employeeName,
 t.financeModule.department,
 t.financeModule.typeTravelprojectoperationalsalaryother,
 t.financeModule.purpose,
 t.financeModule.requestedAmount,
 t.financeModule.currency,
 t.financeModule.requestDateYyyymmdd,
 ];

 worksheet.addRow(headers);

 const headerRow = worksheet.getRow(1);
 headerRow.font = { bold: true, color: { argb:"FFFFFF" } };
 headerRow.fill = {
 type:"pattern",
 pattern:"solid",
 fgColor: { argb:"4472C4" },
 };

 // Sample row
 worksheet.addRow([
"ADV-2026-0001",
"John Smith",
"Finance",
"TRAVEL",
"Business trip to Cairo",
 5000,
"USD",
"2026-02-01",
 ]);

 worksheet.columns.forEach((column) => {
 column.width = 20;
 });

 const buffer = await workbook.xlsx.writeBuffer();
 const blob = new Blob([buffer], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `advances_template.xlsx`;
 a.click();
 URL.revokeObjectURL(url);
 };

 return (
 <div className="container mx-auto py-6">
 <div className="space-y-6">
 {/* Header */}
 <div className="text-start">
 <BackButton onClick={() => navigate("/organization/finance")} label={labels.backToFinance} />
 <h1 className="text-3xl font-bold tracking-tight">{labels.title}</h1>
 <p className="text-muted-foreground mt-2">{labels.subtitle}</p>
 </div>

 {/* Statistics Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{labels.totalAdvances}</p>
 <p className="text-2xl font-bold">{statistics?.total || 0}</p>
 </div>
 <FileText className="w-8 h-8 text-blue-500" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{labels.pendingApproval}</p>
 <p className="text-2xl font-bold">{statistics?.pending || 0}</p>
 </div>
 <Clock className="w-8 h-8 text-yellow-500" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{labels.totalOutstanding}</p>
 <p className="text-2xl font-bold">
 {formatCurrency(statistics?.totalOutstanding || 0,"USD")}
 </p>
 </div>
 <AlertCircle className="w-8 h-8 text-red-500" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{labels.settledThisMonth}</p>
 <p className="text-2xl font-bold">
 {formatCurrency(statistics?.totalSettled || 0,"USD")}
 </p>
 </div>
 <CheckCircle className="w-8 h-8 text-green-500" />
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Toolbar */}
 <div className="flex flex-col md:flex-row gap-4 justify-between">
 <div className="flex flex-1 gap-2">
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute top-2.5 start-3 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={labels.search}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="ps-9"
 />
 </div>
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-[180px]">
 <SelectValue placeholder={labels.allStatuses} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{labels.allStatuses}</SelectItem>
 <SelectItem value="DRAFT">{labels.draft}</SelectItem>
 <SelectItem value="PENDING">{labels.pending}</SelectItem>
 <SelectItem value="APPROVED">{labels.approvedStatus}</SelectItem>
 <SelectItem value="REJECTED">{labels.rejected}</SelectItem>
 <SelectItem value="PARTIALLY_SETTLED">{labels.partiallySettled}</SelectItem>
 <SelectItem value="FULLY_SETTLED">{labels.fullySettled}</SelectItem>
 </SelectContent>
 </Select>
 <Select value={typeFilter} onValueChange={setTypeFilter}>
 <SelectTrigger className="w-[150px]">
 <SelectValue placeholder={labels.allTypes} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{labels.allTypes}</SelectItem>
 <SelectItem value="TRAVEL">{labels.travel}</SelectItem>
 <SelectItem value="PROJECT">{labels.project}</SelectItem>
 <SelectItem value="OPERATIONAL">{labels.operational}</SelectItem>
 <SelectItem value="SALARY">{labels.salary}</SelectItem>
 <SelectItem value="OTHER">{labels.other}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="flex gap-2">
 <Button variant="outline" onClick={handleExport}>
 <Download className="w-4 h-4 me-2" />
 {labels.export}
 </Button>
 <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
 <Upload className="w-4 h-4 me-2" />
 {labels.import}
 </Button>
 <Button onClick={() => setIsAddDialogOpen(true)}>
 <Plus className="w-4 h-4 me-2" />
 {labels.newAdvance}
 </Button>
 </div>
 </div>

 {/* Data Table */}
 <Card>
 <CardContent className="p-0">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{labels.advanceNo}</TableHead>
 <TableHead>{labels.employee}</TableHead>
 <TableHead>{labels.type}</TableHead>
 <TableHead className="text-end">{labels.amount}</TableHead>
 <TableHead className="text-end">{labels.approved}</TableHead>
 <TableHead className="text-end">{labels.outstanding}</TableHead>
 <TableHead>{labels.status}</TableHead>
 <TableHead>{labels.date}</TableHead>
 <TableHead className="text-center">{labels.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={9} className="text-center py-8">
 <RefreshCw className="w-6 h-6 animate-spin mx-auto" />
 </TableCell>
 </TableRow>
 ) : advances && advances.length > 0 ? (
 advances.map((advance: any) => (
 <TableRow key={advance.id}>
 <TableCell className="font-medium">{advance.advanceNumber}</TableCell>
 <TableCell>
 {language ==="ar" && advance.employeeNameAr
 ? advance.employeeNameAr
 : advance.employeeName}
 </TableCell>
 <TableCell>{getTypeLabel(advance.advanceType)}</TableCell>
 <TableCell className="text-end">
 {formatCurrency(advance.requestedAmount, advance.currency)}
 </TableCell>
 <TableCell className="text-end">
 {advance.approvedAmount
 ? formatCurrency(advance.approvedAmount, advance.currency)
 :"-"}
 </TableCell>
 <TableCell className="text-end">
 {advance.outstandingBalance
 ? formatCurrency(advance.outstandingBalance, advance.currency)
 :"-"}
 </TableCell>
 <TableCell>{getStatusBadge(advance.status)}</TableCell>
 <TableCell>{formatDate(advance.requestDate)}</TableCell>
 <TableCell>
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="icon">
 <MoreHorizontal className="w-4 h-4" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align={'end'}>
 <DropdownMenuItem onClick={() => navigate(`/organization/finance/advances/${advance.id}`)}>
 <Eye className="w-4 h-4 me-2" />
 {labels.viewDetails}
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 {advance.status ==="DRAFT" && (
 <>
 <DropdownMenuItem onClick={() => handleEdit(advance)}>
 <Edit className="w-4 h-4 me-2" />
 {labels.edit}
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => submitMutation.mutate({ id: advance.id })}>
 <Send className="w-4 h-4 me-2" />
 {labels.submit}
 </DropdownMenuItem>
 </>
 )}
 {advance.status ==="PENDING" && (
 <>
 <DropdownMenuItem
 onClick={() => {
 setSelectedAdvance(advance);
 setApproveAmount(advance.requestedAmount);
 setIsApproveDialogOpen(true);
 }}
 >
 <CheckCircle className="w-4 h-4 me-2" />
 {labels.approve}
 </DropdownMenuItem>
 <DropdownMenuItem
 onClick={() => {
 setSelectedAdvance(advance);
 setIsRejectDialogOpen(true);
 }}
 >
 <XCircle className="w-4 h-4 me-2" />
 {labels.reject}
 </DropdownMenuItem>
 </>
 )}
 {(advance.status ==="APPROVED" || advance.status ==="PARTIALLY_SETTLED") && (
 <DropdownMenuItem
 onClick={() => {
 setSelectedAdvance(advance);
 setSettlementData({
 ...settlementData,
 settledAmount: advance.outstandingBalance ||"",
 });
 setIsSettlementDialogOpen(true);
 }}
 >
 <DollarSign className="w-4 h-4 me-2" />
 {labels.addSettlement}
 </DropdownMenuItem>
 )}
 <DropdownMenuSeparator />
 <DropdownMenuItem
 onClick={() => {
 setVersionHistoryAdvanceId(advance.id);
 setShowVersionHistory(true);
 }}
 >
 <Layers className="w-4 h-4 me-2" />
 {labels.versionHistory}
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem
 onClick={() => handleDelete(advance.id)}
 className="text-red-600"
 >
 <Trash2 className="w-4 h-4 me-2" />
 {labels.delete}
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </TableCell>
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
 {labels.noData}
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>

 {/* Add/Edit Dialog */}
 <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
 if (!open) {
 setIsAddDialogOpen(false);
 setIsEditDialogOpen(false);
 setSelectedAdvance(null);
 resetForm();
 }
 }}>
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle>
 {isEditDialogOpen ? labels.editAdvanceTitle : labels.addAdvanceTitle}
 </DialogTitle>
 </DialogHeader>
 <div className="grid grid-cols-2 gap-4 py-4">
 <div className="space-y-2">
 <Label>{labels.employeeName} *</Label>
 <Input
 value={formData.employeeName}
 onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.employeeNameAr}</Label>
 <Input
 value={formData.employeeNameAr}
 onChange={(e) => setFormData({ ...formData, employeeNameAr: e.target.value })}
 dir="rtl"
 />
 </div>
 <div className="space-y-2">
 <Label>{labels.department}</Label>
 <Input
 value={formData.department}
 onChange={(e) => setFormData({ ...formData, department: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{labels.advanceType} *</Label>
 <Select
 value={formData.advanceType}
 onValueChange={(value) => setFormData({ ...formData, advanceType: value as any })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="TRAVEL">{labels.travel}</SelectItem>
 <SelectItem value="PROJECT">{labels.project}</SelectItem>
 <SelectItem value="OPERATIONAL">{labels.operational}</SelectItem>
 <SelectItem value="SALARY">{labels.salary}</SelectItem>
 <SelectItem value="OTHER">{labels.other}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="col-span-2 space-y-2">
 <Label>{labels.purpose} *</Label>
 <Textarea
 value={formData.purpose}
 onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
 />
 </div>
 <div className="col-span-2 space-y-2">
 <Label>{labels.purposeAr}</Label>
 <Textarea
 value={formData.purposeAr}
 onChange={(e) => setFormData({ ...formData, purposeAr: e.target.value })}
 dir="rtl"
 />
 </div>
 <div className="space-y-2">
 <Label>{labels.requestedAmount} *</Label>
 <Input
 type="number"
 value={formData.requestedAmount}
 onChange={(e) => setFormData({ ...formData, requestedAmount: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{labels.currency}</Label>
 <Select
 value={formData.currency}
 onValueChange={(value) => setFormData({ ...formData, currency: value })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="USD">USD</SelectItem>
 <SelectItem value="EUR">EUR</SelectItem>
 <SelectItem value="GBP">GBP</SelectItem>
 <SelectItem value="SAR">SAR</SelectItem>
 <SelectItem value="YER">YER</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>{labels.requestDate} *</Label>
 <Input
 type="date"
 value={formData.requestDate}
 onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{labels.expectedSettlementDate}</Label>
 <Input
 type="date"
 value={formData.expectedSettlementDate}
 onChange={(e) => setFormData({ ...formData, expectedSettlementDate: e.target.value })}
 />
 </div>
 <div className="col-span-2 space-y-2">
 <Label>{labels.notes}</Label>
 <Textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => {
 setIsAddDialogOpen(false);
 setIsEditDialogOpen(false);
 resetForm();
 }}>
 {labels.close}
 </Button>
 <Button onClick={isEditDialogOpen ? handleUpdate : handleCreate}>
 {labels.save}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Approve Dialog */}
 <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{labels.approveTitle}</DialogTitle>
 <DialogDescription>
 {selectedAdvance?.advanceNumber} - {selectedAdvance?.employeeName}
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <div className="space-y-2">
 <Label>{labels.approvedAmountLabel} *</Label>
 <Input
 type="number"
 value={approveAmount}
 onChange={(e) => setApproveAmount(e.target.value)}
 />
 <p className="text-sm text-muted-foreground">
 {t.financeModule.requested2}{""}
 {selectedAdvance && formatCurrency(selectedAdvance.requestedAmount, selectedAdvance.currency)}
 </p>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
 {labels.close}
 </Button>
 <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
 {labels.confirmApprove}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Reject Dialog */}
 <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{labels.rejectTitle}</DialogTitle>
 <DialogDescription>
 {selectedAdvance?.advanceNumber} - {selectedAdvance?.employeeName}
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <div className="space-y-2">
 <Label>{labels.rejectionReason} *</Label>
 <Textarea
 value={rejectReason}
 onChange={(e) => setRejectReason(e.target.value)}
 placeholder={t.financeModule.enterReasonForRejection}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
 {labels.close}
 </Button>
 <Button onClick={handleReject} variant="destructive">
 {labels.confirmReject}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Settlement Dialog */}
 <Dialog open={isSettlementDialogOpen} onOpenChange={setIsSettlementDialogOpen}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle>{labels.settlementTitle}</DialogTitle>
 <DialogDescription>
 {selectedAdvance?.advanceNumber} - {t.financeModule.outstanding3}{""}
 {selectedAdvance && formatCurrency(selectedAdvance.outstandingBalance || 0, selectedAdvance.currency)}
 </DialogDescription>
 </DialogHeader>
 <div className="grid grid-cols-2 gap-4 py-4">
 <div className="space-y-2">
 <Label>{labels.settlementDate} *</Label>
 <Input
 type="date"
 value={settlementData.settlementDate}
 onChange={(e) => setSettlementData({ ...settlementData, settlementDate: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{labels.settledAmountLabel} *</Label>
 <Input
 type="number"
 value={settlementData.settledAmount}
 onChange={(e) => setSettlementData({ ...settlementData, settledAmount: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{labels.receiptNumber}</Label>
 <Input
 value={settlementData.receiptNumber}
 onChange={(e) => setSettlementData({ ...settlementData, receiptNumber: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{labels.expenseCategory}</Label>
 <Input
 value={settlementData.expenseCategory}
 onChange={(e) => setSettlementData({ ...settlementData, expenseCategory: e.target.value })}
 />
 </div>
 <div className="col-span-2 space-y-2">
 <Label>{labels.description}</Label>
 <Textarea
 value={settlementData.description}
 onChange={(e) => setSettlementData({ ...settlementData, description: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{labels.refundAmount}</Label>
 <Input
 type="number"
 value={settlementData.refundAmount}
 onChange={(e) => setSettlementData({ ...settlementData, refundAmount: e.target.value })}
 placeholder="0"
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => {
 setIsSettlementDialogOpen(false);
 resetSettlementForm();
 }}>
 {labels.close}
 </Button>
 <Button onClick={handleAddSettlement}>
 {labels.save}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Import Dialog */}
 <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle>{labels.importTitle}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <div className="flex gap-2">
 <Button variant="outline" onClick={handleDownloadTemplate}>
 <Download className="w-4 h-4 me-2" />
 {t.financeModule.downloadTemplate}
 </Button>
 </div>
 <div className="space-y-2">
 <Label>{t.financeModule.selectExcelFile}</Label>
 <Input
 type="file"
 accept=".xlsx,.xls"
 onChange={handleImportFile}
 />
 </div>
 <div className="flex items-center gap-2">
 <input
 type="checkbox"
 id="allowDuplicates"
 checked={allowDuplicates}
 onChange={(e) => setAllowDuplicates(e.target.checked)}
 />
 <Label htmlFor="allowDuplicates">
 {t.financeModule.allowDuplicates}
 </Label>
 </div>
 {importPreview.length > 0 && (
 <div className="border rounded-md p-4 max-h-60 overflow-auto">
 <p className="font-medium mb-2">
 {`Preview (${importPreview.length} rows)`}
 </p>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{labels.advanceNo}</TableHead>
 <TableHead>{labels.employee}</TableHead>
 <TableHead>{labels.type}</TableHead>
 <TableHead>{labels.amount}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {importPreview.slice(0, 5).map((item, idx) => (
 <TableRow key={idx}>
 <TableCell>{item.advanceNumber}</TableCell>
 <TableCell>{item.employeeName}</TableCell>
 <TableCell>{item.advanceType}</TableCell>
 <TableCell>{item.requestedAmount}</TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 {importPreview.length > 5 && (
 <p className="text-sm text-muted-foreground mt-2">
 {`...and ${importPreview.length - 5} more rows`}
 </p>
 )}
 </div>
 )}
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => {
 setIsImportDialogOpen(false);
 setImportFile(null);
 setImportPreview([]);
 }}>
 {labels.close}
 </Button>
 <Button onClick={handleImport} disabled={importPreview.length === 0}>
 {labels.import} ({importPreview.length})
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Version History Modal */}
 <VersionHistoryModal
 open={showVersionHistory}
 onOpenChange={(open) => {
 setShowVersionHistory(open);
 if (!open) setVersionHistoryAdvanceId(null);
 }}
 versions={versionHistoryData || []}
 title={versionHistoryData?.[0]?.advanceNumber || labels.title}
 isLoading={isLoadingVersions}
 language={language as 'en' | 'ar'}
 renderVersionDetails={(version) => (
 <div className="grid grid-cols-2 gap-2 text-sm">
 <div>
 <span className="font-medium">{labels.employee}:</span> {version.employeeName}
 </div>
 <div>
 <span className="font-medium">{labels.type}:</span> {version.advanceType}
 </div>
 <div>
 <span className="font-medium">{labels.requestedAmount}:</span> {version.requestedAmount} {version.currency}
 </div>
 <div>
 <span className="font-medium">{labels.approved}:</span> {version.approvedAmount || '-'} {version.currency}
 </div>
 <div>
 <span className="font-medium">{labels.status}:</span> {version.status}
 </div>
 <div>
 <span className="font-medium">{labels.date}:</span> {new Date(version.requestDate).toLocaleDateString('en-US')}
 </div>
 </div>
 )}
 />
 </div>
 </div>
 );
}
