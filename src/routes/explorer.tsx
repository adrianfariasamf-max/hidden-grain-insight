import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/layout/PageHeader";
import { FiltersBar, type FilterOptionSet } from "@/components/explorer/FiltersBar";
import { ObjectCard } from "@/components/explorer/ObjectCard";
import { Pagination } from "@/components/explorer/Pagination";
import { ActiveFiltersBar } from "@/components/search/ActiveFiltersBar";
import { SearchInput } from "@/components/search/SearchInput";
import { EmptyState } from "@/components/state/EmptyState";
import { ErrorState } from "@/components/state/ErrorState";
import { LoadingState } from "@/components/state/LoadingState";
import { Button } from "@/components/ui/button";
import { useSearch } from "@/hooks/use-search";
import { objectListQuery } from "@/lib/api/queries";
import { getFacets, recordFacets } from "@/lib/api/facets";
import { LIMIT_MAX, LIMIT_MIN, normalizeLimit } from "@/lib/api/validation";
import { toKnowledgeObject } from "@/lib/domain";
import { toObjectsQueryParams, type SearchQuery } from "@/lib/domain/search";

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

type ExploradorSearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/explorer")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Explorador — Hidden Grain" },
      { name: "description", content: "Busca, filtra y pagina Objetos de Conocimiento." },
    ],
  }),
  component: ExploradorRoute,
});

/**
 * Explorador keeps the URL as the source of truth. We derive the canonical
 * `SearchQuery` from the URL params, then let `useSearch` normalize and
 * expose it. Every write projects back to the URL — that is the ONE
 * Explorador ↔ SearchQuery ↔ URL binding.
 */
function searchQueryFromUrl(input: ExploradorSearch): SearchQuery {
  const q: SearchQuery = {
    pagination: { offset: input.offset, limit: normalizeLimit(input.limit) },
  };
  if (input.q) q.text = input.q;
  if (input.type) q.objectTipos = [input.type];
  if (input.category) q.categories = [input.category];
  if (input.status) q.status = [input.status];
  return q;
}

function ExploradorRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  // Canonical SearchQuery derived from the URL every render.
  const derived = useMemo(() => searchQueryFromUrl(search), [search]);
  const { query, activeCount, clearAll: clearAllQuery } = useSearch({ value: derived });

  // Adapter: SearchQuery → HTTP contract. Only dimensions supported by
  // GET /objects reach the wire (see toObjectsQueryParams).
  const params = useMemo(() => toObjectsQueryParams(query), [query]);

  // useQuery (not useSuspenseQuery) so Loading / Error / Refreshing states
  // stay explicit and controllable.
  const listQuery = useQuery({
    ...objectListQuery(params),
    placeholderData: keepPreviousData,
  });

  // Feed the session-scoped facet accumulator so filter options stay stable
  // across pages and searches.
  useEffect(() => {
    const items = listQuery.data?.items;
    if (!items || items.length === 0) return;
    recordFacets({
      types: items.map((i) => i.type),
      categories: items.map((i) => i.category),
      statuses: items.map((i) => i.status),
    });
  }, [listQuery.data]);

  const options: FilterOptionSet = getFacets();

  // Clamp offset when a filter shrinks total below the current page.
  useEffect(() => {
    if (!listQuery.data) return;
    const { total, limit } = listQuery.data;
    if (total === 0) return;
    if (search.offset < total) return;
    const lastPageOffset = Math.max(0, Math.floor((total - 1) / limit) * limit);
    if (lastPageOffset === search.offset) return;
    navigate({
      to: ".",
      search: (prev: ExploradorSearch) => ({ ...prev, offset: lastPageOffset }),
      replace: true,
    });
  }, [listQuery.data, search.offset, navigate]);

  const updateFilters = useCallback(
    (patch: Partial<{ type: string; category: string; status: string }>) => {
      navigate({
        to: ".",
        search: (prev: ExploradorSearch) => ({ ...prev, ...patch, offset: 0 }),
      });
    },
    [navigate],
  );

  // Text updates from SearchInput arrive already debounced.
  const handleTextChange = useCallback(
    (next: string) => {
      if (next === (search.q ?? "")) return;
      navigate({
        to: ".",
        search: (prev: ExploradorSearch) => ({ ...prev, q: next, offset: 0 }),
        replace: true,
      });
    },
    [navigate, search.q],
  );

  const clearAll = useCallback(() => {
    // Domain first (keeps normalized state in sync), then project to URL.
    clearAllQuery();
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
  }, [clearAllQuery, navigate, search.limit]);

  const setOffset = useCallback(
    (offset: number) => {
      navigate({
        to: ".",
        search: (prev: ExploradorSearch) => ({ ...prev, offset }),
      });
    },
    [navigate],
  );

  const isInitialLoading = listQuery.isLoading;
  const isRefreshing = listQuery.isFetching && !isInitialLoading;
  const total = listQuery.data?.total ?? 0;
  const items = listQuery.data?.items;
  const hasItems = (items?.length ?? 0) > 0;

  const normalizedItems = useMemo(() => (items ? items.map(toKnowledgeObject) : []), [items]);

  return (
    <>
      <PageHeader
        eyebrow="Explorador"
        title="Objetos de conocimiento"
        description="Busca, filtra y pagina el índice de objetos. Los filtros envían q, type, category y status a la API."
        actions={
          <Button asChild size="sm">
            <Link to="/objects/new">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New Object
            </Link>
          </Button>
        }
      />
      <section className="flex flex-col gap-6 px-4 py-6 sm:px-8">
        <div className="flex flex-col gap-3">
          <SearchInput
            value={search.q ?? ""}
            onChange={handleTextChange}
            placeholder="Search Objetos de conocimiento…"
            ariaLabel="Search Objetos de conocimiento"
          />

          <FiltersBar
            values={{ type: search.type, category: search.category, status: search.status }}
            options={options}
            onChange={updateFilters}
            onClearAll={clearAll}
          />

          <ActiveFiltersBar count={activeCount} onClear={clearAll} />

          <p className="text-[11px] text-muted-foreground">
            Filter options are derived from the loaded page — the API does not expose a facets
            endpoint yet, so this list is auxiliary and not a canonical catalog.
          </p>
        </div>

        {isInitialLoading ? (
          <LoadingState label="Cargando objetos…" />
        ) : listQuery.isError ? (
          <ErrorState error={listQuery.error} onRetry={() => listQuery.refetch()} />
        ) : !hasItems ? (
          <EmptyState
            title="Ningún objeto coincide con los filtros actuales"
            description="Prueba a limpiar los filtros o ajustar el término de búsqueda."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {isRefreshing ? (
              <div className="inline-flex items-center gap-2 self-start rounded border border-border/60 bg-card/60 px-2 py-1 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                Actualizando…
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {normalizedItems.map((obj) => (
                <ObjectCard key={obj.id} object={obj} />
              ))}
            </div>

            <Pagination
              offset={search.offset}
              limit={search.limit}
              total={total}
              onChange={setOffset}
              disabled={listQuery.isFetching}
            />
          </div>
        )}
      </section>
    </>
  );
}
