// Single typed API client for the Hidden Grain read-only API.
// Base URL comes from VITE_HG_API_BASE. In dev this typically points to
// http://localhost:3000; in same-origin deployments it can be set to "/api".
// The client never writes, never mocks, and never invents fields.

import { ApiError, ApiNetworkError, ApiNotFoundError } from "./errors";
import type {
  GraphResponse,
  HealthResponse,
  IndexResponse,
  KnowledgeObject,
  KnowledgeObjectSummary,
  ObjectsQueryParams,
  Paginated,
  Relationship,
} from "./types";

const RAW_BASE = (import.meta.env.VITE_HG_API_BASE ?? "").toString().trim();

function resolveBase(): string {
  if (!RAW_BASE) {
    // No env override → assume same-origin `/api`. Documented in Phase 1 notes.
    return "/api";
  }
  return RAW_BASE.replace(/\/+$/, "");
}

export const API_BASE = resolveBase();

function buildUrl(path: string, query?: Record<string, unknown>): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE}${suffix}`;
  if (!query) return url;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `${url}?${qs}` : url;
}

async function request<T>(
  path: string,
  opts: { query?: Record<string, unknown>; signal?: AbortSignal } = {},
): Promise<T> {
  const url = buildUrl(path, opts.query);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: opts.signal,
    });
  } catch (cause) {
    throw new ApiNetworkError(url, cause);
  }

  if (response.status === 404) throw new ApiNotFoundError(url);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      if (body?.message) message = body.message;
      else if (body?.error) message = body.error;
    } catch {
      /* ignore body parse errors */
    }
    throw new ApiError(message, response.status, url);
  }

  return (await response.json()) as T;
}

export const api = {
  health: (signal?: AbortSignal) => request<HealthResponse>("/health", { signal }),

  listObjects: (params: ObjectsQueryParams = {}, signal?: AbortSignal) =>
    request<Paginated<KnowledgeObjectSummary>>("/objects", { query: params, signal }),

  getObject: (id: string, signal?: AbortSignal) =>
    request<KnowledgeObject>(`/objects/${encodeURIComponent(id)}`, { signal }),

  graph: (signal?: AbortSignal) => request<GraphResponse>("/graph", { signal }),

  relationship: (id: string, signal?: AbortSignal) =>
    request<Relationship>(`/relationships/${encodeURIComponent(id)}`, { signal }),

  index: (signal?: AbortSignal) => request<IndexResponse>("/index", { signal }),
};

export type Api = typeof api;