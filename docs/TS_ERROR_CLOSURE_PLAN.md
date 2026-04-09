# TypeScript Error Closure Plan

**Date:** February 5, 2026  
**Current Error Count:** 1528 errors (after cache clear)  
**Target:** Zero TypeScript errors

---

## 1. Error Summary by Type

| Error Code | Count | Description | Fix Strategy |
|------------|-------|-------------|--------------|
| TS2339 | 632 | Property does not exist on type | Add missing properties to interfaces or use type assertions |
| TS7006 | 152 | Parameter implicitly has 'any' type | Add explicit type annotations |
| TS2345 | 122 | Argument type not assignable | Fix type mismatches in function calls |
| TS2307 | 94 | Cannot find module | Fix import paths |
| TS2322 | 87 | Type not assignable | Fix type assignments |
| TS2769 | 81 | No overload matches this call | Fix function call signatures |
| TS2367 | 70 | Comparison always false | Fix type comparisons |
| TS2551 | 66 | Property misspelled | Fix property names |
| TS2353 | 44 | Object literal may only specify known properties | Remove unknown properties |
| TS2304 | 29 | Cannot find name | Add missing imports or declarations |

---

## 2. Top Error Files (Priority Order)

### Priority 1: Critical Services (Fix First)
| File | Errors | Owner | Fix Order |
|------|--------|-------|-----------|
| quotationAnalysisService.ts | 83 | Backend | 1 |
| paymentsRouter.ts | 19 | Backend | 2 |
| proposalsRouter.ts | 18 | Backend | 3 |
| financeSettingsRouter.ts | 13 | Backend | 4 |

### Priority 2: Frontend Hooks & Services
| File | Errors | Owner | Fix Order |
|------|--------|-------|-----------|
| useProjectReportData.tsx | 32 | Frontend | 5 |
| useMonthlyReportData.tsx | 31 | Frontend | 6 |
| hrReportsService.ts | 20+19 | Frontend | 7 |
| bidEvaluationCriteriaService.ts | 17 | Frontend | 8 |
| analysisFormService.ts | 15 | Frontend | 9 |

### Priority 3: Page Components
| File | Errors | Owner | Fix Order |
|------|--------|-------|-----------|
| ReportsAnalytics.tsx | 34 | Frontend | 10 |
| IndicatorsTab.tsx | 30 | Frontend | 11 |
| HRManagement.tsx | 27 | Frontend | 12 |
| InterviewManagement.tsx | 24 | Frontend | 13 |
| HiringDecisions.tsx | 22 | Frontend | 14 |
| ActivitiesTab.tsx | 21 | Frontend | 15 |
| ProjectDetail.tsx | 21 | Frontend | 16 |
| CandidateList.tsx | 21 | Frontend | 17 |
| EmployeesDirectory.tsx | 20 | Frontend | 18 |
| FinancePayments.tsx | 19 | Frontend | 19 |

### Priority 4: Remaining Files
| File | Errors | Owner | Fix Order |
|------|--------|-------|-----------|
| AppraisalPrintModal.tsx | 18 | Frontend | 20 |
| StaffDictionary.tsx | 18 | Frontend | 21 |
| ImportHistory.tsx | 17 | Frontend | 22 |
| LeaveRequestPrint.tsx | 17 | Frontend | 23 |
| translations.ts | 16 | Frontend | 24 |
| ProjectsManagementDashboard.tsx | 15 | Frontend | 25 |
| SupplierForm.tsx | 15 | Frontend | 26 |
| InterviewEvaluationForm.tsx | 15 | Frontend | 27 |
| ActiveGrants.tsx | 14 | Frontend | 28 |

---

## 3. Fix Strategy by Error Type

### TS2339 (Property does not exist) - 632 errors
**Root Cause:** Accessing properties that don't exist on the inferred type
**Fix Pattern:**
```typescript
// Before (error)
const value = data.nonExistentProperty;

// After (fixed)
const value = (data as any).nonExistentProperty; // Quick fix
// OR
interface ExtendedData extends BaseData {
  nonExistentProperty: string;
}
const value = (data as ExtendedData).nonExistentProperty; // Proper fix
```

### TS7006 (Implicit any) - 152 errors
**Root Cause:** Function parameters without type annotations
**Fix Pattern:**
```typescript
// Before (error)
const handler = (item) => item.name;

// After (fixed)
const handler = (item: ItemType) => item.name;
```

### TS2345 (Argument not assignable) - 122 errors
**Root Cause:** Passing wrong types to functions
**Fix Pattern:**
```typescript
// Before (error)
someFunction(stringValue); // expects number

// After (fixed)
someFunction(parseInt(stringValue, 10));
```

### TS2307 (Cannot find module) - 94 errors
**Root Cause:** Wrong import paths
**Fix Pattern:**
```typescript
// Before (error)
import { X } from '@/app/types';

// After (fixed)
import { X } from '@/types';
```

---

## 4. Execution Timeline

| Phase | Files | Estimated Errors Fixed | Timeline |
|-------|-------|------------------------|----------|
| Phase 1 | Backend routers (4 files) | ~130 | 1 hour |
| Phase 2 | Frontend hooks/services (5 files) | ~115 | 1 hour |
| Phase 3 | Page components (10 files) | ~250 | 2 hours |
| Phase 4 | Remaining files (15 files) | ~200 | 2 hours |
| Phase 5 | Scattered errors | ~833 | 3 hours |

**Total Estimated Time:** 9 hours

---

## 5. Verification Process

After each phase:
1. Run `npx tsc --noEmit` to verify error count reduction
2. Document remaining errors
3. Ensure no `@ts-ignore` or `any` suppressions for schema mismatches
4. Test affected functionality in browser

---

## 6. Success Criteria

- [ ] Zero TypeScript errors on `npx tsc --noEmit`
- [ ] No `@ts-ignore` comments for schema-related errors
- [ ] No `any` type assertions for database schema fields
- [ ] Clean build with `pnpm build`
- [ ] All tests pass with `pnpm test`

