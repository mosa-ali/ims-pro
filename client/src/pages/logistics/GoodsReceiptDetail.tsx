import { useParams, Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, FileText } from "lucide-react";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function GoodsReceiptDetail() {
 const { t } = useTranslation();
 const { id } = useParams();
 const { isRTL } = useLanguage();
 const grnId = parseInt(id!);
 
 // Extract prId and qaId from URL query parameters for navigation context
 const prId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('prId') ? parseInt(new URLSearchParams(window.location.search).get('prId')!) : null : null;
 const qaId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('qaId') ? parseInt(new URLSearchParams(window.location.search).get('qaId')!) : null : null;
 const { data: grn, isLoading } = trpc.logistics.procurementGrn.getById.useQuery({ id: grnId });
 
 // Get PO to access purchaseRequestId
 const { data: po } = trpc.logistics.po.getById.useQuery(
 { id: grn?.purchaseOrderId || 0 },
 { enabled: !!grn?.purchaseOrderId }
 );

 if (isLoading) return <div className="container py-8">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>;
 if (!grn) return <div className="container py-8">GRN not found</div>;

 // Build back navigation URL
 const getBackUrl = () => {
 if (prId) {
 // Coming from GRN List page - go back to GRN List with parameters
 const params = new URLSearchParams();
 if (prId) params.append('prId', prId.toString());
 if (qaId) params.append('qaId', qaId.toString());
 const queryString = params.toString();
 return `/organization/logistics/grn${queryString ? '?' + queryString : ''}`;
 } else {
 // Fallback to general GRN list
 return `/organization/logistics/grn`;
 }
 };

 return (
 <div className="container py-8 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <BackButton href={getBackUrl()} label={t.logistics.backToGrnList} />
 <div>
 <h1 className="text-3xl font-bold">{isRTL ? 'إيصال استلام البضائع' : 'Goods Receipt Note'}</h1>
 <p className="text-muted-foreground">{grn.grnNumber}</p>
 </div>
 </div>

 <div className="flex gap-2">
 <Button variant="outline" size="sm" asChild>
 <Link href={`/organization/logistics/goods-receipts/${grn.id}/print`}>
 <Printer className="h-4 w-4 me-2" />
 Print GRN
 </Link>
 </Button>
 {po?.purchaseRequestId && (
 <Button variant="outline" size="sm" asChild>
 <Link href={`/organization/logistics/procurement-package/${po.purchaseRequestId}/print`}>
 <FileText className="h-4 w-4 me-2" />
 Print All
 </Link>
 </Button>
 )}
 </div>
 </div>

 <Card className="p-6">
 <h2 className="text-xl font-semibold mb-4">GRN Details</h2>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-sm text-muted-foreground">GRN Number</p>
 <p className="font-medium">{grn.grnNumber}</p>
 </div>
 <div>
 <p className="text-sm text-muted-foreground">{isRTL ? 'الحالة' : 'Status'}</p>
 <Badge>{grn.status}</Badge>
 </div>
 <div>
 <p className="text-sm text-muted-foreground">{isRTL ? 'تاريخ الاستلام' : 'Receipt Date'}</p>
 <p>{grn.receiptDate || "-"}</p>
 </div>
 </div>
 </Card>
 </div>
 );
}
