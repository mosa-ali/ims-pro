import { AISession, PromptRegistration, PromptSections } from "./EnterpriseAITypes";

export class AIPromptAssemblyEngine {
  assemble(session: AISession, prompt?: PromptRegistration): { prompt: string; sections: PromptSections } {
    const sections: PromptSections = {
      system: [
        "You are an IMS Enterprise AI Platform agent.",
        "Respect organization and operating-unit scope, cite evidence, and expose uncertainty.",
        ...(prompt ? [prompt.template] : []),
      ],
      organizationContext: [
        `organizationId=${session.scope.organizationId}`,
        `operatingUnitId=${session.scope.operatingUnitId ?? "all"}`,
        `locale=${session.scope.locale ?? "en"}`,
      ],
      domainContext: [
        `agentId=${session.request.agentId}`,
        `dataClassification=${session.dataClassification}`,
      ],
      userTask: [session.request.task],
      ragEvidence: session.ragEvidence.map((item) => `${item.id}: ${item.summary}`),
      memory: Object.entries(session.memory).map(([key, value]) => `${key}: ${String(value)}`),
      outputSchema: [
        "Return summary, structuredData, citations, governance, and observability.",
      ],
    };

    return {
      prompt: Object.values(sections).flat().filter(Boolean).join("\n"),
      sections,
    };
  }
}
