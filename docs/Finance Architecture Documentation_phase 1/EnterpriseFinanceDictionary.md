# Enterprise Finance Dictionary
## Definitive Terminology for the Finance Platform

**Version**: 1.0  
**Status**: Phase 1 Governance - Terminology Standard  
**Last Updated**: 2026-07-02  
**Owner**: Finance Architecture Board

---

## Purpose

This dictionary defines **one term, one meaning, one owner** for every key financial concept in the IMS. It prevents the ambiguity that derails ERP implementations.

**Rule**: If a term is not in this dictionary, do not use it in code, documentation, or conversations without adding it first.

---

## Core Financial Terms

### Grant
**Definition**: Funds donated to the organization for a specific purpose, allocated by a donor (USAID, EU, foundation, etc.).

**Characteristics**:
- Restricted to specific activities, cost categories, or countries per grant agreement
- Comes with donor compliance rules (approval thresholds, reporting frequency, audit requirements)
- Has lifecycle (awarded → received → spent → reported → closed)
- Base unit for budget hierarchy
- GL accounts segregated by grant

**Examples**: USAID Emergency Response $500K, EU Health Program $1.2M

**Owner**: Finance Manager

**Related**: Donor, Budget, Activity

---

### Project
**Definition**: A discrete organizational initiative funded by one or more grants, operating within a geographic scope (country, region, office) for a defined period.

**Characteristics**:
- Contains multiple activities
- Has own budget (sum of activities)
- Operates in one country/operating unit
- Has program manager responsible
- Health score and risk score tracked

**Examples**: Yemen Water Security Project, Cambodia Emergency Response

**Owner**: Program Director

**Related**: Activity, Grant, Operating Unit

---

### Program
**Definition**: A multi-year, strategic organizational initiative that may span multiple projects, countries, and donors.

**Characteristics**:
- Long-term (often 3–5 years)
- May have multiple grants
- Strategic outcome-focused (not transaction-focused)
- Higher-level than project

**Examples**: USAID Resilience Program (containing 5 projects across 3 countries), EU Regional Health Initiative

**Owner**: Regional Director

**Related**: Project, Grant, Strategy

---

### Activity
**Definition**: A discrete operational unit within a project, with defined deliverables, budget, and timeline. The budget allocation level in the IMS.

**Characteristics**:
- Lowest budget hierarchy level (below activity is cost category, not activity)
- Has cost categories (personnel, materials, travel, etc.)
- Mapped to GL account numbers
- Budget: allocated, spent, committed, available
- Program team accountable

**Examples**: Water Well Assessment Activity, Hygiene Training Activity, Equipment Maintenance Activity

**Owner**: Activity Manager / Program Manager

**Related**: Project, Budget, Cost Category

---

### Cost Category
**Definition**: Classification of expenses within an activity (personnel, materials, travel, operations, etc.). Used for budget control and GL segregation.

**Characteristics**:
- Budget is allocated by activity → cost category
- Maps to specific GL accounts (e.g., Personnel = 620, Materials = 610)
- Donor may restrict (e.g., "no more than 20% on indirect")
- Used in variance analysis

**Donor Restrictions Examples**:
- USAID: "Direct costs only; indirect capped at 15%"
- EU: "Equipment costs must be <10% of grant"
- UK FCDO: "All costs must be eligible per Activity Schedule"

**Owner**: Finance Manager

**Related**: Activity, GL Account, Budget

---

### Fund
**Definition**: Synonym for **Grant**. Used interchangeably in some donor terminology. In this system, "Fund" = "Grant."

**Owner**: Finance Manager

**Related**: Grant

---

### Commitment
**Definition**: A financial obligation incurred but not yet paid. Created when a Purchase Order is issued or a contract is signed.

**Characteristics**:
- Reserves budget (allocated - spent - committed = available)
- Not yet GL posted (GL post happens at payment)
- May be cancelled (releasing budget back to available)
- GL account: typically 210 (payables) or 140 (advances)

**Examples**: PO issued for $5K goods, contract signed for $20K consultant

**Owner**: Procurement Manager / Finance Manager

**Related**: Obligation, Encumbrance, Purchase Order

---

### Obligation
**Definition**: Synonym for **Commitment**. A financial obligation that creates a liability.

**Used In**: USAID compliance ("reporting of obligations and expenditures")

**Owner**: Finance Manager

**Related**: Commitment, Encumbrance

---

### Allocation
**Definition**: Distribution of grant funds across activities and cost categories. Happens at grant award time and may be adjusted via reallocation.

**Characteristics**:
- Updates budget hierarchy
- Creates GL sub-accounts per activity
- Requires approval authority (country director for <$50K, HQ for >)
- Donor approval required if over certain threshold

**Example**: USAID $500K grant → $250K Water, $150K Health, $100K Admin

**Owner**: Country Finance Manager

**Related**: Budget, Reallocation, Grant

---

### Encumbrance
**Definition**: Same as **Commitment** and **Obligation**. Used in some accounting contexts (USAID specifically). In this system: Commitment = Obligation = Encumbrance.

**Owner**: Finance Manager

**Related**: Commitment, Obligation

---

### Expenditure
**Definition**: Amount spent on an activity. GL posted when goods/services are received (GRN or invoice), not when payment is made. Reduces budget available.

**Characteristics**:
- GL posted at GRN (not invoice date, not payment date)
- Once posted, immutable (corrections via reversals only)
- Donor-attributable (traced to grant via activity → GL account hierarchy)
- Budget commitment released upon GL posting

**Example**: Goods received for $5K; GL posted; commitment released; budget updated

**Owner**: Finance Manager

**Related**: Disbursement, Payment, GL Posting

---

### Disbursement
**Definition**: Cash payment from bank account. Happens after expenditure is GL posted. Updates bank balance.

**Characteristics**:
- GL posting: Debit 620 (expense), Credit 101 (bank)
- After disbursement, bank reconciliation confirms
- May be delayed after expenditure (payment terms)

**Example**: Invoice received for $5K; GL posted immediately; payment released 30 days later

**Owner**: Treasury / Finance Manager

**Related**: Payment, Expenditure

---

### Payment
**Definition**: Synonym for **Disbursement**. Cash movement from bank account to vendor, employee, or beneficiary.

**Characteristics**:
- Method: bank transfer, cheque, mobile money, cash
- Status: scheduled, released, cleared (by bank)
- May have payment gateway fees (FX, bank charge)

**Owner**: Treasury

**Related**: Disbursement

---

### Settlement
**Definition**: Final reconciliation of a transaction. Payment received by vendor, confirmation returned, bank account settled.

**Characteristics**:
- Confirms payment actually cleared bank
- Updates GL reconciliation status
- Triggers removal of "payment pending" status

**Owner**: Treasury / Bank Reconciliation Officer

**Related**: Payment, Bank Reconciliation

---

### Advance
**Definition**: Cash provided to staff/beneficiary in advance of expenditure, with expectation of liquidation (proof of spending) within a defined period.

**Characteristics**:
- GL account: 140 (Advance to Staff)
- Must be liquidated within 45 days (org policy) or flagged as overdue
- Liquidation: actual receipts submitted, difference refunded or additional requested
- Donor may disallow (some donors require receipts before disbursement, no advances)
- Risk: unfinalized advances are aged payables

**Example**: Field monitor given $1K; uses $950 for market purchases; submits receipts; refunded $50

**Owner**: Finance Manager / Country Director

**Related**: Liquidation, Payable

---

### Liquidation
**Definition**: Submission of proof of spending for an advance. The closing process for an advance.

**Characteristics**:
- Requires receipt submission (donor compliance)
- Accountant verifies receipts match purpose (donor rules)
- GL posting closes advance: Debit 610 (expense), Credit 140 (advance)
- If unspent: refund issued or reimbursement requested
- Risk: orphaned advances (never liquidated)

**Example**: Advance liquidation submitted with $950 receipts; $50 refund issued

**Owner**: Finance Manager

**Related**: Advance

---

### Purchase Request (PR)
**Definition**: Request to procure goods or services. First step in procurement workflow. Creates budget commitment.

**Characteristics**:
- Submitted by program team
- Routes for approval (country director for <$10K, regional for >$10K)
- Budget check: is activity balance sufficient?
- Triggers procurement process (bidding, vendor selection)
- GL not posted yet (just budget commitment)

**Example**: Water team requests "200 water filters, $5K, 4-week delivery"

**Owner**: Procurement Manager

**Related**: Purchase Order, Commitment

---

### Purchase Order (PO)
**Definition**: Legal contract issued to vendor after PR approval and vendor selection. Creates firm commitment and reserves budget.

**Characteristics**:
- References PR, vendor, amount, delivery terms
- GL account assigned (e.g., 610-Materials)
- Budget commitment reserved (activity balance reduced)
- Triggers vendor invoice expectation

**Example**: PO issued to FilterCo for 200 filters, $5K, delivery to Sana'a warehouse

**Owner**: Procurement Manager

**Related**: Purchase Request, Goods Received Note, Invoice

---

### Goods Received Note (GRN)
**Definition**: Documentation that goods were physically received, inspected, and accepted. Triggers GL posting for inventory.

**Characteristics**:
- Matches to PO (three-way match with invoice)
- Quality inspection confirmed
- GL posting: Debit 610 (inventory), Credit 510 (purchases-in-transit) or directly Debit 610
- Invoice payment still pending (no GL impact yet)

**Example**: 200 water filters received, quality checked, GRN issued

**Owner**: Logistics / Warehouse Manager

**Related**: Purchase Order, Invoice, Three-Way Matching

---

### Invoice
**Definition**: Vendor bill for goods or services rendered. Used in three-way matching (PO ↔ GRN ↔ Invoice).

**Characteristics**:
- GL not posted yet (happens at payment, not invoice)
- Matches to PO (amount, item count, description)
- Matches to GRN (goods received)
- Triggers payment hold/reserve (liability on balance sheet)
- Donor may require original invoice copy (some donors still)

**Example**: FilterCo invoice for 200 filters, $5K, payment due net 30

**Owner**: Finance Manager / Accountant

**Related**: Purchase Order, Goods Received Note, Payment

---

### Three-Way Matching
**Definition**: Verification that Purchase Order, Goods Received Note, and Invoice all match in quantity, amount, and description before payment is released.

**Process**:
1. PR approved, PO issued → system holds budget commitment
2. Goods received, GRN issued → system confirms delivery
3. Invoice received → system matches to PO & GRN
4. Accountant verifies all three align → payment released

**Owner**: Finance Manager / Accountant

**Related**: Purchase Order, Goods Received Note, Invoice

---

### General Ledger (GL)
**Definition**: The permanent, immutable record of all financial transactions. Double-entry accounting system (every debit has a credit).

**Characteristics**:
- GL account: 100-series (assets), 200-series (liabilities), 300-series (equity), 400-series (revenue), 600-series (expenses)
- Journal entry: dated, numbered (immutable sequence), links to source event
- Balance: Debits = Credits (always)
- GL posting is final; corrections via reversals only

**Owner**: Controller / Finance Manager

**Related**: Journal Entry, Account, Balance

---

### Journal Entry
**Definition**: A dated, numbered entry in the GL linking a financial transaction to its source (invoice, PO, grant award, etc.).

**Characteristics**:
- Immutable after posting
- Contains 2+ lines (debit/credit pairs)
- Source event ID tracked (for audit, replay)
- Audit trail: who posted, when, approval chain
- Can be reversed (creates new journal entry with opposite amounts)

**Example**: JE-202601-001234: Debit 610-Materials $5K, Credit 101-Bank $5K, Source: Invoice INV-12345, Posted by: John Smith, Approved by: Country Director

**Owner**: Accountant / Finance Manager

**Related**: General Ledger, GL Account

---

### GL Account
**Definition**: A numbered account in the GL (e.g., 101-Bank, 610-Materials, 620-Personnel).

**Characteristics**:
- 3-digit code (100-199 = Assets, 200-299 = Liabilities, etc.)
- May have sub-accounts (101-USD, 101-EUR, 610-Materials-Water, etc.)
- Balance: sum of all debits - sum of all credits
- May be restricted by donor (e.g., "USAID costs must be in 401xx series")

**Example**: 610-Materials: debit balance $150K (materials purchased)

**Owner**: Controller / Finance Manager

**Related**: Journal Entry, General Ledger

---

### Budget
**Definition**: Approved financial plan for activities and cost categories. Top-level is grant; broken into activities and cost categories.

**Characteristics**:
- Hierarchical: Grant → Activity → Cost Category
- Allocated: initial amount approved
- Spent: GL posted expenditures
- Committed: POs issued (not yet spent)
- Available: Allocated - Spent - Committed
- Real-time tracking (updated at every PR, PO, GRN, payment)

**Example**:
```
Grant: USAID $500K
  Activity: Water: $250K
    Personnel: $100K spent, $20K committed, $130K available
    Materials: $120K spent, $5K committed, $25K available
```

**Owner**: Country Finance Manager / Program Manager

**Related**: Activity, Cost Category, Allocation

---

### Budget Reallocation
**Definition**: Movement of budgeted funds from one activity or cost category to another. Requires approval authority.

**Characteristics**:
- Approval threshold: <$10K by country director, >$10K by regional director
- Donor approval may be required (some donors mandate approval for reallocations)
- Audit trail preserved
- Original allocation never deleted (soft delete, reallocation history maintained)

**Example**: Water activity had $50K materials budget; reallocated $10K to Health activity materials due to program change

**Owner**: Country Finance Manager

**Related**: Budget, Allocation

---

### Cash Position
**Definition**: Real-time balance of all bank accounts, by currency and account.

**Characteristics**:
- Updated at every disbursement and bank reconciliation
- Tracked by account (101-USD, 101-KES, 101-EUR)
- Used for cash forecast (available cash vs. upcoming obligations)
- Critical for liquidity management (avoid overdraft, optimize investment)

**Example**: Total Cash Position: USD $250K (account 101-USD), KES 50M (account 101-KES)

**Owner**: Treasury

**Related**: Bank Account, Cash Forecast

---

### Cash Forecast
**Definition**: Projection of future cash position based on expected receipts and disbursements. Used for liquidity planning.

**Characteristics**:
- Rolling forecast (e.g., 13-week rolling)
- Updated weekly or as new commitments arise
- Shows cash available vs. obligations due
- Identifies shortfalls (need to request grant tranche early)

**Example**: "In 4 weeks, we have $80K obligations but only $60K cash; need to request grant tranche"

**Owner**: Treasury / Finance Manager

**Related**: Cash Position

---

### Reconciliation
**Definition**: Process of verifying that GL account balance matches supporting documentation (e.g., bank statement, invoice list).

**Characteristics**:
- Monthly mandatory (all accounts)
- Identifies mismatches (GL error, bank error, timing difference)
- Adjustments made to GL if discrepancies found
- Audit trail preserved

**Types**:
- Bank reconciliation (GL 101 vs. bank statement)
- Payable reconciliation (GL 201 vs. unpaid invoice list)
- Advance reconciliation (GL 140 vs. outstanding advances list)

**Owner**: Finance Manager / Accountant

**Related**: Bank Account, GL Account

---

### Foreign Exchange (FX)
**Definition**: Gain or loss from currency conversion. When org transfers between USD and KES, difference is FX gain/loss.

**Characteristics**:
- GL accounts: 730 (FX Gain), 740 (FX Loss)
- Rate: market rate at transaction date or at month-end per policy
- Unrealized FX: difference between GL 101 balance vs. converted balance
- Realized FX: difference when currency actually converts (at payment)

**Example**: Org transfers $10K USD to KES account at rate 1 USD = 150 KES (expected: 1.5M KES; actual: 1.51M KES; gain: 100K KES = $667)

**Owner**: Treasury

**Related**: Multi-Currency

---

### Multi-Currency
**Definition**: Operations in multiple currencies (USD, EUR, GBP, KES, XOF, etc.). Each currency has separate bank account and GL tracking.

**Characteristics**:
- Bank accounts segregated by currency (101-USD, 101-EUR, 101-KES)
- GL posted in original currency; converted to base currency (USD) for reporting
- FX variance tracked and disclosed to donors

**Owner**: Treasury / Controller

**Related**: Foreign Exchange

---

### Donor Compliance
**Definition**: Adherence to donor-specific rules for grant usage, approval, reporting, and audit.

**Characteristics**:
- Donor-specific thresholds (USAID may allow $100K purchases without donor approval; EU may require approval for >€50K)
- Donor-specific reporting (quarterly, semi-annual, annual)
- Donor-specific audit requirements (some donors mandate audit, some don't)
- Donor-specific cost restrictions (e.g., "no vehicles unless pre-approved")

**Examples**:
- USAID: Quarterly financial report, annual audit, single audit if >$750K
- EU: Quarterly narrative + financial statement, cost substantiation
- UK FCDO: Quarterly narrative, audited annual report

**Owner**: Compliance Officer / Finance Manager

**Related**: Donor, Rule

---

### Audit Trail
**Definition**: Permanent, tamper-proof record of every financial change: who made it, when, why, and what was changed.

**Characteristics**:
- Logged at GL posting (who approved, who posted, source event)
- Immutable (can read, never edit)
- Includes approval chain (who approved, when, comment)
- Donors require this for compliance verification

**Example**: GL Entry JE-202601-001: Posted by John Smith, Approved by Country Director Sarah Ahmed, Event ID: INV-12345, Timestamp: 2026-01-15 14:32:00

**Owner**: Controller

**Related**: General Ledger, Compliance

---

## Related Terms (Rarely Used, But Included for Completeness)

### Accrual
Recognition of revenue or expense when earned/incurred, not when cash is received/paid. The IMS supports both pure cash and modified accrual per org setting.

### Modified Accrual
Hybrid approach: revenue on cash basis (donors rarely refund), expenses on accrual basis (accrued salary, committed purchases). Most NGOs use this.

### Depreciation
Allocation of fixed asset cost over useful life. GL account 650 (Depreciation Expense), GL account 181 (Accumulated Depreciation). Monthly accrual at period close.

### Provisions
Liability recorded for expected future cost (e.g., bad debt, severance obligation). Rare in NGO context; included for completeness.

### Revaluation
Adjustment to asset value (e.g., inventory writedown, fixed asset revaluation). Donor compliance may restrict.

---

## Rule: Adding New Terms

**Before using a new financial term**:
1. Check if it exists in this dictionary
2. If not, propose it to the Finance Architecture Board
3. Board approves definition and assigns owner
4. Add to dictionary with version history
5. Notify all teams of new term

**Never invent terminology. Always use this dictionary.**

---

## Mapping: Existing System Terms ↔ Dictionary Terms

| Old/Ambiguous | Dictionary Term | Why Change |
|---|---|---|
| "Spend" | Expenditure | Clear: GL posted when goods received |
| "Obligation" | Commitment | Consistent: one term for financial liability |
| "Paid" | Disbursement | Clear: cash left bank account |
| "Supplier" | Vendor | Consistent terminology |
| "Line item" | Journal Line | GL-specific |
| "Cost code" | Cost Category | Standard GL terminology |
| "Money in" | Receipt | Or "Grant Award" / "Grant Tranche" |
| "Money out" | Disbursement | Clear distinction from Expenditure |

---

**This dictionary is the standard. All code, documentation, and conversations use these terms. Consistency prevents drift.**
