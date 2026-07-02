# Phase 9 - Agent Architecture Guide

## Purpose

Agents are governed IMS domain specialists. They combine prompts, models, tools, context, memory, approval rules, and evaluation criteria.

## Agent Definition

Each agent must define:

- agent id
- agent name
- domain
- business owner
- approved models
- approved prompts
- approved tools
- context policy
- memory policy
- approval policy
- evaluation suite
- observability requirements
- escalation path

## Core Agents

| Agent | Purpose |
|---|---|
| Financial AI Agent | Cross-engine financial analysis, narratives, and decisions |
| Treasury AI Agent | Cash, liquidity, FX, bank risk, and payment optimization advice |
| Budget AI Agent | Budget availability, commitments, forecasts, and scenarios |
| Procurement AI Agent | P2P analysis, supplier risk, procurement workflow intelligence |
| HR AI Agent | Workforce, payroll, staffing, policy, and HR risk intelligence |
| Project AI Agent | Project performance, grant alignment, milestones, and delivery risk |
| Compliance AI Agent | Donor, audit, restrictions, approvals, and policy compliance |
| Executive AI Agent | Executive summaries, top risks, decisions, opportunities, and board reporting |

## Agent Orchestration Modes

### Single-Agent Mode

Used when one domain can answer safely.

Example: Treasury Agent explains cash coverage.

### Multi-Agent Collaboration

Used when a decision crosses domains.

Example:

1. Executive Agent receives decision question.
2. Financial Agent provides financial health.
3. Treasury Agent provides cash and liquidity.
4. Budget Agent provides budget impact.
5. Compliance Agent provides donor restrictions.
6. Executive Agent consolidates recommendation.

### Human-in-the-Loop Mode

Used when tool execution or high-risk recommendation requires approval.

## Agent Boundaries

Agents must not:

- directly write to the database
- bypass service and workflow layers
- approve their own recommendations
- call unregistered tools
- use unapproved prompts
- use unapproved models
- retain memory outside policy
- hide uncertainty

## Agent Response Standard

Every agent response should include:

- answer or recommendation
- evidence
- assumptions
- uncertainty
- confidence explanation
- risks
- required human approval, if any
- owner
- next action
- audit id

## Domain Agent Responsibilities

### Financial AI Agent

- financial health
- risk forecasting
- anomaly interpretation
- KPI scorecard
- executive finance narrative
- document/report-ready summaries

### Treasury AI Agent

- cash coverage
- liquidity risk
- FX exposure
- bank concentration
- payment optimization
- cash scenario planning

### Budget AI Agent

- budget availability
- commitment impact
- variance analysis
- burn-rate analysis
- forecast scenarios
- reallocation recommendations

### Procurement AI Agent

- P2P cycle risk
- supplier risk
- invoice delays
- procurement compliance
- payment impact
- bottleneck detection

### HR AI Agent

- workforce cost
- payroll risk
- staffing gaps
- HR compliance
- role-based permissions
- people-related project constraints

### Project AI Agent

- project delivery risk
- grant alignment
- workplan progress
- timeline risk
- milestone blockers
- operational constraints

### Compliance AI Agent

- donor compliance
- restricted funds
- approval rules
- segregation of duties
- audit readiness
- sanctions and policy checks

### Executive AI Agent

- top five recommendations
- emerging risks
- required decisions
- opportunities
- board-level narratives
- country director daily briefing

## Agent Approval Checklist

- Business owner assigned.
- Prompt version approved.
- Model approved.
- Tools registered and approved.
- Memory policy approved.
- Context policy approved.
- Evaluation suite passed.
- Human approval path configured.
- Observability enabled.
- Cost limit configured.
