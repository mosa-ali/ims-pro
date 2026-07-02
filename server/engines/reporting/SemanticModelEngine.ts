/**
 * SemanticModelEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Enterprise Semantic Reporting Layer
 *
 * PHASE 10 ENHANCEMENT #1  ★★★★★
 *
 * Instead of:  Repositories → Report
 * Now:         Repositories → Semantic Model → Reporting Engine
 *
 * The semantic layer defines business concepts:
 *   "Available Budget" = Approved − Actual − Committed − Obligated − Reserved
 *   "Burn Rate"        = Total Actual / Days Elapsed
 *   "Utilization"      = (Actual / Approved) × 100
 *   "Cost Recovery"    = (Recovered / Total Indirect) × 100
 *
 * Every report, dashboard, AI query, and export uses the SAME definitions.
 * No more inconsistent calculations across modules.
 *
 * This is a PLATFORM service — consumed by Finance, HR, Procurement, MEAL.
 */

import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type ConceptDomain = 'finance' | 'budget' | 'treasury' | 'procurement' | 'hr' | 'projects' | 'meal' | 'grants' | 'executive';
export type ConceptDataType = 'currency' | 'percentage' | 'number' | 'ratio' | 'days' | 'count';

export interface SemanticConcept {
  conceptId: string;
  name: string;
  nameAR: string;
  nameIT: string;
  domain: ConceptDomain;
  description: string;
  descriptionAR: string;
  descriptionIT: string;
  /** Machine-readable formula */
  formula: string;
  /** Human-readable formula explanation */
  formulaExplanation: string;
  formulaExplanationAR: string;
  formulaExplanationIT: string;
  /** Data type of the result */
  dataType: ConceptDataType;
  /** Default unit */
  unit: string;
  /** Source fields this concept depends on */
  sourceFields: SemanticSourceField[];
  /** Other concepts this depends on */
  dependsOn: string[];
  /** Default thresholds for status indicators */
  thresholds?: {
    excellent?: number;
    good?: number;
    fair?: number;
    poor?: number;
    critical?: number;
    direction: 'higher_is_better' | 'lower_is_better' | 'target_range';
    targetMin?: number;
    targetMax?: number;
  };
  /** IPSAS/GAAP alignment */
  accountingStandard?: 'ipsas' | 'gaap' | 'both';
  /** Owner module */
  owner: ConceptDomain;
  /** Version for change tracking */
  version: number;
  isActive: boolean;
}

export interface SemanticSourceField {
  fieldId: string;
  name: string;
  /** Repository or table the field comes from */
  source: string;
  /** Column or computation path */
  path: string;
  /** How this field participates in the formula */
  role: 'addend' | 'subtrahend' | 'divisor' | 'dividend' | 'multiplier' | 'filter';
}

export interface ConceptValue {
  conceptId: string;
  conceptName: string;
  value: number;
  formattedValue: string;
  unit: string;
  dataType: ConceptDataType;
  status?: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  /** Data lineage: which source values were used */
  sourceValues: Array<{
    fieldId: string;
    fieldName: string;
    value: number;
    source: string;
  }>;
  calculatedAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// DATA RESOLVER
// ────────────────────────────────────────────────────────────────────────────

/**
 * Resolves raw data for semantic concepts from repositories.
 * Each module provides its own resolver.
 */
export interface ISemanticDataResolver {
  readonly domain: ConceptDomain;

  resolveField(
    fieldId: string,
    source: string,
    path: string,
    filters: Record<string, unknown>,
    scope: RepositoryScope,
  ): Promise<number>;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class SemanticModelEngine {
  private concepts = new Map<string, SemanticConcept>();
  private resolvers = new Map<ConceptDomain, ISemanticDataResolver>();
  private logger: ILogger;
  private config: IConfigService;

  constructor(logger: ILogger, config: IConfigService) {
    this.logger = logger.child({ service: 'SemanticModelEngine' });
    this.config = config;
    this.seedCoreConcepts();
  }

  /**
   * Register a domain data resolver.
   */
  registerResolver(resolver: ISemanticDataResolver): void {
    this.resolvers.set(resolver.domain, resolver);
    this.logger.info('Semantic resolver registered', { domain: resolver.domain });
  }

  /**
   * Register or update a concept definition.
   */
  defineConcept(concept: SemanticConcept): void {
    this.concepts.set(concept.conceptId, concept);
    this.logger.info('Semantic concept defined', {
      conceptId: concept.conceptId,
      name: concept.name,
      domain: concept.domain,
    });
  }

  /**
   * Compute a concept's value using registered resolvers.
   * This is THE canonical calculation — all reports call this.
   */
  async compute(
    conceptId: string,
    filters: Record<string, unknown>,
    scope: RepositoryScope,
  ): Promise<ConceptValue> {
    const concept = this.concepts.get(conceptId);
    if (!concept) throw new Error(`Semantic concept '${conceptId}' not found`);

    // Resolve dependent concepts first
    const depValues = new Map<string, number>();
    for (const depId of concept.dependsOn) {
      const depResult = await this.compute(depId, filters, scope);
      depValues.set(depId, depResult.value);
    }

    // Resolve source fields
    const sourceValues: ConceptValue['sourceValues'] = [];
    const fieldValues = new Map<string, number>();

    for (const field of concept.sourceFields) {
      const resolver = this.resolvers.get(concept.domain);
      if (!resolver) {
        throw new Error(`No resolver registered for domain '${concept.domain}'`);
      }

      const value = await resolver.resolveField(
        field.fieldId, field.source, field.path, filters, scope,
      );
      fieldValues.set(field.fieldId, value);
      sourceValues.push({
        fieldId: field.fieldId,
        fieldName: field.name,
        value,
        source: field.source,
      });
    }

    // Evaluate formula
    const value = this.evaluateFormula(concept.formula, fieldValues, depValues);

    // Determine status from thresholds
    const status = concept.thresholds
      ? this.evaluateStatus(value, concept.thresholds)
      : undefined;

    // Format value
    const formatted = this.formatValue(value, concept.dataType, concept.unit);

    return {
      conceptId,
      conceptName: concept.name,
      value: Math.round(value * 100) / 100,
      formattedValue: formatted,
      unit: concept.unit,
      dataType: concept.dataType,
      status,
      sourceValues,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Compute multiple concepts at once (for dashboards).
   */
  async computeMultiple(
    conceptIds: string[],
    filters: Record<string, unknown>,
    scope: RepositoryScope,
  ): Promise<ConceptValue[]> {
    return Promise.all(conceptIds.map(id => this.compute(id, filters, scope)));
  }

  /**
   * Get concept definition (for UI display / documentation).
   */
  getConcept(conceptId: string): SemanticConcept | null {
    return this.concepts.get(conceptId) || null;
  }

  /**
   * List all concepts, optionally filtered by domain.
   */
  listConcepts(domain?: ConceptDomain): SemanticConcept[] {
    const all = [...this.concepts.values()].filter(c => c.isActive);
    return domain ? all.filter(c => c.domain === domain) : all;
  }

  /**
   * Get the formula explanation for a concept (for explainability).
   */
  explainConcept(conceptId: string, locale: 'en' | 'ar' | 'it' = 'en'): string | null {
    const concept = this.concepts.get(conceptId);
    if (!concept) return null;
    switch (locale) {
      case 'ar': return concept.formulaExplanationAR;
      case 'it': return concept.formulaExplanationIT;
      default: return concept.formulaExplanation;
    }
  }

  // ── PRIVATE ──

  private evaluateFormula(
    formula: string,
    fields: Map<string, number>,
    deps: Map<string, number>,
  ): number {
    let expr = formula;

    // Replace field references: ${field:fieldId}
    for (const [id, value] of fields) {
      expr = expr.replace(new RegExp(`\\$\\{field:${id}\\}`, 'g'), String(value));
    }

    // Replace concept references: ${concept:conceptId}
    for (const [id, value] of deps) {
      expr = expr.replace(new RegExp(`\\$\\{concept:${id}\\}`, 'g'), String(value));
    }

    // Safe arithmetic evaluation
    const sanitized = expr.replace(/[^0-9+\-*/().]/g, '');
    if (!sanitized) return 0;
    try {
      const fn = new Function(`return (${sanitized})`);
      const result = fn();
      return typeof result === 'number' && isFinite(result) ? result : 0;
    } catch {
      return 0;
    }
  }

  private evaluateStatus(
    value: number,
    thresholds: NonNullable<SemanticConcept['thresholds']>,
  ): ConceptValue['status'] {
    if (thresholds.direction === 'target_range') {
      if (value >= (thresholds.targetMin || 0) && value <= (thresholds.targetMax || 100)) return 'good';
      return 'poor';
    }

    const isHigherBetter = thresholds.direction === 'higher_is_better';
    const t = thresholds;

    if (isHigherBetter) {
      if (t.excellent !== undefined && value >= t.excellent) return 'excellent';
      if (t.good !== undefined && value >= t.good) return 'good';
      if (t.fair !== undefined && value >= t.fair) return 'fair';
      if (t.poor !== undefined && value >= t.poor) return 'poor';
      return 'critical';
    } else {
      if (t.excellent !== undefined && value <= t.excellent) return 'excellent';
      if (t.good !== undefined && value <= t.good) return 'good';
      if (t.fair !== undefined && value <= t.fair) return 'fair';
      if (t.poor !== undefined && value <= t.poor) return 'poor';
      return 'critical';
    }
  }

  private formatValue(value: number, dataType: ConceptDataType, unit: string): string {
    const rounded = Math.round(value * 100) / 100;
    switch (dataType) {
      case 'currency': return `${rounded.toLocaleString()} ${unit}`;
      case 'percentage': return `${rounded}%`;
      case 'ratio': return `${rounded}:1`;
      case 'days': return `${Math.round(value)} days`;
      case 'count': return `${Math.round(value)}`;
      default: return `${rounded}`;
    }
  }

  // ── SEED CORE FINANCIAL CONCEPTS ──

  private seedCoreConcepts(): void {
    const concepts: Omit<SemanticConcept, 'version' | 'isActive'>[] = [
      {
        conceptId: 'available_budget',
        name: 'Available Budget', nameAR: 'الميزانية المتاحة', nameIT: 'Budget Disponibile',
        domain: 'budget', owner: 'budget',
        description: 'Budget remaining after actual spending, commitments, and obligations',
        descriptionAR: 'الميزانية المتبقية بعد الإنفاق الفعلي والالتزامات',
        descriptionIT: 'Budget rimanente dopo spesa effettiva, impegni e obblighi',
        formula: '${field:approved} - ${field:actual} - ${field:committed} - ${field:obligated} - ${field:reserved}',
        formulaExplanation: 'Available = Approved Budget − Actual Expenditure − Committed (POs) − Obligated (Invoices) − Reserved (Pending Approvals)',
        formulaExplanationAR: 'المتاح = الميزانية المعتمدة − المصروفات الفعلية − الالتزامات − المستحقات − المحجوز',
        formulaExplanationIT: 'Disponibile = Budget Approvato − Spesa Effettiva − Impegnato − Obbligato − Riservato',
        dataType: 'currency', unit: 'USD',
        sourceFields: [
          { fieldId: 'approved', name: 'Approved Budget', source: 'budgets', path: 'totalApprovedAmount', role: 'addend' },
          { fieldId: 'actual', name: 'Actual Expenditure', source: 'journal_lines', path: 'sum(debitAmount)', role: 'subtrahend' },
          { fieldId: 'committed', name: 'Commitments', source: 'budget_commitments', path: 'sum(committedAmount) WHERE status=committed', role: 'subtrahend' },
          { fieldId: 'obligated', name: 'Obligations', source: 'budget_commitments', path: 'sum(obligatedAmount) WHERE status=obligated', role: 'subtrahend' },
          { fieldId: 'reserved', name: 'Reservations', source: 'budget_reservations', path: 'sum(amount) WHERE status=active', role: 'subtrahend' },
        ],
        dependsOn: [],
        thresholds: { excellent: 50, good: 30, fair: 15, poor: 5, direction: 'higher_is_better' },
      },
      {
        conceptId: 'burn_rate_monthly',
        name: 'Monthly Burn Rate', nameAR: 'معدل الإنفاق الشهري', nameIT: 'Tasso di Consumo Mensile',
        domain: 'budget', owner: 'budget',
        description: 'Average monthly expenditure based on actual spending to date',
        descriptionAR: 'متوسط الإنفاق الشهري بناءً على الإنفاق الفعلي حتى الآن',
        descriptionIT: 'Spesa mensile media basata sulla spesa effettiva fino ad oggi',
        formula: '${field:totalActual} / ${field:monthsElapsed}',
        formulaExplanation: 'Monthly Burn Rate = Total Actual Expenditure ÷ Months Elapsed Since Budget Start',
        formulaExplanationAR: 'معدل الإنفاق الشهري = إجمالي المصروفات الفعلية ÷ الأشهر المنقضية',
        formulaExplanationIT: 'Tasso Mensile = Spesa Totale Effettiva ÷ Mesi Trascorsi',
        dataType: 'currency', unit: 'USD',
        sourceFields: [
          { fieldId: 'totalActual', name: 'Total Actual', source: 'budgets', path: 'totalActualAmount', role: 'dividend' },
          { fieldId: 'monthsElapsed', name: 'Months Elapsed', source: 'computed', path: 'DATEDIFF(CURDATE(), periodStart) / 30', role: 'divisor' },
        ],
        dependsOn: [],
      },
      {
        conceptId: 'utilization_percent',
        name: 'Budget Utilization', nameAR: 'نسبة استخدام الميزانية', nameIT: 'Utilizzo del Budget',
        domain: 'budget', owner: 'budget',
        description: 'Percentage of approved budget that has been spent',
        descriptionAR: 'النسبة المئوية من الميزانية المعتمدة التي تم إنفاقها',
        descriptionIT: 'Percentuale del budget approvato speso',
        formula: '(${field:actual} / ${field:approved}) * 100',
        formulaExplanation: 'Utilization = (Actual Expenditure ÷ Approved Budget) × 100',
        formulaExplanationAR: 'الاستخدام = (المصروفات الفعلية ÷ الميزانية المعتمدة) × 100',
        formulaExplanationIT: 'Utilizzo = (Spesa Effettiva ÷ Budget Approvato) × 100',
        dataType: 'percentage', unit: '%',
        sourceFields: [
          { fieldId: 'actual', name: 'Actual Expenditure', source: 'budgets', path: 'totalActualAmount', role: 'dividend' },
          { fieldId: 'approved', name: 'Approved Budget', source: 'budgets', path: 'totalApprovedAmount', role: 'divisor' },
        ],
        dependsOn: [],
        thresholds: { direction: 'target_range', targetMin: 70, targetMax: 100 },
      },
      {
        conceptId: 'days_of_cash',
        name: 'Days of Cash on Hand', nameAR: 'أيام السيولة النقدية', nameIT: 'Giorni di Cassa Disponibili',
        domain: 'treasury', owner: 'treasury',
        description: 'Number of days the organization can operate at current spending rate',
        descriptionAR: 'عدد الأيام التي يمكن للمنظمة العمل بها بمعدل الإنفاق الحالي',
        descriptionIT: 'Giorni di operatività al tasso di spesa corrente',
        formula: '${field:cashBalance} / ${field:dailyExpenditure}',
        formulaExplanation: 'Days of Cash = Total Cash Balance ÷ Average Daily Expenditure (90-day average)',
        formulaExplanationAR: 'أيام السيولة = إجمالي الرصيد النقدي ÷ متوسط الإنفاق اليومي',
        formulaExplanationIT: 'Giorni di Cassa = Saldo Totale ÷ Spesa Giornaliera Media',
        dataType: 'days', unit: 'days',
        sourceFields: [
          { fieldId: 'cashBalance', name: 'Cash Balance', source: 'bank_accounts', path: 'sum(currentBalance)', role: 'dividend' },
          { fieldId: 'dailyExpenditure', name: 'Daily Expenditure', source: 'computed', path: 'avg_daily_expenditure_90d', role: 'divisor' },
        ],
        dependsOn: [],
        thresholds: { excellent: 90, good: 60, fair: 30, poor: 15, direction: 'higher_is_better' },
      },
      {
        conceptId: 'cost_recovery_rate',
        name: 'Cost Recovery Rate', nameAR: 'معدل استرداد التكلفة', nameIT: 'Tasso di Recupero Costi',
        domain: 'finance', owner: 'finance',
        description: 'Percentage of indirect costs recovered from grants',
        descriptionAR: 'النسبة المئوية للتكاليف غير المباشرة المستردة من المنح',
        descriptionIT: 'Percentuale dei costi indiretti recuperati dai contributi',
        formula: '(${field:recovered} / ${field:totalIndirect}) * 100',
        formulaExplanation: 'Cost Recovery = (Indirect Costs Recovered ÷ Total Indirect Costs) × 100',
        formulaExplanationAR: 'استرداد التكلفة = (التكاليف غير المباشرة المستردة ÷ إجمالي التكاليف غير المباشرة) × 100',
        formulaExplanationIT: 'Recupero Costi = (Costi Indiretti Recuperati ÷ Totale Costi Indiretti) × 100',
        dataType: 'percentage', unit: '%',
        sourceFields: [
          { fieldId: 'recovered', name: 'Recovered Indirect', source: 'journal_lines', path: 'sum WHERE account_type=indirect_recovery', role: 'dividend' },
          { fieldId: 'totalIndirect', name: 'Total Indirect', source: 'journal_lines', path: 'sum WHERE account_type=indirect_cost', role: 'divisor' },
        ],
        dependsOn: [],
        thresholds: { excellent: 95, good: 80, fair: 60, poor: 40, direction: 'higher_is_better' },
      },
    ];

    for (const c of concepts) {
      this.defineConcept({ ...c, version: 1, isActive: true });
    }
  }
}
