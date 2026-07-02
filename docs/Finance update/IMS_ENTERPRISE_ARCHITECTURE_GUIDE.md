# IMS Enterprise Architecture & Development Guide

**Version:** 1.0  
**Last Updated:** July 2, 2026  
**Status:** Authoritative Reference Document  
**Audience:** Senior Engineering Teams, Architects, Core Developers

---

## Table of Contents

1. [Overall System Architecture](#1-overall-system-architecture)
2. [Platform Philosophy](#2-platform-philosophy)
3. [Organization & Operating Unit Isolation](#3-organization--operating-unit-isolation)
4. [Scope Architecture (ctx.scope)](#4-scope-architecture-ctxscope)
5. [Procedure Types](#5-procedure-types)
6. [Repository Architecture](#6-repository-architecture)
7. [Database Governance](#7-database-governance)
8. [Shared Services](#8-shared-services)
9. [Existing Platform Utilities](#9-existing-platform-utilities)
10. [Security Architecture](#10-security-architecture)
11. [Frontend Architecture](#11-frontend-architecture)
12. [Backend Architecture](#12-backend-architecture)
13. [Coding Standards](#13-coding-standards)
14. [Existing Design Patterns](#14-existing-design-patterns)
15. [Performance Strategy](#15-performance-strategy)
16. [Translation Architecture](#16-translation-architecture)
17. [Reporting Architecture](#17-reporting-architecture)
18. [Document Management](#18-document-management)
19. [AI Readiness](#19-ai-readiness)
20. [Event Architecture](#20-event-architecture)
21. [Background Jobs & Scheduling](#21-background-jobs--scheduling)
22. [Testing Strategy](#22-testing-strategy)
23. [Development Workflow](#23-recommended-development-workflow)
24. [Common Mistakes to Avoid](#24-common-mistakes-to-avoid)
25. [Institutional Knowledge & Technical Debt](#25-institutional-knowledge--technical-debt)
26. [Future Roadmap](#26-future-roadmap)

---

## 1. Overall System Architecture

### 1.1 Architectural Style

The IMS platform uses a **modular, layered, domain-driven architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER (React 19)                   │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │   Finance    │   HR         │ Procurement  │   Logistics  │  │
│  │   Module     │   Module     │   Module     │   Module     │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Shared Components, Hooks, Contexts, Providers           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ tRPC
┌─────────────────────────────────────────────────────────────────┐
│                    API LAYER (tRPC + Express)                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Router Layer (78 routers across 8 modules)              │   │
│  │  - publicProcedure, protectedProcedure, scopedProcedure  │   │
│  │  - adminProcedure, orgScopedProcedure                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Service Layer (Business Logic, Orchestration)           │   │
│  │  - Finance Services, HR Services, Procurement Services   │   │
│  │  - Integration Services, Event Services                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Engine Layer (Complex Computations, Analytics)          │   │
│  │  - FinancialRiskEngine, FinancialReportingEngine         │   │
│  │  - CurrencyEngine, ReconciliationEngine                  │   │
│  │  - P2PPipelineEngine, LogisticsEngine                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Repository Layer (Data Access, Query Building)          │   │
│  │  - Finance Repositories (12 total)                       │   │
│  │  - Logistics Repositories, HR Repositories               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Drizzle ORM
┌─────────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER (MySQL/TiDB)                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Core Tables: users, organizations, operatingUnits       │   │
│  │  Finance Tables: 40+ tables (budgets, GL, journal, etc)  │   │
│  │  HR Tables: 30+ tables (employees, payroll, leave, etc)  │   │
│  │  Procurement Tables: 25+ tables (PR, PO, RFQ, etc)       │   │
│  │  Logistics Tables: 35+ tables (BOM, GRN, Stock, etc)     │   │
│  │  Cross-Cutting: Audit, Documents, Notifications, etc     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Layered Architecture

**Four-Layer Architecture** (Router → Service → Engine → Repository):

```
┌─────────────────────────────────────────┐
│  ROUTER LAYER                           │
│  - Receives tRPC input                  │
│  - Validates scope (org/ou)             │
│  - Calls service methods                │
│  - Returns typed responses              │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  SERVICE LAYER                          │
│  - Orchestrates business logic          │
│  - Coordinates multiple repositories    │
│  - Handles cross-domain concerns        │
│  - Manages transactions                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  ENGINE LAYER                           │
│  - Complex calculations                 │
│  - Analytics & aggregations             │
│  - Specialized algorithms               │
│  - Optional (not all domains use)       │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  REPOSITORY LAYER                       │
│  - Database queries (Drizzle ORM)       │
│  - Query building & filtering           │
│  - Raw data transformation              │
│  - No business logic                    │
└─────────────────────────────────────────┘
```

### 1.3 Domain Boundaries

**8 Primary Domains:**

| Domain | Purpose | Key Modules | Tables |
|--------|---------|------------|--------|
| **Finance** | Budget, GL, Reporting, Compliance, Risk | Budgets, GL Accounts, Journal Entries, Expenditures, Compliance Findings, AI Recommendations | 40+ |
| **HR** | Employees, Payroll, Leave, Recruitment | Employees, Payroll, Leave, Attendance, Recruitment, Objectives, KPIs | 30+ |
| **Procurement** | Purchase Requests, Orders, RFQ, Vendor Management | Purchase Requests, POs, RFQ, Vendor Evaluation, Bid Analysis | 25+ |
| **Logistics** | Stock Management, Warehouse, Distribution | Stock Items, BOM, GRN, Stock Issues, Warehouse Transfers | 35+ |
| **Projects** | Project Planning, Activities, Reporting | Projects, Activities, Objectives, Results, Reporting Schedules | 20+ |
| **MEAL** | Monitoring, Evaluation, Accountability, Learning | Surveys, Indicators, Accountability, Documents, Reports | 25+ |
| **Fleet** | Vehicle Management, Maintenance, Compliance | Vehicles, Maintenance, Assignments, Compliance | 15+ |
| **Master Data** | Organizations, Users, Donors, Settings | Organizations, Operating Units, Users, Donors, System Settings | 10+ |

### 1.4 Module Interactions

**Cross-Module Integration Points:**

```
Finance Module
├── Receives: Purchase Orders from Procurement
├── Receives: Payroll from HR
├── Sends: Budget Variance Alerts to Projects
├── Integrates: Currency Exchange Rates (external)
└── Publishes: Financial Events (budget.created, expenditure.approved)

Procurement Module
├── Receives: Budget Limits from Finance
├── Receives: Vendor Performance from Logistics
├── Sends: Purchase Orders to Finance
└── Publishes: Procurement Events (PR.approved, PO.sent)

Logistics Module
├── Receives: Stock Requirements from Projects
├── Sends: Goods Receipt to Finance
├── Sends: Vendor Performance to Procurement
└── Publishes: Logistics Events (stock.issued, transfer.completed)

HR Module
├── Sends: Payroll to Finance
├── Receives: Organizational Structure from Master Data
└── Publishes: HR Events (payroll.processed, leave.approved)
```

### 1.5 Application Flow

**Typical Request Flow:**

```
1. Frontend (React)
   └─ User Action (click, form submit)
   └─ Calls tRPC hook (trpc.finance.createBudget.useMutation())
   └─ Sends organizationId & operatingUnitId in headers

2. API Gateway (Express)
   └─ Receives HTTP POST to /api/trpc
   └─ Extracts headers: X-Organization-ID, X-Operating-Unit-ID
   └─ Creates TrpcContext with user, organizationId, operatingUnitId
   └─ Routes to appropriate tRPC procedure

3. Router Layer
   └─ scopedProcedure validates scope
   └─ Validates input with Zod schema
   └─ Calls service method with (organizationId, operatingUnitId, input)

4. Service Layer
   └─ Orchestrates business logic
   └─ Calls repository methods
   └─ May call engine for calculations
   └─ Publishes events if needed

5. Engine/Repository Layer
   └─ Builds Drizzle queries
   └─ Applies scope filters (organizationId, operatingUnitId)
   └─ Executes database queries
   └─ Returns raw data

6. Response
   └─ Service transforms data
   └─ Router returns typed response
   └─ tRPC serializes with SuperJSON
   └─ Frontend receives strongly-typed data
```

### 1.6 Backend Architecture

**Core Components:**

- **Express Server** — HTTP server, middleware, request handling
- **tRPC** — Type-safe RPC framework, procedure definitions
- **Drizzle ORM** — SQL query builder, migrations, type safety
- **Services** — Business logic orchestration
- **Engines** — Complex calculations, analytics
- **Repositories** — Data access layer
- **Middleware** — Authentication, authorization, logging
- **Event Bus** — Pub/sub for cross-domain events
- **Schedulers** — Background jobs, cron tasks

### 1.7 Frontend Architecture

**Core Components:**

- **React 19** — UI framework
- **Tailwind CSS 4** — Styling
- **tRPC Client** — Type-safe API calls
- **TanStack Query** — Data fetching, caching
- **Wouter** — Client-side routing
- **Contexts** — Global state (auth, language, theme)
- **Hooks** — Custom logic (useAuth, useTranslation, etc)
- **Components** — Reusable UI elements (shadcn/ui, custom)

### 1.8 Shared Libraries

**Shared Utilities:**

- `@shared/const.ts` — Constants (cookie names, timeouts, error messages)
- `@shared/dateUtils.ts` — Date formatting, timezone handling
- `@shared/currencyUtils.ts` — Currency formatting, conversion
- `@shared/validationUtils.ts` — Zod schemas, validators
- `@shared/types.ts` — Shared TypeScript types

### 1.9 Infrastructure Services

**Platform-Level Services:**

| Service | Purpose | Location |
|---------|---------|----------|
| **Authentication** | OAuth, session management | `server/_core/sdk.ts` |
| **Authorization** | RBAC, permission checking | `server/_core/rbac.ts` |
| **Audit Logging** | Activity tracking | `server/services/audit/` |
| **File Storage** | S3 integration | `server/storage.ts` |
| **Notifications** | Email, in-app alerts | `server/services/notifications/` |
| **Translation** | i18n, language support | `client/i18n/`, `server/i18n/` |
| **Event Bus** | Pub/sub system | `server/services/events/` |
| **Scheduling** | Cron jobs, background tasks | `server/services/scheduling/` |
| **Reporting** | PDF/Excel generation | `server/utils/pdf/`, `server/utils/excel/` |
| **Search** | Full-text search | `server/services/search/` |

---

## 2. Platform Philosophy

### 2.1 Design Philosophy

The IMS platform is built on these core principles:

**1. Multi-Tenancy First**
- Every table includes `organizationId` (required) and `operatingUnitId` (optional)
- Data isolation is enforced at the database layer, not the application layer
- No data should ever be visible across organization boundaries

**2. Type Safety End-to-End**
- TypeScript for all backend and frontend code
- Drizzle ORM for type-safe database queries
- tRPC for type-safe API contracts
- Zod for input validation with inferred types

**3. Separation of Concerns**
- Router → Service → Engine → Repository → Database
- Each layer has a single responsibility
- Business logic lives in services, not routers
- Queries live in repositories, not services

**4. Explicit Over Implicit**
- Clear procedure types (publicProcedure, protectedProcedure, scopedProcedure)
- Explicit scope injection (organizationId, operatingUnitId)
- Explicit error handling with TRPCError
- No hidden dependencies or side effects

**5. Reusability Over Duplication**
- Shared services for common functionality
- Shared utilities for common operations
- Shared components for UI consistency
- Repositories shared across services

**6. Auditability**
- All changes logged with user, timestamp, action
- Soft deletes (isDeleted, deletedAt) instead of hard deletes
- Audit trail fields (createdBy, updatedBy, updatedAt)
- Event publishing for compliance tracking

### 2.2 Core Design Principles

| Principle | Implementation | Example |
|-----------|-----------------|---------|
| **Single Responsibility** | Each class/function has one reason to change | BudgetRepository only handles budget queries |
| **Dependency Injection** | Dependencies passed in, not created internally | Repository receives DB instance |
| **Interface Segregation** | Clients depend on specific interfaces, not monolithic ones | Separate read/write repositories if needed |
| **Open/Closed** | Open for extension, closed for modification | Add new procedure type without changing existing ones |
| **Liskov Substitution** | Subtypes can replace base types | All repositories follow same pattern |

### 2.3 Architectural Goals

1. **Scalability** — Handle 1000+ concurrent users, 100M+ records
2. **Maintainability** — Clear code structure, easy to onboard new developers
3. **Reliability** — 99.9% uptime, comprehensive error handling
4. **Security** — Multi-tenancy, RBAC, audit trails, encryption
5. **Performance** — Sub-second response times, efficient queries
6. **Extensibility** — Easy to add new modules, features, domains

### 2.4 Scalability Strategy

**Horizontal Scaling:**
- Stateless API servers (can run multiple instances)
- Database connection pooling
- Load balancing across instances
- Session storage in database (not memory)

**Vertical Scaling:**
- Database indexing strategy (composite indexes for common queries)
- Query optimization (pagination, lazy loading)
- Caching layer (Redis for hot data)
- Background jobs for heavy operations

**Data Partitioning:**
- By organizationId (future: sharding)
- By time period (historical data archival)
- By domain (separate databases for different modules)

### 2.5 Maintainability Strategy

**Code Organization:**
- Clear folder structure (routers, services, engines, repositories)
- Consistent naming conventions
- Comprehensive documentation
- Type safety throughout

**Testing:**
- Unit tests for repositories and services
- Integration tests for routers
- E2E tests for critical workflows
- Regression tests for bug fixes

**Documentation:**
- Architecture Decision Records (ADRs)
- API documentation (tRPC auto-generates types)
- Code comments for complex logic
- Runbooks for operations

### 2.6 Future Roadmap Assumptions

**Planned Enhancements:**
1. **Mobile App** — React Native for iOS/Android
2. **Offline Support** — Local-first sync with server
3. **AI Integration** — ML models for forecasting, recommendations
4. **Real-Time Collaboration** — WebSockets for live updates
5. **Advanced Analytics** — BI tools, dashboards, data warehouse
6. **Workflow Engine** — Configurable approval workflows
7. **API Ecosystem** — Public APIs for third-party integrations
8. **Microservices** — Domain-driven service decomposition

---

## 3. Organization & Operating Unit Isolation

### 3.1 Multi-Tenancy Model

The IMS platform uses a **hierarchical multi-tenancy model** with two levels:

```
┌─────────────────────────────────────────┐
│  ORGANIZATION (Top Level)               │
│  - Represents a company/NGO             │
│  - Owns all data within it              │
│  - Has multiple operating units         │
│  - Examples: UNICEF, WFP, UNHCR         │
└─────────────────────────────────────────┘
         ↓ (1 org → many OUs)
┌─────────────────────────────────────────┐
│  OPERATING UNIT (Sub-Level)             │
│  - Represents a branch/office           │
│  - Belongs to exactly one organization  │
│  - Scopes data within organization      │
│  - Examples: Country office, Regional   │
└─────────────────────────────────────────┘
```

### 3.2 Organization Model

**Table: `organizations`**

```sql
CREATE TABLE organizations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  status ENUM('active', 'inactive', 'suspended'),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Characteristics:**
- Global scope (visible to all users in org)
- No parent organization (top-level entity)
- Owns all data within it
- Manages users, roles, permissions
- Manages operating units

### 3.3 Operating Unit Model

**Table: `operatingUnits`**

```sql
CREATE TABLE operatingUnits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  organizationId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  type ENUM('headquarters', 'regional', 'country', 'field'),
  parentUnitId INT,  -- For hierarchical OUs
  status ENUM('active', 'inactive'),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organizationId) REFERENCES organizations(id),
  FOREIGN KEY (parentUnitId) REFERENCES operatingUnits(id),
  UNIQUE KEY (organizationId, code)
);
```

**Characteristics:**
- Scoped to one organization
- Can be hierarchical (parent-child relationships)
- Represents physical or logical grouping
- Isolates data within organization

### 3.4 Relationship Between Them

```
Organization "UNICEF" (id=1)
├── Operating Unit "HQ" (id=1, organizationId=1)
├── Operating Unit "East Africa" (id=2, organizationId=1)
│   ├── Operating Unit "Kenya" (id=3, organizationId=1, parentUnitId=2)
│   ├── Operating Unit "Uganda" (id=4, organizationId=1, parentUnitId=2)
│   └── Operating Unit "Tanzania" (id=5, organizationId=1, parentUnitId=2)
└── Operating Unit "West Africa" (id=6, organizationId=1)
    ├── Operating Unit "Nigeria" (id=7, organizationId=1, parentUnitId=6)
    └── Operating Unit "Ghana" (id=8, organizationId=1, parentUnitId=6)

Organization "WFP" (id=2)
├── Operating Unit "HQ" (id=9, organizationId=2)
└── Operating Unit "Middle East" (id=10, organizationId=2)
```

### 3.5 Data Ownership

**Rule 1: Every table must have organizationId**
```sql
-- ✅ CORRECT
CREATE TABLE budgets (
  id INT PRIMARY KEY,
  organizationId INT NOT NULL,  -- REQUIRED
  operatingUnitId INT,           -- OPTIONAL
  name VARCHAR(255),
  FOREIGN KEY (organizationId) REFERENCES organizations(id)
);

-- ❌ WRONG
CREATE TABLE budgets (
  id INT PRIMARY KEY,
  name VARCHAR(255)
  -- Missing organizationId!
);
```

**Rule 2: operatingUnitId is optional**
- Some data is organization-wide (no OU scoping)
- Some data is scoped to specific OUs
- Always include organizationId, sometimes include operatingUnitId

**Rule 3: Data belongs to exactly one organization**
- No sharing data across organizations
- No cross-organization queries
- Each organization is a completely separate tenant

### 3.6 Data Visibility

**Visibility Rules:**

| Scenario | organizationId Filter | operatingUnitId Filter | Visibility |
|----------|----------------------|----------------------|------------|
| User views org-wide data | Must match user's org | NULL or any | Only within user's org |
| User views OU-scoped data | Must match user's org | Must match user's OU | Only within user's OU |
| Admin views all org data | Must match org | NULL or any | All data in org |
| Platform admin views data | N/A | N/A | Blocked (see orgScopedProcedure) |

**Example Query:**
```typescript
// ✅ CORRECT: Filter by organizationId
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.organizationId, organizationId));

// ✅ CORRECT: Filter by organizationId AND operatingUnitId
const budgets = await db
  .select()
  .from(budgets)
  .where(
    and(
      eq(budgets.organizationId, organizationId),
      eq(budgets.operatingUnitId, operatingUnitId)
    )
  );

// ❌ WRONG: No organizationId filter
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.operatingUnitId, operatingUnitId));
  // User could see data from other organizations!
```

### 3.7 Cross-Organization Rules

**Rule 1: No cross-organization data sharing**
```typescript
// ❌ WRONG: Querying across organizations
const allBudgets = await db.select().from(budgets);
// This violates multi-tenancy!

// ✅ CORRECT: Filter by organizationId
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.organizationId, organizationId));
```

**Rule 2: No cross-organization joins**
```typescript
// ❌ WRONG: Joining across organization boundaries
const result = await db
  .select()
  .from(budgets)
  .leftJoin(
    expenditures,
    eq(budgets.id, expenditures.budgetId)
    // Missing: both must have same organizationId
  );

// ✅ CORRECT: Ensure both sides have same organizationId
const result = await db
  .select()
  .from(budgets)
  .leftJoin(
    expenditures,
    and(
      eq(budgets.id, expenditures.budgetId),
      eq(budgets.organizationId, expenditures.organizationId)
    )
  )
  .where(eq(budgets.organizationId, organizationId));
```

**Rule 3: No cross-organization foreign keys**
```typescript
// ❌ WRONG: FK to table in different org
CREATE TABLE budgets (
  id INT,
  organizationId INT,
  donorId INT,  -- Could reference donor from different org!
  FOREIGN KEY (donorId) REFERENCES donors(id)
);

// ✅ CORRECT: FK must include organizationId
CREATE TABLE budgets (
  id INT,
  organizationId INT,
  donorId INT,
  FOREIGN KEY (organizationId, donorId) REFERENCES donors(organizationId, id)
);
```

### 3.8 Cross-Operating-Unit Rules

**Rule 1: OU-scoped data must still filter by organizationId**
```typescript
// ❌ WRONG: Only filtering by OU
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.operatingUnitId, operatingUnitId));
// User could see data from other organizations!

// ✅ CORRECT: Filter by both org and OU
const budgets = await db
  .select()
  .from(budgets)
  .where(
    and(
      eq(budgets.organizationId, organizationId),
      eq(budgets.operatingUnitId, operatingUnitId)
    )
  );
```

**Rule 2: Some data is organization-wide (no OU scoping)**
```typescript
// ✅ CORRECT: Organization-wide data (no OU filter)
const donors = await db
  .select()
  .from(donors)
  .where(eq(donors.organizationId, organizationId));
// All donors visible to all users in organization

// ✅ CORRECT: OU-scoped data (with OU filter)
const budgets = await db
  .select()
  .from(budgets)
  .where(
    and(
      eq(budgets.organizationId, organizationId),
      eq(budgets.operatingUnitId, operatingUnitId)
    )
  );
// Only budgets for this specific OU
```

**Rule 3: Users can only see OUs within their organization**
```typescript
// ✅ CORRECT: Get OUs for user's organization
const ous = await db
  .select()
  .from(operatingUnits)
  .where(eq(operatingUnits.organizationId, organizationId));
// Returns only OUs in user's organization

// ❌ WRONG: Get all OUs
const ous = await db.select().from(operatingUnits);
// Could expose OUs from other organizations
```

---

## 4. Scope Architecture (ctx.scope)

### 4.1 What is ctx.scope?

`ctx.scope` is an object injected into the tRPC context that contains the current user's organizational scope:

```typescript
type Scope = {
  organizationId: number;
  operatingUnitId: number;
};
```

**Purpose:**
- Ensures data isolation at the API layer
- Prevents accidental cross-organization queries
- Makes scope explicit in every procedure

### 4.2 How It's Populated

**Step 1: Frontend sends headers**
```typescript
// client/src/lib/trpc.ts
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      fetch(input, init) {
        const orgId = localStorage.getItem('current_organization_id');
        const ouId = localStorage.getItem('current_operating_unit_id');
        
        const headers = new Headers(init?.headers);
        if (orgId) headers.set('X-Organization-ID', orgId);
        if (ouId) headers.set('X-Operating-Unit-ID', ouId);
        
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
          headers,
        });
      },
    }),
  ],
});
```

**Step 2: Express middleware extracts headers**
```typescript
// server/_core/context.ts
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const orgIdHeader = opts.req.headers['x-organization-id'];
  const ouIdHeader = opts.req.headers['x-operating-unit-id'];
  
  const organizationId = orgIdHeader ? parseInt(String(orgIdHeader), 10) : null;
  const operatingUnitId = ouIdHeader ? parseInt(String(ouIdHeader), 10) : null;

  return {
    req: opts.req,
    res: opts.res,
    user,
    organizationId,
    operatingUnitId,
    financeEventBus,
    financeTransactionManager,
  };
}
```

**Step 3: scopedProcedure validates and injects scope**
```typescript
// server/_core/trpc.ts
const requireScope = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (!ctx.organizationId || !ctx.operatingUnitId) {
    throw new TRPCError({ 
      code: "BAD_REQUEST", 
      message: "Missing scope context" 
    });
  }

  return next({
    ctx: {
      ...ctx,
      scope: {
        organizationId: ctx.organizationId,
        operatingUnitId: ctx.operatingUnitId,
      },
    },
  });
});

export const scopedProcedure = t.procedure
  .use(dateSerializationMiddleware)
  .use(requireScope);
```

### 4.3 Authentication Flow

```
1. User logs in
   └─ OAuth/SAML authentication
   └─ Session created, stored in database
   └─ Session cookie set in response

2. Frontend stores scope in localStorage
   └─ localStorage.setItem('current_organization_id', orgId)
   └─ localStorage.setItem('current_operating_unit_id', ouId)

3. Frontend sends scope in headers
   └─ X-Organization-ID: 1
   └─ X-Operating-Unit-ID: 5

4. Backend validates scope
   └─ Verifies user has access to organization
   └─ Verifies user has access to operating unit
   └─ Injects scope into context
```

### 4.4 Authorization Flow

```
1. Request arrives at router
   └─ scopedProcedure middleware runs

2. Middleware checks:
   └─ Is user authenticated? (ctx.user exists)
   └─ Is organizationId provided? (ctx.organizationId exists)
   └─ Is operatingUnitId provided? (ctx.operatingUnitId exists)

3. If all checks pass:
   └─ Scope injected into ctx
   └─ Procedure executes with ctx.scope

4. If any check fails:
   └─ TRPCError thrown
   └─ Request rejected
   └─ Error returned to frontend
```

### 4.5 Middleware Flow

**Procedure Execution Order:**

```
1. Express middleware
   └─ Extract headers
   └─ Create TrpcContext
   └─ Pass to tRPC

2. tRPC middleware chain
   └─ dateSerializationMiddleware (all procedures)
   └─ requireUser (protectedProcedure)
   └─ requireScope (scopedProcedure)
   └─ blockPlatformAdmin (orgScopedProcedure)

3. Procedure handler
   └─ Input validation (Zod)
   └─ Business logic
   └─ Return response

4. Response serialization
   └─ SuperJSON transformer
   └─ Date serialization
   └─ Return to frontend
```

### 4.6 Security Implications

**Threat 1: Missing organizationId filter**
```typescript
// ❌ VULNERABLE
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.operatingUnitId, ctx.scope.operatingUnitId));
// User could see budgets from other organizations!

// ✅ SECURE
const budgets = await db
  .select()
  .from(budgets)
  .where(
    and(
      eq(budgets.organizationId, ctx.scope.organizationId),
      eq(budgets.operatingUnitId, ctx.scope.operatingUnitId)
    )
  );
```

**Threat 2: Trusting user-provided scope**
```typescript
// ❌ VULNERABLE
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.organizationId, input.organizationId));
// User could specify any organizationId!

// ✅ SECURE
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.organizationId, ctx.scope.organizationId));
// Use scope from context, not input
```

**Threat 3: Scope injection attacks**
```typescript
// ❌ VULNERABLE
const query = `SELECT * FROM budgets WHERE organizationId = ${input.orgId}`;
// SQL injection possible!

// ✅ SECURE
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.organizationId, ctx.scope.organizationId));
// Drizzle ORM prevents injection
```

### 4.7 Lifecycle

**Scope Lifecycle:**

```
1. User logs in
   └─ Scope created (organizationId, operatingUnitId)
   └─ Stored in localStorage

2. User makes API request
   └─ Scope sent in headers
   └─ Scope validated by middleware
   └─ Scope injected into context

3. Request processed
   └─ Scope used in all queries
   └─ Data filtered by scope
   └─ Response returned

4. User logs out
   └─ Scope cleared from localStorage
   └─ Session cookie deleted
   └─ Subsequent requests fail (no auth)

5. User switches organization
   └─ New organizationId stored in localStorage
   └─ New operatingUnitId stored in localStorage
   └─ Subsequent requests use new scope
```

### 4.8 Best Practices

**Practice 1: Always use ctx.scope in queries**
```typescript
// ✅ CORRECT
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.organizationId, ctx.scope.organizationId));

// ❌ WRONG
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.id, input.budgetId));
// Missing organizationId filter!
```

**Practice 2: Never trust user input for scope**
```typescript
// ✅ CORRECT
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.organizationId, ctx.scope.organizationId));

// ❌ WRONG
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.organizationId, input.organizationId));
// User could specify any organizationId!
```

**Practice 3: Use scopedProcedure for organization-scoped operations**
```typescript
// ✅ CORRECT
export const budgetsRouter = router({
  list: scopedProcedure
    .query(async ({ ctx }) => {
      // ctx.scope is guaranteed to exist
      return await budgetService.list(ctx.scope.organizationId);
    }),
});

// ❌ WRONG
export const budgetsRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      // User could specify any organizationId!
      return await budgetService.list(input.organizationId);
    }),
});
```

**Practice 4: Validate scope in services**
```typescript
// ✅ CORRECT
async function getBudget(organizationId: number, budgetId: number) {
  const budget = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.organizationId, organizationId),
        eq(budgets.id, budgetId)
      )
    );
  
  if (!budget) {
    throw new Error("Budget not found");
    // Could also mean: not found in this organization
  }
  
  return budget;
}

// ❌ WRONG
async function getBudget(budgetId: number) {
  const budget = await db
    .select()
    .from(budgets)
    .where(eq(budgets.id, budgetId));
  
  return budget;
  // No scope validation!
}
```

---

## 5. Procedure Types

### 5.1 Procedure Type Comparison

| Procedure | Authentication | Scope Validation | Use Case | Example |
|-----------|-----------------|------------------|----------|---------|
| **publicProcedure** | Not required | None | Public endpoints | Health check, login page |
| **protectedProcedure** | Required | None | User-specific data | User profile, settings |
| **scopedProcedure** | Required | Required | Organization data | Budgets, expenditures |
| **orgScopedProcedure** | Required | Required + blocks platform admin | Organization data (no admin access) | Document management |
| **adminProcedure** | Required + admin role | None | Platform administration | System settings, user management |

### 5.2 publicProcedure

**Purpose:** Public endpoints that don't require authentication

**Security Model:**
- No authentication required
- No user context
- No scope validation
- Available to anyone

**When to Use:**
- Login/logout endpoints
- Health checks
- Public information pages
- Password reset requests

**When NOT to Use:**
- Any user-specific data
- Any organization-scoped data
- Any sensitive operations

**Example:**
```typescript
export const authRouter = router({
  // ✅ CORRECT: Public login
  login: publicProcedure
    .input(z.object({ email: z.string(), password: z.string() }))
    .mutation(async ({ input }) => {
      // Authenticate user
      // Return session token
    }),

  // ❌ WRONG: User-specific data on public procedure
  getProfile: publicProcedure
    .query(async ({ ctx }) => {
      // ctx.user is null!
      return ctx.user?.profile;
    }),
});
```

### 5.3 protectedProcedure

**Purpose:** Endpoints that require authentication but no scope validation

**Security Model:**
- Authentication required (ctx.user must exist)
- No scope validation
- User context available
- No organization filtering

**When to Use:**
- User profile endpoints
- User preferences
- Personal settings
- Cross-organization queries (platform admin)

**When NOT to Use:**
- Organization-scoped data
- Multi-tenant operations
- Any data that should be isolated by organization

**Example:**
```typescript
export const userRouter = router({
  // ✅ CORRECT: User profile (no org scoping needed)
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      return await userService.getProfile(ctx.user!.id);
    }),

  // ✅ CORRECT: Update user preferences
  updatePreferences: protectedProcedure
    .input(z.object({ theme: z.enum(['light', 'dark']) }))
    .mutation(async ({ ctx, input }) => {
      return await userService.updatePreferences(ctx.user!.id, input);
    }),

  // ❌ WRONG: Organization data without scope validation
  getBudgets: protectedProcedure
    .query(async ({ ctx }) => {
      // No organizationId filter!
      return await db.select().from(budgets);
    }),
});
```

### 5.4 scopedProcedure

**Purpose:** Organization-scoped endpoints with automatic scope injection

**Security Model:**
- Authentication required
- Scope validation required (organizationId + operatingUnitId)
- Scope automatically injected into context
- Scope must be used in all queries

**When to Use:**
- Organization-scoped data (budgets, expenditures, etc)
- Operating unit-scoped data
- Any multi-tenant operation
- Most business logic endpoints

**When NOT to Use:**
- Public endpoints
- User-specific endpoints (use protectedProcedure)
- Platform admin operations (use adminProcedure)

**Example:**
```typescript
export const budgetsRouter = router({
  // ✅ CORRECT: Organization-scoped budget list
  list: scopedProcedure
    .query(async ({ ctx }) => {
      // ctx.scope.organizationId and ctx.scope.operatingUnitId are guaranteed
      return await budgetService.list(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId
      );
    }),

  // ✅ CORRECT: Create budget with scope
  create: scopedProcedure
    .input(z.object({ name: z.string(), amount: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await budgetService.create(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId,
        input
      );
    }),

  // ❌ WRONG: Missing scope validation
  list: protectedProcedure
    .query(async ({ ctx }) => {
      // No scope validation!
      return await db.select().from(budgets);
    }),
});
```

### 5.5 orgScopedProcedure

**Purpose:** Organization-scoped endpoints that block platform admins

**Security Model:**
- Authentication required
- Scope validation required
- Platform admin users are blocked
- Scope automatically injected

**When to Use:**
- Document management (org users only)
- File storage (org users only)
- Organization-specific settings
- Any operation that should NOT be accessible to platform admins

**When NOT to Use:**
- Public endpoints
- Platform admin operations
- User-specific endpoints

**Example:**
```typescript
export const documentRouter = router({
  // ✅ CORRECT: Organization users only
  listDocuments: orgScopedProcedure
    .query(async ({ ctx }) => {
      // Platform admin users are blocked
      // ctx.scope is guaranteed
      return await documentService.list(ctx.scope.organizationId);
    }),

  // ❌ WRONG: Using scopedProcedure (allows platform admin)
  listDocuments: scopedProcedure
    .query(async ({ ctx }) => {
      // Platform admin users can access this!
      return await documentService.list(ctx.scope.organizationId);
    }),
});
```

### 5.6 adminProcedure

**Purpose:** Platform admin operations

**Security Model:**
- Authentication required
- Admin role required (platform_admin, platform_super_admin, or platform_auditor)
- No scope validation
- Full platform access

**When to Use:**
- System settings
- User management
- Organization management
- Platform-wide operations
- Integration configuration

**When NOT to Use:**
- Organization-scoped data (use scopedProcedure)
- User-specific data (use protectedProcedure)
- Public endpoints (use publicProcedure)

**Example:**
```typescript
export const adminRouter = router({
  // ✅ CORRECT: Platform admin only
  listAllUsers: adminProcedure
    .query(async ({ ctx }) => {
      // Only platform admins can access
      return await userService.listAll();
    }),

  // ✅ CORRECT: Create organization
  createOrganization: adminProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      return await organizationService.create(input);
    }),

  // ❌ WRONG: Using scopedProcedure (limited to org)
  listAllUsers: scopedProcedure
    .query(async ({ ctx }) => {
      // Only returns users in current org
      return await userService.listByOrganization(ctx.scope.organizationId);
    }),
});
```

### 5.7 Procedure Type Decision Matrix

**Use this matrix to choose the correct procedure type:**

| Scenario | Procedure | Reasoning |
|----------|-----------|-----------|
| Public login page | publicProcedure | No auth required |
| User profile page | protectedProcedure | Auth required, no org scoping |
| Budgets list | scopedProcedure | Auth + org scoping required |
| Document management | orgScopedProcedure | Auth + org scoping + block admins |
| System settings | adminProcedure | Platform admin only |
| Health check | publicProcedure | No auth required |
| User preferences | protectedProcedure | Auth required, user-specific |
| Expenditures list | scopedProcedure | Auth + org scoping required |
| Organization management | adminProcedure | Platform admin only |
| File upload | orgScopedProcedure | Auth + org scoping + block admins |
| Password reset | publicProcedure | No auth required |
| Team members list | scopedProcedure | Auth + org scoping required |
| Integration config | adminProcedure | Platform admin only |

---

## 6. Repository Architecture

### 6.1 Repository Pattern

The **Repository Pattern** abstracts data access logic from business logic:

```
┌─────────────────────────────────────────┐
│  Service Layer                          │
│  (Business Logic)                       │
└─────────────────────────────────────────┘
              ↓ (calls)
┌─────────────────────────────────────────┐
│  Repository Layer                       │
│  (Data Access)                          │
│  - Query building                       │
│  - Filtering                            │
│  - Pagination                           │
│  - Raw data transformation              │
└─────────────────────────────────────────┘
              ↓ (uses)
┌─────────────────────────────────────────┐
│  Drizzle ORM                            │
│  (SQL Execution)                        │
└─────────────────────────────────────────┘
              ↓ (queries)
┌─────────────────────────────────────────┐
│  Database (MySQL/TiDB)                  │
└─────────────────────────────────────────┘
```

### 6.2 Repository Responsibilities

**What repositories DO:**
- Build Drizzle queries
- Apply filters and conditions
- Execute database queries
- Transform raw data to DTOs
- Handle pagination
- Build indexes for queries

**What repositories DON'T do:**
- Business logic
- Authorization (handled by router)
- Transactions (handled by service)
- Event publishing (handled by service)
- Cross-domain coordination (handled by service)

### 6.3 Service Responsibilities

**What services DO:**
- Orchestrate repositories
- Implement business logic
- Manage transactions
- Publish events
- Coordinate across domains
- Handle errors and validation

**What services DON'T do:**
- Execute SQL queries directly (use repositories)
- Handle HTTP requests (handled by router)
- Validate input (handled by router with Zod)
- Serialize responses (handled by router)

### 6.4 Engine Responsibilities

**What engines DO:**
- Complex calculations
- Analytics and aggregations
- Specialized algorithms
- Data transformations
- Performance-critical operations

**What engines DON'T do:**
- Simple CRUD operations (use repositories)
- Business logic orchestration (handled by services)
- HTTP request handling (handled by router)

### 6.5 Router Responsibilities

**What routers DO:**
- Define tRPC procedures
- Validate input with Zod
- Handle authentication/authorization
- Call services
- Serialize responses
- Return typed responses

**What routers DON'T do:**
- Execute queries directly (use repositories)
- Implement business logic (handled by services)
- Handle data transformation (handled by services)

### 6.6 Intended Layering

**Correct Layering:**

```
Router
  ↓ (calls service method)
Service
  ↓ (calls repository method)
Repository
  ↓ (executes Drizzle query)
Database
```

**Example:**

```typescript
// 1. Router
export const budgetsRouter = router({
  list: scopedProcedure
    .query(async ({ ctx }) => {
      // Call service
      return await budgetService.list(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId
      );
    }),
});

// 2. Service
class BudgetService {
  async list(organizationId: number, operatingUnitId: number) {
    // Call repository
    return await budgetRepository.findByOrganization(
      organizationId,
      operatingUnitId
    );
  }
}

// 3. Repository
class BudgetRepository {
  async findByOrganization(organizationId: number, operatingUnitId: number) {
    // Execute query
    return await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.organizationId, organizationId),
          eq(budgets.operatingUnitId, operatingUnitId)
        )
      );
  }
}

// 4. Database
// Returns raw data
```

### 6.7 Repository Best Practices

**Practice 1: Constructor Injection**
```typescript
// ✅ CORRECT
class BudgetRepository {
  constructor(private db: DB) {}
  
  async findById(id: number) {
    return await this.db.select().from(budgets).where(eq(budgets.id, id));
  }
}

// ❌ WRONG: Singleton pattern
class BudgetRepository {
  private static instance: BudgetRepository;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new BudgetRepository();
    }
    return this.instance;
  }
}
```

**Practice 2: Type-Safe Queries**
```typescript
// ✅ CORRECT: Drizzle ORM (type-safe)
const budget = await db
  .select()
  .from(budgets)
  .where(eq(budgets.id, id));

// ❌ WRONG: Raw SQL (not type-safe)
const budget = await db.execute(`SELECT * FROM budgets WHERE id = ${id}`);
```

**Practice 3: Explicit Scope Filtering**
```typescript
// ✅ CORRECT
async findByOrganization(organizationId: number) {
  return await this.db
    .select()
    .from(budgets)
    .where(eq(budgets.organizationId, organizationId));
}

// ❌ WRONG: No scope filtering
async findAll() {
  return await this.db.select().from(budgets);
}
```

**Practice 4: Pagination Support**
```typescript
// ✅ CORRECT
async findByOrganization(
  organizationId: number,
  page: number = 1,
  pageSize: number = 10
) {
  const offset = (page - 1) * pageSize;
  return await this.db
    .select()
    .from(budgets)
    .where(eq(budgets.organizationId, organizationId))
    .limit(pageSize)
    .offset(offset);
}

// ❌ WRONG: No pagination
async findByOrganization(organizationId: number) {
  return await this.db
    .select()
    .from(budgets)
    .where(eq(budgets.organizationId, organizationId));
  // Could return 100,000+ rows!
}
```

---

## 7. Database Governance

### 7.1 Approved Schema

**Core Principles:**
- Every table must have `organizationId` (required)
- Every table should have `operatingUnitId` (optional, for OU scoping)
- Every table should have audit fields: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
- Soft delete fields: `isDeleted`, `deletedAt`
- Proper indexing for common queries

**Example Table:**
```sql
CREATE TABLE budgets (
  -- Primary Key
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Multi-Tenancy (REQUIRED)
  organizationId INT NOT NULL,
  operatingUnitId INT,
  
  -- Business Data
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  status ENUM('draft', 'approved', 'executed', 'closed'),
  
  -- Soft Delete
  isDeleted TINYINT DEFAULT 0 NOT NULL,
  deletedAt TIMESTAMP NULL,
  
  -- Audit Trail
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  createdBy INT,
  updatedBy INT,
  
  -- Foreign Keys
  FOREIGN KEY (organizationId) REFERENCES organizations(id),
  FOREIGN KEY (operatingUnitId) REFERENCES operatingUnits(id),
  FOREIGN KEY (createdBy) REFERENCES users(id),
  FOREIGN KEY (updatedBy) REFERENCES users(id),
  
  -- Indexes
  INDEX idx_org (organizationId),
  INDEX idx_ou (operatingUnitId),
  INDEX idx_status (status),
  INDEX idx_created (createdAt),
  UNIQUE KEY uk_org_name (organizationId, name)
);
```

### 7.2 Schema Ownership

**Finance Module** (40+ tables)
- Owner: Finance Lead
- Tables: budgets, expenditures, GL accounts, journal entries, compliance findings, etc.
- Approval: Finance Lead + Architecture

**HR Module** (30+ tables)
- Owner: HR Lead
- Tables: employees, payroll, leave, attendance, recruitment, etc.
- Approval: HR Lead + Architecture

**Procurement Module** (25+ tables)
- Owner: Procurement Lead
- Tables: purchase requests, orders, RFQ, vendor evaluation, etc.
- Approval: Procurement Lead + Architecture

**Logistics Module** (35+ tables)
- Owner: Logistics Lead
- Tables: stock items, BOM, GRN, stock issues, warehouse transfers, etc.
- Approval: Logistics Lead + Architecture

**Master Data** (10+ tables)
- Owner: Platform Lead
- Tables: organizations, operating units, users, donors, settings, etc.
- Approval: Platform Lead + Architecture

### 7.3 Migration Strategy

**Process:**
1. Create `.sql` migration file in `drizzle/migrations/`
2. Update Drizzle schema in `drizzle/schema.ts`
3. Run `pnpm db:push` to apply migration
4. Test in development environment
5. Commit schema changes
6. Deploy to production

**Example Migration:**
```sql
-- drizzle/migrations/20260701_add_soft_delete.sql
ALTER TABLE budgets
ADD COLUMN isDeleted TINYINT DEFAULT 0 NOT NULL,
ADD COLUMN deletedAt TIMESTAMP NULL;

CREATE INDEX idx_deleted ON budgets(isDeleted);
```

### 7.4 Naming Conventions

**Table Names:**
- Lowercase with underscores
- Plural form
- Domain prefix (e.g., `finance_`, `hr_`)
- Examples: `finance_budgets`, `hr_employees`, `procurement_purchase_requests`

**Column Names:**
- Lowercase with underscores
- Descriptive names
- No abbreviations
- Examples: `organizationId`, `operatingUnitId`, `createdAt`, `updatedBy`

**Index Names:**
- Prefix with `idx_` or `uk_` (unique key)
- Include table name
- Include column names
- Examples: `idx_finance_budgets_org`, `uk_budgets_org_name`

**Foreign Key Names:**
- Prefix with `fk_`
- Include both table names
- Examples: `fk_budgets_organizations`, `fk_budgets_users`

### 7.5 Enum Strategy

**Use Enums for:**
- Status fields (draft, approved, executed, closed)
- Type fields (budget, expense, transfer)
- Priority fields (low, medium, high, critical)
- Role fields (admin, user, viewer)

**Example:**
```sql
CREATE TABLE budgets (
  status ENUM('draft', 'approved', 'executed', 'closed'),
  type ENUM('operating', 'capital', 'project'),
  priority ENUM('low', 'medium', 'high', 'critical')
);
```

**In Drizzle:**
```typescript
export const budgets = mysqlTable('budgets', {
  status: mysqlEnum(['draft', 'approved', 'executed', 'closed']),
  type: mysqlEnum(['operating', 'capital', 'project']),
  priority: mysqlEnum(['low', 'medium', 'high', 'critical']),
});
```

### 7.6 Soft Delete Strategy

**Why Soft Deletes:**
- Preserve audit trail
- Enable undo functionality
- Support compliance requirements
- Prevent data loss

**Implementation:**
```sql
CREATE TABLE budgets (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  isDeleted TINYINT DEFAULT 0 NOT NULL,
  deletedAt TIMESTAMP NULL,
  -- ...
);
```

**Querying:**
```typescript
// ✅ CORRECT: Exclude deleted records
const budgets = await db
  .select()
  .from(budgets)
  .where(
    and(
      eq(budgets.organizationId, organizationId),
      eq(budgets.isDeleted, 0)
    )
  );

// ❌ WRONG: Include deleted records
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.organizationId, organizationId));
```

**Deleting:**
```typescript
// ✅ CORRECT: Soft delete
await db
  .update(budgets)
  .set({
    isDeleted: 1,
    deletedAt: new Date(),
    updatedBy: userId,
    updatedAt: new Date(),
  })
  .where(eq(budgets.id, budgetId));

// ❌ WRONG: Hard delete
await db.delete(budgets).where(eq(budgets.id, budgetId));
```

### 7.7 Indexing Strategy

**Index Types:**

| Type | Purpose | Example |
|------|---------|---------|
| **Primary Key** | Unique identifier | `id INT PRIMARY KEY` |
| **Foreign Key** | Relationship | `INDEX fk_org (organizationId)` |
| **Scope Index** | Multi-tenancy filtering | `INDEX idx_org (organizationId)` |
| **Status Index** | Common filtering | `INDEX idx_status (status)` |
| **Composite Index** | Multi-column filtering | `INDEX idx_org_status (organizationId, status)` |
| **Unique Index** | Prevent duplicates | `UNIQUE KEY uk_org_name (organizationId, name)` |

**Indexing Rules:**

1. **Always index organizationId**
```sql
CREATE INDEX idx_org ON budgets(organizationId);
```

2. **Index frequently filtered columns**
```sql
CREATE INDEX idx_status ON budgets(status);
CREATE INDEX idx_created ON budgets(createdAt);
```

3. **Use composite indexes for common queries**
```sql
-- If queries often filter by (organizationId, status)
CREATE INDEX idx_org_status ON budgets(organizationId, status);
```

4. **Avoid over-indexing**
```sql
-- ❌ Too many indexes (slows down writes)
CREATE INDEX idx_1 ON budgets(organizationId);
CREATE INDEX idx_2 ON budgets(status);
CREATE INDEX idx_3 ON budgets(createdAt);
CREATE INDEX idx_4 ON budgets(organizationId, status);
CREATE INDEX idx_5 ON budgets(organizationId, createdAt);

-- ✅ Balanced indexes
CREATE INDEX idx_org ON budgets(organizationId);
CREATE INDEX idx_org_status ON budgets(organizationId, status);
CREATE INDEX idx_created ON budgets(createdAt);
```

### 7.8 Relationship Strategy

**Foreign Key Constraints:**
```sql
-- ✅ CORRECT: Enforce referential integrity
CREATE TABLE budgets (
  id INT PRIMARY KEY,
  organizationId INT NOT NULL,
  operatingUnitId INT,
  FOREIGN KEY (organizationId) REFERENCES organizations(id),
  FOREIGN KEY (operatingUnitId) REFERENCES operatingUnits(id)
);

-- ❌ WRONG: No constraints
CREATE TABLE budgets (
  id INT PRIMARY KEY,
  organizationId INT,
  operatingUnitId INT
  -- No foreign keys!
);
```

**Cross-Organization Relationships:**
```sql
-- ✅ CORRECT: Include organizationId in FK
CREATE TABLE budgets (
  id INT,
  organizationId INT,
  donorId INT,
  FOREIGN KEY (organizationId, donorId) 
    REFERENCES donors(organizationId, id)
);

-- ❌ WRONG: FK doesn't include organizationId
CREATE TABLE budgets (
  id INT,
  organizationId INT,
  donorId INT,
  FOREIGN KEY (donorId) REFERENCES donors(id)
  -- Could reference donor from different organization!
);
```

---

## 8. Shared Services

### 8.1 Service Catalog

**Authentication & Authorization**
- **Location:** `server/_core/sdk.ts`, `server/_core/rbac.ts`
- **Purpose:** OAuth, session management, RBAC
- **Usage:** Called by context creation, middleware

**Audit Logging**
- **Location:** `server/services/audit/`
- **Purpose:** Track all user actions
- **Usage:** Called after mutations

**File Storage**
- **Location:** `server/storage.ts`
- **Purpose:** S3 integration for file uploads
- **Usage:** `storagePut()`, `storageGet()`

**Notifications**
- **Location:** `server/services/notifications/`
- **Purpose:** Email, in-app alerts
- **Usage:** Called by services after important events

**Translation (i18n)**
- **Location:** `client/i18n/`, `server/i18n/`
- **Purpose:** Multi-language support
- **Usage:** `useTranslation()` hook, translation keys

**Event Bus**
- **Location:** `server/services/events/`
- **Purpose:** Pub/sub for cross-domain events
- **Usage:** `eventBus.publish()`, `eventBus.subscribe()`

**Scheduling**
- **Location:** `server/services/scheduling/`
- **Purpose:** Cron jobs, background tasks
- **Usage:** `scheduler.schedule()`

**Reporting**
- **Location:** `server/utils/pdf/`, `server/utils/excel/`
- **Purpose:** PDF/Excel generation
- **Usage:** `generatePDF()`, `generateExcel()`

**Search**
- **Location:** `server/services/search/`
- **Purpose:** Full-text search
- **Usage:** `searchService.search()`

---

## 9. Existing Platform Utilities

### 9.1 Date Utilities

**Location:** `@shared/dateUtils.ts`

```typescript
// Format date to ISO string
export function toISOString(date: Date): string;

// Format date for display
export function formatDate(date: Date, format: string): string;

// Calculate days between dates
export function daysBetween(start: Date, end: Date): number;

// Add days to date
export function addDays(date: Date, days: number): Date;

// Get start of month
export function startOfMonth(date: Date): Date;

// Get end of month
export function endOfMonth(date: Date): Date;
```

### 9.2 Currency Utilities

**Location:** `@shared/currencyUtils.ts`

```typescript
// Format currency for display
export function formatCurrency(amount: number, currency: string): string;

// Convert currency
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rate: number
): number;

// Parse currency string
export function parseCurrency(value: string): number;

// Get currency symbol
export function getCurrencySymbol(currency: string): string;
```

### 9.3 Exchange Rate Utilities

**Location:** `server/services/finance/exchangeRateService.ts`

```typescript
// Get current exchange rate
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number>;

// Convert amount
export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number>;

// Get historical rates
export async function getHistoricalRates(
  currency: string,
  startDate: Date,
  endDate: Date
): Promise<ExchangeRate[]>;
```

### 9.4 PDF Generation

**Location:** `server/utils/pdf/`

```typescript
// Generate PDF from HTML
export async function generatePDF(html: string): Promise<Buffer>;

// Generate PDF from template
export async function generatePDFFromTemplate(
  templateName: string,
  data: Record<string, any>
): Promise<Buffer>;

// Generate report PDF
export async function generateReportPDF(
  reportData: Report
): Promise<Buffer>;
```

### 9.5 Excel Generation

**Location:** `server/utils/excel/`

```typescript
// Generate Excel from data
export async function generateExcel(
  data: Record<string, any>[],
  columns: Column[]
): Promise<Buffer>;

// Generate report Excel
export async function generateReportExcel(
  reportData: Report
): Promise<Buffer>;

// Export with formatting
export async function generateFormattedExcel(
  data: Record<string, any>[],
  options: ExcelOptions
): Promise<Buffer>;
```

### 9.6 File Upload

**Location:** `server/storage.ts`

```typescript
// Upload file to S3
export async function storagePut(
  key: string,
  data: Buffer | string,
  contentType?: string
): Promise<{ key: string; url: string }>;

// Get file from S3
export async function storageGet(
  key: string,
  expiresIn?: number
): Promise<{ key: string; url: string }>;

// Delete file from S3
export async function storageDelete(key: string): Promise<void>;

// List files in S3
export async function storageList(prefix: string): Promise<string[]>;
```

### 9.7 Validation

**Location:** `@shared/validationUtils.ts`

```typescript
// Validate email
export function isValidEmail(email: string): boolean;

// Validate phone
export function isValidPhone(phone: string): boolean;

// Validate currency amount
export function isValidAmount(amount: number): boolean;

// Validate date range
export function isValidDateRange(start: Date, end: Date): boolean;

// Validate organization access
export async function validateOrgAccess(
  userId: number,
  organizationId: number
): Promise<boolean>;
```

### 9.8 Formatting

**Location:** `@shared/formatUtils.ts`

```typescript
// Format number
export function formatNumber(value: number, decimals?: number): string;

// Format percentage
export function formatPercentage(value: number): string;

// Format phone
export function formatPhone(phone: string): string;

// Format address
export function formatAddress(address: Address): string;

// Truncate text
export function truncateText(text: string, length: number): string;
```

### 9.9 Localization

**Location:** `client/i18n/`, `server/i18n/`

```typescript
// Get translation
export function t(key: string, namespace?: string): string;

// Format date in user's locale
export function formatDateLocale(date: Date, locale: string): string;

// Format currency in user's locale
export function formatCurrencyLocale(
  amount: number,
  currency: string,
  locale: string
): string;

// Get RTL status
export function isRTL(language: string): boolean;
```

### 9.10 Permissions

**Location:** `server/_core/rbac.ts`

```typescript
// Check if user has permission
export function hasPermission(
  user: User,
  permission: string
): boolean;

// Check if user has role
export function hasRole(user: User, role: string): boolean;

// Get user permissions
export function getUserPermissions(user: User): string[];

// Check organization access
export async function hasOrgAccess(
  user: User,
  organizationId: number
): Promise<boolean>;
```

---

## 10. Security Architecture

### 10.1 Authentication

**OAuth Flow:**
```
1. User clicks "Login"
2. Frontend redirects to OAuth provider
3. User authenticates
4. OAuth provider redirects to callback
5. Backend exchanges code for token
6. Backend creates session
7. Session cookie set in response
8. Frontend stores session
```

**Session Management:**
- Sessions stored in database (not memory)
- Session cookies httpOnly (not accessible to JavaScript)
- Session cookies secure (only over HTTPS)
- Session timeout: 24 hours
- Session renewal on activity

### 10.2 Authorization

**Role-Based Access Control (RBAC):**

| Role | Scope | Permissions |
|------|-------|------------|
| **Platform Super Admin** | Platform-wide | All operations |
| **Platform Admin** | Platform-wide | System settings, user management |
| **Organization Admin** | Organization | Org settings, user management, all org data |
| **Organization Manager** | Organization | Org data, limited user management |
| **Organization User** | Organization | Org data (read/write based on role) |
| **Organization Viewer** | Organization | Org data (read-only) |

### 10.3 RBAC Implementation

**Procedure Types:**
- `adminProcedure` — Platform admin only
- `scopedProcedure` — Organization users
- `orgScopedProcedure` — Organization users (blocks platform admin)

**Permission Checking:**
```typescript
// Check if user has permission
if (!hasPermission(ctx.user, 'budget.create')) {
  throw new TRPCError({ code: 'FORBIDDEN' });
}

// Check if user has role
if (!hasRole(ctx.user, 'organization_admin')) {
  throw new TRPCError({ code: 'FORBIDDEN' });
}
```

### 10.4 Permission Inheritance

**Hierarchy:**
```
Platform Super Admin
├── Can do everything
└── Inherits all permissions

Platform Admin
├── Can manage system settings
├── Can manage users
└── Cannot access organization data

Organization Admin
├── Can manage organization settings
├── Can manage organization users
├── Can access all organization data
└── Cannot access other organizations

Organization Manager
├── Can access organization data
├── Can manage some users
└── Cannot change organization settings

Organization User
├── Can access assigned data
└── Cannot manage users

Organization Viewer
├── Can view assigned data
└── Cannot modify anything
```

### 10.5 Organization Isolation

**Data Isolation:**
- Every query filtered by organizationId
- No cross-organization joins
- No cross-organization foreign keys
- Platform admin blocked from org data (orgScopedProcedure)

**Example:**
```typescript
// ✅ CORRECT: Isolated by organization
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.organizationId, ctx.scope.organizationId));

// ❌ WRONG: No isolation
const budgets = await db.select().from(budgets);
```

### 10.6 Operating Unit Isolation

**Data Isolation:**
- Some data scoped to operating unit
- All OU-scoped data still filtered by organizationId
- Users can only see OUs within their organization

**Example:**
```typescript
// ✅ CORRECT: Isolated by org and OU
const budgets = await db
  .select()
  .from(budgets)
  .where(
    and(
      eq(budgets.organizationId, ctx.scope.organizationId),
      eq(budgets.operatingUnitId, ctx.scope.operatingUnitId)
    )
  );

// ❌ WRONG: Only OU scoping
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.operatingUnitId, ctx.scope.operatingUnitId));
```

### 10.7 Audit Logging

**What's Logged:**
- User actions (create, update, delete)
- Timestamp
- User ID
- Organization ID
- Change details (before/after)
- IP address
- User agent

**Example:**
```typescript
// Log action
await auditService.log({
  userId: ctx.user.id,
  organizationId: ctx.scope.organizationId,
  action: 'budget.created',
  resourceId: budgetId,
  details: { name, amount },
  timestamp: new Date(),
});
```

### 10.8 API Protection

**Rate Limiting:**
- 100 requests per minute per user
- 1000 requests per minute per IP
- Exponential backoff on repeated failures

**Input Validation:**
- All inputs validated with Zod
- Type checking at compile time
- Runtime validation before execution

**CORS:**
- Only allow requests from trusted domains
- Credentials required
- Specific headers allowed

**HTTPS:**
- All API calls over HTTPS
- Certificate pinning in mobile apps
- Strict-Transport-Security header

---

## 11. Frontend Architecture

### 11.1 Routing

**Client-Side Routing:**
- Framework: Wouter (lightweight router)
- Pattern: Hash-based routing
- No page reloads

**Route Structure:**
```
/                          — Home/Dashboard
/login                     — Login page
/finance                   — Finance module
  /finance/budgets         — Budgets list
  /finance/budgets/:id     — Budget detail
  /finance/expenditures    — Expenditures list
/hr                        — HR module
  /hr/employees            — Employees list
  /hr/employees/:id        — Employee detail
/procurement               — Procurement module
/logistics                 — Logistics module
/settings                  — Settings
  /settings/profile        — User profile
  /settings/organization   — Organization settings
```

### 11.2 Layouts

**Main Layout:**
- Header with navigation
- Sidebar with module links
- Main content area
- Footer

**Dashboard Layout:**
- Sidebar navigation
- Main content
- Optional right sidebar

**Form Layout:**
- Form fields
- Validation messages
- Submit buttons
- Cancel button

### 11.3 Reusable Components

**UI Components (shadcn/ui):**
- Button
- Card
- Dialog
- Form
- Input
- Select
- Table
- Tabs
- Toast
- etc.

**Custom Components:**
- DashboardLayout
- AIChatBox
- Map
- DataTable
- FormBuilder
- etc.

### 11.4 Component Hierarchy

```
App
├── Providers (Theme, Auth, Language)
├── Router
│   ├── ProtectedRoute
│   │   ├── DashboardLayout
│   │   │   ├── Sidebar
│   │   │   ├── Header
│   │   │   └── MainContent
│   │   │       └── Page Components
│   │   └── FormLayout
│   │       └── Form Components
│   └── PublicRoute
│       ├── LoginPage
│       └── SignupPage
└── GlobalModals
    ├── ConfirmDialog
    └── AlertDialog
```

### 11.5 Hooks

**Custom Hooks:**
- `useAuth()` — Current user and auth functions
- `useTranslation()` — i18n support
- `useTheme()` — Theme switching
- `useFileUpload()` — File upload
- `useLocalStorage()` — Local storage
- `useDebounce()` — Debouncing
- `usePagination()` — Pagination

**tRPC Hooks:**
- `trpc.*.useQuery()` — Fetch data
- `trpc.*.useMutation()` — Mutate data
- `trpc.useUtils()` — Utilities (invalidate, etc)

### 11.6 Providers

**Context Providers:**
- `AuthProvider` — Authentication state
- `ThemeProvider` — Theme state
- `LanguageProvider` — Language/i18n state
- `NotificationProvider` — Toast notifications
- `QueryClientProvider` — TanStack Query
- `TRPCProvider` — tRPC client

### 11.7 Contexts

**Auth Context:**
```typescript
type AuthContext = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  logout: () => void;
};
```

**Theme Context:**
```typescript
type ThemeContext = {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
};
```

**Language Context:**
```typescript
type LanguageContext = {
  language: 'en' | 'ar' | 'it';
  setLanguage: (lang: string) => void;
  isRTL: boolean;
};
```

### 11.8 Localization

**Translation Files:**
- `client/i18n/en.json` — English
- `client/i18n/ar.json` — Arabic
- `client/i18n/it.json` — Italian

**Usage:**
```typescript
const { t } = useTranslation();
return <h1>{t('finance.budgets.title')}</h1>;
```

### 11.9 RTL Support

**RTL Implementation:**
- CSS `direction: rtl` for Arabic
- Flex direction reversed
- Margin/padding reversed
- Text alignment reversed

**Usage:**
```typescript
const { isRTL } = useTranslation();
return (
  <div dir={isRTL ? 'rtl' : 'ltr'}>
    {/* Content */}
  </div>
);
```

### 11.10 Theming

**Theme System:**
- CSS variables for colors
- Light and dark themes
- User preference detection
- Theme persistence

**Usage:**
```typescript
const { theme, toggleTheme } = useTheme();
return (
  <button onClick={toggleTheme}>
    Switch to {theme === 'light' ? 'dark' : 'light'} mode
  </button>
);
```

---

## 12. Backend Architecture

### 12.1 Routers

**78 Routers** organized by domain:

**Finance Routers:**
- `budgetsRouter` — Budget CRUD
- `expendituresRouter` — Expenditure CRUD
- `glAccountsRouter` — GL account management
- `journalEntriesRouter` — Journal entry management
- `financeRouter` — Finance module
- `financeDashboardRouter` — Finance dashboards
- etc.

**HR Routers:**
- `hrEmployeesRouter` — Employee management
- `hrPayrollRouter` — Payroll management
- `hrLeaveRouter` — Leave management
- `hrAttendanceRouter` — Attendance tracking
- etc.

**Procurement Routers:**
- `procurementRouter` — Procurement module
- `purchaseRequestRouter` — PR management
- `purchaseOrderRouter` — PO management
- etc.

**Logistics Routers:**
- `logisticsRouter` — Logistics module
- `stockRouter` — Stock management
- `warehouseRouter` — Warehouse management
- etc.

### 12.2 Services

**Finance Services:**
- BudgetService
- ExpenditureService
- JournalEntryService
- FinancialReportingService
- etc.

**HR Services:**
- EmployeeService
- PayrollService
- LeaveService
- AttendanceService
- etc.

**Shared Services:**
- AuthenticationService
- AuthorizationService
- AuditService
- NotificationService
- etc.

### 12.3 Repositories

**Finance Repositories:**
- BudgetRepository
- ExpenditureRepository
- JournalEntryRepository
- FinancialComplianceRepository
- ComplianceFindingsRepository
- AIRecommendationsRepository
- etc.

**HR Repositories:**
- EmployeeRepository
- PayrollRepository
- LeaveRepository
- etc.

### 12.4 Engines

**Finance Engines:**
- FinancialRiskEngine
- FinancialReportingEngine
- ReconciliationEngine
- CurrencyEngine
- TrialBalanceEngine
- GeneralLedgerEngine
- etc.

**Logistics Engines:**
- LogisticsEngine

**Integration Engines:**
- P2PLogisticsIntegration

### 12.5 Validators

**Input Validators (Zod):**
```typescript
// Budget creation
const createBudgetSchema = z.object({
  name: z.string().min(1).max(255),
  amount: z.number().positive(),
  status: z.enum(['draft', 'approved', 'executed', 'closed']),
});

// Expenditure creation
const createExpenditureSchema = z.object({
  budgetId: z.number().positive(),
  amount: z.number().positive(),
  description: z.string().min(1),
});
```

### 12.6 Middleware

**Express Middleware:**
- Authentication middleware
- Error handling middleware
- Logging middleware
- CORS middleware
- Rate limiting middleware

**tRPC Middleware:**
- Date serialization middleware
- User requirement middleware
- Scope requirement middleware
- Admin requirement middleware

### 12.7 Shared Libraries

**Utilities:**
- Date utilities
- Currency utilities
- Validation utilities
- Formatting utilities
- Localization utilities
- Permission utilities

### 12.8 Database Connection

**Drizzle ORM:**
```typescript
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

export const db = drizzle(pool);
```

---

## 13. Coding Standards

### 13.1 Naming Conventions

**Variables:**
- camelCase
- Descriptive names
- No abbreviations
- Examples: `organizationId`, `budgetAmount`, `isDeleted`

**Functions:**
- camelCase
- Verb + noun pattern
- Examples: `getBudget()`, `createExpenditure()`, `updateStatus()`

**Classes:**
- PascalCase
- Noun pattern
- Examples: `BudgetRepository`, `FinancialRiskEngine`, `AuthenticationService`

**Constants:**
- UPPER_SNAKE_CASE
- Examples: `MAX_BUDGET_AMOUNT`, `DEFAULT_PAGE_SIZE`, `UNAUTHED_ERR_MSG`

**Types/Interfaces:**
- PascalCase
- Prefix with `I` for interfaces (optional)
- Examples: `Budget`, `User`, `IRepository`

### 13.2 File Naming

**Routers:**
- `*Router.ts`
- Examples: `budgetsRouter.ts`, `financeRouter.ts`

**Services:**
- `*Service.ts`
- Examples: `budgetService.ts`, `authenticationService.ts`

**Repositories:**
- `*Repository.ts`
- Examples: `budgetRepository.ts`, `expenditureRepository.ts`

**Engines:**
- `*Engine.ts`
- Examples: `financialRiskEngine.ts`, `currencyEngine.ts`

**Components:**
- `*.tsx` (React components)
- Examples: `BudgetForm.tsx`, `DashboardLayout.tsx`

**Utilities:**
- `*Utils.ts` or `*Helper.ts`
- Examples: `dateUtils.ts`, `validationUtils.ts`

**Tests:**
- `*.test.ts`
- Examples: `budgetRepository.test.ts`, `authService.test.ts`

### 13.3 Folder Organization

```
server/
├── _core/                  # Core infrastructure
│   ├── trpc.ts            # tRPC setup
│   ├── context.ts         # Context creation
│   ├── sdk.ts             # Authentication
│   └── rbac.ts            # Authorization
├── routers/               # tRPC routers
│   ├── finance/
│   ├── hr/
│   ├── procurement/
│   └── logistics/
├── services/              # Business logic
│   ├── finance/
│   ├── hr/
│   └── shared/
├── repositories/          # Data access
│   ├── finance/
│   ├── hr/
│   └── shared/
├── engines/               # Complex computations
│   ├── finance/
│   └── logistics/
├── middleware/            # Express middleware
├── utils/                 # Utilities
└── db/                    # Database connection

client/
├── src/
│   ├── pages/            # Page components
│   ├── components/       # Reusable components
│   ├── hooks/            # Custom hooks
│   ├── contexts/         # React contexts
│   ├── lib/              # Utilities
│   ├── i18n/             # Translations
│   └── App.tsx           # Main app component
└── public/               # Static assets

drizzle/
├── schema.ts             # Database schema
└── migrations/           # SQL migrations
```

### 13.4 TypeScript Conventions

**Type Definitions:**
```typescript
// ✅ CORRECT: Explicit types
function getBudget(organizationId: number, budgetId: number): Promise<Budget> {
  // ...
}

// ❌ WRONG: Implicit any
function getBudget(organizationId, budgetId) {
  // ...
}
```

**Interfaces vs Types:**
```typescript
// Use interfaces for objects
interface Budget {
  id: number;
  name: string;
  amount: number;
}

// Use types for unions, tuples
type Status = 'draft' | 'approved' | 'executed' | 'closed';
type Result<T> = { success: true; data: T } | { success: false; error: string };
```

**Generics:**
```typescript
// ✅ CORRECT: Generic repository
class Repository<T> {
  async findById(id: number): Promise<T | null> {
    // ...
  }
}

// Usage
const budgetRepo = new Repository<Budget>();
```

**Enums:**
```typescript
// ✅ CORRECT: String enums
enum Status {
  Draft = 'draft',
  Approved = 'approved',
  Executed = 'executed',
  Closed = 'closed',
}

// ❌ WRONG: Numeric enums (harder to debug)
enum Status {
  Draft = 0,
  Approved = 1,
  Executed = 2,
  Closed = 3,
}
```

### 13.5 React Conventions

**Functional Components:**
```typescript
// ✅ CORRECT: Functional component
export function BudgetForm({ onSubmit }: { onSubmit: (data: Budget) => void }) {
  const [name, setName] = useState('');
  
  return (
    <form onSubmit={() => onSubmit({ name })}>
      {/* Form fields */}
    </form>
  );
}

// ❌ WRONG: Class component (outdated)
class BudgetForm extends React.Component {
  // ...
}
```

**Hooks:**
```typescript
// ✅ CORRECT: Use hooks
function BudgetList() {
  const { data: budgets } = trpc.budgets.list.useQuery();
  
  return (
    <ul>
      {budgets?.map(b => <li key={b.id}>{b.name}</li>)}
    </ul>
  );
}

// ❌ WRONG: Direct API calls
function BudgetList() {
  const [budgets, setBudgets] = useState([]);
  
  useEffect(() => {
    fetch('/api/budgets').then(r => r.json()).then(setBudgets);
  }, []);
  
  return (
    <ul>
      {budgets.map(b => <li key={b.id}>{b.name}</li>)}
    </ul>
  );
}
```

**Props Typing:**
```typescript
// ✅ CORRECT: Typed props
interface BudgetFormProps {
  budgetId: number;
  onSubmit: (data: Budget) => Promise<void>;
  isLoading?: boolean;
}

export function BudgetForm({ budgetId, onSubmit, isLoading }: BudgetFormProps) {
  // ...
}

// ❌ WRONG: Untyped props
export function BudgetForm(props) {
  // ...
}
```

### 13.6 Drizzle Conventions

**Schema Definition:**
```typescript
// ✅ CORRECT: Proper schema
export const budgets = mysqlTable('budgets', {
  id: int().autoincrement().primaryKey().notNull(),
  organizationId: int().notNull(),
  operatingUnitId: int(),
  name: varchar({ length: 255 }).notNull(),
  amount: decimal({ precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum(['draft', 'approved', 'executed', 'closed']),
  isDeleted: tinyint().default(0).notNull(),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().defaultNow().onUpdateNow(),
  createdBy: int(),
  updatedBy: int(),
}, (table) => ({
  idxOrg: index('idx_budgets_org').on(table.organizationId),
  idxStatus: index('idx_budgets_status').on(table.status),
}));
```

**Query Building:**
```typescript
// ✅ CORRECT: Type-safe queries
const budgets = await db
  .select()
  .from(budgets)
  .where(
    and(
      eq(budgets.organizationId, organizationId),
      eq(budgets.isDeleted, 0)
    )
  )
  .orderBy(desc(budgets.createdAt));

// ❌ WRONG: Raw SQL
const budgets = await db.execute(
  `SELECT * FROM budgets WHERE organizationId = ${organizationId}`
);
```

### 13.7 tRPC Conventions

**Procedure Definition:**
```typescript
// ✅ CORRECT: Typed procedure
export const budgetsRouter = router({
  list: scopedProcedure
    .query(async ({ ctx }) => {
      return await budgetService.list(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId
      );
    }),

  create: scopedProcedure
    .input(z.object({
      name: z.string(),
      amount: z.number().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await budgetService.create(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId,
        input
      );
    }),
});

// ❌ WRONG: Untyped procedure
export const budgetsRouter = router({
  list: publicProcedure
    .query(async () => {
      return await db.select().from(budgets);
    }),
});
```

---

## 14. Existing Design Patterns

### 14.1 Repository Pattern

**Purpose:** Abstract data access logic

**Implementation:**
```typescript
class BudgetRepository {
  constructor(private db: DB) {}
  
  async findByOrganization(organizationId: number) {
    return await this.db
      .select()
      .from(budgets)
      .where(eq(budgets.organizationId, organizationId));
  }
  
  async create(data: InsertBudget) {
    return await this.db
      .insert(budgets)
      .values(data)
      .returning();
  }
}
```

### 14.2 Factory Pattern

**Purpose:** Create objects without specifying exact classes

**Implementation:**
```typescript
class RepositoryFactory {
  static createBudgetRepository(db: DB): BudgetRepository {
    return new BudgetRepository(db);
  }
  
  static createExpenditureRepository(db: DB): ExpenditureRepository {
    return new ExpenditureRepository(db);
  }
}
```

### 14.3 Strategy Pattern

**Purpose:** Define interchangeable algorithms

**Implementation:**
```typescript
interface ExportStrategy {
  export(data: any[]): Promise<Buffer>;
}

class CSVExportStrategy implements ExportStrategy {
  async export(data: any[]): Promise<Buffer> {
    // CSV export logic
  }
}

class ExcelExportStrategy implements ExportStrategy {
  async export(data: any[]): Promise<Buffer> {
    // Excel export logic
  }
}

class ExportService {
  constructor(private strategy: ExportStrategy) {}
  
  async export(data: any[]): Promise<Buffer> {
    return await this.strategy.export(data);
  }
}
```

### 14.4 Adapter Pattern

**Purpose:** Convert interface of one class to another

**Implementation:**
```typescript
interface PaymentProcessor {
  process(amount: number): Promise<void>;
}

class StripeAdapter implements PaymentProcessor {
  async process(amount: number): Promise<void> {
    // Convert to Stripe API
    await stripe.charge({ amount });
  }
}

class PaymentService {
  constructor(private processor: PaymentProcessor) {}
  
  async processPayment(amount: number): Promise<void> {
    await this.processor.process(amount);
  }
}
```

### 14.5 Builder Pattern

**Purpose:** Construct complex objects step by step

**Implementation:**
```typescript
class QueryBuilder {
  private query: SelectQueryBuilder;
  
  where(condition: SQL): QueryBuilder {
    this.query = this.query.where(condition);
    return this;
  }
  
  orderBy(column: Column): QueryBuilder {
    this.query = this.query.orderBy(column);
    return this;
  }
  
  limit(count: number): QueryBuilder {
    this.query = this.query.limit(count);
    return this;
  }
  
  build(): SelectQueryBuilder {
    return this.query;
  }
}

// Usage
const query = new QueryBuilder()
  .where(eq(budgets.organizationId, orgId))
  .orderBy(desc(budgets.createdAt))
  .limit(10)
  .build();
```

### 14.6 Observer Pattern

**Purpose:** Notify multiple objects about state changes

**Implementation:**
```typescript
interface Observer {
  update(event: Event): void;
}

class EventBus {
  private observers: Map<string, Observer[]> = new Map();
  
  subscribe(eventType: string, observer: Observer): void {
    if (!this.observers.has(eventType)) {
      this.observers.set(eventType, []);
    }
    this.observers.get(eventType)!.push(observer);
  }
  
  publish(event: Event): void {
    const observers = this.observers.get(event.type) || [];
    observers.forEach(observer => observer.update(event));
  }
}
```

### 14.7 Dependency Injection

**Purpose:** Inject dependencies instead of creating them

**Implementation:**
```typescript
// ✅ CORRECT: Constructor injection
class BudgetService {
  constructor(
    private budgetRepository: BudgetRepository,
    private auditService: AuditService
  ) {}
  
  async create(data: CreateBudgetInput) {
    const budget = await this.budgetRepository.create(data);
    await this.auditService.log('budget.created', budget.id);
    return budget;
  }
}

// ❌ WRONG: Creating dependencies internally
class BudgetService {
  private budgetRepository = new BudgetRepository();
  private auditService = new AuditService();
  
  async create(data: CreateBudgetInput) {
    // ...
  }
}
```

### 14.8 CQRS (Command Query Responsibility Segregation)

**Purpose:** Separate read and write operations

**Implementation:**
```typescript
// Command: Write operation
class CreateBudgetCommand {
  constructor(
    public organizationId: number,
    public name: string,
    public amount: number
  ) {}
}

// Query: Read operation
class GetBudgetsQuery {
  constructor(
    public organizationId: number,
    public page: number = 1
  ) {}
}

// Handler
class BudgetCommandHandler {
  async handle(command: CreateBudgetCommand): Promise<Budget> {
    // Create budget
  }
}

class BudgetQueryHandler {
  async handle(query: GetBudgetsQuery): Promise<Budget[]> {
    // Get budgets
  }
}
```

### 14.9 Event-Driven Architecture

**Purpose:** Decouple components through events

**Implementation:**
```typescript
// Event
class BudgetCreatedEvent {
  constructor(
    public budgetId: number,
    public organizationId: number,
    public amount: number
  ) {}
}

// Publisher
class BudgetService {
  async create(data: CreateBudgetInput, eventBus: EventBus) {
    const budget = await this.budgetRepository.create(data);
    eventBus.publish(
      new BudgetCreatedEvent(budget.id, budget.organizationId, budget.amount)
    );
    return budget;
  }
}

// Subscriber
class NotificationService implements Observer {
  update(event: BudgetCreatedEvent) {
    // Send notification
  }
}
```

### 14.10 Saga Pattern

**Purpose:** Manage distributed transactions

**Implementation:**
```typescript
class BudgetCreationSaga {
  async execute(data: CreateBudgetInput) {
    try {
      // Step 1: Create budget
      const budget = await this.budgetService.create(data);
      
      // Step 2: Allocate funds
      await this.fundService.allocate(budget.id, data.amount);
      
      // Step 3: Publish event
      await this.eventBus.publish(new BudgetCreatedEvent(budget.id));
      
      return budget;
    } catch (error) {
      // Compensating transaction: Rollback
      await this.rollback();
      throw error;
    }
  }
  
  private async rollback() {
    // Undo steps in reverse order
  }
}
```

---

## 15. Performance Strategy

### 15.1 Caching

**Query Caching:**
```typescript
// Cache budget list for 5 minutes
const budgets = await cache.get(
  `budgets:${organizationId}`,
  () => budgetRepository.findByOrganization(organizationId),
  { ttl: 5 * 60 * 1000 }
);
```

**Cache Invalidation:**
```typescript
// Invalidate cache when budget is updated
async function updateBudget(id: number, data: UpdateBudgetInput) {
  const budget = await budgetRepository.update(id, data);
  await cache.invalidate(`budgets:${budget.organizationId}`);
  return budget;
}
```

### 15.2 Lazy Loading

**Frontend:**
```typescript
// Load data only when needed
const { data: budgets } = trpc.budgets.list.useQuery(
  { page: 1 },
  { enabled: isOpen } // Only fetch when modal is open
);
```

**Backend:**
```typescript
// Return only essential fields initially
const budgets = await db
  .select({
    id: budgets.id,
    name: budgets.name,
    amount: budgets.amount,
    // Exclude: description, details, history
  })
  .from(budgets)
  .where(eq(budgets.organizationId, organizationId));
```

### 15.3 Pagination

**Backend:**
```typescript
async function list(
  organizationId: number,
  page: number = 1,
  pageSize: number = 10
) {
  const offset = (page - 1) * pageSize;
  
  const [data, total] = await Promise.all([
    this.db
      .select()
      .from(budgets)
      .where(eq(budgets.organizationId, organizationId))
      .limit(pageSize)
      .offset(offset),
    this.db
      .select({ count: count() })
      .from(budgets)
      .where(eq(budgets.organizationId, organizationId)),
  ]);
  
  return {
    data,
    total: total[0].count,
    page,
    pageSize,
    totalPages: Math.ceil(total[0].count / pageSize),
  };
}
```

**Frontend:**
```typescript
function BudgetList() {
  const [page, setPage] = useState(1);
  const { data } = trpc.budgets.list.useQuery({ page });
  
  return (
    <>
      <ul>
        {data?.data.map(b => <li key={b.id}>{b.name}</li>)}
      </ul>
      <Pagination
        page={page}
        totalPages={data?.totalPages}
        onPageChange={setPage}
      />
    </>
  );
}
```

### 15.4 Indexing

**Database Indexes:**
```sql
-- Single column index
CREATE INDEX idx_org ON budgets(organizationId);

-- Composite index
CREATE INDEX idx_org_status ON budgets(organizationId, status);

-- Unique index
CREATE UNIQUE INDEX uk_org_name ON budgets(organizationId, name);
```

### 15.5 Batching

**Batch Queries:**
```typescript
// ✅ CORRECT: Batch multiple queries
const [budgets, expenditures, donors] = await Promise.all([
  budgetRepository.findByOrganization(orgId),
  expenditureRepository.findByOrganization(orgId),
  donorRepository.findByOrganization(orgId),
]);

// ❌ WRONG: Sequential queries
const budgets = await budgetRepository.findByOrganization(orgId);
const expenditures = await expenditureRepository.findByOrganization(orgId);
const donors = await donorRepository.findByOrganization(orgId);
```

### 15.6 Background Jobs

**Schedule Heavy Operations:**
```typescript
// Don't block request
scheduler.schedule('generate-report', async () => {
  const report = await reportService.generate();
  await notificationService.send(userId, {
    title: 'Report Ready',
    url: report.url,
  });
}, { cron: '0 2 * * *' }); // 2 AM daily
```

### 15.7 Query Optimization

**Select Only Needed Columns:**
```typescript
// ✅ CORRECT: Select specific columns
const budgets = await db
  .select({
    id: budgets.id,
    name: budgets.name,
    amount: budgets.amount,
  })
  .from(budgets);

// ❌ WRONG: Select all columns
const budgets = await db.select().from(budgets);
```

**Use Indexes in WHERE Clauses:**
```typescript
// ✅ CORRECT: Use indexed column
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.organizationId, orgId)); // Indexed!

// ❌ WRONG: Use non-indexed column
const budgets = await db
  .select()
  .from(budgets)
  .where(like(budgets.description, '%budget%')); // Not indexed!
```

---

## 16. Translation Architecture

### 16.1 Translation Files

**Structure:**
```
client/i18n/
├── en.json       # English
├── ar.json       # Arabic
└── it.json       # Italian
```

**Format:**
```json
{
  "finance": {
    "budgets": {
      "title": "Budgets",
      "create": "Create Budget",
      "edit": "Edit Budget",
      "delete": "Delete Budget"
    }
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  }
}
```

### 16.2 Namespaces

**Namespace Organization:**
- `finance.*` — Finance module translations
- `hr.*` — HR module translations
- `procurement.*` — Procurement module translations
- `logistics.*` — Logistics module translations
- `common.*` — Shared translations

### 16.3 Key Naming

**Naming Convention:**
- Lowercase with dots
- Module prefix
- Feature prefix
- Action/label
- Examples: `finance.budgets.create`, `common.buttons.save`

### 16.4 RTL Support

**RTL Detection:**
```typescript
const isRTL = (language: string) => language === 'ar';
```

**RTL Implementation:**
```typescript
<div dir={isRTL(language) ? 'rtl' : 'ltr'}>
  {/* Content */}
</div>
```

### 16.5 Adding New Languages

**Steps:**
1. Create new translation file: `client/i18n/es.json`
2. Copy structure from `en.json`
3. Translate all keys
4. Add language option to language selector
5. Test RTL if applicable

---

## 17. Reporting Architecture

### 17.1 Report Generation

**PDF Generation:**
```typescript
async function generateBudgetReport(organizationId: number) {
  // Fetch data
  const budgets = await budgetRepository.findByOrganization(organizationId);
  
  // Generate HTML
  const html = await renderTemplate('budget-report', { budgets });
  
  // Generate PDF
  const pdf = await pdfService.generate(html);
  
  // Store in S3
  const { url } = await storage.put(`reports/budget-${Date.now()}.pdf`, pdf);
  
  return { url, filename: 'budget-report.pdf' };
}
```

### 17.2 Excel Generation

**Excel Export:**
```typescript
async function exportBudgets(organizationId: number) {
  // Fetch data
  const budgets = await budgetRepository.findByOrganization(organizationId);
  
  // Generate Excel
  const excel = await excelService.generate(budgets, [
    { header: 'ID', key: 'id' },
    { header: 'Name', key: 'name' },
    { header: 'Amount', key: 'amount' },
  ]);
  
  // Store in S3
  const { url } = await storage.put(`exports/budgets-${Date.now()}.xlsx`, excel);
  
  return { url, filename: 'budgets.xlsx' };
}
```

### 17.3 Export Architecture

**Export Service:**
```typescript
class ExportService {
  async exportBudgets(organizationId: number, format: 'csv' | 'xlsx' | 'pdf') {
    const budgets = await budgetRepository.findByOrganization(organizationId);
    
    switch (format) {
      case 'csv':
        return await this.exportCSV(budgets);
      case 'xlsx':
        return await this.exportExcel(budgets);
      case 'pdf':
        return await this.exportPDF(budgets);
    }
  }
}
```

### 17.4 Print Architecture

**Print Templates:**
```typescript
// Print budget report
function BudgetPrintView({ budgetId }: { budgetId: number }) {
  const { data: budget } = trpc.budgets.getById.useQuery({ id: budgetId });
  
  return (
    <div className="print-only">
      <h1>{budget?.name}</h1>
      <p>Amount: {formatCurrency(budget?.amount)}</p>
      <button onClick={() => window.print()}>Print</button>
    </div>
  );
}
```

---

## 18. Document Management

### 18.1 Attachments

**File Upload:**
```typescript
async function uploadDocument(file: File, organizationId: number) {
  // Validate file
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File too large');
  }
  
  // Upload to S3
  const { url, key } = await storage.put(
    `documents/${organizationId}/${file.name}`,
    file
  );
  
  // Store metadata
  await documentRepository.create({
    organizationId,
    filename: file.name,
    fileKey: key,
    fileUrl: url,
    fileSize: file.size,
    mimeType: file.type,
  });
  
  return { url, key };
}
```

### 18.2 File Storage

**S3 Integration:**
```typescript
// Upload
const { url } = await storage.put('documents/budget.pdf', pdfBuffer);

// Download
const { url: downloadUrl } = await storage.get('documents/budget.pdf', {
  expiresIn: 3600, // 1 hour
});

// Delete
await storage.delete('documents/budget.pdf');
```

### 18.3 Versioning

**Document Versions:**
```typescript
async function updateDocument(documentId: number, newContent: Buffer) {
  // Create new version
  const version = await documentVersionRepository.create({
    documentId,
    versionNumber: currentVersion + 1,
    fileKey: `documents/${documentId}/v${currentVersion + 1}`,
    createdBy: userId,
  });
  
  // Upload to S3
  await storage.put(version.fileKey, newContent);
  
  return version;
}
```

### 18.4 Document Lifecycle

**States:**
- Draft — Being edited
- Submitted — Awaiting approval
- Approved — Approved by manager
- Published — Available to users
- Archived — No longer active

---

## 19. AI Readiness

### 19.1 AI Architecture

**Current Implementation:**
- AI Recommendations for compliance findings
- AI-powered risk analysis
- Machine learning models for forecasting

**Integration Points:**
- `AIRecommendationsRepository` — Store AI recommendations
- `EnhancedComplianceEngine` — AI-powered compliance analysis
- `AIExecutiveEngine` — AI-powered executive insights

### 19.2 Future AI Integration

**Planned Enhancements:**
1. **Predictive Analytics** — Forecast budget variances, cash flow
2. **Anomaly Detection** — Detect unusual transactions
3. **Natural Language Processing** — Process documents, emails
4. **Computer Vision** — Extract data from images, receipts
5. **Recommendation Engine** — Suggest actions, optimizations

### 19.3 Agent Integration

**MCP (Model Context Protocol) Readiness:**
- Structured data access for LLMs
- Standardized API contracts
- Type-safe agent interactions

### 19.4 Workflow Automation

**Planned Workflows:**
1. **Budget Approval Workflow** — AI-assisted approval
2. **Expense Classification** — Auto-classify expenses
3. **Risk Assessment** — AI-powered risk scoring
4. **Report Generation** — Auto-generate reports

### 19.5 Orchestration Plans

**Multi-Step Processes:**
- Workflow engine for complex processes
- Event-driven orchestration
- Human-in-the-loop approvals

---

## 20. Event Architecture

### 20.1 Events

**Event Types:**
- `budget.created` — Budget created
- `budget.updated` — Budget updated
- `budget.deleted` — Budget deleted
- `expenditure.approved` — Expenditure approved
- `payroll.processed` — Payroll processed
- `purchase_order.sent` — PO sent to vendor

### 20.2 Subscribers

**Event Subscribers:**
- Audit service — Log all events
- Notification service — Send notifications
- Analytics service — Track metrics
- Integration service — Sync with external systems

### 20.3 Publishers

**Event Publishers:**
- Services publish domain events
- Routers trigger events after mutations
- Engines publish calculation results

### 20.4 Event Naming

**Convention:**
- `domain.action`
- Examples: `budget.created`, `expenditure.approved`, `payroll.processed`

### 20.5 Event Versioning

**Versioning Strategy:**
- Events include version number
- Subscribers handle multiple versions
- Backward compatibility maintained

---

## 21. Background Jobs & Scheduling

### 21.1 Schedulers

**Cron Jobs:**
```typescript
scheduler.schedule('generate-daily-report', async () => {
  const report = await reportService.generateDaily();
  await notificationService.send(adminId, {
    title: 'Daily Report Ready',
    url: report.url,
  });
}, { cron: '0 6 * * *' }); // 6 AM daily
```

### 21.2 Cron Jobs

**Common Jobs:**
- `0 2 * * *` — 2 AM daily (heavy reports)
- `0 * * * *` — Every hour (cache refresh)
- `0 0 * * 0` — Weekly (cleanup)
- `0 0 1 * *` — Monthly (archival)

### 21.3 Queues

**Job Queues:**
```typescript
// Enqueue job
await jobQueue.enqueue('send-email', {
  to: email,
  subject: 'Budget Approved',
  body: 'Your budget has been approved',
});

// Process queue
jobQueue.process('send-email', async (job) => {
  await emailService.send(job.data);
});
```

### 21.4 Retry Strategy

**Retry Logic:**
```typescript
// Retry with exponential backoff
await jobQueue.enqueue('send-email', data, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
});
```

---

## 22. Testing Strategy

### 22.1 Unit Testing

**Repository Tests:**
```typescript
describe('BudgetRepository', () => {
  it('should find budgets by organization', async () => {
    const budgets = await repository.findByOrganization(1);
    expect(budgets).toHaveLength(5);
  });
});
```

### 22.2 Integration Testing

**Router Tests:**
```typescript
describe('budgetsRouter', () => {
  it('should create budget', async () => {
    const result = await caller.budgets.create({
      name: 'Q1 Budget',
      amount: 100000,
    });
    expect(result.id).toBeDefined();
  });
});
```

### 22.3 Repository Testing

**Data Access Tests:**
```typescript
describe('BudgetRepository', () => {
  it('should filter by organizationId', async () => {
    const budgets = await repository.findByOrganization(1);
    expect(budgets.every(b => b.organizationId === 1)).toBe(true);
  });
});
```

### 22.4 UI Testing

**Component Tests:**
```typescript
describe('BudgetForm', () => {
  it('should submit form', async () => {
    const { getByText, getByLabelText } = render(<BudgetForm />);
    fireEvent.change(getByLabelText('Name'), { target: { value: 'Q1' } });
    fireEvent.click(getByText('Create'));
    expect(onSubmit).toHaveBeenCalled();
  });
});
```

### 22.5 Regression Testing

**Regression Suite:**
- Test previously fixed bugs
- Ensure fixes don't break other features
- Run on every release

---

## 23. Recommended Development Workflow

### 23.1 Development Process

**Step 1: Read Architecture**
- Understand system design
- Review relevant patterns
- Check similar implementations

**Step 2: Read Schema**
- Understand data model
- Check relationships
- Review indexes

**Step 3: Search Existing Code**
- Find similar implementations
- Copy patterns
- Avoid duplication

**Step 4: Reuse Existing Services**
- Use shared services
- Use existing repositories
- Use existing utilities

**Step 5: Implement**
- Follow architecture patterns
- Use type safety
- Write clean code

**Step 6: Test**
- Unit tests for repositories
- Integration tests for routers
- UI tests for components

**Step 7: Document**
- Add code comments
- Update README
- Document decisions

**Step 8: Review**
- Code review by peer
- Architecture review
- Security review

**Step 9: Merge**
- Merge to main branch
- Deploy to staging
- Deploy to production

---

## 24. Common Mistakes to Avoid

### 24.1 Architectural Mistakes

**Mistake 1: Missing organizationId Filter**
```typescript
// ❌ WRONG
const budgets = await db.select().from(budgets);

// ✅ CORRECT
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.organizationId, organizationId));
```

**Mistake 2: Business Logic in Router**
```typescript
// ❌ WRONG
export const budgetsRouter = router({
  create: scopedProcedure
    .input(z.object({ name: z.string(), amount: z.number() }))
    .mutation(async ({ input }) => {
      // Business logic in router!
      const total = input.amount * 1.1; // Tax calculation
      return await db.insert(budgets).values({
        name: input.name,
        amount: total,
      });
    }),
});

// ✅ CORRECT
export const budgetsRouter = router({
  create: scopedProcedure
    .input(z.object({ name: z.string(), amount: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await budgetService.create(
        ctx.scope.organizationId,
        input
      );
    }),
});
```

**Mistake 3: Direct Queries in Service**
```typescript
// ❌ WRONG
class BudgetService {
  async create(data: CreateBudgetInput) {
    return await db.insert(budgets).values(data);
  }
}

// ✅ CORRECT
class BudgetService {
  constructor(private repository: BudgetRepository) {}
  
  async create(data: CreateBudgetInput) {
    return await this.repository.create(data);
  }
}
```

### 24.2 Security Mistakes

**Mistake 1: Trusting User Input for Scope**
```typescript
// ❌ WRONG
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.organizationId, input.organizationId));

// ✅ CORRECT
const budgets = await db
  .select()
  .from(budgets)
  .where(eq(budgets.organizationId, ctx.scope.organizationId));
```

**Mistake 2: Using publicProcedure for Sensitive Data**
```typescript
// ❌ WRONG
export const budgetsRouter = router({
  list: publicProcedure
    .query(async () => {
      return await db.select().from(budgets);
    }),
});

// ✅ CORRECT
export const budgetsRouter = router({
  list: scopedProcedure
    .query(async ({ ctx }) => {
      return await budgetService.list(ctx.scope.organizationId);
    }),
});
```

**Mistake 3: Logging Sensitive Data**
```typescript
// ❌ WRONG
console.log('User password:', password);

// ✅ CORRECT
console.log('User authenticated');
```

### 24.3 Repository Mistakes

**Mistake 1: No Pagination**
```typescript
// ❌ WRONG
async findByOrganization(organizationId: number) {
  return await db
    .select()
    .from(budgets)
    .where(eq(budgets.organizationId, organizationId));
  // Could return 100,000+ rows!
}

// ✅ CORRECT
async findByOrganization(
  organizationId: number,
  page: number = 1,
  pageSize: number = 10
) {
  const offset = (page - 1) * pageSize;
  return await db
    .select()
    .from(budgets)
    .where(eq(budgets.organizationId, organizationId))
    .limit(pageSize)
    .offset(offset);
}
```

**Mistake 2: Selecting All Columns**
```typescript
// ❌ WRONG
async findById(id: number) {
  return await db
    .select()
    .from(budgets)
    .where(eq(budgets.id, id));
}

// ✅ CORRECT
async findById(id: number) {
  return await db
    .select({
      id: budgets.id,
      name: budgets.name,
      amount: budgets.amount,
      status: budgets.status,
    })
    .from(budgets)
    .where(eq(budgets.id, id));
}
```

### 24.4 Performance Mistakes

**Mistake 1: N+1 Queries**
```typescript
// ❌ WRONG
const budgets = await db.select().from(budgets);
for (const budget of budgets) {
  budget.expenditures = await db
    .select()
    .from(expenditures)
    .where(eq(expenditures.budgetId, budget.id));
}

// ✅ CORRECT
const budgets = await db
  .select()
  .from(budgets)
  .leftJoin(expenditures, eq(budgets.id, expenditures.budgetId));
```

**Mistake 2: Sequential Queries**
```typescript
// ❌ WRONG
const budgets = await budgetRepository.find();
const expenditures = await expenditureRepository.find();
const donors = await donorRepository.find();

// ✅ CORRECT
const [budgets, expenditures, donors] = await Promise.all([
  budgetRepository.find(),
  expenditureRepository.find(),
  donorRepository.find(),
]);
```

### 24.5 Common Anti-Patterns

**Anti-Pattern 1: God Object**
```typescript
// ❌ WRONG: One class does everything
class BudgetManager {
  async create() { }
  async update() { }
  async delete() { }
  async approve() { }
  async generateReport() { }
  async sendNotification() { }
  async logAudit() { }
  // 50+ methods!
}

// ✅ CORRECT: Separate concerns
class BudgetService { }
class BudgetRepository { }
class BudgetReportService { }
class NotificationService { }
class AuditService { }
```

**Anti-Pattern 2: Circular Dependencies**
```typescript
// ❌ WRONG
// BudgetService → ExpenditureService → BudgetService

// ✅ CORRECT
// Use event bus or shared service
class EventBus { }
class BudgetService { constructor(eventBus: EventBus) {} }
class ExpenditureService { constructor(eventBus: EventBus) {} }
```

**Anti-Pattern 3: Magic Numbers**
```typescript
// ❌ WRONG
if (budget.amount > 1000000) { }

// ✅ CORRECT
const MAX_BUDGET = 1000000;
if (budget.amount > MAX_BUDGET) { }
```

---

## 25. Institutional Knowledge & Technical Debt

### 25.1 Hidden Conventions

**Scope Injection:**
- Always use `ctx.scope` for organization-scoped queries
- Never trust user input for scope
- Scope is guaranteed in scopedProcedure

**Soft Deletes:**
- Always filter by `isDeleted = 0` in queries
- Never use hard deletes
- Preserve audit trail

**Multi-Tenancy:**
- Every query must filter by organizationId
- No cross-organization data sharing
- Platform admin blocked from org data

### 25.2 Architectural Assumptions

**Assumption 1: Single Organization per User**
- Users belong to exactly one organization
- Users can have multiple roles within organization
- Users can access multiple operating units

**Assumption 2: Stateless API Servers**
- No session state in memory
- Sessions stored in database
- Can run multiple instances

**Assumption 3: Eventual Consistency**
- Events published asynchronously
- Subscribers may lag behind
- Acceptable for non-critical operations

### 25.3 Reusable Platform Services

**Shared Services:**
- Authentication (OAuth, sessions)
- Authorization (RBAC)
- Audit logging
- File storage (S3)
- Notifications
- Translation (i18n)
- Event bus
- Scheduling

### 25.4 Future Platform Direction

**Planned Directions:**
1. **Microservices** — Decompose by domain
2. **Mobile App** — React Native
3. **Offline Support** — Local-first sync
4. **Real-Time** — WebSockets
5. **Advanced Analytics** — Data warehouse
6. **AI Integration** — ML models
7. **Workflow Engine** — Configurable workflows
8. **API Ecosystem** — Public APIs

### 25.5 Technical Debt

**Known Issues:**
1. **Legacy Code** — Old routers need refactoring
2. **Missing Tests** — Some modules lack test coverage
3. **Performance** — Some queries need optimization
4. **Documentation** — Some features undocumented

**Planned Refactoring:**
1. Migrate legacy routers to new pattern
2. Add comprehensive test coverage
3. Optimize slow queries
4. Document all features

---

## 26. Future Roadmap

### 26.1 Short-Term (Next 3 Months)

**Finance Module:**
- Complete compliance findings management
- AI-powered risk analysis
- Advanced reporting

**HR Module:**
- Recruitment workflow
- Performance management
- Learning & development

**Procurement Module:**
- Vendor evaluation
- Contract management
- Supplier portal

### 26.2 Medium-Term (3-6 Months)

**New Modules:**
- Fleet management
- Asset management
- Project management enhancements

**Platform Features:**
- Real-time collaboration
- Advanced search
- Custom dashboards

### 26.3 Long-Term (6-12 Months)

**Mobile App:**
- iOS and Android apps
- Offline support
- Push notifications

**Advanced Features:**
- AI-powered insights
- Workflow engine
- API ecosystem

**Infrastructure:**
- Microservices decomposition
- Data warehouse
- Advanced analytics

---
