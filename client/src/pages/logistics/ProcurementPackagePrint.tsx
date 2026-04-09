import { useEffect } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2 } from "lucide-react";
import OfficialPrintTemplate from "@/components/logistics/OfficialPrintTemplate";

/**
 * Consolidated Procurement Package Print
 * Renders all procurement documents in sequence: PR → RFQ → QA/BA → PO → GRN
 * Used for payment processing and complete documentation
 */
export default function ProcurementPackagePrint() {
 const [, params] = useRoute("/organization/logistics/procurement-package/:prId/print");
 const prId = params?.prId ? parseInt(params.prId) : 0;
 const { language, isRTL} = useLanguage();

 const packageQuery = trpc.logistics.package.getForPrint.useQuery(
 { purchaseRequestId: prId },
 { enabled: prId > 0 }
 );

 // Auto-trigger print dialog when data is loaded
 useEffect(() => {
 if (packageQuery.data && !packageQuery.isLoading) {
 setTimeout(() => window.print(), 500);
 }
 }, [packageQuery.data, packageQuery.isLoading]);

 if (packageQuery.isLoading) {
 return (
 <div className="min-h-screen flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
 <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
 </div>
 );
 }

 if (packageQuery.error || !packageQuery.data || !packageQuery.data.pr) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <p className="text-red-600">{isRTL ? 'لم يتم العثور على طلب الشراء' : 'Purchase Request not found'}</p>
 </div>
 );
 }

 const pkg = packageQuery.data;

 const t = {
 en: {
 title: "Procurement Package",
 pr: "Purchase Request",
 rfq: "Request for Quotation",
 qa: "Quotation Analysis",
 ba: "Bid Analysis",
 po: "Purchase Order",
 grn: "Goods Receipt Note",
 reqDate: "Request Date",
 prNumber: "PR Number",
 rfqNumber: "RFQ Number",
 qaNumber: "QA Number",
 baNumber: "BA Number",
 poNumber: "PO Number",
 grnNumber: "GRN Number",
 status: "Status",
 requestedBy: "Requested By",
 department: "Department",
 purpose: "Purpose",
 itemNo: "Item #",
 description: "Description",
 quantity: "Quantity",
 unit: "Unit",
 unitPrice: "Unit Price",
 totalPrice: "Total Price",
 grandTotal: "Grand Total",
 supplier: "Supplier",
 issueDate: "Issue Date",
 dueDate: "Due Date",
 deliveryDate: "Delivery Date",
 receivedDate: "Received Date",
 receivedBy: "Received By",
 inspectedBy: "Inspected By",
 notes: "Notes",
 },
 ar: {
 title: "حزمة المشتريات",
 pr: "طلب الشراء",
 rfq: "طلب عروض الأسعار",
 qa: "تحليل عروض الأسعار",
 ba: "تحليل العطاءات",
 po: "أمر الشراء",
 grn: "إشعار استلام البضائع",
 reqDate: "تاريخ الطلب",
 prNumber: "رقم طلب الشراء",
 rfqNumber: "رقم طلب العروض",
 qaNumber: "رقم تحليل العروض",
 baNumber: "رقم تحليل العطاءات",
 poNumber: "رقم أمر الشراء",
 grnNumber: "رقم إشعار الاستلام",
 status: "الحالة",
 requestedBy: "طلب من قبل",
 department: "القسم",
 purpose: "الغرض",
 itemNo: "رقم الصنف",
 description: "الوصف",
 quantity: "الكمية",
 unit: "الوحدة",
 unitPrice: "سعر الوحدة",
 totalPrice: "السعر الإجمالي",
 grandTotal: "المجموع الكلي",
 supplier: "المورد",
 issueDate: "تاريخ الإصدار",
 dueDate: "تاريخ الاستحقاق",
 deliveryDate: "تاريخ التسليم",
 receivedDate: "تاريخ الاستلام",
 receivedBy: "استلم من قبل",
 inspectedBy: "فحص من قبل",
 notes: "ملاحظات",
 },
 };

 const labels = t[language as keyof typeof t];

 // Calculate totals
 const calculateTotal = (items: any[]) => {
 return items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
 };

 return (
 <div className="print-container">
 {/* Purchase Request */}
 <OfficialPrintTemplate
      direction={isRTL ? 'rtl' : 'ltr'}
 title={labels.pr}
 documentNumber={pkg.pr.prNumber}
 documentDate={pkg.pr.prDate}
 >
 <div className="space-y-4">
 {/* Header Info */}
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <span className="font-semibold">{labels.requestedBy}:</span> {pkg.pr.requestedBy}
 </div>
 <div>
 <span className="font-semibold">{labels.department}:</span> {pkg.pr.department || "N/A"}
 </div>
 <div className="col-span-2">
 <span className="font-semibold">{labels.purpose}:</span> {pkg.pr.purpose}
 </div>
 </div>

 {/* Line Items Table */}
 <table className="w-full border-collapse text-sm">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-300 px-2 py-1">{labels.itemNo}</th>
 <th className="border border-gray-300 px-2 py-1">{labels.description}</th>
 <th className="border border-gray-300 px-2 py-1">{labels.quantity}</th>
 <th className="border border-gray-300 px-2 py-1">{labels.unit}</th>
 <th className="border border-gray-300 px-2 py-1">{labels.unitPrice}</th>
 <th className="border border-gray-300 px-2 py-1">{labels.totalPrice}</th>
 </tr>
 </thead>
 <tbody>
 {pkg.prLineItems.map((item: any, idx: number) => (
 <tr key={item.id}>
 <td className="border border-gray-300 px-2 py-1 text-center">{idx + 1}</td>
 <td className="border border-gray-300 px-2 py-1">{item.description}</td>
 <td className="border border-gray-300 px-2 py-1 text-center">{item.quantity}</td>
 <td className="border border-gray-300 px-2 py-1 text-center">{item.unit}</td>
 <td className="border border-gray-300 px-2 py-1 text-end">
 {pkg.pr.currency} {item.unitPriceUSD?.toFixed(2)}
 </td>
 <td className="border border-gray-300 px-2 py-1 text-end">
 {pkg.pr.currency} {item.totalPrice?.toFixed(2)}
 </td>
 </tr>
 ))}
 <tr className="font-bold bg-gray-50">
 <td colSpan={5} className="border border-gray-300 px-2 py-1 text-end">
 {labels.grandTotal}
 </td>
 <td className="border border-gray-300 px-2 py-1 text-end">
 {pkg.pr.currency} {pkg.pr.prTotalUSD?.toFixed(2)}
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </OfficialPrintTemplate>

 {/* RFQ (if exists) */}
 {pkg.rfq && (
 <div className="page-break">
 <OfficialPrintTemplate
      direction={isRTL ? 'rtl' : 'ltr'}
 title={labels.rfq}
 documentNumber={pkg.rfq.rfqNumber}
 documentDate={pkg.rfq.issueDate}
 >
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <span className="font-semibold">{labels.prNumber}:</span> {pkg.pr.prNumber}
 </div>
 <div>
 <span className="font-semibold">{labels.dueDate}:</span>{" "}
 {pkg.rfq.dueDate ? new Date(pkg.rfq.dueDate).toLocaleDateString() : "N/A"}
 </div>
 </div>

 {/* Reference PR line items */}
 <table className="w-full border-collapse text-sm">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-300 px-2 py-1">{labels.itemNo}</th>
 <th className="border border-gray-300 px-2 py-1">{labels.description}</th>
 <th className="border border-gray-300 px-2 py-1">{labels.quantity}</th>
 <th className="border border-gray-300 px-2 py-1">{labels.unit}</th>
 </tr>
 </thead>
 <tbody>
 {pkg.prLineItems.map((item: any, idx: number) => (
 <tr key={item.id}>
 <td className="border border-gray-300 px-2 py-1 text-center">{idx + 1}</td>
 <td className="border border-gray-300 px-2 py-1">{item.description}</td>
 <td className="border border-gray-300 px-2 py-1 text-center">{item.quantity}</td>
 <td className="border border-gray-300 px-2 py-1 text-center">{item.unit}</td>
 </tr>
 ))}
 </tbody>
 </table>

 {pkg.rfq.notes && (
 <div className="text-sm">
 <span className="font-semibold">{labels.notes}:</span> {pkg.rfq.notes}
 </div>
 )}
 </div>
 </OfficialPrintTemplate>
 </div>
 )}

 {/* Quotation Analysis (if exists) */}
 {pkg.qa && (
 <div className="page-break">
 <OfficialPrintTemplate
      direction={isRTL ? 'rtl' : 'ltr'}
 title={labels.qa}
 documentNumber={pkg.qa.qaNumber}
 documentDate={pkg.qa.qaDate}
 >
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <span className="font-semibold">{labels.prNumber}:</span> {pkg.pr.prNumber}
 </div>
 {pkg.rfq && (
 <div>
 <span className="font-semibold">{labels.rfqNumber}:</span> {pkg.rfq.rfqNumber}
 </div>
 )}
 </div>

 {/* QA Line Items with supplier comparison */}
 <table className="w-full border-collapse text-sm">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-300 px-2 py-1">{labels.itemNo}</th>
 <th className="border border-gray-300 px-2 py-1">{labels.description}</th>
 <th className="border border-gray-300 px-2 py-1">{labels.quantity}</th>
 <th className="border border-gray-300 px-2 py-1">{labels.unitPrice}</th>
 <th className="border border-gray-300 px-2 py-1">{labels.totalPrice}</th>
 </tr>
 </thead>
 <tbody>
 {pkg.qaLineItems.map((item: any, idx: number) => (
 <tr key={item.id}>
 <td className="border border-gray-300 px-2 py-1 text-center">{idx + 1}</td>
 <td className="border border-gray-300 px-2 py-1">{item.description}</td>
 <td className="border border-gray-300 px-2 py-1 text-center">{item.quantity}</td>
 <td className="border border-gray-300 px-2 py-1 text-end">
 {pkg.qa.currency} {item.unitPrice?.toFixed(2)}
 </td>
 <td className="border border-gray-300 px-2 py-1 text-end">
 {pkg.qa.currency} {item.totalPrice?.toFixed(2)}
 </td>
 </tr>
 ))}
 <tr className="font-bold bg-gray-50">
 <td colSpan={4} className="border border-gray-300 px-2 py-1 text-end">
 {labels.grandTotal}
 </td>
 <td className="border border-gray-300 px-2 py-1 text-end">
 {pkg.qa.currency} {calculateTotal(pkg.qaLineItems).toFixed(2)}
 </td>
 </tr>
 </tbody>
 </table>

 {pkg.qa.recommendation && (
 <div className="text-sm">
 <span className="font-semibold">Recommendation:</span> {pkg.qa.recommendation}
 </div>
 )}
 </div>
 </OfficialPrintTemplate>
 </div>
 )}

 {/* Bid Analysis (if exists - for tenders >$25K) */}
 {pkg.ba && (
 <div className="page-break">
 <OfficialPrintTemplate
      direction={isRTL ? 'rtl' : 'ltr'}
 title={labels.ba}
 documentNumber={pkg.ba.baNumber}
 documentDate={pkg.ba.baDate}
 >
 <div className="space-y-4">
 <div className="text-sm">
 <span className="font-semibold">{labels.prNumber}:</span> {pkg.pr.prNumber}
 </div>

 {/* Bidder comparison table */}
 {pkg.baBidders.length > 0 && (
 <table className="w-full border-collapse text-sm">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-300 px-2 py-1">Bidder</th>
 <th className="border border-gray-300 px-2 py-1">{isRTL ? 'إجمالي العطاء' : 'Total Bid'}</th>
 <th className="border border-gray-300 px-2 py-1">{isRTL ? 'الدرجة' : 'Score'}</th>
 <th className="border border-gray-300 px-2 py-1">{isRTL ? 'الترتيب' : 'Rank'}</th>
 </tr>
 </thead>
 <tbody>
 {pkg.baBidders.map((bidder: any) => (
 <tr key={bidder.id}>
 <td className="border border-gray-300 px-2 py-1">{bidder.bidderName}</td>
 <td className="border border-gray-300 px-2 py-1 text-end">
 {pkg.ba.currency} {bidder.totalBid?.toFixed(2)}
 </td>
 <td className="border border-gray-300 px-2 py-1 text-center">
 {bidder.totalScore || "N/A"}
 </td>
 <td className="border border-gray-300 px-2 py-1 text-center">
 {bidder.rank || "N/A"}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}

 {pkg.ba.recommendation && (
 <div className="text-sm">
 <span className="font-semibold">Recommendation:</span> {pkg.ba.recommendation}
 </div>
 )}
 </div>
 </OfficialPrintTemplate>
 </div>
 )}

 {/* Purchase Order (if exists) */}
 {pkg.po && (
 <div className="page-break">
 <OfficialPrintTemplate
      direction={isRTL ? 'rtl' : 'ltr'}
 title={labels.po}
 documentNumber={pkg.po.poNumber}
 documentDate={pkg.po.poDate}
 >
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <span className="font-semibold">{labels.supplier}:</span> {pkg.po.vendorName}
 </div>
 <div>
 <span className="font-semibold">{labels.deliveryDate}:</span>{" "}
 {pkg.po.deliveryDate ? new Date(pkg.po.deliveryDate).toLocaleDateString() : "N/A"}
 </div>
 </div>

 {/* PO Line Items */}
 <table className="w-full border-collapse text-sm">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-300 px-2 py-1">{labels.itemNo}</th>
 <th className="border border-gray-300 px-2 py-1">{labels.description}</th>
 <th className="border border-gray-300 px-2 py-1">{labels.quantity}</th>
 <th className="border border-gray-300 px-2 py-1">{labels.unit}</th>
 <th className="border border-gray-300 px-2 py-1">{labels.unitPrice}</th>
 <th className="border border-gray-300 px-2 py-1">{labels.totalPrice}</th>
 </tr>
 </thead>
 <tbody>
 {pkg.poLineItems.map((item: any, idx: number) => (
 <tr key={item.id}>
 <td className="border border-gray-300 px-2 py-1 text-center">{idx + 1}</td>
 <td className="border border-gray-300 px-2 py-1">{item.description}</td>
 <td className="border border-gray-300 px-2 py-1 text-center">{item.quantity}</td>
 <td className="border border-gray-300 px-2 py-1 text-center">{item.unit}</td>
 <td className="border border-gray-300 px-2 py-1 text-end">
 {pkg.po.currency} {item.unitPriceUSD?.toFixed(2)}
 </td>
 <td className="border border-gray-300 px-2 py-1 text-end">
 {pkg.po.currency} {item.totalPrice?.toFixed(2)}
 </td>
 </tr>
 ))}
 <tr className="font-bold bg-gray-50">
 <td colSpan={5} className="border border-gray-300 px-2 py-1 text-end">
 {labels.grandTotal}
 </td>
 <td className="border border-gray-300 px-2 py-1 text-end">
 {pkg.po.currency} {pkg.po.poTotalUSD?.toFixed(2)}
 </td>
 </tr>
 </tbody>
 </table>

 {pkg.po.notes && (
 <div className="text-sm">
 <span className="font-semibold">{labels.notes}:</span> {pkg.po.notes}
 </div>
 )}
 </div>
 </OfficialPrintTemplate>
 </div>
 )}

 {/* Goods Receipt Note (if exists) */}
 {pkg.grn && (
 <div className="page-break">
 <OfficialPrintTemplate
      direction={isRTL ? 'rtl' : 'ltr'}
 title={labels.grn}
 documentNumber={pkg.grn.grnNumber}
 documentDate={pkg.grn.grnDate}
 >
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <span className="font-semibold">{labels.poNumber}:</span> {pkg.po?.poNumber}
 </div>
 <div>
 <span className="font-semibold">{labels.receivedDate}:</span>{" "}
 {pkg.grn.receivedDate ? new Date(pkg.grn.receivedDate).toLocaleDateString() : "N/A"}
 </div>
 <div>
 <span className="font-semibold">{labels.receivedBy}:</span> {pkg.grn.receivedBy || "N/A"}
 </div>
 <div>
 <span className="font-semibold">{labels.inspectedBy}:</span> {pkg.grn.inspectedBy || "N/A"}
 </div>
 </div>

 {/* GRN Line Items */}
 <table className="w-full border-collapse text-sm">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-300 px-2 py-1">{labels.itemNo}</th>
 <th className="border border-gray-300 px-2 py-1">{labels.description}</th>
 <th className="border border-gray-300 px-2 py-1">Ordered</th>
 <th className="border border-gray-300 px-2 py-1">Received</th>
 <th className="border border-gray-300 px-2 py-1">{labels.unit}</th>
 <th className="border border-gray-300 px-2 py-1">Condition</th>
 </tr>
 </thead>
 <tbody>
 {pkg.grnLineItems.map((item: any, idx: number) => (
 <tr key={item.id}>
 <td className="border border-gray-300 px-2 py-1 text-center">{idx + 1}</td>
 <td className="border border-gray-300 px-2 py-1">{item.description}</td>
 <td className="border border-gray-300 px-2 py-1 text-center">{item.orderedQuantity}</td>
 <td className="border border-gray-300 px-2 py-1 text-center">{item.receivedQuantity}</td>
 <td className="border border-gray-300 px-2 py-1 text-center">{item.unit}</td>
 <td className="border border-gray-300 px-2 py-1 text-center">
 {item.condition || "Good"}
 </td>
 </tr>
 ))}
 </tbody>
 </table>

 {pkg.grn.notes && (
 <div className="text-sm">
 <span className="font-semibold">{labels.notes}:</span> {pkg.grn.notes}
 </div>
 )}
 </div>
 </OfficialPrintTemplate>
 </div>
 )}

 <style>{`
 @media print {
 .page-break {
 page-break-before: always;
 }
 }
 `}</style>
 </div>
 );
}
