/**
 * Delivery Note Viewer - Read-only view of DN details
 * Bilingual EN/AR support
 * DN is immutable and cannot be edited
 */
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Printer } from "lucide-react";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";

interface DeliveryNoteViewerProps {
 dnId: number;
 onClose: () => void;
}

export default function DeliveryNoteViewer({ dnId, onClose }: DeliveryNoteViewerProps) {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();

 const { data: dn, isLoading } = trpc.logistics.procurementDn.getById.useQuery(
 { id: dnId },
 { enabled: !!dnId }
 );

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-12" dir={isRTL ? 'rtl' : 'ltr'}>
 <Loader2 className="w-6 h-6 animate-spin text-primary" />
 </div>
 );
 }

 if (!dn) {
 return (
 <div className="text-center py-12">
 <p className="text-muted-foreground">{isRTL ? 'لم يتم العثور على إشعار التسليم' : 'Delivery Note not found'}</p>
 <Button onClick={onClose} variant="outline" className="mt-4">
 {t.deliveryNoteViewer.back}
 </Button>
 </div>
 );
 }

 const statusBadge = (status: string) => {
 const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
 delivered: { variant: "default", label: t.deliveryNoteViewer.delivered },
 pending: { variant: "secondary", label: t.deliveryNoteViewer.pending },
 };
 const config = map[status] || map.pending;
 return <Badge variant={config.variant}>{config.label}</Badge>;
 };

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between gap-4">
 <h1 className="text-3xl font-bold text-foreground">{t.deliveryNoteViewer.title}</h1>
 <Button
 variant="outline"
 size="sm"
 onClick={() => window.print()}
 className={''}
 >
 <Printer className="w-4 h-4" />
 <span className={'ms-2'}>{t.deliveryNoteViewer.print}</span>
 </Button>
 </div>

 {/* Read-only indicator */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <p className="text-sm text-blue-800 font-medium">{t.deliveryNoteViewer.readOnly}</p>
 </div>

 {/* DN Header Details */}
 <Card>
 <CardHeader>
 <CardTitle>{t.deliveryNoteViewer.dnNumber}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-6">
 <div className="grid grid-cols-2 gap-6">
 <div>
 <label className="text-sm font-medium text-muted-foreground">{t.deliveryNoteViewer.dnNumber}</label>
 <p className="text-lg font-semibold text-foreground">{dn.dnNumber}</p>
 </div>
 <div>
 <label className="text-sm font-medium text-muted-foreground">{t.deliveryNoteViewer.status}</label>
 <div className="mt-1">{statusBadge(dn.status)}</div>
 </div>
 <div>
 <label className="text-sm font-medium text-muted-foreground">{t.deliveryNoteViewer.poReference}</label>
 <p className="text-lg font-semibold text-foreground">{dn.poNumber || "-"}</p>
 </div>
 <div>
 <label className="text-sm font-medium text-muted-foreground">{t.deliveryNoteViewer.grnReference}</label>
 <p className="text-lg font-semibold text-foreground">{dn.grnNumber || "-"}</p>
 </div>
 <div>
 <label className="text-sm font-medium text-muted-foreground">{t.deliveryNoteViewer.vendor}</label>
 <p className="text-lg font-semibold text-foreground">{dn.vendorName || "-"}</p>
 </div>
 <div>
 <label className="text-sm font-medium text-muted-foreground">{t.deliveryNoteViewer.deliveryDate}</label>
 <p className="text-lg font-semibold text-foreground">
 {dn.deliveryDate ? new Date(dn.deliveryDate).toLocaleDateString() : "-"}
 </p>
 </div>
 <div>
 <label className="text-sm font-medium text-muted-foreground">{t.deliveryNoteViewer.createdBy}</label>
 <p className="text-lg font-semibold text-foreground">{dn.createdByName || "-"}</p>
 </div>
 <div>
 <label className="text-sm font-medium text-muted-foreground">{t.deliveryNoteViewer.createdDate}</label>
 <p className="text-lg font-semibold text-foreground">
 {new Date(dn.createdAt).toLocaleDateString()}
 </p>
 </div>
 </div>

 {dn.remarks && (
 <div>
 <label className="text-sm font-medium text-muted-foreground">{t.deliveryNoteViewer.remarks}</label>
 <p className="text-foreground mt-1">{dn.remarks}</p>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Line Items Table */}
 <Card>
 <CardHeader>
 <CardTitle>{t.deliveryNoteViewer.lineItems}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.deliveryNoteViewer.lineNumber}</TableHead>
 <TableHead>{t.deliveryNoteViewer.description}</TableHead>
 <TableHead className="text-end">{t.deliveryNoteViewer.orderedQty}</TableHead>
 <TableHead className="text-end">{t.deliveryNoteViewer.deliveredQty}</TableHead>
 <TableHead>{t.deliveryNoteViewer.unit}</TableHead>
 <TableHead>{t.deliveryNoteViewer.lineRemarks}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {dn.lineItems && dn.lineItems.length > 0 ? (
 dn.lineItems.map((item: any) => (
 <TableRow key={item.id}>
 <TableCell>{item.lineNumber}</TableCell>
 <TableCell>{item.description || "-"}</TableCell>
 <TableCell className="text-end">{parseFloat(item.orderedQty || "0").toFixed(2)}</TableCell>
 <TableCell className="text-end font-semibold text-primary">
 {parseFloat(item.deliveredQty || "0").toFixed(2)}
 </TableCell>
 <TableCell>{item.unit || "-"}</TableCell>
 <TableCell>{item.remarks || "-"}</TableCell>
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={6} className="text-center text-muted-foreground">
 No line items
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </div>
 </CardContent>
 </Card>
 </div>
 );
}
