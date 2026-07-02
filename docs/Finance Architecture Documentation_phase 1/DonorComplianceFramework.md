# Donor Compliance Framework

**Purpose**: Donor-specific rules and compliance requirements  
**Applies to**: Phases 2–7; enforcement through Rule Engine  

---

## Major Donors

### **USAID (US Agency for International Development)**

**Key Rules**:
```
Rule 1: Competitive Bidding
├─ Threshold: $250k+
├─ Requirement: 3+ written quotes minimum
├─ Exception: Emergency procurement (Director approval)
└─ Enforcement: Block GL post if rule violated

Rule 2: Cost Sharing (Indirect Costs)
├─ Max: 20% of direct costs
├─ Requires: Prior written approval
└─ Enforcement: Monitor allocation, flag overage

Rule 3: Audit Requirements
├─ Annual audit required if: Grant >$500k
├─ Frequency: Annual (fiscal year end)
├─ Requirement: USAID-approved auditor
└─ Enforcement: Block closeout if audit not submitted

Rule 4: Cash Advance Limits
├─ Advance amount: <30 days avg. expenditure
├─ Repayment: <120 days
└─ Enforcement: Block advance if limit exceeded

Rule 5: Reporting Frequency
├─ Quarterly: Financial report due within 30 days
├─ Annual: Year-end close out within 60 days
└─ Ad-hoc: Special reports as requested
```

**Compliance Checklist**:
- [ ] All procurement >$250k has 3+ quotes
- [ ] Indirect costs <20% of direct
- [ ] Audit plan submitted by end of Q1
- [ ] Q1 report submitted by Jan 31
- [ ] Q2 report submitted by Apr 30
- [ ] Q3 report submitted by Jul 31
- [ ] Q4 report submitted by Oct 31
- [ ] Annual audit completed by Feb 28 (following year)

---

### **European Commission (EU)**

**Key Rules**:
```
Rule 1: Eligible Costs
├─ Eligible: Salaries, transport, office supplies
├─ Ineligible: Depreciation, interest, penalties
├─ Requirement: List of eligible costs reviewed annually
└─ Enforcement: Reject invoices for ineligible items

Rule 2: Procurement Thresholds
├─ €200k+: Competitive bidding (3+ quotes)
├─ €80k-€200k: Local quotation (2+ quotes)
├─ €0-€80k: Single quote acceptable
└─ Enforcement: Automatic validation before GL post

Rule 3: Currency & Exchange Rates
├─ Base currency: EUR (unless approved otherwise)
├─ FX rates: Use official ECB rates (no profit)
├─ Requirement: Document FX conversion methodology
└─ Enforcement: Compare rates to ECB daily

Rule 4: Audit & Evaluation
├─ External audit: Mandatory if >€1M
├─ Mid-term evaluation: Required at 50% completion
└─ Enforcement: Tie to payment releases

Rule 5: Reporting Format
├─ Quarterly: Narrative progress + financial
├─ Annual: Audit trail + expense justification
└─ Format: EU-provided templates (ESOP system)
```

**Compliance Checklist**:
- [ ] All costs reviewed for eligibility
- [ ] Procurement thresholds applied correctly
- [ ] FX rates documented & reconciled
- [ ] Quarterly reports submitted on time
- [ ] Mid-term evaluation completed
- [ ] External audit contracted
- [ ] ESOP system updated current

---

### **World Bank**

**Key Rules**:
```
Rule 1: Procurement Policy
├─ International competitive bidding: $500k+
├─ National competitive bidding: $100k-$500k
├─ Limited international bidding: Restricted items
└─ Enforcement: Pre-approval of procurement plan

Rule 2: Safeguard Policies
├─ Environmental & social assessment required
├─ Indigenous peoples: Free prior consent
├─ Resettlement: Mitigations documented
└─ Enforcement: No disbursement without clearance

Rule 3: Financial Management
├─ Accounting standards: IFRS
├─ Internal controls: Risk assessment
├─ Audit: Annual independent audit
└─ Enforcement: Disbursement contingent on audit

Rule 4: Fraud & Corruption
├─ Sanctions: Debarment of vendors
├─ Reporting: Mandatory disclosure
└─ Investigation: WB investigations team
```

---

### **UN Agencies (UNICEF, WFP, UNHCR)**

**Key Rules**:
```
Rule 1: Vendor Management
├─ Vendor screening: Against UN sanctions list
├─ Due diligence: Background checks
└─ Enforcement: Automatic vendor validation

Rule 2: Supply & Logistics
├─ Advance before delivery: <2 weeks
├─ Documentation: Delivery tickets matched to invoices
└─ Enforcement: 3-way match (PO-GRN-Invoice)

Rule 3: Humanitarian Principles
├─ Needs-based: Distribution documented
├─ Impartiality: Non-discrimination
└─ Enforcement: Beneficiary tracking

Rule 4: Program Narrative Alignment
├─ Spending vs. budget: Quarterly reconciliation
├─ Variance >20%: Explanation required
└─ Enforcement: Approval required for variance
```

---

## Multi-Donor Compliance Matrix

| Requirement | USAID | EU | World Bank | UN | Our Compliance |
|-------------|-------|----|----|----|----|
| **Competitive Bidding Threshold** | $250k | €200k | $500k | $100k | **LOWEST THRESHOLD** |
| **Min Quotes** | 3 | 2-3 | 3 | 3 | **Always 3+** |
| **Audit Required** | $500k+ | €1M+ | $500k+ | $300k+ | **Automatic if any rule triggered** |
| **Reporting Frequency** | Quarterly | Quarterly | Semi-annual | Monthly | **Monthly (most frequent)** |
| **Indirect Cost Cap** | 20% | Varies | 10% | 15% | **STRICTEST: 10%** |
| **Currency** | USD | EUR | USD | USD/Local | **Document all conversions** |
| **Internal Audit** | Recommended | Required | Required | Required | **Mandatory** |

**Implementation**: System enforces MOST RESTRICTIVE rule for each donor.

---

## Rule Implementation in Finance System

### **Rule Engine Structure**

```
DonorRules.yaml:
├─ usaid:
│  ├─ CompetitiveBidding:
│  │  ├─ threshold: 250000
│  │  ├─ minQuotes: 3
│  │  ├─ appliesTo: ['expenditure']
│  │  └─ severity: 'critical'
│  ├─ CostSharingLimit:
│  │  ├─ percent: 20
│  │  ├─ appliesTo: ['budget']
│  │  └─ severity: 'critical'
│  └─ AuditRequirement:
│     ├─ threshold: 500000
│     ├─ frequency: 'annual'
│     └─ severity: 'critical'
│
└─ european_commission:
   ├─ EligibleCosts: {...}
   ├─ ProcurementThreshold: {...}
   └─ ReportingFormat: {...}
```

### **Enforcement Points**

```
Invoice Approval:
├─ Check: Vendor on sanctions list? → Block if yes
├─ Check: Procurement path for threshold? → Validate
├─ Check: Eligible cost category (EU)? → Block if ineligible
└─ Check: Cost sharing <limit? → Warn if over

GL Posting:
├─ Check: All rules passed? → Allow or reject
├─ Check: Exception approval present? → Allow with override
└─ Link: Source event → Compliance assessment

Period Close:
├─ Check: All grants have compliance sign-off? → Block if missing
├─ Check: Audit requirement met? → Block if overdue
└─ Check: Reporting templates complete? → Require before close
```

---

## Compliance Reporting

### **Monthly Compliance Report**

```
Donor: USAID | Period: July 2026

Compliance Summary:
├─ All Expenditures: 45
├─ Require Competitive Bidding: 8
├─ With 3+ Quotes: 8 ✓
├─ Violations: 0

Rule Status:
├─ CompetitiveBidding: ✓ PASS
├─ CostSharingLimit: ✓ PASS (18% of direct)
├─ CashAdvanceLimit: ✓ PASS
└─ ReportingSchedule: ✓ ON TRACK

Audit Status:
├─ Annual Audit: Required
├─ Audit Firm: Engaged (ABC Audit)
├─ Fieldwork Scheduled: Sep 2026

Next Actions:
├─ Q3 Report due: Aug 31 (14 days)
├─ Audit fieldwork: Sep 2026
└─ No escalation needed
```

### **Exception Management**

```
Rule Violation (Can request waiver):

Violation: $180k procurement without 3 quotes

Request to: USAID
Reason: Emergency response (hurricane relief)
Request Type: Expedited procurement waiver
Timeline: Approved/Rejected within 5 days

If Approved:
├─ GL entry posted (with waiver ref)
├─ Audit trail: Waiver ID + approver
└─ Compliance status: CONDITIONAL PASS

If Rejected:
├─ GL entry blocked
├─ Procurement must restart (get 3+ quotes)
├─ New timeline: +45 days
```

---

## Conclusion

Donor Compliance Framework:
- ✅ **4 major donors** with detailed rules
- ✅ **Multi-donor matrix** enforcing strictest requirement
- ✅ **Rule engine** embedded in finance system
- ✅ **Enforcement at GL posting** (preventive)
- ✅ **Monthly compliance reporting** (audit trail)
- ✅ **Exception management** (waiver process)
- ✅ **Zero tolerance** for critical violations

**Phase 7 (Rule Engine) implements this framework.**
