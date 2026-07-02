/**
 * ProcurementKnowledgeGraphEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Procurement Knowledge Graph (#10)
 *
 * Connects all procurement entities for rich AI reasoning and traceability:
 *
 *   Supplier → Contracts → Projects → Grants → Invoices →
 *   Payments → Assets → Warehouse → Performance
 *
 * Use cases:
 *  - "Show me everything related to Vendor X"
 *  - "Trace this payment back to the original PR"
 *  - "Which grants funded this PO?"
 *  - "What assets were created from this contract?"
 *  - AI reasoning with full entity context
 */

import type { ILogger, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type EntityType =
  | 'supplier' | 'contract' | 'purchase_request' | 'rfq' | 'quotation'
  | 'purchase_order' | 'grn' | 'inspection' | 'invoice' | 'payment'
  | 'journal_entry' | 'grant' | 'project' | 'budget_line' | 'asset'
  | 'warehouse_item' | 'shipment';

export type RelationType =
  | 'supplies_to' | 'contracted_by' | 'requested_by' | 'quoted_for'
  | 'ordered_from' | 'received_from' | 'inspected_for' | 'invoiced_for'
  | 'paid_for' | 'posted_to_gl' | 'charged_to_grant' | 'belongs_to_project'
  | 'funded_by_budget' | 'created_asset' | 'stored_in_warehouse'
  | 'shipped_via' | 'amendment_of' | 'revision_of';

export interface GraphNode {
  nodeId: string;
  entityType: EntityType;
  entityId: number;
  label: string;
  labelAR?: string;
  properties: Record<string, unknown>;
  /** Cached connections count */
  connectionCount: number;
}

export interface GraphEdge {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: RelationType;
  label: string;
  properties?: Record<string, unknown>;
  strength: number;      // 0-1 (how strong the relationship is)
  createdAt: string;
}

export interface GraphTraversalResult {
  startNode: GraphNode;
  nodes: GraphNode[];
  edges: GraphEdge[];
  depth: number;
  totalNodes: number;
  totalEdges: number;
}

export interface EntityTraceResult {
  entityType: EntityType;
  entityId: number;
  traceType: 'forward' | 'backward' | 'full';
  path: Array<{
    step: number;
    node: GraphNode;
    relation: string;
    direction: 'incoming' | 'outgoing';
  }>;
  relatedEntities: Record<EntityType, number[]>;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IKnowledgeGraphRepository {
  getNode(entityType: EntityType, entityId: number, scope: RepositoryScope): Promise<GraphNode | null>;
  getConnections(entityType: EntityType, entityId: number, scope: RepositoryScope, direction?: 'incoming' | 'outgoing' | 'both'): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
  findPath(fromType: EntityType, fromId: number, toType: EntityType, toId: number, scope: RepositoryScope): Promise<GraphEdge[]>;
  getSupplierGraph(supplierId: number, scope: RepositoryScope): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
  getProjectGraph(projectId: number, scope: RepositoryScope): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
  getGrantGraph(grantId: number, scope: RepositoryScope): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
  searchNodes(query: string, entityTypes: EntityType[], scope: RepositoryScope, limit?: number): Promise<GraphNode[]>;
}

export interface KnowledgeGraphDependencies {
  graphRepo: IKnowledgeGraphRepository;
  logger: ILogger;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class ProcurementKnowledgeGraphEngine {
  private repo: IKnowledgeGraphRepository;
  private logger: ILogger;

  constructor(deps: KnowledgeGraphDependencies) {
    this.repo = deps.graphRepo;
    this.logger = deps.logger.child({ service: 'ProcurementKnowledgeGraph' });
  }

  /**
   * Get everything related to an entity (e.g., "Show me everything about Vendor X").
   */
  async explore(
    entityType: EntityType,
    entityId: number,
    maxDepth: number,
    scope: RepositoryScope,
  ): Promise<GraphTraversalResult> {
    const startNode = await this.repo.getNode(entityType, entityId, scope);
    if (!startNode) throw new Error(`${entityType} #${entityId} not found`);

    const allNodes = new Map<string, GraphNode>();
    const allEdges = new Map<string, GraphEdge>();
    allNodes.set(startNode.nodeId, startNode);

    // BFS traversal up to maxDepth
    let frontier = [startNode];
    let currentDepth = 0;

    while (currentDepth < maxDepth && frontier.length > 0) {
      const nextFrontier: GraphNode[] = [];

      for (const node of frontier) {
        const { nodes, edges } = await this.repo.getConnections(
          node.entityType, (node.properties.id as number) || node.entityId, scope,
        );

        for (const edge of edges) {
          if (!allEdges.has(edge.edgeId)) allEdges.set(edge.edgeId, edge);
        }

        for (const connected of nodes) {
          if (!allNodes.has(connected.nodeId)) {
            allNodes.set(connected.nodeId, connected);
            nextFrontier.push(connected);
          }
        }
      }

      frontier = nextFrontier;
      currentDepth++;
    }

    this.logger.info('Graph explored', {
      entityType, entityId,
      depth: currentDepth,
      nodes: allNodes.size,
      edges: allEdges.size,
    });

    return {
      startNode,
      nodes: [...allNodes.values()],
      edges: [...allEdges.values()],
      depth: currentDepth,
      totalNodes: allNodes.size,
      totalEdges: allEdges.size,
    };
  }

  /**
   * Trace a procurement entity forward or backward through the chain.
   *
   * Backward: Payment → Invoice → GRN → PO → Contract → PR → Supplier
   * Forward: PR → PO → Shipment → GRN → Inspection → Invoice → Payment → GL → Grant → Asset
   */
  async trace(
    entityType: EntityType,
    entityId: number,
    direction: 'forward' | 'backward' | 'full',
    scope: RepositoryScope,
  ): Promise<EntityTraceResult> {
    const traceDirection = direction === 'full' ? 'both' : direction === 'forward' ? 'outgoing' : 'incoming';
    const startNode = await this.repo.getNode(entityType, entityId, scope);
    if (!startNode) throw new Error(`${entityType} #${entityId} not found`);

    const visited = new Set<string>();
    const path: EntityTraceResult['path'] = [];
    const relatedEntities: Record<string, number[]> = {};

    const walk = async (node: GraphNode, step: number, dir: 'incoming' | 'outgoing') => {
      const key = `${node.entityType}:${node.entityId}`;
      if (visited.has(key)) return;
      visited.add(key);

      const { nodes, edges } = await this.repo.getConnections(node.entityType, node.entityId, scope, dir);

      for (const edge of edges) {
        const connected = nodes.find(n =>
          n.nodeId === (dir === 'outgoing' ? edge.targetNodeId : edge.sourceNodeId),
        );
        if (!connected) continue;

        const connKey = `${connected.entityType}:${connected.entityId}`;
        if (visited.has(connKey)) continue;

        path.push({
          step: step + 1,
          node: connected,
          relation: edge.label,
          direction: dir,
        });

        if (!relatedEntities[connected.entityType]) relatedEntities[connected.entityType] = [];
        relatedEntities[connected.entityType].push(connected.entityId);

        await walk(connected, step + 1, dir);
      }
    };

    if (direction !== 'backward') await walk(startNode, 0, 'outgoing');
    if (direction !== 'forward') await walk(startNode, 0, 'incoming');

    this.logger.info('Entity traced', {
      entityType, entityId, direction,
      pathLength: path.length,
      relatedTypes: Object.keys(relatedEntities).length,
    });

    return {
      entityType,
      entityId,
      traceType: direction,
      path: path.sort((a, b) => a.step - b.step),
      relatedEntities: relatedEntities as Record<EntityType, number[]>,
    };
  }

  /**
   * Get all entities related to a supplier (360° graph view).
   */
  async getSupplierGraph(supplierId: number, scope: RepositoryScope): Promise<GraphTraversalResult> {
    const { nodes, edges } = await this.repo.getSupplierGraph(supplierId, scope);
    const startNode = nodes.find(n => n.entityType === 'supplier' && n.entityId === supplierId);
    if (!startNode) throw new Error(`Supplier ${supplierId} not found in graph`);

    return { startNode, nodes, edges, depth: 0, totalNodes: nodes.length, totalEdges: edges.length };
  }

  /**
   * Search for entities across the knowledge graph.
   */
  async search(
    query: string,
    entityTypes: EntityType[],
    scope: RepositoryScope,
    limit: number = 20,
  ): Promise<GraphNode[]> {
    return this.repo.searchNodes(query, entityTypes, scope, limit);
  }

  /**
   * Get a summary for AI context (feeds into ProcurementAIAssistant).
   */
  async getAIContext(
    entityType: EntityType,
    entityId: number,
    scope: RepositoryScope,
  ): Promise<string> {
    const result = await this.explore(entityType, entityId, 2, scope);

    const lines = [`${entityType} #${entityId}: ${result.startNode.label}`];
    const grouped = new Map<string, GraphNode[]>();
    for (const node of result.nodes) {
      if (node.nodeId === result.startNode.nodeId) continue;
      if (!grouped.has(node.entityType)) grouped.set(node.entityType, []);
      grouped.get(node.entityType)!.push(node);
    }

    for (const [type, nodes] of grouped) {
      lines.push(`  ${type}: ${nodes.length} (${nodes.slice(0, 3).map(n => n.label).join(', ')}${nodes.length > 3 ? '...' : ''})`);
    }

    return lines.join('\n');
  }
}
