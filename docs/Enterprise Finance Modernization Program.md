Enterprise Finance Modernization Program
Master Objective

You are enhancing an existing enterprise Financial Management System within an Integrated Management System (IMS) designed for international NGOs, humanitarian organizations, UN agencies, and development partners.

This is NOT a rewrite.

This is an enterprise modernization program.

The existing architecture already contains mature finance engines, repositories, services, TRPC routers, UI pages, reports, dashboards, and integrations.

The objective is to elevate the platform into a world-class AI-native Humanitarian Financial Operating System while preserving all existing functionality.

Global Rules (Apply to Every Phase)

These rules apply to every phase without exception.

Preserve Existing Functionality
Never remove existing features.
Never simplify existing business logic.
Never replace working components unnecessarily.
Extend existing engines instead of rewriting them.
Backward Compatibility

Maintain compatibility with:

Existing database schema
Existing APIs
Existing TRPC procedures
Existing repositories
Existing UI
Existing reports
Existing permissions
Existing translations
Code Quality

All new code must:

Follow existing architecture
Be modular
Be strongly typed
Be testable
Be reusable
Avoid duplicated logic
Use dependency injection where appropriate
Documentation

Every phase must include:

Architecture notes
Design decisions
Integration notes
Testing checklist
Migration notes
Phase 1 – Enterprise Architecture Foundation
Objective

Review the entire finance architecture and establish a unified enterprise foundation without changing business behavior.

Tasks
Review every finance engine.
Identify duplicated logic.
Identify missing abstractions.
Standardize interfaces.
Standardize naming.
Create dependency diagram.
Create engine interaction diagram.
Identify circular dependencies.
Document current architecture.
Document target architecture.
Deliverable Files
FinanceArchitectureBlueprint.md

FinanceEngineDependencyMap.md

FinanceModernizationRoadmap.md

FinanceCodingStandards.md

FinanceIntegrationStandards.md

FinanceEventCatalog.md

FinanceDomainModel.md

No functional changes.

Only architecture.

Phase 2 – Finance Orchestrator
Objective

Introduce a central orchestration layer.

Tasks

Design

FinanceOrchestratorEngine

Responsibilities

Receive financial events
Coordinate engines
Prevent duplicate processing
Transaction coordination
Error handling
Retry logic
Event logging
Audit publishing
Deliverable Files
FinanceOrchestratorEngine.ts

FinanceOrchestratorService.ts

FinanceOrchestratorEvents.ts

FinanceOrchestratorTypes.ts

FinanceOrchestratorTests.ts

Existing engines remain unchanged except minimal integration hooks.



Phase 3 – Enterprise Event Platform
Objective

Move finance to event-driven architecture.

Tasks

Implement

EventBus

FinancialEventPublisher

FinancialEventSubscriber

Event Registry

Dead Letter Queue

Retry Policy

Event Versioning

Deliverables
EventBus.ts

FinancialEvents.ts

FinancialEventPublisher.ts

FinancialEventSubscriber.ts

EventRegistry.ts

EventReplayService.ts

DeadLetterQueue.ts

FinancialEventTypes.ts
Phase 4 – General Ledger Modernization
Objective

Upgrade the General Ledger to enterprise level.

Tasks

Enhance:

GeneralLedgerEngine

FinanceEngine

Support:

Multi-dimensional accounting
Journal templates
Recurring journals
Reversals
Period closing
Soft close
Hard close
Allocation journals
Automatic accruals
Posting validation
Financial controls
Deliverables
GeneralLedgerEngine.ts

JournalTemplateEngine.ts

ClosingEngine.ts

JournalAllocationEngine.ts

AccrualEngine.ts

PostingValidationEngine.ts

GLIntegrationTests.ts



Phase 5 – Budget Intelligence
Objective

Modernize budgeting.

Tasks

Enhance

BudgetEngine

Support

Multi-year budgets
Versioning
Scenario planning
Budget commitments
Obligations
Budget availability
AI forecasting
Burn-rate prediction
Deliverables
BudgetEngine.ts

BudgetForecastEngine.ts

BudgetScenarioEngine.ts

BudgetCommitmentEngine.ts

BudgetAvailabilityEngine.ts

BudgetRulesEngine.ts





Additional Recommendation:

There is one thing I would ask you to do during every remaining phase.

At the end of each phase, produce a short document called:



SharedPlatformCandidates.md



It should contain only:



Components introduced in this phase.

Whether they are finance-specific or reusable.

Recommendation: "Keep in Finance" or "Extract in Phase 14."



For example:



Component	Decision

BudgetEngine	Stay in Finance

CashPlanningEngine	Stay in Finance

BudgetCalendarEngine	Candidate for Platform

UnifiedRulesCore	Candidate for Platform

EventPublisher	Candidate for Platform

ExportEngine	Candidate for Platform

NotificationService	Candidate for Platform





Phase 7 – Treasury Modernization
Objective

Enterprise Treasury.

Tasks

Enhance

TreasuryEngine

CashForecastEngine

LiquidityAnalysisEngine

FXGainLossEngine

CurrencyEngine

Support

Cash pooling
Liquidity optimization
Multi-bank
FX exposure
Treasury dashboard
Payment optimization
Bank hierarchy
Deliverables
TreasuryEngine.ts

CashForecastEngine.ts

LiquidityAnalysisEngine.ts

TreasuryDashboardEngine.ts

CashPoolingEngine.ts

FXExposureEngine.ts

PaymentOptimizationEngine.ts



let me know if you need any exists files, routers and engines.






Phase 8 – Financial Intelligence
Objective

Transform finance into decision intelligence.

Tasks

Enhance

FinancialHealthEngine

FinancialRiskEngine

KPIEngine

ForecastingEngine

Support

Predictive analytics
Executive scoring
Trend analysis
Root cause analysis
Risk forecasting
Organizational health
Deliverables
FinancialHealthEngine.ts

FinancialRiskEngine.ts

ForecastingEngine.ts

KPIEngine.ts

DecisionEngine.ts

FinancialIntelligenceEngine.ts



let me know if you need any exists files, routers and engines.




Phase 8 – AI Platform
Objective

Create enterprise AI.

Tasks

Enhance

AIExecutiveEngine

Add

Agent framework

Natural language analysis

Recommendations

Executive briefings

Conversation memory

Cross-engine reasoning

Deliverables
AIExecutiveEngine.ts

FinanceAIAgent.ts

BudgetAIAgent.ts

TreasuryAIAgent.ts

ComplianceAIAgent.ts

RiskAIAgent.ts

ExecutiveBriefingEngine.ts



let me know if you need any exists files, routers and engines.




Phase 9 – Compliance \& Governance
Objective

Enterprise governance.

Tasks

Enhance

Compliance

Workflow

Audit

Support

Donor rules
Policy engine
Segregation of duties
Audit automation
Exception monitoring
Deliverables
EnhancedComplianceEngine.ts

AuditEngine.ts

RuleEngine.ts

PolicyEngine.ts

GovernanceEngine.ts

WorkflowEngine.ts



let me know if you need any exists files, routers and engines.




Phase 10 – Enterprise Reporting
Objective

Modern reporting platform.

Tasks

Enhance

FinancialReportingEngine

FinancialStatementEngine

Support

Dynamic reports
Drill-down
Executive dashboards
AI narratives
Donor reporting
Interactive reports
Deliverables
FinancialReportingEngine.ts

FinancialStatementEngine.ts

ExecutiveDashboardEngine.ts

DonorReportingEngine.ts

InteractiveReportingEngine.ts

NarrativeEngine.ts



let me know if you need any exists files, routers and engines.




Phase 11 – Procure-to-Pay Modernization
Objective

Enterprise P2P lifecycle.

Tasks

Enhance

P2PPipelineEngine

Support

PR

↓

RFQ

↓

Evaluation

↓

Contract

↓

PO

↓

Shipment

↓

GRN

↓

Inspection

↓

Invoice

↓

Payment

↓

Journal

↓

Grant

↓

Asset

Track

Cycle time
Bottlenecks
SLA
Risk
AI recommendations
Deliverables
P2PPipelineEngine.ts

ProcurementAnalyticsEngine.ts

SupplierPerformanceEngine.ts

P2PRiskEngine.ts






Phase 13 – Digital Finance Platform
Objective

Implement next-generation capabilities.

Tasks

Create

Knowledge Graph
Digital Twin
Autonomous Finance
Scenario Planning
Decision Engine
Deliverables
KnowledgeGraphEngine.ts

DigitalTwinEngine.ts

ScenarioPlanningEngine.ts

DecisionEngine.ts

AutonomousFinanceEngine.ts

FinancialSimulationEngine.ts




Phase 14 – Integration \& Performance
Objective

Finalize enterprise readiness.

Tasks
Performance optimization
Caching
Event optimization
Security review
Load testing
Documentation
Architecture validation
Deliverables
PerformanceOptimization.md

SecurityReview.md

ArchitectureValidation.md

FinancePerformanceTests.ts

FinanceIntegrationTests.ts

FinanceRegressionTests.ts









Phase 15 — Enterprise Platform Consolidation



Purpose: extract common capabilities into reusable platform services.



Include:



Enterprise Event Platform

Enterprise Workflow/Saga Platform

Enterprise Reporting \& Export Platform

Enterprise Notification Platform

Enterprise Rules Platform

Enterprise AI Platform

Enterprise Analytics Platform

Enterprise Knowledge Graph Platform



Also include:



WorkflowSagaOrchestrator

parallel step execution

reusable workflow engine interfaces

shared platform candidates extraction

module adapters for Finance, HR, Procurement, Logistics, Projects, MEAL, Compliance





This becomes the phase where all common capabilities are extracted into reusable platform services.



Examples:



Enterprise Event Platform



Shared by:



Finance

HR

Procurement

Logistics

Projects

MEAL

Enterprise Workflow Platform



Shared by:



Finance

Procurement

HR

Assets

Compliance

Enterprise Export Platform



Shared by:



Every report

Every dashboard

Every module



Supporting:



Excel (.xlsx)

PDF

Word

PowerPoint

Scheduled delivery

Email distribution

Audit history

Enterprise Notification Platform



Shared by:



Email

Teams

Slack

WhatsApp

SMS

Mobile Push

Enterprise Rules Platform



Shared by:



Finance

Budget

Procurement

HR

Logistics

MEAL

Enterprise AI Platform



Shared by:



Finance AI

HR AI

Procurement AI

Executive AI

Program AI

Enterprise Analytics Platform



Shared by:



Dashboards

KPIs

Executive reporting

AI

Forecasting

Enterprise Reporting Platform



Shared by:



Financial Reports

HR Reports

Logistics Reports

Procurement Reports

MEAL Reports

Donor Reports







Recommendation 1: Parallel Step Execution ★★★★★

The current orchestrator executes steps sequentially. The enhancement would add an executionMode field to SagaStepDefinition:

typescript// Current: all steps run A → B → C → D

// Enhanced: support parallel branches



executionMode: 'sequential' | 'parallel' | 'conditional';



// Example: after matching completes, grant charge and knowledge graph

// update can run simultaneously — they don't depend on each other

This is a clean extension to the existing SagaStepDefinition type — no breaking changes. The saga executor would group parallel steps and Promise.all() them, then rejoin at the next sequential step. Compensation would still run in reverse order.

Recommendation 2: Visual Workflow Designer ★★★★★

Workflows configured via drag-and-drop UI, stored as JSON, executed by the saga engine. This is the natural evolution: move workflow definitions from TypeScript code to database-stored JSON that non-developers can edit.

Workflow Designer (React UI)

&#x20; → JSON workflow definition (stored in DB)

&#x20; → WorkflowSagaOrchestrator.loadFromJSON(definition)

&#x20; → Execution with full visibility

This aligns with the platform extraction plan — once the orchestrator is in shared/platform/workflow/, any module can define workflows visually.

Both Are Recorded for Phase 15 (Platform Consolidation)

Neither blocks current work. They're enhancement layers on top of the delivered orchestrator.





Phase 15: Platform Automation





Phase 16

Main recommendations



Not blockers, but useful next improvements:



Connect to real repositories instead of sample values. The architecture is ready; implementation should later pull real treasury, budget, grant, procurement, asset, risk, and GL data.

Add AI Platform integration so narratives and decisions can use the approved Enterprise AI Gateway, not direct AI calls.

Add event-driven refresh so the Digital Twin updates after events such as payment posted, grant updated, budget revised, PO approved, asset created, or risk escalated.

Add approval workflow integration so autonomous actions create formal workflow tasks rather than only changing action status.

Add scope enforcement in routers when this is exposed through tRPC: all calls must use scopedProcedure and derive organizationId / operatingUnitId from ctx.scope.








Expected Output for Every Phase

Claude must always produce the following before implementing any code:

Current State Assessment – What exists today, strengths, weaknesses, and dependencies.
Design Proposal – How the phase improves the architecture without breaking existing functionality.
Implementation Plan – Step-by-step tasks, sequencing, and dependencies.
Files to Modify – Existing files that will change, with a brief explanation for each.
New Files to Create – Exact filenames and their responsibilities.
Database Impact – Whether schema changes are required; if so, provide backward-compatible migrations only.
Integration Points – How the phase connects to existing engines, repositories, TRPC routers, and UI.
Testing Strategy – Unit, integration, regression, and performance tests required.
Completion Checklist – A clear list of acceptance criteria that must all be satisfied before the phase is considered complete.
Final Recommendation

I would also add a Phase 0 – Comprehensive Assessment before any implementation begins. In that phase, Claude should inspect every finance engine, repository, router, schema, UI page, and report, then produce a detailed modernization report identifying gaps, duplication, technical debt, dependencies, and priorities. That assessment becomes the baseline for all subsequent phases and significantly reduces the risk of architectural inconsistencies during implementation.

