// Presentation helpers for canonical Relationships.
// Explorer, Object Detail and Graph must all use these — never re-derive
// per-component labels, tones or endpoint logic.

import {
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";

import type { KnowledgeObjectId } from "@/lib/api/types";

import type { Relationship, RelationshipDirection, RelationshipStatus } from "./relationship";
import {
  getRelationshipTypeDescriptor,
  type RelationshipTone,
} from "./relationship-ontology";

/** Re-export the tone token so existing callers keep a single import site. */
export type { RelationshipTone } from "./relationship-ontology";

/** Human-readable label for a relationship type. Delegates to the
 *  ontology — never fabricates a label. */
export function getRelationshipTypeLabel(type: string | undefined | null): string {
  return getRelationshipTypeDescriptor(type).displayName;
}

/** Icon suggestion by relationship `type`. Delegates to the ontology. */
export function getRelationshipTypeIcon(type: string | undefined | null): LucideIcon {
  return getRelationshipTypeDescriptor(type).icon;
}

/** Tone tag paired with a text label at the call site. Delegates to the
 *  ontology so tokens stay consistent across the app. */
export function getRelationshipTypeTone(type: string | undefined | null): RelationshipTone {
  return getRelationshipTypeDescriptor(type).tone;
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

/** Stable dedup by relationship id. Preserves the first occurrence order
 *  and reports how many duplicates were dropped. Only exact-id duplicates
 *  are removed — two edges sharing (source, target, type) but with
 *  different ids are kept as distinct relationships. */
export function dedupRelationshipsById<T extends { id: string }>(
  input: readonly T[],
): { items: T[]; removed: number } {
  const seen = new Set<string>();
  const items: T[] = [];
  for (const rel of input) {
    if (seen.has(rel.id)) continue;
    seen.add(rel.id);
    items.push(rel);
  }
  return { items, removed: input.length - items.length };
}
