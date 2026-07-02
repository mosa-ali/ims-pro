import { AISession, RAGEvidenceItem } from "./EnterpriseAITypes";

export interface ContextCompositionResult {
  scopedContext: Record<string, unknown>;
  evidence: RAGEvidenceItem[];
}

export class AIContextCompositionEngine {
  compose(session: AISession): ContextCompositionResult {
    const scopedContext = {
      organizationId: session.scope.organizationId,
      operatingUnitId: session.scope.operatingUnitId ?? null,
      userId: session.scope.userId,
      userRole: session.scope.userRole,
      locale: session.scope.locale ?? "en",
      permissions: session.permissions,
      dataClassification: session.dataClassification,
      requestContext: session.request.context,
    };

    const evidence = this.buildEvidence(session);

    return {
      scopedContext,
      evidence,
    };
  }

  private buildEvidence(session: AISession): RAGEvidenceItem[] {
    const items = Object.entries(session.request.context).map(([key, value], index) => ({
      id: `${session.request.requestId}-context-${index + 1}`,
      score: 1,
      summary: `${key}: ${String(value).slice(0, 160)}`,
      sourceType: "system" as const,
      organizationId: session.scope.organizationId,
      operatingUnitId: session.scope.operatingUnitId ?? null,
    }));

    return items.filter((item) => item.summary.length > 0);
  }
}
