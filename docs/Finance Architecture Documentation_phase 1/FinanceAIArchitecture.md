# Finance AI Architecture

**Purpose**: AI/ML layer for intelligent decision support  
**Applies to**: Phases 10–12; decision agents  

---

## AI Agent Architecture

### **Five Collaborative Agents**

```
┌─────────────────┐
│ Treasury Agent  │  Manages: Cash, payments, liquidity
├─────────────────┤
│ Budget Agent    │  Manages: Allocations, utilization, forecasts
├─────────────────┤
│ Grant Agent     │  Manages: Donor compliance, reporting
├─────────────────┤
│ Compliance Agent│  Manages: Rules, violations, audit
└─────────────────┘
        ↓
┌──────────────────────┐
│ Executive Agent      │  Synthesizes insights
│ (orchestrator)       │  Generates recommendations
└──────────────────────┘
        ↓
┌──────────────────────┐
│ User Dashboard       │  Display recommendations
│ (with override)      │  Allow manual intervention
└──────────────────────┘
```

---

### **Agent 1: Treasury Agent**

**Inputs**:
- Cash position (current, forecast 7/30/90 days)
- Payables (amount, due dates)
- Receivables (expected)
- Bank balances per account

**Decision Model**:
```
IF cash_7day < minimum_cash_requirement
   AND payables_due_in_7days > cash_available
THEN {
  recommendation: "Delay vendor payments by X days"
  confidence: 85%
  impact: {
    cash_improvement: +$20k,
    vendor_relationship_impact: -2%,
    risk_reduction: "liquidity_stress → manageable"
  }
}
```

**Outputs**:
- Payment timing recommendations
- Bank optimization suggestions
- Liquidity stress alerts
- FX hedging recommendations (Phase 11+)

---

### **Agent 2: Budget Agent**

**Inputs**:
- Budget allocation (hierarchical)
- Spending to date
- Commitments pending
- Forecast utilization
- Project health scores

**Decision Model**:
```
IF budget_utilization > 80%
   AND forecast_shows_overrun > 90%
   AND project_completion < 50%
THEN {
  recommendation: "Reallocate $X from Project A to Project B"
  confidence: 78%
  impact: {
    project_a_budget: "from $100k to $80k",
    project_b_budget: "from $80k to $100k",
    risk_reduction: "overrun → within_limits"
  }
}
```

**Outputs**:
- Budget reallocation suggestions
- Overrun risk alerts
- Utilization optimization
- Cost center recommendations

---

### **Agent 3: Grant Agent**

**Inputs**:
- Grant timeline (start, end, milestones)
- Donor rules & requirements
- Spending vs. budget per grant
- Reporting schedule
- Compliance violations (if any)

**Decision Model**:
```
IF grant_end_date < 60_days
   AND closure_package_not_prepared
THEN {
  recommendation: "Prepare grant closure package; submit 30 days before end"
  confidence: 95%
  items_to_prepare: [
    "Final financial report",
    "Audit completion",
    "Compliance certification",
    "Lessons learned"
  ]
}
```

**Outputs**:
- Reporting deadline alerts
- Closure readiness assessment
- Compliance certification status
- Donor relationship recommendations

---

### **Agent 4: Compliance Agent**

**Inputs**:
- Donor rules per grant
- Internal policies
- Recent transactions
- Segregation of duties rules
- Audit findings

**Decision Model**:
```
IF transaction.vendor NOT IN approved_vendor_list
   AND transaction.amount > donor_threshold
   AND competitive_bidding NOT completed
THEN {
  violation: "USAID_CompetitiveBidding"
  severity: "critical"
  recommendation: "Obtain waivers or reopen procurement"
  confidence: 100%
}
```

**Outputs**:
- Rule violation detection (real-time)
- Audit finding recommendations
- SOD violation alerts
- Compliance certification readiness

---

### **Agent 5: Executive Agent**

**Inputs**:
- All recommendations from other agents
- Current financial position
- Organizational priorities
- Stakeholder concerns

**Decision Model**:
```
Synthesize multiple recommendations:
├─ Treasury: "Delay payment X by 5 days"
├─ Budget: "Reallocate $10k from Project A to B"
├─ Compliance: "Get USAID waiver for vendor Z"
└─ Executive Agent generates:
   {
     briefing: "Financial health is stable but tight...",
     recommendation_priority: [
       { rank: 1, action: "Approve payment delay", impact: "cash +$X" },
       { rank: 2, action: "Process budget reallocation", impact: "risk -10%" },
       { rank: 3, action: "Request USAID waiver", impact: "compliance resolved" }
     ],
     next_review: "In 7 days"
   }
```

**Outputs**:
- Executive briefing (synthesized)
- Prioritized recommendation list
- One-page financial summary
- Critical actions required

---

## Agent Communication Protocol

```typescript
interface AgentMessage {
  from: Agent;  // 'treasury', 'budget', 'grant', 'compliance'
  to: Agent;    // 'executive' or 'treasury'
  type: 'query' | 'insight' | 'recommendation' | 'request_override';
  payload: unknown;
  timestamp: DateTime;
  conversationId: UUID;  // Link related messages
}

// Example: Budget Agent requests Treasury Agent opinion
{
  from: 'budget',
  to: 'treasury',
  type: 'query',
  payload: {
    question: "Is $50k payment to Vendor X safe in next 7 days?",
    context: { currentCash: $100k, forecast7day: $80k }
  }
}

// Response from Treasury
{
  from: 'treasury',
  to: 'budget',
  type: 'insight',
  payload: {
    recommendation: "Safe; would leave $30k buffer",
    confidence: 92%
  }
}
```

---

## Confidence Scoring

Every recommendation includes confidence (0-100%):

```
Confidence Factors:
├─ Data completeness (0-30%): Are we missing data?
├─ Historical accuracy (0-30%): How accurate were past predictions?
├─ Model stability (0-20%): Is the model overfitting?
├─ External factors (0-20%): Are there outliers or anomalies?
└─ Total Confidence = Sum of factors

Examples:
├─ "Delay payment X by 5 days": 92% (high: data complete, model stable)
├─ "Reallocate budget Y": 78% (medium: some forecasting uncertainty)
├─ "Vendor Z is risky": 65% (medium: limited historical data on new vendor)
└─ "Grant closure ready": 95% (high: clear criteria, all checklist items done)
```

---

## Human Override Model

**Users ALWAYS have final say:**

```typescript
interface AgentRecommendation {
  agentId: string;
  recommendation: string;
  confidence: number;
  impact: { cashImpact?: number; riskImpact?: string; };
  createdAt: DateTime;
  expiresAt: DateTime;  // Recommendations expire after 7 days
}

interface UserDecision {
  recommendationId: string;
  userId: number;
  decision: 'approved' | 'rejected' | 'modified';
  reasoning: string;  // Why user overrode
  executedAt: DateTime;
}

// Audit log all overrides
await logAction({
  action: 'recommendation_override',
  agentId: 'treasury',
  recommendation: 'Delay payment X',
  userDecision: 'rejected',
  reasoning: 'Vendor relationship too important; pay on time',
});
```

---

## Model Versioning & Deployment

```
Model versions:
├─ v1.0 (Phase 10): Basic rules + simple ML
├─ v1.1 (Phase 11): Enhanced with historical data
├─ v2.0 (Phase 12): Deep learning with NLP

Deployment:
├─ Staging environment: Test model 1 week before prod
├─ Canary deployment: 10% of users first
├─ Full rollout: 100% when stable
├─ Rollback plan: Can revert to v1.0 instantly

Monitoring:
├─ Model accuracy: % of correct recommendations
├─ User acceptance: % of approvals vs. overrides
├─ Performance impact: API latency, resource usage
└─ Drift detection: If accuracy drops >5%, alert
```

---

## Training Data Sourcing

```
Historical data:
├─ 3+ years of transactions
├─ Anonymized (no PII)
├─ Balanced (oversampling rare cases)
├─ Split: 70% train, 15% validation, 15% test

Features used:
├─ Transaction amounts, dates, vendors
├─ Budget allocations, utilization, forecasts
├─ Donor rules, compliance history
├─ Cash positions, forecasts, FX rates
├─ Project health scores, timelines
└─ Outcomes (was recommendation accurate?)

Data quality checks:
├─ Missing value imputation
├─ Outlier detection & handling
├─ Feature scaling/normalization
└─ Temporal consistency (dates make sense)
```

---

## Model Evaluation Metrics

```
For Treasury Agent (payment timing):
├─ Accuracy: % of recommended delays that prevented liquidity crisis
├─ Precision: Of recommendations, how many were actually needed?
├─ Recall: Of actual crises, how many did model catch?
├─ RMSE: Forecast accuracy vs. actual cash on day X

For Budget Agent (reallocation):
├─ Accuracy: % of recommendations that stayed within budget
├─ Sensitivity: Did recommendation catch overruns early?
├─ Cost savings: $ amount saved by reallocations

For Compliance Agent:
├─ Accuracy: % of violations correctly identified
├─ False positives: % of alerts that were false alarms
├─ Time to detection: Days between violation and alert

For Executive Agent:
├─ User acceptance: % of recommendations approved
├─ Briefing quality: CFO satisfaction (survey)
└─ Actionability: % of recommendations executives could act on
```

---

## Hallucination Safeguards

**Prevent AI from making up data:**

```typescript
// ✅ SAFE: AI can only recommend, not execute
async function getAIRecommendation(financialData: FinancialData) {
  const recommendation = await aiModel.recommend(financialData);
  
  // Validation: Does recommendation exist in context?
  if (recommendation.projectId) {
    const project = await db.select().from(projects)
      .where(eq(projects.id, recommendation.projectId));
    
    if (!project) {
      throw new Error('AI recommended non-existent project');
    }
  }
  
  // Validation: Is recommendation within bounds?
  if (recommendation.allocationAmount > budget.allocated) {
    throw new Error('AI recommended more than budget allows');
  }
  
  return recommendation;
}

// ✅ ENFORCED: User must explicitly approve before execution
async function approveAndExecuteRecommendation(
  recommendationId: string,
  userId: number
) {
  const recommendation = await getRecommendation(recommendationId);
  
  // User sees: Recommendation + Raw data + Reasoning
  // User decides: Approve, Reject, Modify
  // Audit log: Who approved what and why
  
  if (userDecision === 'approved') {
    await executeAction(recommendation);
    await logApproval(userId, recommendationId);
  }
}
```

---

## Conclusion

Finance AI architecture:
- ✅ **5 collaborative agents** (Treasury, Budget, Grant, Compliance, Executive)
- ✅ **Confidence scoring** (every recommendation rated)
- ✅ **Human override** (users always decide)
- ✅ **Safe recommendations** (validated against real data)
- ✅ **Model versioning** (staged rollouts)
- ✅ **Monitoring** (accuracy, adoption, drift)
- ✅ **No hallucination** (guards against made-up data)

**All AI work must follow this architecture.**
