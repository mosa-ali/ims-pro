import {
  WorkflowDesignerCanvas,
  WorkflowDesignerDefinition,
} from "./EnterprisePlatformTypes";

export class WorkflowDesignerEngine {
  buildCanvas(definition: WorkflowDesignerDefinition): WorkflowDesignerCanvas {
    return {
      workflowId: definition.workflowId,
      nodes: definition.nodes.map((node, index) => ({
        id: node.id,
        label: node.label,
        x: node.position?.x ?? 160 * (index % 4),
        y: node.position?.y ?? 120 * Math.floor(index / 4),
        executionMode: node.executionMode ?? "sequential",
        hasCondition: Boolean(node.condition),
        hasApprovalGate: Boolean(node.approvalGate),
        hasTimer: Boolean(node.timer),
        hasNotification: (definition.notifications ?? []).some((notification) => notification.event === "workflow_completed" || notification.event === "step_failed"),
      })),
      connectors: definition.edges.map((edge) => ({
        from: edge.from,
        to: edge.to,
        label: edge.label,
      })),
    };
  }

  updateNodePosition(
    definition: WorkflowDesignerDefinition,
    nodeId: string,
    position: { x: number; y: number },
  ): WorkflowDesignerDefinition {
    return {
      ...definition,
      nodes: definition.nodes.map((node) => node.id === nodeId ? { ...node, position } : node),
    };
  }
}
