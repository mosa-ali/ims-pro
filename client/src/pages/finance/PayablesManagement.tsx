/**
 * Payables Management Page (Finance)
 * 
 * ERP-aligned payables list with:
 * - Full-width landscape layout
 * - Pagination (50 items per page)
 * - Column sorting (click headers to sort)
 * - Filtering by status, vendor, date range
 * - PR Number as clickable link to Procurement Workspace
 * - Icon-only Actions column with tooltips (max 2-3 per row)
 * - Consistent status/matching badge colors per ERP standards
 * - Reuses Logistics matching modal (MatchingDetailsModal)
 * - Variance approval workflow dialog
 * - Invoice viewing & matching for pending items
 * - Approval workflow (approve/reject)
 * - Payment recording with proof upload
 * - Payment voucher PDF generation
 */

import { useTranslation } from '@/i18n/useTranslation';
import { useState, useRef, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, FileText, DollarSign, AlertCircle, CheckCircle, Clock, Search,
  Filter, Trash2, Download, ChevronRight, Eye, Receipt, CreditCard,
  Upload, X, ExternalLink, ShieldCheck, XCircle, FileDown,
  ChevronLeft, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown,
  Scale, MoreHorizontal,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Reuse the working Logistics matching components
import { MatchingStatusBadge, MatchingDetailsModal } from "@/pages/logistics/MatchingStatusBadge";

const ITEMS_PER_PAGE = 50;

// ─── Sorting types ───────────────────────────────────────────────────────────
type SortField = 'prNumber' | 'sourceType' | 'reference' | 'vendorName' | 'amount' | 'dueDate' | 'status' | 'matchingStatus';
type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  field: SortField | null;
  direction: SortDirection;
}

// Status sort order for meaningful sorting
const STATUS_ORDER: Record<string, number> = {
  draft: 0,
  pending_grn: 1,
  pending_invoice: 2,
  pending_approval: 3,
  pending_payment: 4,
  partially_paid: 5,
  fully_paid: 6,
  cancelled: 7,
};

const MATCHING_STATUS_ORDER: Record<string, number> = {
  pending: 0,
  variance_detected: 1,
  matched: 2,
};

export default function PayablesManagement() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting state
  const [sortState, setSortState] = useState<SortState>({ field: null, direction: null });

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPayableForDelete, setSelectedPayableForDelete] = useState<any>(null);
  const [selectedPayables, setSelectedPayables] = useState<Set<number>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [invoiceDialog, setInvoiceDialog] = useState<{ open: boolean; payableId?: number }>({ open: false });
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; payable?: any }>({ open: false });
  const [approvalDialog, setApprovalDialog] = useState<{ open: boolean; payableId?: number; action?: 'approve' | 'reject' | 'cancel' }>({ open: false });
  const [approvalReason, setApprovalReason] = useState("");
  const [voucherLoading, setVoucherLoading] = useState<number | null>(null);

  // Matching modal state (reusing Logistics matching flow)
  const [matchingDetailsOpen, setMatchingDetailsOpen] = useState(false);
  const [selectedMatchingData, setSelectedMatchingData] = useState<any>(null);

  // Variance approval dialog state
  const [varianceDialog, setVarianceDialog] = useState<{ open: boolean; payableId?: number; matchingData?: any }>({ open: false });
  const [varianceAction, setVarianceAction] = useState<'approve' | 'reject'>('approve');
  const [varianceComments, setVarianceComments] = useState("");

  // Row expansion state
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const [filters, setFilters] = useState({
    status: "all",
    vendorSearch: "",
    dateFrom: "",
    dateTo: "",
  });

  // Mutations
  const bulkDeleteMutation = trpc.prFinance.bulkDeletePayables.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setBulkDeleteDialogOpen(false);
      setSelectedPayables(new Set());
      refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to delete payables"),
  });

  const statusUpdateMutation = trpc.prFinance.updatePayableStatus.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to update status"),
  });

  const deletePayableMutation = trpc.prFinance.deletePayable.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Payable deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedPayableForDelete(null);
      refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to delete payable"),
  });

  const rejectPayableMutation = trpc.prFinance.rejectPayable.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setApprovalDialog({ open: false });
      setApprovalReason("");
      refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to reject payable"),
  });

  const cancelPayableMutation = trpc.prFinance.cancelPayable.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setApprovalDialog({ open: false });
      setApprovalReason("");
      refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to cancel payable"),
  });

  const generateVoucherMutation = trpc.prFinance.generatePaymentVoucher.useMutation({
    onSuccess: (data) => {
      toast.success("Payment voucher generated successfully");
      setVoucherLoading(null);
      if (data.voucherUrl) {
        window.open(data.voucherUrl, "_blank");
      }
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate voucher");
      setVoucherLoading(null);
    },
  });

  // Variance review mutation
  const reviewVarianceMutation = trpc.prFinance.reviewVariance.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setVarianceDialog({ open: false });
      setVarianceComments("");
      setVarianceAction('approve');
      refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to process variance review"),
  });

  // Fetch payables with filters
  const { data: payables, isLoading, refetch } = trpc.prFinance.getPayablesList.useQuery({
    status: filters.status === "all" ? undefined : filters.status,
    vendorSearch: filters.vendorSearch || undefined,
    dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
    dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
  });

  // ─── Sorting logic ──────────────────────────────────────────────────────────
  const handleSort = useCallback((field: SortField) => {
    setSortState(prev => {
      if (prev.field === field) {
        if (prev.direction === 'asc') return { field, direction: 'desc' };
        if (prev.direction === 'desc') return { field: null, direction: null };
      }
      return { field, direction: 'asc' };
    });
    setCurrentPage(1);
  }, []);

  const getReference = useCallback((payable: any) => {
    if (payable.sourceType === 'services') {
      return payable.contractNumber || payable.sacNumber || '—';
    }
    return payable.poNumber || payable.grnNumber || '—';
  }, []);

  const sortedPayables = useMemo(() => {
    if (!payables) return [];
    if (!sortState.field || !sortState.direction) return [...payables];

    const sorted = [...payables];
    const dir = sortState.direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      switch (sortState.field) {
        case 'prNumber': {
          const aVal = (a.prNumber || '').toLowerCase();
          const bVal = (b.prNumber || '').toLowerCase();
          return aVal.localeCompare(bVal) * dir;
        }
        case 'sourceType': {
          return (a.sourceType || '').localeCompare(b.sourceType || '') * dir;
        }
        case 'reference': {
          const aRef = getReference(a).toLowerCase();
          const bRef = getReference(b).toLowerCase();
          return aRef.localeCompare(bRef) * dir;
        }
        case 'vendorName': {
          const aVal = (a.vendorName || '').toLowerCase();
          const bVal = (b.vendorName || '').toLowerCase();
          return aVal.localeCompare(bVal) * dir;
        }
        case 'amount': {
          const aAmt = parseFloat(a.amount || '0');
          const bAmt = parseFloat(b.amount || '0');
          return (aAmt - bAmt) * dir;
        }
        case 'dueDate': {
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          return (aDate - bDate) * dir;
        }
        case 'status': {
          const aOrder = STATUS_ORDER[a.status] ?? 99;
          const bOrder = STATUS_ORDER[b.status] ?? 99;
          return (aOrder - bOrder) * dir;
        }
        case 'matchingStatus': {
          const aOrder = MATCHING_STATUS_ORDER[a.matchingStatus] ?? 99;
          const bOrder = MATCHING_STATUS_ORDER[b.matchingStatus] ?? 99;
          return (aOrder - bOrder) * dir;
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [payables, sortState, getReference]);

  // Pagination logic (applied after sorting)
  const totalItems = sortedPayables.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const paginatedPayables = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedPayables.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedPayables, currentPage]);

  // Reset to page 1 when filters change
  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // ─── Sort header component ─────────────────────────────────────────────────
  const SortableHeader = ({ field, label, className = "" }: { field: SortField; label: string; className?: string }) => {
    const isActive = sortState.field === field;
    return (
      <TableHead
        className={`text-xs cursor-pointer select-none hover:bg-muted/50 transition-colors whitespace-nowrap ${className}`}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          <span>{label}</span>
          {isActive && sortState.direction === 'asc' && <ArrowUp className="w-3 h-3 text-primary" />}
          {isActive && sortState.direction === 'desc' && <ArrowDown className="w-3 h-3 text-primary" />}
          {!isActive && <ArrowUpDown className="w-3 h-3 text-muted-foreground/40" />}
        </div>
      </TableHead>
    );
  };

  // ─── Icon Action Button with Tooltip ────────────────────────────────────────
  const ActionIcon = ({ icon: Icon, tooltip, onClick, variant = "ghost", className = "", disabled = false }: {
    icon: React.ElementType;
    tooltip: string;
    onClick: () => void;
    variant?: "ghost" | "outline" | "default" | "destructive";
    className?: string;
    disabled?: boolean;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant={variant}
          onClick={onClick}
          disabled={disabled}
          className={`h-7 w-7 ${className}`}
        >
          <Icon className="w-3.5 h-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );

  // Handlers
  const handleShowInvoice = (payableId: number) => {
    setInvoiceDialog({ open: true, payableId });
  };

  // Reuse the same matching data fetch as Logistics
  const handleShowMatching = async (payable: any) => {
    try {
      const matchingData = await utils.prFinance.getMatchingData.fetch({ payableId: payable.id });
      setSelectedMatchingData({
        status: (matchingData as any).matchingStatus || (parseFloat(matchingData.variance) === 0 ? "matched" : "variance_detected"),
        discrepancies: matchingData.discrepancies || [],
        matchingType: matchingData.matchingType || 'goods',
        prAmount: parseFloat(matchingData.prAmount),
        poAmount: parseFloat(matchingData.poAmount),
        grnAmount: parseFloat((matchingData as any).grnAmount || matchingData.grnAcceptedAmount || '0'),
        contractNumber: (matchingData as any).contractNumber,
        contractAmount: parseFloat((matchingData as any).contractAmount || '0'),
        sacNumber: (matchingData as any).sacNumber,
        sacAmount: parseFloat((matchingData as any).sacAmount || '0'),
        invoiceNumber: (matchingData as any).invoiceNumber,
        invoiceAmount: parseFloat((matchingData as any).invoiceAmount || '0'),
        hasInvoice: (matchingData as any).hasInvoice || false,
        cumulativeSacPayables: parseFloat((matchingData as any).cumulativeSacPayables || '0'),
        payableAmount: parseFloat(matchingData.payableAmount),
        varianceAmount: parseFloat(matchingData.variance),
        variancePercentage: parseFloat(matchingData.variancePercentage),
      });
      setMatchingDetailsOpen(true);
    } catch (error) {
      toast.error("Failed to load matching details");
      console.error(error);
    }
  };

  // Variance review handler
  const handleOpenVarianceReview = async (payable: any) => {
    try {
      const matchingData = await utils.prFinance.getMatchingData.fetch({ payableId: payable.id });
      setVarianceDialog({
        open: true,
        payableId: payable.id,
        matchingData: {
          matchingType: matchingData.matchingType || 'goods',
          prAmount: matchingData.prAmount,
          poAmount: matchingData.poAmount,
          grnAmount: (matchingData as any).grnAmount || matchingData.grnAcceptedAmount || '0',
          contractNumber: (matchingData as any).contractNumber,
          contractAmount: (matchingData as any).contractAmount || '0',
          sacNumber: (matchingData as any).sacNumber,
          sacAmount: (matchingData as any).sacAmount || '0',
          invoiceNumber: (matchingData as any).invoiceNumber,
          invoiceAmount: (matchingData as any).invoiceAmount || '0',
          payableAmount: matchingData.payableAmount,
          variance: matchingData.variance,
          variancePercentage: matchingData.variancePercentage,
          discrepancies: matchingData.discrepancies || [],
        },
      });
      setVarianceAction('approve');
      setVarianceComments("");
    } catch (error) {
      toast.error("Failed to load variance data");
      console.error(error);
    }
  };

  const handleSubmitVarianceReview = async () => {
    if (!varianceDialog.payableId) return;
    if (varianceAction === 'reject' && !varianceComments.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    await reviewVarianceMutation.mutateAsync({
      payableId: varianceDialog.payableId,
      action: varianceAction,
      comments: varianceComments || undefined,
    });
  };

  // Navigate to Logistics procurement workspace
  const handleViewInLogistics = (payable: any) => {
    if (payable.purchaseRequestId) {
      setLocation(`/organization/logistics/procurement-workspace/${payable.purchaseRequestId}`);
    } else {
      toast.info("No linked procurement workspace found");
    }
  };

  const handleDeleteClick = (payable: any) => {
    setSelectedPayableForDelete(payable);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedPayableForDelete) {
      await deletePayableMutation.mutateAsync({ id: selectedPayableForDelete.id });
    }
  };

  const handleApprovalAction = async () => {
    if (!approvalDialog.payableId || !approvalDialog.action) return;
    try {
      if (approvalDialog.action === 'approve') {
        await statusUpdateMutation.mutateAsync({
          id: approvalDialog.payableId,
          newStatus: "pending_payment"
        });
      } else if (approvalDialog.action === 'reject') {
        await rejectPayableMutation.mutateAsync({
          id: approvalDialog.payableId,
          reason: approvalReason || undefined
        });
      } else if (approvalDialog.action === 'cancel') {
        await cancelPayableMutation.mutateAsync({
          id: approvalDialog.payableId,
          reason: approvalReason || undefined
        });
      }
    } catch (error) {
      console.error("Error processing approval action:", error);
    }
  };

  const openApprovalDialog = (payableId: number, action: 'approve' | 'reject' | 'cancel') => {
    setApprovalDialog({ open: true, payableId, action });
    setApprovalReason("");
  };

  const handleSelectPayable = (payableId: number) => {
    const newSelected = new Set(selectedPayables);
    if (newSelected.has(payableId)) {
      newSelected.delete(payableId);
    } else {
      newSelected.add(payableId);
    }
    setSelectedPayables(newSelected);
  };

  const handleSelectAll = () => {
    if (paginatedPayables.length > 0) {
      const pageIds = paginatedPayables.map(p => p.id);
      const allSelected = pageIds.every(id => selectedPayables.has(id));
      if (allSelected) {
        const newSelected = new Set(selectedPayables);
        pageIds.forEach(id => newSelected.delete(id));
        setSelectedPayables(newSelected);
      } else {
        const newSelected = new Set(selectedPayables);
        pageIds.forEach(id => newSelected.add(id));
        setSelectedPayables(newSelected);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPayables.size > 0) {
      await bulkDeleteMutation.mutateAsync({ ids: Array.from(selectedPayables) });
    }
  };

  const handleGenerateVoucher = (payableId: number) => {
    setVoucherLoading(payableId);
    generateVoucherMutation.mutate({ payableId });
  };

  const handleExportCSV = () => {
    if (!payables || payables.length === 0) {
      toast.error("No payables to export");
      return;
    }
    const headers = ["Payable ID", "PR Number", "Source Type", "Reference", "Vendor", "Amount", "Due Date", "Status", "Matching Status"];
    const rows = payables.map(p => [
      p.id,
      p.prNumber || "",
      p.sourceType === 'services' ? 'Services' : 'Goods',
      p.sourceType === 'services' ? (p.contractNumber || p.sacNumber || "") : (p.poNumber || p.grnNumber || ""),
      p.vendorName || "",
      p.amount || "0",
      p.dueDate ? new Date(p.dueDate).toLocaleDateString() : "",
      p.status || "",
      p.matchingStatus || ""
    ]);
    const csv = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payables-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Payables exported to CSV");
  };

  // ─── ERP-Standard Status Badges ─────────────────────────────────────────────
  // Pending Invoice → Grey, Pending Approval → Orange, Ready for Payment → Blue, Fully Paid → Green
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_invoice":
        return <Badge variant="secondary" className="gap-1 bg-gray-100 text-gray-700 border-gray-300 whitespace-nowrap"><Clock className="w-3 h-3" />Pending Invoice</Badge>;
      case "pending_approval":
        return <Badge variant="outline" className="gap-1 border-orange-400 text-orange-700 bg-orange-50 whitespace-nowrap"><AlertCircle className="w-3 h-3" />Pending Approval</Badge>;
      case "pending_payment":
        return <Badge variant="outline" className="gap-1 border-blue-400 text-blue-700 bg-blue-50 whitespace-nowrap"><CreditCard className="w-3 h-3" />Ready for Payment</Badge>;
      case "partially_paid":
        return <Badge variant="outline" className="gap-1 border-sky-400 text-sky-700 bg-sky-50 whitespace-nowrap"><DollarSign className="w-3 h-3" />Partially Paid</Badge>;
      case "fully_paid":
        return <Badge className="gap-1 bg-green-600 text-white whitespace-nowrap"><CheckCircle className="w-3 h-3" />Fully Paid</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="gap-1 whitespace-nowrap"><XCircle className="w-3 h-3" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary" className="whitespace-nowrap">{status?.replace(/_/g, " ")}</Badge>;
    }
  };

  // ─── ERP-Standard Matching Badges ───────────────────────────────────────────
  // Pending → Grey, Matched → Green, Mismatch/Variance → Red
  const getMatchingBadge = (matchingStatus: string) => {
    switch (matchingStatus) {
      case "pending":
        return <Badge variant="secondary" className="gap-1 bg-gray-100 text-gray-600 border-gray-300 whitespace-nowrap"><Clock className="w-3 h-3" />Pending</Badge>;
      case "matched":
        return <Badge className="gap-1 bg-green-600 text-white whitespace-nowrap"><CheckCircle className="w-3 h-3" />Matched</Badge>;
      case "variance_detected":
        return <Badge variant="outline" className="gap-1 border-red-400 text-red-700 bg-red-50 whitespace-nowrap"><AlertCircle className="w-3 h-3" />Mismatch</Badge>;
      default:
        return <Badge variant="secondary" className="whitespace-nowrap">{matchingStatus?.replace(/_/g, " ")}</Badge>;
    }
  };

  const getSourceTypeBadge = (sourceType: string) => {
    if (sourceType === 'services') {
      return <Badge variant="outline" className="gap-1 border-purple-300 text-purple-700 bg-purple-50 text-xs whitespace-nowrap">Services</Badge>;
    }
    return <Badge variant="outline" className="gap-1 border-teal-300 text-teal-700 bg-teal-50 text-xs whitespace-nowrap">Goods</Badge>;
  };

  const stats = {
    total: payables?.length || 0,
    pendingInvoice: payables?.filter(p => p.status === "pending_invoice").length || 0,
    pendingApproval: payables?.filter(p => p.status === "pending_approval").length || 0,
    pendingPayment: payables?.filter(p => p.status === "pending_payment").length || 0,
    paid: payables?.filter(p => p.status === "fully_paid" || p.status === "partially_paid").length || 0,
    totalAmount: payables?.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0) || 0,
  };

  return (
    <div className="w-full px-4 py-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header — no Export button here, moved to table header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Payables Management</h1>
        <p className="text-muted-foreground mt-1">Review invoices, approve payments, and generate vouchers</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payables</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">${stats.totalAmount.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoice</CardTitle>
            <Clock className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.pendingInvoice}</div>
            <p className="text-xs text-muted-foreground">Awaiting invoice from Logistics</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <AlertCircle className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingApproval}</div>
            <p className="text-xs text-muted-foreground">Requires review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready for Payment</CardTitle>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pendingPayment}</div>
            <p className="text-xs text-muted-foreground">Approved & awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <DollarSign className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_invoice">Pending Invoice</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="pending_payment">Ready for Payment</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="fully_paid">Fully Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Vendor</label>
              <div className="relative">
                <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendor..."
                  value={filters.vendorSearch}
                  onChange={(e) => handleFilterChange({ ...filters, vendorSearch: e.target.value })}
                  className="ps-8"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date From</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange({ ...filters, dateFrom: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date To</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleFilterChange({ status: "all", vendorSearch: "", dateFrom: "", dateTo: "" });
                setSortState({ field: null, direction: null });
              }}
            >
              Clear Filters & Sort
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Toolbar */}
      {selectedPayables.size > 0 && (
        <Card className="mb-4 bg-blue-50 border-blue-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{selectedPayables.size} payable(s) selected</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedPayables(new Set())}>
                  Deselect All
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4 me-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payables Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Payables List</CardTitle>
              <CardDescription>
                {stats.total} payable{stats.total !== 1 ? "s" : ""} found
                {totalPages > 1 && ` — Page ${currentPage} of ${totalPages}`}
                {sortState.field && (
                  <span className="ms-2 text-primary">
                    (sorted by {sortState.field} {sortState.direction})
                  </span>
                )}
              </CardDescription>
            </div>
            {/* Export CSV in table header area */}
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 px-3">
                        <Checkbox
                          checked={paginatedPayables.length > 0 && paginatedPayables.every(p => selectedPayables.has(p.id))}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <SortableHeader field="prNumber" label="PR Number" />
                      <SortableHeader field="sourceType" label="Source" />
                      <SortableHeader field="reference" label="Reference" />
                      <SortableHeader field="vendorName" label="Vendor" />
                      <SortableHeader field="amount" label="Amount" className="text-end" />
                      <SortableHeader field="dueDate" label="Due Date" />
                      <SortableHeader field="status" label="Status" />
                      <SortableHeader field="matchingStatus" label="Matching" />
                      <TableHead className="text-xs text-center whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayables.length > 0 ? (
                      paginatedPayables.map((payable) => {
                        const isExpanded = expandedRow === payable.id;
                        return (
                          <>
                            <TableRow
                              key={payable.id}
                              className={`text-sm ${isExpanded ? 'bg-muted/30' : 'hover:bg-muted/20'}`}
                            >
                              <TableCell className="px-3">
                                <Checkbox
                                  checked={selectedPayables.has(payable.id)}
                                  onCheckedChange={() => handleSelectPayable(payable.id)}
                                />
                              </TableCell>
                              {/* PR Number — clickable link to Procurement Workspace */}
                              <TableCell className="font-medium text-xs">
                                <button
                                  onClick={() => handleViewInLogistics(payable)}
                                  className="text-primary hover:text-primary/80 hover:underline underline-offset-2 transition-colors cursor-pointer font-semibold"
                                  title="Open Procurement Workspace"
                                >
                                  {payable.prNumber || "—"}
                                </button>
                              </TableCell>
                              <TableCell>{getSourceTypeBadge(payable.sourceType)}</TableCell>
                              <TableCell className="text-xs">{getReference(payable)}</TableCell>
                              <TableCell className="text-xs max-w-[180px] truncate" title={payable.vendorName || "Unknown"}>
                                {payable.vendorName || "Unknown"}
                              </TableCell>
                              <TableCell className="text-end font-semibold text-xs whitespace-nowrap">
                                ${parseFloat(payable.amount || "0").toLocaleString()}
                              </TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                {payable.dueDate ? new Date(payable.dueDate).toLocaleDateString() : "—"}
                              </TableCell>
                              <TableCell>{getStatusBadge(payable.status)}</TableCell>
                              {/* Matching — clickable badge opens matching details */}
                              <TableCell>
                                <button
                                  onClick={() => handleShowMatching(payable)}
                                  className="hover:opacity-80 transition-opacity cursor-pointer"
                                  title="View matching details"
                                >
                                  {getMatchingBadge(payable.matchingStatus || "pending")}
                                </button>
                              </TableCell>
                              {/* Actions — icon-only with tooltips, max 2-3 per row */}
                              <TableCell>
                                <div className="flex items-center gap-0.5 justify-center">
                                  {/* View Invoice — always shown (except cancelled) */}
                                  {payable.status !== "cancelled" && (
                                    <ActionIcon
                                      icon={FileText}
                                      tooltip="View Invoice"
                                      onClick={() => handleShowInvoice(payable.id)}
                                      className="text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                                    />
                                  )}

                                  {/* Variance Review — shown when variance_detected */}
                                  {payable.matchingStatus === "variance_detected" && payable.status !== "cancelled" && payable.status !== "fully_paid" && (
                                    <ActionIcon
                                      icon={Scale}
                                      tooltip="Review Variance"
                                      onClick={() => handleOpenVarianceReview(payable)}
                                      className="text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                    />
                                  )}

                                  {/* Approve — for pending_approval */}
                                  {payable.status === "pending_approval" && (
                                    <ActionIcon
                                      icon={ShieldCheck}
                                      tooltip="Approve for Payment"
                                      onClick={() => openApprovalDialog(payable.id, 'approve')}
                                      className="text-green-600 hover:text-green-800 hover:bg-green-50"
                                    />
                                  )}

                                  {/* Reject — for pending_approval */}
                                  {payable.status === "pending_approval" && (
                                    <ActionIcon
                                      icon={XCircle}
                                      tooltip="Reject Payable"
                                      onClick={() => openApprovalDialog(payable.id, 'reject')}
                                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                    />
                                  )}

                                  {/* Record Payment — for pending_payment or partially_paid */}
                                  {(payable.status === "pending_payment" || payable.status === "partially_paid") && (
                                    <ActionIcon
                                      icon={CreditCard}
                                      tooltip="Record Payment"
                                      onClick={() => setPaymentDialog({ open: true, payable })}
                                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                    />
                                  )}

                                  {/* Generate Voucher — for fully_paid */}
                                  {payable.status === "fully_paid" && (
                                    <ActionIcon
                                      icon={voucherLoading === payable.id ? Loader2 : Receipt}
                                      tooltip="Generate Voucher"
                                      onClick={() => handleGenerateVoucher(payable.id)}
                                      disabled={voucherLoading === payable.id}
                                      className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                                    />
                                  )}

                                  {/* More actions dropdown — cancel/delete */}
                                  {payable.status !== "fully_paid" && payable.status !== "cancelled" && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                          <MoreHorizontal className="w-3.5 h-3.5" />
                                          <span className="sr-only">More actions</span>
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {payable.status !== "pending_payment" && (
                                          <DropdownMenuItem
                                            className="text-red-600"
                                            onClick={() => openApprovalDialog(payable.id, 'cancel')}
                                          >
                                            <XCircle className="w-4 h-4 me-2" />
                                            Cancel Payable
                                          </DropdownMenuItem>
                                        )}
                                        {(payable.status === "pending_invoice" || payable.status === "draft") && (
                                          <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              className="text-red-600"
                                              onClick={() => handleDeleteClick(payable)}
                                            >
                                              <Trash2 className="w-4 h-4 me-2" />
                                              Delete Payable
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>

                            {/* Expandable Row Detail Panel */}
                            {isExpanded && (
                              <TableRow key={`${payable.id}-expanded`} className="bg-muted/20">
                                <TableCell colSpan={10} className="p-4">
                                  <div className="grid grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <p className="text-xs text-muted-foreground font-medium mb-1">Source Details</p>
                                      <p className="text-xs">{payable.sourceType === 'services' ? 'Service Contract' : 'Purchase Order'}</p>
                                      <p className="text-xs font-mono">{getReference(payable)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground font-medium mb-1">Vendor</p>
                                      <p className="text-xs">{payable.vendorName || "Unknown"}</p>
                                      <p className="text-xs text-muted-foreground">ID: {payable.vendorId || "—"}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground font-medium mb-1">Financial</p>
                                      <p className="text-xs">Amount: <span className="font-semibold">${parseFloat(payable.amount || "0").toLocaleString()}</span></p>
                                      <p className="text-xs">Paid: <span className="font-semibold text-green-700">${parseFloat(payable.paidAmount || "0").toLocaleString()}</span></p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground font-medium mb-1">Timeline</p>
                                      <p className="text-xs">Due: {payable.dueDate ? new Date(payable.dueDate).toLocaleDateString() : "—"}</p>
                                      <p className="text-xs">Created: {payable.createdAt ? new Date(payable.createdAt).toLocaleDateString() : "—"}</p>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                          No payables found matching the current filters
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          className="h-8 w-8 p-0 text-xs"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Invoice Dialog */}
      <InvoiceDialog
        open={invoiceDialog.open}
        onOpenChange={(open) => setInvoiceDialog({ ...invoiceDialog, open })}
        payableId={invoiceDialog.payableId}
        onRefresh={refetch}
      />

      {/* Matching Details Modal (reused from Logistics) */}
      {selectedMatchingData && (
        <MatchingDetailsModal
          open={matchingDetailsOpen}
          onOpenChange={setMatchingDetailsOpen}
          status={selectedMatchingData.status || "pending"}
          discrepancies={selectedMatchingData.discrepancies || []}
          matchingType={selectedMatchingData.matchingType || 'goods'}
          prAmount={selectedMatchingData.prAmount || 0}
          poAmount={selectedMatchingData.poAmount || 0}
          grnAmount={selectedMatchingData.grnAmount || 0}
          contractNumber={selectedMatchingData.contractNumber}
          contractAmount={selectedMatchingData.contractAmount || 0}
          sacNumber={selectedMatchingData.sacNumber}
          sacAmount={selectedMatchingData.sacAmount || 0}
          invoiceNumber={selectedMatchingData.invoiceNumber}
          invoiceAmount={selectedMatchingData.invoiceAmount || 0}
          hasInvoice={selectedMatchingData.hasInvoice || false}
          cumulativeSacPayables={selectedMatchingData.cumulativeSacPayables || 0}
          payableAmount={selectedMatchingData.payableAmount || 0}
          varianceAmount={selectedMatchingData.varianceAmount || 0}
          variancePercentage={selectedMatchingData.variancePercentage || 0}
          language={language as "en" | "ar"}
        />
      )}

      {/* Variance Approval Dialog */}
      <Dialog open={varianceDialog.open} onOpenChange={(open) => setVarianceDialog({ ...varianceDialog, open })}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-600" />
              Variance Review & Approval
            </DialogTitle>
            <DialogDescription>
              A variance has been detected between the expected and invoiced amounts. Review the details below and decide whether to approve or reject the variance.
            </DialogDescription>
          </DialogHeader>

          {varianceDialog.matchingData && (
            <div className="space-y-5">
              {/* Matching Type Badge */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {varianceDialog.matchingData.matchingType === 'services' ? 'Services Matching' : 'Goods 3-Way Matching'}
                </Badge>
                <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50 text-xs gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Variance Detected
                </Badge>
              </div>

              {/* Amounts Comparison */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold">Amount Comparison</h4>
                {varianceDialog.matchingData.matchingType === 'services' ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Contract Amount</p>
                      <p className="font-mono font-medium">${parseFloat(varianceDialog.matchingData.contractAmount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-muted-foreground/70">{varianceDialog.matchingData.contractNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">SAC Amount</p>
                      <p className="font-mono font-medium">${parseFloat(varianceDialog.matchingData.sacAmount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-muted-foreground/70">{varianceDialog.matchingData.sacNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Invoice Amount</p>
                      <p className="font-mono font-medium">${parseFloat(varianceDialog.matchingData.invoiceAmount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-muted-foreground/70">{varianceDialog.matchingData.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Payable Amount</p>
                      <p className="font-mono font-medium">${parseFloat(varianceDialog.matchingData.payableAmount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">PR Amount</p>
                      <p className="font-mono font-medium">${parseFloat(varianceDialog.matchingData.prAmount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">PO Amount</p>
                      <p className="font-mono font-medium">${parseFloat(varianceDialog.matchingData.poAmount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">GRN Accepted Amount</p>
                      <p className="font-mono font-medium">${parseFloat(varianceDialog.matchingData.grnAmount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Payable Amount</p>
                      <p className="font-mono font-medium">${parseFloat(varianceDialog.matchingData.payableAmount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                )}

                {/* Variance highlight */}
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-red-700">Variance Amount</span>
                    <span className="font-mono font-bold text-red-700 text-lg">
                      ${Math.abs(parseFloat(varianceDialog.matchingData.variance || '0')).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      <span className="text-xs ms-1">({parseFloat(varianceDialog.matchingData.variancePercentage || '0').toFixed(2)}%)</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Discrepancies */}
              {varianceDialog.matchingData.discrepancies?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Discrepancies</h4>
                  <div className="space-y-1">
                    {varianceDialog.matchingData.discrepancies.map((disc: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-sm bg-red-50 border border-red-100 rounded p-2">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-red-800">{disc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Decision Section */}
              <div className="border-t pt-4 space-y-4">
                <h4 className="text-sm font-semibold">Decision</h4>
                <div className="flex gap-3">
                  <Button
                    variant={varianceAction === 'approve' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVarianceAction('approve')}
                    className={varianceAction === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                  >
                    <ShieldCheck className="w-4 h-4 me-1" />
                    Approve Variance
                  </Button>
                  <Button
                    variant={varianceAction === 'reject' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setVarianceAction('reject')}
                  >
                    <XCircle className="w-4 h-4 me-1" />
                    Reject Variance
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="varianceComments">
                    Comments {varianceAction === 'reject' ? <span className="text-red-500">*</span> : '(optional)'}
                  </Label>
                  <Textarea
                    id="varianceComments"
                    placeholder={varianceAction === 'approve'
                      ? "Optional: Explain why the variance is acceptable..."
                      : "Required: Explain why the variance is rejected..."
                    }
                    value={varianceComments}
                    onChange={(e) => setVarianceComments(e.target.value)}
                    className="min-h-24"
                  />
                </div>

                {/* Info box */}
                <div className="flex gap-2 p-3 rounded-lg border text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                  <div className="text-muted-foreground">
                    {varianceAction === 'approve' ? (
                      <span><strong>Approve</strong> will accept the variance and move the payable to <strong>Ready for Payment</strong> status. The matching status will be updated to <strong>Matched</strong>.</span>
                    ) : (
                      <span><strong>Reject</strong> will send the invoice back for re-submission. The payable will return to <strong>Pending Invoice</strong> status.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setVarianceDialog({ open: false })} disabled={reviewVarianceMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitVarianceReview}
              disabled={reviewVarianceMutation.isPending || (varianceAction === 'reject' && !varianceComments.trim())}
              className={varianceAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {reviewVarianceMutation.isPending ? (
                <><Loader2 className="w-4 h-4 me-2 animate-spin" />Processing...</>
              ) : varianceAction === 'approve' ? (
                <><ShieldCheck className="w-4 h-4 me-2" />Approve Variance</>
              ) : (
                <><XCircle className="w-4 h-4 me-2" />Reject Variance</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Recording Dialog */}
      {paymentDialog.payable && (
        <PaymentRecordingDialog
          open={paymentDialog.open}
          onOpenChange={(open) => setPaymentDialog({ ...paymentDialog, open })}
          payableId={paymentDialog.payable.id}
          payableAmount={parseFloat(paymentDialog.payable.amount || "0")}
          paidAmount={parseFloat(paymentDialog.payable.paidAmount || "0")}
          payableNumber={paymentDialog.payable.prNumber}
          vendorName={paymentDialog.payable.vendorName}
          onSuccess={() => {
            setPaymentDialog({ open: false });
            refetch();
          }}
        />
      )}

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedPayables.size} Payable(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedPayables.size} payable(s)?
              <br /><br />
              Total Amount: <strong>${payables?.filter(p => selectedPayables.has(p.id)).reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkDeleteMutation.isPending ? (
                <><Loader2 className="w-4 h-4 me-2 animate-spin" />Deleting...</>
              ) : "Delete All"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payable</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete payable <strong>#{selectedPayableForDelete?.id}</strong>?
              <br /><br />
              Amount: <strong>${parseFloat(selectedPayableForDelete?.amount || "0").toLocaleString()}</strong>
              <br />
              Status: <strong>{selectedPayableForDelete?.status}</strong>
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deletePayableMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletePayableMutation.isPending ? (
                <><Loader2 className="w-4 h-4 me-2 animate-spin" />Deleting...</>
              ) : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approval Action Dialog */}
      <AlertDialog open={approvalDialog.open} onOpenChange={(open) => setApprovalDialog({ ...approvalDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {approvalDialog.action === 'approve' && 'Approve Payable for Payment'}
              {approvalDialog.action === 'reject' && 'Reject Payable'}
              {approvalDialog.action === 'cancel' && 'Cancel Payable'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {approvalDialog.action === 'approve' && 'This will approve the payable and move it to "Ready for Payment" status. The finance team can then record the payment.'}
              {approvalDialog.action === 'reject' && 'Are you sure you want to reject this payable? The invoice will need to be resubmitted by Logistics.'}
              {approvalDialog.action === 'cancel' && 'Are you sure you want to cancel this payable? This action cannot be easily undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {(approvalDialog.action === 'reject' || approvalDialog.action === 'cancel') && (
            <div className="py-4">
              <label className="text-sm font-medium">Reason {approvalDialog.action === 'reject' ? '(required)' : '(optional)'}</label>
              <Input
                placeholder="Enter reason..."
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                className="mt-2"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprovalAction}
              disabled={
                statusUpdateMutation.isPending ||
                rejectPayableMutation.isPending ||
                cancelPayableMutation.isPending ||
                (approvalDialog.action === 'reject' && !approvalReason.trim())
              }
              className={approvalDialog.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {(statusUpdateMutation.isPending || rejectPayableMutation.isPending || cancelPayableMutation.isPending) ? (
                <><Loader2 className="w-4 h-4 me-2 animate-spin" />Processing...</>
              ) : (
                <>
                  {approvalDialog.action === 'approve' && 'Approve'}
                  {approvalDialog.action === 'reject' && 'Reject'}
                  {approvalDialog.action === 'cancel' && 'Cancel Payable'}
                </>
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


/**
 * Invoice Dialog Component
 * Displays invoice details uploaded in Logistics with matching info
 */
function InvoiceDialog({ open, onOpenChange, payableId, onRefresh }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payableId?: number;
  onRefresh?: () => void;
}) {
  const { t } = useTranslation();
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data: invoice, isLoading, error } = trpc.prFinance.getInvoiceByPayableId.useQuery(
    { payableId: payableId || 0 },
    { enabled: open && !!payableId }
  );

  const { data: auditTrail } = trpc.prFinance.getInvoiceAuditTrail.useQuery(
    { invoiceId: invoice?.id || 0 },
    { enabled: open && !!invoice?.id }
  );

  const rejectMutation = trpc.prFinance.rejectInvoice.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowRejectForm(false);
      setRejectReason("");
      onOpenChange(false);
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message || "Failed to reject invoice"),
  });

  const handleRejectInvoice = async () => {
    if (!invoice || !rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    await rejectMutation.mutateAsync({
      invoiceId: invoice.id,
      reason: rejectReason,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Details</DialogTitle>
          <DialogDescription>Invoice information uploaded by Logistics</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error.message || "Failed to load invoice details"}</p>
          </div>
        ) : !invoice ? (
          <div className="bg-gray-50 border rounded-lg p-6 text-center">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No invoice uploaded yet for this payable.</p>
            <p className="text-xs text-muted-foreground mt-1">Logistics team needs to upload the invoice first.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Invoice Number</p>
                <p className="font-medium">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendor Invoice Number</p>
                <p className="font-medium">{invoice.vendorInvoiceNumber || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Invoice Date</p>
                <p className="font-medium">
                  {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Invoice Amount</p>
                <p className="font-medium">
                  {invoice.currency} {parseFloat(invoice.invoiceAmount as any).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Matching Status</p>
                {invoice.matchingStatus === "matched" ? (
                  <Badge className="bg-green-100 text-green-800 border-green-300" variant="outline">
                    <ShieldCheck className="w-3 h-3 me-1" />Matched
                  </Badge>
                ) : invoice.matchingStatus === "variance_detected" ? (
                  <Badge className="bg-red-100 text-red-800 border-red-300" variant="outline">
                    <AlertCircle className="w-3 h-3 me-1" />Mismatch
                  </Badge>
                ) : (
                  <Badge variant="outline">{invoice.matchingStatus}</Badge>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approval Status</p>
                <Badge variant="outline">{invoice.approvalStatus}</Badge>
              </div>
            </div>

            {invoice.invoiceDocumentUrl && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Invoice Document</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(invoice.invoiceDocumentUrl, "_blank")}
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Document
                </Button>
              </div>
            )}

            {invoice.varianceReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-900">Variance Detected</p>
                <p className="text-sm text-red-800 mt-1">{invoice.varianceReason}</p>
                {invoice.varianceAmount && (
                  <p className="text-sm text-red-800 mt-1">
                    Variance Amount: {invoice.currency} {parseFloat(invoice.varianceAmount as any).toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* Rejection Form */}
            {invoice.approvalStatus !== "rejected" && (
              <div className="border-t pt-4">
                {!showRejectForm ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowRejectForm(true)}
                    className="gap-2"
                  >
                    Reject Invoice
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Rejection Reason</label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Please provide a reason for rejection..."
                        className="w-full mt-1 p-2 border rounded-md text-sm"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleRejectInvoice}
                        disabled={rejectMutation.isPending || !rejectReason.trim()}
                        className="gap-2"
                      >
                        {rejectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Confirm Rejection
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audit Trail */}
            {auditTrail && auditTrail.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Activity History</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {auditTrail.map((entry) => (
                    <div key={entry.id} className="text-xs bg-gray-50 p-2 rounded">
                      <div className="flex justify-between">
                        <span className="font-medium capitalize">{entry.action.replace(/_/g, " ")}</span>
                        <span className="text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{entry.actionByName}</p>
                      {entry.reason && <p className="text-red-700 mt-1">{entry.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/**
 * Payment Recording Dialog (Finance)
 * Records payment for approved payables with S3 proof upload
 */
function PaymentRecordingDialog({ open, onOpenChange, payableId, payableAmount, paidAmount, payableNumber, vendorName, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payableId: number;
  payableAmount: number;
  paidAmount: number;
  payableNumber?: string;
  vendorName?: string;
  onSuccess?: () => void;
}) {
  const remainingAmount = payableAmount - paidAmount;
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "bank_transfer",
    referenceNumber: "",
    amount: remainingAmount.toFixed(2),
    remarks: "",
  });

  const recordPaymentMutation = trpc.prFinance.recordPayment.useMutation({
    onSuccess: (result) => {
      if (result && result.success === false) {
        toast.error(result.message || "Payment recording failed");
        return;
      }
      toast.success(result?.message || "Payment recorded successfully");
      setFormData({
        paymentDate: new Date().toISOString().split("T")[0],
        paymentMethod: "bank_transfer",
        referenceNumber: "",
        amount: remainingAmount.toFixed(2),
        remarks: "",
      });
      setUploadedFile(null);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to record payment");
      console.error("Payment recording error:", error);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["application/pdf", "image/jpeg", "image/png"];
      if (!validTypes.includes(file.type)) {
        toast.error("Only PDF and image files are allowed");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setUploadedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.paymentDate || !formData.paymentMethod || !formData.referenceNumber || !formData.amount) {
      toast.error("Please fill all required fields");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (amount <= 0) {
      toast.error("Payment amount must be greater than zero");
      return;
    }
    if (amount > remainingAmount + 0.01) {
      toast.error(`Payment amount ($${amount.toFixed(2)}) exceeds remaining balance ($${remainingAmount.toFixed(2)})`);
      return;
    }

    setIsLoading(true);
    try {
      await recordPaymentMutation.mutateAsync({
        payableId,
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod as "bank_transfer" | "cheque" | "cash" | "wire",
        referenceNumber: formData.referenceNumber,
        amount: amount,
        remarks: formData.remarks,
        proofFileUrl: uploadedFile ? URL.createObjectURL(uploadedFile) : undefined,
      });
    } catch (error) {
      console.error("Error recording payment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>Record a payment for this payable</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payable Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">PR Number</p>
                  <p className="font-semibold text-sm">{payableNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vendor</p>
                  <p className="font-semibold text-sm">{vendorName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="font-semibold text-lg text-blue-600">${payableAmount.toFixed(2)}</p>
                </div>
              </div>
              {paidAmount > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Already Paid</p>
                    <p className="font-semibold text-sm text-green-700">${paidAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining Balance</p>
                    <p className="font-semibold text-sm text-orange-700">${remainingAmount.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentDate">
                  Payment Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">
                  Payment Method <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                >
                  <SelectTrigger id="paymentMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="wire">Wire Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="referenceNumber">
                  Reference Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="referenceNumber"
                  placeholder="Enter reference number"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  max={remainingAmount}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Add additional remarks..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="min-h-20"
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Payment Proof (optional)</Label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {uploadedFile ? (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">{uploadedFile.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-6 h-6 mx-auto text-gray-400" />
                    <p className="text-sm text-gray-600">Click or drag to upload payment proof</p>
                    <p className="text-xs text-muted-foreground">PDF or images up to 10MB</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info Alert */}
          <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Verify all payment details before recording. Payment cannot be edited after recording.
              A payment voucher will be auto-generated once the payable is fully paid.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 me-2 animate-spin" />Recording...</>
            ) : (
              <><CreditCard className="w-4 h-4 me-2" />Record Payment</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
