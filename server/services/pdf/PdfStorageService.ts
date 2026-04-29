/**
 * PDF Storage Service
 * Handles uploading PDFs to S3 and managing storage URLs
 */

import { storagePut } from "../../storage";

export interface PdfUploadResult {
  url: string;
  key: string;
  fileName: string;
  uploadedAt: Date;
}

/**
 * Upload PDF to S3 storage
 * @param fileName - Name for the PDF file
 * @param buffer - PDF buffer to upload
 * @returns Upload result with URL and key
 */
export async function uploadPdf(
  fileName: string,
  buffer: Buffer
): Promise<PdfUploadResult> {
  try {
    const { url, key } = await storagePut(
      fileName,
      buffer,
      "application/pdf"
    );

    return {
      url,
      key,
      fileName,
      uploadedAt: new Date()
    };
  } catch (error) {
    console.error("[PDF Storage] Upload failed:", error);
    throw new Error(
      `Failed to upload PDF: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate unique PDF filename with timestamp
 * @param documentType - Type of document (e.g., "bid-opening-minutes")
 * @param documentNumber - Document number (e.g., "BOM-001")
 * @param language - Language code ("en" or "ar")
 * @returns Unique filename
 */
export function generatePdfFileName(
  documentType: string,
  documentNumber: string,
  language: "en" | "ar" = "en"
): string {
  const timestamp = Date.now();
  const sanitizedType = documentType.replace(/\s+/g, "-").toLowerCase();
  const sanitizedNumber = documentNumber.replace(/\s+/g, "-").toLowerCase();
  const languageCode = language === "ar" ? "ar" : "en";

  return `pdf/${sanitizedType}/${sanitizedNumber}-${languageCode}-${timestamp}.pdf`;
}

/**
 * Validate PDF buffer
 * @param buffer - PDF buffer to validate
 * @returns true if valid PDF
 */
export function isValidPdfBuffer(buffer: Buffer): boolean {
  // PDF files start with %PDF
  return buffer.length > 4 && buffer.toString("ascii", 0, 4) === "%PDF";
}

/**
 * Get file size in MB
 * @param buffer - File buffer
 * @returns Size in MB
 */
export function getFileSizeInMb(buffer: Buffer): number {
  return buffer.length / (1024 * 1024);
}

/**
 * Check if file size is within limits
 * @param buffer - File buffer
 * @param maxSizeMb - Maximum size in MB (default 50MB)
 * @returns true if within limits
 */
export function isFileSizeValid(buffer: Buffer, maxSizeMb: number = 50): boolean {
  return getFileSizeInMb(buffer) <= maxSizeMb;
}
