// Discovery Insight Ontology (EPIC-004.1).
//
// Single source of truth for insight-type presentation metadata.
// Feature code MUST resolve every raw type through
// `getInsightTypeDescriptor()` — no scattered string tables.

import {
  AlertTriangle,
  Compass,
  GitBranch,
  GitMerge,
  Layers,
  MinusCircle,
  Network,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { InsightCategory, InsightPriority, InsightType } from "./types";

export interface InsightTypeDescriptor {
  id: InsightType;
  displayName: string;
  description: string;
  icon: LucideIcon;
  category: InsightCategory;
  /** Suggested priority for this type — the analyzer may override on a
   *    per-insight basis, but this drives defaults and legends. */
  suggestedPriority: InsightPriority;
  /** Deterministic sort weight — lower renders first in menus/legends. */
  order: number;
  /** True for the reserved "CUSTOM" catch-all. */
  isCustom: boolean;
}

const CATALOG: readonly InsightTypeDescriptor[] = [
  {
    id: "ISOLATED_OBJECT",
    displayName: "Isolated object",
    description: "The object has no incoming or outgoing relationships.",
    icon: MinusCircle,
    category: "quality",
    suggestedPriority: "high",
    order: 10,
    isCustom: false,
  },
  {
    id: "UNRESOLVED_CLUSTER",
    displayName: "Unresolved cluster",
    description: "A majority of the object's relationships point to unresolved targets.",
    icon: AlertTriangle,
    category: "quality",
    suggestedPriority: "critical",
    order: 20,
    isCustom: false,
  },
  {
    id: "HIGHLY_CONNECTED",
    displayName: "Highly connected",
    description: "The object has a statistically high total degree.",
    icon: Zap,
    category: "connectivity",
    suggestedPriority: "high",
    order: 30,
    isCustom: false,
  },
  {
    id: "POTENTIAL_HUB",
    displayName: "Potential hub",
    description: "The object is above the average degree but below the top tier.",
    icon: TrendingUp,
    category: "connectivity",
    suggestedPriority: "medium",
    order: 35,
    isCustom: false,
  },
  {
    id: "MULTIPLE_INCOMING",
    displayName: "Multiple incoming",
    description: "Several objects reference this one.",
    icon: GitMerge,
    category: "connectivity",
    suggestedPriority: "medium",
    order: 40,
    isCustom: false,
  },
  {
    id: "MULTIPLE_OUTGOING",
    displayName: "Multiple outgoing",
    description: "The object references several other objects.",
    icon: GitBranch,
    category: "connectivity",
    suggestedPriority: "medium",
    order: 41,
    isCustom: false,
  },
  {
    id: "CENTRAL_CONNECTOR",
    displayName: "Central connector",
    description: "The object bridges multiple relationship categories.",
    icon: Compass,
    category: "topology",
    suggestedPriority: "high",
    order: 50,
    isCustom: false,
  },
  {
    id: "DENSE_CLUSTER_MEMBER",
    displayName: "Dense cluster member",
    description: "The object belongs to a large connected component.",
    icon: Network,
    category: "topology",
    suggestedPriority: "low",
    order: 60,
    isCustom: false,
  },
  {
    id: "SPARSE_CLUSTER_MEMBER",
    displayName: "Sparse cluster member",
    description: "The object belongs to a small connected component.",
    icon: Layers,
    category: "topology",
    suggestedPriority: "low",
    order: 61,
    isCustom: false,
  },
  {
    id: "CUSTOM",
    displayName: "Custom insight",
    description: "A recommendation produced by a non-catalog analyzer.",
    icon: Sparkles,
    category: "custom",
    suggestedPriority: "info",
    order: 900,
    isCustom: true,
  },
];

const LOOKUP: ReadonlyMap<InsightType, InsightTypeDescriptor> = new Map(
  CATALOG.map((d) => [d.id, d]),
);

/** Reserved fallback for insight types that are not in the official catalog. */
const CUSTOM_FALLBACK: InsightTypeDescriptor = {
  id: "CUSTOM",
  displayName: "Custom insight",
  description: "",
  icon: Target,
  category: "custom",
  suggestedPriority: "info",
  order: 999,
  isCustom: true,
};

/** Canonical accessor. Never throws, never returns undefined. */
export function getInsightTypeDescriptor(
  type: InsightType | undefined | null,
): InsightTypeDescriptor {
  if (!type) return CUSTOM_FALLBACK;
  return LOOKUP.get(type) ?? CUSTOM_FALLBACK;
}

/** Full catalog, sorted deterministically. */
export function listInsightTypes(): readonly InsightTypeDescriptor[] {
  return [...CATALOG].sort((a, b) => a.order - b.order);
}

/** Deterministic comparator across descriptors. */
export function compareInsightTypes(a: InsightTypeDescriptor, b: InsightTypeDescriptor): number {
  if (a.order !== b.order) return a.order - b.order;
  return a.id.localeCompare(b.id);
}
