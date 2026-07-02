# Phase 9 - AI Governance and Operating Model

## Purpose

The AI Operating Model defines who can create, approve, use, update, override, and monitor AI capabilities in IMS. This is the AI Governance Manual for the platform.

## Operating Roles

| Role | Responsibility |
|---|---|
| AI Governance Lead | Owns AI governance, approval rules, quality controls, and hallucination tracking |
| AI Platform Owner | Owns platform roadmap, cost management, provider strategy, and operational SLAs |
| Security Officer | Approves tools, model access, data protection, and high-risk integrations |
| Data Protection Officer | Reviews personal data, sensitive data, retention, and data residency |
| Business Owner | Approves domain agents and business use cases |
| Domain Lead | Creates domain prompts and validates domain behavior |
| Finance Director | Approves finance, treasury, budget, and donor-compliance AI use cases |
| Country Director | Approves country-level executive use and high-impact recommendations |
| Executive Director | Can override within governance policy |
| AI Analyst | Maintains evaluations, telemetry, and quality reporting |

## Authority Matrix

| Question | Authorized roles |
|---|---|
| Who can create prompts? | Domain Lead, AI Product Owner, Finance Director |
| Who approves prompts? | AI Governance Lead, Security Officer |
| Who approves agents? | AI Governance Lead, Business Owner, CIO or equivalent |
| Who approves tools? | Security Officer, Data Protection Officer, AI Governance Lead |
| Who can use AI? | Approved IMS roles listed in AI policy |
| Who can override AI? | AI Governance Lead, Executive Director, approved Country Director |
| Who updates models? | AI Platform Owner with AI Governance Lead and Security Officer approval |
| Who manages AI costs? | CFO, Finance Director, AI Platform Owner |
| Who measures AI quality? | AI Governance Lead, AI Analyst, Business Owner |
| Who tracks hallucinations? | AI Governance Lead |

## Prompt Lifecycle

1. Draft prompt is created by an authorized creator.
2. Prompt is assigned a semantic version.
3. Evaluation test cases are attached.
4. Security and data-sensitivity review is completed.
5. Domain lead validates behavior.
6. AI Governance Lead approves.
7. Prompt is published to Prompt Registry.
8. Prompt usage is monitored.
9. Prompt is deprecated or rolled back when needed.

## Agent Lifecycle

1. Business need is documented.
2. Agent domain, allowed tools, memory policy, and approval policy are defined.
3. Prompt set and model set are selected from approved registries.
4. Security review is completed.
5. Evaluation suite is completed.
6. Human approval workflow is configured.
7. Agent is approved by Business Owner and AI Governance Lead.
8. Agent is monitored for quality, cost, and safety.

## Tool Lifecycle

Tools are higher risk than prompts because they connect AI to IMS capabilities.

Required tool metadata:

- tool owner
- business domain
- read/write classification
- data classes accessed
- risk level
- required approval
- input schema
- output schema
- rate limits
- audit requirements
- rollback behavior

## Hallucination Tracking

Every suspected hallucination must capture:

- AI response id
- user id and role
- agent id
- prompt version
- model id
- context sources
- incorrect claim
- business impact
- correction
- severity
- root cause
- mitigation

## AI Quality Measurement

Quality must be measured through:

- evaluation pass rate
- hallucination rate
- citation accuracy
- user override rate
- human approval rejection rate
- recommendation acceptance rate
- business outcome impact
- cost per successful decision
- latency
- escalation frequency

## Cost Management

Cost management must include:

- model-level cost tracking
- agent-level cost tracking
- user and department usage reporting
- monthly budget thresholds
- high-cost query alerts
- fallback to lower-cost models when appropriate
- cache and retrieval optimization

## Human Approval Policy

| Risk level | Requirement |
|---|---|
| Low | No approval required, audit required |
| Medium | Approval recommended depending on tool |
| High | Human approval required |
| Critical | Autonomous execution blocked |

## Governance KPIs

- approved prompts count
- deprecated prompts count
- prompt rollback count
- model changes per quarter
- AI incidents by severity
- hallucination rate
- average approval time
- high-risk tool usage
- AI spend by domain
- evaluation coverage
- user satisfaction

## Governance Principle

AI is advisory by default. It becomes operational only through approved tools, approved workflows, and human accountability.
