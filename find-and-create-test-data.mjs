import { getDb } from './server/db.ts';
import { 
  purchaseRequests, 
  operatingUnits,
  bidAnalyses,
  bidAnalysisBidders,
} from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

async function findAndCreateTestData() {
  try {
    const db = await getDb();
    
    console.log('Finding organizations with purchase requests...');
    const prs = await db.select().from(purchaseRequests).limit(1);
    
    if (prs.length === 0) {
      console.error('No purchase requests found in database. Cannot create test data.');
      process.exit(1);
    }
    
    const prId = prs[0].id;
    const orgId = prs[0].organizationId;
    console.log('Found PR:', prId, 'for organization:', orgId);
    
    console.log('Fetching operating unit for organization...');
    const ous = await db.select()
      .from(operatingUnits)
      .where(eq(operatingUnits.organizationId, orgId))
      .limit(1);
    
    if (ous.length === 0) {
      console.error('No operating units found for organization', orgId);
      process.exit(1);
    }
    
    const ouId = ous[0].id;
    console.log('Using operating unit:', ouId);
    
    console.log('Creating bid analysis...');
    const result = await db.insert(bidAnalyses).values({
      organizationId: orgId,
      operatingUnitId: ouId,
      purchaseRequestId: prId,
      cbaNumber: 'CBA-TEST-' + Date.now(),
      title: 'Test Bid Analysis for PDF Generation',
      titleAr: 'تحليل العروض للاختبار',
      status: 'bids_received',
      createdAt: new Date(),
    });
    
    const baId = result[0].insertId || result[0];
    console.log('Bid analysis created with ID:', baId);
    
    console.log('Creating bidders...');
    const bidderResult = await db.insert(bidAnalysisBidders).values([
      {
        bidAnalysisId: baId,
        organizationId: orgId,
        operatingUnitId: ouId,
        bidderName: 'Test Company 1',
        submissionDate: new Date(),
        submissionStatus: 'received',
        totalBidAmount: 9500,
        currency: 'USD',
        createdAt: new Date(),
      },
      {
        bidAnalysisId: baId,
        organizationId: orgId,
        operatingUnitId: ouId,
        bidderName: 'Test Company 2',
        submissionDate: new Date(),
        submissionStatus: 'received',
        totalBidAmount: 9800,
        currency: 'USD',
        createdAt: new Date(),
      },
    ]);
    
    console.log('✓ Test data created successfully!');
    console.log('Bid Analysis ID:', baId);
    console.log('Organization ID:', orgId);
    console.log('Operating Unit ID:', ouId);
    console.log('\nYou can now test the PDF endpoint:');
    console.log(`curl "http://localhost:3001/api/logistics/bid-analysis/${baId}/bidder/1/acknowledgement-pdf?orgId=${orgId}&lang=en"`);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

findAndCreateTestData();
