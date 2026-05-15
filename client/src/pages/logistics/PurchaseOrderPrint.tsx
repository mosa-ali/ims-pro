/**
 * Purchase Order Print View
 * Official document format using OfficialPrintTemplate with children pattern
 */
import { useOrganization } from "@/contexts/OrganizationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { OfficialPrintTemplate } from "@/components/logistics/OfficialPrintTemplate";
import { format } from "date-fns";

export default function PurchaseOrderPrint() {
 const { currentOrganization } = useOrganization();
  const { language, isRTL} = useLanguage();
 const [, params] = useRoute("/organization/logistics/purchase-orders/:id/print");
 const id = params?.id ? parseInt(params.id) : 0;

 const { data: po, isLoading } = trpc.logistics.purchaseOrders.getById.useQuery(
 { id, organizationId: currentOrganization?.id || 0 },
 { enabled: !!id && !!currentOrganization?.id }
 );

 if (isLoading) return <div className="p-8 text-center">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>;
 if (!po) return <div className="p-8 text-center">{isRTL ? 'لم يتم العثور على أمر الشراء' : 'Purchase Order not found'}</div>;

 const lineItems = po.lineItems || [];

 return (
 <OfficialPrintTemplate
      direction={isRTL ? 'rtl' : 'ltr'}
 organizationLogo={currentOrganization?.logoUrl}
 organizationName={currentOrganization?.name}
 organizationNameAr={currentOrganization?.nameAr}
 formTitle="Purchase Order"
 formTitleAr="أمر شراء"
 formNumber={po.poNumber || `PO-${po.id}`}
 formDate={po.poDate ? format(new Date(po.poDate), "yyyy-MM-dd") : ""}
 signatureBlocks={[
 { label: "Prepared By", labelAr: "أعد بواسطة" },
 { label: "Reviewed By", labelAr: "راجع بواسطة" },
 { label: "Authorized By", labelAr: "اعتمد بواسطة" },
 ]}
 termsAndConditions={po.termsAndConditions ? [po.termsAndConditions] : undefined}
 >
 {/* Metadata */}
 <div className="grid grid-cols-2 gap-4 mb-6">
 <div className="space-y-2">
 <div className="flex"><span className="text-sm text-muted-foreground w-32">Supplier:</span><span className="text-sm font-medium">{po.supplierId || "-"}</span></div>
 <div className="flex"><span className="text-sm text-muted-foreground w-32">PR Reference:</span><span className="text-sm font-medium">{po.poNumber || "-"}</span></div>
 <div className="flex"><span className="text-sm text-muted-foreground w-32">{isRTL ? 'شروط الدفع:' : 'Payment Terms:'}</span><span className="text-sm font-medium">{po.paymentTerms || "-"}</span></div>
 </div>
 <div className="space-y-2">
 <div className="flex"><span className="text-sm text-muted-foreground w-32">{isRTL ? 'تاريخ التسليم:' : 'Delivery Date:'}</span><span className="text-sm font-medium">{po.deliveryDate ? format(new Date(po.deliveryDate), "yyyy-MM-dd") : "-"}</span></div>
 <div className="flex"><span className="text-sm text-muted-foreground w-32">{isRTL ? 'موقع التسليم:' : 'Delivery Location:'}</span><span className="text-sm font-medium">{po.deliveryLocation || "-"}</span></div>
 <div className="flex"><span className="text-sm text-muted-foreground w-32">{isRTL ? 'المبلغ الإجمالي:' : 'Total Amount:'}</span><span className="text-sm font-bold">{po.currency} {parseFloat(po.totalAmount || "0").toLocaleString()}</span></div>
 </div>
 </div>

 {/* Line Items Table */}
 <table className="w-full border-collapse border border-gray-300 text-sm">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-300 px-3 py-2 text-start">#</th>
 <th className="border border-gray-300 px-3 py-2 text-start">{isRTL ? 'الوصف' : 'Description'}</th>
 <th className="border border-gray-300 px-3 py-2 text-end">Qty</th>
 <th className="border border-gray-300 px-3 py-2 text-start">{isRTL ? 'الوحدة' : 'Unit'}</th>
 <th className="border border-gray-300 px-3 py-2 text-end">{isRTL ? 'سعر الوحدة' : 'Unit Price'}</th>
 <th className="border border-gray-300 px-3 py-2 text-end">{isRTL ? 'الإجمالي' : 'Total'}</th>
 </tr>
 </thead>
 <tbody>
 {lineItems.map((item: any, idx: number) => (
 <tr key={idx}>
 <td className="border border-gray-300 px-3 py-2">{idx + 1}</td>
 <td className="border border-gray-300 px-3 py-2">{item.description}</td>
 <td className="border border-gray-300 px-3 py-2 text-end">{item.quantity || 0}</td>
 <td className="border border-gray-300 px-3 py-2">{item.unit || "-"}</td>
 <td className="border border-gray-300 px-3 py-2 text-end">{po.currency} {parseFloat(item.unitPrice || "0").toLocaleString()}</td>
 <td className="border border-gray-300 px-3 py-2 text-end">{po.currency} {parseFloat(item.totalPrice || "0").toLocaleString()}</td>
 </tr>
 ))}
 </tbody>
 <tfoot>
 <tr className="bg-gray-50 font-bold">
 <td colSpan={5} className="border border-gray-300 px-3 py-2 text-end">Total:</td>
 <td className="border border-gray-300 px-3 py-2 text-end">{po.currency} {parseFloat(po.totalAmount || "0").toLocaleString()}</td>
 </tr>
 </tfoot>
 </table>
 </OfficialPrintTemplate>
 );
}
