// Presentation helpers for canonical Relationships.
// Explorer, Object Detail and Graph must all use these — never re-derive
// per-component labels, tones or endpoint logic.

import {
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  GitBranch,
  Link2,
  Network,
  Package,
  Puzzle,
  Share2,
  type LucideIcon,
} from "lucide-react";

import type { KnowledgeObjectId } from "@/lib/api/types";

import type { Relationship, RelationshipDirection, RelationshipStatus } from "./relationship";

/** Human-readable label for a relationship type. Never fabricates a label
 *  — falls back to the raw type string when no override exists. */
export function getRelationshipTypeLabel(type: string | undefined | null): string {
  const t = type?.trim();
  return t && t.length > 0 ? t : "related";
}

/** Icon suggestion by relationship `type`. Purely presentational. */
const TYPE_ICON: Record<string, LucideIcon> = {
  depends_on: GitBranch,
  depends: GitBranch,
  references: Link2,
  reference: Link2,
  contains: Package,
  part_of: Puzzle,
  related: Share2,
  linked: Link2,
  connects: Network,
};

export function getRelationshipTypeIcon(type: string | undefined | null): LucideIcon {
  if (!type) return Link2;
  return TYPE_ICON[type.toLowerCase()] ?? Link2;
}

/** Tone tag paired with a text label at the call site. Kept in sync with
 *  the design tokens (`success`, `warning`, `neutral`, `primary`). */
export type RelationshipTone = "primary" | "success" | "warning" | "neutral";

const TYPE_TONE: Record<string, RelationshipTone> = {
  depends_on: "warning",
  depends: "warning",
  contains: "primary",
  part_of: "primary",
  references: "neutral",
  reference: "neutral",
  related: "neutral",
};

export function getRelationshipTypeTone(type: string | undefined | null): RelationshipTone {
  if (!type) return "neutral";
  return TYPE_TONE[type.toLowerCase()] ?? "neutral";
}

/** Directional icon. Uses a bidirectional glyph for "unspecified". */
export function getRelationshipDirectionIcon(direction: RelationshipDirection): LucideIcon {
  if (direction === "outgoing") return ArrowRight;
  if (direction === "incoming") return ArrowLeft;
  return ArrowLeftRight;
}

/** Short direction verb, e.g. "to" / "from". Returns undefined when the
 *  direction is unspecified so the caller can hide the label entirely. */
export function getRelationshipDirectionLabel(
  direction: RelationshipDirection,
): string | undefined {
  if (direction === "outgoing") return "to";
  if (direction === "incoming") return "from";
  return undefined;
}

/** Endpoint of a relationship that is NOT the viewpoint object. When
 *  direction is "unspecified" or no viewpoint is available, we return the
 *  target as a stable default (Graph view). */
export function getRelatedEndpointId(
  rel: Relationship,
  viewpointId?: KnowledgeObjectId,
): KnowledgeObjectId {
  if (!viewpointId) return rel.targetId;
  if (rel.sourceId === viewpointId) return rel.targetId;
  if (rel.targetId === viewpointId) return rel.sourceId;
  return rel.targetId;
}

/** Is the "other side" of the relationship reachable via /objects/:id?
 *  A relationship is navigable only when it is resolved AND the other
 *  endpoint is not the viewpoint itself (self-reference stays visible but
 *  non-navigable). */
export function isRelatedEndpointNavigable(
  rel: Relationship,
  viewpointId?: KnowledgeObjectId,
): boolean {
  if (rel.status !== "resolved") return false;
  const other = getRelatedEndpointId(rel, viewpointId);
  if (viewpointId && other === viewpointId) return false;
  return Boolean(other);
}

/** Status tone helper — mirrors the ResolutionBadge tokens. */
export function getRelationshipStatusTone(status: RelationshipStatus): "success" | "warning" {
  return status === "resolved" ? "success" : "warning";
}
