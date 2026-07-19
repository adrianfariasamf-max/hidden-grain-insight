// Central TanStack Query policy for the Hidden Grain client.
// Applied at the QueryClient level in `src/router.tsx`.

import type { DefaultOptions } from "@tanstack/react-query";

import { ApiContractError, ApiError, ApiNotFoundError, isTransient } from "./errors";

const RETRY_LIMIT = 2;

/** Retry only transient failures (network / 5xx). Never retry contract
 *  errors or client-side 4xx (400/401/403/404). */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiContractError) return false;
  if (error instanceof ApiNotFoundError) return false;
  if (error instanceof ApiError) {
    if (error.status === 400 || error.status === 401 || error.status === 403) return false;
  }
  if (!isTransient(error)) return false;
  return failureCount < RETRY_LIMIT;
}

export const queryPolicy = {
  queries: {
    staleTime: 30_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: shouldRetry,
  },
} satisfies DefaultOptions;