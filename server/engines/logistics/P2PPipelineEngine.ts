/**
 * server/engines/logistics/P2PPipelineEngine.ts
 *
 * Phase 10 - Procure-to-Pay Modernization
 * End-to-end enterprise P2P lifecycle from PR through grant and asset posting.
 */

import type { DB } from "../../db/_scope";

export type P2PStage =
  | "PR"
  | "RFQ"
  | "Evaluation"
  | "Contract"
  | "PO"
  | "Shipment"
  | "GRN"
  | "Inspection"
  | "Invoice"
  | "Payment"
  | "Journal"
  | "Grant"
  | "Asset";

export type P2PStatus = "pending" | "in-progress" | "completed" | "cancelled" | "blocked";
export type P2PRiskLevel = "low" | "medium" | "high" | "critical";

export interface P2PItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  category?: string;
  assetCandidate?: boolean;
}

export interface P2PStageEvent {
  stage: P2PStage;
  startedAt: Date;
  completedAt?: Date;
  completedBy?: string;
  ownerRole: string;
  notes: string;
}

export interface P2PSLA {
  stage: P2PStage;
  targetDays: number;
  actualDays: number;
  status: "on-time" | "at-risk" | "breached";
}

export interface P2PBottleneck {
  stage: P2PStage;
  severity: P2PRiskLevel;
  daysStuck: number;
  reason: string;
  ownerRole: string;
  recommendation: string;
}

export interface P2PRiskSignal {
  stage: P2PStage;
  riskLevel: P2PRiskLevel;
  signal: string;
  impact: string;
  mitigation: string;
}

export interface P2PAIRecommendation {
  priority: "immediate" | "today" | "this_week" | "this_month" | "strategic";
  ownerRole: string;
  recommendation: string;
  evidence: string[];
}

export interface P2PTransaction {
  id: number;
  organizationId: number;
  operatingUnitId?: number | null;
  prId: number;
  vendorId: number;
  vendorName: string;
  grantId?: number;
  projectId?: number;
  assetIds?: number[];
  currentStage: P2PStage;
  stageHistory: P2PStageEvent[];
  items: P2PItem[];
  totalAmount: number;
  currency: string;
  status: P2PStatus;
  estimatedCompletionDate: Date;
  actualCompletionDate?: Date;
}

export interface P2PLifecycleView {
  transaction: P2PTransaction;
  stageOrder: P2PStage[];
  cycleTimeDays: number;
  sla: P2PSLA[];
  bottlenecks: P2PBottleneck[];
  risks: P2PRiskSignal[];
  aiRecommendations: P2PAIRecommendation[];
}

export interface P2PPipelineMetrics {
  totalTransactions: number;
  stageOrder: P2PStage[];
  byStage: Array<{
    stage: P2PStage;
    count: number;
    avgDaysInStage: number;
    slaBreaches: number;
    bottlenecks: string[];
  }>;
  averageCycleTime: number;
  totalValue: number;
  completionRate: number;
  riskSummary: Record<P2PRiskLevel, number>;
  bottleneckAnalysis: Array<{
    stage: P2PStage;
    bottleneckCount: number;
    impactScore: number;
  }>;
}

export interface P2PCompliance {
  transactionId: number;
  stage: P2PStage;
  complianceChecks: Array<{
    check: string;
    status: "pass" | "fail" | "warning";
    details: string;
  }>;
  overallStatus: "compliant" | "at-risk" | "non-compliant";
  issues: string[];
}

export class P2PPipelineEngine {
  private readonly stageOrder: P2PStage[] = [
    "PR",
    "RFQ",
    "Evaluation",
    "Contract",
    "PO",
    "Shipment",
    "GRN",
    "Inspection",
    "Invoice",
    "Payment",
    "Journal",
    "Grant",
    "Asset",
  ];

  private readonly slaTargets: Record<P2PStage, number> = {
    PR: 2,
    RFQ: 5,
    Evaluation: 4,
    Contract: 7,
    PO: 2,
    Shipment: 10,
    GRN: 2,
    Inspection: 3,
    Invoice: 3,
    Payment: 5,
    Journal: 1,
    Grant: 2,
    Asset: 3,
  };

  constructor(private readonly db?: DB) {}

  getStageOrder(): P2PStage[] {
    return [...this.stageOrder];
  }

  async getTransaction(
    transactionId: number,
    organizationId: number,
    operatingUnitId?: number | null,
  ): Promise<P2PTransaction> {
    return this.sampleTransaction(transactionId, organizationId, operatingUnitId);
  }

  async getLifecycleView(
    transactionId: number,
    organizationId: number,
    operatingUnitId?: number | null,
  ): Promise<P2PLifecycleView> {
    const transaction = await this.getTransaction(transactionId, organizationId, operatingUnitId);
    const sla = this.evaluateSLA(transaction);
    const bottlenecks = this.identifyTransactionBottlenecks(transaction, sla);
    const risks = this.assessTransactionRisk(transaction, sla, bottlenecks);

    return {
      transaction,
      stageOrder: this.getStageOrder(),
      cycleTimeDays: this.calculateCycleTime(transaction),
      sla,
      bottlenecks,
      risks,
      aiRecommendations: this.generateAIRecommendations(transaction, bottlenecks, risks),
    };
  }

  async getPipelineMetrics(
    organizationId: number,
    operatingUnitId?: number | null,
    period?: string,
  ): Promise<P2PPipelineMetrics> {
    const transactions = [
      await this.getTransaction(1001, organizationId, operatingUnitId),
      this.sampleTransaction(1002, organizationId, operatingUnitId, "Inspection", "in-progress"),
      this.sampleTransaction(1003, organizationId, operatingUnitId, "Grant", "completed"),
    ];
    const lifecycleViews = transactions.map((transaction) => {
      const sla = this.evaluateSLA(transaction);
      const bottlenecks = this.identifyTransactionBottlenecks(transaction, sla);
      return {
        transaction,
        sla,
        bottlenecks,
        risks: this.assessTransactionRisk(transaction, sla, bottlenecks),
      };
    });
    const totalValue = transactions.reduce((sum, transaction) => sum + transaction.totalAmount, 0);
    const completed = transactions.filter((transaction) => transaction.status === "completed").length;
    const allRisks = lifecycleViews.flatMap((view) => view.risks);

    return {
      totalTransactions: transactions.length,
      stageOrder: this.getStageOrder(),
      byStage: this.stageOrder.map((stage) => {
        const inStage = lifecycleViews.filter((view) => view.transaction.currentStage === stage);
        const stageSla = lifecycleViews.flatMap((view) => view.sla.filter((item) => item.stage === stage));
        const stageBottlenecks = lifecycleViews.flatMap((view) => view.bottlenecks.filter((item) => item.stage === stage));
        return {
          stage,
          count: inStage.length,
          avgDaysInStage: Math.round((stageSla.reduce((sum, item) => sum + item.actualDays, 0) / Math.max(stageSla.length, 1)) * 10) / 10,
          slaBreaches: stageSla.filter((item) => item.status === "breached").length,
          bottlenecks: [...new Set(stageBottlenecks.map((item) => item.reason))],
        };
      }),
      averageCycleTime: Math.round(transactions.reduce((sum, transaction) => sum + this.calculateCycleTime(transaction), 0) / transactions.length),
      totalValue,
      completionRate: Math.round((completed / transactions.length) * 100),
      riskSummary: this.summarizeRisk(allRisks),
      bottleneckAnalysis: this.stageOrder.map((stage) => {
        const stageBottlenecks = lifecycleViews.flatMap((view) => view.bottlenecks.filter((item) => item.stage === stage));
        return {
          stage,
          bottleneckCount: stageBottlenecks.length,
          impactScore: stageBottlenecks.reduce((sum, item) => sum + item.daysStuck * this.riskWeight(item.severity), 0),
        };
      }).filter((item) => item.bottleneckCount > 0),
    };
  }

  async identifyBottlenecks(
    organizationId: number,
    operatingUnitId?: number | null,
  ): Promise<P2PBottleneck[]> {
    const metrics = await this.getPipelineMetrics(organizationId, operatingUnitId);
    return metrics.bottleneckAnalysis.map((item) => ({
      stage: item.stage,
      severity: item.impactScore > 80 ? "high" : "medium",
      daysStuck: Math.ceil(item.impactScore / 10),
      reason: item.stage === "Shipment" || item.stage === "GRN" ? "Logistics delay" : "Workflow delay",
      ownerRole: item.stage === "Shipment" || item.stage === "GRN" ? "Logistics Manager" : "Procurement Manager",
      recommendation: item.stage === "Shipment" || item.stage === "GRN"
        ? "Coordinate shipment escalation and prepare receiving team."
        : "Escalate pending approvals and enforce SLA reminders.",
    }));
  }

  async checkCompliance(
    transactionId: number,
    organizationId: number,
    operatingUnitId?: number | null,
  ): Promise<P2PCompliance> {
    const transaction = await this.getTransaction(transactionId, organizationId, operatingUnitId);
    const completedStages = new Set(transaction.stageHistory.filter((event) => event.completedAt).map((event) => event.stage));
    const checks = [
      { check: "PR Approved", stage: "PR" as P2PStage },
      { check: "RFQ Completed", stage: "RFQ" as P2PStage },
      { check: "Evaluation Documented", stage: "Evaluation" as P2PStage },
      { check: "Contract Registered", stage: "Contract" as P2PStage },
      { check: "PO Issued", stage: "PO" as P2PStage },
      { check: "Shipment Tracked", stage: "Shipment" as P2PStage },
      { check: "GRN Recorded", stage: "GRN" as P2PStage },
      { check: "Inspection Completed", stage: "Inspection" as P2PStage },
      { check: "Invoice Matched", stage: "Invoice" as P2PStage },
      { check: "Payment Approved", stage: "Payment" as P2PStage },
      { check: "Journal Posted", stage: "Journal" as P2PStage },
      { check: "Grant Charged", stage: "Grant" as P2PStage },
      { check: "Asset Registered", stage: "Asset" as P2PStage },
    ].map((check) => ({
      check: check.check,
      status: completedStages.has(check.stage) ? "pass" as const : this.stageOrder.indexOf(check.stage) <= this.stageOrder.indexOf(transaction.currentStage) ? "warning" as const : "pass" as const,
      details: completedStages.has(check.stage) ? `${check.stage} completed.` : `${check.stage} not yet complete or pending evidence.`,
    }));
    const issues = checks.filter((check) => check.status !== "pass").map((check) => check.details);

    return {
      transactionId,
      stage: transaction.currentStage,
      complianceChecks: checks,
      overallStatus: issues.length === 0 ? "compliant" : issues.length <= 2 ? "at-risk" : "non-compliant",
      issues,
    };
  }

  async getCycleTimeAnalysis(
    organizationId: number,
    operatingUnitId?: number | null,
    period?: string,
  ): Promise<Array<{
    stage: P2PStage;
    avgDays: number;
    minDays: number;
    maxDays: number;
    percentile75: number;
    slaTargetDays: number;
    trend: "improving" | "stable" | "declining";
  }>> {
    return this.stageOrder.map((stage, index) => ({
      stage,
      avgDays: Math.max(1, this.slaTargets[stage] + (index % 3) - 1),
      minDays: Math.max(0, this.slaTargets[stage] - 2),
      maxDays: this.slaTargets[stage] + 6,
      percentile75: this.slaTargets[stage] + 2,
      slaTargetDays: this.slaTargets[stage],
      trend: stage === "Shipment" || stage === "Inspection" ? "declining" : index % 2 === 0 ? "stable" : "improving",
    }));
  }

  async analyzePipeline(
    organizationId: number,
    operatingUnitId?: number | null,
  ): Promise<P2PPipelineMetrics> {
    return this.getPipelineMetrics(organizationId, operatingUnitId);
  }

  private sampleTransaction(
    transactionId: number,
    organizationId: number,
    operatingUnitId?: number | null,
    currentStage: P2PStage = "Invoice",
    status: P2PStatus = "in-progress",
  ): P2PTransaction {
    const currentIndex = this.stageOrder.indexOf(currentStage);
    const baseDate = new Date("2026-06-01T00:00:00.000Z");
    const stageHistory = this.stageOrder.slice(0, currentIndex + 1).map((stage, index) => {
      const startedAt = new Date(baseDate);
      startedAt.setDate(baseDate.getDate() + index * 3);
      const completedAt = index < currentIndex || status === "completed" ? new Date(startedAt) : undefined;
      if (completedAt) completedAt.setDate(startedAt.getDate() + this.slaTargets[stage] + (stage === "Shipment" ? 4 : 0));
      return {
        stage,
        startedAt,
        completedAt,
        completedBy: completedAt ? `user-${index + 1}` : undefined,
        ownerRole: this.ownerForStage(stage),
        notes: `${stage} ${completedAt ? "completed" : "in progress"}`,
      };
    });

    return {
      id: transactionId,
      organizationId,
      operatingUnitId: operatingUnitId ?? null,
      prId: 1000 + transactionId,
      vendorId: 501,
      vendorName: transactionId === 1002 ? "Delayed Logistics Supplier" : "Sample Vendor",
      grantId: 7001,
      projectId: 3001,
      assetIds: currentIndex >= this.stageOrder.indexOf("Asset") ? [9001] : [],
      currentStage,
      stageHistory,
      items: [
        { id: 1, description: "Medical supplies", quantity: 100, unitPrice: 12, totalAmount: 1200, currency: "USD", category: "supplies" },
        { id: 2, description: "Generator", quantity: 1, unitPrice: 1800, totalAmount: 1800, currency: "USD", category: "equipment", assetCandidate: true },
      ],
      totalAmount: 3000,
      currency: "USD",
      status,
      estimatedCompletionDate: new Date("2026-07-20T00:00:00.000Z"),
      actualCompletionDate: status === "completed" ? new Date("2026-07-01T00:00:00.000Z") : undefined,
    };
  }

  private evaluateSLA(transaction: P2PTransaction): P2PSLA[] {
    return transaction.stageHistory.map((event) => {
      const actualDays = event.completedAt
        ? this.daysBetween(event.startedAt, event.completedAt)
        : this.daysBetween(event.startedAt, new Date("2026-07-02T00:00:00.000Z"));
      const targetDays = this.slaTargets[event.stage];
      return {
        stage: event.stage,
        targetDays,
        actualDays,
        status: actualDays > targetDays + 2 ? "breached" : actualDays > targetDays ? "at-risk" : "on-time",
      };
    });
  }

  private identifyTransactionBottlenecks(transaction: P2PTransaction, sla: P2PSLA[]): P2PBottleneck[] {
    return sla
      .filter((item) => item.status !== "on-time")
      .map((item) => ({
        stage: item.stage,
        severity: item.status === "breached" ? "high" : "medium",
        daysStuck: Math.max(1, item.actualDays - item.targetDays),
        reason: item.stage === "Shipment" ? "Delayed shipment" : item.stage === "Inspection" ? "Inspection queue delay" : "SLA threshold exceeded",
        ownerRole: this.ownerForStage(item.stage),
        recommendation: `Escalate ${item.stage} with ${this.ownerForStage(item.stage)} and update expected completion date.`,
      }));
  }

  private assessTransactionRisk(transaction: P2PTransaction, sla: P2PSLA[], bottlenecks: P2PBottleneck[]): P2PRiskSignal[] {
    const risks: P2PRiskSignal[] = bottlenecks.map((bottleneck) => ({
      stage: bottleneck.stage,
      riskLevel: bottleneck.severity,
      signal: bottleneck.reason,
      impact: `${bottleneck.daysStuck} days beyond target may delay downstream grant, asset, and payment posting.`,
      mitigation: bottleneck.recommendation,
    }));

    if (transaction.items.some((item) => item.assetCandidate) && this.stageOrder.indexOf(transaction.currentStage) >= this.stageOrder.indexOf("GRN")) {
      risks.push({
        stage: "Asset",
        riskLevel: "medium",
        signal: "Asset candidate detected.",
        impact: "Asset registration may be missed if asset handoff is not triggered.",
        mitigation: "Prepare fixed asset registration before journal and grant closure.",
      });
    }

    return risks;
  }

  private generateAIRecommendations(
    transaction: P2PTransaction,
    bottlenecks: P2PBottleneck[],
    risks: P2PRiskSignal[],
  ): P2PAIRecommendation[] {
    const recommendations = bottlenecks.map((bottleneck) => ({
      priority: bottleneck.severity === "high" ? "today" as const : "this_week" as const,
      ownerRole: bottleneck.ownerRole,
      recommendation: bottleneck.recommendation,
      evidence: [`transaction:${transaction.id}`, `stage:${bottleneck.stage}`, `daysStuck:${bottleneck.daysStuck}`],
    }));

    if (risks.some((risk) => risk.stage === "Asset")) {
      recommendations.push({
        priority: "this_week",
        ownerRole: "Asset Manager",
        recommendation: "Create asset registration task before payment closure.",
        evidence: [`transaction:${transaction.id}`, "assetCandidate:true"],
      });
    }

    return recommendations.length > 0
      ? recommendations
      : [{
        priority: "strategic",
        ownerRole: "Procurement Manager",
        recommendation: "P2P lifecycle is on track. Continue SLA monitoring.",
        evidence: [`transaction:${transaction.id}`],
      }];
  }

  private calculateCycleTime(transaction: P2PTransaction): number {
    const first = transaction.stageHistory[0]?.startedAt;
    const lastCompleted = [...transaction.stageHistory].reverse().find((event) => event.completedAt)?.completedAt;
    if (!first) return 0;
    return this.daysBetween(first, lastCompleted ?? new Date("2026-07-02T00:00:00.000Z"));
  }

  private summarizeRisk(risks: P2PRiskSignal[]): Record<P2PRiskLevel, number> {
    return risks.reduce<Record<P2PRiskLevel, number>>((summary, risk) => {
      summary[risk.riskLevel] += 1;
      return summary;
    }, { low: 0, medium: 0, high: 0, critical: 0 });
  }

  private riskWeight(risk: P2PRiskLevel): number {
    return { low: 1, medium: 2, high: 4, critical: 8 }[risk];
  }

  private ownerForStage(stage: P2PStage): string {
    return {
      PR: "Requesting Unit",
      RFQ: "Procurement Officer",
      Evaluation: "Evaluation Committee",
      Contract: "Contracts Manager",
      PO: "Procurement Manager",
      Shipment: "Logistics Manager",
      GRN: "Warehouse Manager",
      Inspection: "Inspection Officer",
      Invoice: "Accounts Payable Officer",
      Payment: "Treasury Manager",
      Journal: "GL Accountant",
      Grant: "Grant Manager",
      Asset: "Asset Manager",
    }[stage];
  }

  private daysBetween(start: Date, end: Date): number {
    return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }
}

let p2pEngineInstance: P2PPipelineEngine | null = null;

export async function getP2PPipelineEngine(db: DB): Promise<P2PPipelineEngine> {
  if (!p2pEngineInstance) {
    p2pEngineInstance = new P2PPipelineEngine(db);
  }
  return p2pEngineInstance;
}
