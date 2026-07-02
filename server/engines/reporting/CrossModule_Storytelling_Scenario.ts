/**
 * CrossModuleReportEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Cross-Module Reporting (#3) + Executive Storytelling (#4) + Scenario Reporting (#5)
 *
 * PHASE 10 ENHANCEMENTS
 *
 *  #3 ★★★★★ — Unified reports across Finance + Procurement + HR + MEAL + Projects
 *  #4        — Structured executive briefings (board-ready)
 *  #5        — Multi-scenario reporting (actual/budget/forecast/best/expected/worst)
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';
import type { SemanticModelEngine, ConceptValue } from './SemanticModelEngine';

// ════════════════════════════════════════════════════════════════════════════
// #3  CROSS-MODULE REPORTING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Unified cross-domain reports for country directors and HQ.
 *
 *   Projects + Finance + Procurement + HR + MEAL → Unified Executive Report
 *
 * Each module provides a data provider that feeds the cross-module engine.
 */

export interface ICrossModuleDataProvider {
  readonly module: string;
  readonly displayName: string;

  /**
   * Provide summary data for a cross-module report.
   * Returns structured sections specific to this module.
   */
  getSummary(
    filters: Record<string, unknown>,
    scope: RepositoryScope,
  ): Promise<ModuleSummary>;
}

export interface ModuleSummary {
  module: string;
  title: string;
  titleAR: string;
  titleIT: string;
  kpis: Array<{
    name: string;
    nameAR: string;
    nameIT: string;
    value: number;
    unit: string;
    status: 'good' | 'warning' | 'critical';
    trend?: 'up' | 'down' | 'flat';
  }>;
  highlights: string[];
  highlightsAR: string[];
  highlightsIT: string[];
  risks: string[];
  dataAsOf: string;
}

export interface CrossModuleReport {
  reportId: string;
  title: string;
  titleAR: string;
  titleIT: string;
  modules: ModuleSummary[];
  overallStatus: 'healthy' | 'at_risk' | 'critical';
  generatedAt: string;
  organizationId: number;
  period: string;
}

export class CrossModuleReportEngine {
  private providers = new Map<string, ICrossModuleDataProvider>();
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger.child({ service: 'CrossModuleReportEngine' });
  }

  registerProvider(provider: ICrossModuleDataProvider): void {
    this.providers.set(provider.module, provider);
    this.logger.info('Cross-module provider registered', { module: provider.module });
  }

  /**
   * Generate a unified cross-module report.
   */
  async generate(
    modules: string[],
    filters: Record<string, unknown>,
    scope: RepositoryScope,
  ): Promise<CrossModuleReport> {
    const summaries: ModuleSummary[] = [];

    for (const mod of modules) {
      const provider = this.providers.get(mod);
      if (!provider) {
        this.logger.warn('No provider for module', { module: mod });
        continue;
      }

      try {
        const summary = await provider.getSummary(filters, scope);
        summaries.push(summary);
      } catch (err) {
        this.logger.error('Module summary failed', {
          module: mod,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Determine overall status
    const criticalCount = summaries.flatMap(s => s.kpis).filter(k => k.status === 'critical').length;
    const warningCount = summaries.flatMap(s => s.kpis).filter(k => k.status === 'warning').length;
    const overallStatus = criticalCount > 0 ? 'critical' as const
      : warningCount > 2 ? 'at_risk' as const : 'healthy' as const;

    this.logger.info('Cross-module report generated', {
      modules: summaries.length,
      overallStatus,
    });

    return {
      reportId: uuidv4(),
      title: 'Integrated Management Report',
      titleAR: 'تقرير الإدارة المتكاملة',
      titleIT: 'Report di Gestione Integrata',
      modules: summaries,
      overallStatus,
      generatedAt: new Date().toISOString(),
      organizationId: scope.organizationId,
      period: new Date().toISOString().slice(0, 7),
    };
  }

  getRegisteredModules(): string[] {
    return [...this.providers.keys()];
  }
}


// ════════════════════════════════════════════════════════════════════════════
// #4  EXECUTIVE STORYTELLING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Structured executive briefings — board-ready format.
 *
 *   Financial Health → Key Achievements → Risks →
 *   Opportunities → Recommended Actions
 */

export interface ExecutiveBriefing {
  briefingId: string;
  title: string;
  period: string;
  generatedAt: string;

  sections: BriefingSection[];

  overallAssessment: string;
  overallAssessmentAR: string;
  overallAssessmentIT: string;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export type BriefingSectionType =
  | 'financial_health'
  | 'key_achievements'
  | 'risks'
  | 'opportunities'
  | 'recommended_actions'
  | 'operational_update'
  | 'compliance_status';

export interface BriefingSection {
  sectionId: string;
  type: BriefingSectionType;
  title: string;
  titleAR: string;
  titleIT: string;
  order: number;
  items: BriefingItem[];
  summaryText: string;
  summaryTextAR: string;
  summaryTextIT: string;
}

export interface BriefingItem {
  text: string;
  textAR: string;
  textIT: string;
  severity?: 'info' | 'warning' | 'critical';
  metric?: { name: string; value: number; unit: string };
  source: 'data' | 'rule' | 'ai';
}

export class ExecutiveStorytellingEngine {
  private semanticModel: SemanticModelEngine;
  private logger: ILogger;

  constructor(semanticModel: SemanticModelEngine, logger: ILogger) {
    this.semanticModel = semanticModel;
    this.logger = logger.child({ service: 'ExecutiveStorytelling' });
  }

  /**
   * Generate a structured executive briefing.
   */
  async generate(
    conceptIds: string[],
    filters: Record<string, unknown>,
    scope: RepositoryScope,
  ): Promise<ExecutiveBriefing> {
    // Compute all semantic concepts
    const values = await this.semanticModel.computeMultiple(conceptIds, filters, scope);
    const valueMap = new Map(values.map(v => [v.conceptId, v]));

    const sections: BriefingSection[] = [
      this.buildFinancialHealth(valueMap),
      this.buildKeyAchievements(valueMap),
      this.buildRisks(valueMap),
      this.buildOpportunities(valueMap),
      this.buildRecommendations(valueMap),
    ];

    // Overall assessment
    const criticalItems = sections.flatMap(s => s.items).filter(i => i.severity === 'critical');
    const assessment = criticalItems.length === 0
      ? 'The organization is in a healthy financial and operational position.'
      : `${criticalItems.length} critical issue(s) require immediate attention.`;

    this.logger.info('Executive briefing generated', {
      sections: sections.length,
      totalItems: sections.reduce((s, sec) => s + sec.items.length, 0),
      criticalItems: criticalItems.length,
    });

    return {
      briefingId: uuidv4(),
      title: 'Executive Briefing',
      period: new Date().toISOString().slice(0, 7),
      generatedAt: new Date().toISOString(),
      sections,
      overallAssessment: assessment,
      overallAssessmentAR: assessment, // In production: translate
      overallAssessmentIT: assessment,
      confidenceLevel: criticalItems.length === 0 ? 'high' : criticalItems.length <= 2 ? 'medium' : 'low',
    };
  }

  private buildFinancialHealth(values: Map<string, ConceptValue>): BriefingSection {
    const items: BriefingItem[] = [];

    const cash = values.get('days_of_cash');
    if (cash) {
      items.push({
        text: `Cash position: ${cash.formattedValue} of operating reserves.`,
        textAR: `المركز النقدي: ${cash.formattedValue} من الاحتياطيات التشغيلية.`,
        textIT: `Posizione di cassa: ${cash.formattedValue} di riserve operative.`,
        severity: cash.status === 'critical' ? 'critical' : cash.status === 'poor' ? 'warning' : 'info',
        metric: { name: cash.conceptName, value: cash.value, unit: cash.unit },
        source: 'data',
      });
    }

    const util = values.get('utilization_percent');
    if (util) {
      items.push({
        text: `Budget utilization is at ${util.formattedValue}.`,
        textAR: `استخدام الميزانية عند ${util.formattedValue}.`,
        textIT: `L'utilizzo del budget è al ${util.formattedValue}.`,
        severity: util.status === 'poor' || util.status === 'critical' ? 'warning' : 'info',
        metric: { name: util.conceptName, value: util.value, unit: util.unit },
        source: 'data',
      });
    }

    return {
      sectionId: uuidv4(), type: 'financial_health',
      title: 'Financial Health', titleAR: 'الصحة المالية', titleIT: 'Salute Finanziaria',
      order: 1, items,
      summaryText: items.map(i => i.text).join(' '),
      summaryTextAR: items.map(i => i.textAR).join(' '),
      summaryTextIT: items.map(i => i.textIT).join(' '),
    };
  }

  private buildKeyAchievements(values: Map<string, ConceptValue>): BriefingSection {
    const items: BriefingItem[] = [];

    for (const [, v] of values) {
      if (v.status === 'excellent') {
        items.push({
          text: `${v.conceptName} is performing excellently at ${v.formattedValue}.`,
          textAR: `${v.conceptName} يؤدي بشكل ممتاز عند ${v.formattedValue}.`,
          textIT: `${v.conceptName} sta performando eccellentemente a ${v.formattedValue}.`,
          severity: 'info',
          metric: { name: v.conceptName, value: v.value, unit: v.unit },
          source: 'data',
        });
      }
    }

    return {
      sectionId: uuidv4(), type: 'key_achievements',
      title: 'Key Achievements', titleAR: 'الإنجازات الرئيسية', titleIT: 'Risultati Chiave',
      order: 2, items,
      summaryText: items.length > 0 ? items.map(i => i.text).join(' ') : 'No standout achievements in this period.',
      summaryTextAR: items.length > 0 ? items.map(i => i.textAR).join(' ') : 'لا إنجازات بارزة في هذه الفترة.',
      summaryTextIT: items.length > 0 ? items.map(i => i.textIT).join(' ') : 'Nessun risultato di rilievo in questo periodo.',
    };
  }

  private buildRisks(values: Map<string, ConceptValue>): BriefingSection {
    const items: BriefingItem[] = [];
    for (const [, v] of values) {
      if (v.status === 'critical' || v.status === 'poor') {
        items.push({
          text: `${v.conceptName} at ${v.formattedValue} is below acceptable levels.`,
          textAR: `${v.conceptName} عند ${v.formattedValue} أقل من المستويات المقبولة.`,
          textIT: `${v.conceptName} a ${v.formattedValue} è sotto i livelli accettabili.`,
          severity: v.status === 'critical' ? 'critical' : 'warning',
          metric: { name: v.conceptName, value: v.value, unit: v.unit },
          source: 'data',
        });
      }
    }

    return {
      sectionId: uuidv4(), type: 'risks',
      title: 'Risks & Issues', titleAR: 'المخاطر والمشكلات', titleIT: 'Rischi e Problemi',
      order: 3, items,
      summaryText: items.length > 0 ? `${items.length} risk(s) identified.` : 'No significant risks identified.',
      summaryTextAR: items.length > 0 ? `تم تحديد ${items.length} مخاطر.` : 'لم يتم تحديد مخاطر كبيرة.',
      summaryTextIT: items.length > 0 ? `${items.length} rischio/i identificato/i.` : 'Nessun rischio significativo.',
    };
  }

  private buildOpportunities(_values: Map<string, ConceptValue>): BriefingSection {
    return {
      sectionId: uuidv4(), type: 'opportunities',
      title: 'Opportunities', titleAR: 'الفرص', titleIT: 'Opportunità',
      order: 4, items: [],
      summaryText: 'Opportunities are assessed quarterly.',
      summaryTextAR: 'يتم تقييم الفرص كل ربع سنة.',
      summaryTextIT: 'Le opportunità vengono valutate trimestralmente.',
    };
  }

  private buildRecommendations(values: Map<string, ConceptValue>): BriefingSection {
    const items: BriefingItem[] = [];
    for (const [, v] of values) {
      if (v.status === 'critical') {
        items.push({
          text: `Immediate action required for ${v.conceptName}.`,
          textAR: `مطلوب إجراء فوري بشأن ${v.conceptName}.`,
          textIT: `Azione immediata richiesta per ${v.conceptName}.`,
          severity: 'critical', source: 'rule',
        });
      }
    }

    return {
      sectionId: uuidv4(), type: 'recommended_actions',
      title: 'Recommended Actions', titleAR: 'الإجراءات الموصى بها', titleIT: 'Azioni Raccomandate',
      order: 5, items,
      summaryText: items.length > 0 ? `${items.length} action(s) recommended.` : 'No immediate actions required.',
      summaryTextAR: items.length > 0 ? `${items.length} إجراء(ات) موصى بها.` : 'لا إجراءات فورية مطلوبة.',
      summaryTextIT: items.length > 0 ? `${items.length} azione/i raccomandata/e.` : 'Nessuna azione immediata richiesta.',
    };
  }
}


// ════════════════════════════════════════════════════════════════════════════
// #5  SCENARIO REPORTING
// ════════════════════════════════════════════════════════════════════════════

export type ScenarioType = 'actual' | 'budget' | 'forecast' | 'best_case' | 'expected' | 'worst_case';

export interface ScenarioColumn {
  scenario: ScenarioType;
  label: string;
  labelAR: string;
  labelIT: string;
  value: number;
}

export interface ScenarioReportRow {
  rowKey: string;
  label: string;
  labelAR?: string;
  scenarios: ScenarioColumn[];
  varianceBudgetVsActual?: number;
  varianceForecastVsActual?: number;
}

export interface ScenarioReport {
  reportId: string;
  title: string;
  scenarios: ScenarioType[];
  rows: ScenarioReportRow[];
  totals: Record<ScenarioType, number>;
  generatedAt: string;
}

export interface IScenarioDataProvider {
  getData(
    scenario: ScenarioType,
    filters: Record<string, unknown>,
    scope: RepositoryScope,
  ): Promise<Array<{ key: string; label: string; labelAR?: string; value: number }>>;
}

export class ScenarioReportingEngine {
  private provider: IScenarioDataProvider;
  private logger: ILogger;

  constructor(provider: IScenarioDataProvider, logger: ILogger) {
    this.provider = provider;
    this.logger = logger.child({ service: 'ScenarioReporting' });
  }

  async generate(
    scenarios: ScenarioType[],
    filters: Record<string, unknown>,
    scope: RepositoryScope,
  ): Promise<ScenarioReport> {
    const scenarioLabels: Record<ScenarioType, { en: string; ar: string; it: string }> = {
      actual: { en: 'Actual', ar: 'الفعلي', it: 'Consuntivo' },
      budget: { en: 'Budget', ar: 'الميزانية', it: 'Budget' },
      forecast: { en: 'Forecast', ar: 'التوقعات', it: 'Previsione' },
      best_case: { en: 'Best Case', ar: 'أفضل حالة', it: 'Caso Migliore' },
      expected: { en: 'Expected', ar: 'المتوقع', it: 'Atteso' },
      worst_case: { en: 'Worst Case', ar: 'أسوأ حالة', it: 'Caso Peggiore' },
    };

    // Fetch data for each scenario
    const scenarioData = new Map<ScenarioType, Map<string, { label: string; labelAR?: string; value: number }>>();
    const allKeys = new Set<string>();

    for (const scenario of scenarios) {
      const data = await this.provider.getData(scenario, filters, scope);
      const map = new Map(data.map(d => [d.key, d]));
      scenarioData.set(scenario, map);
      data.forEach(d => allKeys.add(d.key));
    }

    // Build rows
    const rows: ScenarioReportRow[] = [...allKeys].map(key => {
      const firstData = [...scenarioData.values()].find(m => m.has(key))?.get(key);
      const scenarioCols: ScenarioColumn[] = scenarios.map(s => {
        const labels = scenarioLabels[s];
        return {
          scenario: s,
          label: labels.en, labelAR: labels.ar, labelIT: labels.it,
          value: scenarioData.get(s)?.get(key)?.value || 0,
        };
      });

      const actual = scenarioCols.find(c => c.scenario === 'actual')?.value || 0;
      const budget = scenarioCols.find(c => c.scenario === 'budget')?.value || 0;
      const forecast = scenarioCols.find(c => c.scenario === 'forecast')?.value || 0;

      return {
        rowKey: key,
        label: firstData?.label || key,
        labelAR: firstData?.labelAR,
        scenarios: scenarioCols,
        varianceBudgetVsActual: budget !== 0 ? Math.round((actual - budget) * 100) / 100 : undefined,
        varianceForecastVsActual: forecast !== 0 ? Math.round((actual - forecast) * 100) / 100 : undefined,
      };
    });

    // Totals per scenario
    const totals: Record<string, number> = {};
    for (const s of scenarios) {
      totals[s] = Math.round(rows.reduce((sum, r) => {
        const col = r.scenarios.find(c => c.scenario === s);
        return sum + (col?.value || 0);
      }, 0) * 100) / 100;
    }

    this.logger.info('Scenario report generated', {
      scenarios: scenarios.length, rows: rows.length,
    });

    return {
      reportId: uuidv4(),
      title: 'Scenario Analysis',
      scenarios,
      rows,
      totals: totals as Record<ScenarioType, number>,
      generatedAt: new Date().toISOString(),
    };
  }
}
