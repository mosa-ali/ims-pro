# Architecture Decision Records (ADRs)
## Enterprise Finance Platform Decisions

**Version**: 1.0  
**Status**: Phase 1 Governance - Decision Log  
**Last Updated**: 2026-07-02  
**Owner**: Finance Architecture Board

---

## Purpose

Every major architectural decision is recorded here with rationale, status, and owner. This prevents "why did we do it this way?" confusion and enables reversals if needed.

**Format**: ADR-NNN | Title | Reason | Status | Owner | Date

---

## ADR Log

### ADR-001: Finance Orchestrator is Mandatory
**Title**: Central orchestrator coordinates all financial operations  
**Reason**: Prevent engine-to-engine coupling; single GL posting source; enable event routing; transaction atomicity  
**Alternatives Considered**: Distributed engines (rejected: GL duplication, circular dependencies); Message queue only (rejected: no orchestration, no transaction rollback)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 2 (FinanceOrchestratorEngine.ts)  
**Related**: FinanceArchitectureBlueprint.md, FinanceCodingStandards.md, ExecutiveDesignPrinciples.md (Principle 5: No Duplicate Logic)

---

### ADR-002: Event Bus is Source of Truth for Financial Events
**Title**: Every financial transaction is an immutable event  
**Reason**: Enable audit replay; prevent GL posting loss; timestamped permanent record; compliance requirement (audit trail)  
**Alternatives Considered**: Direct GL posting (rejected: no audit trail, no replay); Changelog table (rejected: eventual consistency issues)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 2 (DomainEventBus.ts, EventStore.ts)  
**Related**: FinanceArchitectureBlueprint.md, FinanceEventCatalog.md, ExecutiveDesignPrinciples.md (Principle 2: Event First)

---

### ADR-003: GL Entries are Immutable After Posting
**Title**: No edit of GL entries; corrections via reversals only  
**Reason**: Audit trail preservation; donor compliance (auditors require unchangeable GL); regulatory requirement (many countries)  
**Alternatives Considered**: Allow GL edit with change log (rejected: doesn't satisfy audit trail; can't prove original); Soft delete GL entries (rejected: violates GL accounting principle of permanence)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 3 (GL posting endpoints return immutable GL entry; edit attempts throw error)  
**Related**: FinanceDomainModel.md, ExecutiveDesignPrinciples.md (Principle 6: Immutable Ledger)

---

### ADR-004: GL Posting Happens at Payment, Not at Invoice
**Title**: Expenditure GL posting deferred until cash leaves bank  
**Reason**: Modified accrual accounting (standard for NGO); matches donor expectations; cash clarity; allows for invoice disputes (goods quality, pricing)  
**Alternatives Considered**: Post at GRN (rejected: goods may be rejected, GL entry would need reversal); Post at invoice (rejected: payment may be delayed due to dispute)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 2 (GL posting triggered by PaymentReleased event, not InvoiceApproved event)  
**Related**: HumanitarianFinanceOperatingModel.md, FinanceEventCatalog.md, FinanceCodingStandards.md

**Note**: This is standard NGO practice. Exception: GRN may trigger inventory GL posting (Debit 160 Inventory, Credit 510 Purchases) separate from expense posting.

---

### ADR-005: Budget Checking at Approval, Not at GL Posting
**Title**: Budget validation prevents PR approval (not GL posting)  
**Reason**: Budget is commitment-level; GL is recording-level; separation of concerns; prevents surprise GL post failures  
**Alternatives Considered**: Check budget at GL posting (rejected: late; PR already issued)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 2 (PurchaseRequestApprovalRoute checks budget; throws error if insufficient)  
**Related**: FinanceDomainModel.md, HumanitarianFinanceOperatingModel.md

---

### ADR-006: Multi-Org Isolation via organizationId + operatingUnitId
**Title**: Every financial operation scoped by (organizationId, operatingUnitId)  
**Reason**: Prevent data leakage between orgs; support multi-tenant SaaS model; regulatory isolation (data residency)  
**Alternatives Considered**: Row-level security in DB (rejected: insufficient; app layer is defense-in-depth); organizationId only (rejected: doesn't support regional structure)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 1 (all queries include WHERE organization_id = $orgId AND operating_unit_id = $ouId)  
**Related**: FinanceSecurityArchitecture.md, FinanceCodingStandards.md, ExecutiveDesignPrinciples.md (Principle 11: Multi-Organization)

---

### ADR-007: GL Account Mapping is Configurable Per Donor
**Title**: GL accounts can be restricted or mapped per donor rule  
**Reason**: Donor compliance (e.g., USAID may require all costs in 401xx series)  
**Alternatives Considered**: Fixed GL chart (rejected: too inflexible); All costs in generic 600s (rejected: doesn't satisfy donor segregation requirements)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 7 (Rule Engine applies donor GL mapping rules at GL posting)  
**Related**: FinanceReferenceArchitecture.md, DonorComplianceFramework.md

---

### ADR-008: Three-Way Matching Before Payment Release
**Title**: PO, GRN, and Invoice must match before payment  
**Reason**: Fraud prevention; supplier error detection; cost control; donor compliance (most donors require)  
**Alternatives Considered**: Two-way matching (PO ↔ GRN) then pay (rejected: invoice disputes miss detection)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 4 (Procurement validates match before releasing payment event)  
**Related**: FinanceIntegrationStandards.md, HumanitarianFinanceOperatingModel.md

---

### ADR-009: Advance Liquidation is Mandatory
**Title**: Advances must be liquidated (closed) within 45 days or flagged as risk  
**Reason**: Prevent orphaned payables; cash control; donor compliance (some donors disallow)  
**Alternatives Considered**: No liquidation (rejected: unbounded payables)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 5 (Risk Engine flags advances >45 days old; Finance Orchestrator prevents new advances if prior advance not liquidated)  
**Related**: FinanceDomainModel.md, ExecutiveDesignPrinciples.md (Principle 4: Human Approval)

---

### ADR-010: FX Variance is Explicitly Tracked
**Title**: Currency conversion gains/losses recorded in GL 730/740  
**Reason**: Donor compliance (donors ask "why is our USD grant different in KES equivalent?"); accurate financial reporting; audit trail  
**Alternatives Considered**: Ignore FX (rejected: doesn't reflect economic reality)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 2 (FX Engine calculates variance; GL post includes 730/740 entries)  
**Related**: FinanceDomainModel.md, FinanceIntegrationStandards.md

---

### ADR-011: Knowledge Graph Models Donor→Grant→Project→Budget→GL
**Title**: Semantic model enables AI reasoning across financial entities  
**Reason**: Enable AI agents to understand relationships (which grants fund which projects); enable compliance checking (is activity allowed by donor); enable impact reporting (which donors funded which outcomes)  
**Alternatives Considered**: Flat relational model (rejected: AI can't reason across relationships)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 8 (Knowledge Graph built from GL + Budget + Event data)  
**Related**: FinanceAIArchitecture.md, FinanceDomainModel.md, ExecutiveDesignPrinciples.md (Principle 3: AI Native)

---

### ADR-012: AI Recommends; Humans Approve
**Title**: AI never commits financial transactions; all approval requires human sign-off  
**Reason**: Regulatory requirement (NGOs are liable for fraud); donor requirement (no unauthorized spend); risk management (AI can hallucinate)  
**Alternatives Considered**: Full automation (rejected: regulatory violation); No AI (rejected: lost intelligence opportunity)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 10 (AI agents generate recommendations; workflow requires human approval before posting)  
**Related**: FinanceAIArchitecture.md, ExecutiveDesignPrinciples.md (Principle 4: Human Approval)

---

### ADR-013: Backward Compatibility is Non-Negotiable
**Title**: New phases never break existing functionality; old APIs versioned  
**Reason**: Production system is live; existing users must not experience outages  
**Alternatives Considered**: Greenfield rewrite (rejected: 6+ month downtime)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 2+ (migration strategy includes bridge, dual-mode, deprecation, removal cycle)  
**Related**: MigrationStrategy.md, ExecutiveDesignPrinciples.md (Principle 9: Backward Compatible)

---

### ADR-014: Soft Delete for All Financial Records
**Title**: No hard deletion of GL entries, budgets, or grants; deleted records marked as archived  
**Reason**: Audit trail integrity; donor audit often requires historical data 10+ years later; regulatory requirement  
**Alternatives Considered**: Hard delete (rejected: audit trail loss)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 2+ (all financial tables include is_deleted boolean; queries filter WHERE is_deleted = false)  
**Related**: FinanceSecurityArchitecture.md, FinanceCodingStandards.md

---

### ADR-015: Idempotent Operations for Safe Retry
**Title**: All tRPC mutations are idempotent; same request repeated = same result  
**Reason**: Network errors may cause duplicate request; ensure GL posting doesn't double-post  
**Alternatives Considered**: Single-attempt (rejected: network failures cause data loss)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 2 (all mutations use idempotency key; GL posting checks key before posting)  
**Related**: FinanceCodingStandards.md, FinanceAPIStandards.md

---

### ADR-016: Saga Pattern for Cross-Engine Atomicity
**Title**: Multi-step financial transactions use saga (orchestrator coordinates with rollback)  
**Reason**: Ensure consistency across modules (Procurement, Finance, Budget); prevent partial GL posts; enable recovery  
**Alternatives Considered**: Distributed transaction (rejected: not available in async system)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 2 (FinanceOrchestrator.executeSaga() ensures all-or-nothing semantics)  
**Related**: FinanceArchitectureBlueprint.md, FinanceCodingStandards.md

---

### ADR-017: No Hardcoded Business Rules
**Title**: Donor compliance rules stored in database as JSON; zero code recompilation  
**Reason**: Enable rapid rule changes (new donor, new compliance requirement); eliminate code deploy friction  
**Alternatives Considered**: Hardcoded thresholds in code (rejected: slow to change; high risk of bugs)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 7 (Rule Engine interprets rules table; compliance checks happen at runtime)  
**Related**: FinanceReferenceArchitecture.md, DonorComplianceFramework.md

---

### ADR-018: Performance SLA: GL Posting <200ms
**Title**: GL posting latency target is <200ms (P95)  
**Reason**: User-facing operation; slow GL posting blocks payment workflow  
**Alternatives Considered**: Async GL posting (rejected: user doesn't know if GL posted until later; compliance issue)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 3 (performance testing, indexing, caching optimized to meet SLA)  
**Related**: FinancePerformanceArchitecture.md

---

### ADR-019: Dashboard Load <2s, Reports <5min
**Title**: Dashboard interactive performance <2s; report generation <5min  
**Reason**: User experience (dashboard is high-frequency check); reporting deadline (donors often need reports same day)  
**Alternatives Considered**: Async reporting (rejected: users need real-time view)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 6 (caching, materialized views, query optimization)  
**Related**: FinancePerformanceArchitecture.md

---

### ADR-020: Encryption In-Transit and At-Rest
**Title**: All financial data encrypted in transit (TLS) and at rest (DB encryption)  
**Reason**: Regulatory requirement (GDPR, data residency); donor requirement (many want encryption); security best practice  
**Alternatives Considered**: Encryption in-transit only (rejected: data at rest vulnerable); no encryption (rejected: regulatory violation)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 2+ (TLS enforced; MySQL encryption at rest enabled)  
**Related**: FinanceSecurityArchitecture.md, ExecutiveDesignPrinciples.md (Principle 7: Security by Default)

---

### ADR-021: Audit Trail Immutable and Tamper-Evident
**Title**: Audit logs cannot be edited or deleted; integrity checked via cryptographic hash  
**Reason**: Donor audit requirement; regulatory (some countries require tamper-evident logs); fraud detection  
**Alternatives Considered**: Editable logs (rejected: fraud risk); Deletion with backup (rejected: insufficient for audit)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 2 (audit table append-only; no UPDATE/DELETE; hash chain validates integrity)  
**Related**: FinanceSecurityArchitecture.md, ExecutiveDesignPrinciples.md (Principle 6: Immutable Ledger)

---

### ADR-022: Segregation of Duties Enforced
**Title**: Single user cannot create AND approve AND post AND reconcile same transaction  
**Reason**: Fraud prevention; audit requirement; regulatory (Sarbanes-Oxley, COSO framework)  
**Alternatives Considered**: Honor system (rejected: insufficient)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 2 (tRPC procedures include role checks; GL posting requires different user than approval)  
**Related**: FinanceSecurityArchitecture.md, FinanceCodingStandards.md

---

### ADR-023: Org Can Choose Cash vs. Accrual Accounting
**Title**: Support both pure cash and modified accrual per org setting  
**Reason**: Local NGOs need cash accounting (simpler); larger INGOs need accrual (donors require); one platform supports all  
**Alternatives Considered**: Force accrual (rejected: too complex for small orgs); force cash (rejected: doesn't reflect accrual reality)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 3 (GL posting logic conditional on org.accountingModel setting)  
**Related**: HumanitarianFinanceOperatingModel.md, FinanceCapabilityMap.md

---

### ADR-024: Donor Traceability is Built-In
**Title**: Every GL entry traces back to a grant and donor  
**Reason**: Donor compliance (donors require audit trail to their grant); impact reporting (which grants funded which outcomes); risk assessment (which donors have issues)  
**Alternatives Considered**: Optional traceability (rejected: creates gaps)  
**Status**: ✅ Approved  
**Owner**: Finance Architecture Board  
**Date**: 2026-06-28  
**Implementation**: Phase 2 (GL posting always includes grant_id and donor_id; reporting filters by donor)  
**Related**: ExecutiveDesignPrinciples.md (Principle 12: Donor First), FinanceDomainModel.md

---

## How ADRs Are Managed

### Adding a New ADR
1. **Propose**: New ADR title + reason + alternatives considered
2. **Review**: Finance Architecture Board discusses (in thread)
3. **Approve**: Board votes; captured as ADR
4. **Implement**: Add to this document with date and owner
5. **Track**: Reference ADR in implementation code comments

### Reversing an ADR
1. **Propose**: Reason for reversal (new constraint, new tech, new requirement)
2. **Review**: Board discussion
3. **Approve**: Board votes to reverse
4. **Document**: Mark as "Superseded by ADR-XXX", don't delete original
5. **Migrate**: Plan migration from old decision to new (impact assessment)

### Example ADR Reversal

**Original**:
```
ADR-003: GL Entries are Immutable After Posting
Status: ✅ Approved
```

**New ADR (supersedes ADR-003)**:
```
ADR-025: GL Entries Immutable Except for Audit Adjustments
Status: ✅ Approved
Supersedes: ADR-003
Reason: Auditors need ability to post corrections after audit; immutability was too strict
```

---

## Related Documents
- **ExecutiveDesignPrinciples.md**: High-level principles; ADRs implement these
- **ArchitectureComplianceChecklist.md**: ADRs are validation criteria in code review
- **ClaudeFinanceDevelopmentStandard.md**: ADRs are non-negotiable rules for Claude

---

**Every decision is recorded. Every ADR is non-negotiable unless formally reversed.**
