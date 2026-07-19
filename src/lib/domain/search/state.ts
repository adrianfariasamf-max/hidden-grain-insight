// Pure state helpers for SearchQuery. No React, no side effects.
//
// "Active filter" = a normalized dimension that meaningfully constrains
// the result set. Pagination and ordering are presentational, not
// filters, and are excluded from the active-filter tally.

import { normalizeSearchQuery } from "./normalize";
import { serializeSearchQuery } from "./serialize";
import type { SearchQuery } from "./types";
import { SEARCH_LIST_DIMENSIONS } from "./types";

/** Dimensions considered by `countActiveFilters` / `getActiveFilters`. */
export const FILTER_DIMENSIONS = [
  "text",
  ...SEARCH_LIST_DIMENSIONS,
  "dateRanges",
  "graphScope",
  "semantic",
  "ai",
] as const;

export type FilterDimension = (typeof FILTER_DIMENSIONS)[number];

/** Returns the ordered list of dimensions that are currently active. */
export function getActiveFilters(query: SearchQuery | null | undefined): FilterDimension[] {
  const q = normalizeSearchQuery(query);
  const active: FilterDimension[] = [];
  for (const dim of FILTER_DIMENSIONS) {
    const value = q[dim];
    if (value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    active.push(dim);
  }
  return active;
}

/** Count of active (non-presentational) filter dimensions. */
export function countActiveFilters(query: SearchQuery | null | undefined): number {
  return getActiveFilters(query).length;
}

/** True iff the query has no active filters (pagination/ordering ignored). */
export function isEmptySearchQuery(query: SearchQuery | null | undefined): boolean {
  return countActiveFilters(query) === 0;
}

/**
 * Return a query with all filter dimensions cleared. Pagination and
 * ordering are preserved (they are presentational).
 */
export function clearFilters(query: SearchQuery | null | undefined): SearchQuery {
  const q = normalizeSearchQuery(query);
  const out: SearchQuery = {};
  if (q.pagination) out.pagination = { ...q.pagination, offset: 0 };
  if (q.ordering) out.ordering = q.ordering.map((o) => ({ ...o }));
  return out;
}

/** Clear a single filter dimension. Never throws. */
export function clearFilter(
  query: SearchQuery | null | undefined,
  dimension: FilterDimension,
): SearchQuery {
  const q = normalizeSearchQuery(query);
  if (q[dimension] === undefined) return q;
  const { [dimension]: _removed, ...rest } = q;
  void _removed;
  return normalizeSearchQuery(rest as SearchQuery);
}

/**
 * Describe the delta between two queries as the set of dimensions whose
 * normalized value differs. Presentational dimensions are included.
 */
export function diffSearchQuery(
  a: SearchQuery | null | undefined,
  b: SearchQuery | null | undefined,
): string[] {
  const na = normalizeSearchQuery(a) as Record<string, unknown>;
  const nb = normalizeSearchQuery(b) as Record<string, unknown>;
  const keys = new Set<string>([...Object.keys(na), ...Object.keys(nb)]);
  const changed: string[] = [];
  for (const k of keys) {
    if (serializeSearchQuery({ [k]: na[k] } as SearchQuery) !== serializeSearchQuery({ [k]: nb[k] } as SearchQuery)) {
      changed.push(k);
    }
  }
  return changed.sort();
}