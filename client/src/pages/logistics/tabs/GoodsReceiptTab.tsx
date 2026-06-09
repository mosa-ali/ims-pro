/**
 * Goods Receipt Note (GRN) Tab - Manage GRNs linked to a PR
 * Bilingual EN/AR support
 */
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Printer, Package, Loader2, Trash2, RefreshCw } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { useState } from "react";
import GRNForm from "../forms/GRNForm";

interface GoodsReceiptTabProps { purchaseRequestId: number; prNumber: string; prStatus: string; }

export default function GoodsReceiptTab({ purchaseRequestId }: GoodsReceiptTabProps) {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
 const navigate = useNavigate();
 const [selectedGrnId, setSelectedGrnId] = useState<number | null>(null);

 const { data: grnList, isLoading, refetch } = trpc.logistics.procurementGrn.getByPR.useQuery(
 { purchaseRequestId }, { enabled: !!purchaseRequestId }
 );

 // Fetch POs to check if any are acknowledged
 const { data: pos } = trpc.logistics.po.getByPR.useQuery(
 { purchaseRequestId }, { enabled: !!purchaseRequestId }
 );

 const hasAcknowledgedPO = Array.isArray(pos) ? pos.some((p: any) => p.status === "acknowledged" || p.status === "approved") : pos?.status === "acknowledged" || pos?.status === "approved";

 // Check if all quantities are fulfilled in accepted GRNs
 const areAllQuantitiesFulfilled = () => {
 if (!items || items.length === 0) return false;
 
 // Check if any GRN is accepted with all quantities fulfilled
 return items.some((grn: any) => {
 if (grn.status !== "accepted") return false;
 const lineItems = grn.lineItems || [];
 if (lineItems.length === 0) return false;
 
 // All line items must have acceptedQty === orderedQty
 return lineItems.every((item: any) => {
 const accepted = parseFloat(item.acceptedQty || "0");
 const ordered = parseFloat(item.orderedQty || "0");
 return accepted === ordered && ordered > 0;
 });
 });
 };

 const createGRN = trpc.logistics.procurementGrn.createFromPR.useMutation({
 onSuccess: () => { toast.success(t.goodsReceiptTab.success); refetch(); },
 onError: (error: any) => { toast.error(`${t.goodsReceiptTab.error}: ${error.message}`); },
 });

 const deleteGRN = trpc.logistics.procurementGrn.delete.useMutation({
 onSuccess: () => { toast.success(t.goodsReceiptTab.successDelete); refetch(); },
 onError: (error: any) => { toast.error(`${t.goodsReceiptTab.error}: ${error.message}`); },
 });

 const statusBadge = (status: string) => {
 const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
 pending_inspection: { variant: "secondary", label: t.goodsReceiptTab.pending_inspection },
 inspected: { variant: "outline", label: t.goodsReceiptTab.inspected },
 accepted: { variant: "default", label: t.goodsReceiptTab.accepted },
 partial: { variant: "outline", label: t.goodsReceiptTab.partial },
 rejected: { variant: "destructive", label: t.goodsReceiptTab.rejected },
 };
 const config = map[status] || map.pending_inspection;
 return <Badge variant={config.variant}>{config.label}</Badge>;
 };

 if (isLoading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

 const items = grnList || [];

 // If a GRN is selected, show the GRN form
 if (selectedGrnId) {
 return <GRNForm grnId={selectedGrnId} onStatusUpdated={() => { refetch(); setSelectedGrnId(null); }} />;
 }

 return (
 <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="flex items-center justify-between">
 <div><h3 className="text-lg font-semibold">{t.goodsReceiptTab.title}</h3><p className="text-sm text-muted-foreground">{t.goodsReceiptTab.subtitle}</p></div>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={() => refetch()} title="Refresh GRN list">
 <RefreshCw className="h-4 w-4" />
 </Button>
 <Button className="gap-2" onClick={() => createGRN.mutate({ purchaseRequestId })} disabled={createGRN.isPending || !hasAcknowledgedPO || areAllQuantitiesFulfilled() || items.length > 0} title={!hasAcknowledgedPO ? "PO must be acknowledged first" : areAllQuantitiesFulfilled() ? t.goodsReceiptTab.quantitiesFulfilled : items.length > 0 ? "A GRN already exists for this PO" : ""}>
 {createGRN.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
 {t.goodsReceiptTab.createGRN}
 </Button>
 </div>
 </div>

 {!hasAcknowledgedPO && (
 <Card><CardContent className="flex flex-col items-center justify-center py-12">
 <Package className="h-12 w-12 text-yellow-400 mb-4" />
 <h4 className="text-lg font-medium text-gray-600">GRN Locked</h4>
 <p className="text-sm text-muted-foreground mt-1">Approve the Purchase Order first to unlock GRN creation</p>
 </CardContent></Card>
 )}

 {hasAcknowledgedPO && items.length === 0 ? (
 <Card><CardContent className="flex flex-col items-center justify-center py-12">
 <Package className="h-12 w-12 text-gray-400 mb-4" />
 <h4 className="text-lg font-medium text-gray-600">{t.goodsReceiptTab.noGRN}</h4>
 <p className="text-sm text-muted-foreground mt-1">{t.goodsReceiptTab.createFirst}</p>
 </CardContent></Card>
 ) : (
 <div className="space-y-3">
 {items.map((grn: any) => (
 <Card key={grn.id}><CardContent className="py-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <Package className="h-5 w-5 text-primary" />
 <div>
 <div className="font-medium">{grn.grnNumber || `GRN-${grn.id}`}</div>
 <div className="text-sm text-muted-foreground">{t.goodsReceiptTab.poRef}: {grn.poNumber || "-"}</div>
 {grn.receivedBy && <div className="text-sm text-muted-foreground">{t.goodsReceiptTab.receivedBy}: {grn.receivedBy}</div>}
 </div>
 </div>
 <div className="flex items-center gap-3">
 {statusBadge(grn.status || "pending_inspection")}
 <Button variant="outline" size="sm" onClick={() => setSelectedGrnId(grn.id)}>
 {grn.status === "accepted" ? t.goodsReceiptTab.view : "Edit"}
 </Button>
 <Button variant="outline" size="sm" onClick={() => navigate(`/organization/logistics/grn/${grn.id}/print`)}>
 <Printer className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => {
 if (confirm(`Delete GRN ${grn.grnNumber}? This action cannot be undone.`)) {
 deleteGRN.mutate({ id: grn.id });
 }
 }} disabled={deleteGRN.isPending}>
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 </div>
 </CardContent></Card>
 ))}
 </div>
 )}
 </div>
 );
}
