import { AIRequest, AISession } from "./EnterpriseAITypes";

export class AISessionEngine {
  createSession(request: AIRequest): AISession {
    const now = new Date().toISOString();

    return {
      sessionId: `ai-session-${request.requestId}`,
      conversationId: request.conversationId ?? `ai-conversation-${request.requestId}`,
      request,
      scope: request.scope,
      permissions: request.permissions ?? this.defaultPermissionsForRole(request.scope.userRole),
      dataClassification: request.dataClassification ?? "internal",
      context: {
        requestContext: request.context,
        organizationId: request.scope.organizationId,
        operatingUnitId: request.scope.operatingUnitId ?? null,
        locale: request.scope.locale ?? "en",
      },
      memory: {},
      ragEvidence: [],
      promptSections: {
        system: [],
        organizationContext: [],
        domainContext: [],
        userTask: [],
        ragEvidence: [],
        memory: [],
        outputSchema: [],
      },
      selectedAgentId: request.agentId,
      approval: {
        requirement: "none",
        policyIds: [],
        reasons: [],
      },
      telemetry: {
        middlewareTrace: [],
        startedAt: now,
        estimatedCost: 0,
        tokenEstimate: 0,
      },
      auditId: `ai-audit-${request.requestId}`,
    };
  }

  private defaultPermissionsForRole(role: string): string[] {
    const elevatedRoles = ["AI Governance Lead", "Finance Director", "Country Director", "Executive Director"];
    return elevatedRoles.includes(role) ? ["ai:read", "ai:analyze", "ai:tool:execute"] : ["ai:read", "ai:analyze"];
  }
}
