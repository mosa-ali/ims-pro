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
import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useNavigate } from "@/lib/router-compat";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";

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

  // Form state
  const [formData, setFormData] = useState({
    employeeName: "",
    employeeNameAr: "",
    department: "",
    advanceType: "TRAVEL" as const,
    purpose: "",
    purposeAr: "",
    requestedAmount: "",
    currency: "USD",
    requestDate: new Date().toISOString().split("T")[0],
    expectedSettlementDate: "",
    notes: "",
  });

  const [approveAmount, setApproveAmount] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const [settlementData, setSettlementData] = useState({
    settlementDate: new Date().toISOString().split("T")[0],
    settledAmount: "",
    receiptNumber: "",
    description: "",
    descriptionAr: "",
    expenseCategory: "",
    refundAmount: "",
  });

  // Translations
  const t = {
    title: language === "en" ? "Advances & Settlements" : "السلف والتسويات",
    subtitle: language === "en" 
      ? "Manage staff advance requests and liquidation tracking" 
      : "إدارة طلبات السلف للموظفين وتتبع التسويات",
    backToFinance: language === "en" ? "Back to Finance" : "العودة إلى المالية",
    newAdvance: language === "en" ? "New Advance Request" : "طلب سلفة جديد",
    search: language === "en" ? "Search advances..." : "البحث في السلف...",
    filter: language === "en" ? "Filter" : "تصفية",
    export: language === "en" ? "Export" : "تصدير",
    import: language === "en" ? "Import" : "استيراد",
    allStatuses: language === "en" ? "All Statuses" : "جميع الحالات",
    allTypes: language === "en" ? "All Types" : "جميع الأنواع",
    
    // Table headers
    advanceNo: language === "en" ? "Advance #" : "رقم السلفة",
    employee: language === "en" ? "Employee" : "الموظف",
    type: language === "en" ? "Type" : "النوع",
    amount: language === "en" ? "Amount" : "المبلغ",
    approved: language === "en" ? "Approved" : "المعتمد",
    settled: language === "en" ? "Settled" : "المسوى",
    outstanding: language === "en" ? "Outstanding" : "المتبقي",
    status: language === "en" ? "Status" : "الحالة",
    date: language === "en" ? "Date" : "التاريخ",
    actions: language === "en" ? "Actions" : "الإجراءات",
    
    // Status labels
    draft: language === "en" ? "Draft" : "مسودة",
    pending: language === "en" ? "Pending" : "قيد الانتظار",
    approvedStatus: language === "en" ? "Approved" : "معتمد",
    rejected: language === "en" ? "Rejected" : "مرفوض",
    partiallySettled: language === "en" ? "Partially Settled" : "مسوى جزئياً",
    fullySettled: language === "en" ? "Fully Settled" : "مسوى بالكامل",
    cancelled: language === "en" ? "Cancelled" : "ملغي",
    
    // Type labels
    travel: language === "en" ? "Travel" : "سفر",
    project: language === "en" ? "Project" : "مشروع",
    operational: language === "en" ? "Operational" : "تشغيلي",
    salary: language === "en" ? "Salary" : "راتب",
    other: language === "en" ? "Other" : "أخرى",
    
    // Actions
    edit: language === "en" ? "Edit" : "تعديل",
    delete: language === "en" ? "Delete" : "حذف",
    submit: language === "en" ? "Submit for Approval" : "تقديم للاعتماد",
    approve: language === "en" ? "Approve" : "اعتماد",
    reject: language === "en" ? "Reject" : "رفض",
    cancel: language === "en" ? "Cancel" : "إلغاء",
    addSettlement: language === "en" ? "Add Settlement" : "إضافة تسوية",
    viewDetails: language === "en" ? "View Details" : "عرض التفاصيل",
    
    // Form labels
    employeeName: language === "en" ? "Employee Name" : "اسم الموظف",
    employeeNameAr: language === "en" ? "Employee Name (Arabic)" : "اسم الموظف (عربي)",
    department: language === "en" ? "Department" : "القسم",
    advanceType: language === "en" ? "Advance Type" : "نوع السلفة",
    purpose: language === "en" ? "Purpose" : "الغرض",
    purposeAr: language === "en" ? "Purpose (Arabic)" : "الغرض (عربي)",
    requestedAmount: language === "en" ? "Requested Amount" : "المبلغ المطلوب",
    currency: language === "en" ? "Currency" : "العملة",
    requestDate: language === "en" ? "Request Date" : "تاريخ الطلب",
    expectedSettlementDate: language === "en" ? "Expected Settlement Date" : "تاريخ التسوية المتوقع",
    notes: language === "en" ? "Notes" : "ملاحظات",
    
    // Dialog titles
    addAdvanceTitle: language === "en" ? "New Advance Request" : "طلب سلفة جديد",
    editAdvanceTitle: language === "en" ? "Edit Advance Request" : "تعديل طلب السلفة",
    approveTitle: language === "en" ? "Approve Advance" : "اعتماد السلفة",
    rejectTitle: language === "en" ? "Reject Advance" : "رفض السلفة",
    settlementTitle: language === "en" ? "Add Settlement" : "إضافة تسوية",
    importTitle: language === "en" ? "Import Advances" : "استيراد السلف",
    
    // Messages
    createSuccess: language === "en" ? "Advance request created successfully" : "تم إنشاء طلب السلفة بنجاح",
    updateSuccess: language === "en" ? "Advance request updated successfully" : "تم تحديث طلب السلفة بنجاح",
    deleteSuccess: language === "en" ? "Advance request deleted successfully" : "تم حذف طلب السلفة بنجاح",
    submitSuccess: language === "en" ? "Advance submitted for approval" : "تم تقديم السلفة للاعتماد",
    approveSuccess: language === "en" ? "Advance approved successfully" : "تم اعتماد السلفة بنجاح",
    rejectSuccess: language === "en" ? "Advance rejected" : "تم رفض السلفة",
    settlementSuccess: language === "en" ? "Settlement added successfully" : "تم إضافة التسوية بنجاح",
    noData: language === "en" ? "No advances found" : "لا توجد سلف",
    
    // Statistics
    totalAdvances: language === "en" ? "Total Advances" : "إجمالي السلف",
    pendingApproval: language === "en" ? "Pending Approval" : "قيد الاعتماد",
    totalOutstanding: language === "en" ? "Total Outstanding" : "إجمالي المتبقي",
    settledThisMonth: language === "en" ? "Settled This Month" : "المسوى هذا الشهر",
    
    // Buttons
    save: language === "en" ? "Save" : "حفظ",
    close: language === "en" ? "Close" : "إغلاق",
    confirmApprove: language === "en" ? "Confirm Approval" : "تأكيد الاعتماد",
    confirmReject: language === "en" ? "Confirm Rejection" : "تأكيد الرفض",
    approvedAmountLabel: language === "en" ? "Approved Amount" : "المبلغ المعتمد",
    rejectionReason: language === "en" ? "Rejection Reason" : "سبب الرفض",
    
    // Settlement form
    settlementDate: language === "en" ? "Settlement Date" : "تاريخ التسوية",
    settledAmountLabel: language === "en" ? "Settled Amount" : "المبلغ المسوى",
    receiptNumber: language === "en" ? "Receipt Number" : "رقم الإيصال",
    description: language === "en" ? "Description" : "الوصف",
    expenseCategory: language === "en" ? "Expense Category" : "فئة المصروف",
    refundAmount: language === "en" ? "Refund Amount" : "مبلغ الاسترداد",
  };

  // tRPC queries and mutations
  const { data: advances, isLoading, refetch } = trpc.advances.list.useQuery({
    organizationId,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    advanceType: typeFilter !== "all" ? typeFilter as any : undefined,
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

  const createMutation = trpc.advances.create.useMutation({
    onSuccess: () => {
      toast.success(t.createSuccess);
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
      toast.success(t.updateSuccess);
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
      toast.success(t.deleteSuccess);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const submitMutation = trpc.advances.submit.useMutation({
    onSuccess: () => {
      toast.success(t.submitSuccess);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const approveMutation = trpc.advances.approve.useMutation({
    onSuccess: () => {
      toast.success(t.approveSuccess);
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
      toast.success(t.rejectSuccess);
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
      toast.success(t.settlementSuccess);
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
      employeeName: "",
      employeeNameAr: "",
      department: "",
      advanceType: "TRAVEL",
      purpose: "",
      purposeAr: "",
      requestedAmount: "",
      currency: "USD",
      requestDate: new Date().toISOString().split("T")[0],
      expectedSettlementDate: "",
      notes: "",
    });
  };

  const resetSettlementForm = () => {
    setSettlementData({
      settlementDate: new Date().toISOString().split("T")[0],
      settledAmount: "",
      receiptNumber: "",
      description: "",
      descriptionAr: "",
      expenseCategory: "",
      refundAmount: "",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      DRAFT: { label: t.draft, variant: "secondary" },
      PENDING: { label: t.pending, variant: "outline" },
      APPROVED: { label: t.approvedStatus, variant: "default" },
      REJECTED: { label: t.rejected, variant: "destructive" },
      PARTIALLY_SETTLED: { label: t.partiallySettled, variant: "outline" },
      FULLY_SETTLED: { label: t.fullySettled, variant: "default" },
      CANCELLED: { label: t.cancelled, variant: "secondary" },
    };
    const config = statusConfig[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      TRAVEL: t.travel,
      PROJECT: t.project,
      OPERATIONAL: t.operational,
      SALARY: t.salary,
      OTHER: t.other,
    };
    return typeLabels[type] || type;
  };

  const formatCurrency = (amount: string | number, currency: string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat(language === "ar" ? "ar-SA" : "en-US", {
      style: "currency",
      currency: currency,
    }).format(num || 0);
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString(language === "ar" ? "ar-SA" : "en-US");
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
      employeeNameAr: advance.employeeNameAr || "",
      department: advance.department || "",
      advanceType: advance.advanceType as any,
      purpose: advance.purpose,
      purposeAr: advance.purposeAr || "",
      requestedAmount: advance.requestedAmount,
      currency: advance.currency,
      requestDate: new Date(advance.requestDate).toISOString().split("T")[0],
      expectedSettlementDate: advance.expectedSettlementDate 
        ? new Date(advance.expectedSettlementDate).toISOString().split("T")[0] 
        : "",
      notes: advance.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm(language === "en" ? "Are you sure you want to delete this advance?" : "هل أنت متأكد من حذف هذه السلفة؟")) {
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
      toast.error(language === "en" ? "No data to export" : "لا توجد بيانات للتصدير");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(language === "en" ? "Advances" : "السلف");

    // Headers
    const headers = [
      language === "en" ? "Advance #" : "رقم السلفة",
      language === "en" ? "Employee" : "الموظف",
      language === "en" ? "Department" : "القسم",
      language === "en" ? "Type" : "النوع",
      language === "en" ? "Purpose" : "الغرض",
      language === "en" ? "Requested" : "المطلوب",
      language === "en" ? "Approved" : "المعتمد",
      language === "en" ? "Settled" : "المسوى",
      language === "en" ? "Outstanding" : "المتبقي",
      language === "en" ? "Currency" : "العملة",
      language === "en" ? "Request Date" : "تاريخ الطلب",
      language === "en" ? "Status" : "الحالة",
    ];

    worksheet.addRow(headers);

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "4472C4" },
    };

    // Data rows
    advances.forEach((advance: any) => {
      worksheet.addRow([
        advance.advanceNumber,
        language === "ar" && advance.employeeNameAr ? advance.employeeNameAr : advance.employeeName,
        advance.department || "",
        getTypeLabel(advance.advanceType),
        language === "ar" && advance.purposeAr ? advance.purposeAr : advance.purpose,
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
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
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
        employeeName: values[2] || "",
        department: values[3] || "",
        advanceType: values[4]?.toUpperCase() || "OTHER",
        purpose: values[5] || "",
        requestedAmount: parseFloat(values[6]) || 0,
        currency: values[7] || "USD",
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
    const worksheet = workbook.addWorksheet(language === "en" ? "Advances Template" : "قالب السلف");

    const headers = [
      language === "en" ? "Advance #" : "رقم السلفة",
      language === "en" ? "Employee Name" : "اسم الموظف",
      language === "en" ? "Department" : "القسم",
      language === "en" ? "Type (TRAVEL/PROJECT/OPERATIONAL/SALARY/OTHER)" : "النوع",
      language === "en" ? "Purpose" : "الغرض",
      language === "en" ? "Requested Amount" : "المبلغ المطلوب",
      language === "en" ? "Currency" : "العملة",
      language === "en" ? "Request Date (YYYY-MM-DD)" : "تاريخ الطلب",
    ];

    worksheet.addRow(headers);

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "4472C4" },
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
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `advances_template.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="space-y-6">
        {/* Header */}
        <div className={isRTL ? "text-right" : "text-left"}>
          <Button
            variant="ghost"
            onClick={() => navigate("/organization/finance")}
            className={`mb-2 -ml-2 ${isRTL ? "-mr-2 ml-0" : ""}`}
          >
            {isRTL ? (
              <>
                {t.backToFinance}
                <ArrowRight className="w-4 h-4 mr-2" />
              </>
            ) : (
              <>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t.backToFinance}
              </>
            )}
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-muted-foreground mt-2">{t.subtitle}</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t.totalAdvances}</p>
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
                  <p className="text-sm text-muted-foreground">{t.pendingApproval}</p>
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
                  <p className="text-sm text-muted-foreground">{t.totalOutstanding}</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(statistics?.totalOutstanding || 0, "USD")}
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
                  <p className="text-sm text-muted-foreground">{t.settledThisMonth}</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(statistics?.totalSettled || 0, "USD")}
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
              <Search className={`absolute top-2.5 ${isRTL ? "right-3" : "left-3"} h-4 w-4 text-muted-foreground`} />
              <Input
                placeholder={t.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={isRTL ? "pr-9" : "pl-9"}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t.allStatuses} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allStatuses}</SelectItem>
                <SelectItem value="DRAFT">{t.draft}</SelectItem>
                <SelectItem value="PENDING">{t.pending}</SelectItem>
                <SelectItem value="APPROVED">{t.approvedStatus}</SelectItem>
                <SelectItem value="REJECTED">{t.rejected}</SelectItem>
                <SelectItem value="PARTIALLY_SETTLED">{t.partiallySettled}</SelectItem>
                <SelectItem value="FULLY_SETTLED">{t.fullySettled}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t.allTypes} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allTypes}</SelectItem>
                <SelectItem value="TRAVEL">{t.travel}</SelectItem>
                <SelectItem value="PROJECT">{t.project}</SelectItem>
                <SelectItem value="OPERATIONAL">{t.operational}</SelectItem>
                <SelectItem value="SALARY">{t.salary}</SelectItem>
                <SelectItem value="OTHER">{t.other}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              {t.export}
            </Button>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              {t.import}
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t.newAdvance}
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.advanceNo}</TableHead>
                  <TableHead>{t.employee}</TableHead>
                  <TableHead>{t.type}</TableHead>
                  <TableHead className="text-right">{t.amount}</TableHead>
                  <TableHead className="text-right">{t.approved}</TableHead>
                  <TableHead className="text-right">{t.outstanding}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead>{t.date}</TableHead>
                  <TableHead className="text-center">{t.actions}</TableHead>
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
                        {language === "ar" && advance.employeeNameAr
                          ? advance.employeeNameAr
                          : advance.employeeName}
                      </TableCell>
                      <TableCell>{getTypeLabel(advance.advanceType)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(advance.requestedAmount, advance.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {advance.approvedAmount
                          ? formatCurrency(advance.approvedAmount, advance.currency)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {advance.outstandingBalance
                          ? formatCurrency(advance.outstandingBalance, advance.currency)
                          : "-"}
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
                          <DropdownMenuContent align={isRTL ? "start" : "end"}>
                            {advance.status === "DRAFT" && (
                              <>
                                <DropdownMenuItem onClick={() => handleEdit(advance)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  {t.edit}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => submitMutation.mutate({ id: advance.id })}>
                                  <Send className="w-4 h-4 mr-2" />
                                  {t.submit}
                                </DropdownMenuItem>
                              </>
                            )}
                            {advance.status === "PENDING" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedAdvance(advance);
                                    setApproveAmount(advance.requestedAmount);
                                    setIsApproveDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  {t.approve}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedAdvance(advance);
                                    setIsRejectDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  {t.reject}
                                </DropdownMenuItem>
                              </>
                            )}
                            {(advance.status === "APPROVED" || advance.status === "PARTIALLY_SETTLED") && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedAdvance(advance);
                                  setSettlementData({
                                    ...settlementData,
                                    settledAmount: advance.outstandingBalance || "",
                                  });
                                  setIsSettlementDialogOpen(true);
                                }}
                              >
                                <DollarSign className="w-4 h-4 mr-2" />
                                {t.addSettlement}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(advance.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t.delete}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {t.noData}
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
                {isEditDialogOpen ? t.editAdvanceTitle : t.addAdvanceTitle}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>{t.employeeName} *</Label>
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
                <Label>{t.department}</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.advanceType} *</Label>
                <Select
                  value={formData.advanceType}
                  onValueChange={(value) => setFormData({ ...formData, advanceType: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRAVEL">{t.travel}</SelectItem>
                    <SelectItem value="PROJECT">{t.project}</SelectItem>
                    <SelectItem value="OPERATIONAL">{t.operational}</SelectItem>
                    <SelectItem value="SALARY">{t.salary}</SelectItem>
                    <SelectItem value="OTHER">{t.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{t.purpose} *</Label>
                <Textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{t.purposeAr}</Label>
                <Textarea
                  value={formData.purposeAr}
                  onChange={(e) => setFormData({ ...formData, purposeAr: e.target.value })}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.requestedAmount} *</Label>
                <Input
                  type="number"
                  value={formData.requestedAmount}
                  onChange={(e) => setFormData({ ...formData, requestedAmount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.currency}</Label>
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
                <Label>{t.requestDate} *</Label>
                <Input
                  type="date"
                  value={formData.requestDate}
                  onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.expectedSettlementDate}</Label>
                <Input
                  type="date"
                  value={formData.expectedSettlementDate}
                  onChange={(e) => setFormData({ ...formData, expectedSettlementDate: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{t.notes}</Label>
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
                {t.close}
              </Button>
              <Button onClick={isEditDialogOpen ? handleUpdate : handleCreate}>
                {t.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approve Dialog */}
        <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.approveTitle}</DialogTitle>
              <DialogDescription>
                {selectedAdvance?.advanceNumber} - {selectedAdvance?.employeeName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t.approvedAmountLabel} *</Label>
                <Input
                  type="number"
                  value={approveAmount}
                  onChange={(e) => setApproveAmount(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  {language === "en" ? "Requested:" : "المطلوب:"}{" "}
                  {selectedAdvance && formatCurrency(selectedAdvance.requestedAmount, selectedAdvance.currency)}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                {t.close}
              </Button>
              <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                {t.confirmApprove}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.rejectTitle}</DialogTitle>
              <DialogDescription>
                {selectedAdvance?.advanceNumber} - {selectedAdvance?.employeeName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t.rejectionReason} *</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={language === "en" ? "Enter reason for rejection..." : "أدخل سبب الرفض..."}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                {t.close}
              </Button>
              <Button onClick={handleReject} variant="destructive">
                {t.confirmReject}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Settlement Dialog */}
        <Dialog open={isSettlementDialogOpen} onOpenChange={setIsSettlementDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t.settlementTitle}</DialogTitle>
              <DialogDescription>
                {selectedAdvance?.advanceNumber} - {language === "en" ? "Outstanding:" : "المتبقي:"}{" "}
                {selectedAdvance && formatCurrency(selectedAdvance.outstandingBalance || 0, selectedAdvance.currency)}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>{t.settlementDate} *</Label>
                <Input
                  type="date"
                  value={settlementData.settlementDate}
                  onChange={(e) => setSettlementData({ ...settlementData, settlementDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.settledAmountLabel} *</Label>
                <Input
                  type="number"
                  value={settlementData.settledAmount}
                  onChange={(e) => setSettlementData({ ...settlementData, settledAmount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.receiptNumber}</Label>
                <Input
                  value={settlementData.receiptNumber}
                  onChange={(e) => setSettlementData({ ...settlementData, receiptNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.expenseCategory}</Label>
                <Input
                  value={settlementData.expenseCategory}
                  onChange={(e) => setSettlementData({ ...settlementData, expenseCategory: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{t.description}</Label>
                <Textarea
                  value={settlementData.description}
                  onChange={(e) => setSettlementData({ ...settlementData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.refundAmount}</Label>
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
                {t.close}
              </Button>
              <Button onClick={handleAddSettlement}>
                {t.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t.importTitle}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  {language === "en" ? "Download Template" : "تحميل القالب"}
                </Button>
              </div>
              <div className="space-y-2">
                <Label>{language === "en" ? "Select Excel File" : "اختر ملف Excel"}</Label>
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
                  {language === "en" ? "Allow duplicates" : "السماح بالتكرار"}
                </Label>
              </div>
              {importPreview.length > 0 && (
                <div className="border rounded-md p-4 max-h-60 overflow-auto">
                  <p className="font-medium mb-2">
                    {language === "en" ? `Preview (${importPreview.length} rows)` : `معاينة (${importPreview.length} صف)`}
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.advanceNo}</TableHead>
                        <TableHead>{t.employee}</TableHead>
                        <TableHead>{t.type}</TableHead>
                        <TableHead>{t.amount}</TableHead>
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
                      {language === "en" ? `...and ${importPreview.length - 5} more rows` : `...و ${importPreview.length - 5} صف إضافي`}
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
                {t.close}
              </Button>
              <Button onClick={handleImport} disabled={importPreview.length === 0}>
                {t.import} ({importPreview.length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
