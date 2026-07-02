import {
  AICapabilityRegistration,
  AgentRegistration,
  AIArtifactType,
  AIModelRegistration,
  AIRegistrySummary,
  AIScope,
  ContextPolicy,
  MemoryPolicy,
  PromptRegistration,
  RegistryStatus,
  ToolRegistration,
} from "./EnterpriseAITypes";

export class AIRegistryEngine {
  private readonly prompts = new Map<string, PromptRegistration>();
  private readonly models = new Map<string, AIModelRegistration>();
  private readonly tools = new Map<string, ToolRegistration>();
  private readonly agents = new Map<string, AgentRegistration>();
  private readonly memories = new Map<string, MemoryPolicy>();
  private readonly contexts = new Map<string, ContextPolicy>();
  private readonly capabilities = new Map<string, AICapabilityRegistration>();

  registerPrompt(prompt: PromptRegistration): PromptRegistration {
    this.prompts.set(prompt.id, prompt);
    return prompt;
  }

  registerModel(model: AIModelRegistration): AIModelRegistration {
    this.models.set(model.id, model);
    return model;
  }

  registerTool(tool: ToolRegistration): ToolRegistration {
    this.tools.set(tool.id, tool);
    return tool;
  }

  registerAgent(agent: AgentRegistration): AgentRegistration {
    this.agents.set(agent.id, agent);
    return agent;
  }

  registerMemoryPolicy(policy: MemoryPolicy): MemoryPolicy {
    this.memories.set(policy.id, policy);
    return policy;
  }

  registerContextPolicy(policy: ContextPolicy): ContextPolicy {
    this.contexts.set(policy.id, policy);
    return policy;
  }

  registerCapability(capability: AICapabilityRegistration): AICapabilityRegistration {
    this.capabilities.set(capability.id, capability);
    return capability;
  }

  approve(type: AIArtifactType, id: string): void {
    this.updateStatus(type, id, "approved");
  }

  getAgent(id: string): AgentRegistration | undefined {
    return this.agents.get(id);
  }

  getAgentForScope(id: string, scope: AIScope): AgentRegistration | undefined {
    return this.findScoped(this.agents, id, scope);
  }

  getModel(id: string): AIModelRegistration | undefined {
    return this.models.get(id);
  }

  getModelForScope(id: string, scope: AIScope): AIModelRegistration | undefined {
    return this.findScoped(this.models, id, scope);
  }

  getPrompt(id: string): PromptRegistration | undefined {
    return this.prompts.get(id);
  }

  getPromptForScope(id: string, scope: AIScope): PromptRegistration | undefined {
    return this.findScoped(this.prompts, id, scope);
  }

  getTool(id: string): ToolRegistration | undefined {
    return this.tools.get(id);
  }

  getToolForScope(id: string, scope: AIScope): ToolRegistration | undefined {
    return this.findScoped(this.tools, id, scope);
  }

  listAgents(): AgentRegistration[] {
    return [...this.agents.values()];
  }

  listCapabilities(scope?: AIScope): AICapabilityRegistration[] {
    const capabilities = [...this.capabilities.values()];
    if (!scope) return capabilities;
    return capabilities.filter((capability) => this.matchesScope(capability, scope));
  }

  buildRegistrySummary(): AIRegistrySummary {
    return {
      prompt: this.prompts.size,
      model: this.models.size,
      tool: this.tools.size,
      agent: this.agents.size,
      memory: this.memories.size,
      context: this.contexts.size,
      capability: this.capabilities.size,
    };
  }

  private updateStatus(type: AIArtifactType, id: string, status: RegistryStatus): void {
    const registry = {
      prompt: this.prompts,
      model: this.models,
      tool: this.tools,
      agent: this.agents,
      memory: this.memories,
      context: this.contexts,
    }[type] as Map<string, { status: RegistryStatus }>;
    const item = registry.get(id);
    if (!item) throw new Error(`${type} ${id} not found`);
    item.status = status;
  }

  private findScoped<T extends { id: string; organizationId?: number; operatingUnitId?: number | null }>(
    registry: Map<string, T>,
    id: string,
    scope: AIScope,
  ): T | undefined {
    const candidates = [...registry.values()].filter((item) => item.id === id && this.matchesScope(item, scope));
    return candidates.sort((a, b) => this.scopeRank(b) - this.scopeRank(a))[0] ?? registry.get(id);
  }

  private matchesScope(item: { organizationId?: number; operatingUnitId?: number | null }, scope: AIScope): boolean {
    const organizationMatches = item.organizationId === undefined || item.organizationId === scope.organizationId;
    const unitMatches = item.operatingUnitId === undefined || item.operatingUnitId === scope.operatingUnitId;
    return organizationMatches && unitMatches;
  }

  private scopeRank(item: { organizationId?: number; operatingUnitId?: number | null }): number {
    return (item.organizationId !== undefined ? 1 : 0) + (item.operatingUnitId !== undefined ? 1 : 0);
  }
}
