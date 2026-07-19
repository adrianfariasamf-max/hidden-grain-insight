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
import { SafeTimestamp } from "@/components/shared/SafeTimestamp";
import { graphQuery } from "@/lib/api/queries";
import type { KnowledgeObjectId } from "@/lib/api/types";
import {
  buildRelationshipOntologyPredicate,
  fromGraphNode,
  summarizeRelationships,
  toRelationship,
  type KnowledgeObject,
  type Relationship,
  type RelationshipCategory,
} from "@/lib/domain";

export const Route = createFileRoute("/graph")({
  head: () => ({
    meta: [
      { title: "Knowledge Graph — Hidden Grain" },
      {
        name: "description",
        content:
          "Structured view of the Hidden Grain Knowledge Graph: nodes, relationships and resolution metrics.",
      },
    ],
  }),
  component: GraphRoute,
});

const INITIAL_FILTERS: GraphFilterValues = {
  nodeType: "",
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
  // NOTE (server-side filtering, HG-PATCH-003 phase 4 / EPIC-002.4):
  // The query key already accepts `GraphQueryParams` so we can forward
  // filters to the backend as soon as `/graph` supports them. Today the
  // contract still returns the full projection, so we pass no params here
  // and keep local, in-memory filtering below. Migration path:
  //   - `filters.nodeType`                → `GraphQueryParams.nodeType`
  //   - `filters.resolution`              → `GraphQueryParams.resolution`
  //   - `selectedTypeIds` (first entry)   → `GraphQueryParams.edgeType`
  //     until the API supports multi-select; until then keep client-side.
  //   - `selectedCategories`              → NOT SENT (no backend field yet).
  // We intentionally do not send params the backend does not advertise.
  const query = useQuery(graphQuery());
  const [filters, setFilters] = useState<GraphFilterValues>(INITIAL_FILTERS);
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<RelationshipCategory[]>([]);
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
    setSelectedTypeIds([]);
    setSelectedCategories([]);
    setNodeLimit(RENDER_CAP_INITIAL);
    setEdgeLimit(RENDER_CAP_INITIAL);
  }, []);
  const toggleType = useCallback(
    (id: string) => {
      setSelectedTypeIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
      resetCaps();
    },
    [resetCaps],
  );
  const toggleCategory = useCallback(
    (c: RelationshipCategory) => {
      setSelectedCategories((prev) =>
        prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
      );
      resetCaps();
    },
    [resetCaps],
  );
  const clearOntologyFilters = useCallback(() => {
    setSelectedTypeIds([]);
    setSelectedCategories([]);
    resetCaps();
  }, [resetCaps]);

  const graph = query.data;

  const nodeTypes = useMemo(
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
    if (!filters.nodeType) return canonicalNodes;
    return canonicalNodes.filter((n) => n.type === filters.nodeType);
  }, [canonicalNodes, filters.nodeType]);

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

  // Ontology predicate (types OR / categories OR / groups AND).
  const ontologyPredicate = useMemo(
    () =>
      buildRelationshipOntologyPredicate({
        typeIds: selectedTypeIds,
        categories: selectedCategories,
      }),
    [selectedTypeIds, selectedCategories],
  );

  const filteredRelationships = useMemo<Relationship[]>(() => {
    const wantStatus =
      filters.resolution === "resolved"
        ? "resolved"
        : filters.resolution === "unresolved"
          ? "unresolved"
          : null;
    // AND across filter groups: resolution AND ontology(types/categories).
    return canonicalRelationships.filter((r) => {
      if (wantStatus !== null && r.status !== wantStatus) return false;
      if (!ontologyPredicate(r)) return false;
      return true;
    });
  }, [canonicalRelationships, filters.resolution, ontologyPredicate]);

  const filteredSummary = useMemo(
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

  const ontologyActive = selectedTypeIds.length > 0 || selectedCategories.length > 0;
  const filtersActive =
    filters.nodeType !== "" || filters.resolution !== "all" || ontologyActive;
  const activeFilterCount =
    (filters.nodeType !== "" ? 1 : 0) +
    (filters.resolution !== "all" ? 1 : 0) +
    selectedTypeIds.length +
    selectedCategories.length;

  return (
    <>
      <PageHeader
        eyebrow="Graph"
        title="Knowledge Graph"
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
              options={{ nodeTypes }}
              onChange={patchFilters}
              onClearAll={clearAllFilters}
              hasAnyActiveFilters={filtersActive}
              visibleNodes={filteredNodes.length}
              visibleEdges={filteredRelationships.length}
            />

            <RelationshipLegend summary={summary} />

            <RelationshipOntologyFilter
              summary={summary}
              selectedTypeIds={selectedTypeIds}
              selectedCategories={selectedCategories}
              onToggleType={toggleType}
              onToggleCategory={toggleCategory}
              onClear={clearOntologyFilters}
            />

            <GraphRelationshipSummary
              visible={filteredRelationships.length}
              total={canonicalRelationships.length}
              visibleTypes={filteredSummary.types.length}
              totalTypes={summary.types.length}
              activeFilters={activeFilterCount}
            />

            {query.isFetching ? (
              <p className="text-[11px] text-muted-foreground" aria-live="polite">
                Refreshing…
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
                emptyLabel={
                  graph.nodeCount === 0
                    ? "No nodes in the graph"
                    : filtersActive
                      ? "No nodes match the current filters"
                      : "No nodes to display"
                }
                emptyDescription={
                  graph.nodeCount === 0
                    ? "The projection is currently empty."
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
                emptyLabel={
                  graph.edgeCount === 0
                    ? "No relationships in the graph"
                    : filtersActive
                      ? "No relationships match the current filters"
                      : "No relationships to display"
                }
                emptyDescription={
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
              <span className="uppercase tracking-wide">Generated at</span>
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
