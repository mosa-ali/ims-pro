import {
  WorkflowDesignerDefinition,
  WorkflowSimulationFinding,
  WorkflowSimulationResult,
} from "./EnterprisePlatformTypes";

export class WorkflowSimulationEngine {
  simulate(definition: WorkflowDesignerDefinition): WorkflowSimulationResult {
    const findings: WorkflowSimulationFinding[] = [];
    const nodeIds = new Set(definition.nodes.map((node) => node.id));
    const incoming = new Map<string, number>();
    const outgoing = new Map<string, number>();

    definition.nodes.forEach((node) => {
      incoming.set(node.id, 0);
      outgoing.set(node.id, 0);
    });
    definition.edges.forEach((edge) => {
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
        findings.push({
          code: "dependency_invalid",
          severity: "error",
          message: `Connector ${edge.from} -> ${edge.to} references a missing node.`,
        });
        return;
      }
      incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
      outgoing.set(edge.from, (outgoing.get(edge.from) ?? 0) + 1);
    });

    const startNodes = definition.nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0);
    if (startNodes.length === 0) {
      findings.push({ code: "missing_start", severity: "error", message: "Workflow has no start node." });
    }

    definition.nodes.forEach((node) => {
      if ((incoming.get(node.id) ?? 0) === 0 && startNodes[0]?.id !== node.id) {
        findings.push({ code: "missing_branch", severity: "warning", message: `Node ${node.label} starts an unconnected branch.`, nodeId: node.id });
      }
      if ((incoming.get(node.id) ?? 0) === 0 && (outgoing.get(node.id) ?? 0) === 0 && definition.nodes.length > 1) {
        findings.push({ code: "unreachable_node", severity: "error", message: `Node ${node.label} is unreachable.`, nodeId: node.id });
      }
      if (node.approvalGate && !(definition.approvalRoutes ?? []).length) {
        findings.push({ code: "approval_missing", severity: "error", message: `Approval gate ${node.label} has no approval route.`, nodeId: node.id });
      }
      if (node.timer && !node.timer.escalationRole) {
        findings.push({ code: "timer_without_escalation", severity: "warning", message: `Timer on ${node.label} has no escalation role.`, nodeId: node.id });
      }
    });

    if (this.hasCycle(definition)) {
      findings.push({ code: "infinite_loop", severity: "error", message: "Workflow contains a cycle that may never terminate." });
    }

    if (findings.length === 0) {
      findings.push({ code: "valid", severity: "info", message: "Workflow simulation passed validation." });
    }

    return {
      workflowId: definition.workflowId,
      valid: findings.every((finding) => finding.severity !== "error"),
      findings,
      executionPreview: this.preview(definition),
    };
  }

  private hasCycle(definition: WorkflowDesignerDefinition): boolean {
    const graph = new Map<string, string[]>();
    definition.nodes.forEach((node) => graph.set(node.id, []));
    definition.edges.forEach((edge) => graph.get(edge.from)?.push(edge.to));
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (nodeId: string): boolean => {
      if (visiting.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;
      visiting.add(nodeId);
      for (const next of graph.get(nodeId) ?? []) {
        if (visit(next)) return true;
      }
      visiting.delete(nodeId);
      visited.add(nodeId);
      return false;
    };

    return definition.nodes.some((node) => visit(node.id));
  }

  private preview(definition: WorkflowDesignerDefinition): string[] {
    return definition.nodes.map((node) => `${node.executionMode ?? "sequential"}:${node.label}`);
  }
}
