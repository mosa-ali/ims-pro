# Finance Integration Standards

**Purpose**: Define how Finance Module connects to Procurement, Grants, HR, GIS/Logistics, MEAL  
**Principle**: Loose coupling via event contracts; Finance subscribes to module events  
**Applies to**: All inter-module communication in Phases 2+  

---

## Integration Architecture

```
Procurement, Grants, HR, GIS, MEAL Modules
              │
              │ (emit domain events)
              │
              ↓
        Event Bus
              │
              │ (Finance subscribes)
              │
              ↓
Finance Orchestrator
              │
              ├─ Finance Engines
              ├─ GL Service
              ├─ Budget Platform
              ├─ Treasury Platform
              └─ Financial Intelligence
              
KEY: Finance does NOT call into other modules.
     Finance RECEIVES events from other modules.
     Finance publishes financial events for other modules to consume.
```

---

## Module Event Contracts

### 1. Procurement Module ↔ Finance

**Procurement emits**:

#### `PurchaseRequestApprovedEvent`
```json
{
  "eventId": "uuid",
  "eventType": "PurchaseRequestApproved",
  "timestamp": "2026-07-02T10:30:00Z",
  "organizationId": 1,
  "operatingUnitId": 2,
  "correlationId": "uuid",
  "payload": {
    "purchaseRequestId": 12345,
    "projectId": 777,
    "grantId": 999,
    "vendorId": 456,
    "requestedAmount": 50000,
    "currency": "USD",
    "description": "Office supplies",
    "requestedDate": "2026-07-02",
    "approvedDate": "2026-07-02",
    "approvedBy": "user123",
    "estimatedDeliveryDate": "2026-08-02"
  }
}
```

**Finance Orchestrator reacts**:
- Reserve budget (if available)
- Create commitment GL entry (DR Expense, CR Payable)
- Update treasury forecast (add to payables)
- Evaluate compliance (check donor rules)
- Publish `BudgetCommitmentCreatedEvent`

---

#### `PurchaseOrderApprovedEvent`
```json
{
  "eventId": "uuid",
  "eventType": "PurchaseOrderApproved",
  "timestamp": "2026-07-02T11:00:00Z",
  "organizationId": 1,
  "operatingUnitId": 2,
  "correlationId": "uuid",
  "payload": {
    "purchaseOrderId": 54321,
    "purchaseRequestId": 12345,
    "vendorId": 456,
    "totalAmount": 50000,
    "currency": "USD",
    "poNumber": "PO-2026-001",
    "poDate": "2026-07-02",
    "deliveryAddress": "Warehouse A",
    "lineItems": [
      {
        "itemId": "SKU-001",
        "description": "Office supplies",
        "quantity": 100,
        "unitPrice": 500,
        "lineTotal": 50000
      }
    ]
  }
}
```

**Finance Orchestrator reacts**:
- Confirm budget commitment
- Create PO GL entry (if different from PR)
- Publish `PurchaseOrderProcessedEvent`

---

#### `GoodsReceivedNoteConfirmedEvent`
```json
{
  "eventId": "uuid",
  "eventType": "GoodsReceivedNoteConfirmed",
  "timestamp": "2026-08-02T14:00:00Z",
  "organizationId": 1,
  "operatingUnitId": 2,
  "correlationId": "uuid",
  "payload": {
    "grnId": 87654,
    "purchaseOrderId": 54321,
    "vendorId": 456,
    "receivedDate": "2026-08-02",
    "receivedQuantity": 100,
    "receivedBy": "warehouse_user",
    "lineItems": [
      {
        "itemId": "SKU-001",
        "receivedQty": 100,
        "acceptedQty": 100
      }
    ]
  }
}
```

**Finance Orchestrator reacts**:
- Match with PO (part of 3-way matching)
- Wait for invoice (3-way: PO → GRN → Invoice)
- Publish `ReceiptConfirmedEvent`

---

#### `VendorInvoiceApprovedEvent`
```json
{
  "eventId": "uuid",
  "eventType": "VendorInvoiceApproved",
  "timestamp": "2026-08-05T09:00:00Z",
  "organizationId": 1,
  "operatingUnitId": 2,
  "correlationId": "uuid",
  "payload": {
    "invoiceId": 99999,
    "vendorId": 456,
    "purchaseOrderId": 54321,
    "grnId": 87654,
    "invoiceNumber": "INV-2026-001",
    "invoiceDate": "2026-08-04",
    "dueDate": "2026-09-04",
    "amount": 50000,
    "currency": "USD",
    "approvedDate": "2026-08-05",
    "approvedBy": "finance_approver",
    "lineItems": [
      {
        "itemId": "SKU-001",
        "description": "Office supplies",
        "quantity": 100,
        "unitPrice": 500,
        "lineTotal": 50000
      }
    ]
  }
}
```

**Finance Orchestrator reacts**:
1. **3-Way Match Check**: PO → GRN → Invoice match?
   - Amount matches (within tolerance)?
   - Quantity matches?
   - Dates logical?
2. **If matched**: Approve payment
3. **If not matched**: Flag for exception
4. **Create GL Entry**: DR Expense, CR Payable
5. **Update Budget**: Reduce available
6. **Update Treasury**: Add to payables
7. **Publish**: `InvoiceProcessedEvent`

---

#### `PaymentReleasedEvent`
```json
{
  "eventId": "uuid",
  "eventType": "PaymentReleased",
  "timestamp": "2026-09-04T10:00:00Z",
  "organizationId": 1,
  "operatingUnitId": 2,
  "correlationId": "uuid",
  "payload": {
    "paymentId": 77777,
    "invoiceIds": [99999],
    "vendorId": 456,
    "amount": 50000,
    "currency": "USD",
    "bankAccountId": 1,
    "paymentDate": "2026-09-04",
    "paymentMethod": "bank_transfer",
    "releasedBy": "finance_user",
    "reference": "INV-2026-001"
  }
}
```

**Finance Orchestrator reacts**:
1. **Post GL Entry**: DR Payable, CR Bank
2. **Update Treasury**: Cash position decreased, payables decreased
3. **Update Forecast**: Payment removed from payables projection
4. **Update Vendor**: Record payment (for vendor performance)
5. **Publish**: `PaymentProcessedEvent`

---

### 2. Grants Module ↔ Finance

#### `GrantAllocatedEvent`
```json
{
  "eventId": "uuid",
  "eventType": "GrantAllocated",
  "timestamp": "2026-07-01T08:00:00Z",
  "organizationId": 1,
  "operatingUnitId": 2,
  "correlationId": "uuid",
  "payload": {
    "grantId": 1001,
    "donorId": 100,
    "grantCode": "USAID-2026-001",
    "totalAmount": 1000000,
    "currency": "USD",
    "startDate": "2026-07-01",
    "endDate": "2027-06-30",
    "allocationDate": "2026-07-01",
    "rules": [
      { "rule": "CompetitiveBidding", "threshold": 250000 },
      { "rule": "AuditRequirement", "annualThreshold": 1000000 },
      { "rule": "CashAdvanceLimit", "limit": 30 }
    ]
  }
}
```

**Finance Orchestrator reacts**:
1. **Create Grant Budget**: Top-level budget = grant amount
2. **Store Rules**: Load into Rule Engine
3. **Update Treasury**: Add to available funds (pending draw-down)
4. **Publish**: `GrantBudgetCreatedEvent`

---

#### `GrantDrawnDownEvent`
```json
{
  "eventId": "uuid",
  "eventType": "GrantDrawnDown",
  "timestamp": "2026-08-01T10:00:00Z",
  "organizationId": 1,
  "operatingUnitId": 2,
  "correlationId": "uuid",
  "payload": {
    "grantId": 1001,
    "drawAmount": 250000,
    "drawDate": "2026-08-01",
    "bankReference": "WIRE-2026-001",
    "bankAccountId": 1
  }
}
```

**Finance Orchestrator reacts**:
1. **Post GL Entry**: DR Bank, CR Grant Revenue
2. **Update Treasury**: Cash position increased
3. **Update Grant Budget**: Mark as received
4. **Publish**: `GrantDrawnProcessedEvent`

---

#### `GrantReportingRequiredEvent`
```json
{
  "eventId": "uuid",
  "eventType": "GrantReportingRequired",
  "timestamp": "2026-10-01T08:00:00Z",
  "organizationId": 1,
  "operatingUnitId": 2,
  "correlationId": "uuid",
  "payload": {
    "grantId": 1001,
    "reportingDeadline": "2026-10-31",
    "reportType": "quarterly",
    "requiredMetrics": ["spending", "budget", "compliance"]
  }
}
```

**Finance Orchestrator reacts**:
1. **Trigger Report Generation**: Quarterly financial report
2. **Validate Compliance**: Against donor rules
3. **Publish**: `GrantReportReadyEvent`

---

### 3. HR Module ↔ Finance

#### `EmployeeAdvanceApprovedEvent`
```json
{
  "eventId": "uuid",
  "eventType": "EmployeeAdvanceApproved",
  "timestamp": "2026-07-15T10:00:00Z",
  "organizationId": 1,
  "operatingUnitId": 2,
  "correlationId": "uuid",
  "payload": {
    "advanceId": 5555,
    "employeeId": 888,
    "employeeName": "Ahmed Hassan",
    "approvedAmount": 10000,
    "currency": "USD",
    "approvalDate": "2026-07-15",
    "approvedBy": "manager_user",
    "projectId": 777,
    "purpose": "Field mission to Aleppo",
    "expectedReturnDate": "2026-07-20"
  }
}
```

**Finance Orchestrator reacts**:
1. **Create GL Entry**: DR Staff Advance, CR Bank
2. **Reduce Cash**: Treasury updated
3. **Track for Liquidation**: Flag for follow-up
4. **Publish**: `AdvanceIssuedEvent`

---

#### `AdvanceLiquidationSubmittedEvent`
```json
{
  "eventId": "uuid",
  "eventType": "AdvanceLiquidationSubmitted",
  "timestamp": "2026-07-22T14:00:00Z",
  "organizationId": 1,
  "operatingUnitId": 2,
  "correlationId": "uuid",
  "payload": {
    "liquidationId": 6666,
    "advanceId": 5555,
    "employeeId": 888,
    "originalAdvanceAmount": 10000,
    "spentAmount": 9500,
    "refundAmount": 500,
    "submissions": [
      {
        "receiptId": "R001",
        "amount": 5000,
        "category": "accommodation",
        "vendor": "Hotel ABC"
      },
      {
        "receiptId": "R002",
        "amount": 4500,
        "category": "transportation",
        "vendor": "Airline XYZ"
      }
    ],
    "submittedDate": "2026-07-22",
    "submittedBy": "employee"
  }
}
```

**Finance Orchestrator reacts**:
1. **Record Expenses**: Create GL entries for each receipt category
2. **Calculate Refund**: Refund amount = advance - spent
3. **Post GL Entries**:
   - DR Expense (various), CR Staff Advance
   - DR Bank (if refund), CR Staff Advance
4. **Update Budget**: Allocate to project
5. **Update Treasury**: Cash impact
6. **Publish**: `AdvanceLiquidatedEvent`

---

### 4. GIS/Logistics Module ↔ Finance

#### `ProcurementDeliveryConfirmedEvent`
(Same as `GoodsReceivedNoteConfirmedEvent` above)

**Purpose**: Finance uses this for 3-way matching

---

#### `AssetDepreciationScheduleCreatedEvent`
```json
{
  "eventId": "uuid",
  "eventType": "AssetDepreciationScheduleCreated",
  "timestamp": "2026-07-10T10:00:00Z",
  "organizationId": 1,
  "operatingUnitId": 2,
  "correlationId": "uuid",
  "payload": {
    "assetId": 3333,
    "assetCode": "VEHICLE-001",
    "assetName": "4x4 Pickup Truck",
    "purchasePrice": 50000,
    "purchaseDate": "2026-07-01",
    "usefulLife": 10,
    "depreciationMethod": "straight_line",
    "monthlyDepreciation": 416.67,
    "salvageValue": 10000
  }
}
```

**Finance Orchestrator reacts**:
1. **Create Fixed Asset GL Account Entry**: DR Asset, CR Payable (already done via invoice)
2. **Schedule Monthly Accrual**: Depreciation expense
3. **Publish**: `AssetDepreciationScheduledEvent`

---

### 5. MEAL Module ↔ Finance

#### `BeneficiaryExpenseRecordedEvent`
```json
{
  "eventId": "uuid",
  "eventType": "BeneficiaryExpenseRecorded",
  "timestamp": "2026-07-05T15:00:00Z",
  "organizationId": 1,
  "operatingUnitId": 2,
  "correlationId": "uuid",
  "payload": {
    "beneficiaryActivityId": 2222,
    "beneficiaryId": 4444,
    "activityType": "food_distribution",
    "beneficiaryCount": 500,
    "amount": 25000,
    "currency": "USD",
    "category": "food",
    "dateOfActivity": "2026-07-05",
    "recordedDate": "2026-07-05",
    "recordedBy": "enumerator"
  }
}
```

**Finance Orchestrator reacts**:
1. **Record Expense**: DR MEAL Expense, CR Payable/Bank
2. **Allocate to Project**: Update project spending
3. **Update Budget**: Against activity budget
4. **Publish**: `BeneficiaryExpenseProcessedEvent`

---

## Finance Events Published

Finance publishes events for other modules to consume:

### `GLPostingConfirmedEvent`
Published after GL entry successfully posted
```json
{
  "eventId": "uuid",
  "eventType": "GLPostingConfirmed",
  "timestamp": "2026-07-02T10:30:15Z",
  "organizationId": 1,
  "operatingUnitId": 2,
  "correlationId": "uuid",  // Matches original event
  "payload": {
    "journalEntryId": 123456,
    "journalNumber": "JE-2026-001",
    "sourceEventId": "InvoiceApprovedEvent#99999",
    "sourceEventType": "InvoiceApprovedEvent",
    "postDate": "2026-07-02",
    "totalDebit": 50000,
    "totalCredit": 50000
  }
}
```

**Other modules use this for:**
- Confirmation that invoice is recorded
- Triggering downstream processes
- Audit trail linking

---

### `BudgetAvailabilityChangedEvent`
Published when budget available changes
```json
{
  "eventId": "uuid",
  "eventType": "BudgetAvailabilityChanged",
  "timestamp": "2026-07-02T10:30:15Z",
  "organizationId": 1,
  "operatingUnitId": 2,
  "correlationId": "uuid",
  "payload": {
    "budgetLineId": 999,
    "projectId": 777,
    "allocated": 100000,
    "spent": 25000,
    "committed": 15000,
    "available": 60000,
    "changeType": "commitment",  // "commitment", "spending", "allocation"
    "changeAmount": -15000
  }
}
```

**Other modules use this for:**
- Real-time budget visibility
- Preventing over-commitment (Procurement checks before approving PR)
- Dashboard updates

---

### `PaymentDueEvent`
Published when payment is due
```json
{
  "eventId": "uuid",
  "eventType": "PaymentDue",
  "timestamp": "2026-08-20T08:00:00Z",
  "organizationId": 1,
  "operatingUnitId": 2,
  "correlationId": "uuid",
  "payload": {
    "invoiceId": 99999,
    "vendorId": 456,
    "amount": 50000,
    "currency": "USD",
    "dueDate": "2026-09-04",
    "daysUntilDue": 15
  }
}
```

**Other modules use this for:**
- Payment reminder systems
- Vendor management
- Cash planning

---

### `ComplianceViolationDetectedEvent`
Published when rule is violated
```json
{
  "eventId": "uuid",
  "eventType": "ComplianceViolationDetected",
  "timestamp": "2026-07-02T10:30:15Z",
  "organizationId": 1,
  "operatingUnitId": 2,
  "correlationId": "uuid",
  "payload": {
    "violationType": "donor_rule_violation",
    "donorId": 100,
    "rule": "CompetitiveBidding",
    "threshold": 250000,
    "actualAmount": 350000,
    "severity": "critical",
    "actionRequired": "executive_approval"
  }
}
```

**Other modules use this for:**
- Alert systems
- Workflow escalation
- Compliance tracking

---

## Integration Best Practices

### 1. Idempotency
- **Events may be delivered multiple times**
- **Every handler must be idempotent**
- **Use event ID as idempotency key**

```typescript
// ✅ Idempotent handler
async function handleInvoiceApproved(event: InvoiceApprovedEvent) {
  // Check if already processed
  const existing = await db.select().from(invoiceProcessed)
    .where(eq(invoiceProcessed.eventId, event.id));
  
  if (existing.length > 0) {
    return { status: 'already_processed' };
  }
  
  // Process
  const glEntry = await glService.post(...);
  
  // Mark as processed
  await db.insert(invoiceProcessed).values({ eventId: event.id, glEntryId: glEntry.id });
  
  return { status: 'processed', glEntryId: glEntry.id };
}
```

### 2. Failure Handling
- **If handler fails**: Event goes to dead letter queue
- **Manual retry** from dashboard
- **Logging** of failure reason

```typescript
// ✅ Dead letter queue
async function processEvent(event: FinancialEvent) {
  try {
    return await handleEvent(event);
  } catch (error) {
    await deadLetterQueue.add({
      eventId: event.id,
      reason: error.message,
      timestamp: new Date(),
      attempts: 1,
    });
    // Alert operations team
    await alertService.notify('EventProcessingFailed', error);
    throw error;  // Don't swallow
  }
}
```

### 3. Ordering Guarantees
- **Within same aggregate**: Events ordered (e.g., PR → PO → Invoice)
- **Across aggregates**: No guarantee (Budget might not be reserved before GL post)
- **Solution**: Orchestrator coordinates in correct order

### 4. Eventual Consistency
- **Invoices posted**: Budget available updated within 1 second
- **Grants drawn**: Cash position updated within 1 second
- **Acceptable lag**: <5 seconds for non-critical metrics

### 5. Testing Integration
```typescript
// ✅ Mock other module events
describe('Finance::InvoiceApprovedHandler', () => {
  it('should post GL and reserve budget', async () => {
    const event = new InvoiceApprovedEvent({
      invoiceId: 99999,
      amount: 50000,
      projectId: 777,
    });
    
    const result = await orchestrator.process(event);
    
    expect(result.success).toBe(true);
    const budget = await budgetEngine.getBudget(projectId);
    expect(budget.available).toBeLessThan(originalAvailable);
  });
});
```

---

## Module Checklist: Ready for Finance Integration

Before a module can emit events that Finance depends on, verify:
- [ ] Event schema defined (JSON with all required fields)
- [ ] Event ID (UUID) generated
- [ ] CorrelationId propagated from originating request
- [ ] Event timestamp recorded
- [ ] Payload validated
- [ ] Event published to EventBus
- [ ] Finance subscription documented
- [ ] Error handling (what if Finance fails?)
- [ ] Idempotency (can be replayed)
- [ ] Tests covering Finance integration

---

## Conclusion

**Key Principle**: Finance does not call into other modules. Other modules emit events; Finance subscribes and reacts.

**This ensures:**
- ✅ Loose coupling (modules independent)
- ✅ Asynchronous processing (no blocking)
- ✅ Auditability (all events recorded)
- ✅ Reliability (events replayed on failure)
- ✅ Scalability (events processed async)

**Next Steps:**
1. Each module adopts event emission pattern
2. Finance subscribes to module events
3. Orchestrator routes events to appropriate engines
4. Tests cover end-to-end workflows (module → Finance → GL)
