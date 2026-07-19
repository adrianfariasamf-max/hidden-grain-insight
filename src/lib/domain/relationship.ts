// Canonical Relationship model for Hidden Grain (EPIC-002.1).
//
// This is the ONLY shape UI code should reason about when displaying a
// relationship between two Knowledge Objects. The wire dialect (GraphEdge
// from `src/lib/api/types.ts`) is translated into this model through
// `toRelationship` / `toRelationshipFromViewpoint`.
//
// The model is intentionally *extensible*: `confidence`, `provenance` and
// `metadata` are declared today even though the current backend does not
// emit them. When those fields land upstream, the normalizer starts
// populating them and no UI change is required.
//
// Fields:
//   id           — stable relationship identifier (from projection).
//   sourceId     — canonical source Knowledge Object id.
//   targetId     — canonical target Knowledge Object id.
//   type         — relationship type (contract-defined string).
//   direction    — semantic direction relative to the current viewpoint,
//                  or "unspecified" when there is no viewpoint (e.g. the
//                  global graph view).
//   status       — resolution status. Only "resolved" | "unresolved" today.
//   confidence   — optional [0..1] confidence score. Reserved for inferred
//                  or AI-generated relationships. Never fabricated.
//   provenance   — optional origin marker. Reserved for future auditing.
//   metadata     — auxiliary bag for contract fields that are not first
//                  class in the canonical model (e.g. `description`).

import { z } from "zod";

import type { GraphEdge, KnowledgeObjectId } from "@/lib/api/types";

export type RelationshipDirection = "outgoing" | "incoming" | "unspecified";

export type RelationshipStatus = "resolved" | "unresolved";

/** Origin marker. Reserved: today every relationship read from the
 *  read-only projection is "projection". Future values will cover
 *  "manual" (user-authored), "inferred" (heuristic), "ai" (LLM), etc. */
export type RelationshipProvenance = "projection" | "manual" | "inferred" | "ai" | "unknown";

export interface RelationshipMetadata {
  /** Human-facing description attached to the edge, when present. */
  description?: string;
  /** Reserved: ISO timestamp of creation. Not in current contract. */
  createdAt?: string;
  /** Reserved: ISO timestamp of last change. Not in current contract. */
  updatedAt?: string;
  /** Reserved: version handle for the relationship itself. */
  version?: string;
}

export interface Relationship {
  id: string;
  sourceId: KnowledgeObjectId;
  targetId: KnowledgeObjectId;
  type: string;
  direction: RelationshipDirection;
  status: RelationshipStatus;
  confidence?: number;
  provenance?: RelationshipProvenance;
  metadata: RelationshipMetadata;
}

// ---------------------------------------------------------------------------
// Zod schema — validates the CANONICAL shape.
// Contract validation for the wire `GraphEdge` still lives in
// `src/lib/api/schemas.ts`; this schema is for the domain layer itself.
// ---------------------------------------------------------------------------

export const RelationshipMetadataSchema: z.ZodType<RelationshipMetadata> = z.object({
  description: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.string().optional(),
});

export const RelationshipSchema: z.ZodType<Relationship> = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  type: z.string(),
  direction: z.enum(["outgoing", "incoming", "unspecified"]),
  status: z.enum(["resolved", "unresolved"]),
  confidence: z.number().min(0).max(1).optional(),
  provenance: z.enum(["projection", "manual", "inferred", "ai", "unknown"]).optional(),
  metadata: RelationshipMetadataSchema,
});

// ---------------------------------------------------------------------------
// Normalizers — pure, side-effect free. Missing fields become `undefined`
// or empty; nothing is fabricated.
// ---------------------------------------------------------------------------

function nonEmpty(value: string | undefined | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length === 0 ? undefined : t;
}

/** Convert a wire `GraphEdge` to the canonical `Relationship`. Direction
 *  is left as "unspecified" — appropriate for the global graph view where
 *  there is no viewpoint object. */
export function toRelationship(edge: GraphEdge): Relationship {
  return {
    id: edge.id,
    sourceId: edge.source,
    targetId: edge.target,
    type: edge.type,
    direction: "unspecified",
    status: edge.resolved ? "resolved" : "unresolved",
    provenance: "projection",
    metadata: {
      description: nonEmpty(edge.description),
    },
  };
}

/** Convert a wire `GraphEdge` to the canonical `Relationship` with a
 *  semantic direction derived from a viewpoint object id. Used by the
 *  Object Detail page. Falls back to "unspecified" when the edge touches
 *  neither side of the viewpoint (defensive; the projection normally
 *  guarantees the invariant). */
export function toRelationshipFromViewpoint(
  edge: GraphEdge,
  viewpointId: KnowledgeObjectId,
  hint?: RelationshipDirection,
): Relationship {
  const base = toRelationship(edge);
  let direction: RelationshipDirection;
  if (hint && hint !== "unspecified") {
    direction = hint;
  } else if (edge.source === viewpointId) {
    direction = "outgoing";
  } else if (edge.target === viewpointId) {
    direction = "incoming";
  } else {
    direction = "unspecified";
  }
  return { ...base, direction };
}