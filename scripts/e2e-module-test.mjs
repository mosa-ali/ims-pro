#!/usr/bin/env node
// ============================================================================
// IMS End-to-End Module Crash Test
// ============================================================================
// Visits all module pages via HTTP and checks for Vite transform/parse errors
// that would cause runtime crashes. Uses the dev server's error overlay.
// Run: node scripts/e2e-module-test.mjs
// ============================================================================

import http from 'http';

const BASE = 'http://localhost:3000';

// Key pages from each module to test
const ROUTES = [
  // HR Module
  '/organization/hr',
  '/organization/hr/overview',
  '/organization/hr/employees',
  '/organization/hr/employees/profiles',
  '/organization/hr/employees/add',
  '/organization/hr/leave',
  '/organization/hr/payroll',
  '/organization/hr/salary-scale',
  '/organization/hr/recruitment',
  '/organization/hr/training',
  '/organization/hr/documents',
  '/organization/hr/reports',
  '/organization/hr/reports-analytics',
  '/organization/hr/settings',
  '/organization/hr/sanctions',
  '/organization/hr/annual-plan',
  '/organization/hr/attendance',
  '/organization/hr/attendance/calendar',
  '/organization/hr/attendance/records',
  '/organization/hr/attendance/overtime',
  '/organization/hr/attendance/reports',
  '/organization/hr/attendance/periods',
  '/organization/hr/staff-dictionary',

  // Finance Module
  '/organization/finance',
  '/organization/finance/overview',
  '/organization/finance/chart-of-accounts',
  '/organization/finance/budgets',
  '/organization/finance/expenditures',
  '/organization/finance/reports',
  '/organization/finance/advances',
  '/organization/finance/assets',
  '/organization/finance/treasury',
  '/organization/finance/settings',
  '/organization/finance/vendor-management',
  '/organization/finance/vendor-performance-evaluation',
  '/organization/finance/budget-utilization',
  '/organization/finance/payables',
  '/organization/finance/vendors',
  '/organization/finance/payments',
  '/organization/finance/payment-reports',
  '/organization/finance/bank-statement-import',
  '/organization/finance/bank-reconciliation-matching',
  '/organization/finance/journal-entries',
  '/organization/finance/exchange-rates',
  '/organization/finance/cost-allocation',
  '/organization/finance/dashboard',

  // Logistics Module
  '/organization/logistics',
  '/organization/logistics/my-prs',
  '/organization/logistics/vendors',
  '/organization/logistics/vendors/suppliers',
  '/organization/logistics/vendors/contractors',
  '/organization/logistics/vendors/service-providers',
  '/organization/logistics/reports',

  // MEAL Module
  '/organization/meal',
  '/organization/meal/main',
  '/organization/meal/dashboard',
  '/organization/meal/indicators',
  '/organization/meal/indicators/list',
  '/organization/meal/indicators/add',
  '/organization/meal/indicators/charts',
  '/organization/meal/indicators/export',
  '/organization/meal/indicators/data-verification',
  '/organization/meal/indicators/bulk-import',
  '/organization/meal/data-entry',
  '/organization/meal/survey',
  '/organization/meal/survey/dashboard',
  '/organization/meal/survey/list',
  '/organization/meal/survey/create',
  '/organization/meal/survey/forms',
  '/organization/meal/survey/templates',
  '/organization/meal/survey/submissions',
  '/organization/meal/survey/import-export',
  '/organization/meal/survey/reports',
  '/organization/meal/survey/analytics',
  '/organization/meal/accountability',
  '/organization/meal/documents',
  '/organization/meal/reports',

  // Risk & Compliance
  '/organization/risk-compliance',
  '/organization/risk-compliance/dashboard',
  '/organization/risk-compliance/risk-registry',
  '/organization/risk-compliance/incident-log',

  // Donor CRM
  '/organization/donor-crm',
  '/organization/donor-crm/opportunities',
  '/organization/donor-crm/donors',
  '/organization/donor-crm/communications',
  '/organization/donor-crm/reports',

  // Reports & Analytics
  '/organization/reports-analytics',

  // Settings
  '/organization/settings',
  '/organization/settings/users',
  '/organization/settings/roles',
  '/organization/settings/options',
  '/organization/settings/notifications',
  '/organization/settings/branding',
  '/organization/settings/language',
  '/organization/settings/import-history',
  '/organization/settings/system-health',
  '/organization/settings/unit-types',
  '/organization/settings/documents',
];

function fetchPage(route) {
  return new Promise((resolve) => {
    const url = `${BASE}${route}`;
    const req = http.get(url, { timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({ route, status: res.statusCode, body, error: null });
      });
    });
    req.on('error', (err) => {
      resolve({ route, status: 0, body: '', error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ route, status: 0, body: '', error: 'TIMEOUT' });
    });
  });
}

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

async function main() {
  console.log(`${BOLD}IMS End-to-End Module Crash Test${RESET}`);
  console.log(`Testing ${ROUTES.length} routes against ${BASE}\n`);

  const results = { pass: [], fail: [], error: [] };

  // Test in batches of 5 to avoid overwhelming the server
  for (let i = 0; i < ROUTES.length; i += 5) {
    const batch = ROUTES.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(fetchPage));

    for (const result of batchResults) {
      if (result.error) {
        results.error.push(result);
        console.log(`${RED}ERROR${RESET} ${result.route} → ${result.error}`);
      } else if (result.status !== 200) {
        results.fail.push(result);
        console.log(`${RED}FAIL${RESET}  ${result.route} → HTTP ${result.status}`);
      } else {
        // Check for Vite transform errors in the HTML response
        const hasViteError = result.body.includes('Internal server error') ||
                            result.body.includes('Transform failed') ||
                            result.body.includes('SyntaxError') ||
                            result.body.includes('Parse error');
        if (hasViteError) {
          results.fail.push(result);
          // Extract error message
          const errorMatch = result.body.match(/(Internal server error[^<]*)/);
          const msg = errorMatch ? errorMatch[1].substring(0, 120) : 'Vite transform error detected';
          console.log(`${RED}FAIL${RESET}  ${result.route} → ${msg}`);
        } else {
          results.pass.push(result);
          console.log(`${GREEN}PASS${RESET}  ${result.route}`);
        }
      }
    }
  }

  console.log(`\n${BOLD}Results:${RESET}`);
  console.log(`  ${GREEN}${results.pass.length} passed${RESET}`);
  if (results.fail.length > 0) console.log(`  ${RED}${results.fail.length} failed${RESET}`);
  if (results.error.length > 0) console.log(`  ${YELLOW}${results.error.length} errors${RESET}`);
  console.log(`  Total: ${ROUTES.length} routes tested`);

  if (results.fail.length > 0) {
    console.log(`\n${BOLD}Failed routes:${RESET}`);
    for (const f of results.fail) {
      console.log(`  ${RED}•${RESET} ${f.route}`);
    }
  }

  process.exit(results.fail.length + results.error.length > 0 ? 1 : 0);
}

main().catch(console.error);
