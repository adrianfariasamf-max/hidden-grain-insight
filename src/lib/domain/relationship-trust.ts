// Trust catalog for Hidden Grain relationships (EPIC-002.5).
//
// Single source of truth for provenance, status and confidence
// presentation. Feature code (Object Detail, Graph, future review
// surfaces) must resolve provenance/status through the accessors here
// instead of branching on raw strings, and must format confidence
// through `formatConfidencePercent` / `classifyConfidence`.
//
// IMPORTANT (contract reality):
// The current wire contract only emits `resolved: boolean` on edges.
// It does NOT emit `provenance`, `confidence`, `createdAt`, `updatedAt`
// or `version`. These accessors are therefore dormant against today's
// projection — every `Relationship.provenance` / `.confidence` is
// `undefined` and UI callers must treat presence as conditional.
// When the backend starts emitting these fields, the wire schema in
// `src/lib/api/schemas.ts` and the normalizer in `relationship.ts`
// become the only places that need to change.

import {
  Bot,
  Brain,
  CheckCircle2,
  CircleDashed,
  Sparkles,
  User,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import type { RelationshipProvenance, RelationshipStatus } from "./relationship";
import type { RelationshipTone } from "./relationship-ontology";

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

export interface RelationshipProvenanceDescriptor {
  id: RelationshipProvenance;
  displayName: string;
  description: string;
  icon: LucideIcon;
  tone: RelationshipTone;
  order: number;
  isCustom: boolean;
}

const PROVENANCE_CATALOG: readonly RelationshipProvenanceDescriptor[] = [
  {
    id: "projection",
    displayName: "Projected",
    description: "Extracted from a canonical source by the projection pipeline.",
    icon: Workflow,
    tone: "primary",
    order: 10,
    isCustom: false,
  },
  {
    id: "manual",
    displayName: "Manual",
    description: "Authored by a human operator.",
    icon: User,
    tone: "success",
    order: 20,
    isCustom: false,
  },
  {
    id: "inferred",
    displayName: "Inferred",
    description: "Derived by a heuristic or automated rule.",
    icon: Brain,
    tone: "warning",
    order: 30,
    isCustom: false,
  },
  {
    id: "ai",
    displayName: "AI-suggested",
    description: "Proposed by an AI/LLM component. Requires human review.",
    icon: Bot,
    tone: "warning",
    order: 40,
    isCustom: false,
  },
  {
    id: "unknown",
    displayName: "Unknown origin",
    description: "Origin declared as unknown by the source system.",
    icon: Sparkles,
    tone: "neutral",
    order: 90,
    isCustom: false,
  },
];

const PROVENANCE_LOOKUP: ReadonlyMap<string, RelationshipProvenanceDescriptor> = new Map(
  PROVENANCE_CATALOG.map((d) => [d.id, d]),
);

/** Descriptor accessor. Returns a descriptor for every input, synthesizing
 *  a "Custom" entry that preserves the raw id when the value is not part
 *  of the catalog. Never throws. Returns `undefined` only when the input
 *  itself is `undefined` — callers must decide whether absence is shown. */
export function getRelationshipProvenanceDescriptor(
  provenance: string | undefined | null,
): RelationshipProvenanceDescriptor | undefined {
  if (provenance == null) return undefined;
  const raw = typeof provenance === "string" ? provenance.trim() : "";
  if (raw.length === 0) return undefined;
  const hit = PROVENANCE_LOOKUP.get(raw.toLowerCase());
  if (hit) return hit;
  return {
    id: raw as RelationshipProvenance,
    displayName: raw,
    description: "",
    icon: Sparkles,
    tone: "neutral",
    order: 900,
    isCustom: true,
  };
}

export function listRelationshipProvenances(): readonly RelationshipProvenanceDescriptor[] {
  return [...PROVENANCE_CATALOG].sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------
// Status
//
// The canonical `RelationshipStatus` is currently `"resolved" | "unresolved"`,
// derived from the wire boolean `resolved`. This is a *resolution* signal,
// not a lifecycle signal. The Graph page already exposes a dedicated
// "Resolution" axis, so a duplicate "Status" filter would be pure noise.
// We therefore expose descriptors here for reuse (badges, summaries) but
// intentionally do NOT surface a separate status filter in the Graph UI.
// If the wire contract later introduces lifecycle statuses ("active",
// "pending", "rejected", ...), extend the union in `relationship.ts` and
// add the descriptors to this catalog — no UI change beyond enabling the
// dormant filter block.
// ---------------------------------------------------------------------------

export interface RelationshipStatusDescriptor {
  id: RelationshipStatus;
  displayName: string;
  description: string;
  icon: LucideIcon;
  tone: RelationshipTone;
  /** Accessible sr-only label describing the status without relying on
   *  color. */
  accessibleLabel: string;
  order: number;
}

const STATUS_CATALOG: readonly RelationshipStatusDescriptor[] = [
  {
    id: "resolved",
    displayName: "Resolved",
    description: "Both endpoints are known and reachable in the projection.",
    icon: CheckCircle2,
    tone: "success",
    accessibleLabel: "Resolved relationship",
    order: 10,
  },
  {
    id: "unresolved",
    displayName: "Unresolved",
    description: "At least one endpoint could not be resolved to a Knowledge Object.",
    icon: CircleDashed,
    tone: "warning",
    accessibleLabel: "Unresolved relationship",
    order: 20,
  },
];

const STATUS_LOOKUP: ReadonlyMap<string, RelationshipStatusDescriptor> = new Map(
  STATUS_CATALOG.map((d) => [d.id, d]),
);

export function getRelationshipStatusDescriptor(
  status: RelationshipStatus | string | undefined | null,
): RelationshipStatusDescriptor | undefined {
  if (status == null) return undefined;
  const raw = typeof status === "string" ? status.trim().toLowerCase() : "";
  if (raw.length === 0) return undefined;
  return STATUS_LOOKUP.get(raw);
}

export function listRelationshipStatuses(): readonly RelationshipStatusDescriptor[] {
  return [...STATUS_CATALOG].sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------
// Confidence
//
// Numeric confidence lives on `Relationship.confidence` in the [0, 1]
// range. Missing values stay `undefined` — we never coerce absence into
// a synthetic "1" or "0".
// ---------------------------------------------------------------------------

export const CONFIDENCE_HIGH_THRESHOLD = 0.85;
export const CONFIDENCE_MEDIUM_THRESHOLD = 0.6;

export type ConfidenceClass = "high" | "medium" | "low";

export function normalizeConfidence(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Format a [0..1] confidence as a percentage string. Uses `Math.floor` so
 * `0.994` reads as `99%` — never rounds *up* into an absolute claim the
 * data does not support. Returns undefined when the input is undefined.
 */
export function formatConfidencePercent(value: number | undefined): string | undefined {
  const n = normalizeConfidence(value);
  if (n === undefined) return undefined;
  return `${Math.floor(n * 100)}%`;
}

export function classifyConfidence(value: number | undefined): ConfidenceClass | undefined {
  const n = normalizeConfidence(value);
  if (n === undefined) return undefined;
  if (n >= CONFIDENCE_HIGH_THRESHOLD) return "high";
  if (n >= CONFIDENCE_MEDIUM_THRESHOLD) return "medium";
  return "low";
}

export function getConfidenceClassLabel(cls: ConfidenceClass): string {
  if (cls === "high") return "High";
  if (cls === "medium") return "Medium";
  return "Low";
}

export function getConfidenceClassTone(cls: ConfidenceClass): RelationshipTone {
  if (cls === "high") return "success";
  if (cls === "medium") return "primary";
  return "warning";
}
