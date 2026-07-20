// Canonical API types — mirror the Hidden Grain read-only contract exactly.
// Only fields confirmed by the handoff API contract are declared here.
// Do NOT add derived, hardcoded, inferred, or UI-only fields.

export type KnowledgeObjectId = string;

// Canonical summary fields (locked by handoff — do not rename).
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
  type: string;
  description?: string;
  resolved: boolean;
}

// GET /objects — offset/limit pagination (NOT page/pageSize).
export interface ObjectsQueryParams {
  q?: string;
  type?: string;
  category?: string;
  status?: string;
  tag?: string;
  offset?: number;
  limit?: number;
}

export interface ObjectsListResponse {
  total: number;
  offset: number;
  limit: number;
  items: KnowledgeObjectSummary[];
}

// GET /objects/:id — object + optional graph node + split relationships.
export interface ObjectDetailResponse {
  object: KnowledgeObjectSummary;
  node?: GraphNode;
  relationships: {
    outgoing: GraphEdge[];
    incoming: GraphEdge[];
  };
}

// GET /graph — flat metrics, no nested `metrics` object.
export interface GraphResponse {
  generatedAt: string;
  schemaVersion: string;
  nodeCount: number;
  edgeCount: number;
  unresolvedEdgeCount: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Optional query params for GET /graph. NONE of these are guaranteed by the
// current backend contract — they are declared here so the UI can already
// keep server-side filters in the query key and forward them once (or if)
// the API adopts them. Sending an unknown param today is inert.
export interface GraphQueryParams {
  nodeType?: string;
  edgeType?: string;
  resolution?: "all" | "resolved" | "unresolved";
  limit?: number;
}

// GET /health — no `readOnly` field; read-only is a product invariant,
// declared in the UI, not read from the API.
export interface HealthResponse {
  status: string;
  service: string;
  schemaVersion: string;
  objects: number;
  nodes: number;
  edges: number;
  generatedAt: string;
}

// ------------------- Write contract (EPIC-005.0) -------------------
// Client-authored fields for POST /objects.
// Server-derived (never client-controlled): id, version, checksum, path,
// relationshipCount, createdAt, updatedAt.
export interface CreateKnowledgeObjectRequest {
  title: string;
  type: string;
  category: string;
  status: string;
  summary?: string;
  keywords?: string[];
  tags?: string[];
}

export type CreateKnowledgeObjectResponse = ObjectDetailResponse;

// Client-authored fields for POST /relationships.
// Server-derived: id, resolved, createdAt, updatedAt.
export interface CreateRelationshipRequest {
  sourceObjectId: string;
  targetObjectId: string;
  type: string;
  description?: string;
  provenance?: string;
  confidence?: number;
}

export type CreateRelationshipResponse = GraphEdge;
