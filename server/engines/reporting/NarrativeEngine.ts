/**
 * NarrativeEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Report Narrative Generation
 *
 * PHASE 10: Enterprise Reporting
 *
 * Two narrative modes:
 *  1. Rule-based: deterministic text from data patterns (no AI needed)
 *  2. AI-assisted: uses AINarrativeGenerator (Phase A1) for richer prose
 *
 * Rule-based examples:
 *   IF utilization > 90% AND daysRemaining > 60
 *   THEN "Budget is significantly over-utilized relative to remaining time."
 *
 *   IF cashDays < 30
 *   THEN "Cash reserves are critically low at {cashDays} days."
 *
 * Produces structured narrative blocks that can be:
 *  - Embedded in Excel (summary sheet)
 *  - Embedded in PDF (executive summary page)
 *  - Displayed in dashboard UI
 *  - Included in donor submission packages
 *
 * All narratives support EN/AR/IT.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type NarrativeMode = 'rule_based' | 'ai_assisted' | 'hybrid';
export type NarrativeBlockType = 'summary' | 'finding' | 'variance' | 'risk' | 'recommendation' | 'compliance' | 'trend';

export interface NarrativeBlock {
  blockId: string;
  type: NarrativeBlockType;
  priority: number;              // Lower = more important
  textEN: string;
  textAR: string;
  textIT: string;
  severity?: 'info' | 'warning' | 'critical';
  relatedMetric?: string;
  relatedValue?: number;
  source: 'rule' | 'ai';
}

export interface ReportNarrative {
  narrativeId: string;
  reportId: string;
  mode: NarrativeMode;
  blocks: NarrativeBlock[];
  executiveSummaryEN: string;
  executiveSummaryAR: string;
  executiveSummaryIT: string;
  generatedAt: string;
  /** Rule-based narratives don't need review; AI does */
  requiresHumanReview: boolean;
  reviewed: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// NARRATIVE RULE
// ────────────────────────────────────────────────────────────────────────────

export interface NarrativeRule {
  ruleId: string;
  name: string;
  blockType: NarrativeBlockType;
  priority: number;
  /** Condition: field, operator, value */
  condition: {
    field: string;
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'between';
    value: number | [number, number];
  };
  /** Template with {field} placeholders */
  templateEN: string;
  templateAR: string;
  templateIT: string;
  severity?: NarrativeBlock['severity'];
  isActive: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// AI INTEGRATION
// ────────────────────────────────────────────────────────────────────────────

export interface IAINarrativeAdapter {
  generate(
    reportType: string,
    data: Record<string, unknown>,
    locale: 'en' | 'ar' | 'it',
  ): Promise<{
    blocks: Array<{
      type: NarrativeBlockType;
      text: string;
    }>;
    summary: string;
  }>;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class NarrativeEngine {
  private rules: NarrativeRule[] = [];
  private aiAdapter?: IAINarrativeAdapter;
  private logger: ILogger;
  private config: IConfigService;

  constructor(logger: ILogger, config: IConfigService, aiAdapter?: IAINarrativeAdapter) {
    this.logger = logger.child({ service: 'NarrativeEngine' });
    this.config = config;
    this.aiAdapter = aiAdapter;
    this.seedDefaultRules();
  }

  /**
   * Register a narrative rule.
   */
  registerRule(rule: NarrativeRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Generate narrative for a report.
   *
   * @param reportId   Report identifier
   * @param metrics    Flat object of computed metrics (utilization, cashDays, etc.)
   * @param mode       'rule_based' | 'ai_assisted' | 'hybrid'
   */
  async generate(
    reportId: string,
    metrics: Record<string, number>,
    mode: NarrativeMode = 'rule_based',
  ): Promise<ReportNarrative> {
    const blocks: NarrativeBlock[] = [];

    // 1. Rule-based narrative
    if (mode === 'rule_based' || mode === 'hybrid') {
      const ruleBlocks = this.evaluateRules(metrics);
      blocks.push(...ruleBlocks);
    }

    // 2. AI-assisted narrative
    if ((mode === 'ai_assisted' || mode === 'hybrid') && this.aiAdapter) {
      try {
        const aiResultEN = await this.aiAdapter.generate(reportId, metrics, 'en');
        const aiResultAR = await this.aiAdapter.generate(reportId, metrics, 'ar');
        const aiResultIT = await this.aiAdapter.generate(reportId, metrics, 'it');

        for (let i = 0; i < aiResultEN.blocks.length; i++) {
          blocks.push({
            blockId: uuidv4(),
            type: aiResultEN.blocks[i].type,
            priority: 50 + i,
            textEN: aiResultEN.blocks[i].text,
            textAR: aiResultAR.blocks[i]?.text || '',
            textIT: aiResultIT.blocks[i]?.text || '',
            source: 'ai',
          });
        }
      } catch (err) {
        this.logger.error('AI narrative generation failed, falling back to rules', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Sort by priority
    blocks.sort((a, b) => a.priority - b.priority);

    // Build executive summary (top 3 blocks)
    const topBlocks = blocks.slice(0, 3);
    const summaryEN = topBlocks.map(b => b.textEN).join(' ');
    const summaryAR = topBlocks.map(b => b.textAR).join(' ');
    const summaryIT = topBlocks.map(b => b.textIT).join(' ');

    const narrative: ReportNarrative = {
      narrativeId: uuidv4(),
      reportId,
      mode,
      blocks,
      executiveSummaryEN: summaryEN,
      executiveSummaryAR: summaryAR,
      executiveSummaryIT: summaryIT,
      generatedAt: new Date().toISOString(),
      requiresHumanReview: mode !== 'rule_based',
      reviewed: mode === 'rule_based', // Rule-based auto-approved
    };

    this.logger.info('Narrative generated', {
      reportId,
      mode,
      blocks: blocks.length,
      ruleBlocks: blocks.filter(b => b.source === 'rule').length,
      aiBlocks: blocks.filter(b => b.source === 'ai').length,
      requiresReview: narrative.requiresHumanReview,
    });

    return narrative;
  }

  // ── PRIVATE ──

  private evaluateRules(metrics: Record<string, number>): NarrativeBlock[] {
    const blocks: NarrativeBlock[] = [];

    for (const rule of this.rules) {
      if (!rule.isActive) continue;

      const value = metrics[rule.condition.field];
      if (value === undefined) continue;

      const matched = this.evaluateCondition(value, rule.condition);
      if (!matched) continue;

      blocks.push({
        blockId: uuidv4(),
        type: rule.blockType,
        priority: rule.priority,
        textEN: this.interpolate(rule.templateEN, metrics),
        textAR: this.interpolate(rule.templateAR, metrics),
        textIT: this.interpolate(rule.templateIT, metrics),
        severity: rule.severity,
        relatedMetric: rule.condition.field,
        relatedValue: value,
        source: 'rule',
      });
    }

    return blocks;
  }

  private evaluateCondition(
    actual: number,
    cond: NarrativeRule['condition'],
  ): boolean {
    switch (cond.operator) {
      case 'gt': return actual > (cond.value as number);
      case 'lt': return actual < (cond.value as number);
      case 'gte': return actual >= (cond.value as number);
      case 'lte': return actual <= (cond.value as number);
      case 'eq': return actual === (cond.value as number);
      case 'between': {
        const [lo, hi] = cond.value as [number, number];
        return actual >= lo && actual <= hi;
      }
      default: return false;
    }
  }

  private interpolate(template: string, metrics: Record<string, number>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      const val = metrics[key];
      return val !== undefined ? String(Math.round(val * 100) / 100) : `{${key}}`;
    });
  }

  // ── SEED DEFAULT RULES ──

  private seedDefaultRules(): void {
    const rules: NarrativeRule[] = [
      // Budget utilization
      {
        ruleId: 'util_high', name: 'High Utilization', blockType: 'finding', priority: 10,
        condition: { field: 'utilizationPercent', operator: 'gt', value: 90 },
        templateEN: 'Budget utilization has reached {utilizationPercent}%, which is above the 90% threshold.',
        templateAR: 'وصل استخدام الميزانية إلى {utilizationPercent}%، وهو أعلى من عتبة 90%.',
        templateIT: 'L\'utilizzo del budget ha raggiunto il {utilizationPercent}%, sopra la soglia del 90%.',
        severity: 'warning', isActive: true,
      },
      {
        ruleId: 'util_low', name: 'Low Utilization', blockType: 'risk', priority: 15,
        condition: { field: 'utilizationPercent', operator: 'lt', value: 40 },
        templateEN: 'Budget utilization is only {utilizationPercent}%. There is a risk of underspending and returning funds.',
        templateAR: 'استخدام الميزانية فقط {utilizationPercent}%. هناك خطر عدم الإنفاق وإعادة الأموال.',
        templateIT: 'L\'utilizzo del budget è solo del {utilizationPercent}%. Rischio di sottoutilizzo e restituzione fondi.',
        severity: 'warning', isActive: true,
      },
      // Cash position
      {
        ruleId: 'cash_critical', name: 'Critical Cash', blockType: 'risk', priority: 1,
        condition: { field: 'daysOfCash', operator: 'lt', value: 30 },
        templateEN: 'Cash reserves are critically low at {daysOfCash} days. Immediate action required.',
        templateAR: 'الاحتياطيات النقدية منخفضة بشكل حرج عند {daysOfCash} يومًا. مطلوب إجراء فوري.',
        templateIT: 'Le riserve di cassa sono criticamente basse a {daysOfCash} giorni. Azione immediata richiesta.',
        severity: 'critical', isActive: true,
      },
      {
        ruleId: 'cash_good', name: 'Healthy Cash', blockType: 'summary', priority: 5,
        condition: { field: 'daysOfCash', operator: 'gte', value: 90 },
        templateEN: 'Cash position is healthy with {daysOfCash} days of operating reserves.',
        templateAR: 'المركز النقدي صحي مع {daysOfCash} يومًا من الاحتياطيات التشغيلية.',
        templateIT: 'La posizione di cassa è sana con {daysOfCash} giorni di riserve operative.',
        severity: 'info', isActive: true,
      },
      // Forecast accuracy
      {
        ruleId: 'forecast_poor', name: 'Poor Forecast', blockType: 'recommendation', priority: 20,
        condition: { field: 'forecastAccuracy', operator: 'lt', value: 60 },
        templateEN: 'Forecast accuracy is {forecastAccuracy}%. Consider improving methodology using risk-adjusted models.',
        templateAR: 'دقة التوقعات {forecastAccuracy}%. فكر في تحسين المنهجية باستخدام نماذج معدلة للمخاطر.',
        templateIT: 'L\'accuratezza delle previsioni è del {forecastAccuracy}%. Considerare il miglioramento della metodologia.',
        isActive: true,
      },
      // Compliance
      {
        ruleId: 'violations', name: 'Compliance Issues', blockType: 'compliance', priority: 3,
        condition: { field: 'complianceViolations', operator: 'gt', value: 0 },
        templateEN: '{complianceViolations} compliance violation(s) detected. Review required before donor submission.',
        templateAR: 'تم اكتشاف {complianceViolations} مخالفة(مخالفات) للامتثال. مطلوب مراجعة قبل التقديم للمانح.',
        templateIT: '{complianceViolations} violazione/i di conformità rilevata/e. Revisione necessaria.',
        severity: 'critical', isActive: true,
      },
      // Burn rate trend
      {
        ruleId: 'burn_accelerating', name: 'Accelerating Spend', blockType: 'trend', priority: 12,
        condition: { field: 'burnRateChangePercent', operator: 'gt', value: 25 },
        templateEN: 'Spending is accelerating at {burnRateChangePercent}% above previous period average.',
        templateAR: 'الإنفاق يتسارع بنسبة {burnRateChangePercent}% فوق متوسط الفترة السابقة.',
        templateIT: 'La spesa sta accelerando del {burnRateChangePercent}% sopra la media del periodo precedente.',
        severity: 'warning', isActive: true,
      },
    ];

    for (const rule of rules) {
      this.registerRule(rule);
    }
  }
}
