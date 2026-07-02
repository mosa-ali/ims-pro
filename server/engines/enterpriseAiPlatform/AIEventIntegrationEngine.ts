import { AIPlatformEvent } from "./EnterpriseAITypes";

export interface AIEventAction {
  eventId: string;
  action:
    | "refresh_memory"
    | "update_knowledge_graph"
    | "trigger_financial_analysis"
    | "trigger_compliance_review"
    | "no_action";
  organizationId: number;
  operatingUnitId?: number | null;
  reason: string;
}

export class AIEventIntegrationEngine {
  handleEvent(event: AIPlatformEvent): AIEventAction[] {
    const common = {
      eventId: event.eventId,
      organizationId: event.organizationId,
      operatingUnitId: event.operatingUnitId ?? null,
    };

    switch (event.eventType) {
      case "payment_approved":
        return [
          { ...common, action: "refresh_memory", reason: "Payment approval changes cash and workflow context." },
          { ...common, action: "trigger_financial_analysis", reason: "Approved payments may affect cash, budget, and grant exposure." },
        ];
      case "grant_updated":
        return [
          { ...common, action: "update_knowledge_graph", reason: "Grant relationships and donor constraints changed." },
          { ...common, action: "trigger_compliance_review", reason: "Grant changes can affect donor compliance." },
        ];
      case "procurement_completed":
      case "budget_updated":
      case "journal_posted":
        return [
          { ...common, action: "update_knowledge_graph", reason: `${event.eventType} updates enterprise financial relationships.` },
        ];
      case "employee_created":
        return [
          { ...common, action: "refresh_memory", reason: "HR changes may affect role-aware AI context." },
        ];
      default:
        return [{ ...common, action: "no_action", reason: "Event type has no AI integration rule." }];
    }
  }
}
