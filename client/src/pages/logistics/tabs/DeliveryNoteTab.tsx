/**
 * Delivery Note (DN) Tab - Manage DNs linked to a PR
 * Bilingual EN/AR support
 * DN is read-only and immutable
 */
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Package, Loader2, Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import DeliveryNoteViewer from "../forms/DeliveryNoteViewer";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface DeliveryNoteTabProps {
 purchaseRequestId: number;
}

export default function DeliveryNoteTab({ purchaseRequestId }: DeliveryNoteTabProps) {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
 const [selectedDnId, setSelectedDnId] = useState<number | null>(null);
 const [deleteConfirmDnId, setDeleteConfirmDnId] = useState<number | null>(null);

 const { data: dnList, isLoading, refetch } = trpc.logistics.procurementDn.getByPR.useQuery(
 { purchaseRequestId },
 { enabled: !!purchaseRequestId }
 );

 const deleteMutation = trpc.logistics.procurementDn.delete.useMutation({
 onSuccess: () => {
 toast.success(t.deliveryNoteTab.deleteSuccess);
 setDeleteConfirmDnId(null);
 refetch();
 },
 onError: (error) => {
 toast.error(t.deliveryNoteTab.deleteError);
 console.error("Delete error:", error);
 },
 });

 const statusBadge = (status: string) => {
 const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
 delivered: { variant: "default", label: t.deliveryNoteTab.delivered },
 pending: { variant: "secondary", label: t.deliveryNoteTab.pending },
 };
 const config = map[status] || map.pending;
 return <Badge variant={config.variant}>{config.label}</Badge>;
 };

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-12" dir={isRTL ? 'rtl' : 'ltr'}>
 <Loader2 className="w-6 h-6 animate-spin text-primary" />
 </div>
 );
 }

 // If a DN is selected, show the viewer
 if (selectedDnId) {
 return (
 <DeliveryNoteViewer
 dnId={selectedDnId}
 onClose={() => setSelectedDnId(null)}
 />
 );
 }

 // Show DN list
 if (!dnList || dnList.length === 0) {
 return (
 <div className="text-center py-12">
 <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
 <h3 className="text-lg font-semibold text-foreground mb-2">{t.deliveryNoteTab.noDN}</h3>
 <p className="text-sm text-muted-foreground">{t.deliveryNoteTab.dnCreatedFromGRN}</p>
 </div>
 );
 }

 return (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-2xl font-bold text-foreground">{t.deliveryNoteTab.title}</h2>
 <p className="text-sm text-muted-foreground">{t.deliveryNoteTab.subtitle}</p>
 </div>
 </div>

 <div className="space-y-3">
 {dnList.map((dn: any) => (
 <Card key={dn.id} className="hover:shadow-md transition-shadow">
 <CardContent className="p-4">
 <div className="flex items-center justify-between gap-4">
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-2">
 <Package className="w-5 h-5 text-primary" />
 <h3 className="font-semibold text-foreground">{dn.dnNumber}</h3>
 {statusBadge(dn.status)}
 </div>
 <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
 <div>
 <span className="font-medium">{t.deliveryNoteTab.createdDate}:</span> {new Date(dn.createdAt).toLocaleDateString()}
 </div>
 <div>
 <span className="font-medium">{t.deliveryNoteTab.lineItems}:</span> {dn.lineItemsCount}
 </div>
 </div>
 </div>

 <div className="flex gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setSelectedDnId(dn.id)}
 className={''}
 >
 <Eye className="w-4 h-4" />
 <span className={'ms-2'}>{t.deliveryNoteTab.view}</span>
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setDeleteConfirmDnId(dn.id)}
 className={`text-destructive hover:text-destructive`}
 >
 <Trash2 className="w-4 h-4" />
 <span className={'ms-2'}>{t.deliveryNoteTab.delete}</span>
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>

 <AlertDialog open={deleteConfirmDnId !== null} onOpenChange={(open) => !open && setDeleteConfirmDnId(null)}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>{t.deliveryNoteTab.deleteConfirmTitle}</AlertDialogTitle>
 <AlertDialogDescription>{t.deliveryNoteTab.deleteConfirmDesc}</AlertDialogDescription>
 </AlertDialogHeader>
 <div className="flex gap-3 justify-end">
 <AlertDialogCancel>{t.deliveryNoteTab.deleteConfirmCancel}</AlertDialogCancel>
 <AlertDialogAction
 onClick={() => {
 if (deleteConfirmDnId) {
 deleteMutation.mutate({ id: deleteConfirmDnId });
 }
 }}
 className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
 >
 {deleteMutation.isPending ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin me-2" />
 {t.deliveryNoteTab.deleteConfirmDelete}
 </>
 ) : (
 t.deliveryNoteTab.deleteConfirmDelete
 )}
 </AlertDialogAction>
 </div>
 </AlertDialogContent>
 </AlertDialog>
 </div>
 );
}
