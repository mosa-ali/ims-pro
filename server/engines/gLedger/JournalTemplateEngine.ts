/**
 * JournalTemplateEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Journal Templates and Recurring Journals
 *
 * PHASE 4: GL Modernization
 *
 * Templates: Reusable journal entry patterns (e.g., monthly rent, payroll)
 * Recurring: Auto-generate journal entries on a schedule from templates
 *
 * Templates store the PATTERN (accounts, descriptions, dimensions).
 * Amounts can be fixed or parameterized (filled at generation time).
 *
 * All generated entries are created via journalEntriesRouter.create
 * (never bypasses existing posting logic).
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';
import type { JournalEntryInput, JournalLineInput } from './GeneralLedgerEngine';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';
export type AmountMode = 'fixed' | 'parameterized' | 'percentage';

export interface JournalTemplateLine {
  lineNumber: number;
  glAccountId: number;
  description: string;
  descriptionAr?: string;
  amountMode: AmountMode;
  fixedDebitAmount?: string;
  fixedCreditAmount?: string;
  /** For parameterized: name of the parameter (e.g., "rentAmount") */
  parameterName?: string;
  /** For percentage: percentage of a base amount */
  percentage?: number;
  projectId?: number;
  grantId?: number;
  activityId?: number;
  costCenterId?: number;
}

export interface JournalTemplate {
  templateId: string;
  organizationId: number;
  operatingUnitId: number;
  name: string;
  nameAr?: string;
  description: string;
  descriptionAr?: string;
  entryType: 'standard' | 'adjusting' | 'closing' | 'reversing' | 'opening';
  sourceModule: string;
  lines: JournalTemplateLine[];
  parameters: TemplateParameter[];
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateParameter {
  name: string;
  label: string;
  type: 'amount' | 'date' | 'string' | 'number';
  required: boolean;
  defaultValue?: string;
}

export interface RecurringJournalSchedule {
  scheduleId: string;
  templateId: string;
  organizationId: number;
  operatingUnitId: number;
  frequency: RecurrenceFrequency;
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  lastRunDate?: string;
  lastGeneratedEntryId?: number;
  parameterValues: Record<string, string>;
  isActive: boolean;
  runCount: number;
  maxRuns?: number;
  createdBy: number;
  createdAt: string;
}

export interface GeneratedEntry {
  scheduleId: string;
  templateId: string;
  journalEntryInput: JournalEntryInput;
  generatedAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IJournalTemplateRepository {
  saveTemplate(template: JournalTemplate): Promise<void>;
  getTemplate(templateId: string, scope: RepositoryScope): Promise<JournalTemplate | null>;
  listTemplates(scope: RepositoryScope): Promise<JournalTemplate[]>;
  updateTemplate(templateId: string, fields: Partial<JournalTemplate>): Promise<void>;
  deleteTemplate(templateId: string, scope: RepositoryScope): Promise<void>;

  saveSchedule(schedule: RecurringJournalSchedule): Promise<void>;
  getSchedule(scheduleId: string, scope: RepositoryScope): Promise<RecurringJournalSchedule | null>;
  listDueSchedules(asOfDate: string): Promise<RecurringJournalSchedule[]>;
  updateSchedule(scheduleId: string, fields: Partial<RecurringJournalSchedule>): Promise<void>;
}

export interface JournalTemplateEngineDependencies {
  templateRepo: IJournalTemplateRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class JournalTemplateEngine {
  private repo: IJournalTemplateRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: JournalTemplateEngineDependencies) {
    this.repo = deps.templateRepo;
    this.logger = deps.logger.child({ service: 'JournalTemplateEngine' });
    this.config = deps.config;
  }

  // ── TEMPLATE MANAGEMENT ──

  async createTemplate(
    input: Omit<JournalTemplate, 'templateId' | 'createdAt' | 'updatedAt'>,
  ): Promise<JournalTemplate> {
    const template: JournalTemplate = {
      ...input,
      templateId: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Validate lines
    if (template.lines.length < 2) {
      throw new Error('Template must have at least 2 lines');
    }

    // Validate that fixed-amount templates balance
    const fixedLines = template.lines.filter(l => l.amountMode === 'fixed');
    if (fixedLines.length === template.lines.length) {
      const totalDr = fixedLines.reduce((s, l) => s + parseFloat(l.fixedDebitAmount || '0'), 0);
      const totalCr = fixedLines.reduce((s, l) => s + parseFloat(l.fixedCreditAmount || '0'), 0);
      if (Math.abs(totalDr - totalCr) > 0.01) {
        throw new Error(`Fixed-amount template out of balance: DR ${totalDr} ≠ CR ${totalCr}`);
      }
    }

    await this.repo.saveTemplate(template);
    this.logger.info('Template created', { templateId: template.templateId, name: template.name });
    return template;
  }

  async getTemplate(templateId: string, scope: RepositoryScope): Promise<JournalTemplate | null> {
    return this.repo.getTemplate(templateId, scope);
  }

  async listTemplates(scope: RepositoryScope): Promise<JournalTemplate[]> {
    return this.repo.listTemplates(scope);
  }

  // ── GENERATE ENTRY FROM TEMPLATE ──

  /**
   * Generate a journal entry input from a template.
   * Returns the input ready for journalEntriesRouter.create (not posted yet).
   */
  async generateFromTemplate(
    templateId: string,
    entryDate: string,
    parameterValues: Record<string, string>,
    scope: RepositoryScope,
  ): Promise<JournalEntryInput> {
    const template = await this.repo.getTemplate(templateId, scope);
    if (!template) throw new Error(`Template ${templateId} not found`);
    if (!template.isActive) throw new Error(`Template ${templateId} is inactive`);

    // Validate required parameters
    for (const param of template.parameters) {
      if (param.required && !parameterValues[param.name] && !param.defaultValue) {
        throw new Error(`Required parameter '${param.name}' missing`);
      }
    }

    // Resolve line amounts
    const lines: JournalLineInput[] = template.lines.map(tl => {
      let debit = '0.00';
      let credit = '0.00';

      switch (tl.amountMode) {
        case 'fixed':
          debit = tl.fixedDebitAmount || '0.00';
          credit = tl.fixedCreditAmount || '0.00';
          break;

        case 'parameterized': {
          const value = parameterValues[tl.parameterName || ''] || '0.00';
          if (tl.fixedDebitAmount !== undefined && parseFloat(tl.fixedDebitAmount) > 0) {
            debit = value;
          } else {
            credit = value;
          }
          break;
        }

        case 'percentage': {
          const baseAmount = parseFloat(parameterValues['baseAmount'] || '0');
          const pctAmount = (baseAmount * (tl.percentage || 0) / 100).toFixed(2);
          if (tl.fixedDebitAmount !== undefined && parseFloat(tl.fixedDebitAmount || '0') > 0) {
            debit = pctAmount;
          } else {
            credit = pctAmount;
          }
          break;
        }
      }

      return {
        lineNumber: tl.lineNumber,
        glAccountId: tl.glAccountId,
        description: tl.description,
        descriptionAr: tl.descriptionAr,
        debitAmount: debit,
        creditAmount: credit,
        dimensions: {
          projectId: tl.projectId,
          grantId: tl.grantId,
          activityId: tl.activityId,
          costCenterId: tl.costCenterId,
        },
      };
    });

    this.logger.info('Entry generated from template', {
      templateId,
      entryDate,
      lineCount: lines.length,
    });

    return {
      entryDate,
      entryType: template.entryType,
      sourceModule: template.sourceModule as JournalEntryInput['sourceModule'],
      description: template.description,
      descriptionAr: template.descriptionAr,
      lines,
    };
  }

  // ── RECURRING JOURNAL MANAGEMENT ──

  async createSchedule(
    input: Omit<RecurringJournalSchedule, 'scheduleId' | 'createdAt' | 'runCount' | 'lastRunDate' | 'lastGeneratedEntryId'>,
  ): Promise<RecurringJournalSchedule> {
    const schedule: RecurringJournalSchedule = {
      ...input,
      scheduleId: uuidv4(),
      createdAt: new Date().toISOString(),
      runCount: 0,
    };

    await this.repo.saveSchedule(schedule);
    this.logger.info('Recurring schedule created', {
      scheduleId: schedule.scheduleId,
      templateId: schedule.templateId,
      frequency: schedule.frequency,
    });
    return schedule;
  }

  /**
   * Process all due recurring schedules.
   * Called by scheduler (cron job) or manually.
   * Returns entries ready for journalEntriesRouter.create.
   */
  async processDueSchedules(asOfDate: string): Promise<GeneratedEntry[]> {
    const dueSchedules = await this.repo.listDueSchedules(asOfDate);
    const generated: GeneratedEntry[] = [];

    for (const schedule of dueSchedules) {
      if (!schedule.isActive) continue;
      if (schedule.maxRuns && schedule.runCount >= schedule.maxRuns) continue;
      if (schedule.endDate && asOfDate > schedule.endDate) continue;

      try {
        const scope: RepositoryScope = {
          organizationId: schedule.organizationId,
          operatingUnitId: schedule.operatingUnitId,
        };

        const entry = await this.generateFromTemplate(
          schedule.templateId,
          schedule.nextRunDate,
          schedule.parameterValues,
          scope,
        );

        generated.push({
          scheduleId: schedule.scheduleId,
          templateId: schedule.templateId,
          journalEntryInput: entry,
          generatedAt: new Date().toISOString(),
        });

        // Update schedule
        await this.repo.updateSchedule(schedule.scheduleId, {
          lastRunDate: asOfDate,
          nextRunDate: this.calculateNextRunDate(schedule.nextRunDate, schedule.frequency),
          runCount: schedule.runCount + 1,
        });

        this.logger.info('Recurring journal generated', {
          scheduleId: schedule.scheduleId,
          entryDate: schedule.nextRunDate,
        });
      } catch (err) {
        this.logger.error('Recurring journal generation failed', {
          scheduleId: schedule.scheduleId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return generated;
  }

  // ── PRIVATE ──

  private calculateNextRunDate(currentDate: string, frequency: RecurrenceFrequency): string {
    const d = new Date(currentDate);
    switch (frequency) {
      case 'daily': d.setDate(d.getDate() + 1); break;
      case 'weekly': d.setDate(d.getDate() + 7); break;
      case 'biweekly': d.setDate(d.getDate() + 14); break;
      case 'monthly': d.setMonth(d.getMonth() + 1); break;
      case 'quarterly': d.setMonth(d.getMonth() + 3); break;
      case 'annually': d.setFullYear(d.getFullYear() + 1); break;
    }
    return d.toISOString().split('T')[0];
  }
}
