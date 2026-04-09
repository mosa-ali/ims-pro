import { z } from 'zod';
import { scopedProcedure, router } from '../../_core/trpc';
import { getDb } from '../../db';
import {
  contracts,
  contractPenalties,
  contractPaymentSchedule,
  contractRetentionTerms,
  contractMilestones,
  contractVariations,
  implementationMonitoring,
  implementationChecklist,
  primaryHandover,
  finalHandover,
  implementationObservations,
  vendors,
  vendorPerformanceEvaluations,
  purchaseRequests,
  serviceAcceptanceCertificates,
  documents,
} from '../../../drizzle/schema';
import { eq, and, sql, asc, desc } from 'drizzle-orm';

/**
 * Contract Financial Dashboard Router
 * Read-only aggregation endpoint for the automatic financial dashboard
 * Computes: Contract Summary, Payment Progress, Penalty Summary, Retention Summary,
 *           Payment Schedule Progress, Financial Risk Indicators
 */

export const contractFinancialDashboardRouter = router({
  /**
   * Get complete financial dashboard data for a contract
   */
  getDashboard: scopedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      // 1. Contract Summary
      const contract = await db.query.contracts.findFirst({
        where: and(
          eq(contracts.id, input.contractId),
          eq(contracts.organizationId, orgId),
          sql`${contracts.isDeleted} = 0`
        ),
      });

      if (!contract) {
        return null;
      }

      // Get vendor name
      let vendorName = '';
      if (contract.vendorId) {
        const vendor = await db.query.vendors.findFirst({
          where: eq(vendors.id, contract.vendorId),
        });
        vendorName = vendor?.name || '';
      }

      // Get PR info for procurement type
      let procurementType = '';
      let projectTitle = '';
      if (contract.purchaseRequestId) {
        const pr = await db.query.purchaseRequests.findFirst({
          where: eq(purchaseRequests.id, contract.purchaseRequestId),
        });
        procurementType = pr?.procurementType || '';
        projectTitle = pr?.projectTitle || '';
      }

      const contractValue = parseFloat(contract.contractValue || '0');

      // 2. Payment Schedule Summary
      const scheduleEntries = await db.query.contractPaymentSchedule.findMany({
        where: and(
          eq(contractPaymentSchedule.contractId, input.contractId),
          eq(contractPaymentSchedule.organizationId, orgId),
          sql`${contractPaymentSchedule.isDeleted} = 0`
        ),
        orderBy: asc(contractPaymentSchedule.orderIndex),
      });

      const totalScheduled = scheduleEntries.reduce(
        (s, e) => s + parseFloat(e.paymentAmount || '0'), 0
      );
      const totalPaid = scheduleEntries
        .filter(e => e.status === 'paid')
        .reduce((s, e) => s + parseFloat(e.paymentAmount || '0'), 0);
      const totalInvoiced = scheduleEntries
        .filter(e => e.status === 'invoiced' || e.status === 'paid')
        .reduce((s, e) => s + parseFloat(e.paymentAmount || '0'), 0);
      const totalPending = scheduleEntries
        .filter(e => e.status === 'pending' || e.status === 'approved')
        .reduce((s, e) => s + parseFloat(e.paymentAmount || '0'), 0);

      // 3. Penalty Summary
      const penalties = await db.query.contractPenalties.findMany({
        where: and(
          eq(contractPenalties.contractId, input.contractId),
          eq(contractPenalties.organizationId, orgId),
          sql`${contractPenalties.isDeleted} = 0`
        ),
      });

      const appliedPenalties = penalties.filter(p => p.status === 'applied');
      const totalPenaltyApplied = appliedPenalties.reduce(
        (s, p) => s + parseFloat(p.calculatedAmount || '0'), 0
      );
      const totalPenaltyDraft = penalties
        .filter(p => p.status === 'draft')
        .reduce((s, p) => s + parseFloat(p.calculatedAmount || '0'), 0);
      const totalPenaltyWaived = penalties
        .filter(p => p.status === 'waived')
        .reduce((s, p) => s + parseFloat(p.calculatedAmount || '0'), 0);

      // 4. Retention Summary
      const retention = await db.query.contractRetentionTerms.findFirst({
        where: and(
          eq(contractRetentionTerms.contractId, input.contractId),
          eq(contractRetentionTerms.organizationId, orgId),
          sql`${contractRetentionTerms.isDeleted} = 0`
        ),
      });

      const retentionPct = retention ? parseFloat(retention.retentionPercentage || '0') : 0;
      const retentionMaxAmount = retention ? parseFloat(retention.maxRetentionAmount || '0') : 0;
      const retentionTotalRetained = retention ? parseFloat(retention.totalRetained || '0') : 0;
      const retentionTotalReleased = retention ? parseFloat(retention.totalReleased || '0') : 0;
      const retentionBalance = retentionTotalRetained - retentionTotalReleased;

      // 5. Milestones Summary
      const milestones = await db.query.contractMilestones.findMany({
        where: and(
          eq(contractMilestones.contractId, input.contractId),
          eq(contractMilestones.organizationId, orgId),
          sql`${contractMilestones.isDeleted} = 0`
        ),
        orderBy: asc(contractMilestones.orderIndex),
      });

      const completedMilestones = milestones.filter(m => m.status === 'completed').length;

      // 6. SAC Summary
      let sacs: any[] = [];
      try {
        sacs = await db.query.serviceAcceptanceCertificates.findMany({
          where: and(
            eq(serviceAcceptanceCertificates.contractId, input.contractId),
            eq(serviceAcceptanceCertificates.organizationId, orgId),
            sql`${serviceAcceptanceCertificates.isDeleted} = 0`
          ),
        });
      } catch (sacErr: any) {
        console.error('[FinancialDashboard] SAC query error:', sacErr?.message || sacErr);
        // Try raw SQL as fallback
        try {
          const sacRows = await db.execute(sql`
            SELECT id, contractId, organizationId, sacNumber, approvedAmount, currency, status
            FROM service_acceptance_certificates
            WHERE contractId = ${input.contractId}
              AND organizationId = ${orgId}
              AND isDeleted = 0
          `);
          sacs = (sacRows as any)?.[0] || [];
        } catch (rawErr: any) {
          console.error('[FinancialDashboard] SAC raw query error:', rawErr?.message || rawErr);
          sacs = [];
        }
      }

      const approvedSacs = sacs.filter(s => s.status === 'approved');
      const totalSacAmount = approvedSacs.reduce(
        (s, sac) => s + parseFloat(sac.approvedAmount || '0'), 0
      );

      // 7. Implementation Monitoring Summary
      const monitoring = await db.query.implementationMonitoring.findFirst({
        where: and(
          eq(implementationMonitoring.contractId, input.contractId),
          eq(implementationMonitoring.organizationId, orgId),
          sql`${implementationMonitoring.isDeleted} = 0`
        ),
      });

      let monitoringProgress = 0;
      let checklistProgress = { total: 0, completed: 0 };
      let primaryHandoverStatus = 'not_started';
      let finalHandoverStatus = 'not_started';
      let observationsSummary = { total: 0, open: 0 };

      if (monitoring) {
        const checklistItems = await db.query.implementationChecklist.findMany({
          where: eq(implementationChecklist.monitoringId, monitoring.id),
        });
        checklistProgress = {
          total: checklistItems.length,
          completed: checklistItems.filter(i => i.isCompleted === 1).length,
        };

        const ph = await db.query.primaryHandover.findFirst({
          where: eq(primaryHandover.monitoringId, monitoring.id),
        });
        primaryHandoverStatus = ph?.status || 'not_started';

        const fh = await db.query.finalHandover.findFirst({
          where: eq(finalHandover.monitoringId, monitoring.id),
        });
        finalHandoverStatus = fh?.status || 'not_started';

        const obs = await db.query.implementationObservations.findMany({
          where: eq(implementationObservations.monitoringId, monitoring.id),
        });
        observationsSummary = {
          total: obs.length,
          open: obs.filter(o => o.status === 'open' || o.status === 'in_progress').length,
        };

        let completedSteps = 0;
        if (checklistProgress.total > 0 && checklistProgress.completed === checklistProgress.total) completedSteps++;
        if (primaryHandoverStatus === 'approved') completedSteps++;
        if (finalHandoverStatus === 'approved') completedSteps++;
        if (obs.length > 0 && observationsSummary.open === 0) completedSteps++;
        monitoringProgress = Math.round((completedSteps / 4) * 100);
      }

      // 8. Variation / Amendment Tracking
      let variations: any[] = [];
      try {
        variations = await db.query.contractVariations.findMany({
          where: and(
            eq(contractVariations.contractId, input.contractId),
            eq(contractVariations.organizationId, orgId),
            sql`${contractVariations.isDeleted} = 0`
          ),
          orderBy: desc(contractVariations.createdAt),
        });
      } catch {
        variations = [];
      }

      const approvedVariations = variations.filter(v => v.status === 'approved');
      const totalVariationAmount = approvedVariations.reduce(
        (s, v) => s + parseFloat(v.variationAmount || '0'), 0
      );
      const currentContractValue = approvedVariations.length > 0
        ? parseFloat(approvedVariations[0].newContractValue || '0') || contractValue + totalVariationAmount
        : contractValue;

      // 9. Vendor Performance Data
      let vendorPerformance: { quality: number; delivery: number; compliance: number; overall: number; evaluationCount: number } | null = null;
      if (contract.vendorId) {
        try {
          const evals = await db.query.vendorPerformanceEvaluations.findMany({
            where: and(
              eq(vendorPerformanceEvaluations.vendorId, contract.vendorId),
              eq(vendorPerformanceEvaluations.organizationId, orgId),
            ),
            orderBy: desc(vendorPerformanceEvaluations.evaluationDate),
          });
          if (evals.length > 0) {
            const avgQuality = evals.reduce((s, e) => s + parseFloat(e.qualityScore || '0'), 0) / evals.length;
            const avgDelivery = evals.reduce((s, e) => s + parseFloat(e.deliveryScore || '0'), 0) / evals.length;
            const avgCompliance = evals.reduce((s, e) => s + parseFloat(e.complianceScore || '0'), 0) / evals.length;
            const avgOverall = evals.reduce((s, e) => s + parseFloat(e.overallScore || '0'), 0) / evals.length;
            vendorPerformance = {
              quality: Math.round(avgQuality * 10) / 10,
              delivery: Math.round(avgDelivery * 10) / 10,
              compliance: Math.round(avgCompliance * 10) / 10,
              overall: Math.round(avgOverall * 10) / 10,
              evaluationCount: evals.length,
            };
          }
        } catch {
          vendorPerformance = null;
        }
      }

      // 10. Document Status
      let documentStatus: { signedContract: boolean; boq: boolean; performanceGuarantee: boolean; insurance: boolean } = {
        signedContract: !!contract.signedFileUrl,
        boq: false,
        performanceGuarantee: false,
        insurance: false,
      };
      try {
        const contractDocs = await db.query.documents.findMany({
          where: and(
            eq(documents.entityType, 'contract'),
            eq(documents.entityId, String(input.contractId)),
            eq(documents.organizationId, orgId),
            sql`${documents.deletedAt} IS NULL`
          ),
        });
        for (const doc of contractDocs) {
          const name = (doc.fileName || '').toLowerCase();
          if (name.includes('boq') || name.includes('specification') || name.includes('bill of quantities')) {
            documentStatus.boq = true;
          }
          if (name.includes('guarantee') || name.includes('performance bond') || name.includes('bank guarantee')) {
            documentStatus.performanceGuarantee = true;
          }
          if (name.includes('insurance') || name.includes('policy')) {
            documentStatus.insurance = true;
          }
        }
      } catch {
        // Documents query failed, keep defaults
      }

      // 11. Financial Risk Indicators
      const risks: Array<{ type: 'warning' | 'danger' | 'info'; message: string }> = [];

      // Penalty risk
      if (totalPenaltyApplied > 0) {
        const penaltyPct = (totalPenaltyApplied / contractValue) * 100;
        if (penaltyPct > 5) {
          risks.push({ type: 'danger', message: `Penalties exceed 5% of contract value (${penaltyPct.toFixed(1)}%)` });
        } else {
          risks.push({ type: 'warning', message: `Active penalties: $${totalPenaltyApplied.toFixed(2)} (${penaltyPct.toFixed(1)}%)` });
        }
      }
      if (totalPenaltyDraft > 0) {
        risks.push({ type: 'info', message: `Draft penalties pending: $${totalPenaltyDraft.toFixed(2)}` });
      }

      // Retention risk
      if (retentionBalance > 0 && retention?.status !== 'released') {
        risks.push({ type: 'info', message: `Retention held: $${retentionBalance.toFixed(2)} (${retentionPct}%)` });
      }

      // Payment schedule risk
      if (scheduleEntries.length === 0) {
        risks.push({ type: 'warning', message: 'No payment schedule defined' });
      } else {
        const totalPct = scheduleEntries.reduce((s, e) => s + parseFloat(e.paymentPercentage || '0'), 0);
        if (totalPct < 99.99) {
          risks.push({ type: 'warning', message: `Payment schedule incomplete: ${totalPct.toFixed(1)}% of 100%` });
        }
      }

      // Contract timeline risk
      if (contract.endDate) {
        const endDate = new Date(contract.endDate);
        const now = new Date();
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining < 0) {
          risks.push({ type: 'danger', message: `Contract expired ${Math.abs(daysRemaining)} days ago` });
        } else if (daysRemaining < 30) {
          risks.push({ type: 'warning', message: `Contract expires in ${daysRemaining} days` });
        }
      }

      // Net payable calculation
      const netPayable = contractValue - totalPenaltyApplied - retentionBalance;

      return {
        contractSummary: {
          id: contract.id,
          contractNumber: contract.contractNumber,
          contractValue,
          currency: contract.currency,
          startDate: contract.startDate,
          endDate: contract.endDate,
          status: contract.status,
          vendorName,
          procurementType,
          projectTitle,
          paymentStructure: contract.paymentStructure,
        },
        paymentProgress: {
          totalScheduled,
          totalInvoiced,
          totalPaid,
          totalPending,
          remaining: totalScheduled - totalPaid,
          scheduleEntries: scheduleEntries.map(e => ({
            id: e.id,
            paymentType: e.paymentType,
            description: e.description,
            percentage: parseFloat(e.paymentPercentage || '0'),
            amount: parseFloat(e.paymentAmount || '0'),
            status: e.status,
            condition: e.paymentCondition,
          })),
        },
        penaltySummary: {
          totalApplied: totalPenaltyApplied,
          totalDraft: totalPenaltyDraft,
          totalWaived: totalPenaltyWaived,
          count: penalties.length,
          appliedCount: appliedPenalties.length,
        },
        retentionSummary: {
          enabled: retention ? retention.retentionEnabled === 1 : false,
          percentage: retentionPct,
          maxAmount: retentionMaxAmount,
          totalRetained: retentionTotalRetained,
          totalReleased: retentionTotalReleased,
          balance: retentionBalance,
          status: retention?.status || 'none',
          releaseCondition: retention?.releaseCondition,
        },
        milestonesSummary: {
          total: milestones.length,
          completed: completedMilestones,
          milestones: milestones.map(m => ({
            id: m.id,
            title: m.title,
            amount: parseFloat(m.amount || '0'),
            status: m.status,
            dueDate: m.dueDate,
          })),
        },
        sacSummary: {
          total: sacs.length,
          approved: approvedSacs.length,
          totalApprovedAmount: totalSacAmount,
        },
        monitoringSummary: {
          initialized: !!monitoring,
          status: monitoring?.status || 'not_started',
          progress: monitoringProgress,
          checklist: checklistProgress,
          primaryHandover: primaryHandoverStatus,
          finalHandover: finalHandoverStatus,
          observations: observationsSummary,
        },
        financials: {
          contractValue,
          totalPenalties: totalPenaltyApplied,
          totalRetention: retentionBalance,
          netPayable,
          totalPaid,
          remainingPayable: netPayable - totalPaid,
        },
        risks,
        variationSummary: {
          total: variations.length,
          approved: approvedVariations.length,
          pending: variations.filter(v => v.status === 'pending_approval').length,
          totalVariationAmount,
          originalContractValue: contractValue,
          currentContractValue,
          variations: variations.slice(0, 5).map(v => ({
            id: v.id,
            variationNumber: v.variationNumber,
            variationType: v.variationType,
            variationAmount: parseFloat(v.variationAmount || '0'),
            status: v.status,
            description: v.description,
          })),
        },
        vendorPerformance,
        documentStatus,
      };
    }),
});
