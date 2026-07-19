import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { Search, X, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/layout/PageHeader";
import { FiltersBar, type FilterOptionSet } from "@/components/explorer/FiltersBar";
import { ObjectCard } from "@/components/explorer/ObjectCard";
import { Pagination } from "@/components/explorer/Pagination";
import { EmptyState } from "@/components/state/EmptyState";
import { ErrorState } from "@/components/state/ErrorState";
import { LoadingState } from "@/components/state/LoadingState";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { objectListQuery } from "@/lib/api/queries";
import { getFacets, recordFacets } from "@/lib/api/facets";
import {
  LIMIT_MAX,
  LIMIT_MIN,
  normalizeFilter,
  normalizeLimit,
  normalizeOffset,
  normalizeSearch,
} from "@/lib/api/validation";
import type { ObjectsQueryParams } from "@/lib/api/types";
import { useEffect as useEffectFacets } from "react";

const DEFAULT_LIMIT = 20;

// URL search schema mirrors the normalization rules in `lib/api/validation`.
// `fallback` ensures a malformed URL never crashes the route.
const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  type: fallback(z.string(), "").default(""),
  category: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "").default(""),
  offset: fallback(z.number().int().min(0), 0).default(0),
  limit: fallback(z.number().int().min(LIMIT_MIN).max(LIMIT_MAX), DEFAULT_LIMIT).default(
    DEFAULT_LIMIT,
  ),
});

type ExplorerSearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/explorer")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Explorer — Hidden Grain" },
      { name: "description", content: "Search, filter and paginate Knowledge Objects." },
    ],
  }),
  component: ExplorerRoute,
});

/** Build the query params sent to GET /objects. Empty strings are dropped. */
function buildParams(input: {
  q: string;
  type: string;
  category: string;
  status: string;
  offset: number;
  limit: number;
}): ObjectsQueryParams {
  const p: ObjectsQueryParams = {
    offset: normalizeOffset(input.offset),
    limit: normalizeLimit(input.limit),
  };
  const q = normalizeSearch(input.q);
  if (q) p.q = q;
  const t = normalizeFilter(input.type);
  if (t) p.type = t;
  const c = normalizeFilter(input.category);
  if (c) p.category = c;
  const s = normalizeFilter(input.status);
  if (s) p.status = s;
  return p;
}

function ExplorerRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  // URL search.q is the source of truth. Mirror it into local input state so
  // Back/Forward, direct links (?q=…), and external param resets are reflected
  // in the field. The URL is only rewritten (with replace: true) once the
  // debounced input differs from the current URL value — this breaks the cycle.
  const [rawQ, setRawQ] = useState(search.q ?? "");
  useEffect(() => {
    setRawQ(search.q ?? "");
  }, [search.q]);
  const debouncedQ = useDebouncedValue(rawQ, 300);

  useEffect(() => {
    if (debouncedQ === (search.q ?? "")) return;
    navigate({
      to: ".",
      search: (prev: ExplorerSearch) => ({ ...prev, q: debouncedQ, offset: 0 }),
      replace: true,
    });
  }, [debouncedQ, search.q, navigate]);

  const params = buildParams(search);
  // useQuery (not useSuspenseQuery) so Loading / Error / Refreshing states
  // stay explicit and controllable. Requests are cancelled automatically:
  // TanStack Query forwards an AbortSignal to the queryFn on key change.
  const query = useQuery({
    ...objectListQuery(params),
    placeholderData: keepPreviousData,
  });

  // Feed the session-scoped facet accumulator so filter options stay stable
  // across pages and searches, instead of collapsing to only what's visible
  // on the current page.
  useEffectFacets(() => {
    const items = query.data?.items;
    if (!items || items.length === 0) return;
    recordFacets({
      types: items.map((i) => i.type),
      categories: items.map((i) => i.category),
      statuses: items.map((i) => i.status),
    });
  }, [query.data]);

  const options: FilterOptionSet = useMemo(() => getFacets(), [query.data]);

  // If a filter or search shrinks total below the current offset, clamp to
  // the last valid page instead of showing an empty page.
  useEffect(() => {
    if (!query.data) return;
    const { total, limit } = query.data;
    if (total === 0) return;
    if (search.offset < total) return;
    const lastPageOffset = Math.max(0, Math.floor((total - 1) / limit) * limit);
    if (lastPageOffset === search.offset) return;
    navigate({
      to: ".",
      search: (prev: ExplorerSearch) => ({ ...prev, offset: lastPageOffset }),
      replace: true,
    });
  }, [query.data, search.offset, navigate]);

  const updateFilters = (patch: Partial<{ type: string; category: string; status: string }>) => {
    navigate({
      to: ".",
      search: (prev: ExplorerSearch) => ({ ...prev, ...patch, offset: 0 }),
    });
  };

  const clearAll = () => {
    setRawQ("");
    navigate({
      to: ".",
      search: () => ({
        q: "",
        type: "",
        category: "",
        status: "",
        offset: 0,
        limit: search.limit,
      }),
    });
  };

  const setOffset = (offset: number) => {
    navigate({
      to: ".",
      search: (prev: ExplorerSearch) => ({ ...prev, offset }),
    });
  };

  const isInitialLoading = query.isLoading;
  const isRefreshing = query.isFetching && !isInitialLoading;
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Explorer"
        title="Knowledge Objects"
        description="Search, filter and paginate the read-only object index. Filters send q, type, category and status to the API."
      />
      <section className="flex flex-col gap-6 px-4 py-6 sm:px-8">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={rawQ}
              onChange={(e) => setRawQ(e.target.value)}
              placeholder="Search Knowledge Objects…"
              aria-label="Search Knowledge Objects"
              className="h-10 w-full rounded-md border border-border/60 bg-background pl-9 pr-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            {rawQ ? (
              <button
                type="button"
                onClick={() => setRawQ("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
          </div>

          <FiltersBar
            values={{ type: search.type, category: search.category, status: search.status }}
            options={options}
            onChange={updateFilters}
            onClearAll={clearAll}
          />

          <p className="text-[11px] text-muted-foreground">
            Filter options are derived from the loaded page — the API does not expose a facets
            endpoint yet, so this list is auxiliary and not a canonical catalog.
          </p>
        </div>

        {isInitialLoading ? (
          <LoadingState label="Loading objects…" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No objects match the current filters"
            description="Try clearing filters or adjusting the search term."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {isRefreshing ? (
              <div className="inline-flex items-center gap-2 self-start rounded border border-border/60 bg-card/60 px-2 py-1 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                Refreshing…
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((obj) => (
                <ObjectCard key={obj.id} object={obj} />
              ))}
            </div>

            <Pagination
              offset={search.offset}
              limit={search.limit}
              total={total}
              onChange={setOffset}
              disabled={query.isFetching}
            />
          </div>
        )}
      </section>
    </>
  );
}
