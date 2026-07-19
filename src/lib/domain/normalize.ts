// API dialect → canonical Knowledge Object.
// Every normalizer is pure and side-effect free. Missing fields become
// `undefined` — we NEVER fabricate values (no synthetic titles, no
// synthetic dates, no synthetic owners).

import type { GraphEdge, GraphNode, KnowledgeObjectSummary } from "@/lib/api/types";

import type {
  KnowledgeObject,
  KnowledgeObjectMetadata,
  KnowledgeObjectVersionRef,
  KnowledgeRelationship,
} from "./knowledge-object";

function nonEmpty(value: string | undefined | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length === 0 ? undefined : t;
}

function toVersionRef(version: string | undefined): KnowledgeObjectVersionRef | undefined {
  const v = nonEmpty(version);
  if (!v) return undefined;
  return { current: v };
}

/** Full-detail normalizer for `KnowledgeObjectSummary` (used by
 *  `GET /objects` list items and by `GET /objects/:id`.object). */
export function toKnowledgeObject(summary: KnowledgeObjectSummary): KnowledgeObject {
  const tags = Array.isArray(summary.tags) ? summary.tags : [];
  const keywords = Array.isArray(summary.keywords) ? summary.keywords : [];
  const metadata: KnowledgeObjectMetadata = {
    category: nonEmpty(summary.category),
    keywords,
    checksum: nonEmpty(summary.checksum),
    path: nonEmpty(summary.path),
    relationshipCount:
      typeof summary.relationshipCount === "number" ? summary.relationshipCount : undefined,
  };

  return {
    id: summary.id,
    title: nonEmpty(summary.title) ?? summary.id,
    type: nonEmpty(summary.type),
    status: nonEmpty(summary.status),
    description: nonEmpty(summary.summary),
    // labels/owner/createdAt/updatedAt — not in current contract.
    tags,
    source: metadata.path,
    version: nonEmpty(summary.version),
    versionRef: toVersionRef(summary.version),
    metadata,
  };
}

/** Sparse normalizer for a `GraphNode`. The graph projection carries only
 *  identity + coarse classification; every other canonical field remains
 *  `undefined` so the UI can degrade gracefully. */
export function fromGraphNode(node: GraphNode): KnowledgeObject {
  return {
    id: node.id,
    title: nonEmpty(node.title) ?? node.id,
    type: nonEmpty(node.type),
    tags: [],
    metadata: {
      category: nonEmpty(node.category),
      keywords: [],
    },
  };
}

/** Edge → canonical relationship. Currently 1:1 with the wire shape, but
 *  goes through the domain layer so feature code depends only on it. */
export function toKnowledgeRelationship(edge: GraphEdge): KnowledgeRelationship {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    description: nonEmpty(edge.description),
    resolved: edge.resolved,
  };
}
