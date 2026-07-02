# Migration Strategy
## Safe Path from Current Architecture to Target Architecture

**Version**: 1.0  
**Status**: Phase 1 Governance - Migration Framework  
**Last Updated**: 2026-07-02  
**Owner**: Finance Architecture Board

---

## Overview

The finance system is live with 85% functionality already operational. Migration must be **zero-downtime**, **gradual**, and **reversible**.

**Current State**: 3 GL posting locations, 5+ circular dependencies, 20+ isolated engines  
**Target State**: 1 GL posting source (Orchestrator), 0 circular dependencies, event-driven  
**Path**: Bridge → Dual-Mode → Deprecation → Removal

---

## Phase Mapping

| Phase | Task | Duration | Downtime | Reversibility |
|-------|------|----------|----------|---------------|
| 2 | Build Orchestrator, Event Bus, Event Store (new) | 2 wks | 0 | Backward compatible |
| 3 | Bridge: Old GL → Orchestrator (both active) | 1 wk | 0 | Can rollback to old |
| 4 | Dual-Mode: Orchestrator primary, old secondary (validate) | 3 wks | 0 | Can revert to old if divergence |
| 5 | Deprecation: Stop using old GL post locations; log warnings | 2 wks | 0 | Can reactivate if needed |
| 6 | Removal: Delete old GL posting code (after 4-week grace) | 1 wk | 0 | Code in git history, can restore |

---

## Stage 1: Bridge (After Phase 2 Complete)
### Goal: Orchestrator ready; Old system still primary; Verify correctness

### Timeline: 1 week (Phases 3 + partial 4)

### Architecture Diagram

```
Old System (Active)          New System (Shadow)
GL Posting 1 ─────┐          /─ Orchestrator
GL Posting 2 ──┬──┴──→ API ──┤
GL Posting 3 ──┘              \─ Event Bus → Event Store
                
Data Flow: 
1. API call hits old system
2. Old system posts GL (locations 1, 2, or 3)
3. Orchestrator SHADOW posts same GL in parallel
4. Orchestrator result logged but NOT used
5. Compare: Old GL = Orchestrator GL? (validation)
```

### Implementation Details

**1. Create Bridge Adapter**

File: `/src/server/finance/migration/BridgeAdapter.ts`

```typescript
export class GLPostingBridge {
  async postGLBridged(
    journalEntry: JournalEntryInput,
    context: ScopeContext
  ): Promise<{ 
    status: 'ok' | 'error';
    oldResult: GLPostingResult;
    newResult: GLPostingResult;
    match: boolean;
  }> {
    // 1. Post via OLD system (current production code)
    const oldResult = await this.oldGLPostingService.post(journalEntry, context);
    
    // 2. Post via NEW system (Orchestrator) in shadow mode
    const newResult = await this.orchestrator.postGL(journalEntry, context);
    
    // 3. Compare results
    const match = this.compareGLEntries(oldResult.entry, newResult.entry);
    
    // 4. Log divergence if any
    if (!match) {
      await logger.error('GL_DIVERGENCE_DETECTED', {
        journalEntry,
        oldGL: oldResult.entry,
        newGL: newResult.entry,
      });
    }
    
    // 5. Return OLD result (system still primary)
    return {
      status: oldResult.status,
      oldResult,
      newResult,
      match,
    };
  }
}
```

**2. Metrics & Monitoring**

Track during bridge phase:
- GL divergence rate: target 0%
- Performance impact: old system latency <5% change
- Event bus throughput: >99% events processed

**3. Rollback Path**

If divergence detected:
1. Stop posting to new system (disable Orchestrator)
2. Keep logging divergence (find root cause)
3. Fix Orchestrator
4. Resume shadow posting

---

## Stage 2: Dual-Mode (After Bridge Validated)
### Goal: Orchestrator becomes primary; old system validates

### Timeline: 3 weeks (Phase 4)

### Architecture Diagram

```
New System (Active)          Old System (Shadow)
Orchestrator ─────┐          /─ GL Posting 1
Event Bus ────────┴──→ API ──┤─ GL Posting 2
Event Store                  \─ GL Posting 3
                
Data Flow:
1. API call hits Orchestrator
2. Orchestrator posts GL
3. Old system posts GL in parallel (shadow)
4. Compare: Orchestrator GL = Old GL? (validation)
5. If divergence, log but proceed with Orchestrator result
```

### Implementation Details

**1. Switch Primary/Secondary**

File: `/src/server/finance/migration/DualModeAdapter.ts`

```typescript
export class DualModeGLPosting {
  async postGLDualMode(
    journalEntry: JournalEntryInput,
    context: ScopeContext,
    mode: 'primary' | 'validate' = 'primary'
  ): Promise<{
    status: 'ok' | 'error';
    primary: GLPostingResult;
    secondary?: GLPostingResult;
    match?: boolean;
  }> {
    if (mode === 'primary') {
      // 1. Post via NEW system (Orchestrator) - PRIMARY
      const primary = await this.orchestrator.postGL(journalEntry, context);
      
      // 2. Validate against OLD system in background
      setImmediate(async () => {
        const secondary = await this.oldSystem.postGL(journalEntry, context);
        const match = this.compareGLEntries(primary.entry, secondary.entry);
        
        if (!match) {
          await logger.warn('GL_VALIDATION_DIVERGENCE', {
            journalEntry,
            orchestratorGL: primary.entry,
            oldGL: secondary.entry,
          });
        }
      });
      
      return { status: primary.status, primary };
    }
  }
}
```

**2. Gradual Traffic Shift**

```
Week 1: 100% old, 1% new shadow
Week 2: 95% old, 5% new + validate
Week 3: 50% old, 50% new validate
Week 4: 100% new, 10% old shadow
```

**3. Canary Deployment**

- 10% of transactions via Orchestrator
- 90% via old system
- Monitor for divergence
- If divergence rate >0.1%, halt and investigate

**4. Monitoring Dashboard**

Track:
- Orchestrator success rate (target ≥99.9%)
- GL divergence rate (target 0%)
- Latency comparison (old vs. new)
- Event bus processing latency
- Error rates by error type

---

## Stage 3: Deprecation
### Goal: Old GL posting locations marked as deprecated; warnings logged

### Timeline: 2 weeks (Phase 5)

### Implementation Details

**1. Add Deprecation Warnings**

```typescript
async postGL_Deprecated(
  journalEntry: JournalEntryInput,
  context: ScopeContext
): Promise<GLPostingResult> {
  logger.warn('DEPRECATED_API_CALL', {
    method: 'postGL_Deprecated',
    reason: 'Orchestrator is now primary; old GL posting will be removed 2026-08-31',
    alternative: 'Use FinanceOrchestrator.postGL()',
    callerStackTrace: new Error().stack,
  });
  
  // ... old logic ...
}
```

**2. Migration Guide Published**

Document sent to all finance teams:
- "GL posting API changing"
- "New endpoint: /finance/gl/post"
- "Old endpoint: /finance/gl/post-deprecated (will be removed 2026-08-31)"
- "Impact: None if you're using standard UI (automatic)"
- "Action required: If custom integrations, update endpoint"

**3. Breaking Change Policy**

- Grace period: 4 weeks (2026-08-31 deadline)
- Warning issued in logs: 3x daily for old callers
- Documentation updated: new API docs prominent, old docs archived

---

## Stage 4: Removal
### Goal: Old GL posting code deleted

### Timeline: 1 week (Phase 6)

### Implementation Details

**1. Code Removal**

Files deleted:
- `src/server/finance/engines/GeneralLedgerEngine.ts` (old GL posting)
- `src/server/finance/services/journalPostingService.ts` (old GL posting)
- `src/server/finance/engines/FinanceEngine.ts` (if only GL posting)

Files kept (for reference in git history):
- All code in git; can be restored if needed

**2. Dependency Cleanup**

Remove old imports:
```typescript
// Remove
import { GeneralLedgerEngine } from '...';
import { journalPostingService } from '...';

// Keep
import { FinanceOrchestratorEngine } from '...';
```

**3. Test Cleanup**

Remove old GL posting tests:
- `src/server/finance/__tests__/GeneralLedgerEngine.test.ts`
- `src/server/finance/__tests__/journalPostingService.test.ts`

Keep Orchestrator tests (comprehensive coverage already)

**4. Documentation Update**

Remove old API docs:
- Remove `/docs/api/old-gl-posting.md`
- Update `/docs/api/index.md` (links updated to Orchestrator)

---

## Rollback Plan: If Major Issues Discovered

### Rollback Timeline

| Stage | Rollback Procedure | Time |
|-------|------------------|------|
| Bridge | Disable shadow Orchestrator; continue old system | 15 min |
| Dual-Mode | Revert primary to old system; Orchestrator becomes shadow | 30 min |
| Deprecation | Reactivate old APIs; extend grace period | 1 hour |
| Removal | Restore code from git; redeploy | 2 hours |

### Rollback Triggers

Automatic rollback if:
- GL divergence rate >1% (Stage 2)
- Orchestrator success rate <99% (Stage 2)
- User-facing latency increase >50% (Stage 2)
- GL imbalance detected (any stage)

Manual rollback if:
- Auditor discovers GL issue (any stage)
- Donor raises compliance concern (any stage)
- 5+ support tickets about GL posting in 1 day (any stage)

---

## Data Consistency Checks

### Post-Bridge (Before Stage 2)

```sql
-- Compare GL balances (old vs. new)
SELECT 
  account_id,
  SUM(debit) as total_debit_old,
  (SELECT SUM(debit) FROM new_system.journal_lines WHERE account_id = old.account_id) as total_debit_new
FROM old_system.journal_lines old
GROUP BY account_id
HAVING total_debit_old != total_debit_new;

-- Expected result: EMPTY (no discrepancies)
```

### Post-Dual-Mode (Before Stage 3)

```sql
-- Verify both systems agree on GL entries
SELECT COUNT(*)
FROM orchestrator_events
WHERE NOT EXISTS (
  SELECT 1 FROM old_system_gl WHERE id = orchestrator_events.old_system_id
);

-- Expected result: 0 (all Orchestrator entries have matching old system entries)
```

### Post-Deprecation (Before Stage 4)

```sql
-- Verify no old API calls in logs
SELECT COUNT(*)
FROM api_logs
WHERE endpoint LIKE '%postGL_Deprecated%'
AND timestamp > DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Expected result: 0 (no callers using deprecated endpoint)
```

### Post-Removal

```sql
-- Verify old tables not referenced
SELECT COUNT(*)
FROM pg_constraint
WHERE conrelid::regclass::text IN ('journal_posting_service_logs');

-- Expected result: 0 (old tables not in schema)
```

---

## Risk Mitigation

### Risk 1: GL Divergence (High Impact)

**Mitigation**:
- Shadow posting in Bridge stage catches divergence early
- Comparison automated (not manual)
- Automatic alert if divergence detected
- Rollback automatic if divergence >1%

### Risk 2: Performance Regression (High Impact)

**Mitigation**:
- Dual-mode testing in Stage 2 measures latency
- SLA: GL posting <200ms maintained
- Canary deployment (10% traffic first)
- Gradual traffic shift (not 100% at once)

### Risk 3: User-Facing Outage (High Impact)

**Mitigation**:
- Zero-downtime migration (old system stays up)
- Staged rollout (bridge → dual-mode → deprecation)
- Grace period for custom integrations (4 weeks)
- Rollback trigger: any user-facing error

### Risk 4: Audit Trail Loss (Critical)

**Mitigation**:
- Event Store is immutable (no data loss)
- Old GL entries preserved (soft delete, not hard)
- Audit logs preserved (separate system)
- Donor can verify GL via event replay

### Risk 5: Compliance Violation (Critical)

**Mitigation**:
- Donor notification: "System upgrade, GL accuracy maintained"
- Reconciliation report: Old GL vs. Orchestrator GL match
- Audit trail unaffected (immutable)
- No GL entries deleted (soft delete)

---

## Success Criteria

**Bridge Stage**:
- ✅ GL divergence rate 0% (perfect match)
- ✅ Event Store contains all GL posts
- ✅ No data loss

**Dual-Mode Stage**:
- ✅ Orchestrator success rate ≥99.9%
- ✅ GL divergence rate 0%
- ✅ Latency impact <5%
- ✅ 100% automated validation passing

**Deprecation Stage**:
- ✅ No new callers using old API
- ✅ All custom integrations migrated
- ✅ Grace period deadline passed without escalations

**Removal Stage**:
- ✅ Old GL posting code deleted
- ✅ Tests pass (no regression)
- ✅ Old API endpoints return 410 Gone

---

## Communication Plan

### Week 1 (Bridge start)
Email: "Behind-the-scenes system upgrade; no impact to you"

### Week 3 (Dual-Mode start)
Email: "Orchestrator now handles GL posting; validation in progress"

### Week 6 (Deprecation start)
Email: "Old GL posting API deprecated 2026-08-31; details below"
- New endpoint: `POST /api/finance/gl`
- Old endpoint: `POST /api/finance/gl-deprecated` (warning logs)
- Deadline: 2026-08-31 (4 weeks)
- Action: If custom integration, update endpoint

### Week 10 (Removal start)
Email: "Old GL posting code removed; graceful deprecation complete"

---

## Rollback Communication

If rollback needed (any stage):
- Immediate: Internal team notified (ops, finance, architecture)
- +30 min: Root cause identified and communicated internally
- +1 hour: External notification to finance teams (if impact)
- +4 hours: Post-mortem published; timeline for re-attempt

---

## Related Documents
- **FinanceModernizationRoadmap.md**: Timeline of phases with migration stages
- **Phase2AcceptanceCriteria.md**: What must be complete before migration starts
- **ArchitectureComplianceChecklist.md**: Dual-mode code must pass all checks

---

**This migration strategy ensures zero-downtime transition from current to target architecture.**
