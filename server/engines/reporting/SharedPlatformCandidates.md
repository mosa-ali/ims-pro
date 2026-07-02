# SharedPlatformCandidates.md — Phase 10 Enhanced

Components introduced in Phase 10 Enhanced (10 recommendations).

---

## Phase 10 Enhanced Components

| Component | Domain | Decision | Rationale |
|-----------|--------|----------|-----------|
| **SemanticModelEngine** | Platform | **Extract to Platform** ★★★★★ | Canonical business concept definitions consumed by ALL modules. Finance defines "Available Budget"; HR defines "Vacancy Rate"; Procurement defines "Lead Time." One engine, shared definitions. |
| **UniversalReportMetadata** | Platform | **Extract to Platform** ★★★★★ | Every report across every module carries identical immutable metadata. Not finance-specific. |
| **ReportCatalogEngine** | Platform | **Extract to Platform** ★★★★★ | Centralized registry for all reports — Finance, HR, Procurement, MEAL. Replaces scattered definitions. |
| **KPIDictionaryEngine** | Platform | **Extract to Platform** ★★★★★ | Shared KPI formulas and thresholds. Finance KPIs, HR KPIs, Procurement KPIs all in one dictionary. |
| **CrossModuleReportEngine** | Platform | **Extract to Platform** ★★★★★ | By definition cross-module — the entire point is unifying data from multiple domains. |
| **ExecutiveStorytellingEngine** | Platform | **Candidate for Platform** ★★★★ | The briefing *framework* (sections, items, storytelling structure) is reusable. Finance-specific *content generation* stays in Finance. |
| **ScenarioReportingEngine** | Platform | **Candidate for Platform** ★★★★ | Multi-scenario comparison pattern applies to HR planning, procurement pipeline, project budgets — not only finance. |
| **DataLineageEngine** | Platform | **Extract to Platform** ★★★★★ | Value-to-source tracing is needed everywhere: Procurement (PO → invoice → payment), HR (payroll → GL), MEAL (indicator → survey → data). |
| **ExplainableReportingEngine** | Platform | **Extract to Platform** ★★★★★ | Click-to-explain is a generic capability. Every module's reports benefit from formula/source/filter transparency. |
| **AIReportAssistantEngine** | Platform | **Extract to Platform** ★★★★★ | Conversational Q&A applies to all modules. The AI uses the SemanticModel + KPIDictionary which are already platform services. |

---

## Summary: Phase 10 Enhanced has 10/10 Platform candidates

This is the first phase where EVERY component is a platform service rather than a finance-specific engine. This validates Mosa's observation that the reporting layer has evolved beyond finance into an enterprise-wide platform.

## Recommended extraction order for Phase 14

1. **SemanticModelEngine** — foundation for all other engines
2. **KPIDictionaryEngine** — depends on SemanticModel
3. **DataLineageEngine** — standalone, no dependencies
4. **ExplainableReportingEngine** — depends on DataLineage
5. **UniversalReportMetadata** — standalone utility
6. **ReportCatalogEngine** — extends existing ReportRegistry
7. **CrossModuleReportEngine** — depends on Semantic + providers
8. **ScenarioReportingEngine** — depends on data providers
9. **ExecutiveStorytellingEngine** — depends on Semantic
10. **AIReportAssistantEngine** — depends on Semantic + Lineage + KPI
