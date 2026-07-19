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
import type { Relationship } from "./relationship";

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
  const categoryCounts = new Map<
    RelationshipCategory,
    { count: number; types: Set<string> }
  >();

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

  const categories: RelationshipCategoryStat[] = CATEGORY_ORDER
    .filter((c) => categoryCounts.has(c))
    .map((c) => {
      const entry = categoryCounts.get(c)!;
      return { category: c, count: entry.count, typeCount: entry.types.size };
    });

  const customTypeCount = types.reduce(
    (acc, t) => acc + (t.descriptor.isCustom ? 1 : 0),
    0,
  );

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