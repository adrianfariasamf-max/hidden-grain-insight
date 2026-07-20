import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/state/LoadingState";
import { ErrorState } from "@/components/state/ErrorState";
import { GraphMetrics } from "@/components/graph/GraphMetrics";
import { GraphFilters, type GraphFilterValues } from "@/components/graph/GraphFilters";
import { GraphNodeList } from "@/components/graph/GraphNodeList";
import { GraphEdgeList } from "@/components/graph/GraphEdgeList";
import { RelationshipLegend } from "@/components/graph/RelationshipLegend";
import { RelationshipOntologyFilter } from "@/components/graph/RelationshipOntologyFilter";
import { RelationshipTrustFilter } from "@/components/graph/RelationshipTrustFilter";
import { SafeTimestamp } from "@/components/shared/SafeTimestamp";
import { ActiveFiltersBar } from "@/components/search/ActiveFiltersBar";
import { graphQuery } from "@/lib/api/queries";
import type { KnowledgeObjectId } from "@/lib/api/types";
import {
  buildRelationshipOntologyPredicate,
  buildRelationshipTrustPredicate,
  fromGraphNode,
  PROVENANCE_NOT_SPECIFIED,
  summarizeRelationships,
  summarizeRelationshipTrust,
  toRelationship,
  type KnowledgeObject,
  type ProvenanceFilterValue,
  type Relationship,
  type RelationshipCategoría,
  type RelationshipEstado,
} from "@/lib/domain";
import { countActiveFilters, toGraphQueryParams, type SearchQuery } from "@/lib/domain/search";

export const Route = createFileRoute("/graph")({
  head: () => ({
    meta: [
      { title: "Grafo de conocimiento — Hidden Grain" },
      {
        name: "description",
        content:
          "Structured view of the Hidden Grain Grafo de conocimiento: nodes, relationships and resolution metrics.",
      },
    ],
  }),
  component: GraphRoute,
});

const INITIAL_FILTERS: GraphFilterValues = {
  nodeTipo: "",
  resolution: "all",
};

// Presentational cap: even a well-filtered projection can contain thousands
// of nodes/edges. Rendering all of them at once produces enormous DOM trees
// and blocks the main thread. We cap the initial slice and let the user
// grow it incrementally. Data itself is never dropped — the cap only limits
// what is materialized into React children.
const RENDER_CAP_INITIAL = 500;
const RENDER_CAP_STEP = 500;

function uniqueSorted(values: (string | undefined | null)[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    if (typeof v === "string" && v.length > 0) set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function GraphRoute() {
  // NOTE (server-side filtering — EPIC-003.2):
  // The full local filter state is projected into a canonical `SearchQuery`
  // (see `derivedSearchQuery` below). `toGraphQueryParams(query)` is the
  // pure adapter that will be forwarded to `graphQuery(...)` once the
  // backend advertises support. Today the contract still returns the full
  // projection so we intentionally call `graphQuery()` without params and
  // keep local, in-memory filtering. The mapping is:
  //   objectTipos[0]        → nodeTipo
  //   relationshipTipos[0]  → edgeTipo
  //   status ({r}|{u} only) → resolution
  //   categories, provenance, multi-select, min-confidence, unknown policy
  //     → NOT SENT (not part of the current wire contract; applied locally).
  const query = useQuery(graphQuery());
  const [filters, setFilters] = useState<GraphFilterValues>(INITIAL_FILTERS);
  const [selectedTipoIds, setSelectedTipoIds] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<RelationshipCategoría[]>([]);
  const [selectedProvenances, setSelectedProvenances] = useState<ProvenanceFilterValue[]>([]);
  const [selectedEstadoes, setSelectedEstadoes] = useState<RelationshipEstado[]>([]);
  const [minNivel de confianzaPct, setMinNivel de confianzaPct] = useState(0);
  const [unknownNivel de confianzaPolicy, setUnknownNivel de confianzaPolicy] = useState<"include" | "exclude">(
    "include",
  );
  const [nodeLimit, setNodeLimit] = useState(RENDER_CAP_INITIAL);
  const [edgeLimit, setEdgeLimit] = useState(RENDER_CAP_INITIAL);

  const resetCaps = useCallback(() => {
    setNodeLimit(RENDER_CAP_INITIAL);
    setEdgeLimit(RENDER_CAP_INITIAL);
  }, []);

  const patchFilters = useCallback((patch: Partial<GraphFilterValues>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setNodeLimit(RENDER_CAP_INITIAL);
    setEdgeLimit(RENDER_CAP_INITIAL);
  }, []);
  const clearAllFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setSelectedTipoIds([]);
    setSelectedCategories([]);
    setSelectedProvenances([]);
    setSelectedEstadoes([]);
    setMinNivel de confianzaPct(0);
    setUnknownNivel de confianzaPolicy("include");
    setNodeLimit(RENDER_CAP_INITIAL);
    setEdgeLimit(RENDER_CAP_INITIAL);
  }, []);
  const toggleTipo = useCallback(
    (id: string) => {
      setSelectedTipoIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
      resetCaps();
    },
    [resetCaps],
  );
  const toggleCategoría = useCallback(
    (c: RelationshipCategoría) => {
      setSelectedCategories((prev) =>
        prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
      );
      resetCaps();
    },
    [resetCaps],
  );
  const clearOntologyFilters = useCallback(() => {
    setSelectedTipoIds([]);
    setSelectedCategories([]);
    resetCaps();
  }, [resetCaps]);
  const toggleProvenance = useCallback(
    (id: ProvenanceFilterValue) => {
      setSelectedProvenances((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
      resetCaps();
    },
    [resetCaps],
  );
  const toggleEstado = useCallback(
    (id: RelationshipEstado) => {
      setSelectedEstadoes((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
      resetCaps();
    },
    [resetCaps],
  );
  const changeMinNivel de confianza = useCallback(
    (pct: number) => {
      setMinNivel de confianzaPct(Math.min(100, Math.max(0, pct)));
      resetCaps();
    },
    [resetCaps],
  );
  const changeUnknownPolicy = useCallback(
    (p: "include" | "exclude") => {
      setUnknownNivel de confianzaPolicy(p);
      resetCaps();
    },
    [resetCaps],
  );
  const clearTrustFilters = useCallback(() => {
    setSelectedProvenances([]);
    setSelectedEstadoes([]);
    setMinNivel de confianzaPct(0);
    setUnknownNivel de confianzaPolicy("include");
    resetCaps();
  }, [resetCaps]);

  const graph = query.data;

  const nodeTipos = useMemo(
    () => uniqueSorted((graph?.nodes ?? []).map((n) => n.type)),
    [graph?.nodes],
  );

  // Normalize once. The identity of each canonical node is stable across
  // filter changes (memo key = raw nodes array), so `React.memo` on the item
  // component stays effective.
  const canonicalNodes = useMemo<KnowledgeObject[]>(
    () => (graph ? graph.nodes.map(fromGraphNode) : []),
    [graph],
  );

  const filteredNodes = useMemo<KnowledgeObject[]>(() => {
    if (!filters.nodeTipo) return canonicalNodes;
    return canonicalNodes.filter((n) => n.type === filters.nodeTipo);
  }, [canonicalNodes, filters.nodeTipo]);

  // Normalize wire edges → canonical Relationships once. Identity is stable
  // across filter changes so `memo(GraphEdgeItem)` stays effective.
  const canonicalRelationships = useMemo<Relationship[]>(
    () => (graph ? graph.edges.map(toRelationship) : []),
    [graph],
  );

  // Legend + filter surfaces are always driven by the FULL dataset so the
  // user can see (and re-enable) any type/category even while an existing
  // selection would exclude it. This mirrors typical faceted-filter UX and
  // avoids "dead-end" states where a selection makes itself unreachable.
  const summary = useMemo(
    () => summarizeRelationships(canonicalRelationships),
    [canonicalRelationships],
  );

  // Trust summary drives the visibility of the trust filter surface and
  // the trust panel. Computed from the FULL dataset (see comment above
  // for the same reason as the ontology summary).
  const trustResumen = useMemo(
    () => summarizeRelationshipTrust(canonicalRelationships),
    [canonicalRelationships],
  );

  // Ontology predicate (types OR / categories OR / groups AND).
  const ontologyPredicate = useMemo(
    () =>
      buildRelationshipOntologyPredicate({
        typeIds: selectedTipoIds,
        categories: selectedCategories,
      }),
    [selectedTipoIds, selectedCategories],
  );

  const trustPredicate = useMemo(
    () =>
      buildRelationshipTrustPredicate({
        provenances: selectedProvenances,
        statuses: selectedEstadoes,
        minNivel de confianza: minNivel de confianzaPct / 100,
        unknownNivel de confianzaPolicy,
      }),
    [selectedProvenances, selectedEstadoes, minNivel de confianzaPct, unknownNivel de confianzaPolicy],
  );

  const filteredRelationships = useMemo<Relationship[]>(() => {
    const wantEstado =
      filters.resolution === "resolved"
        ? "resolved"
        : filters.resolution === "unresolved"
          ? "unresolved"
          : null;
    // AND across filter groups:
    //   resolution AND ontology(types/categories) AND trust(prov/status/conf).
    return canonicalRelationships.filter((r) => {
      if (wantEstado !== null && r.status !== wantEstado) return false;
      if (!ontologyPredicate(r)) return false;
      if (!trustPredicate(r)) return false;
      return true;
    });
  }, [canonicalRelationships, filters.resolution, ontologyPredicate, trustPredicate]);

  const filteredResumen = useMemo(
    () => summarizeRelationships(filteredRelationships),
    [filteredRelationships],
  );

  const knownNodeIds = useMemo<ReadonlySet<KnowledgeObjectId>>(
    () => new Set(canonicalNodes.map((n) => n.id)),
    [canonicalNodes],
  );

  // Slice AFTER filtering. Both slices reuse identity when possible so that
  // memoized item rows do not re-render when the cap grows.
  const visibleNodes = useMemo(
    () => (filteredNodes.length > nodeLimit ? filteredNodes.slice(0, nodeLimit) : filteredNodes),
    [filteredNodes, nodeLimit],
  );
  const visibleRelationships = useMemo(
    () =>
      filteredRelationships.length > edgeLimit
        ? filteredRelationships.slice(0, edgeLimit)
        : filteredRelationships,
    [filteredRelationships, edgeLimit],
  );
  const nodesTruncated = filteredNodes.length > visibleNodes.length;
  const edgesTruncated = filteredRelationships.length > visibleRelationships.length;

  const showMoreNodes = useCallback(() => setNodeLimit((n) => n + RENDER_CAP_STEP), []);
  const showMoreEdges = useCallback(() => setEdgeLimit((n) => n + RENDER_CAP_STEP), []);

  const ontologyActive = selectedTipoIds.length > 0 || selectedCategories.length > 0;
  const trustActive =
    selectedProvenances.length > 0 || selectedEstadoes.length > 0 || minNivel de confianzaPct > 0;
  const filtersActive =
    filters.nodeTipo !== "" || filters.resolution !== "all" || ontologyActive || trustActive;
  const activeFilterCount =
    (filters.nodeTipo !== "" ? 1 : 0) +
    (filters.resolution !== "all" ? 1 : 0) +
    selectedTipoIds.length +
    selectedCategories.length +
    selectedProvenances.length +
    selectedEstadoes.length +
    (minNivel de confianzaPct > 0 ? 1 : 0);

  // Canonical projection: every mapped Graph filter dimension is exposed
  // as a single, normalized `SearchQuery`. This is the SAME model used by
  // Explorador — Graph does not maintain a parallel search abstraction, it
  // just projects its per-filter UI state into the canonical shape.
  // `minNivel de confianzaPct` and `unknownNivel de confianzaPolicy` are trust-panel
  // ancillary controls and are intentionally NOT part of SearchQuery: they
  // are not declared search dimensions in the current domain model.
  const derivedSearchQuery = useMemo<SearchQuery>(() => {
    const q: SearchQuery = {};
    if (filters.nodeTipo) q.objectTipos = [filters.nodeTipo];
    if (selectedTipoIds.length > 0) q.relationshipTipos = selectedTipoIds;
    if (selectedCategories.length > 0) q.categories = selectedCategories;
    if (selectedProvenances.length > 0) {
      q.provenance = selectedProvenances.filter((p) => p !== PROVENANCE_NOT_SPECIFIED);
      if (q.provenance.length === 0) delete q.provenance;
    }
    const statusList: string[] = [...selectedEstadoes];
    if (filters.resolution !== "all") statusList.push(filters.resolution);
    if (statusList.length > 0) q.status = statusList;
    return q;
  }, [
    filters.nodeTipo,
    filters.resolution,
    selectedTipoIds,
    selectedCategories,
    selectedProvenances,
    selectedEstadoes,
  ]);

  // Prepared for the day `/graph` accepts filters. Computed but not sent.
  void useMemo(() => toGraphQueryParams(derivedSearchQuery), [derivedSearchQuery]);

  // Active-filter tally sourced from the canonical Search domain. The
  // legacy per-dimension tally (`activeFilterCount` above) is kept only
  // for the existing `GraphRelationshipResumen` line; the top-level
  // ActiveFiltersBar uses the domain count + the confidence extras.
  const searchActiveCount = countActiveFilters(derivedSearchQuery) + (minNivel de confianzaPct > 0 ? 1 : 0);

  return (
    <>
      <PageHeader
        eyebrow="Graph"
        title="Grafo de conocimiento"
        description="Structured, read-only projection of nodes and relationships."
      />
      <section className="flex flex-col gap-6 px-4 py-6 sm:px-8">
        {query.isPending ? (
          <LoadingState label="Loading graph…" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : graph ? (
          <>
            <GraphMetrics graph={graph} />

            <GraphFilters
              values={filters}
              options={{ nodeTipos }}
              onChange={patchFilters}
              onClearAll={clearAllFilters}
              hasAnyActiveFilters={filtersActive}
              visibleNodes={filteredNodes.length}
              visibleEdges={filteredRelationships.length}
            />

            <ActiveFiltersBar count={searchActiveCount} onClear={clearAllFilters} />

            <RelationshipLegend summary={summary} />

            <RelationshipOntologyFilter
              summary={summary}
              selectedTipoIds={selectedTipoIds}
              selectedCategories={selectedCategories}
              onToggleTipo={toggleTipo}
              onToggleCategoría={toggleCategoría}
              onClear={clearOntologyFilters}
            />

            <RelationshipTrustFilter
              summary={trustResumen}
              selectedProvenances={selectedProvenances}
              selectedEstadoes={selectedEstadoes}
              minNivel de confianzaPct={minNivel de confianzaPct}
              unknownNivel de confianzaPolicy={unknownNivel de confianzaPolicy}
              onToggleProvenance={toggleProvenance}
              onToggleEstado={toggleEstado}
              onChangeMinNivel de confianza={changeMinNivel de confianza}
              onChangeUnknownPolicy={changeUnknownPolicy}
              onClear={clearTrustFilters}
            />

            <TrustPanel summary={trustResumen} />

            <GraphRelationshipResumen
              visible={filteredRelationships.length}
              total={canonicalRelationships.length}
              visibleTipos={filteredResumen.types.length}
              totalTipos={summary.types.length}
              activeFilters={activeFilterCount}
            />

            {query.isFetching ? (
              <p className="text-[11px] text-muted-foreground" aria-live="polite">
                Actualizando…
              </p>
            ) : null}

            <section aria-labelledby="graph-nodes-heading" className="flex flex-col gap-3">
              <header className="flex items-baseline justify-between gap-3">
                <h2 id="graph-nodes-heading" className="text-sm font-semibold text-foreground">
                  Nodes
                </h2>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {filteredNodes.length} / {graph.nodeCount}
                </span>
              </header>
              <GraphNodeList
                nodes={visibleNodes}
                vacíoLabel={
                  graph.nodeCount === 0
                    ? "No nodes in the graph"
                    : filtersActive
                      ? "No nodes match the current filters"
                      : "No nodes to display"
                }
                vacíoDescripción={
                  graph.nodeCount === 0
                    ? "The projection is currently vacío."
                    : filtersActive
                      ? "Try clearing filters to see the full projection."
                      : undefined
                }
              />
              {nodesTruncated ? (
                <ShowMore
                  visible={visibleNodes.length}
                  total={filteredNodes.length}
                  onClick={showMoreNodes}
                  label="nodes"
                />
              ) : null}
            </section>

            <section aria-labelledby="graph-edges-heading" className="flex flex-col gap-3">
              <header className="flex items-baseline justify-between gap-3">
                <h2 id="graph-edges-heading" className="text-sm font-semibold text-foreground">
                  Relationships
                </h2>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {filteredRelationships.length} / {graph.edgeCount}
                </span>
              </header>
              <GraphEdgeList
                relationships={visibleRelationships}
                knownNodeIds={knownNodeIds}
                vacíoLabel={
                  graph.edgeCount === 0
                    ? "No relationships in the graph"
                    : filtersActive
                      ? "No relationships match the current filters"
                      : "No relationships to display"
                }
                vacíoDescripción={
                  graph.edgeCount === 0
                    ? "The projection has no edges yet."
                    : filtersActive
                      ? "Try clearing filters to see all relationships. Use the button below."
                      : undefined
                }
              />
              {filteredRelationships.length === 0 && graph.edgeCount > 0 && filtersActive ? (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex w-fit items-center gap-1 self-center rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent/20"
                >
                  Clear all filters
                </button>
              ) : null}
              {edgesTruncated ? (
                <ShowMore
                  visible={visibleRelationships.length}
                  total={filteredRelationships.length}
                  onClick={showMoreEdges}
                  label="relationships"
                />
              ) : null}
            </section>

            <footer className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
              <span className="uppercase tracking-wide">Generado a las</span>
              <span className="font-mono text-foreground">
                <SafeTimestamp value={graph.generatedAt} />
              </span>
              <span className="uppercase tracking-wide">Schema</span>
              <span className="font-mono text-foreground">{graph.schemaVersion}</span>
            </footer>
          </>
        ) : null}
      </section>
    </>
  );
}

interface ShowMoreProps {
  visible: number;
  total: number;
  onClick: () => void;
  label: string;
}

function ShowMore({ visible, total, onClick, label }: ShowMoreProps) {
  const remaining = total - visible;
  return (
    <div
      className="flex flex-col items-start gap-2 rounded-md border border-dashed border-border/60 bg-card/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <p className="text-[11px] text-muted-foreground">
        Showing <span className="font-mono text-foreground">{visible}</span> of{" "}
        <span className="font-mono text-foreground">{total}</span> {label}. Large graphs are
        rendered incrementally to keep the UI responsive.
      </p>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-8 items-center rounded-md border border-border/60 bg-background px-3 text-xs text-foreground transition-colors hover:bg-accent/20"
      >
        Show {Math.min(RENDER_CAP_STEP, remaining)} more
      </button>
    </div>
  );
}

interface GraphRelationshipResumenProps {
  visible: number;
  total: number;
  visibleTipos: number;
  totalTipos: number;
  activeFilters: number;
}

/** Compact summary panel that reports how the current filter state
 *  reduces the full dataset. Numbers come from the same summarizer used
 *  by the legend, so counts are always consistent. */
function GraphRelationshipResumen({
  visible,
  total,
  visibleTipos,
  totalTipos,
  activeFilters,
}: GraphRelationshipResumenProps) {
  return (
    <p className="text-[11px] text-muted-foreground" aria-live="polite" role="status">
      <span className="font-mono text-foreground">{visible}</span> of{" "}
      <span className="font-mono text-foreground">{total}</span> relationships visible ·{" "}
      <span className="font-mono text-foreground">{visibleTipos}</span> of{" "}
      <span className="font-mono text-foreground">{totalTipos}</span> types ·{" "}
      <span className="font-mono text-foreground">{activeFilters}</span> filter
      {activeFilters === 1 ? "" : "s"} active
    </p>
  );
}

/**
 * Compact trust panel. Renders `null` when the dataset carries no trust
 * signals so the graph page looks exactly as before on projections that
 * do not declare provenance/confidence. When the backend starts emitting
 * these fields, the panel lights up automatically.
 */
function TrustPanel({ summary }: { summary: import("@/lib/domain").RelationshipTrustResumen }) {
  if (!summary.hasProvenance && !summary.hasNivel de confianza && !summary.hasMeaningfulEstado) return null;
  return (
    <section
      aria-labelledby="graph-trust-panel-heading"
      className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/40 p-3 sm:p-4"
    >
      <h3
        id="graph-trust-panel-heading"
        className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
      >
        Trust summary
      </h3>
      <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {summary.hasNivel de confianza ? (
          <>
            <div className="inline-flex items-baseline gap-1.5">
              <dt className="uppercase tracking-wide">With confidence</dt>
              <dd className="font-mono text-xs text-foreground">{summary.withNivel de confianza}</dd>
            </div>
            <div className="inline-flex items-baseline gap-1.5">
              <dt className="uppercase tracking-wide">Without</dt>
              <dd className="font-mono text-xs text-foreground">{summary.withoutNivel de confianza}</dd>
            </div>
          </>
        ) : null}
        {summary.hasProvenance
          ? summary.provenances.map((p) => (
              <div key={p.descriptor.id} className="inline-flex items-baseline gap-1.5">
                <dt className="uppercase tracking-wide">{p.descriptor.displayName}</dt>
                <dd className="font-mono text-xs text-foreground">{p.count}</dd>
              </div>
            ))
          : null}
        {summary.hasProvenance && summary.withoutProvenance > 0 ? (
          <div className="inline-flex items-baseline gap-1.5">
            <dt className="uppercase tracking-wide">Not specified</dt>
            <dd className="font-mono text-xs text-foreground">{summary.withoutProvenance}</dd>
          </div>
        ) : null}
        {summary.hasMeaningfulEstado
          ? summary.statuses.map((s) => (
              <div key={s.descriptor.id} className="inline-flex items-baseline gap-1.5">
                <dt className="uppercase tracking-wide">{s.descriptor.displayName}</dt>
                <dd className="font-mono text-xs text-foreground">{s.count}</dd>
              </div>
            ))
          : null}
      </dl>
    </section>
  );
}
