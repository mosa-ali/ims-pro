# Finance API Standards

**Purpose**: tRPC router standards for all finance APIs  
**Applies to**: Phases 2–12; all developers  

---

## Router Organization

```
finance/
├── budget/
│   ├── allocate
│   ├── reallocate
│   ├── list
│   ├── getDetails
│   └── forecast
├── gl/
│   ├── postEntry
│   ├── getEntry
│   ├── getTrialBalance
│   ├── reconcile
│   └── list
├── treasury/
│   ├── getCashPosition
│   ├── getForecast
│   ├── getExposure
│   └── optimize
├── risk/
│   ├── evaluate
│   ├── getScore
│   ├── list
│   └── getRecommendations
├── compliance/
│   ├── validateRules
│   ├── getViolations
│   └── reportFinding
├── reports/
│   ├── getFinancialStatements
│   ├── getBudgetVsActual
│   ├── getDonorReport
│   └── getExecutiveBriefing
└── admin/
    ├── manageUsers
    ├── manageRules
    └── configureSystem
```

---

## Procedure Naming Convention

| Action | Prefix | Example |
|--------|--------|---------|
| Create | (none) | `allocate`, `postEntry` |
| Read | `get` or `list` | `getEntry`, `listInvoices` |
| Update | (action verb) | `reallocate`, `reconcile` |
| Delete | `delete` | `deleteEntry` (rare) |
| Multi-step | (verb noun) | `getBudgetVsActual`, `getDonorReport` |

---

## Input/Output Type Definitions

```typescript
// ✅ CORRECT: Explicit types with Zod validation
const AllocateBudgetInputSchema = z.object({
  projectId: z.number().positive(),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CHF']),
  allocationType: z.enum(['initial', 'supplementary']),
  approvedBy: z.number().positive(),
});

type AllocateBudgetInput = z.infer<typeof AllocateBudgetInputSchema>;

const AllocateBudgetOutputSchema = z.object({
  success: z.boolean(),
  budgetId: z.number().optional(),
  error: z.string().optional(),
  details: z.object({
    allocated: z.number(),
    spent: z.number(),
    available: z.number(),
  }).optional(),
});

type AllocateBudgetOutput = z.infer<typeof AllocateBudgetOutputSchema>;

// tRPC procedure
router.procedure
  .input(AllocateBudgetInputSchema)
  .output(AllocateBudgetOutputSchema)
  .mutation(async ({ input, ctx }) => {
    return await budgetEngine.allocate(input);
  });
```

---

## Error Response Standards

```typescript
// ✅ CONSISTENT error response
interface ErrorResponse {
  success: false;
  error: string;  // Error code (e.g., 'BudgetUnavailable')
  message: string;  // Human-readable message
  details?: unknown;  // Optional context
}

// Standard error codes
export const FinanceErrors = {
  INVALID_INPUT: 'InvalidInput',
  BUDGET_UNAVAILABLE: 'BudgetUnavailable',
  GL_UNBALANCED: 'GLUnbalanced',
  INSUFFICIENT_PERMISSION: 'InsufficientPermission',
  MULTI_ORG_MISMATCH: 'MultiOrgMismatch',
  THREE_WAY_MATCH_FAILED: 'ThreeWayMatchFailed',
  RULE_VIOLATION: 'RuleViolation',
  SYSTEM_ERROR: 'SystemError',
};

// Every error mapped to HTTP status
const errorStatus: Record<string, number> = {
  InvalidInput: 400,
  BudgetUnavailable: 422,
  GLUnbalanced: 422,
  InsufficientPermission: 403,
  MultiOrgMismatch: 403,
  ThreeWayMatchFailed: 422,
  RuleViolation: 422,
  SystemError: 500,
};
```

---

## Pagination Standards

```typescript
// ✅ Standard pagination input
const PaginatedInputSchema = z.object({
  page: z.number().positive().default(1),
  limit: z.number().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// ✅ Standard pagination output
interface PaginatedOutput<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Example
router.procedure
  .input(z.object({
    ...PaginatedInputSchema.shape,
    projectId: z.number(),
  }))
  .query(async ({ input }) => {
    const total = await db.select().from(invoices)
      .where(eq(invoices.projectId, input.projectId))
      .count();
    
    const data = await db.select().from(invoices)
      .where(eq(invoices.projectId, input.projectId))
      .limit(input.limit)
      .offset((input.page - 1) * input.limit)
      .orderBy(input.sortOrder === 'asc' ? asc(...) : desc(...));
    
    return {
      success: true,
      data,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        hasMore: (input.page * input.limit) < total,
      },
    };
  });
```

---

## Filter/Sort Standards

```typescript
// ✅ Standard filter input
const FilterInputSchema = z.object({
  organizationId: z.number(),
  operatingUnitId: z.number().optional(),
  dateRange: z.object({
    from: z.date(),
    to: z.date(),
  }).optional(),
  status: z.enum(['draft', 'approved', 'paid']).optional(),
  vendor: z.string().optional(),  // Partial match
  amount: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
});

// ✅ Build dynamic filters
function buildFilter(input: FilterInput) {
  const filters = [];
  
  if (input.dateRange) {
    filters.push(
      gte(invoices.invoiceDate, input.dateRange.from),
      lte(invoices.invoiceDate, input.dateRange.to)
    );
  }
  
  if (input.status) {
    filters.push(eq(invoices.status, input.status));
  }
  
  if (input.vendor) {
    filters.push(
      ilike(vendors.name, `%${input.vendor}%`)  // Case-insensitive partial
    );
  }
  
  if (input.amount?.min) {
    filters.push(gte(invoices.amount, input.amount.min));
  }
  
  if (input.amount?.max) {
    filters.push(lte(invoices.amount, input.amount.max));
  }
  
  return and(...filters);
}
```

---

## Rate Limiting

```typescript
// Prevent runaway queries
const RateLimits = {
  reports: {
    max: 5,  // 5 reports
    windowMs: 60_000,  // per minute
  },
  analytics: {
    max: 20,  // 20 analytics queries
    windowMs: 60_000,
  },
  exports: {
    max: 2,  // 2 exports
    windowMs: 3600_000,  // per hour
  },
};

// Implemented per procedure
router.procedure
  .input(ReportInputSchema)
  .query(async ({ ctx }) => {
    const key = `report:${ctx.userId}`;
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, 60);  // Reset after 1 minute
    }
    
    if (count > RateLimits.reports.max) {
      throw new Error('Rate limit exceeded');
    }
    
    // Generate report
  });
```

---

## Versioning Strategy

```typescript
// API versions documented in router
router.finance.v1.budget.allocate  // Version 1
router.finance.v2.budget.allocate  // Version 2 (breaking change)

// Maintain backward compatibility
app.use('/api/v1', financeRouterV1);
app.use('/api/v2', financeRouterV2);

// Version in input if needed
const AllocateBudgetInputV2 = AllocateBudgetInputV1.extend({
  projectHierarchy: z.array(z.number()),  // New field in v2
});
```

---

## Response Envelope (Consistent Format)

```typescript
// ALL responses follow this envelope
interface FinanceResponse<T> {
  success: boolean;
  data?: T;  // If success
  error?: string;  // If !success
  message?: string;  // Human-readable
  timestamp: ISO8601;
  requestId: string;  // For tracing
}

// Example successful response
{
  "success": true,
  "data": {
    "budgetId": 123,
    "allocated": 100000,
    "available": 75000
  },
  "timestamp": "2026-07-02T10:30:15Z",
  "requestId": "uuid-12345"
}

// Example error response
{
  "success": false,
  "error": "BudgetUnavailable",
  "message": "Budget of $100,000 requested but only $50,000 available",
  "timestamp": "2026-07-02T10:30:15Z",
  "requestId": "uuid-12345"
}
```

---

## Example Finance Routers

### **Budget Router**
```typescript
export const budgetRouter = router({
  allocate: publicProcedure
    .input(AllocateBudgetInputSchema)
    .mutation(async ({ input, ctx }) => {
      return budgetEngine.allocate(input);
    }),
  
  reallocate: publicProcedure
    .input(ReallocationInputSchema)
    .mutation(async ({ input, ctx }) => {
      // Requires Approver role
      if (ctx.user.role !== 'Approver') throw new Error('Unauthorized');
      return budgetEngine.reallocate(input);
    }),
  
  list: publicProcedure
    .input(z.object({
      projectId: z.number(),
      ...PaginatedInputSchema.shape,
    }))
    .query(async ({ input, ctx }) => {
      return budgetEngine.list(input);
    }),
  
  getDetails: publicProcedure
    .input(z.object({ budgetId: z.number() }))
    .query(async ({ input }) => {
      return budgetEngine.getDetails(input.budgetId);
    }),
  
  forecast: publicProcedure
    .input(z.object({ 
      budgetId: z.number(),
      months: z.number().min(1).max(12),
    }))
    .query(async ({ input }) => {
      return budgetEngine.forecast(input);
    }),
});
```

### **GL Router**
```typescript
export const glRouter = router({
  postEntry: publicProcedure
    .input(GLPostingRequestSchema)
    .mutation(async ({ input, ctx }) => {
      // Requires Finance Manager role
      if (ctx.user.role !== 'FinanceManager') throw new Error('Unauthorized');
      return glService.post(input);
    }),
  
  getEntry: publicProcedure
    .input(z.object({ glEntryId: z.number() }))
    .query(async ({ input, ctx }) => {
      return glService.getEntry(input.glEntryId, ctx.scope);
    }),
  
  getTrialBalance: publicProcedure
    .input(z.object({
      asOf: z.date(),
      level: z.enum(['summary', 'detail']),
    }))
    .query(async ({ input, ctx }) => {
      return glService.getTrialBalance(input, ctx.scope);
    }),
  
  reconcile: publicProcedure
    .input(ReconcileInputSchema)
    .mutation(async ({ input, ctx }) => {
      // Requires Finance Manager role
      if (ctx.user.role !== 'FinanceManager') throw new Error('Unauthorized');
      return glService.reconcile(input);
    }),
  
  list: publicProcedure
    .input(z.object({
      dateRange: z.object({ from: z.date(), to: z.date() }),
      ...PaginatedInputSchema.shape,
    }))
    .query(async ({ input, ctx }) => {
      return glService.list(input, ctx.scope);
    }),
});
```

---

## Documentation Requirements

Every router must have:
```typescript
/**
 * Allocate budget to project
 * 
 * POST /api/finance/budget/allocate
 * 
 * Authorization: Requires 'Approver' role
 * 
 * Input:
 *   - projectId (number): Project to allocate to
 *   - amount (number): Amount to allocate
 *   - currency (enum): USD, EUR, GBP, CHF
 *   - allocationType (enum): 'initial' or 'supplementary'
 * 
 * Output on success:
 *   - budgetId (number): Created budget ID
 *   - allocated (number): Total allocated
 *   - available (number): Available balance
 * 
 * Output on error:
 *   - error: 'BudgetUnavailable' | 'RuleViolation' | ...
 *   - message: Human-readable error
 * 
 * Example:
 * {
 *   "success": true,
 *   "data": { "budgetId": 123, "allocated": 100000, "available": 75000 }
 * }
 */
```

---

## Conclusion

Finance API standards ensure:
- ✅ **Consistent naming** (allocate, postEntry, list, get...)
- ✅ **Consistent types** (Zod validation everywhere)
- ✅ **Consistent errors** (standard error codes & HTTP status)
- ✅ **Consistent pagination** (page, limit, total, hasMore)
- ✅ **Consistent filtering** (date range, status, vendor, amount)
- ✅ **Rate limiting** (prevent runaway queries)
- ✅ **Versioning** (maintain backward compatibility)
- ✅ **Documentation** (every procedure documented)

**All tRPC procedures must follow these standards.**
