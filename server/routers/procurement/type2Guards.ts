import { getDb } from '../../db';
import {
  purchaseRequests,
  bidAnalyses,
  bidAnalysisBidders,
  contracts,
  serviceAcceptanceCertificates,
  procurementInvoices,
  quotationAnalyses,
  quotationAnalysisSuppliers,
  rfqVendors,
  vendors,
  implementationMonitoring,
} from '../../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Type 2 (Consultancy/Works) Procurement Guard Functions
 * Central domain checks enforced server-side before any create operation.
 * Supports both Services and Works categories that follow the
 * Contract → SAC → Invoice → Payment chain.
 */

/** Categories that always follow the Contract→SAC→Invoice→Payment chain */
const CONTRACT_CHAIN_CATEGORIES = ['services', 'consultancy', 'works'];

/** Threshold above which Goods PRs also require a contract (Tender path) */
const GOODS_CONTRACT_THRESHOLD = 25000;

export interface GuardResult {
  allowed: boolean;
  reason?: string;
  data?: Record<string, any>;
}

/**
 * Check if PR follows the Contract chain
 * - Services, Consultancy, Works: always contract chain
 * - Goods: contract chain only when >= $25K (Tender path)
 */
export async function isContractChainPR(prId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [pr] = await db
    .select({
      category: purchaseRequests.category,
      total: purchaseRequests.total,
      prTotalUsd: purchaseRequests.prTotalUsd,
    })
    .from(purchaseRequests)
    .where(eq(purchaseRequests.id, prId))
    .limit(1);
  if (!pr) return false;
  // Services, Consultancy, Works always follow contract chain
  if (CONTRACT_CHAIN_CATEGORIES.includes(pr.category || '')) return true;
  // Goods >= $25K also follow contract chain (Tender path)
  if ((pr.category || '').toLowerCase() === 'goods') {
    const totalUSD = parseFloat(pr.prTotalUsd || pr.total || '0');
    return totalUSD >= GOODS_CONTRACT_THRESHOLD;
  }
  return false;
}

/** @deprecated Use isContractChainPR instead */
export const isType2PR = isContractChainPR;

/**
 * canCreateContract: Supports all services procurement paths
 * - >$25K (formal_tender): CBA must be awarded with winner vendor
 * - $1K-$25K (multiple_quotations): QA must be approved with selected supplier
 * - ≤$1K (single_quotation): RFQ must have at least one submitted vendor
 */
export async function canCreateContract(prId: number, orgId: number): Promise<GuardResult> {
  const db = await getDb();
  if (!db) return { allowed: false, reason: 'Database not available' };

  // 1. Check PR exists and is services category
  const [pr] = await db
    .select()
    .from(purchaseRequests)
    .where(
      and(
        eq(purchaseRequests.id, prId),
        eq(purchaseRequests.organizationId, orgId),
        sql`${purchaseRequests.isDeleted} = 0`
      )
    )
    .limit(1);

  if (!pr) return { allowed: false, reason: 'PR_NOT_FOUND' };
  // Accept services, consultancy, and works categories (all follow Contract chain)
  // Also accept Goods >= $25K (Tender path)
  const isStandardContractChain = CONTRACT_CHAIN_CATEGORIES.includes(pr.category || '');
  const totalUSDCheck = parseFloat(pr.prTotalUsd || pr.total || '0');
  const isGoodsContractRequired = (pr.category || '').toLowerCase() === 'goods' && totalUSDCheck >= GOODS_CONTRACT_THRESHOLD;
  if (!isStandardContractChain && !isGoodsContractRequired) {
    return { allowed: false, reason: 'NOT_CONTRACT_CHAIN_PR' };
  }

  // 2. Check no existing contract for this PR (unique constraint)
  const existingContracts = await db
    .select({ id: contracts.id })
    .from(contracts)
    .where(
      and(
        eq(contracts.purchaseRequestId, prId),
        eq(contracts.organizationId, orgId),
        sql`${contracts.isDeleted} = 0`
      )
    )
    .limit(1);

  if (existingContracts.length > 0) {
    return { allowed: false, reason: 'CONTRACT_ALREADY_EXISTS' };
  }

  // 3. Determine procurement path based on USD total amount
  // IMPORTANT: Use prTotalUsd (the USD equivalent) for threshold comparison,
  // since procurement thresholds are defined in USD. pr.total is in local currency.
  const totalUSD = parseFloat(pr.prTotalUsd || pr.total || '0');

  // Path A: >$25K → CBA must be awarded
  if (totalUSD > 25000) {
    const [cba] = await db
      .select()
      .from(bidAnalyses)
      .where(
        and(
          eq(bidAnalyses.purchaseRequestId, prId),
          eq(bidAnalyses.organizationId, orgId),
          sql`${bidAnalyses.isDeleted} = 0`
        )
      )
      .limit(1);

    if (!cba) return { allowed: false, reason: 'CBA_NOT_FOUND' };
    if (cba.status !== 'awarded') return { allowed: false, reason: 'CBA_NOT_AWARDED' };
    if (!cba.selectedBidderId) return { allowed: false, reason: 'NO_WINNER_SELECTED' };

    return {
      allowed: true,
      data: {
        path: 'cba',
        winnerBidderId: cba.selectedBidderId,
        cbaId: cba.id,
        prCategory: pr.category,
        prCurrency: pr.currency,
        prTotal: pr.total,
      },
    };
  }

  // Path B: $1K-$25K → QA must be approved with selected supplier
  if (totalUSD > 1000) {
    const [qa] = await db
      .select()
      .from(quotationAnalyses)
      .where(
        and(
          eq(quotationAnalyses.purchaseRequestId, prId),
          eq(quotationAnalyses.organizationId, orgId),
          sql`${quotationAnalyses.isDeleted} = 0`
        )
      )
      .limit(1);

    if (!qa) return { allowed: false, reason: 'QA_NOT_FOUND' };
    if (qa.status !== 'approved') return { allowed: false, reason: 'QA_NOT_APPROVED' };
    if (!qa.selectedSupplierId) return { allowed: false, reason: 'NO_WINNER_SELECTED' };

    return {
      allowed: true,
      data: {
        path: 'qa',
        winnerSupplierId: qa.selectedSupplierId,
        qaId: qa.id,
        prCategory: pr.category,
        prCurrency: pr.currency,
        prTotal: pr.total,
      },
    };
  }

  // Path C: ≤$1K → RFQ must have at least one submitted vendor
  const submittedVendors = await db
    .select()
    .from(rfqVendors)
    .where(
      and(
        eq(rfqVendors.purchaseRequestId, prId),
        eq(rfqVendors.organizationId, orgId),
        eq(rfqVendors.submissionStatus, 'submitted'),
        sql`${rfqVendors.isDeleted} = 0`
      )
    )
    .limit(1);

  if (submittedVendors.length === 0) {
    return { allowed: false, reason: 'NO_RFQ_SUBMITTED' };
  }

  return {
    allowed: true,
    data: {
      path: 'rfq',
      rfqVendorId: submittedVendors[0].id,
      winnerSupplierId: submittedVendors[0].supplierId,
      prCategory: pr.category,
      prCurrency: pr.currency,
      prTotal: pr.total,
    },
  };
}

/**
 * getWinnerData: Returns the winning vendor + amount + currency for a PR
 * Used by ContractTab to auto-populate contract fields
 */
export async function getWinnerData(prId: number, orgId: number): Promise<{
  vendorId: number;
  vendorName: string;
  quotedAmount: string;
  currency: string;
  path: string;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const [pr] = await db
    .select()
    .from(purchaseRequests)
    .where(
      and(
        eq(purchaseRequests.id, prId),
        eq(purchaseRequests.organizationId, orgId),
        sql`${purchaseRequests.isDeleted} = 0`
      )
    )
    .limit(1);

  if (!pr) return null;

  // IMPORTANT: Use prTotalUsd (the USD equivalent) for threshold comparison
  const totalUSD = parseFloat(pr.prTotalUsd || pr.total || '0');

  // Path A: >$25K → Get winner from CBA (bid_analyses → bid_analysis_bidders → vendors)
  if (totalUSD > 25000) {
    const [cba] = await db
      .select()
      .from(bidAnalyses)
      .where(
        and(
          eq(bidAnalyses.purchaseRequestId, prId),
          eq(bidAnalyses.organizationId, orgId),
          sql`${bidAnalyses.isDeleted} = 0`,
          eq(bidAnalyses.status, 'awarded')
        )
      )
      .limit(1);

    if (!cba || !cba.selectedBidderId) return null;

    // selectedBidderId is the bidder ROW ID, not the vendor ID
    const [bidder] = await db
      .select()
      .from(bidAnalysisBidders)
      .where(eq(bidAnalysisBidders.id, cba.selectedBidderId))
      .limit(1);

    if (!bidder || !bidder.supplierId) return null;

    const [vendor] = await db
      .select({ id: vendors.id, name: vendors.name })
      .from(vendors)
      .where(eq(vendors.id, bidder.supplierId))
      .limit(1);

    return {
      vendorId: bidder.supplierId,
      vendorName: vendor?.name || bidder.bidderName || 'Unknown',
      quotedAmount: bidder.totalBidAmount || '0',
      currency: bidder.currency || 'USD',
      path: 'cba',
    };
  }

  // Path B: $1K-$25K → Get winner from QA (quotation_analyses → quotation_analysis_suppliers → vendors)
  if (totalUSD > 1000) {
    const [qa] = await db
      .select()
      .from(quotationAnalyses)
      .where(
        and(
          eq(quotationAnalyses.purchaseRequestId, prId),
          eq(quotationAnalyses.organizationId, orgId),
          sql`${quotationAnalyses.isDeleted} = 0`,
          eq(quotationAnalyses.status, 'approved')
        )
      )
      .limit(1);

    if (!qa || !qa.selectedSupplierId) return null;

    // selectedSupplierId is the QA supplier ROW ID
    const [qaSupplier] = await db
      .select()
      .from(quotationAnalysisSuppliers)
      .where(eq(quotationAnalysisSuppliers.id, qa.selectedSupplierId))
      .limit(1);

    if (!qaSupplier) return null;

    // qaSupplier.supplierId is the actual vendor ID
    const actualVendorId = qaSupplier.supplierId;
    let vendorName = qaSupplier.supplierName || 'Unknown';

    if (actualVendorId) {
      const [vendor] = await db
        .select({ id: vendors.id, name: vendors.name })
        .from(vendors)
        .where(eq(vendors.id, actualVendorId))
        .limit(1);
      if (vendor) vendorName = vendor.name;
    }

    return {
      vendorId: actualVendorId || 0,
      vendorName,
      quotedAmount: qaSupplier.totalAmount || '0',
      currency: qaSupplier.currency || 'USD',
      path: 'qa',
    };
  }

  // Path C: ≤$1K → Get winner from RFQ (rfq_vendors → vendors)
  const submittedVendorsList = await db
    .select()
    .from(rfqVendors)
    .where(
      and(
        eq(rfqVendors.purchaseRequestId, prId),
        eq(rfqVendors.organizationId, orgId),
        eq(rfqVendors.submissionStatus, 'submitted'),
        sql`${rfqVendors.isDeleted} = 0`
      )
    )
    .limit(1);

  if (submittedVendorsList.length === 0) return null;

  const rfqVendor = submittedVendorsList[0];
  let vendorName = 'Unknown';

  if (rfqVendor.supplierId) {
    const [vendor] = await db
      .select({ id: vendors.id, name: vendors.name })
      .from(vendors)
      .where(eq(vendors.id, rfqVendor.supplierId))
      .limit(1);
    if (vendor) vendorName = vendor.name;
  }

  return {
    vendorId: rfqVendor.supplierId,
    vendorName,
    quotedAmount: rfqVendor.quotedAmount || '0',
    currency: rfqVendor.currency || 'USD',
    path: 'rfq',
  };
}

/**
 * canCreateSAC: Contract must be approved or active
 */
export async function canCreateSAC(contractId: number, orgId: number): Promise<GuardResult> {
  const db = await getDb();
  if (!db) return { allowed: false, reason: 'Database not available' };

  const [contract] = await db
    .select()
    .from(contracts)
    .where(
      and(
        eq(contracts.id, contractId),
        eq(contracts.organizationId, orgId),
        sql`${contracts.isDeleted} = 0`
      )
    )
    .limit(1);

  if (!contract) return { allowed: false, reason: 'CONTRACT_NOT_FOUND' };
  if (!['approved', 'active'].includes(contract.status)) {
    return { allowed: false, reason: 'CONTRACT_NOT_APPROVED' };
  }

  // Category-Specific Rule: Works PRs require implementation monitoring completion before SAC
  if (contract.purchaseRequestId) {
    const [pr] = await db
      .select({ category: purchaseRequests.category })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, contract.purchaseRequestId))
      .limit(1);

    if (pr && pr.category?.toLowerCase() === 'works') {
      // Check if implementation monitoring exists and is completed
      const [monitoring] = await db
        .select()
        .from(implementationMonitoring)
        .where(
          and(
            eq(implementationMonitoring.contractId, contractId),
            eq(implementationMonitoring.organizationId, orgId),
            sql`${implementationMonitoring.isDeleted} = 0`
          )
        )
        .limit(1);

      if (!monitoring) {
        return {
          allowed: false,
          reason: 'WORKS_MONITORING_REQUIRED',
          data: {
            message: 'Works PRs require implementation monitoring to be set up before SAC can be created. Please configure Implementation Monitoring in the Contract Management section first.',
            messageAr: 'طلبات الأعمال تتطلب إعداد متابعة التنفيذ قبل إنشاء شهادة القبول. يرجى تكوين متابعة التنفيذ في قسم إدارة العقد أولاً.',
          },
        };
      }

      if (monitoring.status !== 'completed') {
        return {
          allowed: false,
          reason: 'WORKS_MONITORING_INCOMPLETE',
          data: {
            message: 'Works PRs require implementation monitoring to be completed before SAC can be created. Current monitoring status: ' + monitoring.status,
            messageAr: 'طلبات الأعمال تتطلب إكمال متابعة التنفيذ قبل إنشاء شهادة القبول. حالة المتابعة الحالية: ' + (monitoring.status === 'pending' ? 'قيد الانتظار' : 'قيد التنفيذ'),
            monitoringStatus: monitoring.status,
            deliverablesChecklistComplete: monitoring.deliverablesChecklistComplete,
            primaryHandoverComplete: monitoring.primaryHandoverComplete,
            finalHandoverComplete: monitoring.finalHandoverComplete,
            observationsComplete: monitoring.observationsComplete,
          },
        };
      }
    }
    // Services/Consultancy PRs: monitoring is optional, SAC can proceed without it
  }

  return {
    allowed: true,
    data: {
      contractValue: contract.contractValue,
      currency: contract.currency,
      vendorId: contract.vendorId,
      purchaseRequestId: contract.purchaseRequestId,
    },
  };
}

/**
 * canCreateInvoice: Contract exists + at least one approved SAC + remaining > 0
 */
export async function canCreateInvoice(contractId: number, orgId: number): Promise<GuardResult> {
  const db = await getDb();
  if (!db) return { allowed: false, reason: 'Database not available' };

  // 1. Check contract
  const [contract] = await db
    .select()
    .from(contracts)
    .where(
      and(
        eq(contracts.id, contractId),
        eq(contracts.organizationId, orgId),
        sql`${contracts.isDeleted} = 0`
      )
    )
    .limit(1);

  if (!contract) return { allowed: false, reason: 'CONTRACT_NOT_FOUND' };
  if (!['approved', 'active'].includes(contract.status)) {
    return { allowed: false, reason: 'CONTRACT_NOT_APPROVED' };
  }

  // 2. Get total approved SAC amount
  const sacResult = await db
    .select({
      totalApproved: sql<string>`COALESCE(SUM(${serviceAcceptanceCertificates.approvedAmount}), 0)`,
    })
    .from(serviceAcceptanceCertificates)
    .where(
      and(
        eq(serviceAcceptanceCertificates.contractId, contractId),
        eq(serviceAcceptanceCertificates.status, 'approved'),
        sql`${serviceAcceptanceCertificates.isDeleted} = 0`
      )
    );

  const sacApprovedTotal = parseFloat(sacResult[0]?.totalApproved || '0');
  if (sacApprovedTotal <= 0) {
    return { allowed: false, reason: 'NO_APPROVED_SAC' };
  }

  // 3. Get total invoiced amount (non-cancelled)
  const invoiceResult = await db
    .select({
      totalInvoiced: sql<string>`COALESCE(SUM(${procurementInvoices.invoiceAmount}), 0)`,
    })
    .from(procurementInvoices)
    .where(
      and(
        eq(procurementInvoices.contractId, contractId),
        sql`${procurementInvoices.approvalStatus} != 'rejected'`
      )
    );

  const invoicedTotal = parseFloat(invoiceResult[0]?.totalInvoiced || '0');
  const remaining = sacApprovedTotal - invoicedTotal;

  if (remaining <= 0) {
    return { allowed: false, reason: 'ALL_SAC_INVOICED' };
  }

  return {
    allowed: true,
    data: {
      contractValue: contract.contractValue,
      currency: contract.currency,
      sacApprovedTotal,
      invoicedTotal,
      remaining,
      vendorId: contract.vendorId,
      purchaseRequestId: contract.purchaseRequestId,
    },
  };
}

/**
 * validateInvoiceAmount: Check invoice amount doesn't exceed remaining SAC coverage
 */
export async function validateInvoiceAmount(
  contractId: number,
  invoiceAmount: number,
  excludeInvoiceId?: number
): Promise<GuardResult> {
  const db = await getDb();
  if (!db) return { allowed: false, reason: 'Database not available' };

  // Get total approved SAC amount
  const sacResult = await db
    .select({
      totalApproved: sql<string>`COALESCE(SUM(${serviceAcceptanceCertificates.approvedAmount}), 0)`,
    })
    .from(serviceAcceptanceCertificates)
    .where(
      and(
        eq(serviceAcceptanceCertificates.contractId, contractId),
        eq(serviceAcceptanceCertificates.status, 'approved'),
        sql`${serviceAcceptanceCertificates.isDeleted} = 0`
      )
    );

  const sacApprovedTotal = parseFloat(sacResult[0]?.totalApproved || '0');

  // Get total invoiced amount (excluding current invoice if editing)
  let invoiceConditions = and(
    eq(procurementInvoices.contractId, contractId),
    sql`${procurementInvoices.approvalStatus} != 'rejected'`
  );

  if (excludeInvoiceId) {
    invoiceConditions = and(
      invoiceConditions,
      sql`${procurementInvoices.id} != ${excludeInvoiceId}`
    );
  }

  const invoiceResult = await db
    .select({
      totalInvoiced: sql<string>`COALESCE(SUM(${procurementInvoices.invoiceAmount}), 0)`,
    })
    .from(procurementInvoices)
    .where(invoiceConditions);

  const invoicedTotal = parseFloat(invoiceResult[0]?.totalInvoiced || '0');
  const remaining = sacApprovedTotal - invoicedTotal;

  if (invoiceAmount > remaining) {
    return {
      allowed: false,
      reason: 'INVOICE_EXCEEDS_SAC_COVERAGE',
      data: { invoiceAmount, remaining: remaining.toFixed(2), sacApprovedTotal: sacApprovedTotal.toFixed(2), invoicedTotal: invoicedTotal.toFixed(2) },
    };
  }

  return {
    allowed: true,
    data: { sacApprovedTotal, invoicedTotal, remaining },
  };
}

/**
 * getType2Status: Get the complete status of Type 2 chain for a PR
 * Used by workspace to render card states
 */
export async function getType2Status(prId: number, orgId: number) {
  const db = await getDb();
  if (!db) return null;

  // Get CBA status
  const [cba] = await db
    .select({
      id: bidAnalyses.id,
      status: bidAnalyses.status,
      selectedBidderId: bidAnalyses.selectedBidderId,
    })
    .from(bidAnalyses)
    .where(
      and(
        eq(bidAnalyses.purchaseRequestId, prId),
        eq(bidAnalyses.organizationId, orgId),
        sql`${bidAnalyses.isDeleted} = 0`
      )
    )
    .limit(1);

  // Get contract
  const [contract] = await db
    .select()
    .from(contracts)
    .where(
      and(
        eq(contracts.purchaseRequestId, prId),
        eq(contracts.organizationId, orgId),
        sql`${contracts.isDeleted} = 0`
      )
    )
    .limit(1);

  // Get SAC summary
  let sacSummary = { count: 0, approvedCount: 0, totalApproved: 0, totalAmount: 0 };
  if (contract) {
    const sacs = await db
      .select()
      .from(serviceAcceptanceCertificates)
      .where(
        and(
          eq(serviceAcceptanceCertificates.contractId, contract.id),
          sql`${serviceAcceptanceCertificates.isDeleted} = 0`
        )
      );

    sacSummary = {
      count: sacs.length,
      approvedCount: sacs.filter(s => s.status === 'approved').length,
      totalApproved: sacs
        .filter(s => s.status === 'approved')
        .reduce((sum, s) => sum + parseFloat(s.approvedAmount || '0'), 0),
      totalAmount: sacs.reduce((sum, s) => sum + parseFloat(s.approvedAmount || '0'), 0),
    };
  }

  // Get invoice summary
  let invoiceSummary = { count: 0, totalInvoiced: 0, approvedCount: 0 };
  if (contract) {
    const invoices = await db
      .select()
      .from(procurementInvoices)
      .where(eq(procurementInvoices.contractId, contract.id));

    invoiceSummary = {
      count: invoices.length,
      totalInvoiced: invoices
        .filter(i => i.approvalStatus !== 'rejected')
        .reduce((sum, i) => sum + parseFloat(i.invoiceAmount || '0'), 0),
      approvedCount: invoices.filter(i => i.approvalStatus === 'approved').length,
    };
  }

  const contractValue = contract ? parseFloat(contract.contractValue || '0') : 0;
  const remaining = sacSummary.totalApproved - invoiceSummary.totalInvoiced;

  return {
    cba: cba ? { id: cba.id, status: cba.status, winnerVendorId: cba.selectedBidderId } : null,
    contract: contract
      ? {
          id: contract.id,
          status: contract.status,
          contractNumber: contract.contractNumber,
          contractValue,
          currency: contract.currency,
          vendorId: contract.vendorId,
        }
      : null,
    sac: sacSummary,
    invoice: invoiceSummary,
    remaining,
    canCreateContract: !contract && cba?.status === 'awarded' && !!cba?.selectedBidderId,
    canCreateSAC: !!contract && ['approved', 'active'].includes(contract.status),
    canCreateInvoice: !!contract && sacSummary.approvedCount > 0 && remaining > 0,
  };
}
