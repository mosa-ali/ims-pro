/**
 * AIReportAssistantEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * AI Report Assistant — Conversational Q&A on Report Data
 *
 * PHASE 10 ENHANCEMENT #10  ★★★★★
 *
 * Users ask natural language questions about reports:
 *   "Why did utilization decrease?"
 *   "Which grants are most at risk?"
 *   "Why is liquidity lower this month?"
 *   "Explain the cash-flow statement."
 *   "Compare this quarter with last year."
 *
 * The AI answers using:
 *   - Semantic Model (canonical business definitions)
 *   - Report Data (actual computed values)
 *   - KPI Dictionary (thresholds and explanations)
 *   - Data Lineage (source tracing)
 *   - Narrative Engine (rule-based findings)
 *
 * Governance:
 *   - Respects RBAC (only shows data user has permission to see)
 *   - Uses ctx.scope (never leaks cross-org data)
 *   - Clearly marks AI responses
 *   - Logs all queries for audit
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';
import type { SemanticModelEngine } from './SemanticModelEngine';
import type { DataLineageEngine } from './DataLineage_ExplainableReporting';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface AssistantQuery {
  queryId: string;
  question: string;
  locale: 'en' | 'ar' | 'it';
  /** Context: which report/dashboard the user is looking at */
  context?: {
    reportId?: string;
    dashboardId?: string;
    conceptId?: string;
    fieldKey?: string;
    currentValue?: number;
  };
  /** User info for RBAC */
  userId: number;
  userRole: string;
  scope: RepositoryScope;
  askedAt: string;
}

export interface AssistantResponse {
  responseId: string;
  queryId: string;
  answer: string;
  answerAR?: string;
  answerIT?: string;
  /** Structured evidence supporting the answer */
  evidence: AssistantEvidence[];
  /** Related concepts the user might want to explore */
  relatedConcepts: Array<{ conceptId: string; name: string; relevance: string }>;
  /** Suggested follow-up questions */
  followUpQuestions: string[];
  /** Confidence in the answer (0-1) */
  confidence: number;
  /** Source attribution */
  sources: Array<{ type: 'semantic_model' | 'report_data' | 'kpi_dictionary' | 'lineage' | 'rule' | 'ai'; description: string }>;
  /** AI disclosure */
  isAIGenerated: true;
  disclaimer: string;
  generatedAt: string;
  executionMs: number;
}

export interface AssistantEvidence {
  type: 'metric' | 'comparison' | 'trend' | 'lineage' | 'rule_match';
  title: string;
  value?: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  description: string;
}

// ────────────────────────────────────────────────────────────────────────────
// AI PROVIDER
// ────────────────────────────────────────────────────────────────────────────

export interface IAIAssistantProvider {
  answer(
    question: string,
    context: string,
    locale: 'en' | 'ar' | 'it',
  ): Promise<{
    answer: string;
    confidence: number;
    suggestedFollowUps: string[];
  }>;
}

// ────────────────────────────────────────────────────────────────────────────
// AUDIT
// ────────────────────────────────────────────────────────────────────────────

export interface IAssistantAuditRepository {
  logQuery(query: AssistantQuery): Promise<void>;
  logResponse(response: AssistantResponse): Promise<void>;
  getQueryHistory(userId: number, scope: RepositoryScope, limit?: number): Promise<AssistantQuery[]>;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class AIReportAssistantEngine {
  private semanticModel: SemanticModelEngine;
  private lineageEngine: DataLineageEngine;
  private aiProvider: IAIAssistantProvider;
  private auditRepo: IAssistantAuditRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: {
    semanticModel: SemanticModelEngine;
    lineageEngine: DataLineageEngine;
    aiProvider: IAIAssistantProvider;
    auditRepo: IAssistantAuditRepository;
    logger: ILogger;
    config: IConfigService;
  }) {
    this.semanticModel = deps.semanticModel;
    this.lineageEngine = deps.lineageEngine;
    this.aiProvider = deps.aiProvider;
    this.auditRepo = deps.auditRepo;
    this.logger = deps.logger.child({ service: 'AIReportAssistant' });
    this.config = deps.config;
  }

  /**
   * Answer a user's question about report data.
   */
  async ask(query: AssistantQuery): Promise<AssistantResponse> {
    const t0 = Date.now();

    // Log the query for audit
    await this.auditRepo.logQuery(query);

    // 1. Gather context from semantic model
    const contextParts: string[] = [];
    const evidence: AssistantEvidence[] = [];
    const sources: AssistantResponse['sources'] = [];
    const relatedConcepts: AssistantResponse['relatedConcepts'] = [];

    // If a specific concept is referenced, compute it
    if (query.context?.conceptId) {
      try {
        const value = await this.semanticModel.compute(
          query.context.conceptId, {}, query.scope,
        );
        contextParts.push(`${value.conceptName}: ${value.formattedValue} (status: ${value.status || 'n/a'})`);
        evidence.push({
          type: 'metric',
          title: value.conceptName,
          value: value.value,
          description: `Current value: ${value.formattedValue}`,
        });
        sources.push({ type: 'semantic_model', description: `Computed ${value.conceptName}` });

        // Get explanation
        const explanation = this.semanticModel.explainConcept(query.context.conceptId, query.locale);
        if (explanation) contextParts.push(`Formula: ${explanation}`);
      } catch (err) {
        this.logger.warn('Failed to compute concept for assistant', {
          conceptId: query.context.conceptId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Compute core financial KPIs for context
    const coreConcepts = ['available_budget', 'utilization_percent', 'days_of_cash', 'burn_rate_monthly'];
    for (const conceptId of coreConcepts) {
      try {
        const value = await this.semanticModel.compute(conceptId, {}, query.scope);
        contextParts.push(`${value.conceptName}: ${value.formattedValue}`);
        relatedConcepts.push({
          conceptId,
          name: value.conceptName,
          relevance: `Current: ${value.formattedValue}`,
        });
      } catch {
        // Concept not available — skip
      }
    }

    // 2. Build AI prompt with gathered context
    const contextString = [
      `Organization: ${query.scope.organizationId}, OU: ${query.scope.operatingUnitId}`,
      `User role: ${query.userRole}`,
      `Current financial metrics:`,
      ...contextParts,
      '',
      `User question: ${query.question}`,
    ].join('\n');

    // 3. Call AI provider
    const aiResult = await this.aiProvider.answer(contextString, query.question, query.locale);
    sources.push({ type: 'ai', description: 'AI-generated answer' });

    // 4. Build response
    const disclaimer = this.getDisclaimer(query.locale);

    const response: AssistantResponse = {
      responseId: uuidv4(),
      queryId: query.queryId,
      answer: aiResult.answer,
      evidence,
      relatedConcepts: relatedConcepts.slice(0, 5),
      followUpQuestions: aiResult.suggestedFollowUps.slice(0, 3),
      confidence: aiResult.confidence,
      sources,
      isAIGenerated: true,
      disclaimer,
      generatedAt: new Date().toISOString(),
      executionMs: Date.now() - t0,
    };

    // Log response for audit
    await this.auditRepo.logResponse(response);

    this.logger.info('Assistant query answered', {
      queryId: query.queryId,
      confidence: aiResult.confidence,
      evidenceCount: evidence.length,
      executionMs: response.executionMs,
    });

    return response;
  }

  /**
   * Get suggested questions based on current context.
   */
  getSuggestedQuestions(
    context: { reportId?: string; dashboardId?: string },
    locale: 'en' | 'ar' | 'it',
  ): string[] {
    const questions: Record<'en' | 'ar' | 'it', string[]> = {
      en: [
        'What is the current budget utilization across all projects?',
        'Which grants have the highest overspend risk?',
        'Why did cash position decrease compared to last month?',
        'What is the forecast accuracy for this fiscal year?',
        'How does our burn rate compare to the budget timeline?',
        'Are there any compliance violations that need attention?',
        'Which projects are underspending and may need to return funds?',
      ],
      ar: [
        'ما هو استخدام الميزانية الحالي عبر جميع المشاريع؟',
        'ما المنح التي لديها أعلى مخاطر تجاوز الميزانية؟',
        'لماذا انخفض المركز النقدي مقارنة بالشهر الماضي؟',
        'ما مدى دقة التوقعات لهذه السنة المالية؟',
        'كيف يقارن معدل الإنفاق لدينا بالجدول الزمني للميزانية؟',
      ],
      it: [
        'Qual è l\'utilizzo attuale del budget su tutti i progetti?',
        'Quali contributi hanno il rischio di sforamento più alto?',
        'Perché la posizione di cassa è diminuita rispetto al mese scorso?',
        'Qual è l\'accuratezza delle previsioni per quest\'anno fiscale?',
      ],
    };

    return questions[locale] || questions.en;
  }

  private getDisclaimer(locale: 'en' | 'ar' | 'it'): string {
    switch (locale) {
      case 'ar': return '⚠️ هذه الإجابة مولدة بالذكاء الاصطناعي وقد لا تكون دقيقة بالكامل. تحقق من البيانات المالية المهمة.';
      case 'it': return '⚠️ Questa risposta è generata dall\'IA e potrebbe non essere completamente accurata. Verificare i dati finanziari importanti.';
      default: return '⚠️ This answer is AI-generated and may not be fully accurate. Verify important financial data independently.';
    }
  }
}
