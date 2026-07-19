// Pure validation for SearchQuery. Prefers normalization over throwing:
// `isValidSearchQuery` reports validity, `validateSearchQuery` returns
// the normalized query alongside any warnings for fragments that were
// coerced or dropped.
//
// No exception is ever thrown from this module.

import { normalizeSearchQuery } from "./normalize";
import { serializeSearchQuery } from "./serialize";
import type { SearchQuery } from "./types";

export interface SearchQueryValidation {
  /** Normalized (and therefore safe-to-use) query. */
  query: SearchQuery;
  /** True when the input round-trips through normalization unchanged. */
  ok: boolean;
  /** Human-readable warnings for dropped/coerced fragments. */
  warnings: string[];
}

export function validateSearchQuery(input: unknown): SearchQueryValidation {
  const normalized = normalizeSearchQuery(input as SearchQuery);
  const warnings: string[] = [];

  if (input && typeof input === "object" && !Array.isArray(input)) {
    const before = serializeSearchQuery(input as SearchQuery);
    const after = serializeSearchQuery(normalized);
    if (before !== after) warnings.push("Query was normalized: some fragments were coerced or dropped.");
  } else if (input !== undefined && input !== null) {
    warnings.push("Input was not an object; treated as empty query.");
  }

  return { query: normalized, ok: warnings.length === 0, warnings };
}

export function isValidSearchQuery(input: unknown): boolean {
  return validateSearchQuery(input).ok;
}