// Pure adapters from the canonical SearchQuery model to the HTTP
// contract shapes used by TanStack Query. Adapters:
//   - are pure and never throw;
//   - normalize the input first (idempotent);
//   - forward ONLY dimensions the backend currently understands;
//   - silently drop every other dimension (documented below) so that
//     forward-compatible fields such as `semantic`, `ai`, `graphScope`,
//     `dateRanges`, `labels`, `owners`, `tags` (partial), etc. never
//     leak into the wire request.
//
// The HTTP contract is single-valued for filter axes (`type`, `category`,
// `status`, `tag`, `nodeType`, `edgeType`), whereas SearchQuery keeps
// list-valued dimensions. When more than one value is present we forward
// the first (normalized order is deterministic) and leave the rest to be
// applied client-side by the caller.

import type { GraphQueryParams, ObjectsQueryParams } from "@/lib/api/types";

import { normalizeSearchQuery } from "./normalize";
import type { SearchQuery } from "./types";

function firstOrUndef(list: string[] | undefined): string | undefined {
  if (!list || list.length === 0) return undefined;
  return list[0];
}

/**
 * Map a canonical SearchQuery to `ObjectsQueryParams` (GET /objects).
 *
 * Supported dimensions: `text` → `q`, `objectTypes[0]` → `type`,
 * `categories[0]` → `category`, `status[0]` → `status`,
 * `tags[0]` → `tag`, `pagination.{offset,limit}`.
 *
 * Ignored (contract does not accept): `relationshipTypes`, `provenance`,
 * `labels`, `owners`, `dateRanges`, `graphScope`, `ordering`, `semantic`,
 * `ai`, `exact`, `fuzzy`, and every non-first value of list dimensions.
 */
export function toObjectsQueryParams(query: SearchQuery | null | undefined): ObjectsQueryParams {
  const q = normalizeSearchQuery(query);
  const out: ObjectsQueryParams = {};
  if (q.text) out.q = q.text;
  const type = firstOrUndef(q.objectTypes);
  if (type) out.type = type;
  const category = firstOrUndef(q.categories);
  if (category) out.category = category;
  const status = firstOrUndef(q.status);
  if (status) out.status = status;
  const tag = firstOrUndef(q.tags);
  if (tag) out.tag = tag;
  if (q.pagination) {
    out.offset = q.pagination.offset;
    out.limit = q.pagination.limit;
  }
  return out;
}

/**
 * Map a canonical SearchQuery to `GraphQueryParams` (GET /graph).
 *
 * Supported dimensions (all optional in the contract):
 *   `objectTypes[0]` → `nodeType`,
 *   `relationshipTypes[0]` → `edgeType`,
 *   `status` → `resolution` iff the set is exactly {"resolved"} or
 *     {"unresolved"} (otherwise omitted — the API only exposes those
 *     three states),
 *   `pagination.limit` → `limit`.
 *
 * Ignored: everything else, including multi-select selections beyond
 * the first value.
 */
export function toGraphQueryParams(query: SearchQuery | null | undefined): GraphQueryParams {
  const q = normalizeSearchQuery(query);
  const out: GraphQueryParams = {};
  const nodeType = firstOrUndef(q.objectTypes);
  if (nodeType) out.nodeType = nodeType;
  const edgeType = firstOrUndef(q.relationshipTypes);
  if (edgeType) out.edgeType = edgeType;
  if (q.status && q.status.length === 1) {
    const s = q.status[0];
    if (s === "resolved" || s === "unresolved") out.resolution = s;
  }
  if (q.pagination && typeof q.pagination.limit === "number") {
    out.limit = q.pagination.limit;
  }
  return out;
}
