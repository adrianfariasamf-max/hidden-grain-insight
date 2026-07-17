// TanStack Query key factory + queryOptions helpers.
// Every read from the UI must go through these — never call `api.*` directly
// from a component so caching, retries, and keys stay consistent.

import { queryOptions } from "@tanstack/react-query";

import { api } from "./client";
import { ApiNotFoundError, isTransient } from "./errors";
import type { ObjectsQueryParams } from "./types";

export const hgKeys = {
  all: ["hg"] as const,
  health: () => [...hgKeys.all, "health"] as const,
  objects: () => [...hgKeys.all, "objects"] as const,
  objectList: (params: ObjectsQueryParams) => [...hgKeys.objects(), "list", params] as const,
  object: (id: string) => [...hgKeys.objects(), "detail", id] as const,
  graph: () => [...hgKeys.all, "graph"] as const,
  relationship: (id: string) => [...hgKeys.all, "relationships", id] as const,
  index: () => [...hgKeys.all, "index"] as const,
};

const RETRY_LIMIT = 2;
function retry(failureCount: number, error: unknown) {
  if (error instanceof ApiNotFoundError) return false;
  if (!isTransient(error)) return false;
  return failureCount < RETRY_LIMIT;
}

export const healthQuery = () =>
  queryOptions({
    queryKey: hgKeys.health(),
    queryFn: ({ signal }) => api.health(signal),
    retry,
    refetchInterval: 15_000,
  });

export const objectListQuery = (params: ObjectsQueryParams) =>
  queryOptions({
    queryKey: hgKeys.objectList(params),
    queryFn: ({ signal }) => api.listObjects(params, signal),
    retry,
  });

export const objectQuery = (id: string) =>
  queryOptions({
    queryKey: hgKeys.object(id),
    queryFn: ({ signal }) => api.getObject(id, signal),
    retry,
  });

export const graphQuery = () =>
  queryOptions({
    queryKey: hgKeys.graph(),
    queryFn: ({ signal }) => api.graph(signal),
    retry,
  });

export const relationshipQuery = (id: string) =>
  queryOptions({
    queryKey: hgKeys.relationship(id),
    queryFn: ({ signal }) => api.relationship(id, signal),
    retry,
  });

export const indexQuery = () =>
  queryOptions({
    queryKey: hgKeys.index(),
    queryFn: ({ signal }) => api.index(signal),
    retry,
  });