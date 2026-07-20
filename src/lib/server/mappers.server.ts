// DB row → wire contract mappers. Server-only.
// Keeps the domain decoupled from Supabase specifics.

import type { GraphEdge, GraphNode, KnowledgeObjectSummary } from "@/lib/api/types";

export interface ObjectRow {
  id: string;
  title: string;
  type: string;
  category: string;
  status: string;
  summary: string;
  keywords: string[] | null;
  tags: string[] | null;
  version: string;
  path: string;
  checksum: string;
  created_at: string;
  updated_at: string;
}

export interface RelationshipRow {
  id: string;
  source_object_id: string;
  target_object_id: string;
  type: string;
  description: string | null;
  resolved: boolean;
  provenance: string | null;
  confidence: number | null;
  created_at: string;
  updated_at: string;
}

export function toObjectSummary(row: ObjectRow, relationshipCount: number): KnowledgeObjectSummary {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    category: row.category,
    status: row.status,
    version: row.version,
    summary: row.summary ?? "",
    keywords: row.keywords ?? [],
    tags: row.tags ?? [],
    path: row.path ?? "",
    checksum: row.checksum ?? "",
    relationshipCount,
  };
}

export function toGraphNode(row: Pick<ObjectRow, "id" | "title" | "type" | "category">): GraphNode {
  return { id: row.id, title: row.title, type: row.type, category: row.category };
}

export function toGraphEdge(row: RelationshipRow): GraphEdge {
  return {
    id: row.id,
    source: row.source_object_id,
    target: row.target_object_id,
    type: row.type,
    description: row.description ?? undefined,
    resolved: row.resolved,
  };
}
