# Phase 9 - Memory, RAG, and Knowledge Graph Guide

## Purpose

Memory, RAG, and the Knowledge Graph allow IMS AI to reason across history, documents, transactions, and relationships while staying grounded in approved evidence.

## AI Memory Architecture

Memory is governed historical context. It is not unrestricted chat history.

### Memory Scopes

| Scope | Use |
|---|---|
| Session | Temporary task context |
| User | User preferences and approved working context |
| Organization | Organizational trends and prior decisions |
| Domain | Domain-specific patterns such as treasury, grants, HR, procurement |

### Memory Rules

- Memory must have retention policy.
- PII must be excluded unless explicitly approved.
- Sensitive donor or employee data must follow security classification.
- Memory must record source, timestamp, and owner.
- Memory must support deletion and correction.
- Memory must be auditable.

### Memory Examples

- Risk increased for four consecutive months.
- Treasury improved after mitigation.
- Grant compliance deteriorated since last quarter.
- A recommendation was rejected due to donor restrictions.
- A prompt version caused higher override rates.

## RAG Architecture

RAG retrieves approved context and attaches it to AI requests.

### RAG Sources

- policies
- donor agreements
- grant documents
- budgets
- procurement documents
- HR policies
- audit reports
- financial reports
- dashboards
- prior approved decisions

### RAG Flow

1. User submits request.
2. Gateway classifies request.
3. Context policy selects allowed sources.
4. Retrieval engine fetches context.
5. RAG engine ranks and filters.
6. Sensitive data filter is applied.
7. Context is attached with citations.
8. Agent produces answer with evidence.
9. Audit stores context references.

### RAG Requirements

- citations required
- source freshness visible
- source permissions enforced
- data classification enforced
- retrieval quality evaluated
- stale context warning required

## Knowledge Graph Architecture

The Knowledge Graph links IMS business entities so AI can reason across relationships.

### Core Nodes

- Organization
- Operating Unit
- Donor
- Grant
- Project
- Budget
- Budget Line
- Cash Account
- Bank
- Vendor
- Procurement
- Journal
- Employee
- Risk
- KPI
- Forecast
- Compliance Rule
- Report

### Core Relationships

| Relationship | Example |
|---|---|
| funds | Donor funds Grant |
| constrains | Grant constrains Budget Line |
| spends_against | Procurement spends against Budget |
| impacts | Cash impacts Risk |
| reports_to | Project reports to Donor |
| approves | Role approves Workflow |
| raises_risk | Vendor delay raises Project Risk |
| reconciles_to | Bank Account reconciles to GL |
| measures | KPI measures Financial Health |

## Knowledge Graph Use Cases

- donor impact simulation
- budget reallocation impact
- restricted-fund tracing
- cash-to-grant compliance reasoning
- project risk explanation
- procurement-to-payment-to-GL traceability
- executive decision center context
- anomaly root cause analysis

## Graph Governance

- Nodes must have source systems.
- Edges must have relationship type.
- Sensitive relationships must be permission-controlled.
- Graph updates must be event-driven where possible.
- AI may query the graph but must not mutate it without approved workflow.

## Memory, RAG, and Graph Interaction

Memory answers: What has happened over time?

RAG answers: What source documents support this answer?

Knowledge Graph answers: How are entities related?

Together they allow AI to produce grounded, contextual, and explainable recommendations.
