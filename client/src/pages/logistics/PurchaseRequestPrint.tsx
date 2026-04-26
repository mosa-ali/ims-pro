import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { OfficialPrintTemplate } from "@/components/logistics/OfficialPrintTemplate";
import { format } from "date-fns";
import { FileText } from "lucide-react";


export default function PurchaseRequestPrint() {
  const { currentOrganization } = useOrganization();
  const { currentOperatingUnit } = useOperatingUnit();
  const { isRTL } = useLanguage();

  // Branding only used as fallback for logo
  const brandingQuery = trpc.settings.branding.get.useQuery();
  const branding = brandingQuery.data;

  const [, params] = useRoute(
    "/organization/logistics/purchase-requests/:id/print"
  );

  const id = params?.id ? parseInt(params.id) : 0;

  const { data: pr, isLoading } =
  trpc.logistics.purchaseRequests.getById.useQuery(
    { id },
    {
      enabled: !!id,
    }
  );

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        {isRTL ? "جاري التحميل..." : "Loading..."}
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="p-8 text-center">
        {isRTL
          ? "لم يتم العثور على طلب الشراء"
          : "Purchase Request not found"}
      </div>
    );
  }

  const lineItems = pr.lineItems || [];

  const totalAmount = Number(
     pr.prTotalUsd ?? pr.total ?? 0
     ).toLocaleString();

  const formatDate = (
    date: string | null | undefined
  ) => {
    if (!date) return "-";
    return format(
      new Date(date),
      "yyyy-MM-dd HH:mm"
    );
  };

  const signatureSections = [
    {
      key: "requested",
      title: isRTL ? "مقدم الطلب" : "Requested By",
    },
    {
      key: "logistics",
      title: isRTL
        ? "اعتماد اللوجستيات"
        : "Logistics Validation",
    },
    {
      key: "finance",
      title: isRTL
        ? "اعتماد المالية"
        : "Finance Validation",
    },
    {
      key: "approval",
      title: isRTL
        ? "الاعتماد النهائي"
        : "Final Approval",
    },
  ];

  const orderedSections = isRTL
    ? [...signatureSections].reverse()
    : signatureSections;

  const renderSignatureBlock = (
    key: string
  ) => {
    switch (key) {
      case "requested":
        return (
          <>
            <div className="text-xs font-semibold mb-2">
              {isRTL
                ? "مقدم الطلب"
                : "Requested By"}
            </div>
            <div className="mt-6 border-t pt-2 text-xs mb-2">
              {formatDate(pr.createdAt)}
            </div>
            <div className="text-sm font-medium">
              {pr.requesterName || "-"}
            </div>
          </>
        );

      case "logistics":
        return (
          <>
            <div className="text-xs font-semibold mb-2">
              {isRTL
                ? "اعتماد اللوجستيات"
                : "Logistics Validation"}
            </div>
            {pr.logisticsSignatureDataUrl ? (
              <>
                <div className="text-xs mt-2 mb-2 border-t pt-2">
                  {formatDate(pr.logValidatedOn)}
                </div>
                <div className="text-sm font-medium">
                  {pr.logisticsSignerName || "-"}
                </div>
                <div className="text-xs text-gray-600">
                  {pr.logisticsSignerTitle || "-"}
                </div>
                <img
                  src={pr.logisticsSignatureDataUrl}
                  alt="Logistics Signature"
                  className="h-16 mx-auto object-contain mt-3"
                />
              </>
            ) : (
              <div className="text-xs italic text-gray-400 mt-10">
                {isRTL
                  ? "لم يتم التوقيع بعد"
                  : "Not signed yet"}
              </div>
            )}
          </>
        );

      case "finance":
        return (
          <>
            <div className="text-xs font-semibold mb-2">
              {isRTL
                ? "اعتماد المالية"
                : "Finance Validation"}
            </div>
            {pr.financeSignatureDataUrl ? (
              <>
                <div className="text-xs mt-2 mb-2 border-t pt-2">
                  {formatDate(pr.finValidatedOn)}
                </div>
                <div className="text-sm font-medium">
                  {pr.financeSignerName || "-"}
                </div>
                <div className="text-xs text-gray-600">
                  {pr.financeSignerTitle || "-"}
                </div>
                <img
                  src={pr.financeSignatureDataUrl}
                  alt="Finance Signature"
                  className="h-16 mx-auto object-contain mt-3"
                />
              </>
            ) : (
              <div className="text-xs italic text-gray-400 mt-10">
                {isRTL
                  ? "لم يتم التوقيع بعد"
                  : "Not signed yet"}
              </div>
            )}
          </>
        );

      case "approval":
        return (
          <>
            <div className="text-xs font-semibold mb-2">
              {isRTL
                ? "الاعتماد النهائي"
                : "Final Approval"}
            </div>
            {pr.pmSignatureDataUrl ? (
              <>
                <div className="text-xs mt-2 mb-2 border-t pt-2">
                  {formatDate(pr.approvedOn)}
                </div>
                <div className="text-sm font-medium">
                  {pr.pmSignerName || "-"}
                </div>
                <div className="text-xs text-gray-600">
                  {pr.pmSignerTitle || "-"}
                </div>
                <img
                  src={pr.pmSignatureDataUrl}
                  alt="Approval Signature"
                  className="h-16 mx-auto object-contain mt-3"
                />
              </>
            ) : (
              <div className="text-xs italic text-gray-400 mt-10">
                {isRTL
                  ? "لم يتم التوقيع بعد"
                  : "Not signed yet"}
              </div>
            )}
          </>
        );
      default:
        return null;
    }
  };
  
  const handleDownloadPDF = () => {
  window.print();
};

return (
  <>
    {/* Top Action Bar (NOT printed) */}
    <div className="flex justify-end gap-3 mb-4 print:hidden">
      <button
        onClick={() => window.history.back()}
        className="px-4 py-2 border rounded-md bg-white hover:bg-gray-50"
      >
        {isRTL ? "رجوع" : "Back"}
      </button>

      <button
        onClick={handleDownloadPDF}
        className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800"
      >
        <FileText className="inline w-4 h-4 mr-2" />
        {isRTL ? "طباعة / حفظ PDF" : "Print / Save as PDF"}
      </button>
    </div>
    
    <OfficialPrintTemplate
      direction={isRTL ? "rtl" : "ltr"}
      organizationLogo={
        currentOrganization?.logoUrl ||
        branding?.logoUrl ||
        undefined
      }
      organizationName={
        currentOrganization?.name || "-"
      }
      organizationNameAr={
        currentOrganization?.nameAr || ""
      }
      operatingUnitName={
        currentOperatingUnit?.name || "-"
      }
      formTitle="Purchase Request"
      formNumber={
        pr.prNumber || `PR-${pr.id}`
      }
      formDate={
        pr.createdAt
          ? format(
              new Date(pr.createdAt),
              "yyyy-MM-dd"
            )
          : ""
      }
    >
      {/* Metadata */}
      <div
        className={`grid grid-cols-2 gap-6 mb-6 ${
          isRTL
            ? "text-right"
            : "text-left"
        }`}
      >
        <div className="space-y-2">
          <div>
            <strong>
              {isRTL
                ? "المشروع:"
                : "Project:"}
            </strong>{" "}
            {pr.projectTitle || "-"}
          </div>

          <div>
            <strong>
              {isRTL
                ? "الفئة:"
                : "Category:"}
            </strong>{" "}
            {pr.category || "-"}
          </div>
          <div>
            <strong>
              {isRTL
                ? "الأولوية:"
                : "Urgency:"}
            </strong>{" "}
            {pr.urgency || "-"}
          </div>
          <div>
            <strong>
              {isRTL
                ? "القسم:"
                : "Department:"}
            </strong>{" "}
            {pr.department || "-"}
          </div>
          <div>
            <strong>
              {isRTL
                ? "الوحدة التشغيلية:"
                : "Operating Unit:"}
            </strong>{" "}
            {currentOperatingUnit?.name ||
              "-"}
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <strong>
              {isRTL
                ? "الجهة المانحة:"
                : "Donor:"}
            </strong>{" "}
            {pr.donorName || "-"}
          </div>
          <div>
            <strong>
              {isRTL
                ? "رمز الميزانية:"
                : "Budget Code:"}
            </strong>{" "}
            {pr.budgetCode || "-"}
          </div>
          <div>
            <strong>
              {isRTL
                ? "مطلوب بحلول:"
                : "Needed By:"}
            </strong>{" "}
            {pr.neededBy
              ? format(
                  new Date(pr.neededBy),
                  "yyyy-MM-dd"
                )
              : "-"}
          </div>
          <div>
            <strong>
              {isRTL
                ? "المبلغ الإجمالي:"
                : "Total Amount:"}
            </strong>{" "}
            {pr.exchangeTo} {totalAmount}
          </div>
        </div>
      </div>
      {/* Line Items */}
      <table className="w-full border text-sm mb-6">
        <thead>
          <tr
            style={{
              backgroundColor:
                "#1e40af",
              color: "white",
              WebkitPrintColorAdjust:
                "exact",
              printColorAdjust:
                "exact",
            }}
          >
            <th className="border px-3 py-2">
              #
            </th>
            <th className="border px-3 py-2">
              {isRTL
                ? "الوصف"
                : "Description"}
            </th>
            <th className="border px-3 py-2">
              Qty
            </th>
            <th className="border px-3 py-2">
              {isRTL
                ? "الوحدة"
                : "Unit"}
            </th>
            <th className="border px-3 py-2">
              {isRTL
                ? "سعر الوحدة"
                : "Unit Price"}
            </th>
            <th className="border px-3 py-2">
              {isRTL
                ? "الإجمالي"
                : "Total"}
            </th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map(
          (
               item: any,
               index: number
          ) => (
               <tr key={index}>
               <td className="border px-3 py-2">
                    {index + 1}
               </td>

               <td className="border px-3 py-2">
                    {item.description}
               </td>

               <td className="border px-3 py-2">
                    {item.quantity}
               </td>

               <td className="border px-3 py-2">
                    {item.unit}
               </td>

               <td className="border px-3 py-2">
                    {pr.exchangeTo || "USD"}{" "}
                    {Number(
                    item.unitPrice || 0
                    ).toLocaleString()}
               </td>

               <td className="border px-3 py-2">
                    {pr.exchangeTo || "USD"}{" "}
                    {Number(
                    item.totalPrice || 0
                    ).toLocaleString()}
               </td>
               </tr>
          )
          )}

          {/* Total Row */}
          <tr
          style={{
               backgroundColor: "#f8fbff",
               fontWeight: "bold",
               WebkitPrintColorAdjust:
               "exact",
               printColorAdjust:
               "exact",
          }}
          >
          {/* Empty columns */}
          <td
               colSpan={4}
               className="border px-3 py-2"
          />

          {/* Total Label */}
          <td className="border px-3 py-2 text-right">
               {isRTL
               ? "الإجمالي:"
               : "Total:"}
          </td>

          {/* Total Amount */}
          <td className="border px-3 py-2">
               {pr.exchangeTo || "USD"}{" "}
               {totalAmount}
          </td>
          </tr>
      </tbody>
      </table>

      {/* Justification */}
      {pr.justification && (
        <div className="mb-6">
          <h4
            className="font-semibold mb-2"
            style={{
              color: "#1e40af",
            }}
          >
            {isRTL
              ? "المبرر:"
              : "Justification:"}
          </h4>

          <div
            className="p-4 rounded"
            style={{
              backgroundColor:
                "#f8fbff",
              border:
                "1px solid #dbeafe",
              WebkitPrintColorAdjust:
                "exact",
              printColorAdjust:
                "exact",
            }}
          >
            {pr.justification}
          </div>
        </div>
      )}

      {/* Signatures */}
      <div className="mt-8 pt-6 border-t">
        <h3
          className="text-sm font-bold mb-4"
          style={{
            color: "#1e40af",
          }}
        >
          {isRTL
            ? "سير الموافقات والتوقيعات"
            : "Approval Workflow Signatures"}
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {orderedSections.map(
            (section) => (
              <div
                key={section.key}
                className="p-3 text-center min-h-[220px]"
              >
                {renderSignatureBlock(
                  section.key
                )}
              </div>
            )
          )}
        </div>
      </div>
    </OfficialPrintTemplate>
  </>
);
}