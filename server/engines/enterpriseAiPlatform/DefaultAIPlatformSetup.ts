import { EnterpriseAIPlatformEngine } from "./EnterpriseAIPlatformEngine";
import { AgentDomain } from "./EnterpriseAITypes";

const domains: AgentDomain[] = ["financial", "treasury", "budget", "procurement", "hr", "project", "compliance", "executive"];

export function createDefaultEnterpriseAIPlatform(): EnterpriseAIPlatformEngine {
  const platform = new EnterpriseAIPlatformEngine();

  platform.registry.registerModel({
    id: "model-reasoning-primary",
    provider: "openai",
    modelName: "provider-agnostic-reasoning-model",
    purpose: "reasoning",
    status: "approved",
    riskLevel: "medium",
    maxTokens: 120000,
  });
  platform.registry.registerModel({
    id: "model-local-redaction",
    provider: "local",
    modelName: "local-redaction-classifier",
    purpose: "classification",
    status: "approved",
    riskLevel: "low",
  });
  platform.registry.registerMemoryPolicy({
    id: "memory-org-standard",
    name: "Organization-scoped AI memory",
    retentionDays: 365,
    piiAllowed: false,
    scope: "organization",
    status: "approved",
  });
  platform.registry.registerContextPolicy({
    id: "context-finance-standard",
    name: "Finance context policy",
    maxContextItems: 20,
    includeAuditTrail: true,
    allowedDomains: domains,
    status: "approved",
  });

  for (const domain of domains) {
    platform.registry.registerPrompt({
      id: `prompt-${domain}-v1`,
      name: `${domain} agent prompt`,
      version: "1.0.0",
      ownerRole: "AI Product Owner",
      domain,
      status: "approved",
      template: `Act as the IMS ${domain} AI agent. Use evidence, cite sources, respect approvals, and never bypass governance.`,
      allowedModels: ["model-reasoning-primary"],
      hallucinationControls: ["cite-evidence", "show-uncertainty", "ask-for-approval-on-high-risk-actions"],
    });
    platform.registry.registerTool({
      id: `tool-${domain}-read`,
      name: `${domain} read tool`,
      domain,
      status: "approved",
      riskLevel: "low",
      requiresHumanApproval: false,
      requiredPermissions: ["ai:read"],
      rateLimitPerMinute: 60,
    });
    platform.registry.registerAgent({
      id: `agent-${domain}`,
      name: `${domain} AI Agent`,
      domain,
      status: "approved",
      modelIds: ["model-reasoning-primary"],
      promptIds: [`prompt-${domain}-v1`],
      toolIds: [`tool-${domain}-read`],
      memoryPolicyId: "memory-org-standard",
      approvalPolicyId: "ai-policy-standard",
    });
  }

  platform.registry.registerTool({
    id: "tool-payment-execute",
    name: "Payment execution tool",
    domain: "financial",
    status: "approved",
    riskLevel: "high",
    requiresHumanApproval: true,
    requiredPermissions: ["ai:tool:execute"],
    rateLimitPerMinute: 5,
  });

  [
    {
      id: "capability-financial-health",
      name: "Financial Health",
      agentId: "agent-financial",
      domain: "financial" as const,
      businessOwnerRole: "Finance Director",
      status: "production" as const,
      description: "Cross-engine financial health analysis.",
    },
    {
      id: "capability-treasury-advice",
      name: "Treasury Advice",
      agentId: "agent-treasury",
      domain: "treasury" as const,
      businessOwnerRole: "Treasury Manager",
      status: "production" as const,
      description: "Cash, liquidity, FX, and bank-risk recommendations.",
    },
    {
      id: "capability-budget-simulation",
      name: "Budget Simulation",
      agentId: "agent-budget",
      domain: "budget" as const,
      businessOwnerRole: "Finance Director",
      status: "planned" as const,
      description: "Scenario analysis for burn rate, procurement, grants, and exchange rates.",
    },
    {
      id: "capability-executive-briefing",
      name: "Executive Briefing",
      agentId: "agent-executive",
      domain: "executive" as const,
      businessOwnerRole: "Country Director",
      status: "production" as const,
      description: "Daily decision center summary with top risks, opportunities, and required decisions.",
    },
    {
      id: "capability-donor-impact-simulation",
      name: "Donor Impact Simulation",
      agentId: "agent-compliance",
      domain: "compliance" as const,
      businessOwnerRole: "Grant Manager",
      status: "planned" as const,
      description: "Simulation of donor compliance impact from spending, budget, and grant changes.",
    },
  ].forEach((capability) => platform.registry.registerCapability(capability));

  return platform;
}
