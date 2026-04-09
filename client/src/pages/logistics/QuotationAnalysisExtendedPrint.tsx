/**
 * Extended Quotation Analysis (QA) Print View
 * Multi-criteria scoring print layout for PR $5,001-$25,000
 * Displays Price, Delivery, Warranty, and Technical criteria with weighted scores
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
import { formatCurrency } from "@shared/currencyFormatter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect } from "react";

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
    supplierOfferMatrix: "Supplier Offer Matrix",
    description: "Description",
    unit: "Unit",
    qty: "Qty",
    prUnitPrice: "PR Unit Price",
    total: "Total",
    // Multi-criteria scoring
    multiCriteriaScoringMethod: "Multi-Criteria Scoring Method",
    price: "Price",
    delivery: "Delivery",
    warranty: "Warranty",
    technical: "Technical",
    totalQuotedAmount: "Total quoted amount",
    deliveryDays: "Delivery days",
    warrantyMonths: "Warranty months",
    experienceYears: "Experience (3+ years)",
    // Vendors evaluation
    vendorsEvaluation: "Vendors Evaluation - Individual and Weighted Scores",
    rank: "Rank",
    supplier: "Supplier",
    priceScore: "Price Score (60%)",
    deliveryScore: "Delivery Score (20%)",
    warrantyScore: "Warranty Score (10%)",
    technicalScore: "Technical Score (10%)",
    totalScore: "Total Score",
    statusCol: "Status",
    winner: "Winner",
    // Evaluation report
    evaluationReport: "Evaluation Report, including selection process description, conclusions and recommendation",
    selectedSupplier: "Selected Supplier",
    noEvaluationReport: "No evaluation report provided",
    // Loading
    loading: "Loading...",
    notFound: "Quotation Analysis not found",
    // Signature blocks
    preparedBy: "Prepared By",
    reviewedBy: "Reviewed By",
    approvedBy: "Approved By",
    // Template
    department: "Logistics & Procurement",
    formTitle: "QUOTATION ANALYSIS (MULTI-CRITERIA)",
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
    supplierOfferMatrix: "مصفوفة عروض الموردين",
    description: "الوصف",
    unit: "الوحدة",
    qty: "الكمية",
    prUnitPrice: "سعر الوحدة المقدر",
    total: "الإجمالي",
    // Multi-criteria scoring
    multiCriteriaScoringMethod: "طريقة التقييم متعدد المعايير",
    price: "السعر",
    delivery: "التسليم",
    warranty: "الضمان",
    technical: "الفني",
    totalQuotedAmount: "إجمالي المبلغ المعروض",
    deliveryDays: "أيام التسليم",
    warrantyMonths: "أشهر الضمان",
    experienceYears: "الخبرة (3+ سنوات)",
    // Vendors evaluation
    vendorsEvaluation: "تقييم الموردين - الدرجات الفردية والمرجحة",
    rank: "الترتيب",
    supplier: "المورد",
    priceScore: "درجة السعر (60%)",
    deliveryScore: "درجة التسليم (20%)",
    warrantyScore: "درجة الضمان (10%)",
    technicalScore: "الدرجة الفنية (10%)",
    totalScore: "الدرجة الإجمالية",
    statusCol: "الحالة",
    winner: "الفائز",
    // Evaluation report
    evaluationReport: "تقرير التقييم، بما في ذلك وصف عملية الاختيار والاستنتاجات والتوصية",
    selectedSupplier: "المورد المختار",
    noEvaluationReport: "لم يتم تقديم تقرير تقييم",
    // Loading
    loading: "جاري التحميل...",
    notFound: "لم يتم العثور على تحليل عروض الأسعار",
    // Signature blocks
    preparedBy: "أعد بواسطة",
    reviewedBy: "راجع بواسطة",
    approvedBy: "اعتمد بواسطة",
    // Template
    department: "الخدمات اللوجستية والمشتريات",
    formTitle: "تحليل العروض (متعدد المعايير)",
  },
};

export default function QuotationAnalysisExtendedPrint() {  const { currentOrganization } = useOrganization();
  const { language, isRTL } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;
  const dir = isRTL ? "rtl" : "ltr";

  const [, params] = useRoute("/organization/logistics/quotation-analysis-extended/:id/print");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: qa, isLoading } = trpc.logistics.quotationAnalysis.getById.useQuery(
    { id },
    { enabled: !!id }
  );

  // Set document properties for PDF metadata
  useEffect(() => {
    if (qa) {
      const docTitle = `${qa.qaNumber || `QA-${qa.id}`} - ${isRTL ? "تحليل العروض (متعدد المعايير)" : "Quotation Analysis (Multi-Criteria)"}`;
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

      {/* Supplier Offer Matrix */}
      <h4 className="text-sm font-bold mb-2 border-b pb-1" dir={dir}>
        {t.supplierOfferMatrix}
      </h4>
      <table className="w-full text-xs border-collapse border border-gray-400 mb-6" dir="ltr">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-2 py-1.5 text-center w-8">#</th>
            <th className="border border-gray-400 px-2 py-1.5 text-start">{t.description}</th>
            <th className="border border-gray-400 px-2 py-1.5 text-center">{t.qty}</th>
            <th className="border border-gray-400 px-2 py-1.5 text-center">{t.unit}</th>
            <th className="border border-gray-400 px-2 py-1.5 text-end">{t.prUnitPrice}</th>
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
              <td className="border border-gray-400 px-2 py-1">{li.description}</td>
              <td className="border border-gray-400 px-2 py-1 text-center">{parseFloat(String(li.quantity || "0"))}</td>
              <td className="border border-gray-400 px-2 py-1 text-center">{li.unit}</td>
              <td className="border border-gray-400 px-2 py-1 text-end">{formatCurrency(parseFloat(String(li.unitPrice || "0")), currencyCode)}</td>
              {suppliers.map((s: any) => (
                <td key={`${s.id}-${li.id}`} className="border border-gray-400 px-2 py-1 text-end">
                  {formatCurrency(offerLookup[s.id]?.[li.id] || 0, currencyCode)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="font-bold bg-gray-50">
            <td colSpan={4} className="border border-gray-400 px-2 py-1.5 text-end">
              {t.total}:
            </td>
            <td className="border border-gray-400 px-2 py-1.5 text-end">
              {formatCurrency(prTotal, currencyCode)}
            </td>
            {suppliers.map((s: any) => (
              <td key={`total-${s.id}`} className="border border-gray-400 px-2 py-1.5 text-end">
                {formatCurrency(supplierTotals[s.id], currencyCode)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Multi-Criteria Scoring Method */}
      <h4 className="text-sm font-bold mb-2 border-b pb-1" dir={dir}>
        {t.multiCriteriaScoringMethod}
      </h4>
      <div className="grid grid-cols-4 gap-3 text-xs mb-6" dir={dir}>
        <div className="border border-gray-400 rounded p-2">
          <div className="font-bold text-blue-600">60%</div>
          <div className="text-gray-700 font-semibold">{t.price}</div>
          <div className="text-gray-500">{t.totalQuotedAmount}</div>
        </div>
        <div className="border border-gray-400 rounded p-2">
          <div className="font-bold text-green-600">20%</div>
          <div className="text-gray-700 font-semibold">{t.delivery}</div>
          <div className="text-gray-500">{t.deliveryDays}</div>
        </div>
        <div className="border border-gray-400 rounded p-2">
          <div className="font-bold text-purple-600">10%</div>
          <div className="text-gray-700 font-semibold">{t.warranty}</div>
          <div className="text-gray-500">{t.warrantyMonths}</div>
        </div>
        <div className="border border-gray-400 rounded p-2">
          <div className="font-bold text-orange-600">10%</div>
          <div className="text-gray-700 font-semibold">{t.technical}</div>
          <div className="text-gray-500">{t.experienceYears}</div>
        </div>
      </div>

      {/* Vendors Evaluation Table */}
      <h4 className="text-sm font-bold mb-2 border-b pb-1" dir={dir}>
        {t.vendorsEvaluation}
      </h4>
      <table className="w-full text-xs border-collapse border border-gray-400 mb-6" dir="ltr">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-2 py-1.5 text-center">{t.rank}</th>
            <th className="border border-gray-400 px-2 py-1.5 text-start">{t.supplier}</th>
            <th className="border border-gray-400 px-2 py-1.5 text-center">{t.priceScore}</th>
            <th className="border border-gray-400 px-2 py-1.5 text-center">{t.deliveryScore}</th>
            <th className="border border-gray-400 px-2 py-1.5 text-center">{t.warrantyScore}</th>
            <th className="border border-gray-400 px-2 py-1.5 text-center">{t.technicalScore}</th>
            <th className="border border-gray-400 px-2 py-1.5 text-center">{t.totalScore}</th>
            <th className="border border-gray-400 px-2 py-1.5 text-center">{t.statusCol}</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s: any, idx: number) => {
            const priceScore = parseFloat(String(s.priceScore || 0));
            const deliveryScore = parseFloat(String(s.deliveryScore || 0));
            const warrantyScore = parseFloat(String(s.warrantyScore || 0));
            const technicalScore = parseFloat(String(s.technicalCriterionScore || 0));

            const priceWeighted = (priceScore * 0.6).toFixed(1);
            const deliveryWeighted = (deliveryScore * 0.2).toFixed(1);
            const warrantyWeighted = (warrantyScore * 0.1).toFixed(1);
            const technicalWeighted = (technicalScore * 0.1).toFixed(1);
            const totalScoreVal = (parseFloat(priceWeighted) + parseFloat(deliveryWeighted) + parseFloat(warrantyWeighted) + parseFloat(technicalWeighted)).toFixed(1);

            const isSelected = s.isSelected;

            return (
              <tr key={s.id} className={isSelected ? "bg-green-50" : ""}>
                <td className="border border-gray-400 px-2 py-1 text-center">#{idx + 1}</td>
                <td className="border border-gray-400 px-2 py-1">{s.supplierName}</td>
                <td className="border border-gray-400 px-2 py-1 text-center">{priceScore.toFixed(1)} ({priceWeighted})</td>
                <td className="border border-gray-400 px-2 py-1 text-center">{deliveryScore.toFixed(1)} ({deliveryWeighted})</td>
                <td className="border border-gray-400 px-2 py-1 text-center">{warrantyScore.toFixed(1)} ({warrantyWeighted})</td>
                <td className="border border-gray-400 px-2 py-1 text-center">{technicalScore.toFixed(1)} ({technicalWeighted})</td>
                <td className="border border-gray-400 px-2 py-1 text-center font-bold">{totalScoreVal}</td>
                <td className="border border-gray-400 px-2 py-1 text-center">
                  {isSelected ? <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">✓ {t.winner}</span> : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Evaluation Report */}
      {selectedSupplier && (
        <div className="mt-4 p-3 border-2 border-gray-600 text-xs" dir={dir}>
          <p className="font-bold mb-2">{t.evaluationReport}:</p>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-2">
            <div className="font-bold text-blue-900 mb-1">{t.selectedSupplier}: {selectedSupplier.supplierName}</div>
          </div>
          {qa.evaluationReport ? (
            <div className="p-2 bg-gray-50 border border-gray-300 prose prose-sm max-w-none" dir="ltr">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{qa.evaluationReport}</ReactMarkdown>
            </div>
          ) : (
            <div className="p-2 bg-gray-50 border border-gray-300 text-gray-500 italic">
              {t.noEvaluationReport}
            </div>
          )}
        </div>
      )}
    </OfficialPrintTemplate>
  );
}
