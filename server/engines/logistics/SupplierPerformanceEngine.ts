import type { DB } from "../../db/_scope";

export type SupplierRiskLevel = "low" | "medium" | "high" | "critical";

export interface SupplierPerformanceRecord {
  supplierId: number;
  supplierName: string;
  organizationId: number;
  operatingUnitId?: number | null;
  totalPOs: number;
  totalSpend: number;
  onTimeDeliveryRate: number;
  qualityAcceptanceRate: number;
  invoiceAccuracyRate: number;
  averageResponseDays: number;
  contractComplianceRate: number;
  riskLevel: SupplierRiskLevel;
  score: number;
  recommendations: string[];
}

export interface SupplierScorecard {
  supplierId: number;
  supplierName: string;
  score: number;
  riskLevel: SupplierRiskLevel;
  metrics: Array<{
    name: string;
    score: number;
    status: "excellent" | "good" | "warning" | "poor";
    details: string;
  }>;
  aiRecommendations: Array<{
    priority: "today" | "this_week" | "this_month" | "strategic";
    ownerRole: string;
    recommendation: string;
  }>;
}

export class SupplierPerformanceEngine {
  constructor(private readonly db?: DB) {}

  async getSupplierPerformance(
    supplierId: number,
    organizationId: number,
    operatingUnitId?: number | null,
  ): Promise<SupplierPerformanceRecord> {
    const sample = this.sampleSupplier(supplierId, organizationId, operatingUnitId);
    return {
      ...sample,
      score: this.calculateScore(sample),
      riskLevel: this.riskLevel(this.calculateScore(sample)),
      recommendations: this.recommendations(sample),
    };
  }

  async buildSupplierScorecard(
    supplierId: number,
    organizationId: number,
    operatingUnitId?: number | null,
  ): Promise<SupplierScorecard> {
    const performance = await this.getSupplierPerformance(supplierId, organizationId, operatingUnitId);
    const metrics = [
      this.metric("On-time delivery", performance.onTimeDeliveryRate, `${performance.onTimeDeliveryRate}% of deliveries met delivery SLA.`),
      this.metric("Quality acceptance", performance.qualityAcceptanceRate, `${performance.qualityAcceptanceRate}% of inspected items accepted.`),
      this.metric("Invoice accuracy", performance.invoiceAccuracyRate, `${performance.invoiceAccuracyRate}% of invoices matched PO/GRN without correction.`),
      this.metric("RFQ response", Math.max(0, 100 - performance.averageResponseDays * 10), `${performance.averageResponseDays} average response days.`),
      this.metric("Contract compliance", performance.contractComplianceRate, `${performance.contractComplianceRate}% contract compliance.`),
    ];

    return {
      supplierId: performance.supplierId,
      supplierName: performance.supplierName,
      score: performance.score,
      riskLevel: performance.riskLevel,
      metrics,
      aiRecommendations: performance.recommendations.map((recommendation) => ({
        priority: performance.riskLevel === "high" || performance.riskLevel === "critical" ? "today" : "this_week",
        ownerRole: "Procurement Manager",
        recommendation,
      })),
    };
  }

  async rankSuppliers(
    organizationId: number,
    operatingUnitId?: number | null,
  ): Promise<SupplierPerformanceRecord[]> {
    const suppliers = await Promise.all([501, 502, 503].map((supplierId) =>
      this.getSupplierPerformance(supplierId, organizationId, operatingUnitId),
    ));
    return suppliers.sort((a, b) => b.score - a.score);
  }

  private sampleSupplier(
    supplierId: number,
    organizationId: number,
    operatingUnitId?: number | null,
  ): Omit<SupplierPerformanceRecord, "score" | "riskLevel" | "recommendations"> {
    if (supplierId === 502) {
      return {
        supplierId,
        supplierName: "Delayed Logistics Supplier",
        organizationId,
        operatingUnitId: operatingUnitId ?? null,
        totalPOs: 28,
        totalSpend: 150000,
        onTimeDeliveryRate: 68,
        qualityAcceptanceRate: 86,
        invoiceAccuracyRate: 92,
        averageResponseDays: 6,
        contractComplianceRate: 78,
      };
    }

    return {
      supplierId,
      supplierName: supplierId === 503 ? "Medical Supply Co" : "Sample Vendor",
      organizationId,
      operatingUnitId: operatingUnitId ?? null,
      totalPOs: 35,
      totalSpend: supplierId === 503 ? 130000 : 170000,
      onTimeDeliveryRate: supplierId === 503 ? 88 : 94,
      qualityAcceptanceRate: supplierId === 503 ? 91 : 97,
      invoiceAccuracyRate: supplierId === 503 ? 95 : 98,
      averageResponseDays: supplierId === 503 ? 3 : 2,
      contractComplianceRate: supplierId === 503 ? 90 : 96,
    };
  }

  private calculateScore(input: Omit<SupplierPerformanceRecord, "score" | "riskLevel" | "recommendations">): number {
    const responseScore = Math.max(0, 100 - input.averageResponseDays * 10);
    return Math.round(
      input.onTimeDeliveryRate * 0.3 +
      input.qualityAcceptanceRate * 0.25 +
      input.invoiceAccuracyRate * 0.2 +
      responseScore * 0.1 +
      input.contractComplianceRate * 0.15,
    );
  }

  private riskLevel(score: number): SupplierRiskLevel {
    if (score < 55) return "critical";
    if (score < 70) return "high";
    if (score < 85) return "medium";
    return "low";
  }

  private recommendations(input: Omit<SupplierPerformanceRecord, "score" | "riskLevel" | "recommendations">): string[] {
    const recommendations: string[] = [];
    if (input.onTimeDeliveryRate < 80) recommendations.push("Escalate delivery SLA with supplier and require recovery plan.");
    if (input.qualityAcceptanceRate < 90) recommendations.push("Increase inspection frequency until quality improves.");
    if (input.invoiceAccuracyRate < 95) recommendations.push("Review invoice matching errors with accounts payable.");
    if (input.averageResponseDays > 5) recommendations.push("Set RFQ response deadlines or consider alternate supplier.");
    if (input.contractComplianceRate < 85) recommendations.push("Review contract terms and document non-compliance.");
    return recommendations.length > 0 ? recommendations : ["Supplier performance is healthy. Continue standard monitoring."];
  }

  private metric(name: string, score: number, details: string): SupplierScorecard["metrics"][number] {
    return {
      name,
      score,
      status: score >= 90 ? "excellent" : score >= 80 ? "good" : score >= 70 ? "warning" : "poor",
      details,
    };
  }
}
