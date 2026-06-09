/**
 * Quotation Analysis (QA) Print View
 * Donor-ready A4 print layout with bilingual EN/AR support
 * Uses OfficialPrintTemplate with detailed supplier offer matrix
 * 
 * Follows CBA Print approach:
 * - Inline translations (en/ar) per IMS guideline
 * - Proper RTL/LTR direction from useLanguage()
 * - Logical CSS properties (ms-, me-, text-start, text-end)
 * - Bilingual section headers
 */
import { useOrganization } from "@/contexts/OrganizationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { OfficialPrintTemplate } from "@/components/logistics/OfficialPrintTemplate";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatCurrency } from "@shared/currencyFormatter";
import { useEffect } from "react";
import { useTranslation } from '@/i18n/useTranslation';

// ============================================================================
// BILINGUAL TRANSLATIONS
// ============================================================================
const translations = {
  en: {
    // Header / metadata
    prReference: "PR Reference",
    status: "Status",
    date: "Date",
    currency: "Currency",
    prTotal: "PR Total",
    numberOfSuppliers: "No. of Suppliers",
    // Supplier offer matrix
    supplierQuotationComparison: "Supplier Quotation Comparison",
    description: "Description",
    unit: "Unit",
    qty: "Qty",
    estPrice: "Est. Price",
    total: "Total",
    // Financial scoring
    financialScoring: "Financial Scoring",
    scoringMethod: "Scoring Method",
    costOnlyScoring: "Cost-Only Scoring",
    costOnlyDesc: "(PR ≤ $5,000): Lowest total offer receives 100 points. Other suppliers scored proportionally.",
    multiCriteriaScoring: "Multi-Criteria Scoring",
    multiCriteriaDesc: "(PR $5,000-$25,000):",
    priceWeight: "Price: 60% weight",
    deliveryWeight: "Delivery Time: 20% weight",
    warrantyWeight: "Warranty Period: 10% weight",
    technicalWeight: "Technical Compliance: 10% weight",
    supplier: "Supplier",
    totalOffer: "Total Offer",
    financialScore: "Financial Score",
    selected: "Selected",
    // Selection decision
    selectionDecision: "Selection Decision",
    selectedSupplier: "Selected Supplier",
    justification: "Justification",
    // Remarks
    remarks: "Remarks",
    // Evaluation report
    evaluationReport: "Evaluation Report, including selection process description, conclusions and recommendation",
    evaluationPlaceholder: "The supplier {name} was selected for the following reasons...",
    // Loading
    loading: "Loading...",
    notFound: "Quotation Analysis not found",
    // Signature blocks
    preparedBy: "Prepared By",
    reviewedBy: "Reviewed By",
    approvedBy: "Approved By",
    // Template
    department: "Logistics & Procurement",
    formTitle: "QUOTATION ANALYSIS",
  },
  ar: {
    // Header / metadata
    prReference: "مرجع طلب الشراء",
    status: "الحالة",
    date: "التاريخ",
    currency: "العملة",
    prTotal: "إجمالي طلب الشراء",
    numberOfSuppliers: "عدد الموردين",
    // Supplier offer matrix
    supplierQuotationComparison: "مقارنة عروض أسعار الموردين",
    description: "الوصف",
    unit: "الوحدة",
    qty: "الكمية",
    estPrice: "السعر التقديري",
    total: "الإجمالي",
    // Financial scoring
    financialScoring: "التقييم المالي",
    scoringMethod: "طريقة التقييم",
    costOnlyScoring: "تقييم التكلفة فقط",
    costOnlyDesc: "(طلب شراء ≤ 5,000$): أقل عرض إجمالي يحصل على 100 نقطة. يتم تقييم الموردين الآخرين بشكل تناسبي.",
    multiCriteriaScoring: "تقييم متعدد المعايير",
    multiCriteriaDesc: "(طلب شراء 5,000$-25,000$):",
    priceWeight: "السعر: وزن 60%",
    deliveryWeight: "مدة التسليم: وزن 20%",
    warrantyWeight: "فترة الضمان: وزن 10%",
    technicalWeight: "الامتثال الفني: وزن 10%",
    supplier: "المورد",
    totalOffer: "إجمالي العرض",
    financialScore: "الدرجة المالية",
    selected: "مختار",
    // Selection decision
    selectionDecision: "قرار الاختيار",
    selectedSupplier: "المورد المختار",
    justification: "التبرير",
    // Remarks
    remarks: "ملاحظات",
    // Evaluation report
    evaluationReport: "تقرير التقييم، بما في ذلك وصف عملية الاختيار والاستنتاجات والتوصية",
    evaluationPlaceholder: "تم اختيار المورد {name} للأسباب التالية...",
    // Loading
    loading: "جاري التحميل...",
    notFound: "لم يتم العثور على تحليل عروض الأسعار",
    // Signature blocks
    preparedBy: "أعد بواسطة",
    reviewedBy: "راجع بواسطة",
    approvedBy: "اعتمد بواسطة",
    // Template
    department: "الخدمات اللوجستية والمشتريات",
    formTitle: "تحليل عروض الأسعار",
  },
};

export default function QuotationAnalysisPrint() {

  const { currentOrganization } = useOrganization();
  const { language, isRTL } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;
  const dir = isRTL ? "rtl" : "ltr";

  const [, params] = useRoute("/organization/logistics/quotation-analysis/:id/print");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: qa, isLoading } = trpc.logistics.quotationAnalysis.getById.useQuery(
    { id },
    { enabled: !!id }
  );

  // Set document properties for PDF metadata
  useEffect(() => {
    if (qa) {
      const docTitle = `${qa.qaNumber || `QA-${qa.id}`} - ${isRTL ? "تحليل عروض الأسعار" : "Quotation Analysis"}`;
      document.title = docTitle;
    }
  }, [qa, isRTL]);

  if (isLoading) return <div className="p-8 text-center">{t.loading}</div>;
  if (!qa) return <div className="p-8 text-center">{t.notFound}</div>;

  const suppliers = qa.suppliers || [];
  const lineItems = qa.purchaseRequest?.lineItems || [];
  const prNumber = qa.purchaseRequest?.prNumber || "-";
  const currency = qa.purchaseRequest?.currency || "USD";
  const currencyCode = (currency === "USD" ? "USD" : currency) as any;
  const prTotal = parseFloat(String((qa.purchaseRequest as any)?.prTotalUsd || (qa.purchaseRequest as any)?.prTotalUSD || "0"));

  // Build a lookup: supplierId -> { lineItemId -> unitPrice }
  const offerLookup: Record<number, Record<number, number>> = {};
  for (const s of suppliers) {
    offerLookup[s.id] = {};
    if (s.lineOffers) {
      for (const lip of s.lineOffers) {
        offerLookup[s.id][lip.lineItemId] = parseFloat(String(lip.unitPrice || "0"));
      }
    }
  }

  // Calculate supplier totals
  const supplierTotals: Record<number, number> = {};
  for (const s of suppliers) {
    let total = 0;
    for (const li of lineItems) {
      const price = offerLookup[s.id]?.[li.id] || 0;
      const qty = parseFloat(String(li.quantity || "0"));
      total += price * qty;
    }
    supplierTotals[s.id] = total;
  }

  // Find selected supplier
  const selectedSupplier = suppliers.find((s: any) => s.isSelected);

  return (
    <OfficialPrintTemplate
      direction={dir}
      organizationLogo={currentOrganization?.logoUrl}
      organizationName={currentOrganization?.name}
      organizationNameAr={currentOrganization?.nameAr}
      department={translations.en.department}
      departmentAr={translations.ar.department}
      formTitle={translations.en.formTitle}
      formTitleAr={translations.ar.formTitle}
      formNumber={qa.qaNumber || `QA-${qa.id}`}
      formDate={qa.createdAt ? format(new Date(qa.createdAt), "yyyy-MM-dd") : ""}
      signatureBlocks={[
        { label: translations.en.preparedBy, labelAr: translations.ar.preparedBy },
        { label: translations.en.reviewedBy, labelAr: translations.ar.reviewedBy },
        { label: translations.en.approvedBy, labelAr: translations.ar.approvedBy },
      ]}
    >
      {/* Metadata Section */}
      <div className="grid grid-cols-2 gap-4 mb-6 text-sm" dir={dir}>
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <span className="text-gray-500 w-36 shrink-0">{t.prReference}:</span>
            <span className="font-medium" dir="ltr">{prNumber}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 w-36 shrink-0">{t.status}:</span>
            <span className="font-medium capitalize">{(qa.status || "draft").replace(/_/g, " ")}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 w-36 shrink-0">{t.date}:</span>
            <span className="font-medium" dir="ltr">{qa.createdAt ? format(new Date(qa.createdAt), "yyyy-MM-dd") : "-"}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <span className="text-gray-500 w-36 shrink-0">{t.currency}:</span>
            <span className="font-medium" dir="ltr">{currency}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 w-36 shrink-0">{t.prTotal}:</span>
            <span className="font-medium" dir="ltr">{formatCurrency(prTotal, currencyCode)}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 w-36 shrink-0">{t.numberOfSuppliers}:</span>
            <span className="font-medium">{suppliers.length}</span>
          </div>
        </div>
      </div>

      {/* Supplier Offer Comparison Matrix */}
      <h4 className="text-sm font-bold mb-2 border-b pb-1" dir={dir}>
        {t.supplierQuotationComparison}
      </h4>
      <table className="w-full border-collapse border border-gray-400 text-xs mb-4" dir="ltr">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-2 py-1.5 text-center w-8">#</th>
            <th className="border border-gray-400 px-2 py-1.5 text-start">{t.description}</th>
            <th className="border border-gray-400 px-2 py-1.5 text-center">{t.unit}</th>
            <th className="border border-gray-400 px-2 py-1.5 text-center">{t.qty}</th>
            <th className="border border-gray-400 px-2 py-1.5 text-end">{t.estPrice}</th>
            {suppliers.map((s: any) => (
              <th key={s.id} className="border border-gray-400 px-2 py-1.5 text-end" style={{ minWidth: "80px" }}>
                {s.supplierName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lineItems.map((li: any, idx: number) => (
            <tr key={li.id}>
              <td className="border border-gray-400 px-2 py-1 text-center">{idx + 1}</td>
              <td className="border border-gray-400 px-2 py-1">{li.description || li.itemDescription || "-"}</td>
              <td className="border border-gray-400 px-2 py-1 text-center">{li.unit || "-"}</td>
              <td className="border border-gray-400 px-2 py-1 text-center">{parseFloat(String(li.quantity || "0"))}</td>
              <td className="border border-gray-400 px-2 py-1 text-end">
                {formatCurrency(parseFloat(String(li.unitPrice || "0")), currencyCode)}
              </td>
              {suppliers.map((s: any) => {
                const unitPrice = offerLookup[s.id]?.[li.id] || 0;
                const qty = parseFloat(String(li.quantity || "0"));
                return (
                  <td key={s.id} className="border border-gray-400 px-2 py-1 text-end">
                    {unitPrice > 0 ? formatCurrency(unitPrice * qty, currencyCode) : "-"}
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Totals row */}
          <tr className="bg-gray-50 font-bold">
            <td colSpan={4} className="border border-gray-400 px-2 py-1.5 text-end">
              {t.total}
            </td>
            <td className="border border-gray-400 px-2 py-1.5 text-end">
              {formatCurrency(prTotal, currencyCode)}
            </td>
            {suppliers.map((s: any) => (
              <td key={s.id} className="border border-gray-400 px-2 py-1.5 text-end">
                {formatCurrency(supplierTotals[s.id] || 0, currencyCode)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Financial Scoring Summary */}
      {suppliers.some((s: any) => s.financialScore) && (
        <>
          <h4 className="text-sm font-bold mb-2 border-b pb-1 mt-4" dir={dir}>
            {t.financialScoring}
          </h4>

          {/* Scoring Criteria Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3 text-xs" dir={dir}>
            <div className="font-semibold mb-1">{t.scoringMethod}:</div>
            {prTotal <= 5000 ? (
              <div className="text-gray-700">
                <strong>{t.costOnlyScoring}</strong> {t.costOnlyDesc}
              </div>
            ) : (
              <div className="text-gray-700">
                <strong>{t.multiCriteriaScoring}</strong> {t.multiCriteriaDesc}
                <ul className="list-disc list-inside mt-1 ms-2">
                  <li>{t.priceWeight}</li>
                  <li>{t.deliveryWeight}</li>
                  <li>{t.warrantyWeight}</li>
                  <li>{t.technicalWeight}</li>
                </ul>
              </div>
            )}
          </div>
          <table className="w-full border-collapse border border-gray-400 text-xs mb-4" dir="ltr">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-2 py-1.5 text-center w-8">#</th>
                <th className="border border-gray-400 px-2 py-1.5 text-start">{t.supplier}</th>
                <th className="border border-gray-400 px-2 py-1.5 text-end">{t.totalOffer}</th>
                <th className="border border-gray-400 px-2 py-1.5 text-end">{t.financialScore}</th>
                <th className="border border-gray-400 px-2 py-1.5 text-center">{t.selected}</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s: any, idx: number) => (
                <tr key={s.id} className={s.isSelected ? "bg-green-50" : ""}>
                  <td className="border border-gray-400 px-2 py-1 text-center">{idx + 1}</td>
                  <td className="border border-gray-400 px-2 py-1">{s.supplierName}</td>
                  <td className="border border-gray-400 px-2 py-1 text-end">
                    {formatCurrency(supplierTotals[s.id] || 0, currencyCode)}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-end">
                    {parseFloat(String(s.financialScore || "0")).toFixed(1)}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-center">
                    {s.isSelected ? "✓" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Selection Justification */}
      {selectedSupplier && (
        <div className="mt-4 p-3 border border-gray-400 rounded-none" dir={dir}>
          <h4 className="text-sm font-bold mb-1">
            {t.selectionDecision}
          </h4>
          <p className="text-xs">
            <strong>{t.selectedSupplier}:</strong> {selectedSupplier.supplierName}
          </p>
          {qa.selectionJustification && (
            <p className="text-xs mt-1">
              <strong>{t.justification}:</strong> {qa.selectionJustification}
            </p>
          )}
        </div>
      )}

      {/* Evaluation Report */}
      <div className="mt-6 p-3 border-2 border-gray-600 text-xs" dir={dir}>
        <p className="font-bold mb-2">{t.evaluationReport}:</p>
        {qa.evaluationReport ? (
          <div className="mt-2 p-2 bg-gray-50 border border-gray-300 prose prose-sm max-w-none" dir="ltr">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{qa.evaluationReport}</ReactMarkdown>
          </div>
        ) : (
          <div className="mt-2 p-2 bg-gray-50 border border-gray-300 text-gray-500 italic">
            {t.evaluationPlaceholder.replace("{name}", selectedSupplier?.supplierName || "[Supplier Name]")}
          </div>
        )}
      </div>
    </OfficialPrintTemplate>
  );
}
