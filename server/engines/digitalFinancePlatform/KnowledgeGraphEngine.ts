import {
  DigitalFinanceDomain,
  DigitalFinanceScope,
  KnowledgeGraphEdge,
  KnowledgeGraphNode,
  KnowledgeGraphQueryResult,
} from "./DigitalFinanceTypes";

export class KnowledgeGraphEngine {
  private readonly nodes = new Map<string, KnowledgeGraphNode>();
  private readonly edges = new Map<string, KnowledgeGraphEdge>();

  upsertNode(node: KnowledgeGraphNode): KnowledgeGraphNode {
    this.nodes.set(node.id, node);
    return node;
  }

  upsertEdge(edge: KnowledgeGraphEdge): KnowledgeGraphEdge {
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) {
      throw new Error("Knowledge graph edge references missing node.");
    }
    this.edges.set(edge.id, edge);
    return edge;
  }

  buildEnterpriseGraph(scope: DigitalFinanceScope): KnowledgeGraphQueryResult {
    const orgNode = this.upsertNode({
      id: `org-${scope.organizationId}`,
      type: "organization",
      label: `Organization ${scope.organizationId}`,
      domain: "projects",
      properties: { organizationId: scope.organizationId },
    });
    const grantNode = this.upsertNode({
      id: "grant-7001",
      type: "grant",
      label: "Health Response Grant",
      domain: "grants",
      properties: { donorId: "donor-eu", utilizationPercent: 82 },
    });
    const cashNode = this.upsertNode({
      id: "cash-main-usd",
      type: "cash_account",
      label: "Main USD Cash Account",
      domain: "treasury",
      properties: { balance: 1250000, restricted: 420000 },
    });
    const budgetNode = this.upsertNode({
      id: "budget-medical-supplies",
      type: "budget_line",
      label: "Medical Supplies Budget Line",
      domain: "budget",
      properties: { available: 310000 },
    });
    const supplierNode = this.upsertNode({
      id: "supplier-501",
      type: "supplier",
      label: "Sample Vendor",
      domain: "procurement",
      properties: { riskLevel: "low" },
    });
    const assetNode = this.upsertNode({
      id: "asset-generator-9001",
      type: "asset",
      label: "Emergency Generator",
      domain: "assets",
      properties: { value: 1800 },
    });

    [
      { id: "edge-org-grant", from: orgNode.id, to: grantNode.id, relationship: "owns" as const, weight: 1 },
      { id: "edge-grant-budget", from: grantNode.id, to: budgetNode.id, relationship: "funds" as const, weight: 0.9 },
      { id: "edge-budget-cash", from: budgetNode.id, to: cashNode.id, relationship: "constrains" as const, weight: 0.7 },
      { id: "edge-supplier-budget", from: supplierNode.id, to: budgetNode.id, relationship: "charges" as const, weight: 0.5 },
      { id: "edge-asset-grant", from: assetNode.id, to: grantNode.id, relationship: "charges" as const, weight: 0.4 },
    ].forEach((edge) => this.upsertEdge(edge));

    return this.queryByDomain(["treasury", "budget", "grants", "procurement", "assets"]);
  }

  queryByDomain(domains: DigitalFinanceDomain[]): KnowledgeGraphQueryResult {
    const nodes = [...this.nodes.values()].filter((node) => domains.includes(node.domain));
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = [...this.edges.values()].filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));

    return {
      nodes,
      edges,
      explanation: `Retrieved ${nodes.length} nodes and ${edges.length} relationships across ${domains.join(", ")}.`,
    };
  }

  findImpactPath(fromNodeId: string, toNodeId: string): KnowledgeGraphQueryResult {
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; path: KnowledgeGraphEdge[] }> = [{ nodeId: fromNodeId, path: [] }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.nodeId === toNodeId) {
        const ids = new Set<string>([fromNodeId, toNodeId, ...current.path.flatMap((edge) => [edge.from, edge.to])]);
        return {
          nodes: [...ids].map((id) => this.nodes.get(id)).filter((node): node is KnowledgeGraphNode => Boolean(node)),
          edges: current.path,
          explanation: `Found impact path from ${fromNodeId} to ${toNodeId}.`,
        };
      }
      if (visited.has(current.nodeId)) continue;
      visited.add(current.nodeId);
      [...this.edges.values()]
        .filter((edge) => edge.from === current.nodeId || edge.to === current.nodeId)
        .forEach((edge) => {
          const nextNode = edge.from === current.nodeId ? edge.to : edge.from;
          queue.push({ nodeId: nextNode, path: [...current.path, edge] });
        });
    }

    return { nodes: [], edges: [], explanation: `No impact path found from ${fromNodeId} to ${toNodeId}.` };
  }
}
