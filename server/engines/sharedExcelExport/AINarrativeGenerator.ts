/**
 * AINarrativeGenerator.ts
 * ────────────────────────────────────────────────────────────────────────────
 * AI-Generated Report Narrative Summaries
 *
 * ENTERPRISE REPORTING & DOCUMENT GENERATION PLATFORM
 * Enhancement #10
 *
 * Example output:
 *   "Budget utilization reached 86% during the reporting period.
 *    Expenditure remains within approved limits. Procurement
 *    commitments increased by 12%, while cash availability
 *    remains sufficient for the next quarter."
 *
 * Capabilities:
 *  - Generate report summary
 *  - Explain key variances
 *  - Highlight risks
 *  - Highlight missing data
 *  - Donor-friendly narrative
 *  - English, Arabic, Italian
 *  - CLEARLY marked as AI-generated
 *  - Requires human review before official donor submission
 *
 * Integration: Called by ReportExportOrchestrator optionally.
 * Output embedded in Excel (separate sheet) or PDF (summary page).
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type NarrativeStatus = 'generated' | 'reviewed' | 'approved' | 'rejected';
export type NarrativeLocale = 'en' | 'ar' | 'it';

export interface NarrativeRequest {
  reportId: string;
  reportName: string;
  data: Record<string, unknown>[];
  filters: Record<string, unknown>;
  locale: NarrativeLocale;
  donorName?: string;
  /** Additional context for the AI */
  context?: {
    fiscalYear?: string;
    periodName?: string;
    projectName?: string;
    grantName?: string;
    totalBudget?: number;
    totalActual?: number;
    totalCommitted?: number;
    burnRate?: number;
    daysRemaining?: number;
  };
  scope: RepositoryScope;
  requestedBy: number;
}

export interface NarrativeResult {
  narrativeId: string;
  reportId: string;
  locale: NarrativeLocale;
  status: NarrativeStatus;

  // Generated content
  summary: string;
  keyFindings: string[];
  variances: string[];
  risks: string[];
  missingData: string[];
  recommendations: string[];

  // Full narrative text
  fullNarrative: string;

  // AI metadata
  aiModel: string;
  aiConfidence: number;       // 0-1
  generatedAt: string;
  generatedBy: number;
  generationDurationMs: number;

  // Human review
  isAIGenerated: true;
  requiresHumanReview: true;
  reviewedBy?: number;
  reviewedAt?: string;
  reviewComments?: string;
  approved: boolean;

  // Disclaimer (always included in output)
  disclaimer: string;
}

// ────────────────────────────────────────────────────────────────────────────
// AI PROVIDER INTERFACE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Pluggable AI provider — swap between OpenAI, Anthropic, Azure AI, etc.
 */
export interface IAINarrativeProvider {
  readonly providerId: string;
  readonly modelName: string;

  generateNarrative(
    prompt: string,
    locale: NarrativeLocale,
    maxTokens?: number,
  ): Promise<{
    text: string;
    confidence: number;
    tokensUsed: number;
    durationMs: number;
  }>;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface INarrativeRepository {
  save(result: NarrativeResult): Promise<void>;
  getById(narrativeId: string): Promise<NarrativeResult | null>;
  getByExport(reportId: string, scope: RepositoryScope): Promise<NarrativeResult[]>;
  updateReview(narrativeId: string, reviewedBy: number, approved: boolean, comments?: string): Promise<void>;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class AINarrativeGenerator {
  private provider: IAINarrativeProvider;
  private repo: INarrativeRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: {
    provider: IAINarrativeProvider;
    narrativeRepo: INarrativeRepository;
    logger: ILogger;
    config: IConfigService;
  }) {
    this.provider = deps.provider;
    this.repo = deps.narrativeRepo;
    this.logger = deps.logger.child({ service: 'AINarrativeGenerator' });
    this.config = deps.config;
  }

  /**
   * Generate a narrative summary for a report.
   */
  async generate(request: NarrativeRequest): Promise<NarrativeResult> {
    const narrativeId = uuidv4();
    const t0 = Date.now();

    // Build structured prompt
    const prompt = this.buildPrompt(request);

    // Call AI provider
    const aiResult = await this.provider.generateNarrative(
      prompt,
      request.locale,
      this.config.getNumber('ai.narrative.maxTokens', 2000),
    );

    // Parse AI output into structured sections
    const parsed = this.parseNarrative(aiResult.text);

    const disclaimer = this.getDisclaimer(request.locale);

    const result: NarrativeResult = {
      narrativeId,
      reportId: request.reportId,
      locale: request.locale,
      status: 'generated',
      summary: parsed.summary,
      keyFindings: parsed.keyFindings,
      variances: parsed.variances,
      risks: parsed.risks,
      missingData: parsed.missingData,
      recommendations: parsed.recommendations,
      fullNarrative: `${disclaimer}\n\n${parsed.summary}\n\n${parsed.keyFindings.map(f => `• ${f}`).join('\n')}`,
      aiModel: this.provider.modelName,
      aiConfidence: aiResult.confidence,
      generatedAt: new Date().toISOString(),
      generatedBy: request.requestedBy,
      generationDurationMs: Date.now() - t0,
      isAIGenerated: true,
      requiresHumanReview: true,
      approved: false,
      disclaimer,
    };

    await this.repo.save(result);

    this.logger.info('AI narrative generated', {
      narrativeId,
      reportId: request.reportId,
      locale: request.locale,
      confidence: aiResult.confidence,
      durationMs: result.generationDurationMs,
    });

    return result;
  }

  /**
   * Human reviews and approves/rejects the narrative.
   * REQUIRED before inclusion in official donor submissions.
   */
  async review(
    narrativeId: string,
    reviewedBy: number,
    approved: boolean,
    comments?: string,
  ): Promise<void> {
    await this.repo.updateReview(narrativeId, reviewedBy, approved, comments);

    this.logger.info('Narrative reviewed', {
      narrativeId,
      reviewedBy,
      approved,
    });
  }

  // ── PRIVATE ──

  private buildPrompt(request: NarrativeRequest): string {
    const ctx = request.context || {};
    const localeName = request.locale === 'ar' ? 'Arabic' : request.locale === 'it' ? 'Italian' : 'English';

    return [
      `Generate a financial report narrative summary in ${localeName}.`,
      `Report: ${request.reportName}`,
      ctx.projectName ? `Project: ${ctx.projectName}` : '',
      ctx.grantName ? `Grant: ${ctx.grantName}` : '',
      ctx.fiscalYear ? `Fiscal Year: ${ctx.fiscalYear}` : '',
      ctx.periodName ? `Period: ${ctx.periodName}` : '',
      ctx.totalBudget ? `Total Budget: ${ctx.totalBudget}` : '',
      ctx.totalActual ? `Total Actual: ${ctx.totalActual}` : '',
      ctx.totalCommitted ? `Total Committed: ${ctx.totalCommitted}` : '',
      ctx.burnRate ? `Burn Rate: ${ctx.burnRate}%` : '',
      ctx.daysRemaining ? `Days Remaining: ${ctx.daysRemaining}` : '',
      request.donorName ? `Donor: ${request.donorName}` : '',
      '',
      `Data rows: ${request.data.length}`,
      `Filters: ${JSON.stringify(request.filters)}`,
      '',
      'Provide:',
      '1. SUMMARY: 2-3 sentence executive summary',
      '2. KEY FINDINGS: 3-5 bullet points',
      '3. VARIANCES: Notable budget vs actual variances',
      '4. RISKS: Any financial risks identified',
      '5. MISSING DATA: Any data gaps noticed',
      '6. RECOMMENDATIONS: 2-3 actionable recommendations',
      '',
      'Keep the tone professional, concise, and donor-appropriate.',
    ].filter(Boolean).join('\n');
  }

  private parseNarrative(text: string): {
    summary: string;
    keyFindings: string[];
    variances: string[];
    risks: string[];
    missingData: string[];
    recommendations: string[];
  } {
    // Simple parsing — production would use structured output from AI
    const sections = text.split(/\n(?=\d\.|SUMMARY|KEY FINDINGS|VARIANCES|RISKS|MISSING|RECOMMENDATIONS)/i);

    return {
      summary: sections[0]?.trim() || text.slice(0, 300),
      keyFindings: this.extractBullets(text, 'KEY FINDINGS'),
      variances: this.extractBullets(text, 'VARIANCES'),
      risks: this.extractBullets(text, 'RISKS'),
      missingData: this.extractBullets(text, 'MISSING'),
      recommendations: this.extractBullets(text, 'RECOMMENDATIONS'),
    };
  }

  private extractBullets(text: string, section: string): string[] {
    const regex = new RegExp(`${section}[:\\s]*\\n([\\s\\S]*?)(?=\\n[A-Z]|$)`, 'i');
    const match = text.match(regex);
    if (!match) return [];
    return match[1]
      .split('\n')
      .map(line => line.replace(/^[-•*\d.]\s*/, '').trim())
      .filter(Boolean);
  }

  private getDisclaimer(locale: NarrativeLocale): string {
    switch (locale) {
      case 'ar':
        return '⚠️ تم إنشاء هذا الملخص بواسطة الذكاء الاصطناعي ويتطلب مراجعة بشرية قبل الاستخدام الرسمي.';
      case 'it':
        return '⚠️ Questo riepilogo è stato generato dall\'intelligenza artificiale e richiede una revisione umana prima dell\'uso ufficiale.';
      default:
        return '⚠️ This summary was generated by AI and requires human review before official use.';
    }
  }
}
