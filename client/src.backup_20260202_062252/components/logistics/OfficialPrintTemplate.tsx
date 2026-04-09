/**
 * Official Print Template Component
 * Global shared print layout for all Logistics & Procurement forms
 * Supports RTL/LTR, bilingual headers, and signature blocks
 */

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

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
}

export function OfficialPrintTemplate({
  organizationLogo,
  organizationName = "Organization Name",
  organizationNameAr,
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
}: OfficialPrintTemplateProps) {
  const handlePrint = () => {
    window.print();
  };

  const isRtl = direction === "rtl";

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {showPrintButton && (
        <div className="fixed top-4 right-4 print:hidden z-50">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      )}

      <div 
        className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none print:max-w-none"
        dir={direction}
      >
        <div className="p-8 print:p-6">
          <header className="border-b-2 border-primary pb-4 mb-6">
            <div className={`flex items-start justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                {organizationLogo ? (
                  <img 
                    src={organizationLogo} 
                    alt="Organization Logo" 
                    className="h-16 w-16 object-contain"
                  />
                ) : (
                  <div className="h-16 w-16 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                    Logo
                  </div>
                )}
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <h1 className="text-xl font-bold text-primary">
                    {isRtl && organizationNameAr ? organizationNameAr : organizationName}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Department: {isRtl && departmentAr ? departmentAr : department}
                  </p>
                </div>
              </div>

              <div className={`text-sm ${isRtl ? 'text-left' : 'text-right'}`}>
                <p className="font-medium">
                  <span className="text-muted-foreground">Form No:</span> {formNumber}
                </p>
                <p className="font-medium">
                  <span className="text-muted-foreground">Date:</span> {formDate}
                </p>
              </div>
            </div>

            <div className="mt-4 text-center">
              <h2 className="text-2xl font-bold text-primary uppercase tracking-wide">
                {formTitle}
              </h2>
              {formTitleAr && (
                <p className="text-lg text-primary mt-1" dir="rtl">
                  {formTitleAr}
                </p>
              )}
            </div>
          </header>

          <main className="min-h-[400px]">
            {children}
          </main>

          {termsAndConditions && termsAndConditions.length > 0 && (
            <section className="mt-8 border-t pt-4">
              <h3 className="font-bold text-sm mb-2">Terms & Conditions:</h3>
              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                {termsAndConditions.map((term, index) => (
                  <li key={index}>{term}</li>
                ))}
              </ol>
            </section>
          )}

          {importantNotice && (
            <section className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
              <p className="font-semibold text-amber-800">Important Notice:</p>
              <p className="text-amber-700 text-xs mt-1">{importantNotice}</p>
            </section>
          )}

          {signatureBlocks.length > 0 && (
            <section className="mt-8 pt-6 border-t">
              <div className="grid grid-cols-3 gap-8">
                {signatureBlocks.map((block, index) => (
                  <div key={index} className="text-center">
                    <p className="font-semibold text-sm mb-1">
                      {isRtl && block.labelAr ? block.labelAr : block.label}:
                    </p>
                    {block.name && (
                      <p className="text-sm font-medium">{block.name}</p>
                    )}
                    {block.title && (
                      <p className="text-xs text-muted-foreground">{block.title}</p>
                    )}
                    <div className="mt-4 pt-8 border-b border-gray-400">
                      <p className="text-xs text-muted-foreground">Signature</p>
                    </div>
                    {block.date && (
                      <p className="text-xs text-muted-foreground mt-2">Date: {block.date}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <footer className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground print:mt-4">
            <p>This document is generated from the Integrated Management System (IMS)</p>
            <p className="mt-1">Page 1 of 1 | {new Date().toLocaleDateString()}</p>
          </footer>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default OfficialPrintTemplate;
