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
Phase 6 – Treasury Modernization
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
Phase 7 – Financial Intelligence
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
Phase 9 – Compliance & Governance
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
Phase 12 – Digital Finance Platform
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
Phase 13 – Integration & Performance
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