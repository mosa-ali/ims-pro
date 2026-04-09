/**
 * Goods Receipt Note Print View
 * Official document format using OfficialPrintTemplate with children pattern
 */
import { useOrganization } from "@/contexts/OrganizationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { OfficialPrintTemplate } from "@/components/logistics/OfficialPrintTemplate";
import { format } from "date-fns";

export default function GoodsReceiptPrint() {
 const { currentOrganization } = useOrganization();
  const { language, isRTL} = useLanguage();
 const [, params] = useRoute("/organization/logistics/grn/:id/print");
 const id = params?.id ? parseInt(params.id) : 0;

 const { data: grn, isLoading } = trpc.logistics.grn.getById.useQuery(
 { id, organizationId: currentOrganization?.id || 0 },
 { enabled: !!id && !!currentOrganization?.id }
 );

 if (isLoading) return <div className="p-8 text-center">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>;
 if (!grn) return <div className="p-8 text-center">{isRTL ? 'لم يتم العثور على إيصال استلام البضائع' : 'Goods Receipt Note not found'}</div>;

 const lineItems = grn.lineItems || [];

 return (
 <OfficialPrintTemplate
      direction={isRTL ? 'rtl' : 'ltr'}
 organizationLogo={currentOrganization?.logoUrl}
 organizationName={currentOrganization?.name}
 organizationNameAr={currentOrganization?.nameAr}
 formTitle="Goods Receipt Note"
 formTitleAr="إشعار استلام البضائع"
 formNumber={grn.grnNumber || `GRN-${grn.id}`}
 formDate={grn.grnDate ? format(new Date(grn.grnDate), "yyyy-MM-dd") : ""}
 signatureBlocks={[
 { label: "Received By", labelAr: "استلم بواسطة", name: grn.receivedBy || "", date: grn.grnDate ? format(new Date(grn.grnDate), "yyyy-MM-dd") : "" },
 { label: "Inspected By", labelAr: "فحص بواسطة", name: grn.inspectedBy || "" },
 { label: "Approved By", labelAr: "اعتمد بواسطة" },
 ]}
 >
 {/* Metadata */}
 <div className="grid grid-cols-2 gap-4 mb-6">
 <div className="space-y-2">
 <div className="flex"><span className="text-sm text-muted-foreground w-32">PO Reference:</span><span className="text-sm font-medium">{grn.poNumber || "-"}</span></div>
 <div className="flex"><span className="text-sm text-muted-foreground w-32">Supplier:</span><span className="text-sm font-medium">{grn.supplierName || "-"}</span></div>
 <div className="flex"><span className="text-sm text-muted-foreground w-32">{isRTL ? 'رقم إشعار التسليم:' : 'Delivery Note No.:'}</span><span className="text-sm font-medium">{grn.deliveryNoteNumber || "-"}</span></div>
 </div>
 <div className="space-y-2">
 <div className="flex"><span className="text-sm text-muted-foreground w-32">{isRTL ? 'رقم الفاتورة:' : 'Invoice No.:'}</span><span className="text-sm font-medium">{grn.invoiceNumber || "-"}</span></div>
 <div className="flex"><span className="text-sm text-muted-foreground w-32">Status:</span><span className="text-sm font-medium capitalize">{(grn.status || "pending").replace(/_/g, " ")}</span></div>
 <div className="flex"><span className="text-sm text-muted-foreground w-32">Warehouse:</span><span className="text-sm font-medium">{grn.warehouseLocation || "-"}</span></div>
 </div>
 </div>

 {/* Line Items Table */}
 <table className="w-full border-collapse border border-gray-300 text-sm">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-300 px-3 py-2 text-start">#</th>
 <th className="border border-gray-300 px-3 py-2 text-start">{isRTL ? 'الوصف' : 'Description'}</th>
 <th className="border border-gray-300 px-3 py-2 text-end">{isRTL ? 'الكمية المطلوبة' : 'Ordered Qty'}</th>
 <th className="border border-gray-300 px-3 py-2 text-end">{isRTL ? 'الكمية المستلمة' : 'Received Qty'}</th>
 <th className="border border-gray-300 px-3 py-2 text-start">{isRTL ? 'الوحدة' : 'Unit'}</th>
 <th className="border border-gray-300 px-3 py-2 text-start">Condition</th>
 <th className="border border-gray-300 px-3 py-2 text-start">{isRTL ? 'ملاحظات' : 'Notes'}</th>
 </tr>
 </thead>
 <tbody>
 {lineItems.map((item: any, idx: number) => (
 <tr key={idx}>
 <td className="border border-gray-300 px-3 py-2">{idx + 1}</td>
 <td className="border border-gray-300 px-3 py-2">{item.description}</td>
 <td className="border border-gray-300 px-3 py-2 text-end">{item.orderedQuantity || 0}</td>
 <td className="border border-gray-300 px-3 py-2 text-end">{item.receivedQuantity || 0}</td>
 <td className="border border-gray-300 px-3 py-2">{item.unit || "-"}</td>
 <td className="border border-gray-300 px-3 py-2">{item.condition || "Good"}</td>
 <td className="border border-gray-300 px-3 py-2">{item.notes || "-"}</td>
 </tr>
 ))}
 </tbody>
 </table>

 {grn.remarks && (
 <div className="mt-4">
 <h4 className="text-sm font-semibold mb-1">Remarks:</h4>
 <p className="text-sm text-muted-foreground">{grn.remarks}</p>
 </div>
 )}
 </OfficialPrintTemplate>
 );
}
