// Deterministic serialization for SearchQuery.
//
// Two SearchQueries that normalize to the same value MUST produce the
// exact same string. This makes the serialized form safe as:
//   - a cache key
//   - a URL search fragment (once wired)
//   - an equality primitive across processes
//
// Format: JSON with keys sorted lexicographically at every depth. Arrays
// are preserved in the order produced by normalization (already sorted
// for the list dimensions).

import { normalizeSearchQuery } from "./normalize";
import type { SearchQuery } from "./types";

function sortedStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(sortedStringify).join(",") + "]";
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, v]) => v !== undefined,
  );
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return (
    "{" +
    entries.map(([k, v]) => JSON.stringify(k) + ":" + sortedStringify(v)).join(",") +
    "}"
  );
}

/** Serialize a SearchQuery to a stable, deterministic string. */
export function serializeSearchQuery(query: SearchQuery | null | undefined): string {
  return sortedStringify(normalizeSearchQuery(query));
}

/**
 * Parse a serialized SearchQuery. Never throws: malformed input yields
 * an empty query. The result is normalized.
 */
export function deserializeSearchQuery(serialized: string | null | undefined): SearchQuery {
  if (!serialized) return {};
  try {
    const parsed = JSON.parse(serialized) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return normalizeSearchQuery(parsed as SearchQuery);
  } catch {
    return {};
  }
}

/**
 * Structural equality on normalized SearchQueries.
 * Returns true iff `a` and `b` describe the same search.
 */
export function compareSearchQuery(
  a: SearchQuery | null | undefined,
  b: SearchQuery | null | undefined,
): boolean {
  return serializeSearchQuery(a) === serializeSearchQuery(b);
}