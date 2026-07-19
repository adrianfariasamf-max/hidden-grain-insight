// Presentation helpers for canonical Knowledge Objects.
// Any UI that needs "the label to show", "the icon to draw", or "the tone
// of a status" must use these — no local re-implementation across Explorer,
// Detail and Graph.

import {
  Box,
  FileText,
  Folder,
  Layers,
  Network,
  Package,
  Puzzle,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import type { KnowledgeObject } from "./knowledge-object";

/** Human-readable name. Falls back to id — normalizer already applies the
 *  same rule; this stays as a defensive alias for callers that receive a
 *  KnowledgeObject through untyped boundaries. */
export function getDisplayName(obj: Pick<KnowledgeObject, "id" | "title">): string {
  const t = obj.title?.trim();
  return t && t.length > 0 ? t : obj.id;
}

/** Presentable version string, e.g. `"v1.2.0"`. Returns undefined when the
 *  object carries no version. */
export function getDisplayVersion(obj: Pick<KnowledgeObject, "version">): string | undefined {
  const v = obj.version?.trim();
  if (!v) return undefined;
  return v.startsWith("v") ? v : `v${v}`;
}

/** Tone tag for a status. Paired with a text label at the call site — never
 *  used as the sole visual signal. */
export type StatusTone = "success" | "warning" | "destructive" | "neutral";

const STATUS_TONE: Record<string, StatusTone> = {
  active: "success",
  stable: "success",
  published: "success",
  ready: "success",
  draft: "warning",
  review: "warning",
  pending: "warning",
  deprecated: "destructive",
  broken: "destructive",
  archived: "neutral",
};

export function getStatusTone(status: string | undefined | null): StatusTone {
  if (!status) return "neutral";
  return STATUS_TONE[status.toLowerCase()] ?? "neutral";
}

/** Icon suggestion by canonical `type`. Purely presentational — feature
 *  code must NOT branch business logic on the returned icon. */
const TYPE_ICON: Record<string, LucideIcon> = {
  document: FileText,
  doc: FileText,
  note: FileText,
  folder: Folder,
  collection: Folder,
  package: Package,
  module: Package,
  component: Puzzle,
  system: Layers,
  service: Settings,
  graph: Network,
  concept: Sparkles,
};

export function getTypeIcon(type: string | undefined | null): LucideIcon {
  if (!type) return Box;
  return TYPE_ICON[type.toLowerCase()] ?? Box;
}

/** Safe date accessor. Returns `undefined` when the value is missing or
 *  cannot be parsed. Never throws. */
export function getSafeDate(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return undefined;
  return new Date(t);
}

/** Combined labels + tags in a single deduplicated, order-preserving list.
 *  Useful for compact card footers. */
export function getAllLabels(obj: Pick<KnowledgeObject, "labels" | "tags">): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const source of [obj.labels ?? [], obj.tags]) {
    for (const item of source) {
      if (!item) continue;
      if (seen.has(item)) continue;
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

/** Boolean-safe accessor for optional metadata numbers. Avoids
 *  `typeof x === "number"` scattered across components. */
export function getRelationshipCount(obj: KnowledgeObject): number | undefined {
  const n = obj.metadata.relationshipCount;
  return typeof n === "number" ? n : undefined;
}
