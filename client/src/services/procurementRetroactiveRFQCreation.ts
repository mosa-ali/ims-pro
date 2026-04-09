// ============================================================================
// RETROACTIVE RFQ CREATION UTILITY
// One-time script to create RFQs for existing approved PRs
// Run this once to fix historical data
// Integrated Management System (IMS)
// ============================================================================

import { procurementRequestService } from './procurementRequestService';
import { rfqService } from './rfqService';
import { procurementWorkflowAutomationService } from './procurementWorkflowAutomationService';

/**
 * Creates RFQs for all approved PRs that don't have one
 * This is a one-time data migration utility
 */
export function createMissingRFQs(): {
 total: number;
 created: number;
 alreadyExisted: number;
 failed: Array<{ prNumber: string; error: string }>;
} {
 console.log('🔄 [Retroactive RFQ] Starting retroactive RFQ creation...');
 
 const results = {
 total: 0,
 created: 0,
 alreadyExisted: 0,
 failed: [] as Array<{ prNumber: string; error: string }>
 };

 // Get all approved PRs
 const allPRs = procurementRequestService.getAllRequests();
 const approvedPRs = allPRs.filter(pr => pr.status === 'approved');
 
 results.total = approvedPRs.length;
 console.log(`📊 [Retroactive RFQ] Found ${results.total} approved PRs`);

 // Check each one
 approvedPRs.forEach(pr => {
 try {
 // Check if RFQ already exists
 const existingRFQ = rfqService.getRFQByPRId(pr.id);
 
 if (existingRFQ) {
 console.log(`ℹ️ [Retroactive RFQ] ${pr.prNumber}: RFQ already exists (${existingRFQ.rfqNumber})`);
 results.alreadyExisted++;
 } else {
 console.log(`📝 [Retroactive RFQ] ${pr.prNumber}: Creating missing RFQ...`);
 
 // Create RFQ
 procurementWorkflowAutomationService.onPRApproved(pr.id, pr.approvedBy || 'system');
 
 results.created++;
 console.log(`✅ [Retroactive RFQ] ${pr.prNumber}: RFQ created successfully`);
 }
 } catch (error) {
 console.error(`❌ [Retroactive RFQ] ${pr.prNumber}: Failed to create RFQ:`, error);
 results.failed.push({
 prNumber: pr.prNumber,
 error: error instanceof Error ? error.message : 'Unknown error'
 });
 }
 });

 console.log('🎉 [Retroactive RFQ] Complete!');
 console.log(` Total PRs: ${results.total}`);
 console.log(` Created: ${results.created}`);
 console.log(` Already existed: ${results.alreadyExisted}`);
 console.log(` Failed: ${results.failed.length}`);

 if (results.failed.length > 0) {
 console.error('❌ Failed PRs:', results.failed);
 }

 return results;
}

/**
 * Run this function from browser console:
 * 
 * import { createMissingRFQs } from './services/procurementRetroactiveRFQCreation';
 * createMissingRFQs();
 */
