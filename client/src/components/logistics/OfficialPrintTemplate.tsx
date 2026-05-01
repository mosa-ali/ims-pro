/**
 * Official Print Template Component
 * Global shared print layout for all Logistics & Procurement forms
 * Supports RTL/LTR using the BOM flexbox approach:
 *   LTR: Org LEFT | Title CENTER | Logo+Ref RIGHT
 *   RTL: Logo+Ref LEFT | Title CENTER | Org RIGHT (auto-mirrored via dir="rtl")
 *
 * PRINT FIX: Uses comprehensive @media print CSS to:
 * - Hide sidebar, header, navigation
 * - Render clean PDF output
 * - Preserve colors with print-color-adjust
 */

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';

interface SignatureBlock {
 label: string;
 labelAr?: string;
 name?: string;
 title?: string;
 date?: string;
 signed?: boolean;
}

interface OfficialPrintTemplateProps {
 organizationLogo?: string;
 organizationName?: string;
 organizationNameAr?: string;
 operatingUnitName?: string;
 department?: string;
 departmentAr?: string;
 formTitle: string;
 formTitleAr?: string;
 formNumber: string;
 formDate: string;
 children: ReactNode;
 signatureBlocks?: SignatureBlock[];
 direction?: "ltr" | "rtl";
 showPrintButton?: boolean;
 termsAndConditions?: string[];
 termsAndConditionsAr?: string[];
 importantNotice?: string;
 importantNoticeAr?: string;
 pageSize?: "A4" | "A4-landscape";
}

export function OfficialPrintTemplate({
 organizationLogo,
 organizationName = "Organization Name",
 organizationNameAr,
 operatingUnitName,
 department = "Logistics & Procurement",
 departmentAr = "اللوجستيات والمشتريات",
 formTitle,
 formTitleAr,
 formNumber,
 formDate,
 children,
 signatureBlocks = [],
 direction = "ltr",
 showPrintButton = true,
 termsAndConditions,
 termsAndConditionsAr,
 importantNotice,
 importantNoticeAr,
 pageSize = "A4",
}: OfficialPrintTemplateProps) {
  const { language, isRTL } = useLanguage();
  const handlePrint = async () => {
  await document.fonts.ready;

  const images = Array.from(document.images);

  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();

      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );

  setTimeout(() => {
    window.print();
  }, 500);
};

 const isRtl = direction === "rtl";
 const isLandscape = pageSize === "A4-landscape";
 const maxWidth = isLandscape ? "297mm" : "210mm";

 return (
 <div className="min-h-screen bg-gray-100 print:bg-white print:min-h-0" dir={direction}>
 {showPrintButton && (
 <div className="fixed top-4 end-4 print:hidden z-50 flex gap-2">
 <Button variant="outline" onClick={() => window.history.back()} className="gap-2 bg-white" data-back-nav>
 {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
 {isRtl ? 'رجوع' : 'Back'}
 </Button>
 <Button onClick={handlePrint} className="gap-2">
 <Printer className="h-4 w-4" />
 {isRtl ? 'طباعة / حفظ كـ PDF' : 'Print / Save as PDF'}
 </Button>
 </div>
 )}

 <div 
 className="mx-auto bg-white shadow-lg print:shadow-none print:max-w-none"
 style={{ maxWidth }}
 >
 <div className="p-8 print:p-[8mm]">
 {/* ================================================================
     HEADER - BOM flexbox approach (auto-mirrors in RTL via dir attribute)
     LTR: Org LEFT | Title CENTER | Logo+Ref RIGHT
     RTL: Logo+Ref LEFT | Title CENTER | Org RIGHT
     ================================================================ */}
  <header className="pb-4 mb-6 print-header">
  <table
    style={{
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: "12px",
    }}
  >
    <tbody>
      <tr>
        {/* Organization Info */}
        <td
          style={{
            width: "33%",
            verticalAlign: "top",
            textAlign: isRtl ? "right" : "left",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              fontSize: "14pt",
              color: "#1a365d",
              lineHeight: 1.3,
            }}
          >
            {organizationName}
          </div>

          {organizationNameAr && !isRtl && (
            <div
              style={{
                fontSize: "11pt",
                color: "#666",
                direction: "rtl",
              }}
            >
              {organizationNameAr}
            </div>
          )}

          <div
            style={{
              fontSize: "10pt",
              color: "#777",
              marginTop: "4px",
            }}
          >
            {isRtl && departmentAr ? departmentAr : department}
          </div>
        </td>

        {/* Title */}
        <td
          style={{
            width: "34%",
            verticalAlign: "top",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "18pt",
              fontWeight: "bold",
              color: "#1a365d",
              textTransform: "uppercase",
            }}
          >
            {formTitle}
          </div>

          {formTitleAr && (
            <div
              style={{
                fontSize: "12pt",
                color: "#666",
                marginTop: "4px",
              }}
            >
              {formTitleAr}
            </div>
          )}
        </td>

        {/* Logo + Reference */}
        <td
          style={{
            width: "33%",
            verticalAlign: "top",
            textAlign: isRtl ? "left" : "right",
          }}
        >
          {organizationLogo ? (
            <img
              src={organizationLogo}
              alt="Logo"
              style={{
                height: "70px",
                width: "70px",
                objectFit: "contain",
                display: "inline-block",
                marginBottom: "8px",
              }}
            />
          ) : (
            <div
              style={{
                height: "70px",
                width: "70px",
                border: "1px solid #ccc",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#999",
                fontWeight: "bold",
              }}
            >
              LOGO
            </div>
          )}

          <div
            style={{
              fontSize: "10pt",
              color: "#333",
              marginTop: "4px",
            }}
          >
            <div style={{ fontWeight: 600 }}>
              {formNumber}
            </div>
            <div>{formDate}</div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>

  <div
    style={{
      height: "3px",
      backgroundColor: "#1a365d",
      width: "100%",
      WebkitPrintColorAdjust: "exact",
      printColorAdjust: "exact",
    }}
  />
</header>

 <main className="min-h-[400px]">
 {children}
 </main>

 {termsAndConditions && termsAndConditions.length > 0 && (
 <section className="mt-8 border-t pt-4">
 <h3 className="font-bold text-sm mb-2">{isRtl ? 'الشروط والأحكام:' : 'Terms & Conditions:'}</h3>
 <ol className="text-xs text-gray-600 list-decimal list-inside space-y-1">
 {(isRtl && termsAndConditionsAr ? termsAndConditionsAr : termsAndConditions).map((term, index) => (
 <li key={index}>{term}</li>
 ))}
 </ol>
 </section>
 )}

 {importantNotice && (
 <section className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
 <p className="font-semibold text-amber-800">{isRTL ? 'ملاحظة مهمة:' : 'Important Notice:'}</p>
 <p className="text-amber-700 text-xs mt-1">{isRtl && importantNoticeAr ? importantNoticeAr : importantNotice}</p>
 </section>
 )}

 {signatureBlocks.length > 0 && (
 <section className="mt-6 pt-4 border-t print:mt-4 print:pt-3">
 <div className={`grid gap-8 ${signatureBlocks.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
 {signatureBlocks.map((block, index) => (
 <div key={index} className="text-center">
 <p className="font-semibold text-sm mb-1">
 {isRtl && block.labelAr ? block.labelAr : block.label}:
 </p>
 {block.name && (
 <p className="text-sm font-medium">{block.name}</p>
 )}
 {block.title && (
 <p className="text-xs text-gray-500">{block.title}</p>
 )}
 <div className="mt-3 pt-6 border-b border-gray-400 print:mt-2 print:pt-4">
 <p className="text-xs text-gray-500">{isRTL ? 'التوقيع' : 'Signature'}</p>
 </div>
 {block.date && (
 <p className="text-xs text-gray-500 mt-2">{isRtl ? 'التاريخ:' : 'Date:'} {block.date}</p>
 )}
 </div>
 ))}
 </div>
 </section>
 )}


 </div>
 </div>

 <style>{`
@media print {
  @page {
    size: ${isLandscape ? 'A4 landscape' : 'A4'};
    margin: 8mm;
  }
  
  html, body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
  }
  
  /* EXPLICITLY SHOW HEADER FIRST (before hiding other elements) */
  header,
  .print-header {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    page-break-inside: avoid !important;
  }
  
  header table {
    display: table !important;
    width: 100% !important;
  }
  
  header img {
    display: inline-block !important;
    visibility: visible !important;
    opacity: 1 !important;
    max-height: 70px !important;
  }
  
  /* Hide ALL non-print elements (but NOT header) */
  nav:not(header),
  aside,
  [data-sidebar],
  .sidebar,
  .header-nav,
  .app-sidebar,
  .top-navigation {
    display: none !important;
  }
  
  /* Ensure the print content takes full width */
  .min-h-screen {
    min-height: auto !important;
    background: white !important;
  }
  
  /* Remove shadows */
  .shadow-lg {
    box-shadow: none !important;
  }
  
  /* Table handling */
  table { 
    page-break-inside: auto; 
  }
  
  tr { 
    page-break-inside: avoid; 
    page-break-after: auto; 
  }
  
  thead { 
    display: table-header-group; 
  }
  
  /* Avoid page breaks inside sections */
  section { 
    page-break-inside: avoid; 
  }
  
  /* Reduce spacing in print */
  .print\\:mt-4 { margin-top: 1rem !important; }
  .print\\:mt-3 { margin-top: 0.75rem !important; }
  .print\\:mt-2 { margin-top: 0.5rem !important; }
  .print\\:pt-4 { padding-top: 1rem !important; }
  .print\\:pt-3 { padding-top: 0.75rem !important; }
  .print\\:pt-2 { padding-top: 0.5rem !important; }
  .print\\:p-\\[8mm\\] { padding: 8mm !important; }
}
`}</style>
 </div>
 );
}

export default OfficialPrintTemplate;
