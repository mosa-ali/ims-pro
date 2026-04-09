/**
 * Purchase Request Print View
 * Official document format using OfficialPrintTemplate with children pattern
 */
import { useOrganization } from "@/contexts/OrganizationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { OfficialPrintTemplate } from "@/components/logistics/OfficialPrintTemplate";
import { format } from "date-fns";

export default function PurchaseRequestPrint() {
 const { currentOrganization } = useOrganization();
  const { language, isRTL} = useLanguage();
 const [, params] = useRoute("/organization/logistics/purchase-requests/:id/print");
 const id = params?.id ? parseInt(params.id) : 0;

 const { data: pr, isLoading } = trpc.logistics.purchaseRequests.getById.useQuery(
 { id, organizationId: currentOrganization?.id || 0 },
 { enabled: !!id && !!currentOrganization?.id }
 );

 if (isLoading) return <div className="p-8 text-center">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>;
 if (!pr) return <div className="p-8 text-center">{isRTL ? 'لم يتم العثور على طلب الشراء' : 'Purchase Request not found'}</div>;

 const lineItems = pr.lineItems || [];

 return (
 <OfficialPrintTemplate
      direction={isRTL ? 'rtl' : 'ltr'}
 organizationLogo={currentOrganization?.logoUrl}
 organizationName={currentOrganization?.name}
 organizationNameAr={currentOrganization?.nameAr}
 formTitle="Purchase Request"
 formTitleAr="طلب شراء"
 formNumber={pr.prNumber || `PR-${pr.id}`}
 formDate={pr.createdAt ? format(new Date(pr.createdAt), "yyyy-MM-dd") : ""}
 signatureBlocks={[
 { label: "Requested By", labelAr: "طلب بواسطة", name: pr.requesterName || "", date: pr.createdAt ? format(new Date(pr.createdAt), "yyyy-MM-dd") : "" },
 { label: "Reviewed By", labelAr: "راجع بواسطة" },
 { label: "Approved By", labelAr: "اعتمد بواسطة" },
 ]}
 >
 {/* Metadata */}
 <div className="grid grid-cols-2 gap-4 mb-6">
 <div className="space-y-2">
 <div className="flex"><span className="text-sm text-muted-foreground w-32">Project:</span><span className="text-sm font-medium">{pr.projectTitle || "-"}</span></div>
 <div className="flex"><span className="text-sm text-muted-foreground w-32">Category:</span><span className="text-sm font-medium capitalize">{pr.category || "-"}</span></div>
 <div className="flex"><span className="text-sm text-muted-foreground w-32">Urgency:</span><span className="text-sm font-medium capitalize">{pr.urgency || "Normal"}</span></div>
 <div className="flex"><span className="text-sm text-muted-foreground w-32">Department:</span><span className="text-sm font-medium">{pr.department || "-"}</span></div>
 </div>
 <div className="space-y-2">
 <div className="flex"><span className="text-sm text-muted-foreground w-32">Donor:</span><span className="text-sm font-medium">{pr.donor || "-"}</span></div>
 <div className="flex"><span className="text-sm text-muted-foreground w-32">{isRTL ? 'رمز الميزانية:' : 'Budget Code:'}</span><span className="text-sm font-medium">{pr.budgetCode || "-"}</span></div>
 <div className="flex"><span className="text-sm text-muted-foreground w-32">{isRTL ? 'مطلوب بحلول:' : 'Needed By:'}</span><span className="text-sm font-medium">{pr.neededByDate ? format(new Date(pr.neededByDate), "yyyy-MM-dd") : "-"}</span></div>
 <div className="flex"><span className="text-sm text-muted-foreground w-32">{isRTL ? 'المبلغ الإجمالي:' : 'Total Amount:'}</span><span className="text-sm font-bold">{pr.currency} {parseFloat(pr.totalAmount || "0").toLocaleString()}</span></div>
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
 <td className="border border-gray-300 px-3 py-2 text-end">{pr.currency} {parseFloat(item.unitPrice || "0").toLocaleString()}</td>
 <td className="border border-gray-300 px-3 py-2 text-end">{pr.currency} {parseFloat(item.totalPrice || "0").toLocaleString()}</td>
 </tr>
 ))}
 </tbody>
 <tfoot>
 <tr className="bg-gray-50 font-bold">
 <td colSpan={5} className="border border-gray-300 px-3 py-2 text-end">Total:</td>
 <td className="border border-gray-300 px-3 py-2 text-end">{pr.currency} {parseFloat(pr.totalAmount || "0").toLocaleString()}</td>
 </tr>
 </tfoot>
 </table>

 {pr.justificationEn && (
 <div className="mt-4">
 <h4 className="text-sm font-semibold mb-1">Justification:</h4>
 <p className="text-sm text-muted-foreground">{pr.justificationEn}</p>
 </div>
 )}
 </OfficialPrintTemplate>
 );
}
