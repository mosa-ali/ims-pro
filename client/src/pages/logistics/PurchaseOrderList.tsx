/**
 * Purchase Order List Page - Updated with Create Form & Allocation Validation
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Download, Eye, Trash2, Printer, ShoppingCart, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

const formatSqlDate = (dateValue?: string | Date | null) => {
  if (!dateValue) return null;

  return new Date(dateValue)
    .toISOString()
    .split("T")[0]; // YYYY-MM-DD
};

const statusColors: Record<string, string> = {
 draft: "bg-gray-500", issued: "bg-blue-500", acknowledged: "bg-yellow-500", partially_delivered: "bg-orange-500",
 delivered: "bg-green-500", completed: "bg-emerald-600", cancelled: "bg-red-500",
};

const editableStatuses = ["draft"];

export default function PurchaseOrderListV2() {
 const { t } = useTranslation();
 const { user } = useAuth();
 const { isRTL } = useLanguage();
 const [, navigate] = useLocation();
 const [search, setSearch] = useState("");
 const [statusFilter, setStatusFilter] = useState<string>("all");
 const [showCreateDialog, setShowCreateDialog] = useState(false);
 const [selectedPOId, setSelectedPOId] = useState<number | null>(null);
 const [isEditMode, setIsEditMode] = useState(false);
 
 // Get qaId and prId from URL query parameters
 const qaId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('qaId') ? parseInt(new URLSearchParams(window.location.search).get('qaId')!) : null : null;
 const prId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('prId') ? parseInt(new URLSearchParams(window.location.search).get('prId')!) : null : null;

 const [poForm, setPOForm] = useState({
 deliveryDate: "",
 deliveryLocation: "",
 paymentTerms: "",
 notes: "",
 });

 const { currentOrganization } = useOrganization();
 const organizationId = currentOrganization?.id || 1;

 // Get POs for the QA if qaId is provided
 const { data: posByQA, isLoading: isLoadingQAPOs, refetch: refetchQAPOs } = trpc.logistics.po.getByQA.useQuery(
 qaId ? { quotationAnalysisId: qaId } : undefined,
 { enabled: !!qaId }
 );

 // Check allocation status
 const { data: allocationStatus } = trpc.logistics.po.checkAllocationStatus.useQuery(
 qaId ? { quotationAnalysisId: qaId } : undefined,
 { enabled: !!qaId }
 );

 // Get POs by PR (if prId provided) or get all POs (for general list view)
 const { data: posByPR, isLoading: isLoadingPRPOs, refetch: refetchPRPOs } = trpc.logistics.po.listByPR.useQuery(
 prId ? { purchaseRequestId: prId } : undefined,
 { enabled: !!prId }
 );

 // Get all POs (for general list view when no prId)
 const { data, isLoading, refetch } = trpc.logistics.po.list.useQuery(
 !prId ? {
 organizationId,
 search: search || undefined,
 status: statusFilter !== "all" ? (statusFilter as any) : undefined,
 limit: 50,
 offset: 0,
 } : undefined,
 { enabled: !prId }
 );

 const createFromQAMutation = trpc.logistics.po.createFromQA.useMutation({
 onSuccess: () => {
 toast.success(t.logistics.purchaseOrderCreatedSuccessfully);
 setShowCreateDialog(false);
 setPOForm({ deliveryDate: "", deliveryLocation: "", paymentTerms: "", notes: "" });
 refetch();
 if (qaId) refetchQAPOs();
 },
 onError: (error) => {
 toast.error(error.message || (t.logistics.failedToCreatePurchaseOrder));
 },
 });

 const deleteMutation = trpc.logistics.po.delete.useMutation({
 onSuccess: () => {
 toast.success(t.logistics.purchaseOrderDeleted);
 refetch();
 refetchPRPOs();
 if (qaId) refetchQAPOs();
 },
 onError: (error) => toast.error(error.message),
 });

 const handleDelete = (id: number) => {
 if (confirm(t.logistics.areYouSureYouWantTo1)) {
 deleteMutation.mutate({ id });
 }
 };

 const handleCreatePO = () => {
 if (!qaId) {
 toast.error(t.logistics.quotationAnalysisIdIsMissing);
 return;
 }
 if (!poForm.deliveryDate || !poForm.deliveryLocation) {
 toast.error(t.logistics.pleaseFillAllRequiredFields);
 return;
 }
 createFromQAMutation.mutate({
 quotationAnalysisId: qaId,
 deliveryDate: formatSqlDate(poForm.deliveryDate) || undefined,
 deliveryLocation: poForm.deliveryLocation || undefined,
 paymentTerms: poForm.paymentTerms || undefined,
 notes: poForm.notes || undefined,
 });
 refetchPRPOs();
 };

 const handleViewPO = (po: any) => {
 const params = new URLSearchParams();
 if (qaId) params.append('qaId', qaId.toString());
 if (prId) params.append('prId', prId.toString());
 const queryString = params.toString();
 navigate(`/organization/logistics/purchase-orders/${po.id}${queryString ? '?' + queryString : ''}`);
 };

 const poList = qaId ? posByQA : prId ? posByPR : data?.items;
 const isLoading_ = qaId ? isLoadingQAPOs : prId ? isLoadingPRPOs : isLoading;
 // Button is enabled if:
 // 1. No qaId (general list view) OR
 // 2. qaId exists AND allocation is not fully complete
 // During loading, assume we can create (optimistic)
 const canCreatePO = !qaId || (allocationStatus ? !allocationStatus.isFullyAllocated : true);

 // Determine if we're in PR-filtered view
 const isFilteredByPR = !!prId && !qaId;

 return (
 <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="border-b bg-card">
 <div className="container py-6">
 <BackButton href={prId ? `/organization/logistics/procurement-workspace/${prId}` : '/organization/logistics'} label={prId ? t.logistics.backToProcurementWorkspace : t.logistics.backToLogistics} />
 
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold">{t.logistics.purchaseOrders}</h1>
 <p className="text-muted-foreground">
 {isFilteredByPR
 ? t.logistics.purchaseOrdersForProcurementRequest
 : qaId 
 ? (t.logistics.purchaseOrdersForQuotationAnalysis)
 : (t.logistics.managePurchaseOrders)}
 </p>
 </div>
 <div className="flex gap-2">
 <Button variant="outline"><Download className="h-4 w-4 me-2" />{t.logistics.export}</Button>
 <Button 
 onClick={() => setShowCreateDialog(true)}
 disabled={!canCreatePO}
 title={!canCreatePO ? (t.logistics.allQuantitiesFulfilled) : (t.logistics.createNewPurchaseOrder)}
 >
 <Plus className="h-4 w-4 me-2" />
 {t.logistics.newOrder}
 </Button>
 </div>
 </div>

 {/* Allocation Status Alert */}
 {qaId && allocationStatus && (
 <div className={`mt-4 p-3 rounded-lg border ${allocationStatus.isFullyAllocated ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
 <div className="flex items-start gap-2">
 <AlertCircle className="h-4 w-4 mt-0.5" />
 <div className="text-sm">
 <p className="font-semibold">{t.logistics.allocationStatus}</p>
 <p>{allocationStatus.message}</p>
 {allocationStatus.allocationStatus.map((item) => (
 <div key={item.qaLineItemId} className="text-xs mt-1">
 {item.description}: {item.allocatedQuantity} / {item.approvedQuantity} {t.logistics.allocated}
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 </div>

 <div className="container py-4">
 <Card>
 <CardContent className="pt-4">
 <div className="flex flex-wrap gap-4">
 <div className="flex-1 min-w-[200px]">
 <div className="relative">
 <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input placeholder={t.logistics.search} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10" />
 </div>
 </div>
 {!qaId && (
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-[180px]"><SelectValue placeholder={t.logistics.status} /></SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.logistics.allStatus}</SelectItem>
 <SelectItem value="draft">{t.logistics.draft}</SelectItem>
 <SelectItem value="issued">{t.logistics.issued}</SelectItem>
 <SelectItem value="delivered">{t.logistics.delivered}</SelectItem>
 <SelectItem value="completed">{t.logistics.completed}</SelectItem>
 </SelectContent>
 </Select>
 )}
 </div>
 </CardContent>
 </Card>
 </div>

 <div className="container pb-6">
 <Card>
 <CardContent className="p-0">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.logistics.poNumber2}</TableHead>
 <TableHead>{t.logistics.supplier}</TableHead>
 <TableHead>{t.logistics.amount}</TableHead>
 <TableHead>{t.logistics.issueDate}</TableHead>
 <TableHead>{t.logistics.deliveryDate}</TableHead>
 <TableHead>{t.logistics.status}</TableHead>
 <TableHead className="text-center">{t.logistics.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading_ ? (
 <TableRow><TableCell colSpan={7} className="text-center py-8">{t.logistics.loading}</TableCell></TableRow>
 ) : !poList?.length ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8">
 <div className="flex flex-col items-center gap-2">
 <ShoppingCart className="h-12 w-12 text-muted-foreground" />
 <p className="text-muted-foreground">{t.logistics.noPurchaseOrdersFound}</p>
 {!qaId && (
 <Button asChild size="sm"><Link href="/organization/logistics/purchase-orders/new"><Plus className="h-4 w-4 me-2" />{t.logistics.createNewOrder}</Link></Button>
 )}
 </div>
 </TableCell>
 </TableRow>
 ) : (
 poList.map((po) => (
 <TableRow key={po.id}>
 <TableCell className="font-medium">{po.poNumber}</TableCell>
 <TableCell>{po.supplierName}</TableCell>
 <TableCell>{po.currency || "USD"} {parseFloat(po.totalAmount || "0").toLocaleString()}</TableCell>
 <TableCell>{po.issueDate ? format(new Date(po.issueDate), "yyyy-MM-dd") : "-"}</TableCell>
 <TableCell>{po.deliveryDate ? format(new Date(po.deliveryDate), "yyyy-MM-dd") : "-"}</TableCell>
 <TableCell><Badge className={`${statusColors[po.status || "draft"]} text-white`}>{po.status}</Badge></TableCell>
 <TableCell>
 <div className="flex justify-end gap-1">
 <Button variant="ghost" size="icon" onClick={() => handleViewPO(po)} title={t.logistics.view}><Eye className="h-4 w-4" /></Button>
 <Button variant="ghost" size="icon" onClick={() => navigate(`/organization/logistics/purchase-orders/${po.id}/print`)} title={t.logistics.print}><Printer className="h-4 w-4" /></Button>
 <Button variant="ghost" size="icon" onClick={() => handleDelete(po.id)} title={t.logistics.delete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
 </div>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 {poList && <div className="mt-4 text-sm text-muted-foreground text-center">{`Showing ${poList.length} records`}</div>}
 </div>

 {/* Create PO Dialog */}
 <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
 <DialogContent className="sm:max-w-lg">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <ShoppingCart className="w-5 h-5 text-blue-600" />
 {t.logistics.createNewPurchaseOrder3}
 </DialogTitle>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
 <p className="text-sm text-blue-800">
 <strong>{t.logistics.source}</strong> {t.logistics.quotationAnalysis}
 </p>
 <p className="text-sm text-blue-700 mt-1">
 {t.logistics.poWillBeAutogeneratedFromThe}
 </p>
 </div>
 <div className="space-y-2">
 <Label htmlFor="po-delivery-date">{t.logistics.deliveryDate} *</Label>
 <Input
 id="po-delivery-date"
 type="date"
 value={poForm.deliveryDate}
 onChange={(e) => setPOForm({ ...poForm, deliveryDate: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="po-delivery-location">{t.logistics.deliveryLocation} *</Label>
 <Input
 id="po-delivery-location"
 placeholder={t.logistics.egMainOfficeWarehouseAden}
 value={poForm.deliveryLocation}
 onChange={(e) => setPOForm({ ...poForm, deliveryLocation: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="po-payment-terms">{t.logistics.paymentTerms}</Label>
 <Input
 id="po-payment-terms"
 placeholder={t.logistics.egNet30DaysAfterDelivery}
 value={poForm.paymentTerms}
 onChange={(e) => setPOForm({ ...poForm, paymentTerms: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="po-notes">{t.logistics.notes}</Label>
 <Input
 id="po-notes"
 placeholder={t.logistics.additionalNotesForThePo}
 value={poForm.notes}
 onChange={(e) => setPOForm({ ...poForm, notes: e.target.value })}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t.logistics.cancel}</Button>
 <Button 
 onClick={handleCreatePO} 
 disabled={createFromQAMutation.isPending}
 className="gap-2"
 >
 <Plus className="w-4 h-4" />
 {createFromQAMutation.isPending ? (t.logistics.creating) : (t.logistics.createPurchaseOrder)}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
