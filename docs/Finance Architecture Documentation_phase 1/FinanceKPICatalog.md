# Finance KPI Catalog

**Purpose**: Complete reference of all financial KPIs  
**Applies to**: Phases 2–12; success metrics for every phase  

---

## KPI Categories

### **Category 1: Cash Management KPIs**

| KPI | Formula | Target | Refresh | Owner | Dashboard |
|-----|---------|--------|---------|-------|-----------|
| **Cash Position** | Sum of bank balances | >$X (org-specific) | Real-time | Treasurer | Daily |
| **Days of Cash** | Cash / (Daily spend) | 30+ days | Daily | Treasurer | Daily |
| **Cash Forecast Accuracy** | % forecast within 10% of actual | 90%+ | Weekly | Treasurer | Weekly |
| **Payables Outstanding** | Sum of unpaid invoices | <$X | Daily | Finance Mgr | Daily |
| **Payment On-Time Rate** | % invoices paid by due date | 95%+ | Monthly | Treasurer | Monthly |
| **FX Exposure** | Payables/Receivables in foreign currencies | Minimize | Daily | Treasurer | Daily |

---

### **Category 2: Budget Management KPIs**

| KPI | Formula | Target | Refresh | Owner | Dashboard |
|-----|---------|--------|---------|-------|-----------|
| **Budget Utilization** | Spent / Allocated | 85-95% | Real-time | Finance Mgr | Daily |
| **Budget Accuracy** | (Allocated - Actual) / Allocated | ±5% | Monthly | Finance Mgr | Monthly |
| **Over-Budget Projects** | # of projects >100% spent | 0 | Daily | Finance Mgr | Daily |
| **Budget Variance** | Actual vs. Budget by cost center | ±10% | Monthly | Finance Mgr | Monthly |
| **Budget Change Frequency** | # of reallocations per month | <3 | Monthly | Finance Mgr | Monthly |
| **Commitment-to-Budget Ratio** | Committed / Available | <80% | Daily | Finance Mgr | Daily |

---

### **Category 3: Financial Accuracy KPIs**

| KPI | Formula | Target | Refresh | Owner | Dashboard |
|-----|---------|--------|---------|-------|-----------|
| **GL Balance** | DR = CR | 100% | Real-time | Finance Mgr | Real-time |
| **Three-Way Match Rate** | % invoices with matching PO+GRN | 99%+ | Daily | Finance Mgr | Daily |
| **Unmatched Invoices** | # invoices awaiting match | <5 | Daily | Finance Mgr | Daily |
| **Days to Reconcile** | Bank reconciliation latency | <1 day | Daily | Finance Mgr | Daily |
| **Reconciliation Variance** | GL balance vs. Bank balance | $0 | Daily | Finance Mgr | Daily |
| **Invoice Processing Time** | Days from receipt to approval | <2 days | Weekly | Finance Mgr | Weekly |

---

### **Category 4: Risk Management KPIs**

| KPI | Formula | Target | Refresh | Owner | Dashboard |
|-----|---------|--------|---------|-------|-----------|
| **Liquidity Risk Score** | (1 - Cash/Payables) * 100 | <50 | Daily | Treasurer | Daily |
| **Budget Overrun Risk** | % of projects with >80% utilization | <20% | Daily | Finance Mgr | Daily |
| **Vendor Risk Score** | Avg of vendor risk scores | <50 | Weekly | Finance Mgr | Weekly |
| **Donor Compliance Risk** | # of rule violations | 0 | Real-time | Compliance | Real-time |
| **Critical Findings** | # of critical audit findings | 0 | Monthly | Auditor | Monthly |
| **Recovery Readiness** | % of disaster recovery checklist | 100% | Quarterly | Admin | Quarterly |

---

### **Category 5: Operational Efficiency KPIs**

| KPI | Formula | Target | Refresh | Owner | Dashboard |
|-----|---------|--------|---------|-------|-----------|
| **Manual GL Entries** | # of manually created entries | <5% | Weekly | Finance Mgr | Weekly |
| **Invoice Auto-Approval Rate** | % of invoices approved automatically | >90% | Weekly | Finance Mgr | Weekly |
| **Month-End Close Time** | Days to close period | <2 days | Monthly | Finance Mgr | Monthly |
| **Report Generation Time** | Minutes to generate report | <5 min | On-demand | Finance Mgr | On-demand |
| **Query Performance** | API latency for finance queries | <1 sec | Daily | Tech Lead | Daily |
| **System Uptime** | % of time finance system available | 99.9% | Daily | Tech Lead | Daily |

---

### **Category 6: Compliance & Audit KPIs**

| KPI | Formula | Target | Refresh | Owner | Dashboard |
|-----|---------|--------|---------|-------|-----------|
| **Audit Trail Coverage** | % of GL entries with source link | 100% | Real-time | Auditor | Real-time |
| **Rule Violations** | # of donor rule violations detected | 0 | Real-time | Compliance | Real-time |
| **Violation Response Time** | Hours to resolve violation | <24 hrs | Daily | Compliance | Daily |
| **SOD Violations** | # of segregation of duties breaches | 0 | Real-time | Compliance | Real-time |
| **Audit Findings** | # of open audit findings | <5 | Monthly | Auditor | Monthly |
| **Compliance Certification** | % of grants with compliance sign-off | 100% | Monthly | Auditor | Monthly |

---

### **Category 7: Donor Reporting KPIs**

| KPI | Formula | Target | Refresh | Owner | Dashboard |
|-----|---------|--------|---------|-------|-----------|
| **Report Submission On-Time** | % of reports submitted by deadline | 100% | Monthly | Grant Mgr | Monthly |
| **Report Accuracy** | % of audits with zero findings | 90%+ | Quarterly | Auditor | Quarterly |
| **Days to Generate Donor Report** | Time from month-end to report ready | <5 days | Monthly | Grant Mgr | Monthly |
| **Donor Questions/Clarifications** | # of donor follow-up questions | <2 per report | After submission | Grant Mgr | Monthly |
| **Grant Audit Status** | % of grants with current audit | 100% | Quarterly | Auditor | Quarterly |

---

### **Category 8: Financial Health KPIs**

| KPI | Formula | Target | Refresh | Owner | Dashboard |
|-----|---------|--------|---------|-------|-----------|
| **Organizational Health Score** | Weighted avg of health dimensions | >75 | Daily | CFO | Daily |
| **Project Health Score** | % of projects with >75 health | >80% | Daily | Finance Mgr | Daily |
| **Grant Health Score** | % of grants on track | >90% | Daily | Grant Mgr | Daily |
| **Financial Stress Index** | (Cash/Payables) + (Budget/Allocation) | >1.5 | Daily | Treasurer | Daily |
| **Forecast Accuracy** | % forecasts within 10% of actual | 90%+ | Monthly | Finance Mgr | Monthly |

---

## KPI Ownership & Review

```
CFO (Reviews Quarterly)
├─ Organizational Health Score
├─ Financial Stress Index
├─ Compliance Certification
└─ Audit Findings Summary

Finance Manager (Reviews Daily)
├─ Budget Utilization
├─ Over-Budget Projects
├─ GL Balance
├─ Three-Way Match Rate
├─ Invoice Processing Time
├─ Manual GL Entries
└─ Report Generation Time

Treasurer (Reviews Daily)
├─ Cash Position
├─ Days of Cash
├─ Payables Outstanding
├─ Payment On-Time Rate
├─ Liquidity Risk Score
└─ Forecast Accuracy

Compliance Officer (Reviews Real-time)
├─ Donor Compliance Risk
├─ Rule Violations
├─ SOD Violations
└─ Violation Response Time

Auditor (Reviews Monthly/Quarterly)
├─ Audit Trail Coverage
├─ Audit Findings
├─ Critical Findings
└─ Compliance Certification
```

---

## KPI Targets by Organization Size

### **Small NGO (Annual budget: $1-5M)**

| KPI | Target |
|-----|--------|
| Days of Cash | 30+ days |
| Budget Utilization | 85-95% |
| Payment On-Time Rate | 90%+ |
| Budget Accuracy | ±10% |
| Reconciliation Variance | <$1,000 |
| Rule Violations | 0 |

### **Medium NGO (Annual budget: $5-50M)**

| KPI | Target |
|-----|--------|
| Days of Cash | 45+ days |
| Budget Utilization | 85-95% |
| Payment On-Time Rate | 95%+ |
| Budget Accuracy | ±5% |
| Reconciliation Variance | <$5,000 |
| Rule Violations | 0 |

### **Large NGO (Annual budget: $50M+)**

| KPI | Target |
|-----|--------|
| Days of Cash | 60+ days |
| Budget Utilization | 85-95% |
| Payment On-Time Rate | 98%+ |
| Budget Accuracy | ±2% |
| Reconciliation Variance | <$10,000 |
| Rule Violations | 0 |

---

## KPI Dashboards by Role

### **CFO Dashboard**
```
Top Section (Real-time):
├─ Organizational Health Score: 82/100
├─ Cash Position: $2.5M (30 days of operations)
├─ Budget Utilization: 87%
├─ Critical Findings: 0

Middle Section (Daily):
├─ Over-Budget Projects: 1 (Project X: 105%)
├─ Pending Approvals: 5 invoices
├─ Risk Alerts: 1 (Liquidity stress in 45 days)

Bottom Section (Weekly):
├─ Budget vs. Actual (last 4 weeks)
├─ Cash Forecast (next 90 days)
├─ Project Health Trends
└─ Audit Findings Tracker
```

### **Finance Manager Dashboard**
```
Top Section (Real-time):
├─ GL Balance: DR = CR ✓
├─ Three-Way Match Rate: 99.2%
├─ Unmatched Invoices: 2
├─ Payment On-Time Rate: 96%

Middle Section (Daily):
├─ Budget Utilization by Project
├─ Over-Budget Projects: 1
├─ Invoice Processing Queue: 12 pending
└─ Reconciliation Status: 95% complete

Bottom Section (Weekly):
├─ Manual GL Entries: 3 this week
├─ Month-End Close Progress
├─ Variance Analysis (Budget vs. Actual)
└─ Compliance Violations: 0
```

### **Treasurer Dashboard**
```
Top Section (Real-time):
├─ Cash Position by Bank: Total $X
├─ Days of Cash: 45 days
├─ Payables Due in 7 days: $Y

Middle Section (Daily):
├─ Cash Forecast (7, 30, 90 days)
├─ Upcoming Payments (this week)
├─ FX Exposure by Currency
└─ Liquidity Risk Score: 35/100 (low)

Bottom Section (Weekly):
├─ Payment Processing Time
├─ Bank Reconciliation Variance
├─ Treasury Recommendations (AI)
└─ Historical Cash Trends
```

---

## KPI Alerts & Escalation

```
Alert Triggers:

🔴 CRITICAL (Immediate escalation to CFO):
├─ Cash < 7 days of operations
├─ Budget overrun >20%
├─ Rule violation detected
├─ Reconciliation variance >$10k
└─ Audit finding critical severity

🟠 WARNING (Alert to Finance Manager):
├─ Cash < 30 days of operations
├─ Budget utilization > 95%
├─ Over-budget project detected
├─ Invoice unmatched >2 days
└─ Reconciliation variance >$1k

🟡 INFO (Log to dashboard):
├─ Invoice processing >24 hours
├─ Forecast variance >10%
├─ Payment on-time rate <95%
└─ Manual GL entry created
```

---

## KPI Reporting

**Monthly KPI Report for CFO**:
```
Key Metrics Summary
├─ Organizational Health: 82 (↑ from 80 last month)
├─ Cash Position: $2.5M (↔ stable)
├─ Budget Utilization: 87% (↓ from 89%)
├─ Compliance Score: 100% (↔ maintained)

Variances Explained
├─ Project X over budget: Approved scope change +$50k
├─ Lower utilization: 2 projects delayed to next month

Recommendations
├─ Approve budget reallocation from Project A to B
├─ Monitor Project C health (risk score: 72)
├─ Confirm grant closure documents ready

Audit Status
├─ Open findings: 0
├─ Recent audits completed: 3 grants
└─ Next scheduled audits: Q4 2026
```

---

## Conclusion

Finance KPI Catalog provides:
- ✅ **50+ KPIs** organized by category
- ✅ **Clear ownership** (CFO, Finance Manager, Treasurer, etc.)
- ✅ **Measurable targets** (specific, time-bound)
- ✅ **Automated tracking** (real-time dashboards)
- ✅ **Role-specific views** (each role sees relevant KPIs)
- ✅ **Alert thresholds** (critical, warning, info)
- ✅ **Scalable targets** (by organization size)

**Every phase tracked against these KPIs.**
