# BOM RTL Mechanism Analysis

## How BOM achieves RTL header mirroring:

### HTML Structure (OfficialWrapper.ts):
```html
<html dir="rtl" lang="ar">
  <div class="official-header">        <!-- flexbox: justify-content: space-between -->
    <div class="header-left">           <!-- org name block -->
    <div class="header-center">         <!-- title -->
    <div class="header-right">          <!-- logo + ref -->
  </div>
  <hr class="hr-strong" />
```

### CSS (official-pdf.css):
```css
.official-header {
  display: flex;
  justify-content: space-between;   /* KEY: flexbox auto-reverses in RTL */
}
.header-left  { width: 28%; }
.header-center{ width: 44%; }
.header-right { width: 28%; }
```

### Why it works:
- Flexbox with `justify-content: space-between` auto-reverses child order when `dir="rtl"` on `<html>`
- In LTR: header-left appears LEFT, header-right appears RIGHT
- In RTL: header-left appears RIGHT, header-right appears LEFT
- The CSS names "left" and "right" are semantic (org vs logo), not positional
- RTL-specific CSS only adjusts text alignment within blocks, not positions

### Key: NO dual HTML branches, NO grid-template-areas swap needed
- Single HTML template
- CSS flexbox does the mirroring automatically
- `html[dir="rtl"] .header-left { align-items: flex-end; text-align: end; }`
- `html[dir="rtl"] .header-right { align-items: center; text-align: center; }`
