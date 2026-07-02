/**
 * P2PRiskEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Procure-to-Pay Risk Engine
 *
 * PROCUREMENT ENHANCED — Standalone Risk Engine
 *
 * Provides three levels of risk assessment:
 *
 *  1. Transaction-level: risk for a single PO/PR/Invoice
 *  2. Stage-level: risk at each P2P stage (PR → RFQ → PO → ... → Payment)
 *  3. Portfolio-level: organization-wide procurement risk indicators
 *
 * Risk categories:
 *  - Fraud: split purchases, threshold avoidance, conflict of interest
 *  - Compliance: single source, emergency repeats, missing documents
 *  - Operational: vendor concentration, unusual pricing, delivery delays
 *  - Financial: over-commitment, FX exposure, payment aging
 *
 * Integrates with:
 *  - P2PPipelineEngine (stage model, P2PRiskLevel)
 *  - ThreeWayMatchingEngine (matching discrepancies)
 *  - SupplierPerformanceEngine (vendor risk scoring)
 *  - BudgetAvailabilityEngine (budget overcommitment)
 *  - P2PWorkflowOrchestrator (pre-step rule evaluation)
 *  - UnifiedRulesCore (configurable risk rules)
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES — aligned with existing P2PPipelineEngine types
// ────────────────────────────────────────────────────────────────────────────

export type P2PStage =
  | 'PR' | 'RFQ' | 'Evaluation' | 'Contract' | 'PO'
  | 'Shipment' | 'GRN' | 'Inspection' | 'Invoice'
  | 'Payment' | 'Journal' | 'Grant' | 'Asset';

export type P2PRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type RiskCategory = 'fraud' | 'compliance' | 'operational' | 'financial';

export type FraudIndicator =
  | 'split_purchase'
  | 'threshold_avoidance'
  | 'conflict_of_interest'
  | 'round_amount_pattern'
  | 'rush_approval'
  | 'same_day_approve_issue'
  | 'approver_vendor_link';

export type ComplianceIndicator =
  | 'single_source_no_justification'
  | 'emergency_repeat'
  | 'missing_documentation'
  | 'expired_vendor_registration'
  | 'sanctioned_vendor'
  | 'donor_restriction_violation'
  | 'missing_evaluation_record';

export type OperationalIndicator =
  | 'vendor_concentration'
  | 'unusual_pricing'
  | 'delivery_delay_pattern'
  | 'quality_failure_pattern'
  | 'invoice_discrepancy_pattern'
  | 'grn_variance_pattern'
  | 'long_cycle_time';

export type FinancialIndicator =
  | 'budget_overcommitment'
  | 'fx_exposure'
  | 'payment_aging'
  | 'advance_outstanding'
  | 'invoice_duplicate'
  | 'price_escalation';

// ────────────────────────────────────────────────────────────────────────────
// RISK ASSESSMENT RESULTS
// ────────────────────────────────────────────────────────────────────────────

export interface P2PRiskAlert {
  alertId: string;
  category: RiskCategory;
  indicator: FraudIndicator | ComplianceIndicator | OperationalIndicator | FinancialIndicator;
  level: P2PRiskLevel;
  title: string;
  titleAR?: string;
  description: string;
  descriptionAR?: string;
  /** Which entity triggered this alert */
  entityType: 'pr' | 'po' | 'rfq' | 'invoice' | 'vendor' | 'contract' | 'grn';
  entityId: number;
  entityReference: string;
  /** Quantitative metric backing this alert */
  metric?: number;
  threshold?: number;
  /** Recommended action */
  recommendedAction: string;
  /** Which P2P stage this risk affects */
  affectedStage?: P2PStage;
  detectedAt: string;
  /** Is this alert acknowledged? */
  acknowledged: boolean;
  acknowledgedBy?: number;
  acknowledgedAt?: string;
}

export interface TransactionRiskAssessment {
  transactionId: number;
  transactionType: 'pr' | 'po' | 'invoice';
  transactionReference: string;
  overallRiskLevel: P2PRiskLevel;
  riskScore: number;     // 0-100 (higher = riskier)
  alerts: P2PRiskAlert[];
  byCategory: Record<RiskCategory, { count: number; highestLevel: P2PRiskLevel }>;
  assessedAt: string;
  canProceed: boolean;
  requiresReview: boolean;
  reviewerRole?: string;
}

export interface StageRiskProfile {
  stage: P2PStage;
  transactionsAtStage: number;
  riskDistribution: Record<P2PRiskLevel, number>;
  topRisks: P2PRiskAlert[];
  slaBreachCount: number;
  averageDaysAtStage: number;
  bottleneckScore: number;   // 0-100
}

export interface PortfolioRiskDashboard {
  organizationId: number;
  assessedAt: string;
  period: string;
  overallRiskLevel: P2PRiskLevel;
  overallRiskScore: number;

  // Summary counts
  totalAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  unacknowledgedAlerts: number;

  // By category
  byCategory: Array<{
    category: RiskCategory;
    alertCount: number;
    highestLevel: P2PRiskLevel;
    topIndicators: string[];
  }>;

  // By stage
  byStage: StageRiskProfile[];

  // Top risks requiring attention
  topRisks: P2PRiskAlert[];

  // Trend
  trend: 'improving' | 'stable' | 'deteriorating';
  previousScore?: number;

  // Recommendations
  recommendations: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IP2PRiskRepository {
  // Transaction-level data
  getPRDetails(prId: number, scope: RepositoryScope): Promise<{
    prNumber: string;
    amount: number;
    currency: string;
    vendorId?: number;
    procurementMethod: string;
    isEmergency: boolean;
    requestedBy: number;
    approvedBy?: number;
    approvedAt?: string;
    createdAt: string;
    justification?: string;
    grantId?: number;
    projectId?: number;
  } | null>;

  getPODetails(poId: number, scope: RepositoryScope): Promise<{
    poNumber: string;
    amount: number;
    currency: string;
    vendorId: number;
    vendorName: string;
    issuedDate: string;
    approvedBy: number;
    lineItemCount: number;
    linkedPRId?: number;
  } | null>;

  // Fraud detection queries
  getSimilarPOsNearThreshold(
    vendorId: number,
    amount: number,
    thresholdAmount: number,
    windowDays: number,
    scope: RepositoryScope,
  ): Promise<Array<{ poId: number; poNumber: string; amount: number; date: string }>>;

  getRoundAmountPOs(
    scope: RepositoryScope,
    months: number,
  ): Promise<Array<{ poId: number; poNumber: string; amount: number }>>;

  getApproverVendorLinks(
    approverId: number,
    scope: RepositoryScope,
  ): Promise<Array<{ vendorId: number; vendorName: string; connectionType: string }>>;

  getRushApprovals(
    scope: RepositoryScope,
    maxHoursBetweenCreateAndApprove: number,
  ): Promise<Array<{ poId: number; poNumber: string; createdAt: string; approvedAt: string; hoursDiff: number }>>;

  // Compliance queries
  getSingleSourceWithoutJustification(scope: RepositoryScope, months: number): Promise<Array<{ prId: number; prNumber: string; amount: number }>>;
  getEmergencyProcurements(scope: RepositoryScope, months: number): Promise<Array<{ prId: number; prNumber: string; date: string }>>;
  getExpiredVendorRegistrations(scope: RepositoryScope): Promise<Array<{ vendorId: number; vendorName: string; expiryDate: string }>>;
  getSanctionedVendorPOs(scope: RepositoryScope): Promise<Array<{ poId: number; vendorId: number; vendorName: string }>>;
  getMissingDocumentation(scope: RepositoryScope): Promise<Array<{ entityType: string; entityId: number; missingDocs: string[] }>>;

  // Operational queries
  getVendorConcentration(scope: RepositoryScope, months: number): Promise<Array<{ vendorId: number; vendorName: string; totalSpend: number; percentOfTotal: number; poCount: number }>>;
  getPriceAnomalies(scope: RepositoryScope, deviationThresholdPercent: number): Promise<Array<{ poId: number; itemDescription: string; unitPrice: number; avgPrice: number; deviationPercent: number }>>;
  getDeliveryDelayPatterns(scope: RepositoryScope, months: number): Promise<Array<{ vendorId: number; vendorName: string; lateDeliveries: number; totalDeliveries: number; latePct: number }>>;
  getStageMetrics(scope: RepositoryScope): Promise<Array<{ stage: P2PStage; count: number; avgDays: number; slaBreaches: number }>>;

  // Financial queries
  getOvercommittedBudgetLines(scope: RepositoryScope): Promise<Array<{ budgetLineId: number; approved: number; committed: number; overcommitPercent: number }>>;
  getDuplicateInvoiceCandidates(scope: RepositoryScope): Promise<Array<{ invoiceId1: number; invoiceId2: number; vendorId: number; amount: number; similarity: number }>>;
  getAgingPayments(scope: RepositoryScope, overdueDays: number): Promise<Array<{ invoiceId: number; vendorName: string; amount: number; dueDate: string; daysOverdue: number }>>;

  // Alert persistence
  saveAlert(alert: P2PRiskAlert): Promise<void>;
  getAlerts(scope: RepositoryScope, filters?: { category?: RiskCategory; level?: P2PRiskLevel; acknowledged?: boolean }): Promise<P2PRiskAlert[]>;
  acknowledgeAlert(alertId: string, userId: number): Promise<void>;
  getPreviousRiskScore(scope: RepositoryScope): Promise<number | null>;
}

export interface P2PRiskDependencies {
  riskRepo: IP2PRiskRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class P2PRiskEngine {
  private repo: IP2PRiskRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: P2PRiskDependencies) {
    this.repo = deps.riskRepo;
    this.logger = deps.logger.child({ service: 'P2PRiskEngine' });
    this.config = deps.config;
  }

  // ────────────────────────────────────────────────────────────────────────
  // TRANSACTION-LEVEL RISK ASSESSMENT
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Assess risk for a single transaction (PR, PO, or Invoice).
   * Called by P2PWorkflowOrchestrator before each saga step.
   */
  async assessTransaction(
    entityType: 'pr' | 'po' | 'invoice',
    entityId: number,
    scope: RepositoryScope,
  ): Promise<TransactionRiskAssessment> {
    const alerts: P2PRiskAlert[] = [];

    if (entityType === 'po') {
      const po = await this.repo.getPODetails(entityId, scope);
      if (!po) throw new Error(`PO ${entityId} not found`);

      await this.checkSplitPurchase(po, entityId, scope, alerts);
      await this.checkRushApproval(entityId, scope, alerts);
      await this.checkUnusualPricing(entityId, scope, alerts);
      await this.checkVendorRisk(po.vendorId, po.vendorName, entityId, scope, alerts);
    }

    if (entityType === 'pr') {
      const pr = await this.repo.getPRDetails(entityId, scope);
      if (!pr) throw new Error(`PR ${entityId} not found`);

      if (pr.isEmergency) {
        await this.checkEmergencyRepeat(entityId, pr.prNumber, scope, alerts);
      }
      if (pr.procurementMethod === 'single_source' && !pr.justification) {
        alerts.push(this.createAlert({
          category: 'compliance',
          indicator: 'single_source_no_justification',
          level: 'high',
          title: 'Single Source Without Justification',
          description: `PR ${pr.prNumber} uses single-source procurement without documented justification`,
          entityType: 'pr', entityId, entityReference: pr.prNumber,
          recommendedAction: 'Add single-source justification before proceeding',
        }));
      }
    }

    // Score and categorize
    const riskScore = this.calculateRiskScore(alerts);
    const overallLevel = this.scoreToLevel(riskScore);
    const byCategory = this.categorizeAlerts(alerts);

    // Persist alerts
    for (const alert of alerts) {
      await this.repo.saveAlert(alert);
    }

    const ref = entityType === 'po'
      ? (await this.repo.getPODetails(entityId, scope))?.poNumber || String(entityId)
      : entityType === 'pr'
        ? (await this.repo.getPRDetails(entityId, scope))?.prNumber || String(entityId)
        : String(entityId);

    this.logger.info('Transaction risk assessed', {
      entityType, entityId,
      riskScore, overallLevel,
      alertCount: alerts.length,
    });

    return {
      transactionId: entityId,
      transactionType: entityType,
      transactionReference: ref,
      overallRiskLevel: overallLevel,
      riskScore,
      alerts,
      byCategory,
      assessedAt: new Date().toISOString(),
      canProceed: overallLevel !== 'critical',
      requiresReview: overallLevel === 'high' || overallLevel === 'critical',
      reviewerRole: overallLevel === 'critical' ? 'CFO' : overallLevel === 'high' ? 'Procurement Manager' : undefined,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // PORTFOLIO-LEVEL RISK DASHBOARD
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Build organization-wide procurement risk dashboard.
   * Called by ExecutiveDashboardEngine and ReportExportOrchestrator.
   */
  async assessPortfolio(scope: RepositoryScope): Promise<PortfolioRiskDashboard> {
    const months = this.config.getNumber('procurement.risk.lookbackMonths', 12);
    const alerts: P2PRiskAlert[] = [];

    // ── FRAUD CHECKS ──
    const roundAmounts = await this.repo.getRoundAmountPOs(scope, months);
    for (const po of roundAmounts.slice(0, 10)) {
      alerts.push(this.createAlert({
        category: 'fraud', indicator: 'round_amount_pattern', level: 'medium',
        title: `Suspiciously Round Amount: ${po.amount}`,
        description: `PO ${po.poNumber} has a round amount of ${po.amount}`,
        entityType: 'po', entityId: po.poId, entityReference: po.poNumber, metric: po.amount,
        recommendedAction: 'Review for potential price manipulation',
      }));
    }

    const rushApprovals = await this.repo.getRushApprovals(scope, 2);
    for (const rush of rushApprovals.slice(0, 10)) {
      alerts.push(this.createAlert({
        category: 'fraud', indicator: 'rush_approval', level: 'high',
        title: `Rush Approval: ${rush.poNumber}`,
        description: `PO ${rush.poNumber} approved within ${rush.hoursDiff.toFixed(1)} hours of creation`,
        entityType: 'po', entityId: rush.poId, entityReference: rush.poNumber,
        metric: rush.hoursDiff, threshold: 2,
        recommendedAction: 'Verify approval was not coerced or circumvented',
      }));
    }

    // ── COMPLIANCE CHECKS ──
    const singleSource = await this.repo.getSingleSourceWithoutJustification(scope, months);
    if (singleSource.length > 0) {
      alerts.push(this.createAlert({
        category: 'compliance', indicator: 'single_source_no_justification', level: 'high',
        title: `${singleSource.length} Single-Source PRs Without Justification`,
        description: `${singleSource.length} purchase requests used single-source without documented justification`,
        entityType: 'pr', entityId: singleSource[0].prId, entityReference: singleSource[0].prNumber,
        metric: singleSource.length,
        recommendedAction: 'Require justification for all single-source procurements',
      }));
    }

    const expiredVendors = await this.repo.getExpiredVendorRegistrations(scope);
    for (const vendor of expiredVendors) {
      alerts.push(this.createAlert({
        category: 'compliance', indicator: 'expired_vendor_registration', level: 'medium',
        title: `Expired Registration: ${vendor.vendorName}`,
        description: `Vendor registration expired ${vendor.expiryDate}`,
        entityType: 'vendor', entityId: vendor.vendorId, entityReference: vendor.vendorName,
        recommendedAction: 'Suspend POs until registration is renewed',
      }));
    }

    const sanctioned = await this.repo.getSanctionedVendorPOs(scope);
    for (const s of sanctioned) {
      alerts.push(this.createAlert({
        category: 'compliance', indicator: 'sanctioned_vendor', level: 'critical',
        title: `SANCTIONED VENDOR: ${s.vendorName}`,
        description: `Active PO ${s.poId} with sanctioned vendor ${s.vendorName}`,
        entityType: 'po', entityId: s.poId, entityReference: String(s.poId),
        recommendedAction: 'Immediately suspend all transactions with this vendor',
      }));
    }

    // ── OPERATIONAL CHECKS ──
    const concentration = await this.repo.getVendorConcentration(scope, months);
    for (const vendor of concentration) {
      if (vendor.percentOfTotal > 40) {
        alerts.push(this.createAlert({
          category: 'operational', indicator: 'vendor_concentration', level: vendor.percentOfTotal > 60 ? 'high' : 'medium',
          title: `Vendor Concentration: ${vendor.vendorName} (${vendor.percentOfTotal}%)`,
          description: `${vendor.vendorName} accounts for ${vendor.percentOfTotal}% of procurement spend`,
          entityType: 'vendor', entityId: vendor.vendorId, entityReference: vendor.vendorName,
          metric: vendor.percentOfTotal, threshold: 40,
          recommendedAction: 'Diversify supplier base to reduce dependency risk',
        }));
      }
    }

    const delays = await this.repo.getDeliveryDelayPatterns(scope, months);
    for (const d of delays) {
      if (d.latePct > 30) {
        alerts.push(this.createAlert({
          category: 'operational', indicator: 'delivery_delay_pattern', level: d.latePct > 50 ? 'high' : 'medium',
          title: `Delivery Problems: ${d.vendorName}`,
          description: `${d.vendorName}: ${d.lateDeliveries}/${d.totalDeliveries} deliveries late (${d.latePct}%)`,
          entityType: 'vendor', entityId: d.vendorId, entityReference: d.vendorName,
          metric: d.latePct, threshold: 30,
          recommendedAction: 'Escalate SLA with vendor and require improvement plan',
        }));
      }
    }

    // ── FINANCIAL CHECKS ──
    const overcommitted = await this.repo.getOvercommittedBudgetLines(scope);
    for (const bl of overcommitted) {
      alerts.push(this.createAlert({
        category: 'financial', indicator: 'budget_overcommitment', level: bl.overcommitPercent > 110 ? 'critical' : 'high',
        title: `Budget Overcommitted by ${bl.overcommitPercent}%`,
        description: `Budget line ${bl.budgetLineId}: committed ${bl.committed} against approved ${bl.approved}`,
        entityType: 'po', entityId: bl.budgetLineId, entityReference: `BL-${bl.budgetLineId}`,
        metric: bl.overcommitPercent, threshold: 100,
        recommendedAction: 'Halt new POs against this budget line until resolved',
      }));
    }

    const duplicates = await this.repo.getDuplicateInvoiceCandidates(scope);
    for (const dup of duplicates) {
      alerts.push(this.createAlert({
        category: 'financial', indicator: 'invoice_duplicate', level: 'high',
        title: `Possible Duplicate Invoice`,
        description: `Invoices ${dup.invoiceId1} and ${dup.invoiceId2}: same vendor, amount ${dup.amount}, similarity ${dup.similarity}%`,
        entityType: 'invoice', entityId: dup.invoiceId1, entityReference: `INV-${dup.invoiceId1}`,
        metric: dup.similarity, threshold: 90,
        recommendedAction: 'Verify invoices are for separate deliveries before payment',
      }));
    }

    const aging = await this.repo.getAgingPayments(scope, 30);
    if (aging.length > 5) {
      alerts.push(this.createAlert({
        category: 'financial', indicator: 'payment_aging', level: aging.length > 20 ? 'high' : 'medium',
        title: `${aging.length} Overdue Payments`,
        description: `${aging.length} invoices overdue by 30+ days, total ${aging.reduce((s, a) => s + a.amount, 0).toFixed(2)}`,
        entityType: 'invoice', entityId: aging[0].invoiceId, entityReference: aging[0].vendorName,
        metric: aging.length, threshold: 5,
        recommendedAction: 'Review payment queue and prioritize overdue invoices',
      }));
    }

    // ── Stage risk profiles ──
    const stageMetrics = await this.repo.getStageMetrics(scope);
    const byStage: StageRiskProfile[] = stageMetrics.map(sm => {
      const stageAlerts = alerts.filter(a => a.affectedStage === sm.stage);
      return {
        stage: sm.stage,
        transactionsAtStage: sm.count,
        riskDistribution: this.distributeRisks(stageAlerts),
        topRisks: stageAlerts.slice(0, 3),
        slaBreachCount: sm.slaBreaches,
        averageDaysAtStage: sm.avgDays,
        bottleneckScore: Math.min(100, sm.slaBreaches * 10 + Math.max(0, sm.avgDays - 5) * 5),
      };
    });

    // ── Overall scoring ──
    const riskScore = this.calculateRiskScore(alerts);
    const overallLevel = this.scoreToLevel(riskScore);
    const previousScore = await this.repo.getPreviousRiskScore(scope);
    const trend = previousScore !== null
      ? riskScore < previousScore - 5 ? 'improving' : riskScore > previousScore + 5 ? 'deteriorating' : 'stable'
      : 'stable';

    // Persist all new alerts
    for (const alert of alerts) {
      await this.repo.saveAlert(alert);
    }

    // Recommendations
    const recommendations: string[] = [];
    if (sanctioned.length > 0) recommendations.push('URGENT: Suspend all transactions with sanctioned vendors');
    if (overcommitted.length > 0) recommendations.push('Freeze new POs on overcommitted budget lines');
    if (singleSource.length > 3) recommendations.push('Strengthen single-source justification policy');
    if (rushApprovals.length > 5) recommendations.push('Implement minimum review period for PO approvals');
    if (duplicates.length > 0) recommendations.push('Review duplicate invoice candidates before payment');
    if (concentration.some(v => v.percentOfTotal > 50)) recommendations.push('Develop supplier diversification strategy');

    this.logger.info('Portfolio risk assessed', {
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.level === 'critical').length,
      riskScore,
      overallLevel,
      trend,
    });

    return {
      organizationId: scope.organizationId,
      assessedAt: new Date().toISOString(),
      period: `Last ${months} months`,
      overallRiskLevel: overallLevel,
      overallRiskScore: riskScore,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.level === 'critical').length,
      highAlerts: alerts.filter(a => a.level === 'high').length,
      mediumAlerts: alerts.filter(a => a.level === 'medium').length,
      lowAlerts: alerts.filter(a => a.level === 'low').length,
      unacknowledgedAlerts: alerts.filter(a => !a.acknowledged).length,
      byCategory: this.summarizeByCategory(alerts),
      byStage,
      topRisks: alerts.filter(a => a.level === 'critical' || a.level === 'high').slice(0, 10),
      trend: trend as PortfolioRiskDashboard['trend'],
      previousScore: previousScore ?? undefined,
      recommendations,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // ACKNOWLEDGE ALERT
  // ────────────────────────────────────────────────────────────────────────

  async acknowledgeAlert(alertId: string, userId: number): Promise<void> {
    await this.repo.acknowledgeAlert(alertId, userId);
    this.logger.info('Risk alert acknowledged', { alertId, userId });
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVATE: TRANSACTION-LEVEL CHECKS
  // ────────────────────────────────────────────────────────────────────────

  private async checkSplitPurchase(
    po: { poNumber: string; amount: number; vendorId: number },
    poId: number,
    scope: RepositoryScope,
    alerts: P2PRiskAlert[],
  ): Promise<void> {
    const threshold = this.config.getNumber('procurement.approvalThreshold', 10000);
    if (po.amount >= threshold * 0.8 && po.amount < threshold) {
      const similar = await this.repo.getSimilarPOsNearThreshold(po.vendorId, po.amount, threshold, 30, scope);
      if (similar.length >= 2) {
        alerts.push(this.createAlert({
          category: 'fraud', indicator: 'split_purchase', level: 'high',
          title: `Potential Split Purchase: ${po.poNumber}`,
          description: `PO ${po.poNumber} (${po.amount}) and ${similar.length} other POs to same vendor are just below ${threshold} threshold`,
          entityType: 'po', entityId: poId, entityReference: po.poNumber,
          metric: similar.length + 1, threshold: 2, affectedStage: 'PO',
          recommendedAction: 'Investigate for intentional threshold avoidance',
        }));
      }
    }
  }

  private async checkRushApproval(
    poId: number,
    scope: RepositoryScope,
    alerts: P2PRiskAlert[],
  ): Promise<void> {
    const rushes = await this.repo.getRushApprovals(scope, 2);
    const thisRush = rushes.find(r => r.poId === poId);
    if (thisRush) {
      alerts.push(this.createAlert({
        category: 'fraud', indicator: 'rush_approval', level: 'medium',
        title: `Rush Approval: ${thisRush.poNumber}`,
        description: `Approved within ${thisRush.hoursDiff.toFixed(1)} hours of creation`,
        entityType: 'po', entityId: poId, entityReference: thisRush.poNumber,
        metric: thisRush.hoursDiff, threshold: 2, affectedStage: 'PO',
        recommendedAction: 'Verify approval followed proper review process',
      }));
    }
  }

  private async checkUnusualPricing(
    poId: number,
    scope: RepositoryScope,
    alerts: P2PRiskAlert[],
  ): Promise<void> {
    const deviationThreshold = this.config.getNumber('procurement.risk.priceDeviationPercent', 30);
    const anomalies = await this.repo.getPriceAnomalies(scope, deviationThreshold);
    const thisAnomaly = anomalies.filter(a => a.poId === poId);

    for (const anomaly of thisAnomaly) {
      alerts.push(this.createAlert({
        category: 'operational', indicator: 'unusual_pricing', level: Math.abs(anomaly.deviationPercent) > 50 ? 'high' : 'medium',
        title: `Unusual Price: ${anomaly.itemDescription}`,
        description: `Unit price ${anomaly.unitPrice} deviates ${anomaly.deviationPercent.toFixed(0)}% from average ${anomaly.avgPrice.toFixed(2)}`,
        entityType: 'po', entityId: poId, entityReference: anomaly.itemDescription,
        metric: anomaly.deviationPercent, threshold: deviationThreshold, affectedStage: 'PO',
        recommendedAction: 'Verify pricing with market benchmarks',
      }));
    }
  }

  private async checkVendorRisk(
    vendorId: number,
    vendorName: string,
    poId: number,
    scope: RepositoryScope,
    alerts: P2PRiskAlert[],
  ): Promise<void> {
    const sanctioned = await this.repo.getSanctionedVendorPOs(scope);
    if (sanctioned.some(s => s.vendorId === vendorId)) {
      alerts.push(this.createAlert({
        category: 'compliance', indicator: 'sanctioned_vendor', level: 'critical',
        title: `SANCTIONED VENDOR: ${vendorName}`,
        description: `PO ${poId} issued to sanctioned vendor ${vendorName} — BLOCK IMMEDIATELY`,
        entityType: 'po', entityId: poId, entityReference: String(poId),
        affectedStage: 'PO',
        recommendedAction: 'Cancel PO and suspend all transactions with this vendor',
      }));
    }
  }

  private async checkEmergencyRepeat(
    prId: number,
    prNumber: string,
    scope: RepositoryScope,
    alerts: P2PRiskAlert[],
  ): Promise<void> {
    const months = this.config.getNumber('procurement.risk.lookbackMonths', 12);
    const emergencies = await this.repo.getEmergencyProcurements(scope, months);
    if (emergencies.length > 5) {
      alerts.push(this.createAlert({
        category: 'compliance', indicator: 'emergency_repeat', level: 'high',
        title: `Repeated Emergency Procurement`,
        description: `PR ${prNumber} is the ${emergencies.length}th emergency procurement in ${months} months`,
        entityType: 'pr', entityId: prId, entityReference: prNumber,
        metric: emergencies.length, threshold: 5, affectedStage: 'PR',
        recommendedAction: 'Review procurement planning to reduce emergency dependencies',
      }));
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVATE: SCORING AND UTILITIES
  // ────────────────────────────────────────────────────────────────────────

  private calculateRiskScore(alerts: P2PRiskAlert[]): number {
    if (alerts.length === 0) return 0;

    const weights: Record<P2PRiskLevel, number> = { critical: 40, high: 20, medium: 8, low: 2 };
    const rawScore = alerts.reduce((s, a) => s + weights[a.level], 0);
    return Math.min(100, rawScore);
  }

  private scoreToLevel(score: number): P2PRiskLevel {
    if (score >= 60) return 'critical';
    if (score >= 35) return 'high';
    if (score >= 15) return 'medium';
    return 'low';
  }

  private categorizeAlerts(alerts: P2PRiskAlert[]): Record<RiskCategory, { count: number; highestLevel: P2PRiskLevel }> {
    const cats: Record<RiskCategory, { count: number; highestLevel: P2PRiskLevel }> = {
      fraud: { count: 0, highestLevel: 'low' },
      compliance: { count: 0, highestLevel: 'low' },
      operational: { count: 0, highestLevel: 'low' },
      financial: { count: 0, highestLevel: 'low' },
    };

    const levelOrder: P2PRiskLevel[] = ['low', 'medium', 'high', 'critical'];

    for (const alert of alerts) {
      cats[alert.category].count++;
      if (levelOrder.indexOf(alert.level) > levelOrder.indexOf(cats[alert.category].highestLevel)) {
        cats[alert.category].highestLevel = alert.level;
      }
    }

    return cats;
  }

  private summarizeByCategory(alerts: P2PRiskAlert[]): PortfolioRiskDashboard['byCategory'] {
    const cats = this.categorizeAlerts(alerts);
    return (['fraud', 'compliance', 'operational', 'financial'] as RiskCategory[]).map(cat => ({
      category: cat,
      alertCount: cats[cat].count,
      highestLevel: cats[cat].highestLevel,
      topIndicators: [...new Set(alerts.filter(a => a.category === cat).map(a => a.indicator))].slice(0, 3),
    }));
  }

  private distributeRisks(alerts: P2PRiskAlert[]): Record<P2PRiskLevel, number> {
    return {
      low: alerts.filter(a => a.level === 'low').length,
      medium: alerts.filter(a => a.level === 'medium').length,
      high: alerts.filter(a => a.level === 'high').length,
      critical: alerts.filter(a => a.level === 'critical').length,
    };
  }

  private createAlert(input: {
    category: RiskCategory;
    indicator: FraudIndicator | ComplianceIndicator | OperationalIndicator | FinancialIndicator;
    level: P2PRiskLevel;
    title: string;
    description: string;
    entityType: P2PRiskAlert['entityType'];
    entityId: number;
    entityReference: string;
    metric?: number;
    threshold?: number;
    affectedStage?: P2PStage;
    recommendedAction: string;
  }): P2PRiskAlert {
    return {
      alertId: uuidv4(),
      ...input,
      detectedAt: new Date().toISOString(),
      acknowledged: false,
    };
  }
}
