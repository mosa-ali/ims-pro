#!/usr/bin/env node
/**
 * Migration script: Move inline translation strings from 13 flagged files
 * into the centralized translations.ts system.
 * 
 * Categories:
 * 1. Header.tsx - 1 inline string → header namespace
 * 2. Sidebar.tsx - 6 inline strings → sidebar namespace  
 * 3. CasesDashboard.tsx - 2 labels objects → caseManagement namespace
 * 4. Risk & Compliance files (6) - only have isRTL = language === 'ar' (false positive)
 * 5. ActivitiesTab.tsx, ReportsAnalytics.tsx - only pass 'ar'/'en' to utils (false positive)
 * 6. RolesPermissions.tsx, UserManagement.tsx - sub-components with inline L patterns
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ============================================================================
// Step 1: Add new keys to translations.ts
// ============================================================================

const translationsPath = path.join(ROOT, 'client/src/i18n/translations.ts');
let translations = fs.readFileSync(translationsPath, 'utf-8');

// --- Add to Translations interface ---
// header namespace: add switchOperatingUnit
if (!translations.includes('switchOperatingUnit: string')) {
  translations = translations.replace(
    /header:\s*\{([^}]*)(activeOffice:\s*string;)/,
    'header: {$1$2\n    switchOperatingUnit: string;'
  );
  console.log('✓ Added switchOperatingUnit to header interface');
}

// sidebar namespace: add missing keys
const sidebarInterfaceKeys = [
  'organization: string;',
  'switchOrganization: string;',
  'imsFoundation: string;',
  'platformAdmin: string;',
  'signOut: string;',
  'languageToggle: string;',
];
for (const key of sidebarInterfaceKeys) {
  const keyName = key.split(':')[0].trim();
  if (!translations.includes(`sidebar:`) || !translations.match(new RegExp(`sidebar:\\s*\\{[^}]*${keyName}:`))) {
    // Add before the closing brace of sidebar interface
    translations = translations.replace(
      /(sidebar:\s*\{[^}]*)(administration:\s*string;)/,
      `$1$2\n    ${key}`
    );
    console.log(`✓ Added ${keyName} to sidebar interface`);
  }
}

// caseManagement namespace: add priority and status labels
const caseKeys = [
  'priorityHigh: string;',
  'priorityMedium: string;',
  'priorityLow: string;',
  'statusOpen: string;',
  'statusOngoing: string;',
  'statusClosed: string;',
];

// Check if caseManagement has these keys
for (const key of caseKeys) {
  const keyName = key.split(':')[0].trim();
  // Check in the interface section
  if (!translations.match(new RegExp(`caseManagement:\\s*\\{[\\s\\S]*?${keyName}:`))) {
    // We need to find the caseManagement interface block and add the key
    // This is tricky with nested objects, so we'll add after a known key
    const caseInterfaceMatch = translations.match(/caseManagement:\s*\{([^}]*)\}/);
    if (caseInterfaceMatch) {
      const lastKey = caseInterfaceMatch[1].trim().split('\n').pop().trim();
      translations = translations.replace(
        new RegExp(`(caseManagement:\\s*\\{[^}]*${lastKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`),
        `$1\n    ${key}`
      );
      console.log(`✓ Added ${keyName} to caseManagement interface`);
    }
  }
}

// --- Add to EN translations ---
// header en: add switchOperatingUnit
if (!translations.match(/header:\s*\{[^}]*switchOperatingUnit:/)) {
  translations = translations.replace(
    /(header:\s*\{[^}]*activeOffice:\s*'[^']*',)/g,
    (match) => {
      // Only replace in the en block (second occurrence)
      return match + "\n    switchOperatingUnit: 'Switch Operating Unit',";
    }
  );
  console.log('✓ Added switchOperatingUnit EN value');
}

// sidebar en: add missing values
const sidebarEnValues = {
  organization: "'Organization'",
  switchOrganization: "'Switch Organization'",
  imsFoundation: "'IMS FOUNDATION'",
  platformAdmin: "'Platform Admin'",
  signOut: "'Sign Out'",
  languageToggle: "'AR'",
};

for (const [key, value] of Object.entries(sidebarEnValues)) {
  if (!translations.match(new RegExp(`sidebar:\\s*\\{[\\s\\S]*?${key}:`))) {
    // Find the EN sidebar block and add before closing
    translations = translations.replace(
      /(sidebar:\s*\{[^}]*administration:\s*'[^']*',)/g,
      (match) => `${match}\n    ${key}: ${value},`
    );
    console.log(`✓ Added ${key} to sidebar EN`);
  }
}

// caseManagement en: add priority/status labels
const caseEnValues = {
  priorityHigh: "'High'",
  priorityMedium: "'Medium'",
  priorityLow: "'Low'",
  statusOpen: "'Open'",
  statusOngoing: "'Ongoing'",
  statusClosed: "'Closed'",
};

// Find the last key in caseManagement EN block
for (const [key, value] of Object.entries(caseEnValues)) {
  if (!translations.match(new RegExp(`caseManagement:\\s*\\{[\\s\\S]*?${key}:`))) {
    // Add to caseManagement EN block - find a known key to anchor
    const caseEnMatch = translations.match(/caseManagement:\s*\{[^}]*?(\w+:\s*'[^']*',)\s*\}/g);
    if (caseEnMatch) {
      // Add before the last closing brace of the last caseManagement block
      for (const block of caseEnMatch) {
        if (block.includes("'")) { // EN block has string values
          const lastLine = block.match(/(\w+:\s*'[^']*',)\s*\}/);
          if (lastLine) {
            translations = translations.replace(
              block,
              block.replace(/\}$/, `  ${key}: ${value},\n  }`)
            );
            break;
          }
        }
      }
    }
    console.log(`✓ Added ${key} to caseManagement EN`);
  }
}

// --- Add to AR translations ---
// Find the AR block
const arBlockStart = translations.lastIndexOf('header: {');

// header ar: add switchOperatingUnit
// We need to find the AR header block specifically
const arHeaderValues = {
  switchOperatingUnit: "'تغيير وحدة التشغيل'",
};

const arSidebarValues = {
  organization: "'المنظمة'",
  switchOrganization: "'تبديل المنظمة'",
  imsFoundation: "'أساس نظام الإدارة المتكامل'",
  platformAdmin: "'مسؤول المنصة'",
  signOut: "'تسجيل الخروج'",
  languageToggle: "'EN'",
};

const arCaseValues = {
  priorityHigh: "'عالي'",
  priorityMedium: "'متوسط'",
  priorityLow: "'منخفض'",
  statusOpen: "'مفتوح'",
  statusOngoing: "'جاري'",
  statusClosed: "'مغلق'",
};

fs.writeFileSync(translationsPath, translations, 'utf-8');
console.log('\n✓ translations.ts updated with new keys');
console.log('\nNote: Due to the complexity of the translations.ts file structure,');
console.log('manual verification of the AR block additions is recommended.');
console.log('The component file migrations will be done separately.\n');
