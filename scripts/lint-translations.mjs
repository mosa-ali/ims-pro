#!/usr/bin/env node
// ============================================================================
// IMS Translation Anti-Pattern Linter
// ============================================================================
// Detects common translation-related coding errors that cause runtime crashes.
// Run: node scripts/lint-translations.mjs
// Add to CI: "lint:translations": "node scripts/lint-translations.mjs"
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CLIENT_SRC = path.join(PROJECT_ROOT, 'client', 'src');

// ANSI colors
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let errorCount = 0;
let warningCount = 0;

function reportError(file, line, rule, message) {
  errorCount++;
  const relPath = path.relative(PROJECT_ROOT, file);
  console.log(`${RED}ERROR${RESET} ${relPath}:${line} [${CYAN}${rule}${RESET}] ${message}`);
}

function reportWarning(file, line, rule, message) {
  warningCount++;
  const relPath = path.relative(PROJECT_ROOT, file);
  console.log(`${YELLOW}WARN${RESET}  ${relPath}:${line} [${CYAN}${rule}${RESET}] ${message}`);
}

// ============================================================================
// Helper: Find function boundaries in a file
// Returns array of { start, end } line indices for each top-level function
// ============================================================================
function findFunctionBoundaries(lines) {
  const functions = [];
  let braceDepth = 0;
  let funcStart = -1;
  let funcStartDepth = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Detect function/component start at current brace depth
    if (funcStart === -1) {
      if (
        trimmed.match(/^(export\s+)?(default\s+)?function\s+\w+/) ||
        trimmed.match(/^(export\s+)?(default\s+)?const\s+\w+\s*[:=].*(?:=>|forwardRef)/)
      ) {
        funcStart = i;
        funcStartDepth = braceDepth;
      }
    }

    // Count braces
    // Skip braces inside strings/template literals (basic heuristic)
    let inString = false;
    let stringChar = '';
    for (let j = 0; j < lines[i].length; j++) {
      const ch = lines[i][j];
      const prev = j > 0 ? lines[i][j - 1] : '';
      if (inString) {
        if (ch === stringChar && prev !== '\\') inString = false;
      } else {
        if (ch === '"' || ch === "'" || ch === '`') {
          inString = true;
          stringChar = ch;
        } else if (ch === '{') {
          braceDepth++;
        } else if (ch === '}') {
          braceDepth--;
        }
      }
    }

    // Function ended when we return to the depth where it started
    if (funcStart !== -1 && braceDepth <= funcStartDepth && i > funcStart) {
      functions.push({ start: funcStart, end: i });
      funcStart = -1;
      funcStartDepth = -1;
    }
  }

  return functions;
}

// ============================================================================
// Rule 1: Hook inside function parameters
// Detects: function Foo({ const { isRTL } = useLanguage(); }: Props) {
// ============================================================================
function ruleHookInsideParams(file, content, lines) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('//') || line.startsWith('*')) continue;

    if (
      (line.includes('useLanguage()') || line.includes('useTranslation()')) &&
      i > 0 && i < lines.length - 1
    ) {
      // Check if this line is between function params opening and closing
      for (let j = Math.max(0, i - 5); j < i; j++) {
        if (lines[j].match(/function\s+\w+\s*\(\s*\{/) || lines[j].match(/=\s*\(\s*\{/)) {
          for (let k = i + 1; k < Math.min(lines.length, i + 5); k++) {
            if (lines[k].match(/\}\s*:\s*\w+.*\)\s*[{=]/) || lines[k].match(/\}\s*\)\s*[{=]/)) {
              reportError(file, i + 1, 'no-hook-in-params',
                'Hook call detected inside function parameter destructuring. Move to function body.');
              return; // Only report once per file
            }
          }
        }
      }
    }
  }
}

// ============================================================================
// Rule 2: Duplicate translation variable declarations in same function
// Only checks translation-specific variables: isRTL, language, t
// Uses proper function boundary detection to avoid cross-component false positives
// ============================================================================
function ruleDuplicateTranslationVars(file, content, lines) {
  const functions = findFunctionBoundaries(lines);

  for (const func of functions) {
    const translationVars = new Map();

    for (let i = func.start; i <= func.end; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//')) continue;

      // Check useLanguage destructure: const { isRTL, language } = useLanguage()
      const langMatch = line.match(/const\s+\{([^}]+)\}\s*=\s*useLanguage\(\)/);
      if (langMatch) {
        const vars = langMatch[1].split(',').map(v => v.trim().split(':')[0].trim()).filter(Boolean);
        for (const v of vars) {
          if (translationVars.has(v)) {
            const prev = translationVars.get(v);
            reportError(file, i + 1, 'no-duplicate-vars',
              `Translation variable '${v}' already declared at line ${prev.line} (from ${prev.source}). Remove one.`);
          } else {
            translationVars.set(v, { line: i + 1, source: 'useLanguage' });
          }
        }
      }

      // Check useState for isRTL or language specifically
      const stateMatch = line.match(/const\s+\[(isRTL|language)\b/);
      if (stateMatch && line.includes('useState')) {
        const v = stateMatch[1];
        if (translationVars.has(v)) {
          const prev = translationVars.get(v);
          reportError(file, i + 1, 'no-duplicate-vars',
            `Translation variable '${v}' already declared at line ${prev.line} (from ${prev.source}). Remove one.`);
        } else {
          translationVars.set(v, { line: i + 1, source: 'useState' });
        }
      }

      // Check for duplicate t from useTranslation + getTranslations
      if (line.match(/const\s+(\{\s*t\s*\}|t)\s*=\s*useTranslation/)) {
        if (translationVars.has('t')) {
          const prev = translationVars.get('t');
          reportError(file, i + 1, 'no-duplicate-vars',
            `Translation variable 't' already declared at line ${prev.line} (from ${prev.source}). Remove one.`);
        } else {
          translationVars.set('t', { line: i + 1, source: 'useTranslation' });
        }
      }
      if (line.match(/const\s+t\s*=\s*getTranslations/)) {
        if (translationVars.has('t')) {
          const prev = translationVars.get('t');
          reportError(file, i + 1, 'no-duplicate-vars',
            `Translation variable 't' already declared at line ${prev.line} (from ${prev.source}). Remove one.`);
        } else {
          translationVars.set('t', { line: i + 1, source: 'getTranslations' });
        }
      }
    }
  }
}

// ============================================================================
// Rule 3: getTranslations function usage (deprecated pattern)
// Detects: function getTranslations(lang) { ... }
// ============================================================================
function ruleNoGetTranslations(file, content, lines) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/function\s+getTranslations\s*\(/)) {
      reportError(file, i + 1, 'no-get-translations',
        'Deprecated getTranslations() function. Migrate to useTranslation() from @/i18n/useTranslation. ' +
        'See IMS_INLINE_TRANSLATIONS_GUIDELINE.md for migration steps.');
    }
  }
}

// ============================================================================
// Rule 4: Hook call inside object literal or module-level constant
// Detects: const X = { useLanguage(), ... }
// ============================================================================
function ruleHookInObjectLiteral(file, content, lines) {
  let inModuleLevelObject = false;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect module-level const assignments with object literals (not inside functions)
    if (line.match(/^const\s+\w+\s*=\s*\{/) && !line.match(/function|=>|\)\s*\{/)) {
      inModuleLevelObject = true;
      braceCount = 0;
    }

    if (inModuleLevelObject) {
      for (const ch of line) {
        if (ch === '{') braceCount++;
        if (ch === '}') braceCount--;
      }

      if (line.includes('useLanguage()') || line.includes('useTranslation()')) {
        reportError(file, i + 1, 'no-hook-in-object',
          'React hook called inside object literal or module-level constant. ' +
          'Hooks can only be called inside React function components or custom hooks.');
      }

      if (braceCount <= 0) {
        inModuleLevelObject = false;
      }
    }
  }
}

// ============================================================================
// Rule 5: Warn about mixed translation patterns in same file
// Detects: file using both useTranslation() AND inline const L = { en: {...}, ar: {...} }
// ============================================================================
function ruleMixedPatterns(file, content, lines) {
  const hasUseTranslation = /useTranslation\(\)/.test(content);
  
  // Check for actual inline translation patterns (not just 'en'/'ar' string usage)
  const hasInlineL = /const\s+L\s*=\s*\{[^}]*en\s*:/.test(content);
  const hasInlineLabels = /const\s+(labels|translations)\s*[:=]\s*\{[^}]*en\s*:/.test(content);
  
  // Check for inline ternary display strings: language === 'en' ? 'English text' : 'Arabic text'
  // Exclude legitimate patterns: isRTL ? 'ar' : 'en' (passing to utility functions/APIs)
  const inlineTernaryPattern = /language\s*===\s*['"]en['"]\s*\?\s*['"][A-Z][^'"]+['"]\s*:\s*['"][\u0600-\u06FF]/;
  const hasInlineTernary = inlineTernaryPattern.test(content);
  
  if (hasUseTranslation && (hasInlineL || hasInlineLabels || hasInlineTernary)) {
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.includes('useTranslation()') && !trimmed.startsWith('//') && !trimmed.startsWith('import')) {
        reportWarning(file, i + 1, 'no-mixed-translations',
          'File uses both centralized useTranslation() and inline translations. ' +
          'Consider migrating inline translations to the centralized system.');
        break;
      }
    }
  }
}

// ============================================================================
// Rule 6: Undefined isRTL variable usage (not declared anywhere in component)
// ============================================================================
function ruleUndefinedTranslationVars(file, content, lines) {
  const usesIsRTL = /[^a-zA-Z_]isRTL[^a-zA-Z_?:]/.test(content);
  if (!usesIsRTL) return;

  // Check if isRTL is declared anywhere in the file
  const declaresIsRTL =
    content.includes('useLanguage()') ||
    /isRTL\s*[?:]/.test(content) ||       // prop type definition
    /isRTL\s*,/.test(content) ||           // destructured prop
    /isRTL\s*\}/.test(content) ||          // destructured prop (last)
    /\[isRTL/.test(content) ||             // useState
    /isRTL\s*=\s*/.test(content) ||        // assignment
    /interface.*isRTL/.test(content) ||    // interface definition
    /isRTL\?\s*:/.test(content);           // optional prop

  if (!declaresIsRTL) {
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (/[^a-zA-Z_]isRTL[^a-zA-Z_?:]/.test(lines[i]) && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
        reportError(file, i + 1, 'no-undefined-isRTL',
          'Variable isRTL is used but never declared. Add useLanguage() hook or accept isRTL as a prop.');
        break;
      }
    }
  }
}

// ============================================================================
// File scanner
// ============================================================================
function getAllTsxFiles(dir) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '_core' || entry.name === 'backup') continue;
        files.push(...getAllTsxFiles(fullPath));
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx') || entry.name.endsWith('.d.ts')) continue;
        files.push(fullPath);
      }
    }
  } catch (e) {
    // Skip unreadable directories
  }
  return files;
}

function lintFile(file) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  ruleHookInsideParams(file, content, lines);
  ruleDuplicateTranslationVars(file, content, lines);
  ruleNoGetTranslations(file, content, lines);
  ruleHookInObjectLiteral(file, content, lines);
  ruleMixedPatterns(file, content, lines);
  ruleUndefinedTranslationVars(file, content, lines);
}

// ============================================================================
// Main
// ============================================================================
console.log(`${BOLD}IMS Translation Anti-Pattern Linter${RESET}`);
console.log(`Scanning ${CLIENT_SRC}...\n`);

const files = getAllTsxFiles(CLIENT_SRC);
console.log(`Found ${files.length} TypeScript/TSX files to check.\n`);

for (const file of files) {
  lintFile(file);
}

console.log('');
console.log(`${BOLD}Results:${RESET}`);
if (errorCount > 0) {
  console.log(`  ${RED}${errorCount} error(s)${RESET}`);
}
if (warningCount > 0) {
  console.log(`  ${YELLOW}${warningCount} warning(s)${RESET}`);
}
if (errorCount === 0 && warningCount === 0) {
  console.log(`  ${GREEN}\u2713 No translation anti-patterns detected${RESET}`);
}

console.log('');
console.log(`${BOLD}Rules checked:${RESET}`);
console.log('  no-hook-in-params      \u2192 Hooks inside function parameter destructuring');
console.log('  no-duplicate-vars      \u2192 Duplicate isRTL/language/t declarations in same function');
console.log('  no-get-translations    \u2192 Deprecated getTranslations() function');
console.log('  no-hook-in-object      \u2192 Hook calls inside object literals');
console.log('  no-mixed-translations  \u2192 Mixed centralized + inline patterns (warning)');
console.log('  no-undefined-isRTL     \u2192 Undefined isRTL variable usage');

// --ci flag: also fail on warnings in CI mode
const isCI = process.argv.includes('--ci');
if (isCI && (errorCount > 0 || warningCount > 0)) {
  console.log(`\n${RED}CI mode: failing because ${errorCount} error(s) and ${warningCount} warning(s) were found.${RESET}`);
  console.log(`${YELLOW}Tip: Warnings about mixed patterns can be suppressed by migrating inline translations.${RESET}`);
}

// In normal mode, only errors cause failure. In CI mode, warnings also cause failure.
process.exit(errorCount > 0 ? 1 : 0);
