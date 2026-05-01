/**
 * Bid Opening Minutes PDF Generator Component
 * Frontend component for BOM PDF generation with server-side rendering
 * 
 * Flow:
 * 1. User clicks "Generate PDF" button
 * 2. Frontend calls server-side mutation
 * 3. Server generates PDF using Puppeteer
 * 4. Server returns base64-encoded PDF
 * 5. Frontend converts to Blob and downloads
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

interface BidOpeningMinutesPdfGeneratorProps {
  bomId: number;
  bomNumber: string;
}

export function BidOpeningMinutesPdfGenerator({
  bomId,
  bomNumber,
}: BidOpeningMinutesPdfGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Mutation for generating PDF
  const { mutate: generatePdf } =
    trpc.logistics.generateBidOpeningMinutesPdf.useMutation({
      onSuccess: (data) => {
        // Convert base64 to blob and download
        const byteCharacters = atob(data.pdf);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });

        // Download the PDF
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success("PDF downloaded successfully!");
        setIsGenerating(false);
      },
      onError: (error) => {
        toast.error(`Failed to generate PDF: ${error.message}`);
        setIsGenerating(false);
      },
    });

  const handleGeneratePdf = (language: "en" | "ar") => {
    setIsGenerating(true);
    generatePdf({
      bomId,
      language,
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        <h3 className="font-semibold">PDF Generation</h3>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Generate English PDF */}
        <Button
          onClick={() => handleGeneratePdf("en")}
          disabled={isGenerating}
          variant="default"
          size="sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download PDF (English)
            </>
          )}
        </Button>

        {/* Generate Arabic PDF */}
        <Button
          onClick={() => handleGeneratePdf("ar")}
          disabled={isGenerating}
          variant="outline"
          size="sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              جاري الإنشاء...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              تحميل PDF (العربية)
            </>
          )}
        </Button>
      </div>

      {/* Info Section */}
      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
        <div>
          <span className="font-semibold">BOM Number:</span>{" "}
          <span className="font-mono">{bomNumber}</span>
        </div>
        <div className="text-xs text-gray-500 italic">
          PDFs are generated on the server with full formatting and branding.
        </div>
      </div>
    </div>
  );
}

export default BidOpeningMinutesPdfGenerator;
