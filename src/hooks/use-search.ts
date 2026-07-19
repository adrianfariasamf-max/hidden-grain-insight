// React integration for the canonical SearchQuery domain.
//
// This hook is a thin adapter: every operation delegates to pure
// functions in `@/lib/domain/search`. No filtering, no adaptation,
// no HTTP awareness lives here. The purpose is only to hold a
// normalized SearchQuery in React state and expose stable callbacks
// so Explorer, Graph and any future surface share ONE integration
// point without duplicating filter bookkeeping.
//
// Callers that need URL persistence (Explorer) still own their URL
// serialization: pass `value` + `onChange` to run in controlled mode.
// Callers with purely local state (Graph) can use the uncontrolled
// mode by omitting `value`.

import { useCallback, useMemo, useState } from "react";

import {
  clearFilter as clearFilterFn,
  clearFilters as clearFiltersFn,
  compareSearchQuery,
  countActiveFilters,
  type FilterDimension,
  getActiveFilters,
  isEmptySearchQuery,
  normalizeSearchQuery,
  serializeSearchQuery,
  type SearchQuery,
} from "@/lib/domain/search";

export type SearchQueryUpdater = SearchQuery | ((prev: SearchQuery) => SearchQuery);

export interface UseSearchOptions {
  /** Initial value for uncontrolled mode. Ignored when `value` is set. */
  initial?: SearchQuery;
  /** Controlled value. When provided, `onChange` must also be set. */
  value?: SearchQuery;
  /** Controlled setter. Called with a fully-normalized SearchQuery. */
  onChange?: (next: SearchQuery) => void;
}

export interface UseSearchResult {
  /** Always-normalized current SearchQuery. */
  query: SearchQuery;
  /** Set the query wholesale or via updater. Input is normalized. */
  setQuery: (next: SearchQueryUpdater) => void;
  /** Shallow-merge patch. Undefined values remove a dimension. */
  patchQuery: (patch: Partial<SearchQuery>) => void;
  /** Clear a single dimension (does not touch pagination/ordering). */
  clearDimension: (dimension: FilterDimension) => void;
  /** Clear all filter dimensions; preserves pagination/ordering. */
  clearAll: () => void;
  /** Active-filter count (excludes pagination/ordering). */
  activeCount: number;
  /** True iff no active filters. */
  isEmpty: boolean;
  /** Active dimensions, in canonical order. */
  activeDimensions: FilterDimension[];
  /** Deterministic serialization of the current query. */
  serialized: string;
}

/**
 * Hook for owning a canonical SearchQuery in React.
 *
 * Guarantees:
 *   - Every value emitted through `query` / `setQuery` / `patchQuery` is
 *     normalized by `normalizeSearchQuery`.
 *   - Callback identities are stable across renders (they close over
 *     the setter, not over `query`).
 *   - Structural updates that normalize to the same value do NOT
 *     trigger a re-render in uncontrolled mode.
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchResult {
  const controlled = options.value !== undefined;
  const [uncontrolled, setUncontrolled] = useState<SearchQuery>(() =>
    normalizeSearchQuery(options.initial ?? {}),
  );
  const rawQuery = controlled ? (options.value as SearchQuery) : uncontrolled;

  // Normalize on read. Cheap and guarantees the invariant even if a
  // controlled parent passes a non-normalized value.
  const query = useMemo(() => normalizeSearchQuery(rawQuery), [rawQuery]);

  const onChange = options.onChange;

  const setQuery = useCallback<UseSearchResult["setQuery"]>(
    (next) => {
      if (controlled) {
        // Controlled: compute against the latest prop value.
        const prev = normalizeSearchQuery(options.value as SearchQuery);
        const computed = typeof next === "function" ? next(prev) : next;
        const normalized = normalizeSearchQuery(computed);
        if (compareSearchQuery(prev, normalized)) return;
        onChange?.(normalized);
        return;
      }
      setUncontrolled((prev) => {
        const computed = typeof next === "function" ? next(prev) : next;
        const normalized = normalizeSearchQuery(computed);
        if (compareSearchQuery(prev, normalized)) return prev;
        return normalized;
      });
    },
    [controlled, onChange, options.value],
  );

  const patchQuery = useCallback<UseSearchResult["patchQuery"]>(
    (patch) => {
      setQuery((prev) => ({ ...prev, ...patch }));
    },
    [setQuery],
  );

  const clearDimension = useCallback<UseSearchResult["clearDimension"]>(
    (dimension) => {
      setQuery((prev) => clearFilterFn(prev, dimension));
    },
    [setQuery],
  );

  const clearAll = useCallback(() => {
    setQuery((prev) => clearFiltersFn(prev));
  }, [setQuery]);

  const activeDimensions = useMemo(() => getActiveFilters(query), [query]);
  const activeCount = activeDimensions.length;
  const isEmpty = activeCount === 0 && isEmptySearchQuery(query);
  const serialized = useMemo(() => serializeSearchQuery(query), [query]);

  return {
    query,
    setQuery,
    patchQuery,
    clearDimension,
    clearAll,
    activeCount: countActiveFilters(query),
    isEmpty,
    activeDimensions,
    serialized,
  };
}