import { getPdfFromCache } from '../../../services/pdf/OfficialPdfEngine';

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const pdfBuffer = getPdfFromCache(params.token);

    if (!pdfBuffer) {
      return new Response('PDF not found or expired', { status: 404 });
    }
    
    // ✅ Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(pdfBuffer);
    return new Response(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bid-opening-minutes-${Date.now()}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('PDF download error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
