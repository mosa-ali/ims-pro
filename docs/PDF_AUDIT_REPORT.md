# IMS PDF Generation Audit Report

**Date:** March 6, 2026
**Purpose:** Identify all PDF generation approaches across the IMS codebase and plan consolidation to a single global standard.

---

## Executive Summary

The IMS codebase currently contains **6 distinct PDF generation approaches** spread across **18+ files**. These approaches use different rendering engines, CSS stylesheets, HTML structures, and output methods. The user's preferred approach (BOM / OfficialPdfEngine) is the most mature and should become the single global standard.

---

## Current PDF Approaches Found

| # | Approach | Engine | CSS | Location | Used By | Status |
|---|----------|--------|-----|----------|---------|--------|
| 1 | **OfficialPdfEngine (BOM)** | Puppeteer (server) | `official-pdf.css` | `server/services/pdf/` | BOM only | **PREFERRED** - Most mature |
| 2 | **official-pdf-v2.css wrapper** | Puppeteer (server) | `official-pdf-v2.css` | `server/_core/` | Bid Eval Checklist, CBA, QA, SAC, Bid Receipt | Active |
| 3 | **pdfGenerator.ts** | Puppeteer (server) | Inline CSS | `server/pdfGenerator.ts` | Project Reports, Case Management | Active |
| 4 | **PDFKit (pdfkit)** | PDFKit (server) | None (programmatic) | `server/donorReportsRouter.ts`, `server/_core/bomPDF.ts`, `server/_core/issuedItemsPDF.ts`, `server/_core/returnedItemsPDF.ts` | Donor Reports, old BOM, Issued Items, Returned Items | Active |
| 5 | **pdf-lib** | pdf-lib (server) | None (programmatic) | `server/_core/grnPDF.ts` | GRN (Goods Received Note) | Active |
| 6 | **jsPDF + html2canvas (client)** | jsPDF (browser) | None | `client/src/components/finance/ReportsTab.tsx`, `client/src/pages/meal/IndicatorExport.tsx`, `client/src/pages/meal/MEALReports.tsx` | Finance Reports, MEAL Indicator Export, MEAL Reports | Active |

Additionally, there is a **7th pattern** that is not a PDF generator but a print-layout component:

| # | Approach | Engine | Location | Used By | Status |
|---|----------|--------|----------|---------|--------|
| 7 | **OfficialPrintTemplate (client)** | Browser `window.print()` | `client/src/components/logistics/OfficialPrintTemplate.tsx` | Currently unused (0 imports) | Dormant |

---

## Detailed Analysis of Each Approach

### Approach 1: OfficialPdfEngine (BOM) - PREFERRED

**Files:**
- `server/services/pdf/OfficialPdfEngine.ts` - Main engine
- `server/services/pdf/templates/layout/OfficialWrapper.ts` - HTML wrapper
- `server/services/pdf/templates/styles/official-pdf.css` - Global CSS

**Strengths:**
- Clean separation of concerns (engine, wrapper, CSS)
- Proper RTL/LTR support via `<html dir="">` attribute
- Template versioning for cache invalidation (`PDF_TEMPLATE_VERSION`)
- S3 upload built-in with language-aware filenames
- Consistent header layout (org info, title, logo, ref number)
- A4 format enforced
- Puppeteer for high-quality rendering

**Currently used by:** BOM (Bid Opening Minutes) only

---

### Approach 2: official-pdf-v2.css Wrapper

**Files:**
- `server/_core/official-pdf.ts` - HTML builder (`buildOfficialPdfHtml`)
- `server/_core/official-pdf-v2.css` - CSS stylesheet
- `server/_core/bidEvaluationChecklistPDF.ts` - Bid Eval (uses CSS directly)
- `server/_core/cbaPDF.ts` - Cost Benefit Analysis
- `server/_core/qaPDF.ts` - Quotation Analysis
- `server/_core/sacPDF.ts` - Supplier Assessment Checklist
- `server/_core/bidReceiptAcknowledgementPDF.ts` - Bid Receipt

**Differences from Approach 1:**
- Uses CSS Grid for header layout (vs. Flexbox in Approach 1)
- Uses CSS variables for colors (`--ink`, `--muted`, etc.)
- Has its own page footer with page numbering
- Each generator builds its own HTML inline with the CSS
- No template versioning
- No S3 upload built-in (each caller handles storage separately)
- Some generators hardcode Puppeteer executable path

**Currently used by:** Bid Evaluation Checklist, CBA, QA, SAC, Bid Receipt Acknowledgement

---

### Approach 3: pdfGenerator.ts (Standalone Puppeteer)

**Files:**
- `server/pdfGenerator.ts` - Contains `generateProjectReportPDF()` and `generateCaseManagementReportPDF()`
- `server/services/pdfGenerator.ts` - Duplicate/older copy

**Characteristics:**
- All CSS is inline within the HTML string (no external stylesheet)
- Each function builds a complete HTML document from scratch
- Has RTL support but implemented independently
- Hardcodes Puppeteer executable path
- Returns raw Buffer (no S3 upload)
- No shared header/footer template

**Currently used by:** Project Reports (via `projectsRouter.ts`), Case Management Reports (via `caseManagementRouter.ts`)

---

### Approach 4: PDFKit (Programmatic)

**Files:**
- `server/donorReportsRouter.ts` - `generateSimplePDF()` function
- `server/_core/bomPDF.ts` - Old BOM PDF (likely superseded)
- `server/_core/issuedItemsPDF.ts` - Issued Items PDF
- `server/_core/returnedItemsPDF.ts` - Returned Items PDF

**Characteristics:**
- Uses PDFKit library (programmatic PDF construction)
- No HTML/CSS at all - draws text, lines, rectangles directly
- Limited RTL support (PDFKit has poor Arabic text handling)
- No shared template or styling
- Each file is completely standalone

**Currently used by:** Donor Reports, Issued Items, Returned Items

---

### Approach 5: pdf-lib (Low-level)

**Files:**
- `server/_core/grnPDF.ts` - GRN (Goods Received Note)

**Characteristics:**
- Uses pdf-lib (low-level PDF manipulation)
- Programmatic drawing (no HTML)
- Very limited styling capabilities
- No RTL support

**Currently used by:** GRN only

---

### Approach 6: jsPDF + html2canvas (Client-side)

**Files:**
- `client/src/components/finance/ReportsTab.tsx` - Financial Variance Report
- `client/src/pages/meal/IndicatorExport.tsx` - MEAL Indicator Export
- `client/src/pages/meal/MEALReports.tsx` - MEAL Reports

**Characteristics:**
- Runs entirely in the browser (client-side)
- jsPDF for text-based PDFs, html2canvas for screenshot-based PDFs
- No server involvement
- Poor quality (especially html2canvas which rasterizes)
- Limited RTL support
- No org branding or consistent header

**Currently used by:** Finance Reports, MEAL Indicator Export, MEAL Reports

---

### Approach 7: OfficialPrintTemplate (Client Print)

**Files:**
- `client/src/components/logistics/OfficialPrintTemplate.tsx`

**Characteristics:**
- React component that renders printable HTML
- Uses `window.print()` for browser print dialog
- Has org header, signature blocks, terms & conditions
- Currently **not imported by any other file** (dormant)

---

## Evidence Generation System

**File:** `server/evidenceGeneration.ts`

This is a separate system that generates PDF evidence for approval workflows. It uses Puppeteer directly (not through any of the above approaches) and has its own HTML generation. It is called from:
- `server/advancesRouter.ts` (Finance)
- `server/budgetsRouter.ts` (Finance)
- `server/expendituresRouter.ts` (Finance)

This should also be migrated to use the global PDF engine.

---

## CSS File Inventory

| File | Used By | Status |
|------|---------|--------|
| `server/services/pdf/templates/styles/official-pdf.css` | OfficialPdfEngine (BOM) | **KEEP as global standard** |
| `server/_core/official-pdf-v2.css` | Bid Eval, CBA, QA, SAC, Bid Receipt | Migrate to global |
| `server/templates/official-pdf.css` | Nothing (orphaned) | **DELETE** |

---

## Consolidation Plan

### Phase 1: Enhance OfficialPdfEngine to be the Global Standard

The BOM approach (`server/services/pdf/`) needs enhancements to support all document types:

1. **Add landscape support** - Bid Evaluation Checklist needs A4 landscape
2. **Add page footer option** - Some documents need "Page X of Y"
3. **Add custom CSS injection** - For document-specific overrides (e.g., extra-wide tables)
4. **Add direct Buffer return option** - Not all callers need S3 upload
5. **Merge best features from v2 CSS** - CSS variables, print-color-adjust, page-break helpers

### Phase 2: Migrate Approach 2 (official-pdf-v2.css users)

Migrate these server-side generators to use OfficialPdfEngine:

| File | Document | Complexity |
|------|----------|------------|
| `server/_core/cbaPDF.ts` | Cost Benefit Analysis | Medium |
| `server/_core/qaPDF.ts` | Quotation Analysis | Medium |
| `server/_core/sacPDF.ts` | Supplier Assessment Checklist | Medium |
| `server/_core/bidEvaluationChecklistPDF.ts` | Bid Evaluation Checklist | High (landscape, dynamic columns) |
| `server/_core/bidReceiptAcknowledgementPDF.ts` | Bid Receipt | Low |

### Phase 3: Migrate Approach 3 (pdfGenerator.ts)

| File | Document | Complexity |
|------|----------|------------|
| `server/pdfGenerator.ts` → `generateProjectReportPDF` | Project Reports | High (complex data) |
| `server/pdfGenerator.ts` → `generateCaseManagementReportPDF` | Case Management | High (complex data) |

### Phase 4: Migrate Approach 4 (PDFKit)

| File | Document | Complexity |
|------|----------|------------|
| `server/donorReportsRouter.ts` → `generateSimplePDF` | Donor Reports | Medium |
| `server/_core/issuedItemsPDF.ts` | Issued Items | Medium |
| `server/_core/returnedItemsPDF.ts` | Returned Items | Medium |
| `server/_core/bomPDF.ts` | Old BOM (likely dead code) | Low (verify & delete) |

### Phase 5: Migrate Approach 5 (pdf-lib)

| File | Document | Complexity |
|------|----------|------------|
| `server/_core/grnPDF.ts` | GRN | Medium |

### Phase 6: Migrate Approach 6 (Client-side jsPDF)

Move these to server-side tRPC mutations using OfficialPdfEngine:

| File | Document | Complexity |
|------|----------|------------|
| `client/src/components/finance/ReportsTab.tsx` | Financial Variance Report | Medium |
| `client/src/pages/meal/IndicatorExport.tsx` | MEAL Indicator Export | Medium |
| `client/src/pages/meal/MEALReports.tsx` | MEAL Reports | High (html2canvas) |

### Phase 7: Migrate Evidence Generation

| File | Document | Complexity |
|------|----------|------------|
| `server/evidenceGeneration.ts` | All evidence PDFs | Medium |

### Phase 8: Cleanup

- Delete `server/templates/official-pdf.css` (orphaned)
- Delete `server/_core/official-pdf-v2.css` (after all migrations)
- Delete `server/_core/official-pdf.ts` (after all migrations)
- Delete `server/pdfGenerator.ts` and `server/services/pdfGenerator.ts`
- Delete `server/_core/bomPDF.ts` (old PDFKit BOM)
- Remove jsPDF, html2canvas, pdfkit, pdf-lib from `package.json`
- Delete `client/src/components/logistics/OfficialPrintTemplate.tsx` (dormant)

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total PDF approaches | 6 (+ 1 dormant print template) |
| Total PDF generator files | 18 |
| CSS stylesheets for PDF | 3 (+ 1 orphaned) |
| Server-side generators | 14 files |
| Client-side generators | 3 files |
| NPM packages to remove after migration | 4 (jspdf, html2canvas, pdfkit, pdf-lib) |
| Documents to migrate | ~15 document types |
| Estimated migration phases | 8 |

---

## Recommendation

Proceed with the consolidation using the BOM approach (`server/services/pdf/OfficialPdfEngine.ts`) as the single global standard. Start with Phase 1 (enhance the engine) and Phase 2 (migrate the closest approach - official-pdf-v2.css users) since they share the most DNA with the target architecture.
