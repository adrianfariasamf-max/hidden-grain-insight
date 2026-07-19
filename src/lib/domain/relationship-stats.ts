// Derived statistics for canonical Relationships (EPIC-002.4).
//
// This module is the single place where "counts by type" and
// "counts by category" are computed from a list of `Relationship`
// values. Feature code (Graph legend, filters, future analytics)
// consumes the result — it must never re-derive counts inline.
//
// The functions are pure and side-effect free so callers can wrap
// them in `useMemo` with confidence.

import {
  compareRelationshipTypes,
  getRelationshipTypeDescriptor,
  type RelationshipCategory,
  type RelationshipTypeDescriptor,
} from "./relationship-ontology";
import type { Relationship, RelationshipProvenance, RelationshipStatus } from "./relationship";
import {
  getRelationshipProvenanceDescriptor,
  getRelationshipStatusDescriptor,
  normalizeConfidence,
  type RelationshipProvenanceDescriptor,
  type RelationshipStatusDescriptor,
} from "./relationship-trust";

export interface RelationshipTypeStat {
  descriptor: RelationshipTypeDescriptor;
  count: number;
}

export interface RelationshipCategoryStat {
  category: RelationshipCategory;
  count: number;
  /** How many DISTINCT types in the dataset belong to this category. */
  typeCount: number;
}

export interface RelationshipSummary {
  total: number;
  /** Types actually present in the dataset, ordered via
   *  `compareRelationshipTypes`. Types absent from the dataset are NOT
   *  materialized — the legend/filter surface only shows what exists. */
  types: RelationshipTypeStat[];
  /** Categories present in the dataset, ordered by descending count
   *  and then by category id for determinism. */
  categories: RelationshipCategoryStat[];
  /** Number of custom (non-catalog) descriptors present. */
  customTypeCount: number;
}

const CATEGORY_ORDER: RelationshipCategory[] = [
  "structural",
  "dependency",
  "referential",
  "semantic",
  "custom",
];

/** Summarize a list of canonical relationships into ontology-aware
 *  counts. Descriptors are resolved through
 *  `getRelationshipTypeDescriptor` so custom/unknown wire types are
 *  preserved and grouped under the `custom` category. */
export function summarizeRelationships(
  relationships: readonly Relationship[],
): RelationshipSummary {
  const typeCounts = new Map<string, RelationshipTypeStat>();
  const categoryCounts = new Map<RelationshipCategory, { count: number; types: Set<string> }>();

  for (const rel of relationships) {
    const descriptor = getRelationshipTypeDescriptor(rel.type);
    const existing = typeCounts.get(descriptor.id);
    if (existing) {
      existing.count += 1;
    } else {
      typeCounts.set(descriptor.id, { descriptor, count: 1 });
    }
    const cat = categoryCounts.get(descriptor.category);
    if (cat) {
      cat.count += 1;
      cat.types.add(descriptor.id);
    } else {
      categoryCounts.set(descriptor.category, {
        count: 1,
        types: new Set([descriptor.id]),
      });
    }
  }

  const types = Array.from(typeCounts.values()).sort((a, b) =>
    compareRelationshipTypes(a.descriptor, b.descriptor),
  );

  const categories: RelationshipCategoryStat[] = CATEGORY_ORDER.filter((c) =>
    categoryCounts.has(c),
  ).map((c) => {
    const entry = categoryCounts.get(c)!;
    return { category: c, count: entry.count, typeCount: entry.types.size };
  });

  const customTypeCount = types.reduce((acc, t) => acc + (t.descriptor.isCustom ? 1 : 0), 0);

  return { total: relationships.length, types, categories, customTypeCount };
}

/** Human-readable label for a RelationshipCategory. Kept here (not in
 *  the ontology module) because it is a presentation concern. */
export function getRelationshipCategoryLabel(category: RelationshipCategory): string {
  switch (category) {
    case "structural":
      return "Structural";
    case "dependency":
      return "Dependency";
    case "referential":
      return "Referential";
    case "semantic":
      return "Semantic";
    case "custom":
      return "Custom";
  }
}

/** Predicate builder implementing the EPIC-002.4 filter semantics:
 *
 *    - within `typeIds`         → OR
 *    - within `categories`      → OR
 *    - between the two groups   → AND
 *
 *  Empty arrays mean "no constraint" for that group. The predicate
 *  operates on canonical `Relationship` values and resolves the
 *  descriptor for each item through the ontology, so custom types
 *  are matched by their preserved raw id and by the `custom`
 *  category consistently. */
export function buildRelationshipOntologyPredicate(options: {
  typeIds: readonly string[];
  categories: readonly RelationshipCategory[];
}): (rel: Relationship) => boolean {
  const typeSet = new Set(options.typeIds);
  const categorySet = new Set(options.categories);
  const hasTypes = typeSet.size > 0;
  const hasCategories = categorySet.size > 0;
  if (!hasTypes && !hasCategories) return () => true;
  return (rel) => {
    const descriptor = getRelationshipTypeDescriptor(rel.type);
    if (hasTypes && !typeSet.has(descriptor.id)) return false;
    if (hasCategories && !categorySet.has(descriptor.category)) return false;
    return true;
  };
}

// ---------------------------------------------------------------------------
// Trust — provenance / status / confidence (EPIC-002.5)
//
// Trust stats are computed independently from the ontology counts so a
// legend can be shown / hidden based on real data presence. Missing
// values are NEVER coerced into synthetic defaults — a relationship
// without `provenance` contributes to `withoutProvenance`, not to
// `projection`. Same for `confidence` and `status`.
// ---------------------------------------------------------------------------

export interface RelationshipProvenanceStat {
  descriptor: RelationshipProvenanceDescriptor;
  count: number;
}

export interface RelationshipStatusStat {
  descriptor: RelationshipStatusDescriptor;
  count: number;
}

export interface RelationshipTrustSummary {
  total: number;
  provenances: RelationshipProvenanceStat[];
  /** Number of relationships that did NOT declare a provenance. */
  withoutProvenance: number;
  statuses: RelationshipStatusStat[];
  /** Number of relationships that did NOT declare a status. */
  withoutStatus: number;
  /** Number of relationships that declared a numeric confidence. */
  withConfidence: number;
  /** Number of relationships that did NOT declare a confidence. */
  withoutConfidence: number;
  /** True iff at least one relationship declared a confidence value. */
  hasConfidence: boolean;
  /** True iff at least one relationship declared a provenance value. */
  hasProvenance: boolean;
  /** True iff more than one distinct status value is observed — a single
   *  status across the whole dataset is a technical invariant and MUST
   *  NOT produce a filter surface. */
  hasMeaningfulStatus: boolean;
}

export function summarizeRelationshipTrust(
  relationships: readonly Relationship[],
): RelationshipTrustSummary {
  const provCounts = new Map<string, RelationshipProvenanceStat>();
  const statusCounts = new Map<string, RelationshipStatusStat>();
  let withoutProvenance = 0;
  let withoutStatus = 0;
  let withConfidence = 0;
  let withoutConfidence = 0;

  for (const rel of relationships) {
    const prov = getRelationshipProvenanceDescriptor(rel.provenance);
    if (prov) {
      const hit = provCounts.get(prov.id);
      if (hit) hit.count += 1;
      else provCounts.set(prov.id, { descriptor: prov, count: 1 });
    } else {
      withoutProvenance += 1;
    }

    const status = getRelationshipStatusDescriptor(rel.status);
    if (status) {
      const hit = statusCounts.get(status.id);
      if (hit) hit.count += 1;
      else statusCounts.set(status.id, { descriptor: status, count: 1 });
    } else {
      withoutStatus += 1;
    }

    if (normalizeConfidence(rel.confidence) !== undefined) withConfidence += 1;
    else withoutConfidence += 1;
  }

  const provenances = Array.from(provCounts.values()).sort(
    (a, b) => a.descriptor.order - b.descriptor.order,
  );
  const statuses = Array.from(statusCounts.values()).sort(
    (a, b) => a.descriptor.order - b.descriptor.order,
  );

  return {
    total: relationships.length,
    provenances,
    withoutProvenance,
    statuses,
    withoutStatus,
    withConfidence,
    withoutConfidence,
    hasConfidence: withConfidence > 0,
    hasProvenance: provenances.length > 0,
    hasMeaningfulStatus: statuses.length > 1,
  };
}

/** Sentinel used by the provenance filter to represent "no provenance
 *  declared" without colliding with a real domain value. */
export const PROVENANCE_NOT_SPECIFIED = "__not_specified__" as const;
export type ProvenanceFilterValue = RelationshipProvenance | typeof PROVENANCE_NOT_SPECIFIED;

export interface TrustPredicateOptions {
  /** OR within group. Empty array = no constraint. Include
   *  `PROVENANCE_NOT_SPECIFIED` to explicitly keep relationships without
   *  a declared provenance. */
  provenances: readonly ProvenanceFilterValue[];
  /** OR within group. Empty array = no constraint. */
  statuses: readonly RelationshipStatus[];
  /** Minimum confidence in [0..1]. `undefined` (or 0) = no threshold. */
  minConfidence?: number;
  /** How to treat relationships that do not declare a confidence value
   *  when `minConfidence > 0`. Default is `"include"` — the threshold
   *  never silently drops relationships whose confidence is unknown. */
  unknownConfidencePolicy?: "include" | "exclude";
}

/**
 * Build the combined trust predicate:
 *
 *   - provenances / statuses     → OR within group, AND between groups
 *   - minConfidence              → AND
 *   - unknownConfidencePolicy    → controls how missing confidence is
 *                                  treated when a threshold is active
 *
 * Empty arrays and `undefined` fields mean "no constraint" for that
 * dimension. When every dimension is empty the predicate is a no-op.
 */
export function buildRelationshipTrustPredicate(
  options: TrustPredicateOptions,
): (rel: Relationship) => boolean {
  const provSet = new Set<string>(options.provenances);
  const statusSet = new Set<string>(options.statuses);
  const hasProv = provSet.size > 0;
  const hasStatus = statusSet.size > 0;
  const threshold = normalizeConfidence(options.minConfidence) ?? 0;
  const hasThreshold = threshold > 0;
  const excludeUnknownConfidence = hasThreshold && options.unknownConfidencePolicy === "exclude";

  if (!hasProv && !hasStatus && !hasThreshold) return () => true;

  return (rel) => {
    if (hasProv) {
      const prov = getRelationshipProvenanceDescriptor(rel.provenance);
      const key = prov?.id ?? PROVENANCE_NOT_SPECIFIED;
      if (!provSet.has(key)) return false;
    }
    if (hasStatus) {
      if (!rel.status || !statusSet.has(rel.status)) return false;
    }
    if (hasThreshold) {
      const c = normalizeConfidence(rel.confidence);
      if (c === undefined) {
        if (excludeUnknownConfidence) return false;
      } else if (c < threshold) {
        return false;
      }
    }
    return true;
  };
}
