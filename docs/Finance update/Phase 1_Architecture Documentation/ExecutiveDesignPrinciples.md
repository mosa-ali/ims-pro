# Executive Design Principles
## The Constitution of the Finance Platform

**Version**: 1.0  
**Status**: Phase 1 Governance - Final Approval  
**Last Updated**: 2026-07-02  
**Owner**: Finance Architecture Board

---

## The 12 Principles

### 1. **Single Source of Truth**
One entity, one state, one representation. No duplicate business logic. No shadow ledgers. Every financial fact exists once, referenced everywhere. When you query cash position, you get the same answer everywhere.

### 2. **Event First**
Every financial transaction is an event. Events are immutable. The event log is the permanent record. GL posting, budget updates, risk assessment—all triggered by events, never direct updates. Events enable audit, replay, and Intelligence.

### 3. **AI Native**
Finance is data that machines can understand. Knowledge Graph models relationships (Grant→Project→Activity→Budget→Vendor→Invoice→GL). Agents reason over this data (Treasury Agent, Budget Agent, Compliance Agent). Humans make final decisions.

### 4. **Human Approval**
All financial commitments require human approval. GL posting is automatic (post-event). But commitment (PO, Payment, Budget reallocation) requires human authority. AI recommends; humans approve.

### 5. **No Duplicate Logic**
If business logic exists, it exists once. GL posting logic: one place. Budget balance calculation: one place. Compliance validation: one place. Reuse, don't repeat. Refactor duplicates immediately.

### 6. **Immutable Ledger**
GL entries are immutable after posting. Corrections are reversals, never edits. Journal entries link to source events. Change history is permanent (audit trail). This is non-negotiable for donor compliance.

### 7. **Security by Default**
Every endpoint authenticated and authorized. Multi-org isolation (organizationId, operatingUnitId) on every operation. Encryption in-transit and at-rest. Audit trail logged before data is visible. No "security later."

### 8. **Performance by Design**
Response time budgets: GL post <200ms, Dashboard <2s, Reports <5min. Query optimization upfront (indexes, caching, materialized views). Load test before deployment. No "we'll optimize later."

### 9. **Backward Compatible**
New phases don't break existing functionality. Old data is never deleted (soft delete). Old APIs versioned. Old integrations continue working. Migration is gradual (bridge, dual-mode, deprecation, removal).

### 10. **Cloud Ready**
No local file dependencies. No single-server assumptions. Stateless services. Database as source of truth. Idempotent operations (safe to retry). Ready for Kubernetes, auto-scaling, multi-region.

### 11. **Multi-Organization**
Finance module serves heterogeneous org types (INGO, regional, local NGO). Orgs operate under different accounting models (cash vs. accrual), different approval authorities, different donor compliance rules. One platform, many operating models.

### 12. **Donor First**
All financial decisions are traceable to donor grants. Budget hierarchy → Grant. GL posting → Activity → Grant. Every dollar is donor-attributed. Reporting filters by donor. Risk assessment includes donor compliance. Donor rules override org rules.

---

## How We Use These Principles

### For Architecture Decisions
**Decision**: Should we store GL posting in cache?  
**Principle**: Single Source of Truth + Immutable Ledger  
**Answer**: No. GL entry posted once to database, cached only for read performance, never modified from cache.

### For Code Review
**PR**: Adds new GL posting logic in PaymentService  
**Principle**: No Duplicate Logic  
**Action**: Reject. GL posting logic must centralize in FinanceOrchestrator, not scatter.

### For Feature Requests
**Request**: "Add quick override button to change GL account on posted entry"  
**Principle**: Immutable Ledger + Human Approval  
**Answer**: No. Propose reversal workflow instead (new event, approval, new GL entry).

### For Performance Issues
**Problem**: Dashboard slow  
**Principle**: Performance by Design  
**Action**: Add caching + indexes; measure against SLA; deploy before going live.

### For Multi-Org Issues
**Issue**: Local NGO complains accounting model doesn't match their manual process  
**Principle**: Multi-Organization  
**Action**: Support cash accounting option; don't force accrual.

### For Security Concerns
**Issue**: Can staff in Kenya see salary data from Uganda office?  
**Principle**: Security by Default  
**Action**: Enforce operatingUnitId filter; audit trail logs access; lock down immediately.

---

## Non-Negotiable Constraints

These principles are **non-negotiable**:

- ✅ **Immutable Ledger**: No exceptions. GL entries never edited.
- ✅ **Human Approval**: Every commitment requires approval. AI recommends; humans decide.
- ✅ **Single Source of Truth**: No shadow ledgers. No duplicate data.
- ✅ **Multi-Org Isolation**: Every operation scoped by organizationId + operatingUnitId.
- ✅ **Audit Trail**: Every change logged with who, what, when, why.
- ✅ **Donor Traceability**: Every dollar linked to a grant.

**If a feature violates these, the feature is rejected, not the principle.**

---

## How Principles Enable Donor Compliance

| Principle | Donor Compliance Outcome |
|-----------|------------------------|
| Single Source of Truth | Consistent financial statements across reports |
| Immutable Ledger | Audit trail satisfies auditors; GL is permanent record |
| Event First | Replay transactions for audit; prove GL correctness |
| Multi-Organization | Support different orgs' different donors |
| Donor First | Trace every dollar; compliance by design |
| Security by Default | PII protected; segregation of duties enforced |
| Human Approval | Authorization preserved; no unauthorized posts |
| AI Native | Risk detected automatically; compliance violations flagged |

---

## Related Documents

- **ArchitectureDecisionRecords.md**: How principles inform decisions
- **ArchitectureComplianceChecklist.md**: How code adheres to principles
- **ClaudeFinanceDevelopmentStandard.md**: How developers implement principles
- **EnterpriseFinanceDictionary.md**: Shared terminology to support principles

---

**This is the constitution. Everything else is implementation detail.**
