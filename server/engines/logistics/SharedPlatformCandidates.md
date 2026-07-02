# SharedPlatformCandidates.md — P2P Workflow Orchestrator

---

## Component

| Component | Domain | Decision | Rationale |
|-----------|--------|----------|-----------|
| **P2PWorkflowOrchestrator** | Platform | **Extract to Platform** ★★★★★ | The saga orchestration pattern — event-triggered, sequential steps with retry/compensation, end-to-end visibility — is entirely generic. HR onboarding, grant lifecycle, project milestones, and compliance workflows all need the same capability. Only the saga definitions and step executors are domain-specific. |

## What Extracts vs What Stays

| Extract to Platform | Stays in Procurement |
|---------------------|---------------------|
| Saga execution engine (step sequencing, retry, compensation) | Saga definitions (`grn_to_payment`, `invoice_matching`) |
| `IP2PStepExecutor` interface (rename to `ISagaStepExecutor`) | Step executor implementations (adapters wrapping procurement engines) |
| `ISagaRepository` (saga persistence) | `ProcurementEventType` constants |
| Event publishing pattern | Pre-condition rules for procurement steps |
| Transaction visibility (timeline, active/failed saga queries) | |
| Retry/compensation framework | |

## Recommended Platform Name

```
WorkflowSagaOrchestrator
  ├── registerSaga(definition)        — any module defines sagas
  ├── registerExecutor(executor)      — any module provides step executors
  ├── subscribeToEvents()             — listens on EventBus
  ├── getTransactionView(entityId)    — end-to-end visibility
  ├── retrySaga(sagaId)               — manual intervention
  └── getFailedSagas()                — monitoring dashboard
```

Consumed by:
- **Procurement**: GRN→Payment, Invoice→Matching
- **Finance**: Period Close saga (trial balance → adjustments → close → reports)
- **HR**: Onboarding saga (contract → payroll setup → asset issuance → training)
- **Grants**: Award saga (agreement → budget → accounts → reporting setup)
- **Projects**: Closure saga (final report → financial reconciliation → asset disposal → archive)

## Cumulative Platform Extraction Summary (All Phases)

### Tier 1: Extract First (foundation services)
| Component | Phase |
|-----------|-------|
| EventBus + EventStore + DeadLetterQueue | Phase 3/3H |
| PlatformInterfaces (ILogger, IConfigService) | Phase 3H |
| UnifiedRulesCore | Phase 6 |
| **WorkflowSagaOrchestrator** | **P2P Orchestrator** |
| SemanticModelEngine | Phase 10E |

### Tier 2: Extract Second (reporting + validation)
| Component | Phase |
|-----------|-------|
| ValidationPluginSystem | Phase 4R |
| ApprovalWorkflowEngine | Phase 4R |
| ReportExportOrchestrator + ExcelExportEngine | Export |
| InteractiveReportingEngine | Phase 10 |
| DataLineageEngine | Phase 10E |
| KPIDictionaryEngine | Phase 10E |

### Tier 3: Extract Third (specialized services)
| Component | Phase |
|-----------|-------|
| ExportQueueEngine + ReportSchedulerEngine | Export+ |
| EnterpriseReportTemplateEngine | Export+ |
| NarrativeEngine | Phase 10 |
| ProcurementKnowledgeGraphEngine | Procurement |
| ContractLifecycleEngine | Procurement |
| AIReportAssistantEngine | Phase 10E |
