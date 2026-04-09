import { generateBidReceiptAcknowledgementPDF } from './server/_core/bidReceiptAcknowledgementPDF.ts';
import { getDb } from './server/db.ts';
import { bidAnalyses, bidAnalysisBidders, purchaseRequests, operatingUnits, organizations, organizationBranding } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

async function test() {
  try {
    console.log('Getting database...');
    const db = await getDb();
    
    console.log('Fetching organizations...');
    const orgs = await db.select().from(organizations).limit(1);
    console.log('Organizations:', orgs);
    
    if (orgs.length === 0) {
      console.log('No organizations found. Creating test data...');
      // We need to create test data
      process.exit(1);
    }
    
    const orgId = orgs[0].id;
    console.log('Using organization:', orgId);
    
    console.log('Fetching bid analyses...');
    const bas = await db.select().from(bidAnalyses).where(eq(bidAnalyses.organizationId, orgId)).limit(1);
    console.log('Bid analyses:', bas);
    
    if (bas.length === 0) {
      console.log('No bid analyses found');
      process.exit(1);
    }
    
    const ba = bas[0];
    console.log('Using bid analysis:', ba.id);
    
    console.log('Fetching bidders...');
    const bidders = await db.select().from(bidAnalysisBidders).where(eq(bidAnalysisBidders.bidAnalysisId, ba.id)).limit(1);
    console.log('Bidders:', bidders);
    
    if (bidders.length === 0) {
      console.log('No bidders found');
      process.exit(1);
    }
    
    const bidder = bidders[0];
    console.log('Using bidder:', bidder.id);
    
    console.log('Generating PDF...');
    const pdf = await generateBidReceiptAcknowledgementPDF(ba.id, bidder.id, orgId, 'en');
    console.log('PDF generated successfully, size:', pdf.length, 'bytes');
    
    // Save to file for inspection
    import('fs').then(({writeFileSync}) => {
      writeFileSync('/tmp/test-pdf.pdf', pdf);
      console.log('PDF saved to /tmp/test-pdf.pdf');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

test();
