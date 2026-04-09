/**
 * Request for Quotation (RFQ) Print View
 * Donor-ready A4 print layout with bilingual EN/AR support
 * Uses OfficialPrintTemplate with vendor invitation details and line items
 */
import { useOrganization } from "@/contexts/OrganizationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { OfficialPrintTemplate } from "@/components/logistics/OfficialPrintTemplate";
import { format } from "date-fns";

export default function RFQPrint() {
 const { currentOrganization } = useOrganization();
  const { language, isRTL} = useLanguage();
 const [, params] = useRoute("/organization/logistics/rfq/:id/print");
 const id = params?.id ? parseInt(params.id) : 0;

 const { data: rfq, isLoading } = trpc.logistics.rfq.getByPR.useQuery(
 { purchaseRequestId: id },
 { enabled: !!id }
 );

 const { data: pr } = trpc.logistics.purchaseRequest.getById.useQuery(
 { id },
 { enabled: !!id }
 );

 const { data: vendors } = trpc.logistics.rfq.listByPR.useQuery(
 { purchaseRequestId: id },
 { enabled: !!id }
 );

 if (isLoading) return <div className="p-8 text-center">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>;
 if (!rfq) return <div className="p-8 text-center">RFQ not found</div>;
 if (!pr) return <div className="p-8 text-center">{isRTL ? 'لم يتم العثور على طلب الشراء' : 'Purchase Request not found'}</div>;

 const lineItems = pr.lineItems || [];
 const prNumber = pr.prNumber || "-";
 const currency = pr.currency || "USD";
 const prTotal = parseFloat(String(pr.prTotalUSD || "0"));
 const invitedVendors = vendors || [];

 return (
 <OfficialPrintTemplate
      direction={isRTL ? 'rtl' : 'ltr'}
 organizationLogo={currentOrganization?.logoUrl}
 organizationName={currentOrganization?.name}
 organizationNameAr={currentOrganization?.nameAr}
 formTitle="Request for Quotation"
 formTitleAr="طلب عرض أسعار"
 formNumber={rfq.rfqNumber || `RFQ-${rfq.id}`}
 formDate={rfq.issueDate ? format(new Date(rfq.issueDate), "yyyy-MM-dd") : ""}
 signatureBlocks={[
 { label: "Prepared By", labelAr: "أعد بواسطة" },
 { label: "Reviewed By", labelAr: "راجع بواسطة" },
 { label: "Approved By", labelAr: "اعتمد بواسطة" },
 ]}
 >
 {/* Metadata Section */}
 <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
 <div className="space-y-1.5">
 <div className="flex gap-2">
 <span className="text-gray-500 w-36 shrink-0">PR Reference / مرجع طلب الشراء:</span>
 <span className="font-medium">{prNumber}</span>
 </div>
 <div className="flex gap-2">
 <span className="text-gray-500 w-36 shrink-0">Status / الحالة:</span>
 <span className="font-medium capitalize">{(rfq.status || "draft").replace(/_/g, " ")}</span>
 </div>
 <div className="flex gap-2">
 <span className="text-gray-500 w-36 shrink-0">{isRTL ? 'تاريخ الإصدار:' : 'Issue Date / تاريخ الإصدار:'}</span>
 <span className="font-medium">{rfq.issueDate ? format(new Date(rfq.issueDate), "yyyy-MM-dd") : "-"}</span>
 </div>
 </div>
 <div className="space-y-1.5">
 <div className="flex gap-2">
 <span className="text-gray-500 w-36 shrink-0">Currency / العملة:</span>
 <span className="font-medium">{currency}</span>
 </div>
 <div className="flex gap-2">
 <span className="text-gray-500 w-36 shrink-0">{isRTL ? 'الإجمالي المقدر:' : 'Estimated Total / الإجمالي المقدر:'}</span>
 <span className="font-medium">{currency} {prTotal.toLocaleString()}</span>
 </div>
 <div className="flex gap-2">
 <span className="text-gray-500 w-36 shrink-0">{isRTL ? 'تاريخ الاستحقاق:' : 'Due Date / تاريخ الاستحقاق:'}</span>
 <span className="font-medium">{rfq.dueDate ? format(new Date(rfq.dueDate), "yyyy-MM-dd") : "-"}</span>
 </div>
 </div>
 </div>

 {/* Invited Vendors Section */}
 {invitedVendors.length > 0 && (
 <div className="mb-6">
 <h3 className="text-sm font-semibold mb-3 border-b pb-1">
 Invited Vendors / الموردون المدعوون
 </h3>
 <div className="grid grid-cols-2 gap-2 text-sm">
 {invitedVendors.map((vendor: any, idx: number) => (
 <div key={idx} className="flex gap-2">
 <span className="text-gray-500">{idx + 1}.</span>
 <span className="font-medium">{vendor.supplierName || `Vendor ${vendor.supplierId}`}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Line Items Table */}
 <div className="mb-6">
 <h3 className="text-sm font-semibold mb-3 border-b pb-1">
 Items Requested / الأصناف المطلوبة
 </h3>
 <table className="w-full text-xs border-collapse">
 <thead>
 <tr className="bg-gray-50 border-y border-gray-300">
 <th className="p-2 text-start w-12">#</th>
 <th className="p-2 text-start">Description / الوصف</th>
 <th className="p-2 text-center w-24">Qty / الكمية</th>
 <th className="p-2 text-center w-20">Unit / الوحدة</th>
 <th className="p-2 text-start">Specifications / المواصفات</th>
 </tr>
 </thead>
 <tbody>
 {lineItems.map((item: any, idx: number) => (
 <tr key={item.id} className="border-b border-gray-200">
 <td className="p-2 text-gray-500">{idx + 1}</td>
 <td className="p-2">
 <div className="font-medium">{item.itemDescription}</div>
 </td>
 <td className="p-2 text-center">{item.quantity}</td>
 <td className="p-2 text-center">{item.unit}</td>
 <td className="p-2 text-gray-600 text-[10px]">{item.specifications || "-"}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Instructions Section */}
 <div className="mb-6 text-xs">
 <h3 className="text-sm font-semibold mb-2 border-b pb-1">
 Submission Instructions / تعليمات التقديم
 </h3>
 <div className="space-y-1.5 text-gray-700">
 <p>
 <strong>1.</strong> Please submit your quotation before the due date mentioned above.
 </p>
 <p>
 <strong>2.</strong> All prices must be quoted in {currency}.
 </p>
 <p>
 <strong>3.</strong> Include delivery time, warranty terms, and payment conditions.
 </p>
 <p>
 <strong>4.</strong> Quotations must be signed and stamped by authorized personnel.
 </p>
 </div>
 </div>

 {/* Notes Section */}
 {rfq.notes && (
 <div className="mb-6 text-xs">
 <h3 className="text-sm font-semibold mb-2 border-b pb-1">
 Additional Notes / ملاحظات إضافية
 </h3>
 <p className="text-gray-700 whitespace-pre-wrap">{rfq.notes}</p>
 </div>
 )}
 </OfficialPrintTemplate>
 );
}
