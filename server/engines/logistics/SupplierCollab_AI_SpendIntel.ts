/**
 * SupplierCollaborationEngine.ts + ProcurementAIAssistantEngine.ts + SpendIntelligenceEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Supplier Portal (#6) + AI Assistant (#7) + Spend Intelligence (#8 ★★★★★)
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ════════════════════════════════════════════════════════════════════════════
// #6  SUPPLIER COLLABORATION ENGINE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Powers the supplier-facing portal. Suppliers can:
 *   - Receive RFQs and submit quotations
 *   - Upload invoices and shipping documents
 *   - Monitor payment status
 *   - Respond to clarifications
 *   - Update certifications
 *
 * All actions are scoped and permission-controlled.
 * Supplier users only see their own data.
 */

export type PortalAction = 'rfq_received' | 'quotation_submitted' | 'invoice_uploaded' | 'document_uploaded' | 'clarification_response' | 'certification_updated' | 'payment_inquiry';

export interface SupplierPortalSession {
  sessionId: string;
  supplierId: number;
  supplierName: string;
  organizationId: number;
  /** What the supplier can see */
  permissions: PortalAction[];
}

export interface PortalRFQ {
  rfqId: number;
  rfqNumber: string;
  title: string;
  issuedDate: string;
  responseDeadline: string;
  items: Array<{ itemNumber: number; description: string; quantity: number; unit: string; specifications?: string }>;
  documents: Array<{ name: string; downloadUrl: string }>;
  status: 'open' | 'responded' | 'closed' | 'awarded';
  clarifications: Array<{ question: string; answer?: string; askedAt: string; answeredAt?: string }>;
}

export interface PortalQuotation {
  quotationId: string;
  rfqId: number;
  supplierId: number;
  items: Array<{ itemNumber: number; unitPrice: number; currency: string; leadTimeDays: number; notes?: string }>;
  totalAmount: number;
  currency: string;
  validUntil: string;
  termsAndConditions?: string;
  attachments: Array<{ name: string; uploadUrl: string }>;
  submittedAt: string;
}

export interface PortalPaymentStatus {
  invoiceId: number;
  invoiceNumber: string;
  amount: number;
  currency: string;
  invoiceDate: string;
  status: 'received' | 'under_review' | 'approved' | 'payment_scheduled' | 'paid' | 'disputed';
  expectedPaymentDate?: string;
  paymentReference?: string;
}

export interface ISupplierPortalRepository {
  getOpenRFQs(supplierId: number, scope: RepositoryScope): Promise<PortalRFQ[]>;
  submitQuotation(quotation: PortalQuotation): Promise<void>;
  getPaymentStatuses(supplierId: number, scope: RepositoryScope): Promise<PortalPaymentStatus[]>;
  submitClarification(rfqId: number, supplierId: number, question: string): Promise<void>;
  uploadDocument(supplierId: number, documentType: string, fileName: string, scope: RepositoryScope): Promise<{ uploadUrl: string }>;
  updateCertification(supplierId: number, certType: string, validTo: string, documentRef: string): Promise<void>;
  logPortalAction(supplierId: number, action: PortalAction, details: Record<string, unknown>): Promise<void>;
}

export class SupplierCollaborationEngine {
  private repo: ISupplierPortalRepository;
  private logger: ILogger;

  constructor(repo: ISupplierPortalRepository, logger: ILogger) {
    this.repo = repo;
    this.logger = logger.child({ service: 'SupplierCollaboration' });
  }

  async getSupplierDashboard(supplierId: number, scope: RepositoryScope): Promise<{
    openRFQs: PortalRFQ[];
    paymentStatuses: PortalPaymentStatus[];
    pendingActions: number;
  }> {
    const [rfqs, payments] = await Promise.all([
      this.repo.getOpenRFQs(supplierId, scope),
      this.repo.getPaymentStatuses(supplierId, scope),
    ]);

    const pendingActions = rfqs.filter(r => r.status === 'open').length;

    return { openRFQs: rfqs, paymentStatuses: payments, pendingActions };
  }

  async submitQuotation(quotation: Omit<PortalQuotation, 'quotationId' | 'submittedAt'>, scope: RepositoryScope): Promise<string> {
    const id = uuidv4();
    await this.repo.submitQuotation({
      ...quotation, quotationId: id, submittedAt: new Date().toISOString(),
    });
    await this.repo.logPortalAction(quotation.supplierId, 'quotation_submitted', { rfqId: quotation.rfqId, amount: quotation.totalAmount });
    this.logger.info('Supplier quotation submitted', { supplierId: quotation.supplierId, rfqId: quotation.rfqId });
    return id;
  }
}


// ════════════════════════════════════════════════════════════════════════════
// #7  PROCUREMENT AI ASSISTANT
// ════════════════════════════════════════════════════════════════════════════

export interface ProcurementAIQuery {
  question: string;
  context?: { prId?: number; poId?: number; vendorId?: number; rfqId?: number };
  locale: 'en' | 'ar' | 'it';
  userId: number;
  scope: RepositoryScope;
}

export interface ProcurementAIResponse {
  answer: string;
  confidence: number;
  evidence: Array<{ type: string; description: string; value?: number }>;
  suggestedActions: string[];
  isAIGenerated: true;
  disclaimer: string;
}

export interface IProcurementAIProvider {
  answer(prompt: string, locale: string): Promise<{ text: string; confidence: number }>;
}

export interface IProcurementDataContext {
  getVendorSummary(vendorId: number, scope: RepositoryScope): Promise<string>;
  getPRSummary(prId: number, scope: RepositoryScope): Promise<string>;
  getPOSummary(poId: number, scope: RepositoryScope): Promise<string>;
  getSpendSummary(scope: RepositoryScope): Promise<string>;
  getRiskSummary(scope: RepositoryScope): Promise<string>;
}

export class ProcurementAIAssistantEngine {
  private aiProvider: IProcurementAIProvider;
  private dataContext: IProcurementDataContext;
  private logger: ILogger;

  constructor(aiProvider: IProcurementAIProvider, dataContext: IProcurementDataContext, logger: ILogger) {
    this.aiProvider = aiProvider;
    this.dataContext = dataContext;
    this.logger = logger.child({ service: 'ProcurementAIAssistant' });
  }

  async ask(query: ProcurementAIQuery): Promise<ProcurementAIResponse> {
    // Build context from available data
    const contextParts: string[] = [];

    if (query.context?.vendorId) {
      contextParts.push(await this.dataContext.getVendorSummary(query.context.vendorId, query.scope));
    }
    if (query.context?.prId) {
      contextParts.push(await this.dataContext.getPRSummary(query.context.prId, query.scope));
    }
    if (query.context?.poId) {
      contextParts.push(await this.dataContext.getPOSummary(query.context.poId, query.scope));
    }

    contextParts.push(await this.dataContext.getSpendSummary(query.scope));
    contextParts.push(await this.dataContext.getRiskSummary(query.scope));

    const prompt = `Procurement context:\n${contextParts.join('\n')}\n\nQuestion: ${query.question}`;
    const result = await this.aiProvider.answer(prompt, query.locale);

    this.logger.info('Procurement AI query answered', {
      userId: query.userId,
      confidence: result.confidence,
    });

    return {
      answer: result.text,
      confidence: result.confidence,
      evidence: [],
      suggestedActions: [],
      isAIGenerated: true,
      disclaimer: query.locale === 'ar'
        ? '⚠️ إجابة مولدة بالذكاء الاصطناعي — تحقق قبل اتخاذ قرارات.'
        : '⚠️ AI-generated answer — verify before making decisions.',
    };
  }

  getSuggestedQuestions(locale: 'en' | 'ar' | 'it'): string[] {
    const q: Record<string, string[]> = {
      en: [
        'Which suppliers have the best delivery performance?',
        'Are there any potential split purchases this quarter?',
        'What is the average lead time for IT equipment?',
        'Which contracts are expiring in the next 60 days?',
        'Why did Vendor X\'s performance score decrease?',
        'What are the top spending categories this year?',
      ],
      ar: ['ما هو أداء التوريد لأفضل الموردين؟', 'هل توجد مشتريات مجزأة محتملة؟'],
      it: ['Quali fornitori hanno le migliori prestazioni di consegna?', 'Ci sono acquisti frazionati potenziali?'],
    };
    return q[locale] || q.en;
  }
}


// ════════════════════════════════════════════════════════════════════════════
// #8  SPEND INTELLIGENCE ENGINE  ★★★★★
// ════════════════════════════════════════════════════════════════════════════

/**
 * Strategic procurement intelligence extending existing ProcurementAnalyticsEngine.
 * Adds: category management, supplier concentration, purchasing trends,
 * framework agreement utilization, maverick spending, contract leakage,
 * savings opportunities.
 */

export interface SpendAnalysis {
  organizationId: number;
  period: { start: string; end: string };
  totalSpend: number;
  currency: string;

  byCategory: Array<{
    category: string;
    spend: number;
    percent: number;
    supplierCount: number;
    poCount: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    yearOverYearChange: number;
  }>;

  supplierConcentration: {
    top5Percent: number;
    top10Percent: number;
    herfindahlIndex: number;
    diversificationScore: number;
  };

  frameworkAgreementUtilization: Array<{
    agreementId: number;
    agreementName: string;
    totalValue: number;
    utilizedValue: number;
    utilizationPercent: number;
    expiryDate: string;
  }>;

  maverickSpending: {
    totalMaverick: number;
    maverickPercent: number;
    instances: Array<{ poId: number; poNumber: string; amount: number; reason: string }>;
  };

  contractLeakage: {
    totalLeakage: number;
    leakagePercent: number;
    instances: Array<{ poId: number; contractId: number; amount: number; reason: string }>;
  };

  savingsOpportunities: Array<{
    type: 'consolidation' | 'renegotiation' | 'competitive_bidding' | 'volume_discount' | 'payment_terms';
    description: string;
    estimatedSavings: number;
    confidence: 'high' | 'medium' | 'low';
    affectedCategories: string[];
  }>;
}

export interface ISpendIntelligenceRepository {
  getTotalSpend(period: { start: string; end: string }, scope: RepositoryScope): Promise<number>;
  getSpendByCategory(period: { start: string; end: string }, scope: RepositoryScope): Promise<Array<{ category: string; spend: number; supplierCount: number; poCount: number; previousPeriodSpend: number }>>;
  getSupplierSpendDistribution(period: { start: string; end: string }, scope: RepositoryScope): Promise<Array<{ vendorId: number; vendorName: string; spend: number }>>;
  getFrameworkAgreements(scope: RepositoryScope): Promise<Array<{ agreementId: number; name: string; totalValue: number; utilizedValue: number; expiryDate: string }>>;
  getMaverickPurchases(period: { start: string; end: string }, scope: RepositoryScope): Promise<Array<{ poId: number; poNumber: string; amount: number; reason: string }>>;
  getContractLeakage(period: { start: string; end: string }, scope: RepositoryScope): Promise<Array<{ poId: number; contractId: number; amount: number; reason: string }>>;
  getConsolidationOpportunities(scope: RepositoryScope): Promise<Array<{ category: string; supplierCount: number; totalSpend: number; estimatedSavings: number }>>;
}

export class SpendIntelligenceEngine {
  private repo: ISpendIntelligenceRepository;
  private logger: ILogger;

  constructor(repo: ISpendIntelligenceRepository, logger: ILogger) {
    this.repo = repo;
    this.logger = logger.child({ service: 'SpendIntelligenceEngine' });
  }

  async analyze(period: { start: string; end: string }, scope: RepositoryScope): Promise<SpendAnalysis> {
    const [totalSpend, categorySpend, supplierDist, frameworks, maverick, leakage, consolidation] = await Promise.all([
      this.repo.getTotalSpend(period, scope),
      this.repo.getSpendByCategory(period, scope),
      this.repo.getSupplierSpendDistribution(period, scope),
      this.repo.getFrameworkAgreements(scope),
      this.repo.getMaverickPurchases(period, scope),
      this.repo.getContractLeakage(period, scope),
      this.repo.getConsolidationOpportunities(scope),
    ]);

    // Category analysis
    const byCategory = categorySpend.map(c => ({
      category: c.category,
      spend: c.spend,
      percent: totalSpend > 0 ? Math.round((c.spend / totalSpend) * 100 * 10) / 10 : 0,
      supplierCount: c.supplierCount,
      poCount: c.poCount,
      trend: c.spend > c.previousPeriodSpend * 1.1 ? 'increasing' as const
        : c.spend < c.previousPeriodSpend * 0.9 ? 'decreasing' as const : 'stable' as const,
      yearOverYearChange: c.previousPeriodSpend > 0
        ? Math.round(((c.spend - c.previousPeriodSpend) / c.previousPeriodSpend) * 100) : 0,
    }));

    // Supplier concentration
    const sorted = [...supplierDist].sort((a, b) => b.spend - a.spend);
    const top5Spend = sorted.slice(0, 5).reduce((s, v) => s + v.spend, 0);
    const top10Spend = sorted.slice(0, 10).reduce((s, v) => s + v.spend, 0);
    const hhi = supplierDist.reduce((s, v) => s + Math.pow((v.spend / totalSpend) * 100, 2), 0);

    // Framework utilization
    const frameworkUtil = frameworks.map(f => ({
      agreementId: f.agreementId, agreementName: f.name,
      totalValue: f.totalValue, utilizedValue: f.utilizedValue,
      utilizationPercent: f.totalValue > 0 ? Math.round((f.utilizedValue / f.totalValue) * 100) : 0,
      expiryDate: f.expiryDate,
    }));

    // Maverick spending
    const totalMaverick = maverick.reduce((s, m) => s + m.amount, 0);

    // Contract leakage
    const totalLeakage = leakage.reduce((s, l) => s + l.amount, 0);

    // Savings opportunities
    const savingsOpportunities: SpendAnalysis['savingsOpportunities'] = [];
    for (const c of consolidation) {
      if (c.supplierCount > 3 && c.estimatedSavings > 0) {
        savingsOpportunities.push({
          type: 'consolidation',
          description: `Consolidate ${c.supplierCount} suppliers for "${c.category}" — estimated ${c.estimatedSavings.toFixed(0)} savings`,
          estimatedSavings: c.estimatedSavings,
          confidence: c.estimatedSavings > 10000 ? 'high' : 'medium',
          affectedCategories: [c.category],
        });
      }
    }

    this.logger.info('Spend analysis completed', {
      totalSpend, categories: byCategory.length,
      maverickPercent: totalSpend > 0 ? Math.round((totalMaverick / totalSpend) * 100) : 0,
      savingsOpportunities: savingsOpportunities.length,
    });

    return {
      organizationId: scope.organizationId,
      period, totalSpend, currency: 'USD',
      byCategory,
      supplierConcentration: {
        top5Percent: totalSpend > 0 ? Math.round((top5Spend / totalSpend) * 100) : 0,
        top10Percent: totalSpend > 0 ? Math.round((top10Spend / totalSpend) * 100) : 0,
        herfindahlIndex: Math.round(hhi),
        diversificationScore: Math.round(Math.max(0, 100 - hhi / 100)),
      },
      frameworkAgreementUtilization: frameworkUtil,
      maverickSpending: {
        totalMaverick, maverickPercent: totalSpend > 0 ? Math.round((totalMaverick / totalSpend) * 100 * 10) / 10 : 0,
        instances: maverick,
      },
      contractLeakage: {
        totalLeakage, leakagePercent: totalSpend > 0 ? Math.round((totalLeakage / totalSpend) * 100 * 10) / 10 : 0,
        instances: leakage,
      },
      savingsOpportunities,
    };
  }
}
