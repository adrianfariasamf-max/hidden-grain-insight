// TanStack Query key factory + queryOptions helpers.
// Every read from the UI must go through these — never call `api.*` directly
// from a component so caching, retries and keys stay consistent.
//
// Retry / staleTime / gcTime are set globally by `queryPolicy`
// (see `src/router.tsx`). Do not duplicate them here.

import { queryOptions } from "@tanstack/react-query";

import { api } from "./client";
import type { GraphQueryParams, ObjectsQueryParams } from "./types";
import { normalizeGraphParams, normalizeObjectsParams } from "./validation";

export const hgKeys = {
  all: ["hg"] as const,
  health: () => [...hgKeys.all, "health"] as const,
  objects: () => [...hgKeys.all, "objects"] as const,
  objectList: (params: ObjectsQueryParams) => [...hgKeys.objects(), "list", params] as const,
  object: (id: string) => [...hgKeys.objects(), "detail", id] as const,
  graph: (params: GraphQueryParams = {}) => [...hgKeys.all, "graph", params] as const,
};

export const healthQuery = () =>
  queryOptions({
    queryKey: hgKeys.health(),
    queryFn: ({ signal }) => api.health(signal),
  });

export const objectListQuery = (params: ObjectsQueryParams) => {
  const normalized = normalizeObjectsParams(params);
  return queryOptions({
    queryKey: hgKeys.objectList(normalized),
    queryFn: ({ signal }) => api.listObjects(normalized, signal),
  });
};

export const objectQuery = (id: string) =>
  queryOptions({
    queryKey: hgKeys.object(id),
    queryFn: ({ signal }) => api.getObject(id, signal),
  });

// Alias — the Phase 3 brief refers to this as `objectDetailQuery`.
export const objectDetailQuery = objectQuery;

export const graphQuery = (params: GraphQueryParams = {}) => {
  const normalized = normalizeGraphParams(params);
  return queryOptions({
    queryKey: hgKeys.graph(normalized),
    queryFn: ({ signal }) => api.graph(normalized, signal),
  });
};
