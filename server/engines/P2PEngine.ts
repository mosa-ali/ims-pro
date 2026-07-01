/**
 * P2P (Procurement-to-Payment) Engine
 * Provides comprehensive procurement cycle analysis, pipeline tracking, and
 * payment workflow monitoring for procurement operations.
 */

import { getDb } from "../db";
import {
  purchaseRequests,
  purchaseOrders,
  procurementInvoices,
  goodsReceiptNotes,
  procurementPayables,
} from "../../drizzle/schema";
import { eq, and, sum, sql, count, gte, lte } from "drizzle-orm";

export interface P2PStageMetrics {
  stage: "PR" | "PO" | "GRN" | "Invoice" | "Payment";
  count: number;
  avgDaysInStage: number;
  totalValue: number;
  bottlenecks: string[];
}

export interface P2PPipelineAnalysis {
  totalPRs: number;
  totalPOs: number;
  totalGRNs: number;
  totalInvoices: number;
  totalPayables: number;
  stageMetrics: P2PStageMetrics[];
  cycleTimeAverage: number;
  paymentDelayAverage: number;
  compliance: number; // 0-100
}

export interface P2PBottleneck {
  stage: string;
  description: string;
  count: number;
  impact: "low" | "medium" | "high";
  recommendation: string;
}

export class P2PEngine {
  /**
   * Analyze complete P2P pipeline
   */
  async analyzePipeline(organizationId: number): Promise<P2PPipelineAnalysis> {
    const db = await getDb();

    // Get counts and metrics for each stage
    const prMetrics = await this.getPRMetrics(db, organizationId);
    const poMetrics = await this.getPOMetrics(db, organizationId);
    const grnMetrics = await this.getGRNMetrics(db, organizationId);
    const invoiceMetrics = await this.getInvoiceMetrics(db, organizationId);
    const paymentMetrics = await this.getPaymentMetrics(db, organizationId);

    const stageMetrics = [prMetrics, poMetrics, grnMetrics, invoiceMetrics, paymentMetrics];

    // Calculate cycle time
    const cycleTimeAverage = await this.calculateAverageCycleTime(db, organizationId);

    // Calculate payment delay
    const paymentDelayAverage = await this.calculateAveragePaymentDelay(db, organizationId);

    // Calculate compliance
    const compliance = this.calculateP2PCompliance(stageMetrics);

    return {
      totalPRs: prMetrics.count,
      totalPOs: poMetrics.count,
      totalGRNs: grnMetrics.count,
      totalInvoices: invoiceMetrics.count,
      totalPayables: paymentMetrics.count,
      stageMetrics,
      cycleTimeAverage,
      paymentDelayAverage,
      compliance,
    };
  }

  /**
   * Get PR stage metrics
   */
  private async getPRMetrics(db: any, organizationId: number): Promise<P2PStageMetrics> {
    const [prData] = await db
      .select({
        count: count(),
        totalValue: sum(purchaseRequests.prTotalUsd),
        avgDays: sql<number>`AVG(DATEDIFF(NOW(), createdAt))`,
      })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.organizationId, organizationId));

    const bottlenecks: string[] = [];
    if ((prData?.count || 0) > 50) {
      bottlenecks.push("High volume of pending PRs - consider expediting approval");
    }

    return {
      stage: "PR",
      count: prData?.count || 0,
      avgDaysInStage: Math.round(prData?.avgDays || 0),
      totalValue: prData?.totalValue ? parseFloat(prData.totalValue.toString()) : 0,
      bottlenecks,
    };
  }

  /**
   * Get PO stage metrics
   */
  private async getPOMetrics(db: any, organizationId: number): Promise<P2PStageMetrics> {
    const [poData] = await db
      .select({
        count: count(),
        totalValue: sum(purchaseOrders.totalAmount),
        avgDays: sql<number>`AVG(DATEDIFF(NOW(), poDate))`,
      })
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.organizationId, organizationId), sql`status != 'completed'`));

    const bottlenecks: string[] = [];
    if ((poData?.count || 0) > 100) {
      bottlenecks.push("High volume of open POs - review for completion");
    }

    return {
      stage: "PO",
      count: poData?.count || 0,
      avgDaysInStage: Math.round(poData?.avgDays || 0),
      totalValue: poData?.totalValue ? parseFloat(poData.totalValue.toString()) : 0,
      bottlenecks,
    };
  }

  /**
   * Get GRN stage metrics
   */
  private async getGRNMetrics(db: any, organizationId: number): Promise<P2PStageMetrics> {
    const [grnData] = await db
      .select({
        count: count(),
        totalValue: sql<number>`SUM(quantity * unitPrice)`,
        avgDays: sql<number>`AVG(DATEDIFF(NOW(), grnDate))`,
      })
      .from(goodsReceiptNotes)
      .where(eq(goodsReceiptNotes.organizationId, organizationId));

    const bottlenecks: string[] = [];
    if ((grnData?.count || 0) > 200) {
      bottlenecks.push("High volume of GRNs - ensure timely invoice matching");
    }

    return {
      stage: "GRN",
      count: grnData?.count || 0,
      avgDaysInStage: Math.round(grnData?.avgDays || 0),
      totalValue: grnData?.totalValue ? parseFloat(grnData.totalValue.toString()) : 0,
      bottlenecks,
    };
  }

  /**
   * Get Invoice stage metrics
   */
  private async getInvoiceMetrics(db: any, organizationId: number): Promise<P2PStageMetrics> {
    const [invoiceData] = await db
      .select({
        count: count(),
        totalValue: sum(procurementInvoices.invoiceAmount),
        avgDays: sql<number>`AVG(DATEDIFF(NOW(), invoiceDate))`,
      })
      .from(procurementInvoices)
      .where(
        and(eq(procurementInvoices.organizationId, organizationId), sql`status != 'paid'`)
      );

    const bottlenecks: string[] = [];
    if ((invoiceData?.count || 0) > 150) {
      bottlenecks.push("High volume of pending invoices - accelerate processing");
    }

    return {
      stage: "Invoice",
      count: invoiceData?.count || 0,
      avgDaysInStage: Math.round(invoiceData?.avgDays || 0),
      totalValue: invoiceData?.totalValue ? parseFloat(invoiceData.totalValue.toString()) : 0,
      bottlenecks,
    };
  }

  /**
   * Get Payment stage metrics
   */
  private async getPaymentMetrics(db: any, organizationId: number): Promise<P2PStageMetrics> {
    const [paymentData] = await db
      .select({
        count: count(),
        totalValue: sum(procurementPayables.totalAmount),
        avgDays: sql<number>`AVG(DATEDIFF(NOW(), payableDate))`,
      })
      .from(procurementPayables)
      .where(
        and(eq(procurementPayables.organizationId, organizationId), sql`status != 'fully_paid'`)
      );

    const bottlenecks: string[] = [];
    if ((paymentData?.count || 0) > 100) {
      bottlenecks.push("High volume of pending payments - review cash position");
    }

    return {
      stage: "Payment",
      count: paymentData?.count || 0,
      avgDaysInStage: Math.round(paymentData?.avgDays || 0),
      totalValue: paymentData?.totalValue ? parseFloat(paymentData.totalValue.toString()) : 0,
      bottlenecks,
    };
  }

  /**
   * Calculate average P2P cycle time
   */
  private async calculateAverageCycleTime(db: any, organizationId: number): Promise<number> {
    // Simplified calculation - from PR creation to final payment
    const [cycleData] = await db
      .select({
        avgCycle: sql<number>`AVG(DATEDIFF(NOW(), createdAt))`,
      })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.organizationId, organizationId));

    return Math.round(cycleData?.avgCycle || 0);
  }

  /**
   * Calculate average payment delay
   */
  private async calculateAveragePaymentDelay(db: any, organizationId: number): Promise<number> {
    const [delayData] = await db
      .select({
        avgDelay: sql<number>`AVG(DATEDIFF(NOW(), dueDate))`,
      })
      .from(procurementPayables)
      .where(
        and(eq(procurementPayables.organizationId, organizationId), sql`dueDate < NOW()`)
      );

    return Math.max(0, Math.round(delayData?.avgDelay || 0));
  }

  /**
   * Calculate P2P compliance score
   */
  private calculateP2PCompliance(stageMetrics: P2PStageMetrics[]): number {
    // Compliance based on bottleneck severity
    let complianceScore = 100;

    stageMetrics.forEach((stage) => {
      stage.bottlenecks.forEach(() => {
        complianceScore -= 10;
      });
    });

    return Math.max(0, complianceScore);
  }

  /**
   * Identify P2P bottlenecks
   */
  async identifyBottlenecks(organizationId: number): Promise<P2PBottleneck[]> {
    const db = await getDb();
    const bottlenecks: P2PBottleneck[] = [];

    // Check PR backlog
    const [prBacklog] = await db
      .select({ count: count() })
      .from(purchaseRequests)
      .where(
        and(eq(purchaseRequests.organizationId, organizationId), sql`createdAt < DATE_SUB(NOW(), INTERVAL 7 DAY)`)
      );

    if ((prBacklog?.count || 0) > 20) {
      bottlenecks.push({
        stage: "Purchase Request",
        description: `${prBacklog?.count || 0} PRs pending for more than 7 days`,
        count: prBacklog?.count || 0,
        impact: "high",
        recommendation: "Expedite PR approval process and allocate additional resources",
      });
    }

    // Check invoice matching issues
    const [unmatchedInvoices] = await db
      .select({ count: count() })
      .from(procurementInvoices)
      .where(
        and(
          eq(procurementInvoices.organizationId, organizationId),
          sql`matchingStatus = 'pending'`,
          sql`invoiceDate < DATE_SUB(NOW(), INTERVAL 5 DAY)`
        )
      );

    if ((unmatchedInvoices?.count || 0) > 10) {
      bottlenecks.push({
        stage: "Invoice Matching",
        description: `${unmatchedInvoices?.count || 0} invoices unmatched for more than 5 days`,
        count: unmatchedInvoices?.count || 0,
        impact: "high",
        recommendation: "Review and resolve invoice matching discrepancies",
      });
    }

    // Check overdue payments
    const [overduePayments] = await db
      .select({ count: count() })
      .from(procurementPayables)
      .where(
        and(
          eq(procurementPayables.organizationId, organizationId),
          sql`dueDate < NOW()`,
          sql`status != 'fully_paid'`
        )
      );

    if ((overduePayments?.count || 0) > 5) {
      bottlenecks.push({
        stage: "Payment",
        description: `${overduePayments?.count || 0} payments overdue`,
        count: overduePayments?.count || 0,
        impact: "high",
        recommendation: "Prioritize overdue payments to maintain vendor relationships",
      });
    }

    return bottlenecks;
  }

  /**
   * Get P2P metrics by vendor
   */
  async getVendorMetrics(organizationId: number, limit: number = 10): Promise<Array<{
    vendorId: number;
    vendorName: string;
    totalOrders: number;
    totalValue: number;
    avgPaymentDays: number;
    onTimePaymentRate: number;
  }>> {
    const db = await getDb();

    const vendors = await db
      .select({
        vendorId: procurementPayables.vendorId,
        totalOrders: count(),
        totalValue: sum(procurementPayables.totalAmount),
        avgPaymentDays: sql<number>`AVG(DATEDIFF(paidAt, dueDate))`,
      })
      .from(procurementPayables)
      .where(eq(procurementPayables.organizationId, organizationId))
      .groupBy(procurementPayables.vendorId)
      .orderBy(sql`totalValue DESC`)
      .limit(limit);

    return vendors.map((v: any) => ({
      vendorId: v.vendorId,
      vendorName: `Vendor ${v.vendorId}`,
      totalOrders: v.totalOrders,
      totalValue: v.totalValue ? parseFloat(v.totalValue.toString()) : 0,
      avgPaymentDays: Math.round(v.avgPaymentDays || 0),
      onTimePaymentRate: 85, // Placeholder - would calculate from actual data
    }));
  }
}

export const p2pEngine = new P2PEngine();
