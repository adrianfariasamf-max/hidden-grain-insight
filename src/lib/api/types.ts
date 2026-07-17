// Canonical API types — mirror the Hidden Grain read-only contract.
// Fields here are the immutable canonical set from the handoff package.
// Do NOT add derived, hardcoded, or UI-only fields.

export type KnowledgeObjectId = string;

export interface KnowledgeObjectSummary {
  id: KnowledgeObjectId;
  title: string;
  type: string;
  category: string;
  status: string;
  version: string;
  summary: string;
  keywords: string[];
  tags: string[];
  path: string;
  checksum: string;
  relationshipCount: number;
}

export interface Relationship {
  id: string;
  source: KnowledgeObjectId;
  target: KnowledgeObjectId;
  resolved: boolean;
}

export interface KnowledgeObject extends KnowledgeObjectSummary {
  relationships: Relationship[];
}

export interface ObjectsQueryParams {
  q?: string;
  type?: string;
  category?: string;
  status?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GraphNode {
  id: KnowledgeObjectId;
  title: string;
  type: string;
  category: string;
}

export interface GraphEdge {
  id: string;
  source: KnowledgeObjectId;
  target: KnowledgeObjectId;
  resolved: boolean;
}

export interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  resolvedEdges: number;
  unresolvedEdges: number;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metrics: GraphMetrics;
}

export interface HealthResponse {
  status: "ok" | "degraded" | "down";
  version?: string;
  uptimeSeconds?: number;
  readOnly: boolean;
}

export interface IndexEntry {
  id: KnowledgeObjectId;
  title: string;
  type: string;
  category: string;
  path: string;
  checksum: string;
}

export interface IndexResponse {
  entries: IndexEntry[];
  total: number;
  generatedAt: string;
}