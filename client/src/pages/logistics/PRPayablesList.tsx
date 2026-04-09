/**
 * PR Payables List Page
 * Displays all payables for a specific Purchase Request
 * Filtered view from Finance Payables module
 * Supports: Invoice upload, 3-way matching, payment tracking
 */

import { useState, useEffect, useCallback } from "react";
import { InvoiceUploadDialog } from "./InvoiceUploadDialog";
import { MatchingStatusBadge, MatchingDetailsModal } from "./MatchingStatusBadge";
// PaymentRecordingDialog moved to Finance Payables Management
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
 ArrowLeft,
 ArrowRight,
 Upload,
 Download,
 Eye,
 Edit2,
 Trash2,
 Plus,
 Search,
 Filter,
 Calendar,
 DollarSign,
 CheckCircle,
 Clock,
 AlertCircle,
 Loader2,
 FileText,
 AlertTriangle,
} from "lucide-react";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

interface PRPayablesListProps {}

export default function PRPayablesList() {
 const { t } = useTranslation();
 const { currentOrganizationId } = useOrganization();
 const { language, isRTL} = useLanguage();
 const [location] = useLocation();
 const [searchParams] = useState(() => new URLSearchParams(window.location.search));
 const prId = searchParams.get("prId");
 const prDbId = searchParams.get("prDbId");
 const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
 const [selectedPayable, setSelectedPayable] = useState<any>(null);
 const [matchingDetailsOpen, setMatchingDetailsOpen] = useState(false);
 const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

 const [selectedPayables, setSelectedPayables] = useState<Set<string>>(new Set());
 const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);
 const [resubmitDialogOpen, setResubmitDialogOpen] = useState(false);
 const [selectedInvoiceForResubmit, setSelectedInvoiceForResubmit] = useState<any>(null);
 const [resubmitNotes, setResubmitNotes] = useState("");
 const [editingDueDatePayableId, setEditingDueDatePayableId] = useState<number | null>(null);
 const [editingDueDateValue, setEditingDueDateValue] = useState("");

 // Use tRPC utils for imperative queries (goes through configured client with scope headers)
 const utils = trpc.useUtils();

 // Translations
 const localT = t.prPayables;

 // Fetch payables for this PR
 const { data: payablesList, isLoading, refetch } = trpc.prFinance.getPayablesList.useQuery(
 { status: undefined, vendorSearch: undefined, dateFrom: undefined, dateTo: undefined },
 { enabled: !!currentOrganizationId }
 );

 // Update due date mutation
 const updateDueDateMutation = trpc.prFinance.updatePayableDueDate.useMutation({
   onSuccess: () => {
     toast.success(isRTL ? 'تم تحديث تاريخ الاستحقاق' : 'Due date updated successfully');
     setEditingDueDatePayableId(null);
     setEditingDueDateValue("");
     refetch();
   },
   onError: (error) => {
     toast.error(error.message || (isRTL ? 'فشل تحديث تاريخ الاستحقاق' : 'Failed to update due date'));
   },
 });

 const handleDueDateSave = (payableId: number) => {
   if (!editingDueDateValue) return;
   updateDueDateMutation.mutate({
     payableId,
     dueDate: editingDueDateValue, // Send YYYY-MM-DD directly to avoid timezone shifts
   });
 };

 // Bulk delete mutation
 const bulkDeleteMutation = trpc.prFinance.bulkDeletePayables.useMutation({
 onSuccess: () => {
 toast.success(`${selectedPayables.size} payable(s) deleted successfully`);
 setSelectedPayables(new Set());
 setBulkDeleteDialogOpen(false);
 refetch();
 },
 onError: (error) => {
 toast.error(error.message || "Failed to delete payables");
 },
 });

 // Generate payables from approved SACs mutation
 const generatePayablesMutation = trpc.prFinance.generatePayablesFromSAC.useMutation({
 onSuccess: (data) => {
 if (data.payablesCreated > 0) {
 toast.success(isRTL ? `تم إنشاء ${data.payablesCreated} مستحق(ات) بنجاح` : `${data.payablesCreated} payable(s) generated successfully`);
 } else {
 toast.info(isRTL ? 'لا توجد مستحقات جديدة لإنشائها' : 'No new payables to generate');
 }
 if (data.errors && data.errors.length > 0) {
 data.errors.forEach(err => toast.error(err));
 }
 refetch();
 },
 onError: (error) => {
 toast.error(error.message || (isRTL ? 'فشل إنشاء المستحقات' : 'Failed to generate payables'));
 },
 });

 // Filter payables by PR
 const prPayables = payablesList?.filter(p => p.prNumber === prId) || [];

 // Get deletable payables (only pending_invoice status)
 const deletablePayables = prPayables.filter(p => p.status === "pending_invoice");

 // Handle checkbox changes
 const handleSelectPayable = (payableId: string) => {
 const newSelected = new Set(selectedPayables);
 if (newSelected.has(payableId)) {
 newSelected.delete(payableId);
 } else {
 newSelected.add(payableId);
 }
 setSelectedPayables(newSelected);
 };

 // Handle select all
 const handleSelectAll = () => {
 if (selectedPayables.size === deletablePayables.length) {
 setSelectedPayables(new Set());
 } else {
 setSelectedPayables(new Set(deletablePayables.map(p => p.id)));
 }
 };

 // Handle bulk delete
 const handleBulkDelete = async () => {
 setIsDeleting(true);
 try {
 await bulkDeleteMutation.mutateAsync({
 payableIds: Array.from(selectedPayables),
 });
 } finally {
 setIsDeleting(false);
 }
 };

 // Calculate total amount for selected payables
 const selectedTotal = Array.from(selectedPayables).reduce((sum, id) => {
 const payable = prPayables.find(p => p.id === id);
 return sum + (payable ? parseFloat(payable.amount || "0") : 0);
 }, 0);

 // Calculate totals
 const totalAmount = prPayables.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
  const statusCounts = {
  pending_invoice: prPayables.filter(p => p.status === "pending_invoice").length,
  pending_approval: prPayables.filter(p => p.status === "pending_approval").length,
  approved: prPayables.filter(p => p.status === "approved").length,
  paid: prPayables.filter(p => p.status === "paid" || p.status === "fully_paid" || p.status === "partially_paid").length,
  };

 // Check if any payables have contract exceeded warning
 const hasContractExceeded = prPayables.some((p: any) => p.contractExceeded);
 const servicesPayables = prPayables.filter((p: any) => p.sourceType === 'services');
 const goodsPayables = prPayables.filter((p: any) => p.sourceType === 'goods');
 const hasServicePayables = servicesPayables.length > 0;
 const hasGoodsPayables = goodsPayables.length > 0;

 // Status badge color mapping
  const getStatusColor = (status: string) => {
  switch (status) {
  case "pending_invoice":
  return "bg-orange-100 text-orange-800";
  case "pending_approval":
  return "bg-yellow-100 text-yellow-800";
  case "pending_payment":
  return "bg-blue-100 text-blue-800";
  case "approved":
  return "bg-blue-100 text-blue-800";
  case "paid":
  case "fully_paid":
  return "bg-green-100 text-green-800";
  case "partially_paid":
  return "bg-teal-100 text-teal-800";
  case "cancelled":
  return "bg-red-100 text-red-800";
  default:
 return "bg-gray-100 text-gray-800";
 }
 };

  const getStatusLabel = (status: string) => {
  switch (status) {
  case "pending_invoice":
  return localT.pendingInvoice;
  case "pending_approval":
  return localT.pendingApproval;
  case "pending_payment":
  return language === 'ar' ? 'في انتظار الدفع' : 'Pending Payment';
  case "approved":
  return localT.approved;
  case "paid":
  case "fully_paid":
  return localT.paid;
  case "partially_paid":
  return language === 'ar' ? 'مدفوع جزئياً' : 'Partially Paid';
  case "cancelled":
  return language === 'ar' ? 'ملغى' : 'Cancelled';
  default:
  return status;
  }
  };

  const getStatusIcon = (status: string) => {
  switch (status) {
  case "pending_invoice":
  return <AlertCircle className="w-4 h-4" />;
  case "pending_approval":
  case "pending_payment":
  return <Clock className="w-4 h-4" />;
  case "approved":
  return <CheckCircle className="w-4 h-4" />;
  case "paid":
  case "fully_paid":
  return <CheckCircle className="w-4 h-4" />;
  case "partially_paid":
  return <Clock className="w-4 h-4" />;
  case "cancelled":
  return <AlertCircle className="w-4 h-4" />;
  default:
  return null;
  }
  };

 return (
 <div className={`min-h-screen bg-gray-50`} dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="max-w-7xl mx-auto p-6">
 {/* Header */}
 <div className="mb-6">
 <BackButton onClick={() => window.history.back()} label={localT.backToPR} />

 <div className="mb-6">
 <h1 className="text-3xl font-bold text-gray-900 mb-2">{localT.title}</h1>
 <p className="text-gray-600">{localT.subtitle}</p>
 </div>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
 <p className="text-sm text-gray-600">{localT.totalAmount}</p>
 <p className="text-2xl font-bold text-gray-900">${totalAmount.toLocaleString()}</p>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <AlertCircle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
 <p className="text-sm text-gray-600">{localT.pendingInvoice}</p>
 <p className="text-2xl font-bold text-gray-900">{statusCounts.pending_invoice}</p>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
 <p className="text-sm text-gray-600">{localT.pendingApproval}</p>
 <p className="text-2xl font-bold text-gray-900">{statusCounts.pending_approval}</p>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <CheckCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
 <p className="text-sm text-gray-600">{localT.approved}</p>
 <p className="text-2xl font-bold text-gray-900">{statusCounts.approved}</p>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardContent className="pt-6">
 <div className="text-center">
 <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
 <p className="text-sm text-gray-600">{localT.paid}</p>
 <p className="text-2xl font-bold text-gray-900">{statusCounts.paid}</p>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Contract Value Warning Banner */}
 {hasContractExceeded && (
 <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6 flex items-start gap-3">
 <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
 <div>
 <p className="text-sm font-semibold text-amber-900">
 {isRTL ? 'تحذير: تجاوز قيمة العقد' : 'Warning: Contract Value Exceeded'}
 </p>
 <p className="text-sm text-amber-800 mt-1">
 {isRTL
 ? 'إجمالي المستحقات المتراكمة لشهادات القبول يتجاوز قيمة العقد الإجمالية. يرجى مراجعة المبالغ قبل المتابعة.'
 : 'Cumulative SAC payables exceed the total contract value. Please review the amounts before proceeding with payment.'}
 </p>
 {servicesPayables.filter((p: any) => p.contractExceeded).map((p: any) => (
 <div key={`warn-${p.id}`} className="mt-2 text-xs text-amber-700 bg-amber-100 rounded px-2 py-1 inline-block">
 {isRTL ? 'العقد' : 'Contract'}: {p.contractNumber} | 
 {isRTL ? ' قيمة العقد' : ' Contract Value'}: ${parseFloat(p.contractValue || '0').toLocaleString()} | 
 {isRTL ? ' إجمالي المستحقات' : ' Cumulative Payables'}: ${parseFloat(p.cumulativePayables || '0').toLocaleString()}
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Payables Table */}
 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <CardTitle>{localT.totalPayables}</CardTitle>
 {selectedPayables.size > 0 && (
 <Button
 variant="destructive"
 size="sm"
 className="gap-2"
 onClick={() => setBulkDeleteDialogOpen(true)}
 >
 <Trash2 className="w-4 h-4" />
 Delete {selectedPayables.size}
 </Button>
 )}
 </div>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <div className="text-center py-8">
 <p className="text-gray-600">Loading payables...</p>
 </div>
 ) : prPayables.length === 0 ? (
 <div className="text-center py-12">
 <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
 <p className="text-lg font-medium text-gray-700 mb-2">{localT.noPayables}</p>
 <p className="text-sm text-gray-500 mb-6">
 {isRTL ? 'يمكنك إنشاء المستحقات من شهادات القبول المعتمدة' : 'You can generate payables from approved acceptance certificates'}
 </p>
 {prDbId && (
 <Button
 onClick={() => generatePayablesMutation.mutate({ purchaseRequestId: parseInt(prDbId) })}
 disabled={generatePayablesMutation.isPending}
 className="gap-2"
 >
 {generatePayablesMutation.isPending ? (
 <Loader2 className="w-4 h-4 animate-spin" />
 ) : (
 <Plus className="w-4 h-4" />
 )}
 {isRTL ? 'إنشاء المستحقات من شهادات القبول' : 'Generate Payables from SAC'}
 </Button>
 )}
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b border-gray-200">
 <th className="text-start py-3 px-4 font-semibold text-gray-900 w-12">
 <Checkbox
 checked={selectedPayables.size === deletablePayables.length && deletablePayables.length > 0}
 indeterminate={selectedPayables.size > 0 && selectedPayables.size < deletablePayables.length}
 onCheckedChange={handleSelectAll}
 disabled={deletablePayables.length === 0}
 />
 </th>
 <th className="text-start py-3 px-4 font-semibold text-gray-900">{localT.payableID}</th>
 <th className="text-start py-3 px-4 font-semibold text-gray-900">{isRTL ? 'المصدر' : 'Source'}</th>
 <th className="text-start py-3 px-4 font-semibold text-gray-900">{isRTL ? 'المرجع' : 'Reference'}</th>
 <th className="text-start py-3 px-4 font-semibold text-gray-900">{localT.vendor}</th>
 <th className="text-end py-3 px-4 font-semibold text-gray-900">{localT.amount}</th>
 <th className="text-start py-3 px-4 font-semibold text-gray-900">{localT.dueDate}</th>
 <th className="text-center py-3 px-4 font-semibold text-gray-900">{localT.status}</th>
 <th className="text-center py-3 px-4 font-semibold text-gray-900">Matching</th>
 <th className="text-center py-3 px-4 font-semibold text-gray-900">{localT.actions}</th>
 </tr>
 </thead>
 <tbody>
 {prPayables.map((payable) => (
 <tr key={payable.id} className="border-b border-gray-100 hover:bg-gray-50">
 <td className="py-3 px-4">
 {payable.status === "pending_invoice" && (
 <Checkbox
 checked={selectedPayables.has(payable.id)}
 onCheckedChange={() => handleSelectPayable(payable.id)}
 />
 )}
 </td>
 <td className="py-3 px-4 text-gray-900 font-medium">{payable.payableId}</td>
 <td className="py-3 px-4">
 {(payable as any).sourceType === 'services' ? (
 <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1 w-fit">
 <FileText className="w-3 h-3" />
 {isRTL ? 'خدمات' : 'Services'}
 </Badge>
 ) : (
 <Badge className="bg-teal-100 text-teal-800 flex items-center gap-1 w-fit">
 {isRTL ? 'سلع/أعمال' : 'Goods/Works'}
 </Badge>
 )}
 </td>
 <td className="py-3 px-4 text-gray-600 text-sm">
 {(payable as any).sourceType === 'services' ? (
 <div className="space-y-0.5">
 {(payable as any).contractNumber && (
 <div className="flex items-center gap-1">
 <span className="text-gray-400">{isRTL ? 'عقد:' : 'CTR:'}</span>
 <span className="font-medium text-gray-700">{(payable as any).contractNumber}</span>
 </div>
 )}
 {(payable as any).sacNumber && (
 <div className="flex items-center gap-1">
 <span className="text-gray-400">{isRTL ? 'شهادة:' : 'SAC:'}</span>
 <span className="font-medium text-gray-700">{(payable as any).sacNumber}</span>
 </div>
 )}
 {(payable as any).contractExceeded && (
 <div className="flex items-center gap-1 text-amber-600">
 <AlertTriangle className="w-3 h-3" />
 <span className="text-xs font-medium">{isRTL ? 'تجاوز العقد' : 'Over contract'}</span>
 </div>
 )}
 </div>
 ) : (
 <div className="space-y-0.5">
 {payable.poNumber && (
 <div className="flex items-center gap-1">
 <span className="text-gray-400">{isRTL ? 'أمر:' : 'PO:'}</span>
 <span className="font-medium text-gray-700">{payable.poNumber}</span>
 </div>
 )}
 {payable.grnNumber && (
 <div className="flex items-center gap-1">
 <span className="text-gray-400">{isRTL ? 'استلام:' : 'GRN:'}</span>
 <span className="font-medium text-gray-700">{payable.grnNumber}</span>
 </div>
 )}
 </div>
 )}
 </td>
 <td className="py-3 px-4 text-gray-600">{payable.vendorName}</td>
 <td className="py-3 px-4 text-end text-gray-900 font-medium">
 ${parseFloat(payable.amount || "0").toLocaleString()}
 </td>
 <td className="py-3 px-4 text-gray-600">
 {editingDueDatePayableId === payable.id ? (
   <div className="flex items-center gap-1">
     <Input
       type="date"
       value={editingDueDateValue}
       onChange={(e) => setEditingDueDateValue(e.target.value)}
       className="h-7 text-xs w-32"
     />
     <Button
       size="sm"
       variant="ghost"
       className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
       onClick={() => handleDueDateSave(payable.id)}
       disabled={updateDueDateMutation.isPending}
     >
       <CheckCircle className="h-3.5 w-3.5" />
     </Button>
     <Button
       size="sm"
       variant="ghost"
       className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
       onClick={() => { setEditingDueDatePayableId(null); setEditingDueDateValue(""); }}
     >
       ×
     </Button>
   </div>
 ) : (
   <button
     className="flex items-center gap-1 hover:text-primary cursor-pointer text-start"
     onClick={() => {
       setEditingDueDatePayableId(payable.id);
       setEditingDueDateValue(payable.dueDate ? new Date(payable.dueDate).toISOString().split('T')[0] : '');
     }}
     title={isRTL ? 'انقر لتعديل تاريخ الاستحقاق' : 'Click to edit due date'}
   >
     {payable.dueDate ? new Date(payable.dueDate).toLocaleDateString() : '—'}
     <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50" />
   </button>
 )}
 </td>
 <td className="py-3 px-4 text-center">
 <Badge className={`${getStatusColor(payable.status)} flex items-center gap-1 w-fit mx-auto`}>
 {getStatusIcon(payable.status)}
 {getStatusLabel(payable.status)}
 </Badge>
 </td>
 <td className="py-3 px-4 text-center">
 <button
 onClick={async () => {
 try {
 const matchingData = await utils.prFinance.getMatchingData.fetch({ payableId: payable.id });
 const isServices = matchingData.matchingType === 'services';
 setSelectedInvoice({
 status: (matchingData as any).matchingStatus || (parseFloat(matchingData.variance) === 0 ? "matched" : "variance_detected"),
 discrepancies: matchingData.discrepancies || [],
 matchingType: matchingData.matchingType || 'goods',
 // Goods fields
 prAmount: parseFloat(matchingData.prAmount),
 poAmount: parseFloat(matchingData.poAmount),
 grnAmount: parseFloat((matchingData as any).grnAmount || matchingData.grnAcceptedAmount || '0'),
 // Services fields
 contractNumber: (matchingData as any).contractNumber,
 contractAmount: parseFloat((matchingData as any).contractAmount || '0'),
 sacNumber: (matchingData as any).sacNumber,
 sacAmount: parseFloat((matchingData as any).sacAmount || '0'),
 invoiceNumber: (matchingData as any).invoiceNumber,
 invoiceAmount: parseFloat((matchingData as any).invoiceAmount || '0'),
 hasInvoice: (matchingData as any).hasInvoice || false,
 cumulativeSacPayables: parseFloat((matchingData as any).cumulativeSacPayables || '0'),
 // Common fields
 payableAmount: parseFloat(matchingData.payableAmount),
 varianceAmount: parseFloat(matchingData.variance),
 variancePercentage: parseFloat(matchingData.variancePercentage),
 });
 setMatchingDetailsOpen(true);
 } catch (error) {
 toast.error("Failed to load matching details");
 console.error(error);
 }
 }}
 className="hover:opacity-80 transition-opacity"
 >
 <MatchingStatusBadge
 status={(payable as any).matchingStatus || "pending"}
 language={language as "en" | "ar"}
 size="sm"
 />
 </button>
 </td>
 <td className="py-3 px-4 text-center">
 <div className="flex gap-2 justify-center">
 <Button 
 variant="ghost" 
 size="sm" 
 className="gap-1"
 onClick={() => {
 setSelectedPayable(payable);
 setUploadDialogOpen(true);
 }}
 >
 <Upload className="w-4 h-4" />
 {localT.uploadInvoice}
 </Button>

 {payable.approvalStatus === "rejected" && (
 <Button 
 variant="outline" 
 size="sm" 
 className="gap-1 text-orange-600"
 onClick={() => {
 setSelectedInvoiceForResubmit(payable);
 setResubmitDialogOpen(true);
 }}
 >
 <ArrowRight className="w-4 h-4" />
 Resubmit
 </Button>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Invoice Upload Dialog */}
 {selectedPayable && (
 <InvoiceUploadDialog
 open={uploadDialogOpen}
 onOpenChange={setUploadDialogOpen}
 prId={selectedPayable.purchaseRequestId}
 poId={selectedPayable.purchaseOrderId || 0}
 grnId={selectedPayable.grnId || 0}
 vendorId={selectedPayable.vendorId}
 organizationId={selectedPayable.organizationId || currentOrganizationId || 0}
 operatingUnitId={selectedPayable.operatingUnitId}
 payableId={selectedPayable.id}
 sourceType={selectedPayable.sourceType || 'goods'}
 onSuccess={() => {
 refetch();
 }}
 />
 )}

 {/* Matching Details Modal */}
 {selectedInvoice && (
 <MatchingDetailsModal
 open={matchingDetailsOpen}
 onOpenChange={setMatchingDetailsOpen}
 status={selectedInvoice.status || "pending"}
 discrepancies={selectedInvoice.discrepancies || []}
 matchingType={selectedInvoice.matchingType || 'goods'}
 // Goods fields
 prAmount={selectedInvoice.prAmount || 0}
 poAmount={selectedInvoice.poAmount || 0}
 grnAmount={selectedInvoice.grnAmount || 0}
 // Services fields
 contractNumber={selectedInvoice.contractNumber}
 contractAmount={selectedInvoice.contractAmount || 0}
 sacNumber={selectedInvoice.sacNumber}
 sacAmount={selectedInvoice.sacAmount || 0}
 invoiceNumber={selectedInvoice.invoiceNumber}
 invoiceAmount={selectedInvoice.invoiceAmount || 0}
 hasInvoice={selectedInvoice.hasInvoice || false}
 cumulativeSacPayables={selectedInvoice.cumulativeSacPayables || 0}
 // Common fields
 payableAmount={selectedInvoice.payableAmount || 0}
 varianceAmount={selectedInvoice.varianceAmount || 0}
 variancePercentage={selectedInvoice.variancePercentage || 0}
 language={language as "en" | "ar"}
 />
 )}



 {/* Bulk Delete Confirmation Dialog */}
 <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Delete {selectedPayables.size} Payable(s)?</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div className="bg-red-50 border border-red-200 rounded-lg p-4">
 <p className="text-sm text-red-900 font-medium">This action cannot be undone.</p>
 <p className="text-sm text-red-700 mt-2">
 You are about to delete {selectedPayables.size} payable(s) with a total amount of ${selectedTotal.toLocaleString()}.
 </p>
 </div>
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <p className="text-sm text-blue-900">
 Only payables with "Pending Invoice" status can be deleted. Approved and paid payables are protected.
 </p>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)} disabled={isDeleting}>
 Cancel
 </Button>
 <Button
 variant="destructive"
 onClick={handleBulkDelete}
 disabled={isDeleting}
 className="gap-2"
 >
 {isDeleting ? (
 <>
 <AlertCircle className="w-4 h-4 animate-spin" />
 Deleting...
 </>
 ) : (
 <>
 <Trash2 className="w-4 h-4" />
 Delete {selectedPayables.size} Payable(s)
 </>
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Resubmit Invoice Dialog */}
 <ResubmitInvoiceDialog
 open={resubmitDialogOpen}
 onOpenChange={setResubmitDialogOpen}
 invoice={selectedInvoiceForResubmit}
 notes={resubmitNotes}
 onNotesChange={setResubmitNotes}
 />
 </div>
 </div>
 );
}

/**
 * Resubmit Invoice Dialog Component
 * Allows Logistics to resubmit rejected invoices
 */
function ResubmitInvoiceDialog({
 open,
 onOpenChange,
 invoice,
 notes,
 onNotesChange,
}: {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 invoice: any;
 notes: string;
 onNotesChange: (notes: string) => void;
}) {
 const { language, isRTL } = useLanguage();
 const { t } = useTranslation();
 const resubmitMutation = trpc.prFinance.resubmitInvoice.useMutation({
 onSuccess: (data) => {
 toast.success(data.message);
 onNotesChange("");
 onOpenChange(false);
 },
 onError: (error) => {
 toast.error(error.message || "Failed to resubmit invoice");
 },
 });

 const handleResubmit = async () => {
 if (!invoice) return;
 await resubmitMutation.mutateAsync({
 invoiceId: invoice.id,
 notes: notes || undefined,
 });
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>{isRTL ? 'إعادة تقديم الفاتورة' : 'Resubmit Invoice'}</DialogTitle>
 </DialogHeader>

 {invoice && (
 <div className="space-y-4">
 <div className="bg-red-50 border border-red-200 rounded-lg p-3">
 <p className="text-sm font-medium text-red-900">{isRTL ? 'سبب الرفض' : 'Rejection Reason'}</p>
 <p className="text-sm text-red-800 mt-1">{invoice.rejectionReason}</p>
 </div>

 <div>
 <Label htmlFor="resubmit-notes">{isRTL ? 'ملاحظات إعادة التقديم (اختياري)' : 'Resubmission Notes (Optional)'}</Label>
 <textarea
 id="resubmit-notes"
 value={notes}
 onChange={(e) => onNotesChange(e.target.value)}
 placeholder={t.placeholders.describeWhatWasCorrectedOrChanged}
 className="w-full mt-2 p-2 border rounded-md text-sm"
 rows={4}
 />
 </div>
 </div>
 )}

 <DialogFooter>
 <Button
 variant="outline"
 onClick={() => onOpenChange(false)}
 >
 Cancel
 </Button>
 <Button
 onClick={handleResubmit}
 disabled={resubmitMutation.isPending}
 className="gap-2"
 >
 {resubmitMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
 Resubmit Invoice
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
