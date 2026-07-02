# Enterprise Reporting & Document Generation Platform
## Integration Guide — Existing File Updates

This document specifies the exact integration points where the 10 new engines
connect to the existing Export Platform files. The existing files are NOT
rewritten — they receive targeted additions only.

---

## ReportExportOrchestrator.ts — Integration Points

The orchestrator gains 5 new stages in the `export()` pipeline:

```
EXISTING:  validate → permission → fetch data → generate file → store → audit → return URL

ENHANCED:  validate
           → [NEW] dependency check (ReportDependencyEngine.validate)
           → [NEW] dataset certification (DatasetCertificationEngine.certify)
           → permission
           → fetch data
           → [NEW] capture snapshot (ExportSnapshotEngine.capture)
           → [NEW] resolve watermark (WatermarkRuleEngine.resolve)
           → generate file (with watermark, chart definitions, AI narrative)
           → [NEW] digital signature (DigitalSignatureEngine.signPDF, if PDF + signing requested)
           → store
           → [NEW] version link (ReportVersionControlEngine.linkExport)
           → audit
           → [NEW] distribute (ReportDistributionEngine.distribute, if rules exist)
           → return URL
```

### New constructor dependencies:
```typescript
// Add to ExportOrchestratorDependencies:
dependencyEngine: ReportDependencyEngine;
certificationEngine: DatasetCertificationEngine;
snapshotEngine: ExportSnapshotEngine;
watermarkEngine: WatermarkRuleEngine;
signatureEngine: DigitalSignatureEngine;
versionControl: ReportVersionControlEngine;
distributionEngine: ReportDistributionEngine;
narrativeGenerator?: AINarrativeGenerator;
```

### New export options (add to ExportRequest):
```typescript
// Add to ExportRequest in ReportExportTypes.ts:
includeNarrative?: boolean;
signDocument?: boolean;
certificateId?: string;
skipCertification?: boolean;        // Requires override permission
certificationOverrideApproval?: string;
packageTemplateId?: string;         // For donor submission packages
```

---

## ReportExportTypes.ts — New Type Additions

```typescript
// Add to ReportDefinition:
dependencies?: Array<{
  dependencyType: string;
  dependsOn: string;
  description: string;
  isMandatory: boolean;
}>;
chartDefinitions?: Array<{
  chartId: string;
  type: 'bar' | 'line' | 'pie' | 'area' | 'stacked_bar' | 'waterfall';
  title: string;
  titleAR?: string;
  titleIT?: string;
  dataColumns: string[];
  categoryColumn: string;
  placement: 'embedded' | 'separate_sheet';
}>;
certificationChecks?: string[];     // Check IDs that apply to this report
watermarkContext?: {
  reportStatus?: string;
  confidentialityLevel?: string;
};

// Add to ExportAuditRecord:
snapshotId?: string;
certificationId?: string;
certificationStatus?: string;
signatureId?: string;
signingStatus?: string;
narrativeId?: string;
narrativeApproved?: boolean;
distributionCount?: number;
versionLink?: {
  reportDefinitionVersion: number;
  templateVersion: number;
  exportVersion: number;
};
```

---

## ReportRegistry.ts — Updates

```typescript
// Add to register():
// When registering a report, also register its dependencies
// with ReportDependencyEngine and certification checks
// with DatasetCertificationEngine.

// Add chart definitions to existing reports:
// finance_trial_balance: account type distribution pie, DR vs CR bar
// budget_vs_actual: budget/actual/committed comparison, utilization trend
// donor_grant_report: category spending pie, variance bar
// executive_dashboard: KPI trends, risk indicators
```

---

## ExcelExportEngine.ts — Visual Analysis Sheet

```typescript
// Add to buildWorkbook():
// If report.chartDefinitions exists and has entries:
//   1. Add a second worksheet named "Visual Analysis" / "التحليل البصري" / "Analisi Visuale"
//   2. For each chartDefinition:
//      a. Create chart from data using ExcelJS chart API
//      b. Apply locale-specific labels
//      c. Apply RTL for Arabic
//   3. Charts reference the same data from Sheet 1

// Add method:
// buildVisualAnalysisSheet(data, chartDefinitions, locale, isRTL): WorksheetStructure
```

---

## MultiFormatExportEngine.ts — Updates

```typescript
// Add to MultiFormatExportInput:
watermark?: {
  text: string;
  style: { fontSize: number; opacity: number; rotation: number; color: string; position: string };
};
signingRequest?: {
  certificateId: string;
  reason: string;
};
narrative?: {
  text: string;
  isAIGenerated: boolean;
  disclaimer: string;
};

// PDF exporter: apply watermark, include narrative page, sign if requested
// Word exporter: apply watermark, include narrative section
// PowerPoint exporter: apply watermark, include KPI slides
```

---

## EnterpriseReportTemplateEngine.ts — Updates

```typescript
// Add to ReportTemplate:
watermarkOverride?: string;         // Template-specific watermark
chartOverrides?: Record<string, unknown>;  // Template-specific chart styling
packageInclusion?: {
  includeInPackage: boolean;
  packageOrder: number;
};
```

---

## ExportQueueEngine.ts — Updates

```typescript
// Add to ExportJob:
certificationResult?: {
  status: string;
  checksRun: number;
  checksFailed: number;
};
snapshotId?: string;
signatureRequested?: boolean;
distributionRules?: string[];

// Worker process should now:
// 1. Run certification before generation
// 2. Capture snapshot after data fetch
// 3. Sign document if requested
// 4. Distribute after completion
```

---

## ReportSchedulerEngine.ts — Updates

```typescript
// Add to RecurringSchedule:
distributionRules?: string[];       // Distribution rule IDs
includeNarrative?: boolean;
signDocument?: boolean;
certificateId?: string;
packageTemplateId?: string;         // Generate donor package instead of single report
```

---

## ExportHistoryEngine.ts — Updates

```typescript
// Add to ExportHistoryRecord:
snapshotId?: string;
certificationId?: string;
certificationStatus?: string;
signatureId?: string;
signingStatus?: string;
narrativeId?: string;
narrativeApproved?: boolean;
packageId?: string;
distributionRecords?: string[];     // Delivery IDs
reportDefinitionVersion?: number;
templateVersion?: number;
exportVersion?: number;
```

---

## ReportExportRouter.ts — New Procedures

```typescript
// Add to reportExportRouter:

// Generate donor submission package
generatePackage: scopedProcedure
  .input(z.object({
    packageTemplateId: z.string(),
    locale: z.enum(['en', 'ar', 'it']),
    filters: z.record(z.unknown()),
  }))
  .mutation(...)

// Get certification status for a report
certify: scopedProcedure
  .input(z.object({
    reportId: z.string(),
    filters: z.record(z.unknown()),
  }))
  .mutation(...)

// Review AI narrative
reviewNarrative: scopedProcedure
  .input(z.object({
    narrativeId: z.string(),
    approved: z.boolean(),
    comments: z.string().optional(),
  }))
  .mutation(...)

// Get export snapshot
getSnapshot: scopedProcedure
  .input(z.object({ exportId: z.string() }))
  .query(...)

// List signing certificates
listCertificates: scopedProcedure
  .query(...)

// Get package templates for a donor
getPackageTemplates: scopedProcedure
  .input(z.object({ donorName: z.string().optional() }))
  .query(...)
```

---

## Platform Rename

Update JSDoc headers in all files:

From: `Enterprise Export Platform`
To:   `Enterprise Reporting & Document Generation Platform`

The platform now encompasses:
Report Registry, Templates, Export Queue, Scheduler, Multi-format Rendering,
Export History, Archiving, Audit, Branding, Donor Templates, Digital Signatures,
Dataset Certification, Report Dependencies, AI Narratives, Watermarks,
Notifications, Delivery, Donor Submission Packages, Version Control, Snapshots.

Export is now ONE capability inside a wider reporting and document generation platform.
