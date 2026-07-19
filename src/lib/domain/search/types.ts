// Canonical SearchQuery model — single source of truth for any search
// operation across Hidden Grain (Explorer, Graph, Object Detail, future
// semantic / AI / agent surfaces).
//
// Invariants:
//   - Every field is OPTIONAL. An empty SearchQuery ({}) is valid and
//     means "no filter".
//   - This model is transport-agnostic: it does not mirror the HTTP
//     contract 1:1. Mapping to `ObjectsQueryParams` / `GraphQueryParams`
//     happens at the edges, not here.
//   - Only fields declared here are canonical. Callers must not attach
//     ad-hoc properties.
//   - No field in this file implies backend support. Fields such as
//     `semantic`, `ai`, `fuzzy`, `graphScope`, `owners`, `labels` and
//     date ranges are declared for forward compatibility and are inert
//     until a consumer wires them.

export type SortDirection = "asc" | "desc";

export interface SearchOrdering {
  /** Opaque field name understood by the consumer (e.g. "title", "updatedAt"). */
  field: string;
  direction: SortDirection;
}

export interface SearchPagination {
  offset: number;
  limit: number;
}

export interface SearchDateRange {
  /** ISO 8601 string. Inclusive. */
  from?: string;
  /** ISO 8601 string. Inclusive. */
  to?: string;
}

export interface SearchDateRanges {
  created?: SearchDateRange;
  updated?: SearchDateRange;
}

/** Optional scope restricting a search to a sub-region of the graph. */
export interface SearchGraphScope {
  /** Object ids that must appear as endpoints of considered edges/nodes. */
  rootIds?: string[];
  /** Maximum traversal depth from any rootId. */
  depth?: number;
  /** If provided, only follow these relationship types during traversal. */
  relationshipTypes?: string[];
}

/** Free-form semantic search intent. Inert until a semantic index exists. */
export interface SearchSemanticIntent {
  /** Human phrasing. */
  query: string;
  /** Optional similarity threshold in [0, 1]. */
  threshold?: number;
}

/** Free-form AI intent (natural language). Inert until an AI adapter exists. */
export interface SearchAiIntent {
  prompt: string;
}

/**
 * Canonical, transport-agnostic search description.
 *
 * All fields are optional. Consumers should treat unknown/undefined as
 * "no constraint on this dimension".
 */
export interface SearchQuery {
  // Textual
  text?: string;
  /** Interpret `text` as an exact phrase match. */
  exact?: boolean;
  /** Allow fuzzy matching of `text`. */
  fuzzy?: boolean;

  // Canonical taxonomic dimensions
  objectTypes?: string[];
  relationshipTypes?: string[];
  categories?: string[];
  provenance?: string[];
  status?: string[];
  tags?: string[];
  labels?: string[];
  owners?: string[];

  // Temporal
  dateRanges?: SearchDateRanges;

  // Structural
  graphScope?: SearchGraphScope;

  // Presentation
  pagination?: SearchPagination;
  ordering?: SearchOrdering[];

  // Forward-compat intents
  semantic?: SearchSemanticIntent;
  ai?: SearchAiIntent;
}

/** Keys of every list-valued dimension. Useful for generic UI code. */
export const SEARCH_LIST_DIMENSIONS = [
  "objectTypes",
  "relationshipTypes",
  "categories",
  "provenance",
  "status",
  "tags",
  "labels",
  "owners",
] as const;

export type SearchListDimension = (typeof SEARCH_LIST_DIMENSIONS)[number];