// TanStack Query cache-key preparation for SearchQuery.
//
// This module does NOT modify existing queries. It provides stable key
// factories that a future search-driven query can adopt without
// diverging from the canonical serialization.
//
// Rule: every key ends with the serialized SearchQuery so cache
// entries collapse for equivalent queries regardless of input shape.

import { serializeSearchQuery } from "./serialize";
import type { SearchQuery } from "./types";

export const SEARCH_CACHE_ROOT = ["hg", "search"] as const;

export const searchCacheKeys = {
  all: () => SEARCH_CACHE_ROOT,
  /** Key for a generic search-driven object list. */
  objects: (query: SearchQuery) =>
    [...SEARCH_CACHE_ROOT, "objects", serializeSearchQuery(query)] as const,
  /** Key for a generic search-driven graph slice. */
  graph: (query: SearchQuery) =>
    [...SEARCH_CACHE_ROOT, "graph", serializeSearchQuery(query)] as const,
};