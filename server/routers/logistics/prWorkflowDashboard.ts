/**
 * PR Workflow Dashboard Router
 * 
 * Provides backend procedures for the PR Workflow Dashboard card on Logistics Home
 * and the My PRs CRUD list with real procurement progress from database records.
 * 
 * Procurement Progress is driven by real backend state — no hardcoding or mocks.
 * Each stage is determined by checking actual records in the relevant tables.
 * 
 * Procurement Chains by Type:
 *   Goods:
 *     ≤ 25K: PR → RFQ/QA → PO → GRN → Payable → Payment → Closure
 *     > 25K: PR → Tender/BA → PO → GRN → 3-Way Match → Payable → Payment → Closure
 *   Services/Consultancy:
 *     ≤ 25K: PR → RFQ/QA → Contract → SAC → Payable → Payment → Closure
 *     > 25K: PR → Tender/BA → Contract → SAC → Payable → Payment → Closure
 *   Works:
 *     ≤ 25K: PR → RFQ/QA → Contract → SAC → Payable → Payment → Closure
 *     > 25K: PR → Tender/BA → Contract → SAC → Payable → Payment → Closure
 */
import { z } from "zod";
import { router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { eq, and, sql, isNull, desc, like, or } from "drizzle-orm";
import {
  purchaseRequests,
  purchaseRequestLineItems,
  rfqs,
  quotationAnalyses,
  bidAnalyses,
  purchaseOrders,
  goodsReceiptNotes,
  procurementInvoices,
  procurementPayables,
  procurementPayments,
} from "../../../drizzle/schema";

/* ── Types ─────────────────────────────────────────────────────────────── */

/**
 * Procurement stage status:
 *   "completed"   – document exists and is in a terminal/approved state
 *   "in_progress" – document exists but is still being worked on
 *   "not_started" – no document exists yet
 *   "locked"      – prerequisites not met (e.g., PR not approved)
 *   "n/a"         – stage does not apply to this PR type/threshold
 */
type StageStatus = "completed" | "in_progress" | "not_started" | "locked" | "n/a";

interface ProcurementStage {
  name: string;
  nameAr: string;
  status: StageStatus;
  docNumber?: string;
  docStatus?: string;
}

/* ── Helper: Determine threshold ───────────────────────────────────────── */
function isAboveThreshold(totalUSD: number): boolean {
  return totalUSD > 25000;
}

/* ── Helper: Calculate total amount in USD from line items ─────────────── */
function calcTotalUSD(lineItems: any[], exchangeRate: number): number {
  const total = lineItems.reduce((sum: number, item: any) => {
    const qty = parseFloat(item.quantity?.toString() || "0");
    const price = parseFloat(item.unitPrice?.toString() || "0");
    const recurrence = parseFloat(item.recurrence?.toString() || "1");
    return sum + (qty * price * recurrence);
  }, 0);
  return exchangeRate > 0 ? total * exchangeRate : total;
}

/* ── Helper: Determine current procurement stage label ─────────────────── */
function getCurrentStageLabel(stages: ProcurementStage[]): { label: string; labelAr: string } {
  let lastCompleted: ProcurementStage | null = null;
  let firstInProgress: ProcurementStage | null = null;

  for (const stage of stages) {
    if (stage.status === "completed") {
      lastCompleted = stage;
    }
    if (stage.status === "in_progress" && !firstInProgress) {
      firstInProgress = stage;
    }
  }

  if (firstInProgress) {
    return { label: firstInProgress.name, labelAr: firstInProgress.nameAr };
  }
  if (lastCompleted) {
    return { label: lastCompleted.name, labelAr: lastCompleted.nameAr };
  }
  return { label: "PR Created", labelAr: "تم إنشاء طلب الشراء" };
}

/* ── Router ─────────────────────────────────────────────────────────────── */
export const prWorkflowDashboardRouter = router({

  /**
   * getStatusCounts – Returns PR status counts for the dashboard card
   * Scoped by Org + OU
   */
  getStatusCounts: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const baseConditions = [
        eq(purchaseRequests.organizationId, organizationId),
        eq(purchaseRequests.operatingUnitId, operatingUnitId),
        isNull(purchaseRequests.deletedAt),
      ];

      const draftResult = await db.select({ count: sql<number>`count(*)` })
        .from(purchaseRequests)
        .where(and(...baseConditions, eq(purchaseRequests.status, "draft")));

      const submittedResult = await db.select({ count: sql<number>`count(*)` })
        .from(purchaseRequests)
        .where(and(
          ...baseConditions,
          sql`${purchaseRequests.status} IN ('submitted', 'validated_by_logistic', 'validated_by_finance')`
        ));

      const approvedResult = await db.select({ count: sql<number>`count(*)` })
        .from(purchaseRequests)
        .where(and(...baseConditions, eq(purchaseRequests.status, "approved")));

      const rejectedResult = await db.select({ count: sql<number>`count(*)` })
        .from(purchaseRequests)
        .where(and(
          ...baseConditions,
          sql`${purchaseRequests.status} IN ('rejected_by_logistic', 'rejected_by_finance', 'rejected_by_pm')`
        ));

      const totalResult = await db.select({ count: sql<number>`count(*)` })
        .from(purchaseRequests)
        .where(and(...baseConditions));

      return {
        draft: draftResult[0]?.count || 0,
        submitted: submittedResult[0]?.count || 0,
        approved: approvedResult[0]?.count || 0,
        rejected: rejectedResult[0]?.count || 0,
        total: totalResult[0]?.count || 0,
      };
    }),

  /**
   * getMyPRs – Returns PR list with real procurement progress for each PR
   * Scoped by Org + OU, with optional status filter
   */
  getMyPRs: scopedProcedure
    .input(z.object({
      status: z.enum([
        "all", "draft", "submitted", "approved", "rejected",
        "validated_by_logistic", "rejected_by_logistic",
        "validated_by_finance", "rejected_by_finance", "rejected_by_pm"
      ]).default("all"),
      search: z.string().optional(),
      category: z.enum(["all", "goods", "services", "works"]).default("all"),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const conditions: any[] = [
        eq(purchaseRequests.organizationId, organizationId),
        eq(purchaseRequests.operatingUnitId, operatingUnitId),
        isNull(purchaseRequests.deletedAt),
      ];

      if (input.status === "submitted") {
        conditions.push(
          sql`${purchaseRequests.status} IN ('submitted', 'validated_by_logistic', 'validated_by_finance')`
        );
      } else if (input.status === "rejected") {
        conditions.push(
          sql`${purchaseRequests.status} IN ('rejected_by_logistic', 'rejected_by_finance', 'rejected_by_pm')`
        );
      } else if (input.status !== "all") {
        conditions.push(eq(purchaseRequests.status, input.status));
      }

      if (input.category !== "all") {
        conditions.push(eq(purchaseRequests.category, input.category));
      }

      if (input.search) {
        conditions.push(
          or(
            like(purchaseRequests.prNumber, `%${input.search}%`),
            like(purchaseRequests.projectTitle, `%${input.search}%`),
            like(purchaseRequests.requesterName, `%${input.search}%`)
          )!
        );
      }

      const prResults = await db.select().from(purchaseRequests)
        .where(and(...conditions))
        .orderBy(desc(purchaseRequests.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(purchaseRequests)
        .where(and(...conditions));

      const prsWithProgress = await Promise.all(
        prResults.map(async (pr: any) => {
          const lineItems = await db.select()
            .from(purchaseRequestLineItems)
            .where(eq(purchaseRequestLineItems.purchaseRequestId, pr.id));

          const exchangeRate = parseFloat(pr.exchangeRate?.toString() || "1");
          const totalAmount = lineItems.reduce((sum: number, item: any) => {
            const qty = parseFloat(item.quantity?.toString() || "0");
            const price = parseFloat(item.unitPrice?.toString() || "0");
            const recurrence = parseFloat(item.recurrence?.toString() || "1");
            return sum + (qty * price * recurrence);
          }, 0);
          const totalUSD = calcTotalUSD(lineItems, exchangeRate);
          const aboveThreshold = isAboveThreshold(totalUSD);

          const stages = await calculateProcurementProgress(
            db, pr.id, pr.status || "draft", pr.category || "goods", aboveThreshold
          );

          const currentStage = getCurrentStageLabel(stages);

          // Always display line items total in USD, regardless of budget currency
          const displayCurrency = "USD";
          const displayAmount = totalAmount;

          return {
            id: pr.id,
            prNumber: pr.prNumber,
            requesterName: pr.requesterName,
            projectTitle: pr.projectTitle,
            category: pr.category,
            currency: displayCurrency,
            totalAmount: displayAmount,
            totalUSD,
            prDate: pr.prDate,
            createdAt: pr.createdAt,
            status: pr.status,
            urgency: pr.urgency,
            aboveThreshold,
            procurementStages: stages,
            currentStageLabel: currentStage.label,
            currentStageLabelAr: currentStage.labelAr,
          };
        })
      );

      return {
        items: prsWithProgress,
        total: countResult[0]?.count || 0,
      };
    }),
});

/* ── Core: Calculate procurement progress from real DB records ──────────── */
async function calculateProcurementProgress(
  db: any,
  prId: number,
  prStatus: string,
  category: string,
  aboveThreshold: boolean
): Promise<ProcurementStage[]> {
  const stages: ProcurementStage[] = [];
  const isApproved = prStatus === "approved";
  const isGoodsType = category === "goods";
  const isServicesType = category === "services" || category === "consultancy";
  const isWorksType = category === "works";
  // Contract chain = Services, Consultancy, Works (no PO/GRN)
  const isContractChain = isServicesType || isWorksType;

  // ── Stage 1: PR ──────────────────────────────────────────────────────
  stages.push({
    name: "PR",
    nameAr: "طلب الشراء",
    status: isApproved ? "completed" : "in_progress",
    docStatus: prStatus,
  });

  if (!isApproved) {
    // If PR is not approved, show remaining stages as locked based on type
    let remainingNames: string[];
    let remainingNamesAr: string[];

    if (isGoodsType) {
      if (aboveThreshold) {
        remainingNames = ["Tender/BA", "PO", "GRN", "3-Way Match", "Payable", "Payment", "Closure"];
        remainingNamesAr = ["المناقصة/تحليل العطاءات", "أمر الشراء", "إشعار الاستلام", "المطابقة الثلاثية", "المستحقات", "الدفع", "الإغلاق"];
      } else {
        remainingNames = ["RFQ/QA", "PO", "GRN", "Payable", "Payment", "Closure"];
        remainingNamesAr = ["طلب العروض/التحليل", "أمر الشراء", "إشعار الاستلام", "المستحقات", "الدفع", "الإغلاق"];
      }
    } else if (isWorksType) {
      // Works: Contract → SAC → Payment (no Invoice)
      if (aboveThreshold) {
        remainingNames = ["Tender/BA", "Contract", "SAC", "Payable", "Payment", "Closure"];
        remainingNamesAr = ["المناقصة/تحليل العطاءات", "العقد", "شهادة قبول الأعمال", "المستحقات", "الدفع", "الإغلاق"];
      } else {
        remainingNames = ["RFQ/QA", "Contract", "SAC", "Payable", "Payment", "Closure"];
        remainingNamesAr = ["طلب العروض/التحليل", "العقد", "شهادة قبول الأعمال", "المستحقات", "الدفع", "الإغلاق"];
      }
    } else {
      // Services/Consultancy: Contract → SAC → Payable → Payment → Closure (no Invoice stage)
      if (aboveThreshold) {
        remainingNames = ["Tender/BA", "Contract", "SAC", "Payable", "Payment", "Closure"];
        remainingNamesAr = ["المناقصة/تحليل العطاءات", "العقد", "شهادة القبول", "المستحقات", "الدفع", "الإغلاق"];
      } else {
        remainingNames = ["RFQ/QA", "Contract", "SAC", "Payable", "Payment", "Closure"];
        remainingNamesAr = ["طلب العروض/التحليل", "العقد", "شهادة القبول", "المستحقات", "الدفع", "الإغلاق"];
      }
    }

    for (let i = 0; i < remainingNames.length; i++) {
      stages.push({ name: remainingNames[i], nameAr: remainingNamesAr[i], status: "locked" });
    }
    return stages;
  }

  // ── Stage 2: RFQ/Tender (depends on threshold) ──────────────────────
  if (aboveThreshold) {
    const baResults = await db.select()
      .from(bidAnalyses)
      .where(and(eq(bidAnalyses.purchaseRequestId, prId), isNull(bidAnalyses.deletedAt)))
      .limit(1);
    const ba = baResults[0];
    const baCompleted = ba && ba.status === "awarded";
    const baInProgress = ba && !baCompleted;

    stages.push({
      name: "Tender/BA",
      nameAr: "المناقصة/تحليل العطاءات",
      status: baCompleted ? "completed" : baInProgress ? "in_progress" : "not_started",
      docNumber: ba?.cbaNumber,
      docStatus: ba?.status,
    });
  } else {
    const rfqResults = await db.select()
      .from(rfqs)
      .where(and(eq(rfqs.purchaseRequestId, prId), isNull(rfqs.deletedAt)))
      .limit(1);
    const rfq = rfqResults[0];

    const qaResults = await db.select()
      .from(quotationAnalyses)
      .where(and(eq(quotationAnalyses.purchaseRequestId, prId), isNull(quotationAnalyses.deletedAt)))
      .limit(1);
    const qa = qaResults[0];

    const qaCompleted = qa && qa.status === "approved";
    const inProgress = (rfq && rfq.status !== "cancelled") || (qa && !qaCompleted);

    stages.push({
      name: "RFQ/QA",
      nameAr: "طلب العروض/التحليل",
      status: qaCompleted ? "completed" : (inProgress ? "in_progress" : "not_started"),
      docNumber: rfq?.rfqNumber || qa?.qaNumber,
      docStatus: qa?.status || rfq?.status,
    });
  }

  const prevStage2Completed = stages[stages.length - 1].status === "completed";

  // ── Stage 3: PO (Goods) or Contract (Services/Works/Consultancy) ────
  if (isContractChain) {
    // Services, Consultancy, Works: Contract (no PO)
    let contract: any = null;
    try {
      const contractResults = await db.execute(
        sql`SELECT * FROM contracts WHERE purchase_request_id = ${prId} AND deleted_at IS NULL LIMIT 1`
      );
      contract = contractResults?.rows?.[0] || contractResults?.[0] || null;
    } catch {
      // Table does not exist yet — skip
    }

    const contractActive = contract && ["active", "approved", "completed"].includes(contract.status);
    const contractInProgress = contract && !contractActive;

    stages.push({
      name: "Contract",
      nameAr: "العقد",
      status: contractActive ? "completed" : contractInProgress ? "in_progress" : (prevStage2Completed ? "not_started" : "locked"),
      docNumber: contract?.contractNumber,
      docStatus: contract?.status,
    });

    // ── Stage 4: SAC (Service/Works Acceptance Certificate) ──────────
    const prevContractCompleted = stages[stages.length - 1].status === "completed";
    let sacResults: any[] = [];
    if (contract) {
      try {
        const rawSac = await db.execute(
          sql`SELECT * FROM service_acceptance_certificates WHERE contract_id = ${contract.id} AND deleted_at IS NULL`
        );
        sacResults = rawSac?.rows || rawSac || [];
        if (!Array.isArray(sacResults)) sacResults = [];
      } catch {
        // Table does not exist yet — skip
      }
    }
    const hasSAC = sacResults.length > 0;
    const sacApproved = sacResults.some((s: any) => s.status === "approved");
    const sacInProgress = hasSAC && !sacApproved;

    stages.push({
      name: "SAC",
      nameAr: isWorksType ? "شهادة قبول الأعمال" : "شهادة القبول",
      status: sacApproved ? "completed" : sacInProgress ? "in_progress" : (prevContractCompleted ? "not_started" : "locked"),
      docNumber: sacResults[0]?.sacNumber || sacResults[0]?.sac_number,
      docStatus: sacResults[0]?.status,
    });

    // Services/Consultancy and Works: SAC goes directly to Payable (no separate Invoice stage)
    // Invoice is handled as part of the Payment process

  } else {
    // Goods: PO
    const poResults = await db.select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.purchaseRequestId, prId), isNull(purchaseOrders.deletedAt)))
      .limit(1);
    const po = poResults[0];

    const poCompleted = po && ["acknowledged", "partially_delivered", "delivered", "completed"].includes(po.status);
    const poInProgress = po && !poCompleted;

    stages.push({
      name: "PO",
      nameAr: "أمر الشراء",
      status: poCompleted ? "completed" : poInProgress ? "in_progress" : (prevStage2Completed ? "not_started" : "locked"),
      docNumber: po?.poNumber,
      docStatus: po?.status,
    });

    // ── Stage 4: GRN (Goods only) ───────────────────────────────────
    const prevPoCompleted = stages[stages.length - 1].status === "completed";
    const grnResults = po ? await db.select()
      .from(goodsReceiptNotes)
      .where(and(eq(goodsReceiptNotes.purchaseOrderId, po.id), isNull(goodsReceiptNotes.deletedAt)))
      : [];
    const hasGRN = grnResults.length > 0;
    const grnAccepted = grnResults.some((g: any) => g.status === "accepted");
    const grnInProgress = hasGRN && !grnAccepted;

    stages.push({
      name: "GRN",
      nameAr: "إشعار الاستلام",
      status: grnAccepted ? "completed" : grnInProgress ? "in_progress" : (prevPoCompleted ? "not_started" : "locked"),
      docNumber: grnResults[0]?.grnNumber,
      docStatus: grnResults[0]?.status,
    });

    // ── Stage 5: 3-Way Match (Goods > 25K only) ─────────────────────
    if (aboveThreshold) {
      const prevGrnCompleted = stages[stages.length - 1].status === "completed";
      const invoiceResults = await db.select()
        .from(procurementInvoices)
        .where(eq(procurementInvoices.purchaseRequestId, prId));
      const hasInvoice = invoiceResults.length > 0;
      const invoiceMatched = invoiceResults.some((inv: any) => inv.matchingStatus === "matched");
      const invoiceInProgress = hasInvoice && !invoiceMatched;

      stages.push({
        name: "3-Way Match",
        nameAr: "المطابقة الثلاثية",
        status: invoiceMatched ? "completed" : invoiceInProgress ? "in_progress" : (prevGrnCompleted ? "not_started" : "locked"),
        docNumber: invoiceResults[0]?.invoiceNumber,
        docStatus: invoiceResults[0]?.matchingStatus,
      });
    }
  }

  // ── Payable Stage ──────────────────────────────────────────────────
  const prevPayableCompleted = stages[stages.length - 1].status === "completed";
  const payableResults = await db.select()
    .from(procurementPayables)
    .where(and(eq(procurementPayables.purchaseRequestId, prId), isNull(procurementPayables.deletedAt)));
  const hasPayable = payableResults.length > 0;
  const payableReady = payableResults.some((p: any) =>
    ["pending_payment", "partially_paid", "fully_paid"].includes(p.status)
  );
  const payableInProgress = hasPayable && !payableReady;

  stages.push({
    name: "Payable",
    nameAr: "المستحقات",
    status: payableReady ? "completed" : payableInProgress ? "in_progress" : (prevPayableCompleted ? "not_started" : "locked"),
    docNumber: payableResults[0]?.payableNumber || undefined,
    docStatus: payableResults[0]?.status,
  });

  // ── Payment Stage ──────────────────────────────────────────────────
  const prevPaymentReady = stages[stages.length - 1].status === "completed";

  // Check payments via payable IDs (works for all types including Works/Services)
  let hasPayment = false;
  let paymentDone = false;
  let paymentInProgress = false;
  let paymentDocNumber: string | undefined;
  let paymentDocStatus: string | undefined;

  if (payableResults.length > 0) {
    const payableIds = payableResults.map((p: any) => p.id);
    try {
      const paymentResults = await db.execute(
        sql`SELECT * FROM procurement_payments WHERE payable_id IN (${sql.join(payableIds.map((id: number) => sql`${id}`), sql`, `)}) AND deleted_at IS NULL`
      );
      const payments = paymentResults?.rows || paymentResults || [];
      if (Array.isArray(payments) && payments.length > 0) {
        hasPayment = true;
        paymentDone = payments.some((p: any) => p.status === "completed" || p.status === "approved");
        paymentInProgress = !paymentDone;
        paymentDocNumber = payments[0]?.payment_number || payments[0]?.paymentNumber;
        paymentDocStatus = payments[0]?.status;
      }
    } catch {
      // Fallback: check via PO if available
    }
  }

  // Fallback: also check via PO-linked payments (for Goods type)
  if (!hasPayment && isGoodsType) {
    const poResults = await db.select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.purchaseRequestId, prId), isNull(purchaseOrders.deletedAt)))
      .limit(1);
    const po = poResults[0];
    if (po) {
      const poPayments = await db.select()
        .from(procurementPayments)
        .where(and(eq(procurementPayments.purchaseOrderId, po.id), isNull(procurementPayments.deletedAt)));
      if (poPayments.length > 0) {
        hasPayment = true;
        paymentDone = poPayments.some((p: any) => p.status === "completed" || p.status === "approved");
        paymentInProgress = !paymentDone;
        paymentDocNumber = poPayments[0]?.paymentNumber;
        paymentDocStatus = poPayments[0]?.status;
      }
    }
  }

  stages.push({
    name: "Payment",
    nameAr: "الدفع",
    status: paymentDone ? "completed" : paymentInProgress ? "in_progress" : (prevPaymentReady ? "not_started" : "locked"),
    docNumber: paymentDocNumber,
    docStatus: paymentDocStatus,
  });

  // ── Closure Stage ──────────────────────────────────────────────────
  const allPaid = payableResults.length > 0 && payableResults.every((p: any) => p.status === "fully_paid");

  stages.push({
    name: "Closure",
    nameAr: "الإغلاق",
    status: allPaid ? "completed" : "locked",
  });

  return stages;
}
