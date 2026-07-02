Request for IMS Enterprise Architecture & Development Guide
Objective

As we continue the modernization of the IMS platform, we want to ensure that all future development fully aligns with the original architecture and design principles established by the Manus team.

The Finance modernization has reached an advanced stage, and additional platform capabilities will continue to be implemented.

To avoid architectural drift and ensure consistency across all modules, we request a comprehensive technical document describing the existing IMS architecture, development standards, governance, and platform conventions.

This document will become the authoritative reference for all future development.

1. Overall System Architecture

Please explain the complete architecture of the IMS platform.

Include:

overall architectural style
layered architecture
domain boundaries
module interactions
application flow
backend architecture
frontend architecture
shared libraries
common services
infrastructure services

Provide diagrams where possible.

2. Platform Philosophy

Please explain the original design philosophy.

Examples:

why the architecture was chosen
core design principles
architectural goals
scalability strategy
maintainability strategy
future roadmap assumptions
3. Organization & Operating Unit Isolation

This is one of the most important topics.

Please explain in detail:

How multi-tenancy works.

Specifically explain:

Organization model
Operating Unit model
Relationship between them
Data ownership
Data visibility
Cross-organization rules
Cross-operating-unit rules

Explain:

When should data be filtered by

organizationId

only,

and when should it be filtered by

organizationId
operatingUnitId

Provide examples.

4. Scope Architecture

Explain in detail:

ctx.scope

Including:

how it is populated
authentication flow
authorization flow
middleware flow
security implications
lifecycle
best practices

Please explain every property available inside

ctx.scope
5. Procedure Types

Explain all procedure types.

For example:

publicProcedure

protectedProcedure

scopedProcedure

adminProcedure

platformProcedure

Explain:

purpose
security model
when to use
when NOT to use
examples

Please include a decision matrix.

Example:

Scenario	Procedure
Public page	publicProcedure
Authenticated user	protectedProcedure
Organization data	scopedProcedure
Platform administration	platformProcedure
Super Admin	adminProcedure
6. Repository Architecture

Please explain:

repository pattern
repository responsibilities
service responsibilities
engine responsibilities
router responsibilities

Expected layering:

Router

↓

Service

↓

Engine

↓

Repository

↓

Database

Is this correct?

If not, please explain the intended layering.

7. Database Governance

Explain:

approved schema
schema ownership
migration strategy
naming conventions
enum strategy
soft delete strategy
indexing strategy
relationship strategy

Please explain:

How should developers propose schema changes?

8. Shared Services

Please identify every shared platform service.

Examples:

Audit
Authentication
Authorization
Notifications
File Storage
Documents
Translation
Logging
Configuration
Validation
Events
Scheduling
Background Jobs
Search
Import / Export

Please explain:

purpose
location
how to reuse them
9. Existing Platform Utilities

Please list reusable utilities already available.

Examples:

date utilities
currency utilities
exchange rate utilities
PDF generation
Excel generation
file upload
validation
formatting
localization
permissions

We want to maximize reuse instead of rebuilding functionality.

10. Security Architecture

Please explain:

authentication
authorization
RBAC
permission inheritance
organization isolation
operating unit isolation
audit logging
API protection
11. Frontend Architecture

Explain:

routing
layouts
reusable components
component hierarchy
hooks
providers
contexts
localization
RTL support
theming
12. Backend Architecture

Explain:

routers
services
repositories
engines
validators
middleware
shared libraries
13. Coding Standards

Please provide:

naming conventions
file naming
folder organization
TypeScript conventions
React conventions
Drizzle conventions
tRPC conventions
14. Existing Design Patterns

Please explain the patterns already used.

Examples:

Repository
Factory
Strategy
Adapter
Builder
Observer
Dependency Injection
CQRS
Event-driven
Saga
Domain Services

We want to follow the existing patterns rather than introducing new ones.

15. Performance Strategy

Explain:

caching
lazy loading
pagination
indexing
batching
background jobs
query optimization
16. Translation Architecture

Please explain:

translation files
namespaces
key naming
RTL
adding new languages
fallback strategy
17. Reporting Architecture

Explain:

report generation
PDF generation
Excel generation
export architecture
print architecture
18. Document Management

Explain:

attachments
file storage
versioning
document lifecycle
19. AI Readiness

If already planned:

Please explain:

AI architecture
future AI integration
agent integration
workflow automation
MCP readiness
orchestration plans
20. Event Architecture

If already implemented or planned:

Explain:

events
subscribers
publishers
event naming
event versioning
21. Background Jobs

Explain:

schedulers
cron jobs
queues
retry strategy
22. Testing Strategy

Please explain:

unit testing
integration testing
repository testing
UI testing
regression testing
23. Recommended Development Workflow

Please explain the expected workflow.

Example:

Read Architecture

↓

Read Schema

↓

Search Existing Code

↓

Reuse Existing Services

↓

Implement

↓

Test

↓

Document

↓

Review

↓

Merge
24. Common Mistakes to Avoid

Please list:

architectural mistakes
security mistakes
repository mistakes
performance mistakes
common anti-patterns
25. Knowledge That Exists Only in the Manus Team

Please document anything that:

is not obvious from the code,
is not documented,
influences future development,
should be known before implementing new modules.

Examples:

hidden conventions
architectural assumptions
reusable platform services
future platform direction
planned refactoring
technical debt
intentional design decisions
26. Future Roadmap

Please explain the long-term vision for the IMS platform beyond Finance.

Include recommendations for:

HR
Procurement
Logistics
Fleet
Projects
MEAL
Compliance
Risk
Executive Dashboard
AI
Reporting
Workflow
Mobile
Offline support
API ecosystem
External integrations
27. Deliverables

Please provide:

IMS Enterprise Architecture Guide.
IMS Development Standards.
IMS Governance Guide.
IMS Security & Multi-Tenant Architecture.
Repository & Service Development Guide.
Frontend Development Guide.
Backend Development Guide.
Platform Services Catalog.
Reusable Components Catalog.
Common Utilities Catalog.
Coding Standards.
Architecture Decision Guide.
Future Platform Roadmap.
Development Do's and Don'ts.
Any additional knowledge that would help future developers work consistently with the original architecture.
Final Request

This document will become the official reference for all future development across the IMS platform—not only Finance. Please document the platform as if a new senior engineering team needed to maintain and extend it for the next 5–10 years, without relying on undocumented institutional knowledge.

The goal is to ensure that every future enhancement remains consistent with the original architecture, maximizes reuse of existing platform capabilities, preserves the multi-tenant design (organizationId / operatingUnitId), correctly applies publicProcedure, protectedProcedure, scopedProcedure, and any other procedure types, and avoids architectural drift as the platform continues to evolve.