/**
 * Bid Opening Minutes PDF Generator Component
 * Frontend component for BOM PDF generation
 * 
 * This component ONLY handles UI - PDF generation happens on backend
 * Flow:
 * 1. User clicks "Generate PDF" button
 * 2. Component calls tRPC mutation
 * 3. Backend generates PDF and uploads to S3
 * 4. Backend returns URL
 * 5. Component displays download button
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface BidOpeningMinutesPdfGeneratorProps {
  bomId: number;
  bomNumber: string;
  existingPdfUrl?: string | null;
}

export function BidOpeningMinutesPdfGenerator({
  bomId,
  bomNumber,
  existingPdfUrl
}: BidOpeningMinutesPdfGeneratorProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(existingPdfUrl || null);

  // Mutation for generating PDF
  const { mutate: generatePdf, isPending: isGenerating } =
    trpc.logistics.generateBidOpeningMinutesPdf.useMutation({
      onSuccess: (data) => {
        setPdfUrl(data.pdfUrl);
        toast.success("PDF generated successfully!");
      },
      onError: (error) => {
        toast.error(`Failed to generate PDF: ${error.message}`);
      }
    });

  // Query for fetching existing PDF URL
  const { data: pdfData, isLoading: isFetching } =
    trpc.logistics.getBidOpeningMinutesPdfUrl.useQuery(
      { bomId },
      { enabled: !pdfUrl }
    );

  // Use fetched URL if available
  const displayUrl = pdfUrl || pdfData?.pdfUrl;

  const handleGeneratePdf = (language: "en" | "ar") => {
    generatePdf({
      bomId,
      language
    });
  };

  const handleDownloadPdf = () => {
    if (displayUrl) {
      window.open(displayUrl, "_blank");
    }
  };

  const handleRegenerate = () => {
    setPdfUrl(null);
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        <h3 className="font-semibold">PDF Generation</h3>
      </div>

      {/* PDF Status */}
      {displayUrl ? (
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <p className="text-sm text-green-800">
            ✓ PDF is ready for download
          </p>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm text-blue-800">
            No PDF generated yet. Click below to generate.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Generate English PDF */}
        <Button
          onClick={() => handleGeneratePdf("en")}
          disabled={isGenerating || isFetching}
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
              Generate PDF (English)
            </>
          )}
        </Button>

        {/* Generate Arabic PDF */}
        <Button
          onClick={() => handleGeneratePdf("ar")}
          disabled={isGenerating || isFetching}
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
              إنشاء PDF (العربية)
            </>
          )}
        </Button>

        {/* Download PDF (if exists) */}
        {displayUrl && (
          <Button
            onClick={handleDownloadPdf}
            variant="default"
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        )}

        {/* Regenerate PDF */}
        {displayUrl && (
          <Button
            onClick={handleRegenerate}
            variant="ghost"
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isFetching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading PDF information...
        </div>
      )}

      {/* BOM Number Display */}
      <div className="text-xs text-muted-foreground">
        BOM Number: <span className="font-mono">{bomNumber}</span>
      </div>
    </div>
  );
}

export default BidOpeningMinutesPdfGenerator;
