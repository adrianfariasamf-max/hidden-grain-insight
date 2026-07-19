// UI-prep selectors and adapters for Discovery Insights (EPIC-004.1).
//
// The Discovery Engine is NOT wired into any view yet (per the EPIC-004.1
// scope). This module exposes the pure adapters a future view will use so
// the integration is a wiring task, not a design task.
//
// All selectors are pure and safe on empty input.

import type { KnowledgeObjectId } from "@/lib/api/types";
import { getInsightTypeDescriptor, type InsightTypeDescriptor } from "./ontology";
import type {
  DiscoveryInsight,
  InsightCategory,
  InsightPriority,
  InsightType,
} from "./types";
import { rankInsights } from "./ranking";

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