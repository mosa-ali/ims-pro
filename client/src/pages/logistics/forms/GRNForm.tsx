/**
 * GRN Form - Manage Goods Receipt Note with line items and inspection workflow
 * Bilingual EN/AR support
 * Delete action moved to GRN list view
 */
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useState } from "react";
import { Save, CheckCircle, XCircle, AlertCircle, Edit2, Trash2 } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { BackButton } from "@/components/BackButton";

interface GRNFormProps { grnId: number; onStatusUpdated?: () => void; }

export default function GRNForm({ grnId, onStatusUpdated }: GRNFormProps) {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
 const navigate = useNavigate();
 const trpcUtils = trpc.useUtils();

 const [editingLineId, setEditingLineId] = useState<number | null>(null);
 const [editValues, setEditValues] = useState<Record<string, any>>({});
 const [isReadOnly, setIsReadOnly] = useState(false);

 // Fetch GRN details
 const { data: grn, isLoading: grnLoading, refetch: refetchGRN } = trpc.logistics.procurementGrn.getById.useQuery(
 { id: grnId }, { enabled: !!grnId }
 );

 // Mutations
 const updateLineItem = trpc.logistics.procurementGrn.updateLineItem.useMutation({
 onSuccess: () => { toast.success(t.gRNForm.success); setEditingLineId(null); refetchGRN(); },
 onError: (error: any) => { toast.error(`${t.gRNForm.error}: ${error.message}`); },
 });

 const updateStatus = trpc.logistics.procurementGrn.updateStatus.useMutation({
 onSuccess: () => {
 toast.success(t.gRNForm.success);
 refetchGRN();
 // Invalidate parent query to refresh GRN list
 trpcUtils.logistics.procurementGrn.getByPR.invalidate();
 // Call parent callback to refresh list view
 onStatusUpdated?.();
 },
 onError: (error: any) => { toast.error(`${t.gRNForm.error}: ${error.message}`); },
 });


 const deleteLineItem = trpc.logistics.procurementGrn.deleteLineItem.useMutation({
 onSuccess: () => { toast.success(t.gRNForm.success); refetchGRN(); },
 onError: (error: any) => { toast.error(`${t.gRNForm.error}: ${error.message}`); },
 });

 if (grnLoading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

 if (!grn) return <div className="text-center py-12"><p className="text-muted-foreground">GRN not found</p></div>;

 // Set read-only mode when GRN is accepted
 const isGrnAccepted = grn.status === "accepted";
 if (isGrnAccepted && !isReadOnly) {
 setIsReadOnly(true);
 }

 const lineItems = grn.lineItems || [];
 const totalOrdered = lineItems.reduce((sum, item) => sum + parseFloat(item.orderedQty || "0"), 0);
 const totalReceived = lineItems.reduce((sum, item) => sum + parseFloat(item.receivedQty || "0"), 0);
 const totalAccepted = lineItems.reduce((sum, item) => sum + parseFloat(item.acceptedQty || "0"), 0);
 const totalRejected = lineItems.reduce((sum, item) => sum + parseFloat(item.rejectedQty || "0"), 0);

 const statusBadge = (status: string) => {
 const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
 draft: { variant: "outline", label: t.gRNForm.draft },
 pending_inspection: { variant: "secondary", label: t.gRNForm.pending_inspection },
 inspected: { variant: "outline", label: t.gRNForm.inspected },
 accepted: { variant: "default", label: t.gRNForm.accepted },
 rejected: { variant: "destructive", label: t.gRNForm.rejected },
 };
 const config = map[status] || map.draft;
 return <Badge variant={config.variant}>{config.label}</Badge>;
 };

 const conditionBadge = (condition: string) => {
 const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
 good: { variant: "default", label: t.gRNForm.good },
 damaged: { variant: "destructive", label: t.gRNForm.damaged },
 expired: { variant: "destructive", label: t.gRNForm.expired },
 defective: { variant: "destructive", label: t.gRNForm.defective },
 };
 const config = map[condition] || map.good;
 return <Badge variant={config.variant}>{config.label}</Badge>;
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <BackButton onClick={() => { if (onStatusUpdated) onStatusUpdated(); else navigate(-1); }} iconOnly />
 <div>
 <h1 className="text-2xl font-bold">{t.gRNForm.title}</h1>
 <p className="text-sm text-muted-foreground">{grn.grnNumber}</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 {statusBadge(grn.status)}
 </div>
 </div>

 {/* GRN Details Card */}
 <Card>
 <CardHeader>
 <CardTitle>{t.gRNForm.title}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="text-sm font-medium">{t.gRNForm.grnNumber}</label>
 <p className="text-sm text-muted-foreground">{grn.grnNumber}</p>
 </div>
 <div>
 <label className="text-sm font-medium">{t.gRNForm.poRef}</label>
 <p className="text-sm text-muted-foreground">{grn.poNumber || "-"}</p>
 </div>
 <div>
 <label className="text-sm font-medium">{t.gRNForm.receivedBy}</label>
 <p className="text-sm text-muted-foreground">{grn.receivedBy || "-"}</p>
 </div>
 <div>
 <label className="text-sm font-medium">{t.gRNForm.status}</label>
 <p className="text-sm">{statusBadge(grn.status)}</p>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Line Items Table */}
 <Card>
 <CardHeader>
 <CardTitle>{t.gRNForm.lineItems}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.gRNForm.lineNumber}</TableHead>
 <TableHead>{t.gRNForm.description}</TableHead>
 <TableHead className="text-end">{t.gRNForm.orderedQty}</TableHead>
 <TableHead className="text-end">{t.gRNForm.receivedQty}</TableHead>
 <TableHead className="text-end">{t.gRNForm.acceptedQty}</TableHead>
 <TableHead className="text-end">{t.gRNForm.rejectedQty}</TableHead>
 <TableHead>{t.gRNForm.unit}</TableHead>
 <TableHead>{t.gRNForm.condition}</TableHead>
 <TableHead className="text-center">{t.gRNForm.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {lineItems.map((item: any) => (
 <TableRow key={item.id}>
 <TableCell>{item.lineNumber}</TableCell>
 <TableCell>{item.description}</TableCell>
 <TableCell className="text-end">{item.orderedQty}</TableCell>
 <TableCell className="text-end">
 {editingLineId === item.id ? (
 <Input
 type="number"
 value={editValues.receivedQty || item.receivedQty}
 onChange={(e) => setEditValues({ ...editValues, receivedQty: e.target.value })}
 className="w-20"
 />
 ) : (
 item.receivedQty
 )}
 </TableCell>
 <TableCell className="text-end">
 {editingLineId === item.id ? (
 <Input
 type="number"
 value={editValues.acceptedQty || item.acceptedQty}
 onChange={(e) => setEditValues({ ...editValues, acceptedQty: e.target.value })}
 className="w-20"
 />
 ) : (
 item.acceptedQty
 )}
 </TableCell>
 <TableCell className="text-end">
 {editingLineId === item.id ? (
 <Input
 type="number"
 value={editValues.rejectedQty || item.rejectedQty}
 onChange={(e) => setEditValues({ ...editValues, rejectedQty: e.target.value })}
 className="w-20"
 />
 ) : (
 item.rejectedQty
 )}
 </TableCell>
 <TableCell>{item.unit}</TableCell>
 <TableCell>
 {editingLineId === item.id ? (
 <Select value={editValues.condition || item.condition || "good"} onValueChange={(value) => setEditValues({ ...editValues, condition: value })}>
 <SelectTrigger className="w-32">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="good">{t.gRNForm.good}</SelectItem>
 <SelectItem value="damaged">{t.gRNForm.damaged}</SelectItem>
 <SelectItem value="expired">{t.gRNForm.expired}</SelectItem>
 <SelectItem value="defective">{t.gRNForm.defective}</SelectItem>
 </SelectContent>
 </Select>
 ) : (
 conditionBadge(item.condition || "good")
 )}
 </TableCell>
 <TableCell>
 {editingLineId === item.id ? (
 <>
 <Button size="sm" onClick={() => {
 updateLineItem.mutate({
 id: item.id,
 receivedQty: parseFloat(editValues.receivedQty || item.receivedQty),
 acceptedQty: parseFloat(editValues.acceptedQty || item.acceptedQty),
 rejectedQty: parseFloat(editValues.rejectedQty || item.rejectedQty),
 condition: editValues.condition || item.condition,
 });
 }} disabled={updateLineItem.isPending}>
 <Save className="h-4 w-4" />
 </Button>
 <Button size="sm" variant="outline" onClick={() => setEditingLineId(null)}>
 {t.gRNForm.cancel}
 </Button>
 </>
 ) : (
 <>
 <Button size="sm" variant="ghost" onClick={() => { setEditingLineId(item.id); setEditValues(item); }} disabled={isGrnAccepted}>
 <Edit2 className="h-4 w-4" />
 </Button>
 <Button size="sm" variant="ghost" onClick={() => {
 if (confirm(t.gRNForm.deleteConfirm)) {
 deleteLineItem.mutate({ id: item.id });
 }
 }} disabled={isGrnAccepted}>
 <Trash2 className="h-4 w-4" />
 </Button>
 </>
 )}
 </TableCell>
 </TableRow>
 ))}
 <TableRow className="bg-muted/50 font-semibold">
 <TableCell colSpan={2}>{t.gRNForm.lineItems} {t.gRNForm.actions}</TableCell>
 <TableCell className="text-end">{totalOrdered}</TableCell>
 <TableCell className="text-end">{totalReceived}</TableCell>
 <TableCell className="text-end">{totalAccepted}</TableCell>
 <TableCell className="text-end">{totalRejected}</TableCell>
 <TableCell colSpan={3}></TableCell>
 </TableRow>
 </TableBody>
 </Table>
 </div>
 </CardContent>
 </Card>

 {/* Inspection Section */}
 <Card>
 <CardHeader>
 <CardTitle>{t.gRNForm.inspection}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="text-sm font-medium">{t.gRNForm.inspectionStatus}</label>
 <p className="text-sm">{statusBadge(grn.status)}</p>
 </div>
 <div>
 <label className="text-sm font-medium">{t.gRNForm.inspectedBy}</label>
 <p className="text-sm text-muted-foreground">{grn.inspectedBy || "-"}</p>
 </div>
 </div>
 <div>
 <label className="text-sm font-medium">{t.gRNForm.inspectionNotes}</label>
 <p className="text-sm text-muted-foreground">{grn.remarks || "-"}</p>
 </div>
 </CardContent>
 </Card>

 {/* Read-only indicator for accepted GRNs */}
 {isGrnAccepted && (
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
 <p className="text-sm text-blue-700 font-medium">{t.gRNForm.inspection} - {t.gRNForm.accepted}</p>
 <p className="text-xs text-blue-600 mt-1">This GRN is in read-only mode. No modifications are allowed.</p>
 </div>
 )}

 {/* Action Buttons */}
 <div className="flex gap-3 justify-end">
 {grn.status === "pending_inspection" && (
 <>
 <Button
 variant="outline"
 onClick={() => updateStatus.mutate({ id: grnId, status: "inspected" })}
 disabled={updateStatus.isPending}
 >
 <AlertCircle className="h-4 w-4 me-2" />
 {t.gRNForm.markInspected}
 </Button>
 <Button
 onClick={() => updateStatus.mutate({ id: grnId, status: "accepted" })}
 disabled={updateStatus.isPending}
 >
 <CheckCircle className="h-4 w-4 me-2" />
 {t.gRNForm.accept}
 </Button>
 <Button
 variant="destructive"
 onClick={() => updateStatus.mutate({ id: grnId, status: "rejected" })}
 disabled={updateStatus.isPending}
 >
 <XCircle className="h-4 w-4 me-2" />
 {t.gRNForm.reject}
 </Button>
 </>
 )}
 </div>
 </div>
 );
}
