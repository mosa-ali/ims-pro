# PDF Header RTL Observations (from user screenshots)

## Old BOM Header (v4, OfficialWrapper + official-pdf.css) — CORRECT

### LTR (English):
- LEFT: Org name "Efadah Organization for Development (EFADAH)", EFADAH Headquarters, Logistics & Procurement
- CENTER: "BID OPENING MINUTES" (large bold)
- RIGHT: Logo (centered), below it "BOM-BA-EFADAH01-2026" reference number
- Content fills full page width edge-to-edge

### RTL (Arabic):
- LEFT: Logo (centered), below it reference number "BOM-BA-EFADAH01-2026-003"
- CENTER: "محضر فتح العروض" (large bold)
- RIGHT: Org name "Efadah Organization for Development (EFADAH)", EFADAH Headquarters, الخدمات اللوجستية والمشتريات
- Properly MIRRORED — logo and org swap sides
- Content fills full page width edge-to-edge

## New BOM Header (v6, official-pdf-v2.css) — BROKEN

### LTR (English):
- Same layout as old but narrower, text wrapping on org name and ref number
- "BOM-BA-EFADAH01-2026-003" wraps to two lines

### RTL (Arabic):
- NOT MIRRORED — Org name still on LEFT, Logo still on RIGHT (same as LTR!)
- Content narrower than old version, more spacing/padding

## Key Insight
The old official-pdf.css used flexbox with RTL selectors that properly mirrored.
The official-pdf-v2.css uses CSS Grid with grid-template-areas but the RTL rules are not working.
Solution: Revert BOM to old OfficialWrapper header, and fix v2 CSS for BE/CBA.
