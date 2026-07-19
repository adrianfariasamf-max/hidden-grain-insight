// Local, network-free normalization and validation helpers for the
// Hidden Grain read-only client. Used before both cache-key creation
// and HTTP request serialization so the same input always produces
// the same normalized shape.

import type { ObjectsQueryParams } from "./types";

export const SEARCH_MAX_LENGTH = 200;
export const LIMIT_MIN = 1;
export const LIMIT_MAX = 100;
export const DEFAULT_LIMIT = 20;

/** Trim, collapse runs of whitespace, cap length. */
export function normalizeSearch(input: string | undefined | null): string {
  if (!input) return "";
  const collapsed = input.replace(/\s+/g, " ").trim();
  if (collapsed.length <= SEARCH_MAX_LENGTH) return collapsed;
  return collapsed.slice(0, SEARCH_MAX_LENGTH);
}

/** Trim a filter value. Empty strings become undefined. */
export function normalizeFilter(input: string | undefined | null): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export function normalizeOffset(input: number | undefined | null): number {
  const n = typeof input === "number" && Number.isFinite(input) ? Math.floor(input) : 0;
  return n < 0 ? 0 : n;
}

export function normalizeLimit(input: number | undefined | null): number {
  const n =
    typeof input === "number" && Number.isFinite(input) ? Math.floor(input) : DEFAULT_LIMIT;
  if (n < LIMIT_MIN) return LIMIT_MIN;
  if (n > LIMIT_MAX) return LIMIT_MAX;
  return n;
}

/** Produce a stable, minimal ObjectsQueryParams: omits empty values, sorts
 *  offset/limit into range. Used both for the query key and the HTTP call. */
export function normalizeObjectsParams(input: ObjectsQueryParams): ObjectsQueryParams {
  const out: ObjectsQueryParams = {
    offset: normalizeOffset(input.offset ?? 0),
    limit: normalizeLimit(input.limit ?? DEFAULT_LIMIT),
  };
  const q = normalizeSearch(input.q);
  if (q) out.q = q;
  const t = normalizeFilter(input.type);
  if (t) out.type = t;
  const c = normalizeFilter(input.category);
  if (c) out.category = c;
  const s = normalizeFilter(input.status);
  if (s) out.status = s;
  return out;
}

// Knowledge Object IDs are opaque strings. The real contract does not
// pin a format, so we validate defensively: non-empty, reasonable length,
// no whitespace or control characters, only characters seen in practice
// (letters, digits, and common path/id punctuation).
const ID_PATTERN = /^[A-Za-z0-9._:\-/]+$/;
const ID_MAX_LENGTH = 256;

export function isValidKnowledgeObjectId(id: string | undefined | null): boolean {
  if (!id) return false;
  if (id.length === 0 || id.length > ID_MAX_LENGTH) return false;
  return ID_PATTERN.test(id);
}