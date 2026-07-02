# Finance Event Catalog

**Purpose**: Complete reference of all financial events in the IMS  
**Applies to**: Phases 2–12 implementation  
**Versioning**: Events use semantic versioning (1.0, 1.1, 2.0)  

---

## Event Naming Convention

**Pattern**: `<Domain><Action>Event` or `<Domain><Action>` (context-dependent)

**Examples**:
- `InvoiceApprovedEvent` (from Procurement)
- `BudgetAllocatedEvent` (financial action)
- `GLPostedEvent` (financial action)
- `PaymentReleasedEvent` (financial action)

---

## Financial Event Types (20+ Core Events)

### **Budget Events**

#### 1. `BudgetAllocatedEvent` (v1.0)
When a budget is initially allocated to a project or activity
```json
{
  "eventId": "string (UUID)",
  "eventType": "BudgetAllocated",
  "version": "1.0",
  "timestamp": "datetime (ISO8601)",
  "organizationId": "integer",
  "operatingUnitId": "integer (nullable)",
  "correlationId": "string (UUID)",
  "causationId": "string (UUID, nullable)",
  "sourceModule": "finance",
  "payload": {
    "budgetLineId": "integer",
    "parentBudgetId": "integer (nullable)",
    "amount": "decimal",
    "currency": "string (USD, EUR, GBP, CHF)",
    "allocation": {
      "type": "enum (project, activity, cost_center, donor)",
      "entityId": "integer"
    },
    "period": {
      "startDate": "date",
      "endDate": "date"
    }
  }
}
```

#### 2. `BudgetCommitmentReservedEvent` (v1.0)
When budget is reserved for a commitment (e.g., PO approved)
```json
{
  "eventId": "string (UUID)",
  "eventType": "BudgetCommitmentReserved",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "payload": {
    "budgetLineId": "integer",
    "commitmentId": "integer",
    "commitmentType": "enum (purchase_order, contract, allocation)",
    "reservedAmount": "decimal",
    "currency": "string",
    "reservedBy": "integer (userId)"
  }
}
```

#### 3. `BudgetAvailabilityChangedEvent` (v1.0)
When available budget changes (allocated - spent - committed)
```json
{
  "eventId": "string (UUID)",
  "eventType": "BudgetAvailabilityChanged",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "payload": {
    "budgetLineId": "integer",
    "allocated": "decimal",
    "spent": "decimal",
    "committed": "decimal",
    "available": "decimal",
    "changeType": "enum (allocation, commitment, spending, refund)",
    "changeAmount": "decimal",
    "changeReason": "string"
  }
}
```

#### 4. `BudgetReallocatedEvent` (v1.0)
When budget is reallocated between lines
```json
{
  "eventId": "string (UUID)",
  "eventType": "BudgetReallocated",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "payload": {
    "fromBudgetLineId": "integer",
    "toBudgetLineId": "integer",
    "amount": "decimal",
    "currency": "string",
    "reason": "string",
    "approvedBy": "integer (userId)",
    "approvalDate": "date"
  }
}
```

---

### **GL & Journal Events**

#### 5. `GLPostedEvent` (v1.0)
When a GL entry is successfully posted
```json
{
  "eventId": "string (UUID)",
  "eventType": "GLPosted",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "causationId": "string (UUID, the event that triggered this GL post)",
  "sourceModule": "finance",
  "payload": {
    "journalEntryId": "integer",
    "journalNumber": "string",
    "postDate": "date",
    "entries": [
      {
        "lineNumber": "integer",
        "glAccountId": "integer",
        "debit": "decimal (nullable)",
        "credit": "decimal (nullable)",
        "description": "string"
      }
    ],
    "totalDebit": "decimal",
    "totalCredit": "decimal",
    "sourceEventType": "string (InvoiceApproved, PaymentReleased, etc.)",
    "sourceEventId": "string (UUID of the event that caused this posting)",
    "description": "string",
    "postedBy": "integer (userId)"
  }
}
```

#### 6. `GLReversalPostedEvent` (v1.0)
When a GL entry is reversed (corrected)
```json
{
  "eventId": "string (UUID)",
  "eventType": "GLReversalPosted",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "payload": {
    "originalJournalEntryId": "integer",
    "reversalJournalEntryId": "integer",
    "reversalJournalNumber": "string",
    "amount": "decimal",
    "currency": "string",
    "reason": "string",
    "reversedBy": "integer (userId)",
    "reversalDate": "date"
  }
}
```

#### 7. `JournalNumberSequenceGeneratedEvent` (v1.0)
When next journal number is generated (audit trail)
```json
{
  "eventId": "string (UUID)",
  "eventType": "JournalNumberSequenceGenerated",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "payload": {
    "journalNumber": "string",
    "sequenceValue": "integer",
    "year": "integer",
    "month": "integer"
  }
}
```

---

### **Expenditure Events**

#### 8. `ExpenditureRecordedEvent` (v1.0)
When an invoice is approved and expenditure recorded
```json
{
  "eventId": "string (UUID)",
  "eventType": "ExpenditureRecorded",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "causationId": "string (UUID, InvoiceApprovedEvent)",
  "sourceModule": "procurement",
  "payload": {
    "invoiceId": "integer",
    "expenditureId": "integer",
    "vendorId": "integer",
    "projectId": "integer",
    "grantId": "integer (nullable)",
    "amount": "decimal",
    "currency": "string",
    "invoiceDate": "date",
    "dueDate": "date",
    "glAccountId": "integer",
    "budgetLineId": "integer",
    "recordedDate": "date",
    "recordedBy": "integer (userId)"
  }
}
```

#### 9. `ExpenditureReversedEvent` (v1.0)
When an invoice is reversed (credit note)
```json
{
  "eventId": "string (UUID)",
  "eventType": "ExpenditureReversed",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "payload": {
    "originalInvoiceId": "integer",
    "creditNoteId": "integer",
    "amount": "decimal",
    "currency": "string",
    "reason": "string (credit_note, return, price_adjustment)",
    "reversedDate": "date",
    "reversedBy": "integer (userId)"
  }
}
```

---

### **Payment Events**

#### 10. `PaymentScheduledEvent` (v1.0)
When a payment is scheduled (due date approaching)
```json
{
  "eventId": "string (UUID)",
  "eventType": "PaymentScheduled",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "payload": {
    "invoiceId": "integer",
    "paymentId": "integer (nullable at scheduling)",
    "vendorId": "integer",
    "amount": "decimal",
    "currency": "string",
    "dueDate": "date",
    "daysUntilDue": "integer",
    "scheduledDate": "date",
    "scheduledBy": "integer (userId, system auto-schedule)"
  }
}
```

#### 11. `PaymentReleasedEvent` (v1.0)
When a payment is released/disbursed
```json
{
  "eventId": "string (UUID)",
  "eventType": "PaymentReleased",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "causationId": "string (UUID)",
  "sourceModule": "finance",
  "payload": {
    "paymentId": "integer",
    "invoiceIds": "array[integer]",
    "vendorId": "integer",
    "amount": "decimal",
    "currency": "string",
    "bankAccountId": "integer",
    "paymentMethod": "enum (bank_transfer, check, cash, card)",
    "paymentDate": "date",
    "referenceNumber": "string",
    "releasedBy": "integer (userId)",
    "releaseReason": "string"
  }
}
```

#### 12. `PaymentReconceiledEvent` (v1.0)
When a payment is reconciled with bank statement
```json
{
  "eventId": "string (UUID)",
  "eventType": "PaymentReconciled",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "payload": {
    "paymentId": "integer",
    "bankStatementRef": "string",
    "reconcileDate": "date",
    "reconcileAmount": "decimal",
    "currency": "string",
    "reconciliationStatus": "enum (cleared, pending, disputed)"
  }
}
```

---

### **Cash & Treasury Events**

#### 13. `CashPositionUpdatedEvent` (v1.0)
When cash position changes (grant drawn, payment released)
```json
{
  "eventId": "string (UUID)",
  "eventType": "CashPositionUpdated",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "payload": {
    "bankAccountId": "integer",
    "previousBalance": "decimal",
    "newBalance": "decimal",
    "change": "decimal (positive or negative)",
    "currency": "string",
    "transactionType": "enum (grant_inflow, payment_outflow, refund, interest, fee)",
    "updateDate": "date",
    "updateReason": "string"
  }
}
```

#### 14. `FXExposureChangedEvent` (v1.0)
When FX exposure changes (invoice in foreign currency)
```json
{
  "eventId": "string (UUID)",
  "eventType": "FXExposureChanged",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "payload": {
    "currency": "string",
    "amount": "decimal",
    "baseCurrency": "string (USD default)",
    "exchangeRate": "decimal",
    "baseEquivalent": "decimal",
    "exposureType": "enum (payable, receivable, inventory)",
    "exposureDate": "date"
  }
}
```

---

### **Advance Events**

#### 15. `AdvanceIssuedEvent` (v1.0)
When an advance is issued to staff
```json
{
  "eventId": "string (UUID)",
  "eventType": "AdvanceIssued",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "causationId": "string (UUID, EmployeeAdvanceApprovedEvent)",
  "sourceModule": "hr",
  "payload": {
    "advanceId": "integer",
    "employeeId": "integer",
    "amount": "decimal",
    "currency": "string",
    "issueDate": "date",
    "expectedReturnDate": "date",
    "projectId": "integer",
    "purpose": "string",
    "issuedBy": "integer (userId)"
  }
}
```

#### 16. `AdvanceLiquidatedEvent` (v1.0)
When an advance is settled with receipts
```json
{
  "eventId": "string (UUID)",
  "eventType": "AdvanceLiquidated",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "payload": {
    "liquidationId": "integer",
    "advanceId": "integer",
    "employeeId": "integer",
    "originalAdvanceAmount": "decimal",
    "spentAmount": "decimal",
    "refundAmount": "decimal",
    "currency": "string",
    "expenses": [
      {
        "receiptId": "string",
        "amount": "decimal",
        "category": "enum (accommodation, transportation, meals, supplies, other)",
        "vendor": "string",
        "date": "date"
      }
    ],
    "liquidationDate": "date",
    "liquidatedBy": "integer (userId)"
  }
}
```

#### 17. `AdvanceExpiredEvent` (v1.0)
When an advance hasn't been liquidated by deadline
```json
{
  "eventId": "string (UUID)",
  "eventType": "AdvanceExpired",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "payload": {
    "advanceId": "integer",
    "employeeId": "integer",
    "expectedReturnDate": "date",
    "expiryDate": "date",
    "amount": "decimal",
    "currency": "string"
  }
}
```

---

### **Risk & Compliance Events**

#### 18. `ComplianceViolationDetectedEvent` (v1.0)
When a donor rule or internal policy is violated
```json
{
  "eventId": "string (UUID)",
  "eventType": "ComplianceViolationDetected",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "payload": {
    "violationId": "string",
    "violationType": "enum (donor_rule, internal_policy, segregation_of_duties)",
    "donorId": "integer (nullable)",
    "rule": "string",
    "threshold": "string (optional)",
    "actualValue": "string (optional)",
    "severity": "enum (warning, critical)",
    "actionRequired": "enum (notification, manual_approval, escalation)",
    "detectedDate": "date"
  }
}
```

#### 19. `FinancialRiskEvaluatedEvent` (v1.0)
When risk assessment is completed
```json
{
  "eventId": "string (UUID)",
  "eventType": "FinancialRiskEvaluated",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "payload": {
    "riskType": "enum (liquidity, budget_overrun, fx_exposure, vendor, donor, project)",
    "riskScore": "decimal (0-100)",
    "riskLevel": "enum (low, medium, high, critical)",
    "factors": [
      {
        "factor": "string",
        "value": "decimal",
        "weight": "decimal"
      }
    ],
    "recommendation": "string",
    "evaluatedDate": "date"
  }
}
```

#### 20. `AuditFindingRecordedEvent` (v1.0)
When an audit finding is documented
```json
{
  "eventId": "string (UUID)",
  "eventType": "AuditFindingRecorded",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "payload": {
    "auditId": "string",
    "findingNumber": "string",
    "description": "string",
    "severity": "enum (observation, finding, critical)",
    "relatedTransaction": "string (optional, transactionId or invoiceId)",
    "root_cause": "string (optional)",
    "recommendation": "string (optional)",
    "recordedDate": "date"
  }
}
```

---

### **Donor & Grant Events**

#### 21. `GrantAllocatedEvent` (v1.0)
When a grant is allocated (emitted by Grants module)
```json
{
  "eventId": "string (UUID)",
  "eventType": "GrantAllocated",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "sourceModule": "grants",
  "payload": {
    "grantId": "integer",
    "donorId": "integer",
    "grantCode": "string",
    "totalAmount": "decimal",
    "currency": "string",
    "startDate": "date",
    "endDate": "date",
    "allocationDate": "date"
  }
}
```

#### 22. `GrantDrawnDownEvent` (v1.0)
When grant funds are drawn (emitted by Grants module)
```json
{
  "eventId": "string (UUID)",
  "eventType": "GrantDrawnDown",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "sourceModule": "grants",
  "payload": {
    "grantId": "integer",
    "drawAmount": "decimal",
    "currency": "string",
    "drawDate": "date",
    "bankReference": "string"
  }
}
```

---

### **Internal Finance Events**

#### 23. `MonthEndClosingStartedEvent` (v1.0)
When month-end closing process begins
```json
{
  "eventId": "string (UUID)",
  "eventType": "MonthEndClosingStarted",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "sourceModule": "finance",
  "payload": {
    "closingPeriod": "string (YYYY-MM)",
    "cutoffDate": "date",
    "startedBy": "integer (userId)",
    "startedDate": "datetime"
  }
}
```

#### 24. `MonthEndClosingCompletedEvent` (v1.0)
When month-end closing is complete
```json
{
  "eventId": "string (UUID)",
  "eventType": "MonthEndClosingCompleted",
  "version": "1.0",
  "timestamp": "datetime",
  "organizationId": "integer",
  "operatingUnitId": "integer",
  "correlationId": "string (UUID)",
  "sourceModule": "finance",
  "payload": {
    "closingPeriod": "string (YYYY-MM)",
    "transactionCount": "integer",
    "glEntriesPosted": "integer",
    "closedBy": "integer (userId)",
    "closedDate": "date"
  }
}
```

---

## Event Versioning & Evolution

### Version Changes
- **v1.0 → v1.1**: Backward-compatible (new optional field)
- **v1.x → v2.0**: Breaking change (field removed or changed type)

### Handling Multiple Versions
```typescript
// Handler must support multiple versions
async function handleGLPosted(event: FinancialEvent) {
  switch (event.version) {
    case '1.0':
    case '1.1':
      return handleGLPostedV1(event);
    case '2.0':
      return handleGLPostedV2(event);
    default:
      throw new Error(`Unsupported version: ${event.version}`);
  }
}
```

---

## Event Validation Schema (Zod)

All events validated with Zod before processing:

```typescript
const FinancialEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string(),
  version: z.string(),
  timestamp: z.string().datetime(),
  organizationId: z.number().positive(),
  operatingUnitId: z.number().positive().optional(),
  correlationId: z.string().uuid(),
  causationId: z.string().uuid().optional(),
  sourceModule: z.string().optional(),
  payload: z.record(z.unknown()),
});

const GLPostedEventSchema = FinancialEventSchema.extend({
  eventType: z.literal('GLPosted'),
  payload: z.object({
    journalEntryId: z.number().positive(),
    journalNumber: z.string(),
    postDate: z.string().date(),
    totalDebit: z.number().nonnegative(),
    totalCredit: z.number().nonnegative(),
    sourceEventType: z.string(),
    sourceEventId: z.string().uuid(),
  }),
});
```

---

## Event Storage & Retrieval

### Event Store Schema
```sql
CREATE TABLE events (
  id VARCHAR(36) PRIMARY KEY,  -- UUID
  event_type VARCHAR(100) NOT NULL,
  version VARCHAR(10),
  timestamp DATETIME NOT NULL,
  organization_id INT NOT NULL,
  operating_unit_id INT,
  correlation_id VARCHAR(36),
  causation_id VARCHAR(36),
  source_module VARCHAR(50),
  payload LONGTEXT,  -- JSON
  recorded_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_org (organization_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_event_type (event_type),
  INDEX idx_correlation (correlation_id)
);
```

### Event Replay
```typescript
// Replay all events from a date
const events = await eventStore.getAllByDate(
  organizationId,
  fromDate,
  toDate,
  eventTypes
);

// Rebuild state from events
let state = initialState;
for (const event of events) {
  state = applyEvent(state, event);
}
```

---

## Event Publishing Best Practices

1. **After transaction commit**: Publish event only if DB transaction succeeds
2. **Exactly once delivery**: Use idempotent keys to prevent duplicates
3. **Preserve causality**: Link events with correlationId & causationId
4. **Validate payload**: Zod validation before storage
5. **Async processing**: Non-blocking event handlers

---

## Conclusion

This event catalog defines all financial events in the system. Each event:
- ✅ Has a unique ID (UUID)
- ✅ Links to source event (causationId)
- ✅ Contains complete context (organizationId, operatingUnitId)
- ✅ Is versioned for schema evolution
- ✅ Is stored immutably in EventStore
- ✅ Triggers orchestrator handlers
- ✅ Enables audit trail & replay

**Next Steps**: 
1. Each phase implements new events
2. All events validated with Zod
3. EventStore persists all events
4. Handlers subscribe to events
