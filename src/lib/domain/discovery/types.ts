// Canonical Discovery domain types (EPIC-004.1).
//
// The Discovery Engine surfaces knowledge the user did not ask for —
// isolated objects, dense clusters, connector nodes, etc. Every
// recommendation is a `DiscoveryInsight`. The model is intentionally
// *superset*: it must survive future integrations (AI, semantic,
// personalization) without a rewrite, so it exposes fields the current
// analyzer does not populate yet (e.g. `metadata.experimental`).
//
// Rules:
//   - Pure domain. No React, no I/O, no hooks.
//   - Deterministic. Same input → identical output (including id / score).
//   - Every insight MUST carry `why` and at least one `evidence` entry
//     (see `analyzer.ts`). Consumers may assume this invariant.

import type { KnowledgeObjectId } from "@/lib/api/types";

/** Official insight type ids. Widened via `"CUSTOM"` so future analyzers
 *  (heuristics, semantic, AI, user feedback) can register new detectors
 *  without breaking the enum. Feature code MUST route type strings through
 *  the ontology (see `./ontology`) — never branch on raw ids. */
export type InsightType =
  | "ISOLATED_OBJECT"
  | "HIGHLY_CONNECTED"
  | "MULTIPLE_INCOMING"
  | "MULTIPLE_OUTGOING"
  | "CENTRAL_CONNECTOR"
  | "POTENTIAL_HUB"
  | "UNRESOLVED_CLUSTER"
  | "DENSE_CLUSTER_MEMBER"
  | "SPARSE_CLUSTER_MEMBER"
  | "CUSTOM";

/** Ranked priority buckets. `critical` renders first, `info` last.
 *  Priority is a coarse governance surface — the fine-grained ordering
 *  within a bucket is driven by `score`. */
export type InsightPriority = "critical" | "high" | "medium" | "low" | "info";

/** Coarse category for UI grouping. Kept small on purpose. */
export type InsightCategory = "connectivity" | "structural" | "quality" | "topology" | "custom";

/** A single piece of supporting evidence for an insight. Values are
 *  string-or-number so they render trivially in a UI table. */
export interface DiscoveryEvidence {
  /** Machine id of the metric (e.g. `"incomingCount"`). */
  metric: string;
  value: number | string;
  /** Optional human phrasing — never fabricated. */
  detail?: string;
}

/** Auxiliary metadata bag. Reserved for future analyzers (AI, semantic,
 *  personalization). The deterministic analyzer never populates
 *  probabilistic fields. */
export interface DiscoveryInsightMetadata {
  /** True when the insight was produced by an experimental / non-canonical
   *    analyzer. Reserved — the deterministic core sets `false`. */
  experimental?: boolean;
  /** Reserved: origin of the analyzer that produced the insight
   *    ("deterministic", "heuristic", "semantic", "ai"). */
  origin?: "deterministic" | "heuristic" | "semantic" | "ai";
  /** Reserved: personalization / user-feedback signals. */
  userSignals?: Readonly<Record<string, unknown>>;
  /** Free-form extensibility bag. */
  extra?: Readonly<Record<string, unknown>>;
}

/** Canonical Discovery Insight. Every field is deterministic on the input
 *  graph. See `analyzer.ts` for how each field is populated. */
export interface DiscoveryInsight {
  /** Stable id — derived from `type` and the primary object id(s). Never
   *  random. Two runs on the same graph produce the same id. */
  id: string;
  type: InsightType;
  priority: InsightPriority;
  /** Normalized deterministic score in [0, 1]. Higher = stronger signal. */
  score: number;
  /** Objects the insight applies to. `[0]` is the primary subject. */
  objectIds: readonly KnowledgeObjectId[];
  /** Relationship ids that back the evidence. May be empty for insights
   *  that are defined by the *absence* of relationships (isolated). */
  relationshipIds: readonly string[];
  /** One-sentence deterministic explanation. Required. */
  why: string;
  /** At least one evidence entry. Required by contract. */
  evidence: readonly DiscoveryEvidence[];
  metadata: DiscoveryInsightMetadata;
}

/** Priority sort weight — lower renders first. */
export const INSIGHT_PRIORITY_ORDER: Readonly<Record<InsightPriority, number>> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};
