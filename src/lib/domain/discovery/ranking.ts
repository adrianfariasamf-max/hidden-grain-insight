// Deterministic ranking for Discovery Insights (EPIC-004.1).
//
// Sort keys (in order):
//   1. priority (critical < high < medium < low < info)
//   2. score DESC (higher first)
//   3. type order from the ontology (structural first)
//   4. id ASC (final tie-breaker, guarantees stability)
//
// Never depend on the incoming array order.

import { compareInsightTypes, getInsightTypeDescriptor } from "./ontology";
import { INSIGHT_PRIORITY_ORDER, type DiscoveryInsight } from "./types";

export function compareInsights(a: DiscoveryInsight, b: DiscoveryInsight): number {
  const pa = INSIGHT_PRIORITY_ORDER[a.priority] ?? Number.MAX_SAFE_INTEGER;
  const pb = INSIGHT_PRIORITY_ORDER[b.priority] ?? Number.MAX_SAFE_INTEGER;
  if (pa !== pb) return pa - pb;
  if (a.score !== b.score) return b.score - a.score;
  const tc = compareInsightTypes(
    getInsightTypeDescriptor(a.type),
    getInsightTypeDescriptor(b.type),
  );
  if (tc !== 0) return tc;
  return a.id.localeCompare(b.id);
}

/** Returns a NEW ordered array; input is not mutated. */
export function rankInsights(insights: readonly DiscoveryInsight[]): DiscoveryInsight[] {
  return [...insights].sort(compareInsights);
}