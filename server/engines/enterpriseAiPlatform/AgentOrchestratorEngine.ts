import { AIRegistryEngine } from "./AIRegistryEngine";
import { AgentDomain, AgentRegistration, AIRequest, AIResponse } from "./EnterpriseAITypes";
import { AIGatewayEngine } from "./AIGatewayEngine";

export interface AgentPlan {
  requestId: string;
  primaryAgent: AgentRegistration;
  collaboratingAgents: AgentRegistration[];
  steps: Array<{
    order: number;
    agentId: string;
    action: string;
  }>;
}

export class AgentOrchestratorEngine {
  constructor(
    private readonly registry: AIRegistryEngine,
    private readonly gateway: AIGatewayEngine,
  ) {}

  plan(input: {
    requestId: string;
    primaryDomain: AgentDomain;
    collaborationDomains?: AgentDomain[];
    goal: string;
  }): AgentPlan {
    const agents = this.registry.listAgents().filter((agent) => agent.status === "approved");
    const primaryAgent = agents.find((agent) => agent.domain === input.primaryDomain);
    if (!primaryAgent) throw new Error(`No approved ${input.primaryDomain} agent registered`);

    const collaboratingAgents = (input.collaborationDomains ?? [])
      .map((domain) => agents.find((agent) => agent.domain === domain))
      .filter((agent): agent is AgentRegistration => Boolean(agent));

    return {
      requestId: input.requestId,
      primaryAgent,
      collaboratingAgents,
      steps: [
        {
          order: 1,
          agentId: primaryAgent.id,
          action: `Analyze primary goal: ${input.goal}`,
        },
        ...collaboratingAgents.map((agent, index) => ({
          order: index + 2,
          agentId: agent.id,
          action: `Contribute ${agent.domain} evidence and constraints.`,
        })),
      ],
    };
  }

  execute(request: AIRequest): AIResponse {
    return this.gateway.routeRequest(request);
  }
}
