// Single typed API client for the Hidden Grain read-only API.
// Base URL comes from VITE_HG_API_BASE. In dev this typically points to
// http://localhost:3000; in same-origin deployments it can be set to "/api".
// The client never writes, never mocks, and never invents fields.

import type { ZodType } from "zod";

import {
  ApiContractError,
  ApiError,
  ApiNetworkError,
  ApiNotFoundError,
  ApiTimeoutError,
  type ApiErrorMeta,
} from "./errors";
import {
  GraphResponseSchema,
  HealthResponseSchema,
  ObjectDetailResponseSchema,
  ObjectsListResponseSchema,
} from "./schemas";
import type {
  GraphResponse,
  HealthResponse,
  ObjectDetailResponse,
  ObjectsListResponse,
  ObjectsQueryParams,
} from "./types";
import type { GraphQueryParams } from "./types";

const RAW_BASE = (import.meta.env.VITE_HG_API_BASE ?? "").toString().trim();
const RAW_TIMEOUT = (import.meta.env.VITE_HG_REQUEST_TIMEOUT_MS ?? "").toString().trim();

function resolveBase(): string {
  if (!RAW_BASE) return "/api";
  return RAW_BASE.replace(/\/+$/, "");
}

function resolveTimeout(): number {
  const parsed = Number.parseInt(RAW_TIMEOUT, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 10_000;
}

export const API_BASE = resolveBase();
export const REQUEST_TIMEOUT_MS = resolveTimeout();

function buildUrl(path: string, query?: Record<string, unknown>): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE}${suffix}`;
  if (!query) return url;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item === undefined || item === null || item === "") continue;
        usp.append(k, String(item));
      }
    } else {
      usp.set(k, String(v));
    }
  }
  const qs = usp.toString();
  return qs ? `${url}?${qs}` : url;
}

interface ETagEntry {
  etag: string;
  data: unknown;
}
const etagCache = new Map<string, ETagEntry>();

function extractErrorMeta(response: Response, body: unknown): ApiErrorMeta {
  const requestId =
    response.headers.get("x-request-id") ?? response.headers.get("x-hg-request-id") ?? undefined;
  const meta: ApiErrorMeta = { requestId: requestId ?? undefined };
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.code === "string") meta.code = b.code;
    if (typeof b.requestId === "string") meta.requestId = b.requestId;
    if (b.details !== undefined) meta.details = b.details;
  }
  return meta;
}

async function request<T>(
  path: string,
  schema: ZodType<T>,
  opts: { query?: Record<string, unknown>; signal?: AbortSignal } = {},
): Promise<T> {
  const url = buildUrl(path, opts.query);

  // Compose a timeout signal with the caller's cancellation signal. We must
  // distinguish a caller abort (react-query cancellation) from a real timeout.
  const timeoutCtl = new AbortController();
  const timeoutHandle: ReturnType<typeof setTimeout> = setTimeout(
    () => timeoutCtl.abort(),
    REQUEST_TIMEOUT_MS,
  );

  const onExternalAbort = () => timeoutCtl.abort();
  if (opts.signal) {
    if (opts.signal.aborted) timeoutCtl.abort();
    else opts.signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  const cached = etagCache.get(url);
  if (cached) headers["If-None-Match"] = cached.etag;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers,
      signal: timeoutCtl.signal,
    });
  } catch (cause) {
    // Caller aborted (react-query cancellation) → propagate the caller's signal.
    if (opts.signal?.aborted) throw cause;
    // Otherwise this was our timeout budget.
    if (timeoutCtl.signal.aborted) throw new ApiTimeoutError(url, REQUEST_TIMEOUT_MS);
    throw new ApiNetworkError(url, cause);
  } finally {
    clearTimeout(timeoutHandle);
    if (opts.signal) opts.signal.removeEventListener("abort", onExternalAbort);
  }

  if (response.status === 304 && cached) {
    return cached.data as T;
  }

  if (response.status === 404) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      /* ignore */
    }
    throw new ApiNotFoundError(url, extractErrorMeta(response, body));
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      /* ignore body parse errors */
    }
    let message = `Request failed (${response.status})`;
    if (body && typeof body === "object") {
      const b = body as { message?: unknown; error?: unknown };
      if (typeof b.message === "string") message = b.message;
      else if (typeof b.error === "string") message = b.error;
    }
    throw new ApiError(message, response.status, url, extractErrorMeta(response, body));
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch (cause) {
    throw new ApiContractError(url, { reason: "invalid JSON", cause: String(cause) });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiContractError(url, parsed.error.issues);
  }

  const etag = response.headers.get("etag");
  if (etag) etagCache.set(url, { etag, data: parsed.data });

  return parsed.data;
}

export const api = {
  health: (signal?: AbortSignal) => request("/health", HealthResponseSchema, { signal }),

  listObjects: (params: ObjectsQueryParams = {}, signal?: AbortSignal) =>
    request("/objects", ObjectsListResponseSchema, {
      query: params as Record<string, unknown>,
      signal,
    }),

  getObject: (id: string, signal?: AbortSignal) =>
    request(`/objects/${encodeURIComponent(id)}`, ObjectDetailResponseSchema, { signal }),

  graph: (params: GraphQueryParams = {}, signal?: AbortSignal) =>
    request("/graph", GraphResponseSchema, {
      query: params as Record<string, unknown>,
      signal,
    }),
} satisfies {
  health: (signal?: AbortSignal) => Promise<HealthResponse>;
  listObjects: (params?: ObjectsQueryParams, signal?: AbortSignal) => Promise<ObjectsListResponse>;
  getObject: (id: string, signal?: AbortSignal) => Promise<ObjectDetailResponse>;
  graph: (params?: GraphQueryParams, signal?: AbortSignal) => Promise<GraphResponse>;
};

export type Api = typeof api;
