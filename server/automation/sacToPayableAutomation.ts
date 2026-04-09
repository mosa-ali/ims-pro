/**
 * SAC to Payable Automation
 * Automatically creates payable records when SAC is approved
 * 
 * Two flows:
 * - Services/Consultancy: SAC → Payable (pending_invoice) → Invoice → Payment
 * - Works: SAC → Payable (pending_payment) → Payment (NO Invoice step)
 * 
 * Calculation: Net Payable = SAC approvedAmount - Penalty Deductions - Retention Deductions
 * Per SAC: One SAC = One Payable (for milestone-based payments)
 * Financial Integration: Penalties distributed across SACs, Retention % applied per term
 */

import {
  serviceAcceptanceCertificates,
  contracts,
  procurementPayables,
  purchaseRequests,
  contractPenalties,
  contractRetentionTerms,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

// Works category uses Contract → SAC → Payment (no Invoice)
const WORKS_CATEGORIES = ['works'];

export async function createPayableFromSAC(
  dbOrTrx: any, // Can be db or transaction object
  sacId: number,
  ctx: { scope: { organizationId: number; operatingUnitId: number }; user: { id: number } }
) {
  try {
    console.log(`\n🔄 [SAC→Payable] Starting automation for SAC ${sacId}`);

    // Step 1: Check if payable already exists (duplicate prevention)
    const existingPayable = await dbOrTrx
      .select()
      .from(procurementPayables)
      .where(
        and(
          eq(procurementPayables.sacId, sacId),
          eq(procurementPayables.organizationId, ctx.scope.organizationId),
          eq(procurementPayables.operatingUnitId, ctx.scope.operatingUnitId)
        )
      )
      .limit(1);

    if (existingPayable && existingPayable.length > 0) {
      console.log(`⚠️ [SAC→Payable] Payable already exists for SAC ${sacId} - skipping duplicate`);
      return existingPayable[0];
    }

    // Step 2: Get SAC details
    const sacResults = await dbOrTrx
      .select()
      .from(serviceAcceptanceCertificates)
      .where(eq(serviceAcceptanceCertificates.id, sacId));

    const sac = sacResults && sacResults.length > 0 ? sacResults[0] : null;

    if (!sac) {
      console.error(`❌ [SAC→Payable] SAC not found: ${sacId}`);
      throw new Error(`SAC not found: ${sacId}`);
    }

    if (sac.status !== 'approved') {
      console.error(`❌ [SAC→Payable] SAC ${sacId} is not approved (status: ${sac.status})`);
      throw new Error(`SAC ${sacId} is not approved`);
    }

    console.log(`📋 [SAC→Payable] Found SAC: ${sac.sacNumber}, Amount: ${sac.approvedAmount} ${sac.currency}, Type: ${sac.acceptanceType || 'SERVICE'}`);

    // Step 3: Get Contract details (for vendor and PR linkage)
    const contractResults = await dbOrTrx
      .select()
      .from(contracts)
      .where(eq(contracts.id, sac.contractId));

    const contract = contractResults && contractResults.length > 0 ? contractResults[0] : null;

    if (!contract) {
      console.error(`❌ [SAC→Payable] Contract not found for SAC ${sacId}`);
      throw new Error(`Contract not found for SAC ${sacId}`);
    }

    console.log(`📋 [SAC→Payable] Found Contract: ${contract.contractNumber}, Vendor: ${contract.vendorId}`);

    // Step 4: Determine if this is a Works PR (no Invoice step)
    let isWorksPR = sac.acceptanceType === 'WORKS';
    
    // Also check PR category as fallback
    if (!isWorksPR && contract.purchaseRequestId) {
      const prResults = await dbOrTrx
        .select({ category: purchaseRequests.category })
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, contract.purchaseRequestId))
        .limit(1);
      
      if (prResults && prResults.length > 0) {
        isWorksPR = WORKS_CATEGORIES.includes(prResults[0].category?.toLowerCase() || '');
      }
    }

    console.log(`📋 [SAC→Payable] PR type: ${isWorksPR ? 'WORKS (no Invoice step)' : 'SERVICES (pending invoice)'}`);

    // Step 5: Calculate payable amount from SAC approved amount with deductions
    const grossAmount = parseFloat(sac.approvedAmount || '0');

    if (grossAmount <= 0) {
      console.warn(`⚠️ [SAC→Payable] No valid payable amount for SAC ${sacId} (amount: ${sac.approvedAmount})`);
      return null;
    }

    // Step 5a: Calculate penalty deductions (applied penalties for this contract)
    let penaltyDeduction = 0;
    try {
      const appliedPenalties = await dbOrTrx
        .select()
        .from(contractPenalties)
        .where(
          and(
            eq(contractPenalties.contractId, contract.id),
            eq(contractPenalties.organizationId, ctx.scope.organizationId),
            eq(contractPenalties.status, 'applied'),
            eq(contractPenalties.isDeleted, 0)
          )
        );
      
      // Sum up penalty amounts that haven't been deducted yet
      // Each penalty's amount is deducted proportionally across SACs
      if (appliedPenalties && appliedPenalties.length > 0) {
        const totalPenaltyAmount = appliedPenalties.reduce(
          (sum: number, p: any) => sum + parseFloat(p.amount || '0'), 0
        );
        
        // Check how many SACs exist for this contract to distribute penalties
        const allSacs = await dbOrTrx
          .select()
          .from(serviceAcceptanceCertificates)
          .where(
            and(
              eq(serviceAcceptanceCertificates.contractId, contract.id),
              eq(serviceAcceptanceCertificates.organizationId, ctx.scope.organizationId),
              eq(serviceAcceptanceCertificates.status, 'approved')
            )
          );
        
        const sacCount = allSacs ? allSacs.length : 1;
        // Distribute penalty evenly across SACs (or apply full to first SAC if only one)
        penaltyDeduction = sacCount > 0 ? totalPenaltyAmount / sacCount : 0;
        
        console.log(`📋 [SAC→Payable] Penalty deduction: ${penaltyDeduction} (${totalPenaltyAmount} total / ${sacCount} SACs)`);
      }
    } catch (penaltyErr) {
      console.warn(`⚠️ [SAC→Payable] Could not calculate penalty deductions:`, penaltyErr);
    }

    // Step 5b: Calculate retention deduction
    let retentionDeduction = 0;
    try {
      const retentionTerms = await dbOrTrx
        .select()
        .from(contractRetentionTerms)
        .where(
          and(
            eq(contractRetentionTerms.contractId, contract.id),
            eq(contractRetentionTerms.organizationId, ctx.scope.organizationId),
            eq(contractRetentionTerms.status, 'active'),
            eq(contractRetentionTerms.isDeleted, 0)
          )
        );
      
      if (retentionTerms && retentionTerms.length > 0) {
        // Apply retention percentage to the gross amount
        for (const term of retentionTerms) {
          const retPct = parseFloat(term.retentionPercentage || '0');
          const maxAmt = parseFloat(term.maxRetentionAmount || '0');
          let retAmount = (grossAmount * retPct) / 100;
          
          // Cap at max retention amount if specified
          if (maxAmt > 0 && retAmount > maxAmt) {
            retAmount = maxAmt;
          }
          retentionDeduction += retAmount;
        }
        
        console.log(`📋 [SAC→Payable] Retention deduction: ${retentionDeduction}`);
      }
    } catch (retErr) {
      console.warn(`⚠️ [SAC→Payable] Could not calculate retention deductions:`, retErr);
    }

    // Step 5c: Calculate net payable amount
    const totalPayableAmount = Math.max(0, grossAmount - penaltyDeduction - retentionDeduction);
    
    console.log(`✅ [SAC→Payable] Amount breakdown:`);
    console.log(`   - Gross (SAC approved): ${grossAmount} ${sac.currency || contract.currency}`);
    console.log(`   - Penalty deduction: -${penaltyDeduction}`);
    console.log(`   - Retention deduction: -${retentionDeduction}`);
    console.log(`   - Net payable: ${totalPayableAmount} ${sac.currency || contract.currency}`);

    // Step 6: Create payable record
    // Works: pending_payment (SAC is the acceptance, no separate invoice needed)
    // Services: pending_invoice (waiting for vendor invoice after SAC)
    const initialStatus = isWorksPR ? "pending_payment" : "pending_invoice";
    const payableNumber = `PAY-${nanoid(12).toUpperCase()}`;

    // Default due date: 30 days from now
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + 30);
    const dueDate = dueDateObj.toISOString().split('T')[0]; // YYYY-MM-DD

    const payableRecord = {
      purchaseRequestId: contract.purchaseRequestId,
      purchaseOrderId: null, // Contract chain has no PO
      contractId: contract.id,
      sacId: sac.id,
      vendorId: contract.vendorId,
      totalAmount: totalPayableAmount,
      currency: sac.currency || contract.currency || "USD",
      status: initialStatus as any,
      dueDate: dueDate,
      payableNumber: payableNumber,
      remainingAmount: totalPayableAmount,
      organizationId: ctx.scope.organizationId,
      operatingUnitId: ctx.scope.operatingUnitId,
      createdBy: ctx.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await dbOrTrx.insert(procurementPayables).values(payableRecord);

    console.log(`\n✅ [SAC→Payable] SUCCESS: Payable ${payableNumber} created`);
    console.log(`   - PR: ${contract.purchaseRequestId}`);
    console.log(`   - Contract: ${contract.contractNumber}`);
    console.log(`   - SAC: ${sac.sacNumber}`);
    console.log(`   - Vendor: ${contract.vendorId}`);
    console.log(`   - Amount: ${totalPayableAmount} ${sac.currency || contract.currency}`);
    console.log(`   - Status: ${initialStatus} (${isWorksPR ? 'Works - ready for payment' : 'Services - awaiting invoice'})`);
    console.log(`   - Due Date: ${dueDate}\n`);

    return payableRecord;
  } catch (error) {
    console.error("\n❌ [SAC→Payable] ERROR in createPayableFromSAC:", error);
    throw error; // Propagate error to trigger transaction rollback
  }
}
