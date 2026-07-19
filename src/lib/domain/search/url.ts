// URL preparation for SearchQuery.
//
// This module ONLY prepares the mapping. It does NOT read or write
// `window.location` and is not yet wired into any route. When the
// Explorer / Graph adopt SearchQuery as their URL contract, they should
// delegate to these helpers so the URL shape stays canonical.
//
// Contract:
//   - The canonical URL representation of a SearchQuery is a single
//     search param, `SEARCH_QUERY_PARAM`, whose value is the output of
//     `serializeSearchQuery`.
//   - This keeps every dimension representable without inventing a
//     dozen bespoke query-string keys, and it is round-trip stable.
//   - An empty query serializes to `{}`; callers should strip the
//     param entirely rather than embedding `?q={}` in the URL.

import { deserializeSearchQuery, serializeSearchQuery } from "./serialize";
import type { SearchQuery } from "./types";

export const SEARCH_QUERY_PARAM = "s";

/** Convert a SearchQuery to a URL param value, or null if it is empty. */
export function searchQueryToUrlParam(query: SearchQuery | null | undefined): string | null {
  const serialized = serializeSearchQuery(query);
  return serialized === "{}" ? null : serialized;
}

/** Parse a URL param value back into a normalized SearchQuery. */
export function urlParamToSearchQuery(value: string | null | undefined): SearchQuery {
  return deserializeSearchQuery(value);
}