/**
 * Supplier360Engine.ts + ProcurementRiskEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Supplier 360° Profile (#2 ★★★★★) + Procurement Risk Engine (#3)
 *
 * #2 — Complete authoritative supplier record
 * #3 — Procurement-specific risk indicators
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ════════════════════════════════════════════════════════════════════════════
// #2  SUPPLIER 360° PROFILE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Extends existing SupplierPerformanceEngine with full 360° view.
 * The existing scoring logic remains untouched.
 * This engine AGGREGATES data from multiple sources.
 */

export interface Supplier360Profile {
  supplierId: number;
  supplierName: string;
  supplierNameAR?: string;

  // Performance (from existing SupplierPerformanceEngine)
  performanceScore: number;
  performanceGrade: string;
  performanceHistory: Array<{ period: string; score: number }>;

  // Commercial relationship
  contracts: ContractSummary[];
  purchaseOrders: POSummary[];
  rfqParticipation: RFQSummary[];
  totalBusinessVolume: number;
  totalBusinessVolumeCurrency: string;
  yearsAsSupplier: number;

  // Delivery & quality
  deliveryHistory: DeliveryRecord[];
  onTimeDeliveryPercent: number;
  qualityInspections: InspectionRecord[];
  qualityPassRate: number;
  returnRate: number;

  // Financial
  invoices: InvoiceSummary[];
  averagePaymentDays: number;
  outstandingAmount: number;
  disputes: DisputeRecord[];

  // Compliance
  auditFindings: AuditFinding[];
  sanctionsStatus: 'clear' | 'flagged' | 'sanctioned';
  esgScore?: number;
  certifications: Certification[];
  donorRestrictions: string[];

  // Banking
  bankAccounts: BankAccountSummary[];

  // Risk indicators
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskIndicators: RiskIndicator[];

  // Metadata
  lastUpdated: string;
  organizationId: number;
}

export interface ContractSummary { contractId: number; contractNumber: string; title: string; value: number; currency: string; startDate: string; endDate: string; status: string; }
export interface POSummary { poId: number; poNumber: string; value: number; currency: string; date: string; status: string; }
export interface RFQSummary { rfqId: number; rfqNumber: string; participatedDate: string; awarded: boolean; }
export interface DeliveryRecord { poId: number; expectedDate: string; actualDate: string; daysVariance: number; status: 'on_time' | 'late' | 'early'; }
export interface InspectionRecord { inspectionId: number; date: string; result: 'passed' | 'failed' | 'conditional'; defectsFound: number; }
export interface InvoiceSummary { invoiceId: number; invoiceNumber: string; amount: number; currency: string; status: string; paymentDate?: string; }
export interface DisputeRecord { disputeId: string; type: string; amount: number; status: 'open' | 'resolved' | 'escalated'; date: string; }
export interface AuditFinding { findingId: string; severity: 'low' | 'medium' | 'high' | 'critical'; description: string; date: string; status: string; }
export interface Certification { certId: string; type: string; issuer: string; validFrom: string; validTo: string; isExpired: boolean; }
export interface BankAccountSummary { bankName: string; accountNumber: string; currency: string; isVerified: boolean; }
export interface RiskIndicator { id: string; name: string; level: 'low' | 'medium' | 'high' | 'critical'; description: string; metric?: number; }

export interface ISupplier360Repository {
  getSupplierBasic(supplierId: number, scope: RepositoryScope): Promise<{ supplierName: string; supplierNameAR?: string; registeredDate: string } | null>;
  getContracts(supplierId: number, scope: RepositoryScope): Promise<ContractSummary[]>;
  getPurchaseOrders(supplierId: number, scope: RepositoryScope): Promise<POSummary[]>;
  getRFQParticipation(supplierId: number, scope: RepositoryScope): Promise<RFQSummary[]>;
  getDeliveryHistory(supplierId: number, scope: RepositoryScope): Promise<DeliveryRecord[]>;
  getInspections(supplierId: number, scope: RepositoryScope): Promise<InspectionRecord[]>;
  getInvoices(supplierId: number, scope: RepositoryScope): Promise<InvoiceSummary[]>;
  getDisputes(supplierId: number, scope: RepositoryScope): Promise<DisputeRecord[]>;
  getAuditFindings(supplierId: number, scope: RepositoryScope): Promise<AuditFinding[]>;
  getSanctionsStatus(supplierId: number): Promise<'clear' | 'flagged' | 'sanctioned'>;
  getCertifications(supplierId: number, scope: RepositoryScope): Promise<Certification[]>;
  getDonorRestrictions(supplierId: number, scope: RepositoryScope): Promise<string[]>;
  getBankAccounts(supplierId: number, scope: RepositoryScope): Promise<BankAccountSummary[]>;
  getPerformanceScore(supplierId: number, scope: RepositoryScope): Promise<{ score: number; grade: string; history: Array<{ period: string; score: number }> }>;
}

export class Supplier360Engine {
  private repo: ISupplier360Repository;
  private logger: ILogger;

  constructor(repo: ISupplier360Repository, logger: ILogger) {
    this.repo = repo;
    this.logger = logger.child({ service: 'Supplier360Engine' });
  }

  async getProfile(supplierId: number, scope: RepositoryScope): Promise<Supplier360Profile> {
    const basic = await this.repo.getSupplierBasic(supplierId, scope);
    if (!basic) throw new Error(`Supplier ${supplierId} not found`);

    const [contracts, pos, rfqs, deliveries, inspections, invoices, disputes, audits, sanctions, certs, donorRestrictions, banks, performance] = await Promise.all([
      this.repo.getContracts(supplierId, scope),
      this.repo.getPurchaseOrders(supplierId, scope),
      this.repo.getRFQParticipation(supplierId, scope),
      this.repo.getDeliveryHistory(supplierId, scope),
      this.repo.getInspections(supplierId, scope),
      this.repo.getInvoices(supplierId, scope),
      this.repo.getDisputes(supplierId, scope),
      this.repo.getAuditFindings(supplierId, scope),
      this.repo.getSanctionsStatus(supplierId),
      this.repo.getCertifications(supplierId, scope),
      this.repo.getDonorRestrictions(supplierId, scope),
      this.repo.getBankAccounts(supplierId, scope),
      this.repo.getPerformanceScore(supplierId, scope),
    ]);

    const onTimeDeliveries = deliveries.filter(d => d.status === 'on_time').length;
    const onTimePercent = deliveries.length > 0 ? Math.round((onTimeDeliveries / deliveries.length) * 100) : 100;
    const passedInspections = inspections.filter(i => i.result === 'passed').length;
    const qualityPassRate = inspections.length > 0 ? Math.round((passedInspections / inspections.length) * 100) : 100;
    const totalVolume = pos.reduce((s, p) => s + p.value, 0);
    const yearsAsSupplier = Math.max(1, Math.floor((Date.now() - new Date(basic.registeredDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)));

    const paidInvoices = invoices.filter(i => i.paymentDate);
    const avgPaymentDays = paidInvoices.length > 0
      ? Math.round(paidInvoices.reduce((s, i) => s + Math.max(0, (new Date(i.paymentDate!).getTime() - new Date().getTime()) / 86400000), 0) / paidInvoices.length)
      : 0;

    const riskIndicators = this.assessRisks(sanctions, audits, disputes, onTimePercent, qualityPassRate, certs);
    const overallRisk = riskIndicators.some(r => r.level === 'critical') ? 'critical'
      : riskIndicators.some(r => r.level === 'high') ? 'high'
      : riskIndicators.some(r => r.level === 'medium') ? 'medium' : 'low';

    this.logger.info('Supplier 360 profile built', { supplierId, overallRisk, contracts: contracts.length, pos: pos.length });

    return {
      supplierId, supplierName: basic.supplierName, supplierNameAR: basic.supplierNameAR,
      performanceScore: performance.score, performanceGrade: performance.grade,
      performanceHistory: performance.history,
      contracts, purchaseOrders: pos, rfqParticipation: rfqs,
      totalBusinessVolume: totalVolume, totalBusinessVolumeCurrency: 'USD', yearsAsSupplier,
      deliveryHistory: deliveries, onTimeDeliveryPercent: onTimePercent,
      qualityInspections: inspections, qualityPassRate,
      returnRate: inspections.length > 0 ? Math.round(((inspections.length - passedInspections) / inspections.length) * 100) : 0,
      invoices, averagePaymentDays: avgPaymentDays,
      outstandingAmount: invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0),
      disputes, auditFindings: audits, sanctionsStatus: sanctions,
      certifications: certs, donorRestrictions, bankAccounts: banks,
      overallRiskLevel: overallRisk, riskIndicators,
      lastUpdated: new Date().toISOString(), organizationId: scope.organizationId,
    };
  }

  private assessRisks(
    sanctions: string, audits: AuditFinding[], disputes: DisputeRecord[],
    onTimePct: number, qualityPct: number, certs: Certification[],
  ): RiskIndicator[] {
    const risks: RiskIndicator[] = [];
    if (sanctions === 'sanctioned') risks.push({ id: 'sanctions', name: 'Sanctioned', level: 'critical', description: 'Supplier is on sanctions list' });
    if (sanctions === 'flagged') risks.push({ id: 'sanctions_flag', name: 'Sanctions Flag', level: 'high', description: 'Supplier flagged for sanctions review' });
    if (audits.some(a => a.severity === 'critical' && a.status !== 'resolved')) risks.push({ id: 'audit_critical', name: 'Critical Audit', level: 'high', description: 'Unresolved critical audit findings' });
    if (disputes.filter(d => d.status === 'open').length > 2) risks.push({ id: 'disputes', name: 'Open Disputes', level: 'medium', description: `${disputes.filter(d => d.status === 'open').length} open disputes` });
    if (onTimePct < 70) risks.push({ id: 'delivery', name: 'Late Delivery', level: 'medium', description: `On-time delivery at ${onTimePct}%`, metric: onTimePct });
    if (qualityPct < 80) risks.push({ id: 'quality', name: 'Quality Issues', level: 'medium', description: `Quality pass rate at ${qualityPct}%`, metric: qualityPct });
    const expiredCerts = certs.filter(c => c.isExpired);
    if (expiredCerts.length > 0) risks.push({ id: 'expired_certs', name: 'Expired Certifications', level: 'medium', description: `${expiredCerts.length} expired certifications` });
    return risks;
  }
}


// ════════════════════════════════════════════════════════════════════════════
// #3  PROCUREMENT RISK ENGINE
// ════════════════════════════════════════════════════════════════════════════

export type ProcurementRiskType =
  | 'single_source'
  | 'emergency_repeat'
  | 'split_purchase'
  | 'vendor_concentration'
  | 'conflict_of_interest'
  | 'unusual_pricing'
  | 'suspicious_approval'
  | 'threshold_avoidance';

export interface ProcurementRiskAlert {
  alertId: string;
  riskType: ProcurementRiskType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedEntities: Array<{ type: string; id: number; reference: string }>;
  detectedAt: string;
  metric?: number;
  threshold?: number;
  recommendedAction: string;
}

export interface IProcurementRiskRepository {
  getSingleSourceProcurements(scope: RepositoryScope, months: number): Promise<Array<{ prId: number; prNumber: string; vendorId: number; amount: number }>>;
  getEmergencyProcurements(scope: RepositoryScope, months: number): Promise<Array<{ prId: number; prNumber: string; date: string; amount: number }>>;
  getPOsByValueRange(scope: RepositoryScope, minAmount: number, maxAmount: number, months: number): Promise<Array<{ poId: number; poNumber: string; vendorId: number; amount: number; date: string }>>;
  getVendorConcentration(scope: RepositoryScope, months: number): Promise<Array<{ vendorId: number; vendorName: string; totalAmount: number; poCount: number; percentOfTotal: number }>>;
  getApproverPatterns(scope: RepositoryScope, months: number): Promise<Array<{ approverId: number; vendorId: number; approvalCount: number }>>;
  getPriceAnomalies(scope: RepositoryScope, months: number): Promise<Array<{ poId: number; itemDescription: string; unitPrice: number; avgPrice: number; deviationPercent: number }>>;
}

export class ProcurementRiskEngine {
  private repo: IProcurementRiskRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(repo: IProcurementRiskRepository, logger: ILogger, config: IConfigService) {
    this.repo = repo;
    this.logger = logger.child({ service: 'ProcurementRiskEngine' });
    this.config = config;
  }

  async assessRisks(scope: RepositoryScope): Promise<ProcurementRiskAlert[]> {
    const months = this.config.getNumber('procurement.risk.lookbackMonths', 12);
    const alerts: ProcurementRiskAlert[] = [];

    // 1. Single-source procurement
    const singleSource = await this.repo.getSingleSourceProcurements(scope, months);
    if (singleSource.length > 3) {
      alerts.push({
        alertId: uuidv4(), riskType: 'single_source', severity: singleSource.length > 10 ? 'high' : 'medium',
        title: 'Frequent Single-Source Procurement',
        description: `${singleSource.length} single-source procurements in the last ${months} months`,
        affectedEntities: singleSource.slice(0, 5).map(s => ({ type: 'pr', id: s.prId, reference: s.prNumber })),
        detectedAt: new Date().toISOString(), metric: singleSource.length, threshold: 3,
        recommendedAction: 'Review single-source justifications and consider competitive bidding',
      });
    }

    // 2. Repeated emergency procurement
    const emergency = await this.repo.getEmergencyProcurements(scope, months);
    if (emergency.length > 5) {
      alerts.push({
        alertId: uuidv4(), riskType: 'emergency_repeat', severity: 'high',
        title: 'Excessive Emergency Procurements',
        description: `${emergency.length} emergency procurements in ${months} months — may indicate planning gaps`,
        affectedEntities: emergency.slice(0, 5).map(e => ({ type: 'pr', id: e.prId, reference: e.prNumber })),
        detectedAt: new Date().toISOString(), metric: emergency.length, threshold: 5,
        recommendedAction: 'Improve procurement planning to reduce emergencies',
      });
    }

    // 3. Split purchase detection (multiple POs just below approval threshold)
    const thresholdAmount = this.config.getNumber('procurement.approvalThreshold', 10000);
    const splitCandidates = await this.repo.getPOsByValueRange(scope, thresholdAmount * 0.8, thresholdAmount * 0.99, months);
    const vendorGroups = new Map<number, typeof splitCandidates>();
    for (const po of splitCandidates) {
      if (!vendorGroups.has(po.vendorId)) vendorGroups.set(po.vendorId, []);
      vendorGroups.get(po.vendorId)!.push(po);
    }
    for (const [vendorId, pos] of vendorGroups) {
      if (pos.length >= 3) {
        alerts.push({
          alertId: uuidv4(), riskType: 'split_purchase', severity: 'high',
          title: 'Potential Split Purchase',
          description: `${pos.length} POs to same vendor just below ${thresholdAmount} threshold`,
          affectedEntities: pos.map(p => ({ type: 'po', id: p.poId, reference: p.poNumber })),
          detectedAt: new Date().toISOString(), metric: pos.length, threshold: 3,
          recommendedAction: 'Investigate for intentional threshold avoidance',
        });
      }
    }

    // 4. Vendor concentration
    const concentration = await this.repo.getVendorConcentration(scope, months);
    for (const vendor of concentration) {
      if (vendor.percentOfTotal > 40) {
        alerts.push({
          alertId: uuidv4(), riskType: 'vendor_concentration', severity: vendor.percentOfTotal > 60 ? 'high' : 'medium',
          title: `High Vendor Concentration: ${vendor.vendorName}`,
          description: `${vendor.vendorName} accounts for ${vendor.percentOfTotal}% of total spend`,
          affectedEntities: [{ type: 'vendor', id: vendor.vendorId, reference: vendor.vendorName }],
          detectedAt: new Date().toISOString(), metric: vendor.percentOfTotal, threshold: 40,
          recommendedAction: 'Diversify supplier base to reduce dependency',
        });
      }
    }

    // 5. Unusual pricing
    const priceAnomalies = await this.repo.getPriceAnomalies(scope, months);
    for (const anomaly of priceAnomalies) {
      if (Math.abs(anomaly.deviationPercent) > 30) {
        alerts.push({
          alertId: uuidv4(), riskType: 'unusual_pricing', severity: Math.abs(anomaly.deviationPercent) > 50 ? 'high' : 'medium',
          title: `Unusual Pricing: ${anomaly.itemDescription}`,
          description: `Unit price ${anomaly.unitPrice} deviates ${anomaly.deviationPercent.toFixed(0)}% from average ${anomaly.avgPrice.toFixed(2)}`,
          affectedEntities: [{ type: 'po', id: anomaly.poId, reference: anomaly.itemDescription }],
          detectedAt: new Date().toISOString(), metric: anomaly.deviationPercent, threshold: 30,
          recommendedAction: 'Verify pricing with market benchmarks',
        });
      }
    }

    this.logger.info('Procurement risk assessment completed', { alertCount: alerts.length, scope: scope.organizationId });
    return alerts;
  }
}
