// UI-prep selectors and adapters for Discovery Insights (EPIC-004.1).
//
// The Discovery Engine is NOT wired into any view yet (per the EPIC-004.1
// scope). This module exposes the pure adapters a future view will use so
// the integration is a wiring task, not a design task.
//
// All selectors are pure and safe on empty input.

import type { KnowledgeObjectId } from "@/lib/api/types";
import { getInsightTypeDescriptor, type InsightTypeDescriptor } from "./ontology";
import type { DiscoveryInsight, InsightCategory, InsightPriority, InsightType } from "./types";
import { compareInsights, rankInsights } from "./ranking";

/** All insights that reference the given object id (as primary or secondary). */
export function selectInsightsForObject(
  insights: readonly DiscoveryInsight[],
  objectId: KnowledgeObjectId,
): DiscoveryInsight[] {
  return insights.filter((i) => i.objectIds.includes(objectId));
}

export function selectInsightsByType(
  insights: readonly DiscoveryInsight[],
  type: InsightType,
): DiscoveryInsight[] {
  return insights.filter((i) => i.type === type);
}

export function selectInsightsByPriority(
  insights: readonly DiscoveryInsight[],
  priority: InsightPriority,
): DiscoveryInsight[] {
  return insights.filter((i) => i.priority === priority);
}

export function selectInsightsByCategory(
  insights: readonly DiscoveryInsight[],
  category: InsightCategory,
): DiscoveryInsight[] {
  return insights.filter((i) => getInsightTypeDescriptor(i.type).category === category);
}

/** Group insights by their ontology category. Deterministic ordering
 *  matches `rankInsights`. */
export function groupInsightsByCategory(
  insights: readonly DiscoveryInsight[],
): Map<InsightCategory, DiscoveryInsight[]> {
  const out = new Map<InsightCategory, DiscoveryInsight[]>();
  for (const i of rankInsights(insights)) {
    const cat = getInsightTypeDescriptor(i.type).category;
    const list = out.get(cat) ?? [];
    list.push(i);
    out.set(cat, list);
  }
  return out;
}

/** Group insights by their type descriptor. */
export function groupInsightsByType(
  insights: readonly DiscoveryInsight[],
): Map<InsightType, DiscoveryInsight[]> {
  const out = new Map<InsightType, DiscoveryInsight[]>();
  for (const i of rankInsights(insights)) {
    const list = out.get(i.type) ?? [];
    list.push(i);
    out.set(i.type, list);
  }
  return out;
}

/** Group insights by priority bucket. Deterministic ordering — buckets
 *  are emitted in canonical priority order (critical → info) and members
 *  keep the `rankInsights` order. Empty buckets are omitted. */
export function groupInsightsByPriority(
  insights: readonly DiscoveryInsight[],
): Map<InsightPriority, DiscoveryInsight[]> {
  const ordered = rankInsights(insights);
  const out = new Map<InsightPriority, DiscoveryInsight[]>();
  const canonical: InsightPriority[] = ["critical", "high", "medium", "low", "info"];
  for (const p of canonical) {
    const bucket = ordered.filter((i) => i.priority === p);
    if (bucket.length > 0) out.set(p, bucket);
  }
  return out;
}

/** Compact numeric summary — the shape a future dashboard card will render. */
export interface DiscoverySummary {
  total: number;
  byPriority: Readonly<Record<InsightPriority, number>>;
  byCategory: Readonly<Record<InsightCategory, number>>;
  distinctObjects: number;
}

export function summarizeInsights(insights: readonly DiscoveryInsight[]): DiscoverySummary {
  const byPriority: Record<InsightPriority, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  const byCategory: Record<InsightCategory, number> = {
    connectivity: 0,
    structural: 0,
    quality: 0,
    topology: 0,
    custom: 0,
  };
  const objects = new Set<KnowledgeObjectId>();
  for (const i of insights) {
    byPriority[i.priority] = (byPriority[i.priority] ?? 0) + 1;
    const cat = getInsightTypeDescriptor(i.type).category;
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    for (const id of i.objectIds) objects.add(id);
  }
  return { total: insights.length, byPriority, byCategory, distinctObjects: objects.size };
}

/** UI-facing view model for a single insight. Pure adapter — a future
 *  React component reads THIS, not the raw insight. Kept intentionally
 *  presentation-shaped (strings ready to render). */
export interface DiscoveryInsightViewModel {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  score: number;
  scorePct: number;
  title: string;
  description: string;
  why: string;
  descriptor: InsightTypeDescriptor;
  objectIds: readonly KnowledgeObjectId[];
  relationshipIds: readonly string[];
  evidence: DiscoveryInsight["evidence"];
}

export function toInsightViewModel(insight: DiscoveryInsight): DiscoveryInsightViewModel {
  const descriptor = getInsightTypeDescriptor(insight.type);
  return {
    id: insight.id,
    type: insight.type,
    priority: insight.priority,
    score: insight.score,
    scorePct: Math.round(insight.score * 100),
    title: descriptor.displayName,
    description: descriptor.description,
    why: insight.why,
    descriptor,
    objectIds: insight.objectIds,
    relationshipIds: insight.relationshipIds,
    evidence: insight.evidence,
  };
}

/** True when an insight carries the mandatory explainability fields.
 *  Consumers can assert on this in tests; the analyzer guarantees it. */
export function isExplained(insight: DiscoveryInsight): boolean {
  return insight.why.trim().length > 0 && insight.evidence.length > 0;
}

// ---------------------------------------------------------------------------
// Workspace filtering (EPIC-004.3).
//
// Every filter dimension is optional. An empty set means "no filter" for
// that dimension. `query` is a case-insensitive substring match against
// the fields a human would recognise: type id, descriptor display name,
// deterministic `why` text, and the involved object ids. All predicates
// are pure and O(n).
// ---------------------------------------------------------------------------

export interface DiscoveryFilters {
  readonly query: string;
  readonly priorities: ReadonlySet<InsightPriority>;
  readonly categories: ReadonlySet<InsightCategory>;
  readonly types: ReadonlySet<InsightType>;
}

export const EMPTY_DISCOVERY_FILTERS: DiscoveryFilters = {
  query: "",
  priorities: new Set(),
  categories: new Set(),
  types: new Set(),
};

/** Count of active filter dimensions — mirrors `ActiveFiltersBar`. */
export function countActiveDiscoveryFilters(filters: DiscoveryFilters): number {
  let n = 0;
  if (filters.query.trim().length > 0) n += 1;
  if (filters.priorities.size > 0) n += 1;
  if (filters.categories.size > 0) n += 1;
  if (filters.types.size > 0) n += 1;
  return n;
}

function insightMatchesQuery(insight: DiscoveryInsight, needle: string): boolean {
  if (!needle) return true;
  const q = needle.toLowerCase();
  if (insight.type.toLowerCase().includes(q)) return true;
  if (insight.why.toLowerCase().includes(q)) return true;
  const descriptor = getInsightTypeDescriptor(insight.type);
  if (descriptor.displayName.toLowerCase().includes(q)) return true;
  if (descriptor.category.toLowerCase().includes(q)) return true;
  for (const id of insight.objectIds) {
    if (id.toLowerCase().includes(q)) return true;
  }
  return false;
}

/** Pure predicate — a single insight against the workspace filters. */
export function matchesDiscoveryFilters(
  insight: DiscoveryInsight,
  filters: DiscoveryFilters,
): boolean {
  if (filters.priorities.size > 0 && !filters.priorities.has(insight.priority)) return false;
  if (filters.types.size > 0 && !filters.types.has(insight.type)) return false;
  if (filters.categories.size > 0) {
    const cat = getInsightTypeDescriptor(insight.type).category;
    if (!filters.categories.has(cat)) return false;
  }
  const needle = filters.query.trim().toLowerCase();
  if (needle && !insightMatchesQuery(insight, needle)) return false;
  return true;
}

/** Apply the workspace filters. Ordering is delegated to `sortInsights`
 *  — this selector never sorts. */
export function selectInsightsByFilters(
  insights: readonly DiscoveryInsight[],
  filters: DiscoveryFilters,
): DiscoveryInsight[] {
  return insights.filter((i) => matchesDiscoveryFilters(i, filters));
}

// ---------------------------------------------------------------------------
// Sorting modes for the workspace list.
// `ranked` is the canonical order from `rankInsights` (priority → score →
// type → id). Alternate modes are pure comparators built on the same
// deterministic tiebreakers so ordering stays stable.
// ---------------------------------------------------------------------------

export type DiscoverySortMode = "ranked" | "score-desc" | "score-asc" | "type";

function compareByScoreDesc(a: DiscoveryInsight, b: DiscoveryInsight): number {
  if (a.score !== b.score) return b.score - a.score;
  return compareInsights(a, b);
}

function compareByScoreAsc(a: DiscoveryInsight, b: DiscoveryInsight): number {
  if (a.score !== b.score) return a.score - b.score;
  return compareInsights(a, b);
}

function compareByType(a: DiscoveryInsight, b: DiscoveryInsight): number {
  const da = getInsightTypeDescriptor(a.type);
  const db = getInsightTypeDescriptor(b.type);
  if (da.order !== db.order) return da.order - db.order;
  return compareInsights(a, b);
}

/** Deterministic sort with a chosen mode. Never mutates input. */
export function sortInsights(
  insights: readonly DiscoveryInsight[],
  mode: DiscoverySortMode,
): DiscoveryInsight[] {
  switch (mode) {
    case "score-desc":
      return [...insights].sort(compareByScoreDesc);
    case "score-asc":
      return [...insights].sort(compareByScoreAsc);
    case "type":
      return [...insights].sort(compareByType);
    case "ranked":
    default:
      return rankInsights(insights);
  }
}
