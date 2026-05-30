TASK: IMPLEMENT CENTRALIZED GLOBAL CURRENCY ENGINE WITH INFOREURO INTEGRATION
PROJECT:
Enterprise Humanitarian ERP Platform (NGO/INGO)

IMPORTANT IMPLEMENTATION STRATEGY:
DO NOT refactor the entire system immediately.

Implementation MUST happen in phases:

PHASE 1:
- Build centralized currency architecture
- Build automatic exchange-rate engine
- Rebuild currencyFormatter.ts
- Integrate with EXISTING tables ONLY
- Test ONLY in projectRouter.ts first

PHASE 2:
- Validate calculations
- Validate exchange synchronization
- Validate donor reports
- Validate formatting
- Validate backward compatibility

PHASE 3:
- After approval, gradually replace hardcoded exchange rates across the entire system

CRITICAL:
DO NOT update all routers/files yet.
Only test implementation in:
- projectRouter.ts

========================================================
EXISTING DATABASE TABLES (USE THESE ONLY)
========================================================

DO NOT CREATE NEW TABLES.

Use existing tables:

1. financeCurrencies
2. financeExchangeRates

These are already production-grade and should become the system source of truth.

========================================================
TABLE REVIEW & REQUIRED ENHANCEMENTS
========================================================

Review existing schema and ONLY add missing fields if truly required.

Current tables already support:
- currencies
- exchange rates
- historical rates
- effective dates
- organization-level isolation
- rate types
- approvals
- audit trail

This is GOOD and should remain.

Possible OPTIONAL enhancements ONLY if needed:
- lastSyncedAt
- syncSource
- syncStatus
- externalReference
- isSystemManaged

DO NOT create duplicate structures.

========================================================
PHASE 1 — CREATE CENTRALIZED CURRENCY ARCHITECTURE
========================================================

Create centralized structure:

src/shared/currency/

Files:

- currencies.ts
- currencyFormatter.ts
- currencyConversion.ts
- exchangeRateEngine.ts
- exchangeRateProvider.ts
- exchangeRateCache.ts
- exchangeRateService.ts
- exchangeRateTypes.ts
- index.ts

========================================================
PHASE 2 — REBUILD currencyFormatter.ts
========================================================

Current formatter exists but must be revised and standardized.

Requirements:
- use ALL provided GLOBAL_CURRENCIES
- remove duplication
- ensure consistency
- ensure symbols are correct
- ensure Arabic support
- ensure RTL support
- ensure Intl.NumberFormat usage
- ensure proper decimals
- ensure locale awareness

Must support:
- en-US
- en-GB
- ar-YE
- fr-FR

Required methods:

1. formatCurrency()
2. formatCompactCurrency()
3. formatAccountingCurrency()
4. parseCurrency()
5. formatCurrencyInput()
6. getCurrencySymbol()
7. getCurrencyName()
8. getCurrencyNameAr()
9. getCurrencyConfig()

Requirements:
- no duplicated currency definitions
- no duplicated symbols
- no duplicated unions
- type-safe CurrencyCode generation
- ISO 4217 aligned

IMPORTANT:
Current implementation already contains large currency coverage.
Preserve and improve it — do not rebuild blindly.

========================================================
PHASE 3 — CREATE AUTOMATIC EXCHANGE RATE ENGINE
========================================================

IMPORTANT:
Before updating ANY business module,
FIRST create centralized automatic exchange engine.

SOURCE OF TRUTH:
European Commission InforEuro

https://commission.europa.eu/funding-and-tenders/procedures-guidelines-tenders/information-contractors-and-beneficiaries/exchange-rate-inforeuro_en

========================================================
ENGINE REQUIREMENTS
========================================================

Create:

exchangeRateProvider.ts
Responsible for:
- fetching InforEuro data
- parsing rates
- validating rates
- normalization

exchangeRateEngine.ts
Responsible for:
- synchronization
- retries
- scheduled updates
- caching
- validation
- logging
- stale handling

exchangeRateService.ts
Responsible for:
- DB interaction
- retrieving latest rates
- conversion helpers
- historical lookup

========================================================
IMPORTANT BUSINESS RULE
========================================================

InforEuro is EUR-based.

System MUST support:
- EUR base
- USD conversions
- direct conversions between currencies

Example:
YER → USD
USD → EUR
SAR → GBP

without requiring duplicate stored rates.

========================================================
CACHE STRATEGY
========================================================

Implement:
- memory cache
- TTL cache
- stale fallback

Requirements:
- avoid excessive API fetches
- avoid repeated DB reads
- safe fallback if InforEuro unavailable

========================================================
SYNC STRATEGY
========================================================

Create scheduled sync:

syncInforEuroRates()

Requirements:
- daily execution
- retry handling
- preserve previous valid rates
- reject invalid rates
- log sync operations

Validation:
- reject zero rates
- reject negative rates
- detect abnormal fluctuations

========================================================
PHASE 4 — TEST IMPLEMENTATION ONLY IN projectRouter.ts
========================================================

IMPORTANT:
DO NOT update all files yet.

FIRST:
Replace hardcoded currency conversion ONLY inside:
- projectRouter.ts

Current bad pattern:

const CURRENCY_RATES = {
  USD: 1.0,
  EUR: 1.09,
  GBP: 1.27,
};

Replace with:
- centralized exchangeRateService
- centralized currencyFormatter
- DB-driven rates
- cached exchange engine

========================================================
VALIDATION REQUIREMENTS BEFORE GLOBAL ROLLOUT
========================================================

After projectRouter.ts implementation:

Validate:
- donor budgets
- budget utilization
- exchange calculations
- reporting totals
- forecasts
- project KPIs
- financial summaries
- decimal precision
- Arabic formatting
- RTL display
- exchange-date accuracy

ONLY after approval:
- proceed to system-wide replacement

========================================================
PHASE 5 — GLOBAL SYSTEM ROLLOUT (AFTER APPROVAL ONLY)
========================================================

After successful validation in projectRouter.ts:

Then gradually replace hardcoded exchange rates across:
- financeRouter.ts
- procurement
- grants
- dashboards
- payroll
- forecasting
- reports
- analytics
- logistics
- donor reporting

========================================================
IMPORTANT IMPLEMENTATION RULES
========================================================

DO:
- reuse existing tables
- preserve backward compatibility
- implement gradually
- maintain auditability
- preserve historical rates
- preserve organization isolation
- preserve donor compliance
- preserve financial precision

DO NOT:
- create duplicate exchange tables
- hardcode rates
- refactor entire platform immediately
- duplicate currency logic
- duplicate formatter logic
- duplicate conversion logic

========================================================
TECHNICAL REQUIREMENTS
========================================================

Use:
- TypeScript strict mode
- Drizzle ORM
- centralized services
- reusable helpers
- typed currency codes
- Zod validation
- memoization
- lazy loading
- cache layer

Avoid:
- any
- duplicated unions
- duplicated configs
- scattered utilities

========================================================
EXPECTED FINAL RESULT
========================================================

PHASE 1 FINAL RESULT:
- centralized currency architecture
- automatic InforEuro exchange engine
- revised currencyFormatter.ts
- DB-integrated exchange management
- projectRouter.ts successfully migrated
- tested and validated calculations

PHASE 2 FINAL RESULT:
- gradual safe rollout across ERP
- zero hardcoded exchange rates
- centralized financial governance
- scalable humanitarian ERP currency architecture

IMPORTANT:
This is a production-critical financial architecture task.
Implementation must prioritize:
- safety
- backward compatibility
- auditability
- maintainability
- donor compliance
- financial precision