/**
 * Bid Opening Minutes PDF Generator Component
 * Frontend component for BOM PDF generation with in-memory caching
 * 
 * Flow:
 * 1. Check if pdfFileUrl exists in database
 * 2. If exists, reuse and download immediately
 * 3. If not exists, generate new PDF, save URL to database, download
 * 4. On regenerate, force new PDF generation
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
  const [isDownloading, setIsDownloading] = useState(false);

  // Mutation for generating PDF
  const { mutate: generatePdf, isPending: isGenerating } =
    trpc.logistics.generateBidOpeningMinutesPdf.useMutation({
      onSuccess: (data) => {
        setPdfUrl(data.pdfUrl);
        toast.success(
          data.cached
            ? "Using existing PDF. Downloading..."
            : "PDF generated successfully! Downloading..."
        );
        // Auto-download immediately after generation
        downloadPdf(data.pdfUrl);
      },
      onError: (error) => {
        toast.error(`Failed to generate PDF: ${error.message}`);
      },
    });

  // Download PDF by triggering window.location.href
  const downloadPdf = (url: string) => {
    try {
      setIsDownloading(true);
      window.location.href = url;
      
      // Reset download state after a short delay
      setTimeout(() => {
        setIsDownloading(false);
      }, 1000);
    } catch (error) {
      toast.error("Failed to download PDF");
      setIsDownloading(false);
    }
  };

  // Use fetched URL if available
  const displayUrl = pdfUrl;

  const handleGeneratePdf = (language: "en" | "ar") => {
    generatePdf({
      bomId,
      language,
    });
  };

  const handleDownloadPdf = () => {
    if (displayUrl) {
      downloadPdf(displayUrl);
    }
  };

  const handleRegenerate = () => {
    setPdfUrl(null);
    toast.info("Ready to generate new PDF");
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
            ✓ PDF ready for download (cached in-memory, expires in 1 hour)
          </p>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm text-blue-800">
            No PDF generated yet. Click below to generate and download.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Generate English PDF - Auto-downloads */}
        <Button
          onClick={() => handleGeneratePdf("en")}
          disabled={isGenerating || isDownloading}
          variant="default"
          size="sm"
        >
          {isGenerating || isDownloading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isGenerating ? "Generating..." : "Downloading..."}
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Generate & Download PDF (English)
            </>
          )}
        </Button>

        {/* Generate Arabic PDF - Auto-downloads */}
        <Button
          onClick={() => handleGeneratePdf("ar")}
          disabled={isGenerating || isDownloading}
          variant="outline"
          size="sm"
        >
          {isGenerating || isDownloading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isGenerating ? "جاري الإنشاء..." : "جاري التحميل..."}
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              إنشاء وتحميل PDF (العربية)
            </>
          )}
        </Button>

        {/* Download existing PDF */}
        {displayUrl && (
          <Button
            onClick={handleDownloadPdf}
            variant="default"
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF Again
              </>
            )}
          </Button>
        )}

        {/* Regenerate PDF (forces new generation, not cached) */}
        {displayUrl && (
          <Button
            onClick={handleRegenerate}
            variant="ghost"
            size="sm"
            disabled={isGenerating}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Generate New PDF
          </Button>
        )}
      </div>

      {/* Info Section */}
      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
        <div>
          <span className="font-semibold">BOM Number:</span>{" "}
          <span className="font-mono">{bomNumber}</span>
        </div>
        <div>
          <span className="font-semibold">Cache Duration:</span> 1 hour
        </div>
        <div className="text-xs text-gray-500 italic">
          PDFs are generated in-memory and cached for fast reuse. If the BOM
          hasn't changed, the existing PDF will be downloaded instead of
          regenerating.
        </div>
      </div>
    </div>
  );
}

export default BidOpeningMinutesPdfGenerator;
