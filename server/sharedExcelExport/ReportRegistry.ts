/**
 * ReportRegistry.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Central Report Registry
 *
 * Every exportable report must be registered here.
 * Registration defines: columns, data source, filters, formatting,
 * file naming, permissions, and locale support.
 *
 * No report page generates Excel directly.
 * Every export goes through: Registry → Orchestrator → Engine → File.
 */

import type { ILogger } from '../PHASE3_HARDENED/PlatformInterfaces';
import type {
  ReportDefinition,
  ReportModule,
  ReportColumnDef,
  ReportFilterDef,
} from './ReportExportTypes';

// ────────────────────────────────────────────────────────────────────────────
// REGISTRY
// ────────────────────────────────────────────────────────────────────────────

export class ReportRegistry {
  private reports = new Map<string, ReportDefinition>();
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger.child({ service: 'ReportRegistry' });
    this.seedCoreReports();
  }

  register(report: ReportDefinition): void {
    if (this.reports.has(report.reportId)) {
      this.logger.warn('Report definition overwritten', { reportId: report.reportId });
    }
    this.reports.set(report.reportId, report);
    this.logger.info('Report registered', {
      reportId: report.reportId,
      module: report.module,
      columns: report.columns.length,
    });
  }

  get(reportId: string): ReportDefinition | null {
    return this.reports.get(reportId) || null;
  }

  listByModule(module: ReportModule): ReportDefinition[] {
    return [...this.reports.values()].filter(r => r.module === module);
  }

  listAll(): ReportDefinition[] {
    return [...this.reports.values()];
  }

  /**
   * Check if a user role has permission to export a report.
   */
  isAllowed(reportId: string, userRole: string): boolean {
    const report = this.reports.get(reportId);
    if (!report) return false;
    return report.allowedRoles.includes(userRole) || report.allowedRoles.includes('*');
  }

  // ────────────────────────────────────────────────────────────────────────
  // SEED CORE REPORTS
  // ────────────────────────────────────────────────────────────────────────

  private seedCoreReports(): void {
    // ── Finance: Trial Balance ──
    this.register({
      reportId: 'finance_trial_balance',
      name: 'Trial Balance',
      nameAR: 'ميزان المراجعة',
      nameIT: 'Bilancio di Verifica',
      description: 'Trial balance as of a specific date',
      module: 'finance',
      dataSource: 'journalEntries.getTrialBalance',
      columns: [
        col('accountCode', 'Account Code', 'رمز الحساب', 'Codice Conto', 'string', 15),
        col('accountName', 'Account Name', 'اسم الحساب', 'Nome Conto', 'string', 30),
        col('accountType', 'Type', 'النوع', 'Tipo', 'string', 12),
        col('openingDebit', 'Opening DR', 'مدين افتتاحي', 'Dare Apertura', 'currency', 18, { isTotal: true }),
        col('openingCredit', 'Opening CR', 'دائن افتتاحي', 'Avere Apertura', 'currency', 18, { isTotal: true }),
        col('periodDebit', 'Period DR', 'مدين الفترة', 'Dare Periodo', 'currency', 18, { isTotal: true }),
        col('periodCredit', 'Period CR', 'دائن الفترة', 'Avere Periodo', 'currency', 18, { isTotal: true }),
        col('closingDebit', 'Closing DR', 'مدين ختامي', 'Dare Chiusura', 'currency', 18, { isTotal: true }),
        col('closingCredit', 'Closing CR', 'دائن ختامي', 'Avere Chiusura', 'currency', 18, { isTotal: true }),
      ],
      filters: [
        dateFilter('asOfDate', 'As of Date', 'حتى تاريخ', 'Alla Data', true),
        selectFilter('fiscalYearId', 'Fiscal Year', 'السنة المالية', 'Anno Fiscale', false),
      ],
      fileNameTemplate: 'TrialBalance_{orgName}_{asOfDate}',
      allowedRoles: ['Finance Manager', 'Controller', 'CFO', 'Auditor', 'Admin'],
      includeTotals: true,
      includeHeader: true,
      supportRTL: true,
      version: 1,
    });

    // ── Finance: Journal Entries ──
    this.register({
      reportId: 'finance_journal_entries',
      name: 'Journal Entries',
      nameAR: 'قيود اليومية',
      nameIT: 'Registrazioni Contabili',
      description: 'Journal entries with lines for a date range',
      module: 'finance',
      dataSource: 'journalEntries.list',
      columns: [
        col('entryNumber', 'Entry #', 'رقم القيد', 'Nr. Registrazione', 'string', 18),
        col('entryDate', 'Date', 'التاريخ', 'Data', 'date', 12),
        col('description', 'Description', 'الوصف', 'Descrizione', 'string', 35),
        col('entryType', 'Type', 'النوع', 'Tipo', 'string', 12),
        col('status', 'Status', 'الحالة', 'Stato', 'string', 10),
        col('totalDebit', 'Total DR', 'إجمالي مدين', 'Totale Dare', 'currency', 18, { isTotal: true }),
        col('totalCredit', 'Total CR', 'إجمالي دائن', 'Totale Avere', 'currency', 18, { isTotal: true }),
        col('sourceModule', 'Source', 'المصدر', 'Fonte', 'string', 14),
      ],
      filters: [
        dateFilter('startDate', 'From Date', 'من تاريخ', 'Da Data', true),
        dateFilter('endDate', 'To Date', 'إلى تاريخ', 'A Data', true),
        selectFilter('status', 'Status', 'الحالة', 'Stato', false, [
          { value: 'draft', label: 'Draft' },
          { value: 'posted', label: 'Posted' },
          { value: 'reversed', label: 'Reversed' },
        ]),
        selectFilter('entryType', 'Entry Type', 'نوع القيد', 'Tipo Registrazione', false, [
          { value: 'standard', label: 'Standard' },
          { value: 'adjusting', label: 'Adjusting' },
          { value: 'closing', label: 'Closing' },
          { value: 'reversing', label: 'Reversing' },
        ]),
      ],
      fileNameTemplate: 'JournalEntries_{orgName}_{startDate}_to_{endDate}',
      allowedRoles: ['Finance Manager', 'Controller', 'CFO', 'Auditor', 'Admin'],
      includeTotals: true,
      includeHeader: true,
      supportRTL: true,
      version: 1,
    });

    // ── Budget: Budget vs Actual ──
    this.register({
      reportId: 'budget_vs_actual',
      name: 'Budget vs Actual',
      nameAR: 'الميزانية مقابل الفعلي',
      nameIT: 'Budget vs Consuntivo',
      description: 'Budget vs actual with variance analysis',
      module: 'budget',
      dataSource: 'budgetEngine.getBudgetView',
      columns: [
        col('lineCode', 'Line Code', 'رمز البند', 'Codice Linea', 'string', 12),
        col('description', 'Description', 'الوصف', 'Descrizione', 'string', 30),
        col('categoryName', 'Category', 'الفئة', 'Categoria', 'string', 18),
        col('totalAmount', 'Budget', 'الميزانية', 'Budget', 'currency', 18, { isTotal: true }),
        col('actualSpent', 'Actual', 'الفعلي', 'Consuntivo', 'currency', 18, { isTotal: true }),
        col('commitments', 'Committed', 'الالتزامات', 'Impegnato', 'currency', 18, { isTotal: true }),
        col('availableBalance', 'Available', 'المتاح', 'Disponibile', 'currency', 18, { isTotal: true }),
        col('utilizationPercent', 'Utilization %', '% الاستخدام', '% Utilizzo', 'percentage', 14),
      ],
      filters: [
        selectFilter('budgetId', 'Budget', 'الميزانية', 'Budget', true),
        selectFilter('fiscalYear', 'Fiscal Year', 'السنة المالية', 'Anno Fiscale', false),
      ],
      fileNameTemplate: 'BudgetVsActual_{budgetName}_{fiscalYear}',
      allowedRoles: ['Finance Manager', 'Program Manager', 'CFO', 'Admin'],
      includeTotals: true,
      includeHeader: true,
      supportRTL: true,
      version: 1,
    });

    // ── Donor: Grant Financial Report ──
    this.register({
      reportId: 'donor_grant_report',
      name: 'Grant Financial Report',
      nameAR: 'التقرير المالي للمنحة',
      nameIT: 'Report Finanziario Contributo',
      description: 'Donor-facing grant financial report with budget, actual, and variance',
      module: 'donor',
      dataSource: 'budgetEngine.getConsolidatedBudget',
      columns: [
        col('categoryName', 'Budget Category', 'فئة الميزانية', 'Categoria Budget', 'string', 25),
        col('approvedBudget', 'Approved Budget', 'الميزانية المعتمدة', 'Budget Approvato', 'currency', 18, { isTotal: true }),
        col('actualExpenditure', 'Actual Expenditure', 'المصروفات الفعلية', 'Spesa Effettiva', 'currency', 18, { isTotal: true }),
        col('variance', 'Variance', 'الفرق', 'Varianza', 'currency', 18, { isTotal: true }),
        col('variancePercent', 'Variance %', '% الفرق', '% Varianza', 'percentage', 12),
        col('balance', 'Balance', 'الرصيد', 'Saldo', 'currency', 18, { isTotal: true }),
      ],
      filters: [
        selectFilter('grantId', 'Grant', 'المنحة', 'Contributo', true),
        dateFilter('periodEnd', 'Report Period End', 'نهاية فترة التقرير', 'Fine Periodo', true),
      ],
      fileNameTemplate: 'GrantReport_{donorName}_{grantName}_{periodEnd}',
      allowedRoles: ['Finance Manager', 'Grant Manager', 'CFO', 'Admin'],
      includeTotals: true,
      includeHeader: true,
      supportRTL: true,
      version: 1,
    });

    // ── Executive: Dashboard Summary ──
    this.register({
      reportId: 'executive_dashboard',
      name: 'Executive Dashboard',
      nameAR: 'لوحة القيادة التنفيذية',
      nameIT: 'Dashboard Esecutivo',
      description: 'Executive summary with KPIs across all modules',
      module: 'executive',
      dataSource: 'projectionEngine.getProjection',
      columns: [
        col('metric', 'Metric', 'المؤشر', 'Indicatore', 'string', 30),
        col('currentValue', 'Current', 'الحالي', 'Corrente', 'currency', 18),
        col('previousValue', 'Previous', 'السابق', 'Precedente', 'currency', 18),
        col('change', 'Change', 'التغيير', 'Variazione', 'currency', 18),
        col('changePercent', 'Change %', '% التغيير', '% Variazione', 'percentage', 12),
        col('status', 'Status', 'الحالة', 'Stato', 'string', 12),
      ],
      filters: [
        dateFilter('asOfDate', 'As of Date', 'حتى تاريخ', 'Alla Data', true),
      ],
      fileNameTemplate: 'ExecutiveDashboard_{orgName}_{asOfDate}',
      allowedRoles: ['CFO', 'Executive Director', 'Country Director', 'Admin'],
      includeTotals: false,
      includeHeader: true,
      supportRTL: true,
      version: 1,
    });

    this.logger.info('Core reports seeded', { count: this.reports.size });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// HELPER FACTORIES
// ────────────────────────────────────────────────────────────────────────────

function col(
  key: string,
  en: string,
  ar: string,
  it: string,
  dataType: ReportColumnDef['dataType'],
  width: number,
  extras?: Partial<ReportColumnDef>,
): ReportColumnDef {
  return {
    key,
    headerEN: en,
    headerAR: ar,
    headerIT: it,
    dataType,
    width,
    alignment: dataType === 'currency' || dataType === 'number' || dataType === 'percentage' ? 'right' : 'left',
    format: dataType === 'currency' ? '#,##0.00' : dataType === 'percentage' ? '0.0%' : undefined,
    isCurrency: dataType === 'currency',
    ...extras,
  };
}

function dateFilter(key: string, en: string, ar: string, it: string, required: boolean): ReportFilterDef {
  return { key, label: en, labelAR: ar, labelIT: it, type: 'date', required };
}

function selectFilter(
  key: string,
  en: string,
  ar: string,
  it: string,
  required: boolean,
  options?: Array<{ value: string; label: string }>,
): ReportFilterDef {
  return { key, label: en, labelAR: ar, labelIT: it, type: 'select', required, options };
}
