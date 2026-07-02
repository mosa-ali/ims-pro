/**
 * DataLineageEngine.ts + ExplainableReportingEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Data Lineage (#8 ★★★★★) + Explainable Reporting (#9)
 *
 * PHASE 10 ENHANCEMENTS
 *
 * #8 — Every value traces back to its source:
 *   Cash Position → Bank Accounts → GL → Journal Entries → Source Transactions
 *
 * #9 — Every figure is clickable to reveal:
 *   formula, source tables, filters, excluded records,
 *   exchange rates, calculation steps
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ════════════════════════════════════════════════════════════════════════════
// #8  DATA LINEAGE
// ════════════════════════════════════════════════════════════════════════════

export interface LineageNode {
  nodeId: string;
  /** Entity type (e.g., 'report_value', 'gl_account', 'journal_entry', 'bank_account') */
  entityType: string;
  /** Entity identifier */
  entityId: string;
  /** Display label */
  label: string;
  labelAR?: string;
  /** The value at this node */
  value?: number;
  /** How this value was computed */
  computation?: string;
  /** Source table/view */
  sourceTable?: string;
  /** Filters applied at this level */
  filtersApplied?: Record<string, unknown>;
  /** Children in the lineage tree */
  children: LineageNode[];
  /** Depth in the tree (0 = root) */
  depth: number;
}

export interface LineageTrace {
  traceId: string;
  /** The root value being traced */
  rootValue: number;
  rootLabel: string;
  /** Full lineage tree */
  tree: LineageNode;
  /** Total source records */
  totalSourceRecords: number;
  /** Deepest level in the trace */
  maxDepth: number;
  tracedAt: string;
}

/**
 * Provides lineage data for a specific entity type.
 * Each module registers its own lineage provider.
 */
export interface ILineageProvider {
  readonly entityType: string;

  /**
   * Trace the lineage of a value.
   * Returns child nodes that contributed to this value.
   */
  trace(
    entityId: string,
    scope: RepositoryScope,
  ): Promise<LineageNode[]>;
}

export class DataLineageEngine {
  private providers = new Map<string, ILineageProvider>();
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger.child({ service: 'DataLineageEngine' });
  }

  registerProvider(provider: ILineageProvider): void {
    this.providers.set(provider.entityType, provider);
    this.logger.info('Lineage provider registered', { entityType: provider.entityType });
  }

  /**
   * Trace the full lineage of a value.
   * Recursively walks the provider chain until leaf nodes.
   */
  async trace(
    entityType: string,
    entityId: string,
    label: string,
    value: number,
    scope: RepositoryScope,
    maxDepth: number = 5,
  ): Promise<LineageTrace> {
    const rootNode: LineageNode = {
      nodeId: uuidv4(),
      entityType,
      entityId,
      label,
      value,
      children: [],
      depth: 0,
    };

    let totalSourceRecords = 0;
    let actualMaxDepth = 0;

    // Recursive trace
    const expand = async (node: LineageNode): Promise<void> => {
      if (node.depth >= maxDepth) return;

      const provider = this.providers.get(node.entityType);
      if (!provider) return;

      const children = await provider.trace(node.entityId, scope);
      node.children = children.map(c => ({ ...c, depth: node.depth + 1 }));

      totalSourceRecords += children.length;
      actualMaxDepth = Math.max(actualMaxDepth, node.depth + 1);

      // Recurse into children
      for (const child of node.children) {
        await expand(child);
      }
    };

    await expand(rootNode);

    this.logger.info('Lineage traced', {
      entityType,
      entityId,
      totalSourceRecords,
      maxDepth: actualMaxDepth,
    });

    return {
      traceId: uuidv4(),
      rootValue: value,
      rootLabel: label,
      tree: rootNode,
      totalSourceRecords,
      maxDepth: actualMaxDepth,
      tracedAt: new Date().toISOString(),
    };
  }

  /**
   * Get a flat list of leaf nodes (source transactions).
   */
  async getSourceRecords(
    entityType: string,
    entityId: string,
    scope: RepositoryScope,
  ): Promise<Array<{ entityType: string; entityId: string; label: string; value?: number }>> {
    const trace = await this.trace(entityType, entityId, '', 0, scope);
    const leaves: Array<{ entityType: string; entityId: string; label: string; value?: number }> = [];

    const collectLeaves = (node: LineageNode) => {
      if (node.children.length === 0) {
        leaves.push({
          entityType: node.entityType,
          entityId: node.entityId,
          label: node.label,
          value: node.value,
        });
      } else {
        for (const child of node.children) collectLeaves(child);
      }
    };

    collectLeaves(trace.tree);
    return leaves;
  }
}


// ════════════════════════════════════════════════════════════════════════════
// #9  EXPLAINABLE REPORTING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Every figure in a report is explainable.
 * Users click a number → see formula, sources, filters, steps.
 * Critical for donor audits and financial transparency.
 */

export interface ExplanationRequest {
  /** The report value being explained */
  reportId: string;
  /** Which cell/field */
  fieldKey: string;
  /** Row identifier (for tabular reports) */
  rowKey?: string;
  /** The numeric value to explain */
  value: number;
  scope: RepositoryScope;
}

export interface ValueExplanation {
  explanationId: string;
  fieldKey: string;
  value: number;
  formattedValue: string;

  // How it was calculated
  formula: string;
  formulaHuman: string;
  formulaHumanAR: string;
  formulaHumanIT: string;

  // Source data
  sourceTables: Array<{
    tableName: string;
    displayName: string;
    recordCount: number;
    contribution: number;
  }>;

  // Filters that were applied
  filtersApplied: Array<{
    filterName: string;
    operator: string;
    value: string;
    recordsExcluded: number;
  }>;

  // Exchange rates used
  exchangeRates: Array<{
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    rateDate: string;
  }>;

  // Calculation steps (like a spreadsheet audit trail)
  calculationSteps: Array<{
    step: number;
    description: string;
    intermediateValue: number;
  }>;

  // Data lineage summary
  lineageSummary: {
    sourceTransactionCount: number;
    deepestLevel: string;
    lineageAvailable: boolean;
  };

  generatedAt: string;
}

/**
 * Provides explanation data for a specific report type.
 */
export interface IExplanationProvider {
  readonly reportType: string;

  explain(
    fieldKey: string,
    rowKey: string | undefined,
    value: number,
    filters: Record<string, unknown>,
    scope: RepositoryScope,
  ): Promise<Omit<ValueExplanation, 'explanationId' | 'generatedAt'>>;
}

export class ExplainableReportingEngine {
  private providers = new Map<string, IExplanationProvider>();
  private lineageEngine: DataLineageEngine;
  private logger: ILogger;

  constructor(lineageEngine: DataLineageEngine, logger: ILogger) {
    this.lineageEngine = lineageEngine;
    this.logger = logger.child({ service: 'ExplainableReporting' });
  }

  registerProvider(provider: IExplanationProvider): void {
    this.providers.set(provider.reportType, provider);
    this.logger.info('Explanation provider registered', { reportType: provider.reportType });
  }

  /**
   * Explain a value in a report.
   * Called when user clicks a number in the UI.
   */
  async explain(request: ExplanationRequest): Promise<ValueExplanation> {
    const provider = this.providers.get(request.reportId);

    let explanation: Partial<ValueExplanation>;

    if (provider) {
      explanation = await provider.explain(
        request.fieldKey, request.rowKey, request.value, {}, request.scope,
      );
    } else {
      // Generic explanation for reports without a dedicated provider
      explanation = {
        fieldKey: request.fieldKey,
        value: request.value,
        formattedValue: String(request.value),
        formula: 'N/A',
        formulaHuman: 'This value comes directly from the database.',
        formulaHumanAR: 'هذه القيمة تأتي مباشرة من قاعدة البيانات.',
        formulaHumanIT: 'Questo valore proviene direttamente dal database.',
        sourceTables: [],
        filtersApplied: [],
        exchangeRates: [],
        calculationSteps: [
          { step: 1, description: 'Value retrieved from data source', intermediateValue: request.value },
        ],
        lineageSummary: {
          sourceTransactionCount: 0,
          deepestLevel: 'unknown',
          lineageAvailable: false,
        },
      };
    }

    this.logger.info('Value explained', {
      reportId: request.reportId,
      fieldKey: request.fieldKey,
      value: request.value,
      sourceTables: explanation.sourceTables?.length || 0,
      steps: explanation.calculationSteps?.length || 0,
    });

    return {
      explanationId: uuidv4(),
      ...explanation,
      fieldKey: request.fieldKey,
      value: request.value,
      formattedValue: explanation.formattedValue || String(request.value),
      formula: explanation.formula || 'N/A',
      formulaHuman: explanation.formulaHuman || '',
      formulaHumanAR: explanation.formulaHumanAR || '',
      formulaHumanIT: explanation.formulaHumanIT || '',
      sourceTables: explanation.sourceTables || [],
      filtersApplied: explanation.filtersApplied || [],
      exchangeRates: explanation.exchangeRates || [],
      calculationSteps: explanation.calculationSteps || [],
      lineageSummary: explanation.lineageSummary || { sourceTransactionCount: 0, deepestLevel: '', lineageAvailable: false },
      generatedAt: new Date().toISOString(),
    };
  }
}
