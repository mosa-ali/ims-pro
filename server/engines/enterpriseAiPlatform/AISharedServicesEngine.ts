import { AIResponse, KnowledgeGraphEdge, KnowledgeGraphNode } from "./EnterpriseAITypes";

export interface RAGQueryResult {
  query: string;
  citations: string[];
  contextItems: Array<{
    id: string;
    score: number;
    summary: string;
  }>;
}

export interface EvaluationResult {
  passed: boolean;
  score: number;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
}

export interface ObservabilityEvent {
  requestId: string;
  eventType: "request" | "response" | "approval" | "error" | "cost";
  timestamp: string;
  metadata: Record<string, unknown>;
}

export class AISharedServicesEngine {
  buildKnowledgeGraph(input: {
    nodes: KnowledgeGraphNode[];
    edges: KnowledgeGraphEdge[];
  }): { nodes: KnowledgeGraphNode[]; edges: KnowledgeGraphEdge[] } {
    return {
      nodes: this.uniqueById(input.nodes),
      edges: input.edges,
    };
  }

  retrieveContext(query: string, corpus: Array<{ id: string; text: string }>, limit = 5): RAGQueryResult {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = corpus.map((item) => {
      const text = item.text.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0) / Math.max(terms.length, 1);
      return {
        id: item.id,
        score,
        summary: item.text.slice(0, 240),
      };
    });

    return {
      query,
      citations: scored.filter((item) => item.score > 0).slice(0, limit).map((item) => item.id),
      contextItems: scored.sort((a, b) => b.score - a.score).slice(0, limit),
    };
  }

  evaluateResponse(response: AIResponse): EvaluationResult {
    const checks = [
      {
        name: "governance_audit_present",
        passed: Boolean(response.governance.auditId),
        message: "Every AI response must include audit trace.",
      },
      {
        name: "blocked_requests_do_not_emit_decisions",
        passed: response.status !== "blocked" || Object.keys(response.output.structuredData).length === 0,
        message: "Blocked requests must not execute or emit business decisions.",
      },
      {
        name: "cost_recorded",
        passed: response.observability.estimatedCost >= 0,
        message: "Every AI response must carry cost telemetry.",
      },
    ];

    return {
      passed: checks.every((check) => check.passed),
      score: Math.round((checks.filter((check) => check.passed).length / checks.length) * 100),
      checks,
    };
  }

  observe(response: AIResponse): ObservabilityEvent {
    return {
      requestId: response.requestId,
      eventType: "response",
      timestamp: new Date().toISOString(),
      metadata: {
        status: response.status,
        riskLevel: response.governance.riskLevel,
        estimatedCost: response.observability.estimatedCost,
        modelId: response.observability.modelId,
      },
    };
  }

  private uniqueById<T extends { id: string }>(items: T[]): T[] {
    return [...new Map(items.map((item) => [item.id, item])).values()];
  }
}
