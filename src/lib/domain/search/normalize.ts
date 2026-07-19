// Pure normalization for SearchQuery.
//
// Invariants:
//   - Idempotent: normalize(normalize(q)) === normalize(q) structurally.
//   - Deterministic: equivalent inputs yield the same output regardless
//     of key order or list ordering.
//   - Never throws. Invalid fragments are dropped, not raised.
//   - Empty results are elided so `{}` is the canonical "no filter".

import type {
  SearchDateRange,
  SearchDateRanges,
  SearchGraphScope,
  SearchOrdering,
  SearchPagination,
  SearchQuery,
  SortDirection,
} from "./types";

const SORT_DIRECTIONS: SortDirection[] = ["asc", "desc"];

function normText(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const collapsed = v.replace(/\s+/g, " ").trim();
  return collapsed.length === 0 ? undefined : collapsed;
}

function normStringList(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const seen = new Set<string>();
  for (const item of v) {
    const t = normText(item);
    if (t) seen.add(t);
  }
  if (seen.size === 0) return undefined;
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

function normIsoDate(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function normDateRange(v: unknown): SearchDateRange | undefined {
  if (!v || typeof v !== "object") return undefined;
  const src = v as Record<string, unknown>;
  const from = normIsoDate(src.from);
  const to = normIsoDate(src.to);
  if (!from && !to) return undefined;
  // If both present and inverted, swap so `from <= to`.
  if (from && to && from > to) return { from: to, to: from };
  const out: SearchDateRange = {};
  if (from) out.from = from;
  if (to) out.to = to;
  return out;
}

function normDateRanges(v: unknown): SearchDateRanges | undefined {
  if (!v || typeof v !== "object") return undefined;
  const src = v as Record<string, unknown>;
  const created = normDateRange(src.created);
  const updated = normDateRange(src.updated);
  if (!created && !updated) return undefined;
  const out: SearchDateRanges = {};
  if (created) out.created = created;
  if (updated) out.updated = updated;
  return out;
}

function normPagination(v: unknown): SearchPagination | undefined {
  if (!v || typeof v !== "object") return undefined;
  const src = v as Record<string, unknown>;
  const rawOffset =
    typeof src.offset === "number" && Number.isFinite(src.offset) ? Math.floor(src.offset) : 0;
  const rawLimit =
    typeof src.limit === "number" && Number.isFinite(src.limit) ? Math.floor(src.limit) : NaN;
  if (!Number.isFinite(rawLimit) || rawLimit <= 0) return undefined;
  return {
    offset: rawOffset < 0 ? 0 : rawOffset,
    limit: rawLimit,
  };
}

function normOrdering(v: unknown): SearchOrdering[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: SearchOrdering[] = [];
  const seenFields = new Set<string>();
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const src = item as Record<string, unknown>;
    const field = normText(src.field);
    if (!field || seenFields.has(field)) continue;
    const direction: SortDirection = SORT_DIRECTIONS.includes(src.direction as SortDirection)
      ? (src.direction as SortDirection)
      : "asc";
    seenFields.add(field);
    out.push({ field, direction });
  }
  return out.length === 0 ? undefined : out;
}

function normGraphScope(v: unknown): SearchGraphScope | undefined {
  if (!v || typeof v !== "object") return undefined;
  const src = v as Record<string, unknown>;
  const rootIds = normStringList(src.rootIds);
  const relationshipTypes = normStringList(src.relationshipTypes);
  let depth: number | undefined;
  if (typeof src.depth === "number" && Number.isFinite(src.depth)) {
    const d = Math.floor(src.depth);
    if (d >= 0) depth = d;
  }
  if (!rootIds && !relationshipTypes && depth === undefined) return undefined;
  const out: SearchGraphScope = {};
  if (rootIds) out.rootIds = rootIds;
  if (relationshipTypes) out.relationshipTypes = relationshipTypes;
  if (depth !== undefined) out.depth = depth;
  return out;
}

/**
 * Normalize any SearchQuery-shaped input into a canonical form.
 *
 * Empty / invalid fragments are elided. Never throws.
 */
export function normalizeSearchQuery(input: SearchQuery | null | undefined): SearchQuery {
  if (!input || typeof input !== "object") return {};
  const out: SearchQuery = {};

  const text = normText(input.text);
  if (text) out.text = text;
  if (text && input.exact === true) out.exact = true;
  if (text && input.fuzzy === true && input.exact !== true) out.fuzzy = true;

  const objectTypes = normStringList(input.objectTypes);
  if (objectTypes) out.objectTypes = objectTypes;
  const relationshipTypes = normStringList(input.relationshipTypes);
  if (relationshipTypes) out.relationshipTypes = relationshipTypes;
  const categories = normStringList(input.categories);
  if (categories) out.categories = categories;
  const provenance = normStringList(input.provenance);
  if (provenance) out.provenance = provenance;
  const status = normStringList(input.status);
  if (status) out.status = status;
  const tags = normStringList(input.tags);
  if (tags) out.tags = tags;
  const labels = normStringList(input.labels);
  if (labels) out.labels = labels;
  const owners = normStringList(input.owners);
  if (owners) out.owners = owners;

  const dateRanges = normDateRanges(input.dateRanges);
  if (dateRanges) out.dateRanges = dateRanges;

  const graphScope = normGraphScope(input.graphScope);
  if (graphScope) out.graphScope = graphScope;

  const pagination = normPagination(input.pagination);
  if (pagination) out.pagination = pagination;

  const ordering = normOrdering(input.ordering);
  if (ordering) out.ordering = ordering;

  if (input.semantic && typeof input.semantic === "object") {
    const q = normText(input.semantic.query);
    if (q) {
      const threshold =
        typeof input.semantic.threshold === "number" &&
        Number.isFinite(input.semantic.threshold) &&
        input.semantic.threshold >= 0 &&
        input.semantic.threshold <= 1
          ? input.semantic.threshold
          : undefined;
      out.semantic = threshold === undefined ? { query: q } : { query: q, threshold };
    }
  }

  if (input.ai && typeof input.ai === "object") {
    const prompt = normText(input.ai.prompt);
    if (prompt) out.ai = { prompt };
  }

  return out;
}
