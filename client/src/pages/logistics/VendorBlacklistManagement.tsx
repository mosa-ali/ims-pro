/**
 * Vendor Blacklist Management Page
 *
 * Full lifecycle management for vendor blacklist cases:
 * - KPI summary cards (Total, Pending, Active, Revoked)
 * - Filterable/searchable case table with multi-select checkboxes
 * - Bulk operations: Approve, Reject, Export
 * - Create new blacklist request
 * - View case details with evidence, signatures, audit trail
 * - Audit report export (PDF/Excel)
 *
 * Route: /organization/logistics/evaluation-performance/blacklist
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useNavigate, useLocation } from "@/lib/router-compat";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import {
  ShieldBan,
  Search,
  Plus,
  Eye,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  RefreshCw,
  Loader2,
  Send,
  RotateCcw,
  Calendar,
  Settings,
  FileSpreadsheet,
  FileDown,
  CheckSquare,
  SquareX,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

// ── Reason category labels ──
const REASON_LABELS: Record<string, { en: string; ar: string }> = {
  fraud_falsified_docs: {
    en: "Fraud / Falsified Documents",
    ar: "احتيال / وثائق مزورة",
  },
  corruption_bribery: { en: "Corruption / Bribery", ar: "فساد / رشوة" },
  sanctions_screening_failure: {
    en: "Sanctions Screening Failure",
    ar: "فشل فحص العقوبات",
  },
  repeated_non_performance: {
    en: "Repeated Non-Performance",
    ar: "عدم الأداء المتكرر",
  },
  contract_abandonment: {
    en: "Contract Abandonment",
    ar: "التخلي عن العقد",
  },
  repeated_delivery_failure: {
    en: "Repeated Delivery Failure",
    ar: "فشل التسليم المتكرر",
  },
  refusal_correct_defects: {
    en: "Refusal to Correct Defects",
    ar: "رفض تصحيح العيوب",
  },
  false_declarations: {
    en: "False Declarations",
    ar: "إقرارات كاذبة",
  },
  conflict_of_interest: {
    en: "Conflict of Interest",
    ar: "تضارب المصالح",
  },
  other: { en: "Other", ar: "أخرى" },
};

// ── Status labels and colors ──
const STATUS_CONFIG: Record<
  string,
  { en: string; ar: string; color: string; icon: any }
> = {
  draft: {
    en: "Draft",
    ar: "مسودة",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: FileText,
  },
  submitted: {
    en: "Submitted",
    ar: "مقدم",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Send,
  },
  under_validation: {
    en: "Under Validation",
    ar: "قيد التحقق",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Clock,
  },
  pending_approval: {
    en: "Pending Approval",
    ar: "بانتظار الموافقة",
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    icon: AlertTriangle,
  },
  approved: {
    en: "Approved (Active)",
    ar: "معتمد (نشط)",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: ShieldBan,
  },
  rejected: {
    en: "Rejected",
    ar: "مرفوض",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: XCircle,
  },
  revoked: {
    en: "Revoked",
    ar: "ملغى",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: RotateCcw,
  },
  expired: {
    en: "Expired",
    ar: "منتهي",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    icon: Calendar,
  },
};

function StatusBadge({
  status,
  isRTL,
}: {
  status: string;
  isRTL: boolean;
}) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <Badge variant="outline">{status}</Badge>;
  const Icon = cfg.icon;
  return (
    <Badge className={`${cfg.color} gap-1`}>
      <Icon className="w-3 h-3" />
      {isRTL ? cfg.ar : cfg.en}
    </Badge>
  );
}

// ── Main Component ──
export default function VendorBlacklistManagement() {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [currentLoc] = useLocation();
  const isFinanceContext = currentLoc.includes('/finance/');
  const evalBackPath = isFinanceContext ? '/organization/finance/vendors/evaluation' : '/organization/logistics/evaluation-performance';
  const blacklistBasePath = isFinanceContext ? '/organization/finance/vendors/evaluation/blacklist' : '/organization/logistics/evaluation-performance/blacklist';

  // ── State ──
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkApproveDialog, setShowBulkApproveDialog] = useState(false);
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
  const [bulkApproveStartDate, setBulkApproveStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [bulkApproveExpiryDate, setBulkApproveExpiryDate] = useState("");
  const [bulkApproveComments, setBulkApproveComments] = useState("");
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const BL_ITEMS_PER_PAGE = 50;

  // ── Queries ──
  const summaryQuery = trpc.blacklist.getSummary.useQuery();
  const listQuery = trpc.blacklist.list.useQuery({
    status:
      statusFilter !== "all"
        ? (statusFilter as any)
        : undefined,
    search: searchTerm || undefined,
  });

  const summary = summaryQuery.data ?? {
    total: 0,
    draft: 0,
    submitted: 0,
    underValidation: 0,
    pendingApproval: 0,
    approved: 0,
    rejected: 0,
    revoked: 0,
    expired: 0,
  };

  const cases = listQuery.data?.cases ?? [];

  // Pagination
  const totalPages = Math.max(1, Math.ceil(cases.length / BL_ITEMS_PER_PAGE));
  const paginatedCases = useMemo(() => {
    const start = (currentPage - 1) * BL_ITEMS_PER_PAGE;
    return cases.slice(start, start + BL_ITEMS_PER_PAGE);
  }, [cases, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);
  const totalCases = listQuery.data?.total ?? 0;

  const pendingCount =
    summary.submitted + summary.underValidation + summary.pendingApproval;

  // ── Bulk mutations ──
  const bulkApproveMutation = trpc.blacklist.bulkApprove.useMutation({
    onSuccess: (data) => {
      toast.success(
        isRTL
          ? `تمت الموافقة على ${data.approvedCount} حالة بنجاح`
          : `${data.approvedCount} case(s) approved successfully`
      );
      setSelectedIds(new Set());
      setShowBulkApproveDialog(false);
      setBulkApproveComments("");
      setBulkApproveExpiryDate("");
      utils.blacklist.list.invalidate();
      utils.blacklist.getSummary.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const bulkRejectMutation = trpc.blacklist.bulkReject.useMutation({
    onSuccess: (data) => {
      toast.success(
        isRTL
          ? `تم رفض ${data.rejectedCount} حالة بنجاح`
          : `${data.rejectedCount} case(s) rejected successfully`
      );
      setSelectedIds(new Set());
      setShowBulkRejectDialog(false);
      setBulkRejectReason("");
      utils.blacklist.list.invalidate();
      utils.blacklist.getSummary.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Audit report query (lazy — only fetched when exporting)
  const auditReportQuery = trpc.blacklist.getAuditReportData.useQuery(
    {
      caseIds: selectedIds.size > 0 ? Array.from(selectedIds) : undefined,
      status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    },
    { enabled: false }
  );

  // ── Selection helpers ──
  const allSelected = cases.length > 0 && cases.every((c: any) => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cases.map((c: any) => c.id)));
    }
  }, [allSelected, cases]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Check if selected cases can be bulk-approved (all must be pending_approval)
  const selectedCases = useMemo(
    () => cases.filter((c: any) => selectedIds.has(c.id)),
    [cases, selectedIds]
  );
  const canBulkApprove = selectedCases.length > 0 && selectedCases.every((c: any) => c.status === "pending_approval");
  const canBulkReject = selectedCases.length > 0 && selectedCases.every((c: any) =>
    ["submitted", "under_validation", "pending_approval"].includes(c.status)
  );

  // ── Export functions ──
  const handleExportExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      const result = await auditReportQuery.refetch();
      const data = result.data;
      if (!data || data.cases.length === 0) {
        toast.error(isRTL ? "لا توجد بيانات للتصدير" : "No data to export");
        return;
      }

      // Build CSV content
      const headers = [
        "Case #", "Vendor", "Vendor Code", "Reason Category", "Status",
        "Created Date", "Incident Date", "Blacklist Start", "Expiry Date",
        "Justification", "Audit Trail Events", "Signatures", "Evidence Files"
      ];
      const rows = data.cases.map((c: any) => [
        c.caseNumber || "",
        c.vendor?.name || "",
        c.vendor?.vendorCode || "",
        REASON_LABELS[c.reasonCategory]?.en || c.reasonCategory || "",
        STATUS_CONFIG[c.status]?.en || c.status || "",
        c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-US") : "",
        c.incidentDate || "",
        c.blacklistStartDate || "",
        c.expiryDate || "",
        `"${(c.detailedJustification || "").replace(/"/g, '""')}"`,
        c.auditTrail?.length || 0,
        c.signatures?.length || 0,
        c.evidence?.length || 0,
      ]);

      let csv = "\uFEFF"; // BOM for Excel UTF-8
      csv += headers.join(",") + "\n";
      rows.forEach((row: any[]) => {
        csv += row.map((cell: any) => {
          const str = String(cell);
          if (str.includes(",") || str.includes("\n") || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(",") + "\n";
      });

      // Add audit trail detail sheet
      csv += "\n\n--- AUDIT TRAIL DETAILS ---\n";
      csv += "Case #,Action,User,Previous Status,New Status,Details,Timestamp\n";
      data.cases.forEach((c: any) => {
        (c.auditTrail || []).forEach((log: any) => {
          csv += [
            c.caseNumber || "",
            log.actionType || "",
            log.userName || "",
            log.previousStatus || "",
            log.newStatus || "",
            `"${(log.details || "").replace(/"/g, '""')}"`,
            log.createdAt ? new Date(log.createdAt).toLocaleString("en-US") : "",
          ].join(",") + "\n";
        });
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Blacklist_Audit_Report_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(isRTL ? "تم تصدير التقرير بنجاح" : "Report exported successfully");
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [auditReportQuery, isRTL, selectedIds, statusFilter]);

  const handleExportPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      const result = await auditReportQuery.refetch();
      const data = result.data;
      if (!data || data.cases.length === 0) {
        toast.error(isRTL ? "لا توجد بيانات للتصدير" : "No data to export");
        return;
      }

      // Build HTML for PDF
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Blacklist Audit Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #333; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #dc2626; padding-bottom: 15px; }
    .header h1 { font-size: 20px; color: #dc2626; margin-bottom: 5px; }
    .header p { font-size: 11px; color: #666; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 10px; color: #666; }
    .case-card { border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 15px; page-break-inside: avoid; }
    .case-header { background: #fef2f2; padding: 10px 15px; border-bottom: 1px solid #e5e7eb; border-radius: 6px 6px 0 0; }
    .case-header h3 { font-size: 13px; color: #dc2626; }
    .case-body { padding: 12px 15px; }
    .field-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 10px; }
    .field { }
    .field-label { font-size: 9px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; }
    .field-value { font-size: 11px; font-weight: 500; }
    .section-title { font-size: 11px; font-weight: bold; color: #374151; margin: 10px 0 5px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 8px; }
    th { background: #f9fafb; text-align: left; padding: 5px 8px; border: 1px solid #e5e7eb; font-weight: 600; }
    td { padding: 4px 8px; border: 1px solid #e5e7eb; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; }
    .status-approved { background: #fee2e2; color: #dc2626; }
    .status-rejected { background: #dcfce7; color: #16a34a; }
    .status-pending_approval { background: #ffedd5; color: #ea580c; }
    .status-draft { background: #f1f5f9; color: #475569; }
    .status-submitted { background: #dbeafe; color: #2563eb; }
    .status-under_validation { background: #fef3c7; color: #d97706; }
    .status-revoked { background: #d1fae5; color: #059669; }
    .status-expired { background: #f3f4f6; color: #6b7280; }
    .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #999; }
    .justification { background: #f9fafb; padding: 8px; border-radius: 4px; font-size: 10px; margin-top: 5px; }
    @media print { body { padding: 10px; } .case-card { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Vendor Blacklist Audit Report</h1>
    <p>Compliance Report with Full Audit Trail</p>
  </div>
  <div class="meta">
    <span>Generated: ${new Date().toLocaleString("en-US")}</span>
    <span>Generated by: ${data.generatedBy || "System"}</span>
    <span>Total Cases: ${data.cases.length}</span>
  </div>

  ${data.cases.map((c: any) => `
  <div class="case-card">
    <div class="case-header">
      <h3>${c.caseNumber || "N/A"} — ${c.vendor?.name || "Unknown Vendor"} <span class="status-badge status-${c.status}">${STATUS_CONFIG[c.status]?.en || c.status}</span></h3>
    </div>
    <div class="case-body">
      <div class="field-grid">
        <div class="field"><div class="field-label">Vendor Code</div><div class="field-value">${c.vendor?.vendorCode || "—"}</div></div>
        <div class="field"><div class="field-label">Reason</div><div class="field-value">${REASON_LABELS[c.reasonCategory]?.en || c.reasonCategory || "—"}</div></div>
        <div class="field"><div class="field-label">Created</div><div class="field-value">${c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-US") : "—"}</div></div>
        <div class="field"><div class="field-label">Incident Date</div><div class="field-value">${c.incidentDate || "—"}</div></div>
        <div class="field"><div class="field-label">Blacklist Start</div><div class="field-value">${c.blacklistStartDate || "—"}</div></div>
        <div class="field"><div class="field-label">Expiry Date</div><div class="field-value">${c.expiryDate || "Permanent"}</div></div>
      </div>

      <div class="section-title">Justification</div>
      <div class="justification">${(c.detailedJustification || "—").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>

      ${(c.auditTrail && c.auditTrail.length > 0) ? `
      <div class="section-title">Audit Trail (${c.auditTrail.length} events)</div>
      <table>
        <thead><tr><th>Timestamp</th><th>Action</th><th>User</th><th>From</th><th>To</th><th>Details</th></tr></thead>
        <tbody>
          ${c.auditTrail.map((log: any) => `
          <tr>
            <td>${log.createdAt ? new Date(log.createdAt).toLocaleString("en-US") : "—"}</td>
            <td>${log.actionType || "—"}</td>
            <td>${log.userName || "—"}</td>
            <td>${log.previousStatus || "—"}</td>
            <td>${log.newStatus || "—"}</td>
            <td>${(log.details || "—").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
          </tr>`).join("")}
        </tbody>
      </table>` : ""}

      ${(c.signatures && c.signatures.length > 0) ? `
      <div class="section-title">Digital Signatures (${c.signatures.length})</div>
      <table>
        <thead><tr><th>Signer</th><th>Role</th><th>Date</th><th>Hash</th></tr></thead>
        <tbody>
          ${c.signatures.map((sig: any) => `
          <tr>
            <td>${sig.signerName || "—"}</td>
            <td>${sig.signerRole || "—"}</td>
            <td>${sig.signedAt ? new Date(sig.signedAt).toLocaleString("en-US") : "—"}</td>
            <td style="font-family:monospace;font-size:9px">${sig.signatureHash ? sig.signatureHash.substring(0, 16) + "..." : "—"}</td>
          </tr>`).join("")}
        </tbody>
      </table>` : ""}

      ${(c.evidence && c.evidence.length > 0) ? `
      <div class="section-title">Evidence Files (${c.evidence.length})</div>
      <table>
        <thead><tr><th>File Name</th><th>Type</th><th>Uploaded</th><th>Uploaded By</th></tr></thead>
        <tbody>
          ${c.evidence.map((ev: any) => `
          <tr>
            <td>${ev.fileName || "—"}</td>
            <td>${ev.fileType || "—"}</td>
            <td>${ev.uploadedAt ? new Date(ev.uploadedAt).toLocaleString("en-US") : "—"}</td>
            <td>${ev.uploadedByName || "—"}</td>
          </tr>`).join("")}
        </tbody>
      </table>` : ""}
    </div>
  </div>`).join("")}

  <div class="footer">
    <p>This report was generated automatically by the Integrated Management System (IMS).</p>
    <p>For compliance verification purposes only. All timestamps are in UTC.</p>
  </div>
</body>
</html>`;

      // Open in new window for printing as PDF
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        // Give it a moment to render, then trigger print
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }

      toast.success(isRTL ? "تم إعداد تقرير PDF" : "PDF report prepared — use browser print dialog to save");
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [auditReportQuery, isRTL, selectedIds, statusFilter]);

  // ── KPI Cards ──
  const kpiCards = [
    {
      title: isRTL ? "إجمالي الحالات" : "Total Cases",
      value: summary.total,
      subtitle: isRTL ? "جميع حالات القائمة السوداء" : "All blacklist cases",
      icon: FileText,
      color: "text-slate-600",
      bgColor: "bg-slate-50 dark:bg-slate-900/20",
      filterValue: "all",
    },
    {
      title: isRTL ? "قيد المعالجة" : "Pending",
      value: pendingCount,
      subtitle: isRTL
        ? "بانتظار التحقق أو الموافقة"
        : "Awaiting validation or approval",
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      filterValue: "pending_approval",
    },
    {
      title: isRTL ? "نشط (محظور)" : "Active (Blacklisted)",
      value: summary.approved,
      subtitle: isRTL
        ? "موردون محظورون حالياً"
        : "Currently blacklisted vendors",
      icon: ShieldBan,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      filterValue: "approved",
    },
    {
      title: isRTL ? "تم الإلغاء" : "Revoked",
      value: summary.revoked,
      subtitle: isRTL ? "تم رفع الحظر" : "Blacklist lifted",
      icon: RotateCcw,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      filterValue: "revoked",
    },
  ];

  const handleRefresh = () => {
    summaryQuery.refetch();
    listQuery.refetch();
    setSelectedIds(new Set());
  };

  return (
    <div className="p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton
            href={evalBackPath}
            label={
              isRTL
                ? "العودة إلى مركز التقييم والأداء"
                : "Back to Evaluation & Performance Hub"
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={listQuery.isRefetching}
          >
            <RefreshCw
              className={`w-4 h-4 ${
                listQuery.isRefetching ? "animate-spin" : ""
              }`}
            />
            {isRTL ? "تحديث" : "Refresh"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(`${blacklistBasePath}/settings`)}>
            <Settings className="w-4 h-4" />
            {isRTL ? "الإعدادات" : "Settings"}
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4" />
            {isRTL ? "طلب حظر جديد" : "New Blacklist Request"}
          </Button>
        </div>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldBan className="w-7 h-7 text-red-600" />
          {isRTL ? "إدارة القائمة السوداء للموردين" : "Vendor Blacklist Management"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRTL
            ? "إدارة حالات الحظر والتحقق والموافقة وإلغاء الحظر"
            : "Manage blacklist cases, validation, approval, and reinstatement"}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          const isActive = statusFilter === kpi.filterValue;
          return (
            <Card
              key={kpi.filterValue}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isActive
                  ? "ring-2 ring-primary shadow-md"
                  : "hover:ring-1 hover:ring-border"
              }`}
              onClick={() =>
                setStatusFilter(
                  isActive ? "all" : kpi.filterValue
                )
              }
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {kpi.title}
                    </p>
                    <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {kpi.subtitle}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters + Export Buttons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ltr:left-3 rtl:right-3" />
              <Input
                placeholder={
                  isRTL
                    ? "بحث بالاسم أو رقم الحالة..."
                    : "Search by vendor name or case number..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ltr:pl-9 rtl:pr-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setSelectedIds(new Set()); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue
                  placeholder={isRTL ? "تصفية بالحالة" : "Filter by status"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {isRTL ? "جميع الحالات" : "All Statuses"}
                </SelectItem>
                <SelectItem value="draft">
                  {isRTL ? "مسودة" : "Draft"}
                </SelectItem>
                <SelectItem value="submitted">
                  {isRTL ? "مقدم" : "Submitted"}
                </SelectItem>
                <SelectItem value="under_validation">
                  {isRTL ? "قيد التحقق" : "Under Validation"}
                </SelectItem>
                <SelectItem value="pending_approval">
                  {isRTL ? "بانتظار الموافقة" : "Pending Approval"}
                </SelectItem>
                <SelectItem value="approved">
                  {isRTL ? "معتمد (نشط)" : "Approved (Active)"}
                </SelectItem>
                <SelectItem value="rejected">
                  {isRTL ? "مرفوض" : "Rejected"}
                </SelectItem>
                <SelectItem value="revoked">
                  {isRTL ? "ملغى" : "Revoked"}
                </SelectItem>
                <SelectItem value="expired">
                  {isRTL ? "منتهي" : "Expired"}
                </SelectItem>
              </SelectContent>
            </Select>
            {statusFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStatusFilter("all"); setSelectedIds(new Set()); }}
              >
                <XCircle className="w-4 h-4" />
                {isRTL ? "مسح الفلتر" : "Clear Filter"}
              </Button>
            )}
            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                {isRTL ? "Excel" : "Excel"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                {isRTL ? "PDF" : "PDF"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Toolbar */}
      {someSelected && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-primary" />
                <span className="font-medium text-sm">
                  {isRTL
                    ? `${selectedIds.size} حالة محددة`
                    : `${selectedIds.size} case(s) selected`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canBulkApprove && (
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => setShowBulkApproveDialog(true)}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isRTL ? "موافقة جماعية" : "Bulk Approve"}
                  </Button>
                )}
                {canBulkReject && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setShowBulkRejectDialog(true)}
                  >
                    <SquareX className="w-4 h-4" />
                    {isRTL ? "رفض جماعي" : "Bulk Reject"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    handleExportExcel();
                  }}
                  disabled={isExporting}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {isRTL ? "تصدير المحدد" : "Export Selected"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                >
                  <XCircle className="w-4 h-4" />
                  {isRTL ? "إلغاء التحديد" : "Clear Selection"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {isRTL ? "حالات القائمة السوداء" : "Blacklist Cases"}
            <Badge variant="secondary" className="text-xs">
              {totalCases}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground ms-2">
                {isRTL ? "جاري التحميل..." : "Loading..."}
              </span>
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldBan className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">
                {isRTL ? "لا توجد حالات" : "No cases found"}
              </p>
              <p className="text-sm mt-1">
                {isRTL
                  ? "لم يتم العثور على حالات قائمة سوداء مطابقة"
                  : "No blacklist cases match your filters"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label={isRTL ? "تحديد الكل" : "Select all"}
                      />
                    </TableHead>
                    <TableHead>{isRTL ? "رقم الحالة" : "Case #"}</TableHead>
                    <TableHead>{isRTL ? "المورد" : "Vendor"}</TableHead>
                    <TableHead>{isRTL ? "سبب الحظر" : "Reason"}</TableHead>
                    <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                    <TableHead>
                      {isRTL ? "تاريخ الإنشاء" : "Created"}
                    </TableHead>
                    <TableHead>
                      {isRTL ? "تاريخ الحظر" : "Blacklist Date"}
                    </TableHead>
                    <TableHead className="text-center">
                      {isRTL ? "الإجراءات" : "Actions"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCases.map((c: any) => (
                    <TableRow
                      key={c.id}
                      className={selectedIds.has(c.id) ? "bg-primary/5" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(c.id)}
                          onCheckedChange={() => toggleSelect(c.id)}
                          aria-label={`Select case ${c.caseNumber}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">
                        {c.caseNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {isRTL
                              ? c.vendor?.nameAr || c.vendor?.name || "—"
                              : c.vendor?.name || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.vendor?.vendorCode || ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {isRTL
                            ? REASON_LABELS[c.reasonCategory]?.ar
                            : REASON_LABELS[c.reasonCategory]?.en}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} isRTL={isRTL} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.createdAt
                          ? new Date(c.createdAt).toLocaleDateString(
                              isRTL ? "ar-SA" : "en-US"
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.blacklistStartDate || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigate(`${blacklistBasePath}/${c.id}`);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                          {isRTL ? "عرض" : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {/* Pagination Controls */}
          {cases.length > BL_ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-sm text-muted-foreground">
                {isRTL
                  ? `صفحة ${currentPage} من ${totalPages} (${cases.length} حالة)`
                  : `Page ${currentPage} of ${totalPages} (${cases.length} cases)`}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                  {isRTL ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) page = i + 1;
                  else if (currentPage <= 3) page = i + 1;
                  else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                  else page = currentPage - 2 + i;
                  return (
                    <Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(page)}>
                      {page}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                  {isRTL ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateBlacklistDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        isRTL={isRTL}
        onSuccess={() => {
          setShowCreateDialog(false);
          handleRefresh();
        }}
      />

      {/* Bulk Approve Dialog */}
      <Dialog open={showBulkApproveDialog} onOpenChange={setShowBulkApproveDialog}>
        <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-red-600" />
              {isRTL ? "موافقة جماعية" : "Bulk Approve Cases"}
            </DialogTitle>
            <DialogDescription>
              {isRTL
                ? `سيتم الموافقة على ${selectedIds.size} حالة وإضافة الموردين إلى القائمة السوداء.`
                : `${selectedIds.size} case(s) will be approved and vendors will be blacklisted.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{isRTL ? "تاريخ بدء الحظر *" : "Blacklist Start Date *"}</Label>
              <Input
                type="date"
                value={bulkApproveStartDate}
                onChange={(e) => setBulkApproveStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "تاريخ الانتهاء" : "Expiry Date (optional)"}</Label>
              <Input
                type="date"
                value={bulkApproveExpiryDate}
                onChange={(e) => setBulkApproveExpiryDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "ملاحظات" : "Comments (optional)"}</Label>
              <Textarea
                value={bulkApproveComments}
                onChange={(e) => setBulkApproveComments(e.target.value)}
                placeholder={isRTL ? "ملاحظات إضافية..." : "Additional comments..."}
                rows={3}
              />
            </div>
          </div>
          {bulkApproveMutation.error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {bulkApproveMutation.error.message}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkApproveDialog(false)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                bulkApproveMutation.mutate({
                  caseIds: Array.from(selectedIds),
                  blacklistStartDate: bulkApproveStartDate,
                  expiryDate: bulkApproveExpiryDate || undefined,
                  comments: bulkApproveComments || undefined,
                });
              }}
              disabled={!bulkApproveStartDate || bulkApproveMutation.isPending}
            >
              {bulkApproveMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {isRTL ? `موافقة على ${selectedIds.size} حالة` : `Approve ${selectedIds.size} Case(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Dialog */}
      <AlertDialog open={showBulkRejectDialog} onOpenChange={setShowBulkRejectDialog}>
        <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <SquareX className="w-5 h-5 text-destructive" />
              {isRTL ? "رفض جماعي" : "Bulk Reject Cases"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? `سيتم رفض ${selectedIds.size} حالة. هذا الإجراء لا يمكن التراجع عنه.`
                : `${selectedIds.size} case(s) will be rejected. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label>{isRTL ? "سبب الرفض *" : "Rejection Reason *"}</Label>
            <Textarea
              value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
              placeholder={isRTL ? "اكتب سبب الرفض (5 أحرف على الأقل)" : "Provide rejection reason (min 5 characters)"}
              rows={3}
            />
          </div>
          {bulkRejectMutation.error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {bulkRejectMutation.error.message}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowBulkRejectDialog(false); setBulkRejectReason(""); }}>
              {isRTL ? "إلغاء" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                bulkRejectMutation.mutate({
                  caseIds: Array.from(selectedIds),
                  rejectionReason: bulkRejectReason,
                });
              }}
              disabled={bulkRejectReason.length < 5 || bulkRejectMutation.isPending}
            >
              {bulkRejectMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {isRTL ? `رفض ${selectedIds.size} حالة` : `Reject ${selectedIds.size} Case(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CREATE BLACKLIST DIALOG
// ══════════════════════════════════════════════════════════════
function CreateBlacklistDialog({
  open,
  onOpenChange,
  isRTL,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRTL: boolean;
  onSuccess: () => void;
}) {
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [reasonCategory, setReasonCategory] = useState("");
  const [justification, setJustification] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [relatedReference, setRelatedReference] = useState("");
  const [recommendedDuration, setRecommendedDuration] = useState("");
  const [additionalComments, setAdditionalComments] = useState("");

  const vendorsQuery = trpc.vendors.list.useQuery({
    isBlacklisted: false,
    limit: 500,
  });

  const createMutation = trpc.blacklist.createRequest.useMutation({
    onSuccess: () => {
      resetForm();
      onSuccess();
    },
  });

  const resetForm = () => {
    setVendorId(null);
    setReasonCategory("");
    setJustification("");
    setIncidentDate("");
    setRelatedReference("");
    setRecommendedDuration("");
    setAdditionalComments("");
  };

  const handleSubmit = () => {
    if (!vendorId || !reasonCategory || justification.length < 10) return;
    createMutation.mutate({
      vendorId,
      reasonCategory: reasonCategory as any,
      detailedJustification: justification,
      incidentDate: incidentDate || undefined,
      relatedReference: relatedReference || undefined,
      recommendedDuration: recommendedDuration || undefined,
      additionalComments: additionalComments || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldBan className="w-5 h-5 text-red-600" />
            {isRTL ? "طلب حظر مورد جديد" : "New Blacklist Request"}
          </DialogTitle>
          <DialogDescription>
            {isRTL
              ? "أنشئ طلب حظر مورد جديد. سيتم حفظه كمسودة."
              : "Create a new vendor blacklist request. It will be saved as a draft."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Vendor Selection */}
          <div className="space-y-2">
            <Label>{isRTL ? "المورد *" : "Vendor *"}</Label>
            <Select
              value={vendorId?.toString() ?? ""}
              onValueChange={(v) => setVendorId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={isRTL ? "اختر المورد" : "Select vendor"}
                />
              </SelectTrigger>
              <SelectContent>
                {(vendorsQuery.data?.vendors ?? []).map((v: any) => (
                  <SelectItem key={v.id} value={v.id.toString()}>
                    {isRTL ? v.nameAr || v.name : v.name} ({v.vendorCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason Category */}
          <div className="space-y-2">
            <Label>{isRTL ? "فئة السبب *" : "Reason Category *"}</Label>
            <Select value={reasonCategory} onValueChange={setReasonCategory}>
              <SelectTrigger>
                <SelectValue
                  placeholder={isRTL ? "اختر السبب" : "Select reason"}
                />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REASON_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {isRTL ? label.ar : label.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Detailed Justification */}
          <div className="space-y-2">
            <Label>
              {isRTL ? "التبرير التفصيلي *" : "Detailed Justification *"}
            </Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder={
                isRTL
                  ? "اكتب تبريراً تفصيلياً (10 أحرف على الأقل)"
                  : "Provide detailed justification (minimum 10 characters)"
              }
              rows={4}
            />
            {justification.length > 0 && justification.length < 10 && (
              <p className="text-xs text-destructive">
                {isRTL
                  ? `${10 - justification.length} أحرف إضافية مطلوبة`
                  : `${10 - justification.length} more characters required`}
              </p>
            )}
          </div>

          {/* Incident Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "تاريخ الحادثة" : "Incident Date"}</Label>
              <Input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>
                {isRTL ? "المدة الموصى بها" : "Recommended Duration"}
              </Label>
              <Select
                value={recommendedDuration}
                onValueChange={setRecommendedDuration}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={isRTL ? "اختر المدة" : "Select duration"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6_months">
                    {isRTL ? "6 أشهر" : "6 Months"}
                  </SelectItem>
                  <SelectItem value="1_year">
                    {isRTL ? "سنة واحدة" : "1 Year"}
                  </SelectItem>
                  <SelectItem value="2_years">
                    {isRTL ? "سنتان" : "2 Years"}
                  </SelectItem>
                  <SelectItem value="3_years">
                    {isRTL ? "3 سنوات" : "3 Years"}
                  </SelectItem>
                  <SelectItem value="5_years">
                    {isRTL ? "5 سنوات" : "5 Years"}
                  </SelectItem>
                  <SelectItem value="permanent">
                    {isRTL ? "دائم" : "Permanent"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Related Reference */}
          <div className="space-y-2">
            <Label>
              {isRTL ? "المرجع ذو الصلة" : "Related Reference"}
            </Label>
            <Input
              value={relatedReference}
              onChange={(e) => setRelatedReference(e.target.value)}
              placeholder={
                isRTL
                  ? "رقم العقد، رقم أمر الشراء، إلخ."
                  : "Contract number, PO number, etc."
              }
            />
          </div>

          {/* Additional Comments */}
          <div className="space-y-2">
            <Label>
              {isRTL ? "ملاحظات إضافية" : "Additional Comments"}
            </Label>
            <Textarea
              value={additionalComments}
              onChange={(e) => setAdditionalComments(e.target.value)}
              placeholder={
                isRTL ? "ملاحظات إضافية (اختياري)" : "Additional notes (optional)"
              }
              rows={2}
            />
          </div>
        </div>

        {createMutation.error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
            {createMutation.error.message}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isRTL ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !vendorId ||
              !reasonCategory ||
              justification.length < 10 ||
              createMutation.isPending
            }
          >
            {createMutation.isPending && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            {isRTL ? "إنشاء مسودة" : "Create Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
