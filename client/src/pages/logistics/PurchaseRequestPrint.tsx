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
 <div className="flex"><span className="text-sm text-muted-foreground w-32">Donor:</span><span className="text-sm font-medium">{pr.donorId || "-"}</span></div>
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

 {/* Digital Signatures Audit Trail */}
 <div className="mt-8 pt-6 border-t border-gray-300">
 <h3 className="text-sm font-bold mb-4">{isRTL ? 'التوقيعات الرقمية' : 'Digital Signatures'}</h3>
 <div className="grid grid-cols-3 gap-4">
 {/* Logistics Officer Signature */}
 <div className="border border-gray-300 p-4 rounded">
 <div className="text-xs font-semibold mb-2">{isRTL ? 'ضابط الخدمات اللوجستية' : 'Logistics Officer'}</div>
 {pr.logisticsSignatureDataUrl ? (
 <>
 <img src={pr.logisticsSignatureDataUrl} alt="Logistics Signature" className="w-full h-16 object-contain mb-2" />
 <div className="text-xs text-muted-foreground">
 <div>{pr.logisticsSignerName || '-'}</div>
 <div>{pr.logisticsSignerTitle || '-'}</div>
 <div>{pr.logValidatedOn ? format(new Date(pr.logValidatedOn), 'yyyy-MM-dd HH:mm') : '-'}</div>
 </div>
 </>
 ) : (
 <div className="text-xs text-muted-foreground italic">{isRTL ? 'لم يتم التوقيع بعد' : 'Not signed yet'}</div>
 )}
 </div>

 {/* Finance Officer Signature */}
 <div className="border border-gray-300 p-4 rounded">
 <div className="text-xs font-semibold mb-2">{isRTL ? 'ضابط المالية' : 'Finance Officer'}</div>
 {pr.financeSignatureDataUrl ? (
 <>
 <img src={pr.financeSignatureDataUrl} alt="Finance Signature" className="w-full h-16 object-contain mb-2" />
 <div className="text-xs text-muted-foreground">
 <div>{pr.financeSignerName || '-'}</div>
 <div>{pr.financeSignerTitle || '-'}</div>
 <div>{pr.finValidatedOn ? format(new Date(pr.finValidatedOn), 'yyyy-MM-dd HH:mm') : '-'}</div>
 </div>
 </>
 ) : (
 <div className="text-xs text-muted-foreground italic">{isRTL ? 'لم يتم التوقيع بعد' : 'Not signed yet'}</div>
 )}
 </div>

 {/* Office Manager (PM) Signature */}
 <div className="border border-gray-300 p-4 rounded">
 <div className="text-xs font-semibold mb-2">{isRTL ? 'مدير المكتب' : 'Office Manager'}</div>
 {pr.pmSignatureDataUrl ? (
 <>
 <img src={pr.pmSignatureDataUrl} alt="PM Signature" className="w-full h-16 object-contain mb-2" />
 <div className="text-xs text-muted-foreground">
 <div>{pr.pmSignerName || '-'}</div>
 <div>{pr.pmSignerTitle || '-'}</div>
 <div>{pr.approvedOn ? format(new Date(pr.approvedOn), 'yyyy-MM-dd HH:mm') : '-'}</div>
 </div>
 </>
 ) : (
 <div className="text-xs text-muted-foreground italic">{isRTL ? 'لم يتم التوقيع بعد' : 'Not signed yet'}</div>
 )}
 </div>
 </div>
 </div>
 </OfficialPrintTemplate>
 );
}
