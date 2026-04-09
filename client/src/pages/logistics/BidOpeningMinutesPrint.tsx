/**
 * Bid Opening Minutes (BOM) Print View
 * Donor-ready A4 print layout with bilingual EN/AR support
 * Uses OfficialPrintTemplate with committee details and bid opening records
 */
import { useOrganization } from "@/contexts/OrganizationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { OfficialPrintTemplate } from "@/components/logistics/OfficialPrintTemplate";
import { format } from "date-fns";

export default function BidOpeningMinutesPrint() {
 const { currentOrganization } = useOrganization();
  const { language, isRTL} = useLanguage();
 const [, params] = useRoute("/organization/logistics/bid-opening-minutes/:id/print");
 const id = params?.id ? parseInt(params.id) : 0;

 const { data: bom, isLoading } = trpc.logistics.bidOpeningMinutes.getById.useQuery(
 { id },
 { enabled: !!id }
 );

 if (isLoading) return <div className="p-8 text-center">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>;
 if (!bom) return <div className="p-8 text-center">{isRTL ? 'لم يتم العثور على محضر فتح العروض' : 'Bid Opening Minutes not found'}</div>;

 const prNumber = bom.purchaseRequest?.prNumber || "-";
 const currency = bom.purchaseRequest?.currency || "USD";
 const prTotal = parseFloat(String(bom.purchaseRequest?.prTotalUsd || bom.purchaseRequest?.prTotalUSD || "0"));

 return (
 <OfficialPrintTemplate
      direction={isRTL ? 'rtl' : 'ltr'}
 organizationLogo={currentOrganization?.logoUrl}
 organizationName={currentOrganization?.name}
 organizationNameAr={currentOrganization?.nameAr}
 formTitle="Bid Opening Minutes"
 formTitleAr="محضر فتح المظاريف"
 formNumber={bom.bomNumber || `BOM-${bom.id}`}
 formDate={bom.openingDate ? format(new Date(bom.openingDate), "yyyy-MM-dd") : ""}
 signatureBlocks={[
 { label: "Committee Chairperson", labelAr: "رئيس اللجنة", name: bom.chairpersonName || "" },
 { label: "Committee Member 1", labelAr: "عضو اللجنة 1", name: bom.member1Name || "" },
 { label: "Committee Member 2", labelAr: "عضو اللجنة 2", name: bom.member2Name || "" },
 ]}
 >
 {/* Metadata Section */}
 <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
 <div className="space-y-1.5">
 <div className="flex gap-2">
 <span className="text-gray-500 w-40 shrink-0">PR Reference / مرجع طلب الشراء:</span>
 <span className="font-medium">{prNumber}</span>
 </div>
 <div className="flex gap-2">
 <span className="text-gray-500 w-40 shrink-0">Status / الحالة:</span>
 <span className="font-medium capitalize">{(bom.status || "draft").replace(/_/g, " ")}</span>
 </div>
 <div className="flex gap-2">
 <span className="text-gray-500 w-40 shrink-0">{isRTL ? 'طريقة الفتح:' : 'Opening Mode / طريقة الفتح:'}</span>
 <span className="font-medium capitalize">{(bom.openingMode || "in_person").replace(/_/g, " ")}</span>
 </div>
 </div>
 <div className="space-y-1.5">
 <div className="flex gap-2">
 <span className="text-gray-500 w-40 shrink-0">Currency / العملة:</span>
 <span className="font-medium">{currency}</span>
 </div>
 <div className="flex gap-2">
 <span className="text-gray-500 w-40 shrink-0">PR Total / إجمالي الطلب:</span>
 <span className="font-medium">{currency} {prTotal.toLocaleString()}</span>
 </div>
 <div className="flex gap-2">
 <span className="text-gray-500 w-40 shrink-0">CBA Reference / مرجع التحليل:</span>
 <span className="font-medium">{bom.bidAnalysis?.cbaNumber || "-"}</span>
 </div>
 </div>
 </div>

 {/* Opening Details */}
 <h4 className="text-sm font-bold mb-2 border-b pb-1">
 Opening Details / تفاصيل الفتح
 </h4>
 <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
 <div className="space-y-1">
 <div className="flex gap-2">
 <span className="text-gray-500 w-32 shrink-0">Date / التاريخ:</span>
 <span>{bom.openingDate ? format(new Date(bom.openingDate), "yyyy-MM-dd") : "-"}</span>
 </div>
 <div className="flex gap-2">
 <span className="text-gray-500 w-32 shrink-0">Time / الوقت:</span>
 <span>{bom.openingTime || "-"}</span>
 </div>
 </div>
 <div className="space-y-1">
 <div className="flex gap-2">
 <span className="text-gray-500 w-32 shrink-0">Venue / المكان:</span>
 <span>{bom.openingVenue || "-"}</span>
 </div>
 <div className="flex gap-2">
 <span className="text-gray-500 w-32 shrink-0">Mode / الطريقة:</span>
 <span className="capitalize">{(bom.openingMode || "in_person").replace(/_/g, " ")}</span>
 </div>
 </div>
 </div>

 {/* Committee Members */}
 <h4 className="text-sm font-bold mb-2 border-b pb-1 mt-4">
 Bid Opening Committee / لجنة فتح المظاريف
 </h4>
 <table className="w-full border-collapse border border-gray-400 text-xs mb-4">
 <thead>
 <tr className="bg-gray-100">
 <th className="border border-gray-400 px-2 py-1.5 text-center w-8">#</th>
 <th className="border border-gray-400 px-2 py-1.5 text-start">Role / الدور</th>
 <th className="border border-gray-400 px-2 py-1.5 text-start">Name / الاسم</th>
 </tr>
 </thead>
 <tbody>
 <tr>
 <td className="border border-gray-400 px-2 py-1 text-center">1</td>
 <td className="border border-gray-400 px-2 py-1">Chairperson / رئيس اللجنة</td>
 <td className="border border-gray-400 px-2 py-1">{bom.chairpersonName || "-"}</td>
 </tr>
 <tr>
 <td className="border border-gray-400 px-2 py-1 text-center">2</td>
 <td className="border border-gray-400 px-2 py-1">Member / عضو</td>
 <td className="border border-gray-400 px-2 py-1">{bom.member1Name || "-"}</td>
 </tr>
 <tr>
 <td className="border border-gray-400 px-2 py-1 text-center">3</td>
 <td className="border border-gray-400 px-2 py-1">Member / عضو</td>
 <td className="border border-gray-400 px-2 py-1">{bom.member2Name || "-"}</td>
 </tr>
 </tbody>
 </table>

 {/* Bids Received Summary */}
 <h4 className="text-sm font-bold mb-2 border-b pb-1 mt-4">
 Bids Received / العطاءات المستلمة
 </h4>
 <div className="text-xs mb-4 p-3 border border-gray-300 bg-gray-50">
 <p>
 The Bid Opening Committee convened on{" "}
 <strong>{bom.openingDate ? format(new Date(bom.openingDate), "MMMM d, yyyy") : "[Date]"}</strong>{" "}
 at <strong>{bom.openingTime || "[Time]"}</strong>{" "}
 at <strong>{bom.openingVenue || "[Venue]"}</strong>{" "}
 to open the sealed bids received for Purchase Request <strong>{prNumber}</strong>{" "}
 with an estimated value of <strong>{currency} {prTotal.toLocaleString()}</strong>.
 </p>
 <p className="mt-2" dir="rtl">
 اجتمعت لجنة فتح المظاريف بتاريخ{" "}
 <strong>{bom.openingDate ? format(new Date(bom.openingDate), "yyyy-MM-dd") : "[التاريخ]"}</strong>{" "}
 الساعة <strong>{bom.openingTime || "[الوقت]"}</strong>{" "}
 في <strong>{bom.openingVenue || "[المكان]"}</strong>{" "}
 لفتح العطاءات المختومة المستلمة لطلب الشراء <strong>{prNumber}</strong>{" "}
 بقيمة تقديرية <strong>{currency} {prTotal.toLocaleString()}</strong>.
 </p>
 </div>

 {/* Observations */}
 {bom.observations && (
 <div className="mt-4">
 <h4 className="text-sm font-bold mb-1">Observations / الملاحظات:</h4>
 <p className="text-xs text-gray-600">{bom.observations}</p>
 </div>
 )}

 {/* Declaration */}
 <div className="mt-6 p-3 border-2 border-gray-600 text-xs">
 <p className="font-bold mb-1">Declaration / إقرار:</p>
 <p>
 We, the undersigned members of the Bid Opening Committee, certify that the above minutes accurately
 reflect the proceedings of the bid opening session. All bids were opened in the presence of the
 committee members and the process was conducted in a fair and transparent manner in accordance with
 the organization's procurement policies and donor requirements.
 </p>
 <p className="mt-1" dir="rtl">
 نحن أعضاء لجنة فتح المظاريف الموقعون أدناه نشهد بأن المحضر أعلاه يعكس بدقة إجراءات جلسة فتح
 المظاريف. تم فتح جميع العطاءات بحضور أعضاء اللجنة وتمت العملية بطريقة عادلة وشفافة وفقاً
 لسياسات المشتريات الخاصة بالمنظمة ومتطلبات المانحين.
 </p>
 </div>
 </OfficialPrintTemplate>
 );
}
