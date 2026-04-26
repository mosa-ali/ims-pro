/* ============================================================================
   IMS - OFFICIAL PDF STYLESHEET (GLOBAL)
   - One stylesheet used by ALL official PDFs (all modules)
   - Direction controlled ONLY via <html dir="rtl|ltr"> in OfficialWrapper
   - No per-document header/footer CSS
   - QA print is the visual baseline
   ============================================================================ */
export const officialPdfStyles = `
/* -----------------------------
   1) Page / Print Rules (A4)
   ----------------------------- */
@page {
  size: A4;
  margin: 14mm 14mm 16mm 14mm;
}

html, body {
  margin: 0;
  padding: 0;
}

body {
  /* Keep neutral defaults; direction is inherited from <html dir=""> */
  font-family: Arial, "Segoe UI", "Arabic Typesetting", "Simplified Arabic", "Traditional Arabic", sans-serif;
  font-size: 11pt;
  line-height: 1.35;
  color: #111;
}

/* Direction inheritance (locked guideline equivalent for PDFs) */
html[dir="rtl"] body { direction: rtl; text-align: right; }
html[dir="ltr"] body { direction: ltr; text-align: left; }

/* PDF content wrapper — must always fill full width regardless of direction */
.pdf-content {
  width: 100%;
  max-width: 100%;
}

/* Keep typography consistent */
h1, h2, h3, h4, h5, h6 { margin: 0; font-weight: 700; }
p { margin: 0; }

/* Ensure basic elements inherit direction (common failure zone) */
label, th, td, p, span, div { direction: inherit; }
input, textarea, select, button { direction: inherit; text-align: inherit; }

/* Controlled exception for numbers/codes/references (locked guideline) */
.ltr-safe,
.num-ltr {
  direction: ltr;
  unicode-bidi: isolate; /* safer than plaintext for PDF engines */
  text-align: left;
}

/* -----------------------------
   2) Layout helpers (logical props)
   ----------------------------- */
.stack-8  { display: block; margin-block-start: 8px; }
.stack-12 { display: block; margin-block-start: 12px; }
.stack-16 { display: block; margin-block-start: 16px; }

.row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.col { flex: 1 1 0; min-width: 0; }

/* Use logical alignment */
.text-start  { text-align: start; }
.text-end    { text-align: end; }
.text-center { text-align: center; }
.muted       { color: #555; }

/* -----------------------------
   3) Official Header (QA baseline) — UPDATED
   - Left: org identity (stack)
   - Center: title (centered)
   - Right: logo centered + ref/date under it (stack)
   - Must mirror in RTL, but logo stays centered in its column
   ----------------------------- */
.official-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-block-end: 10px;
}

/* Header blocks widths */
.header-left  { width: 28%; min-width: 28%; }
.header-center{ width: 44%; min-width: 44%; }
.header-right { width: 28%; min-width: 28%; }

/* LEFT: vertical stack */
.header-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: flex-start;
  justify-content: flex-start;
  text-align: start;
}

/* CENTER: centered stack */
.header-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding-inline: 6px;
}

/* RIGHT: vertical stack with LOGO CENTERED IN COLUMN (the requested fix) */
.header-right {
  display: flex;
  flex-direction: column;
  align-items: center;      /* ✅ logo centered horizontally */
  justify-content: center;  /* ✅ prevents "stuck at top" */
  gap: 6px;
  text-align: center;
}

/* RTL: org identity aligns to the end, but logo column remains centered */
html[dir="rtl"] .header-left {
  align-items: flex-end;
  text-align: end;
}

/* Keep the right column centered in RTL too (do NOT push logo to the edge) */
html[dir="rtl"] .header-right {
  align-items: center;
  text-align: center;
}

/* Logo */
.org-logo {
  display: block;
  margin: 0 auto;           /* ✅ extra safety */
  width: 56px;              /* slightly larger to match expected header screenshot */
  height: 56px;
  object-fit: contain;
  border-radius: 4px;
}

/* Org block typography */
.org-block .org-name {
  font-size: 11pt;
  font-weight: 700;
}

.org-block .ou-name,
.org-block .module-name {
  font-size: 9.5pt;
  color: #444;
}

/* Document title */
.doc-title {
  font-size: 16pt;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.doc-subtitle {
  font-size: 10pt;
  color: #444;
  margin-block-start: 3px;
}

/* Ref/date block — shown under logo (right column) */
.ref-date {
  font-size: 10pt;
  line-height: 1.3;
  text-align: center;
}

.ref-date .label { color: #444; }
.ref-date .value { font-weight: 700; }

/* Divider */
.hr-strong {
  border: none;
  border-top: 2px solid #222;
  margin: 10px 0 12px 0;
}

/* -----------------------------
   4) Metadata block (under title)
   ----------------------------- */
.meta-block {
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  padding: 10px 12px;
  background: #fafafa;
  width: 100%;
  box-sizing: border-box;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 14px;
}

/* RTL: meta-block and meta-grid inherit RTL direction, ensure full width */
html[dir="rtl"] .meta-block {
  direction: rtl;
  text-align: right;
  width: 100%;
}
html[dir="rtl"] .meta-grid {
  direction: rtl;
  width: 100%;
}

.meta-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.meta-item .k,
.meta-item .meta-label {
  color: #444;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.meta-item .v,
.meta-item .meta-value {
  font-weight: 600;
}

/* RTL: natural flex direction handles ordering; just ensure text alignment */
html[dir="rtl"] .meta-item {
  direction: rtl;
}
html[dir="rtl"] .meta-item .k,
html[dir="rtl"] .meta-item .meta-label {
  text-align: right;
}
html[dir="rtl"] .meta-item .v,
html[dir="rtl"] .meta-item .meta-value {
  text-align: right;
}

/* -----------------------------
   5) Section headings
   ----------------------------- */
.section-title {
  font-size: 12pt;
  font-weight: 800;
  color: #1a1a1a;
  margin-block: 14px 6px;
  text-align: start;
}

/* RTL: section titles align right, full width */
html[dir="rtl"] .section-title {
  text-align: right;
  width: 100%;
}

.section-divider {
  border: none;
  border-top: 1px solid #d6d6d6;
  margin: 6px 0 8px 0;
  width: 100%;
}

/* -----------------------------
   6) Tables (QA baseline)
   - bold header row
   - borders
   - consistent padding
   - totals emphasis
   ----------------------------- */
.table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.table th,
.table td {
  border: 1px solid #bfbfbf;
  padding: 7px 8px;
  vertical-align: top;
  word-wrap: break-word;
}

.table th {
  font-weight: 800;
  background: #f2f2f2;
  text-align: start; /* logical */
}

.table td {
  font-weight: 500;
  text-align: start;
}

/* RTL: table text aligns right, direction flows RTL, full width */
html[dir="rtl"] .table {
  direction: rtl;
  width: 100%;
}
html[dir="rtl"] .table th,
html[dir="rtl"] .table td {
  text-align: right;
}

/* Numeric columns */
.table .num,
.table td.num {
  text-align: end;
}

/* Totals row */
.table tfoot td,
.table .total-row td {
  font-weight: 800;
  background: #fbfbfb;
}

/* -----------------------------
   6b) Callout blocks (notes, warnings)
   ----------------------------- */
.callout {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border-radius: 4px;
  margin-block: 4px 0;
}
.callout-info {
  background: #f0f7ff;
  border-left: 3px solid #3b82f6;
}
.callout-warning {
  background: #fffbeb;
  border-left: 3px solid #f59e0b;
}
html[dir="rtl"] .callout-info {
  border-left: none;
  border-right: 3px solid #3b82f6;
}
html[dir="rtl"] .callout-warning {
  border-left: none;
  border-right: 3px solid #f59e0b;
}

/* -----------------------------
   7) Status pill / badges (optional)
   ----------------------------- */
.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid #c9c9c9;
  font-size: 9.5pt;
  font-weight: 700;
  background: #f7f7f7;
}

.badge-success { background: #eef7ee; border-color: #cfe6cf; }
.badge-warn    { background: #fff5e6; border-color: #ffe2b8; }
.badge-danger  { background: #fdecec; border-color: #f6caca; }

/* -----------------------------
   8) Signature blocks (QA baseline)
   ----------------------------- */
.signatures {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  margin-block-start: 22px;
}

.sig {
  width: 33%;
  border-top: 2px solid #222;
  padding-top: 8px;
}

.sig .role {
  font-weight: 800;
  margin-block-end: 8px;
}

.sig .line {
  border-bottom: 1px solid #888;
  height: 16px;
  margin-block: 10px 6px;
}

.sig .hint {
  font-size: 9pt;
  color: #444;
}

/* Mirror signature alignment in RTL without changing width */
html[dir="rtl"] .signatures { flex-direction: row-reverse; }
html[dir="rtl"] .sig { text-align: start; }

/* -----------------------------
   9) Footer (Page X of Y)
   - Page numbering injected by PDF engine / wrapper
   ----------------------------- */
.official-footer {
  position: fixed;
  bottom: 10mm;
  left: 14mm;
  right: 14mm;
  font-size: 9.5pt;
  color: #444;
  display: flex;
  justify-content: space-between;
}

.footer-left  { text-align: start; }
.footer-right { text-align: end; }

/* -----------------------------
   10) Arrow/icon mirroring (if present)
   ----------------------------- */
html[dir="rtl"] .icon-arrow { transform: scaleX(-1); }
`;
