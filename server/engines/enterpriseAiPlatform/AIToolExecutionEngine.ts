import { AIRegistryEngine } from "./AIRegistryEngine";
import { ToolExecutionRequest, ToolExecutionResult } from "./EnterpriseAITypes";

export class AIToolExecutionEngine {
  private readonly invocationCount = new Map<string, number>();

  constructor(private readonly registry: AIRegistryEngine) {}

  execute(input: ToolExecutionRequest): ToolExecutionResult {
    const tool = this.registry.getToolForScope(input.toolId, input.session.scope);
    if (!tool || tool.status !== "approved") {
      return this.blocked(input, "Tool is not registered or approved.");
    }

    const missingPermission = (tool.requiredPermissions ?? []).find((permission) => !input.session.permissions.includes(permission));
    if (missingPermission) {
      return this.blocked(input, `Missing permission ${missingPermission}.`);
    }

    if (tool.requiresHumanApproval || input.session.approval.requirement === "required") {
      return {
        toolId: input.toolId,
        status: "requires_human_approval",
        normalizedResult: {},
        auditId: `${input.session.auditId}-${input.toolId}`,
        reasons: ["Human approval is required before this tool can execute."],
      };
    }

    const countKey = `${input.session.sessionId}:${input.toolId}`;
    const nextCount = (this.invocationCount.get(countKey) ?? 0) + 1;
    this.invocationCount.set(countKey, nextCount);
    if (tool.rateLimitPerMinute && nextCount > tool.rateLimitPerMinute) {
      return this.blocked(input, "Tool rate limit exceeded.");
    }

    return {
      toolId: input.toolId,
      status: "completed",
      normalizedResult: {
        toolId: input.toolId,
        domain: tool.domain,
        organizationId: input.session.scope.organizationId,
        operatingUnitId: input.session.scope.operatingUnitId ?? null,
        input,
      },
      auditId: `${input.session.auditId}-${input.toolId}`,
      reasons: [],
    };
  }

  private blocked(input: ToolExecutionRequest, reason: string): ToolExecutionResult {
    return {
      toolId: input.toolId,
      status: "blocked",
      normalizedResult: {},
      auditId: `${input.session.auditId}-${input.toolId}`,
      reasons: [reason],
    };
  }
}
