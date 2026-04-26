import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { OfficialPrintTemplate } from "@/components/logistics/OfficialPrintTemplate";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";


export default function PurchaseRequestPrint() {
  const { currentOrganization } = useOrganization();
  const { currentOperatingUnit } = useOperatingUnit();
  const { isRTL } = useLanguage();
  const [isDownloading, setIsDownloading] = useState(false);

  // Branding only used as fallback for logo
  const brandingQuery = trpc.settings.branding.get.useQuery();
  const branding = brandingQuery.data;

  const [, params] = useRoute(
    "/organization/logistics/purchase-requests/:id/print"
  );
  const [, setLocation] = useLocation();
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

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(`/api/pdf/purchase-request/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error(isRTL ? "الملف غير متاح" : "PDF not available");
        } else {
          toast.error(isRTL ? "فشل تحميل PDF" : "Failed to download PDF");
        }
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${pr.prNumber || `PR-${pr.id}`}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(isRTL ? "تم تحميل PDF بنجاح" : "PDF downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error(isRTL ? "خطأ في التحميل" : "Download error");
    } finally {
      setIsDownloading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Back and Download buttons */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={() =>
            setLocation(
              `/organization/logistics/purchase-requests/${id}`
            )
          }
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {isRTL ? "رجوع" : "Back"}
        </Button>
        <Button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Download className="h-4 w-4" />
          {isDownloading ? (isRTL ? "جاري التحميل..." : "Downloading...") : (isRTL ? "تحميل PDF" : "Download PDF")}
        </Button>
      </div>

      {/* Print Template */}
      <div className="bg-white m-6 rounded-lg shadow-sm">
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
                <th className="border px-3 py-2 text-right">
                  {isRTL
                    ? "الكمية"
                    : "Qty"}
                </th>
                <th className="border px-3 py-2">
                  {isRTL
                    ? "الوحدة"
                    : "Unit"}
                </th>
                <th className="border px-3 py-2 text-right">
                  {isRTL
                    ? "سعر الوحدة"
                    : "Unit Price"}
                </th>
                <th className="border px-3 py-2 text-right">
                  {isRTL
                    ? "التكرار"
                    : "Recurrence"}
                </th>
                <th className="border px-3 py-2 text-right">
                  {isRTL
                    ? "الإجمالي"
                    : "Total"}
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="border px-3 py-4 text-center text-gray-500"
                  >
                    {isRTL
                      ? "لا توجد عناصر"
                      : "No line items available"}
                  </td>
                </tr>
              ) : (
                lineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border px-3 py-2">
                      {idx + 1}
                    </td>
                    <td className="border px-3 py-2">
                      {item.description}
                    </td>
                    <td className="border px-3 py-2 text-right">
                      {Number(item.quantity || 0).toFixed(2)}
                    </td>
                    <td className="border px-3 py-2">
                      {item.unit}
                    </td>
                    <td className="border px-3 py-2 text-right">
                      {pr.currency}{" "}
                      {Number(item.unitPrice || 0).toFixed(2)}
                    </td>
                    <td className="border px-3 py-2 text-right">
                      {item.recurrence || 1}
                    </td>
                    <td className="border px-3 py-2 text-right">
                      {pr.currency}{" "}
                      {Number(item.totalPrice || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr
                style={{
                  backgroundColor:
                    "#f3f4f6",
                  fontWeight: "bold",
                  WebkitPrintColorAdjust:
                    "exact",
                  printColorAdjust:
                    "exact",
                }}
              >
                <td
                  colSpan={6}
                  className="border px-3 py-2 text-right"
                >
                  {isRTL
                    ? "الإجمالي:"
                    : "Total:"}
                </td>
                <td className="border px-3 py-2 text-right">
                  {pr.exchangeTo}{" "}
                  {totalAmount}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Justification */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">
              {isRTL
                ? "المبررات"
                : "Justification:"}
            </h3>
            <div
              className="border p-3 text-sm"
              style={{
                whiteSpace: "pre-wrap",
              }}
            >
              {pr.justification || "-"}
            </div>
          </div>

          {/* Signatures */}
          <div className="page-break">
            <h3 className="font-semibold mb-4">
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
      </div>
    </div>
  );
}
