import { getDb } from './server/db.ts';
import { 
  purchaseRequests, 
  operatingUnits,
  bidAnalyses,
  bidAnalysisBidders
} from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

async function createTestData() {
  try {
    const db = await getDb();
    
    console.log('Fetching operating units for organization 30001...');
    const ous = await db.select()
      .from(operatingUnits)
      .where(eq(operatingUnits.organizationId, 30001))
      .limit(1);
    
    if (ous.length === 0) {
      console.error('No operating units found for organization 30001');
      process.exit(1);
    }
    
    const ouId = ous[0].id;
    console.log('Using operating unit:', ouId);
    
    console.log('Fetching purchase requests for organization 30001...');
    const prs = await db.select()
      .from(purchaseRequests)
      .where(eq(purchaseRequests.organizationId, 30001))
      .limit(1);
    
    if (prs.length === 0) {
      console.error('No purchase requests found for organization 30001');
      process.exit(1);
    }
    
    const prId = prs[0].id;
    console.log('Using purchase request:', prId);
    
    console.log('Creating bid analysis...');
    const result = await db.insert(bidAnalyses).values({
      organizationId: 30001,
      operatingUnitId: ouId,
      purchaseRequestId: prId,
      referenceNumber: 'BA-TEST-001',
      cbaNumber: 'CBA-TEST-001',
      description: 'Test Bid Analysis for PDF Generation',
      country: 'Yemen',
      currency: 'USD',
      totalCost: 10000,
      budgetLine: 'Operations',
      createdBy: 'test-user',
      createdAt: new Date(),
    });
    
    const baId = result[0].insertId || result[0];
    console.log('Bid analysis created with ID:', baId);
    
    console.log('Creating bidders...');
    await db.insert(bidAnalysisBidders).values([
      {
        bidAnalysisId: baId,
        bidderName: 'Test Company 1',
        submissionDate: new Date(),
        submissionStatus: 'received',
        totalBidAmount: 9500,
        currency: 'USD',
        createdAt: new Date(),
      },
      {
        bidAnalysisId: baId,
        bidderName: 'Test Company 2',
        submissionDate: new Date(),
        submissionStatus: 'received',
        totalBidAmount: 9800,
        currency: 'USD',
        createdAt: new Date(),
      },
    ]);
    
    console.log('Test data created successfully!');
    console.log('Bid Analysis ID:', baId);
    console.log('Organization ID: 30001');
    console.log('Operating Unit ID:', ouId);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

createTestData();
