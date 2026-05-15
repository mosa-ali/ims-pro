/**
 * PDF Download API Endpoint - Download cached PDFs by token
 * 
 * Path: /api/download-pdf/[token]
 * Method: GET
 * 
 * Purpose:
 * Retrieves a cached PDF from memory using a unique token and streams it
 * to the client for download. PDFs are cached for 1 hour TTL.
 * 
 * Query flow:
 * 1. Frontend generates PDF via generateOfficialPdf()
 * 2. Backend caches PDF with cachePdfAndGetToken()
 * 3. Frontend receives token URL (e.g., /api/download-pdf/abc123...)
 * 4. Frontend/user clicks download link
 * 5. This endpoint retrieves PDF from cache and streams to browser
 * 6. Browser downloads PDF file
 */

import { getPdfFromCache } from '../../../services/pdf/OfficialPdfEngine';

/**
 * GET /api/download-pdf/[token]
 * 
 * Params:
 * - token: 64-character hex string from cachePdfAndGetToken()
 * 
 * Response:
 * - 200: PDF file (application/pdf)
 * - 404: Token not found or expired
 * - 500: Server error
 * 
 * Headers:
 * - Content-Type: application/pdf
 * - Content-Disposition: attachment (browser downloads file)
 * - Cache-Control: no-cache (don't cache the response)
 * - Pragma: no-cache (legacy browsers)
 * - Expires: 0 (legacy browsers)
 */
export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    // ✅ Validate token format (64-char hex string)
    if (!params.token || !/^[a-f0-9]{64}$/.test(params.token)) {
      console.warn(`[PDF Download] Invalid token format: ${params.token?.substring(0, 8)}...`);
      return new Response('Invalid token format', { status: 400 });
    }

    // Retrieve PDF from cache
    const pdfBuffer = getPdfFromCache(params.token);

    if (!pdfBuffer) {
      console.warn(`[PDF Download] PDF not found or expired for token: ${params.token.substring(0, 8)}...`);
      return new Response('PDF not found or expired', { status: 404 });
    }

    // ✅ Convert Buffer to Uint8Array for Response streaming
    // This is correct - Uint8Array is the proper format for binary data in Response
    const uint8Array = new Uint8Array(pdfBuffer);

    console.log(`[PDF Download] Streaming PDF: ${(pdfBuffer.length / 1024).toFixed(2)}KB, Token: ${params.token.substring(0, 8)}...`);

    // ✅ Return PDF with proper headers for download
    return new Response(uint8Array, {
      status: 200,
      headers: {
        // CRITICAL: application/pdf tells browser to treat as PDF
        'Content-Type': 'application/pdf',
        
        // IMPORTANT: attachment forces download (not inline viewing)
        // Filename will be: bid-opening-minutes-1704067200000.pdf
        'Content-Disposition': `attachment; filename="bid-opening-minutes-${Date.now()}.pdf"`,
        
        // Prevent browser from caching this response
        // (but the PDF itself in cache server is fine)
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        
        // Legacy HTTP/1.0 cache prevention
        'Pragma': 'no-cache',
        'Expires': '0',
        
        // ✅ ADDED: Content-Length helps browser show download progress
        'Content-Length': String(pdfBuffer.length),
      },
    });

  } catch (error) {
    console.error('[PDF Download] Server error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
