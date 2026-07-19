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
import { SafeTimestamp } from "@/components/shared/SafeTimestamp";
import { graphQuery } from "@/lib/api/queries";
import type { GraphEdge, GraphNode, KnowledgeObjectId } from "@/lib/api/types";

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
  edgeType: "",
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
  // NOTE (server-side filtering, HG-PATCH-003 phase 4):
  // The query key already accepts `GraphQueryParams` so we can forward
  // filters to the backend as soon as `/graph` supports them. Today the
  // contract still returns the full projection, so we pass no params here
  // and keep the local, in-memory filtering below. Switching to server-side
  // is a one-line change: pass the normalized filters into `graphQuery({...})`.
  const query = useQuery(graphQuery());
  const [filters, setFilters] = useState<GraphFilterValues>(INITIAL_FILTERS);
  const [nodeLimit, setNodeLimit] = useState(RENDER_CAP_INITIAL);
  const [edgeLimit, setEdgeLimit] = useState(RENDER_CAP_INITIAL);

  const patchFilters = useCallback((patch: Partial<GraphFilterValues>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setNodeLimit(RENDER_CAP_INITIAL);
    setEdgeLimit(RENDER_CAP_INITIAL);
  }, []);
  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setNodeLimit(RENDER_CAP_INITIAL);
    setEdgeLimit(RENDER_CAP_INITIAL);
  }, []);

  const graph = query.data;

  const nodeTypes = useMemo(
    () => uniqueSorted((graph?.nodes ?? []).map((n) => n.type)),
    [graph?.nodes],
  );
  const edgeTypes = useMemo(
    () => uniqueSorted((graph?.edges ?? []).map((e) => e.type)),
    [graph?.edges],
  );

  const filteredNodes = useMemo<GraphNode[]>(() => {
    if (!graph) return [];
    if (!filters.nodeType) return graph.nodes;
    return graph.nodes.filter((n) => n.type === filters.nodeType);
  }, [graph, filters.nodeType]);

  const filteredEdges = useMemo<GraphEdge[]>(() => {
    if (!graph) return [];
    // Skip the walk entirely when no edge filter is active — keep the source
    // reference so `memo(GraphEdgeItem)` sees the same instances.
    if (!filters.edgeType && filters.resolution === "all") return graph.edges;
    const wantResolved =
      filters.resolution === "resolved"
        ? true
        : filters.resolution === "unresolved"
          ? false
          : null;
    return graph.edges.filter((e) => {
      if (filters.edgeType && e.type !== filters.edgeType) return false;
      if (wantResolved !== null && e.resolved !== wantResolved) return false;
      return true;
    });
  }, [graph, filters.edgeType, filters.resolution]);

  const knownNodeIds = useMemo<ReadonlySet<KnowledgeObjectId>>(
    () => new Set((graph?.nodes ?? []).map((n) => n.id)),
    [graph?.nodes],
  );

  // Slice AFTER filtering. Both slices reuse identity when possible so that
  // memoized item rows do not re-render when the cap grows.
  const visibleNodes = useMemo(
    () => (filteredNodes.length > nodeLimit ? filteredNodes.slice(0, nodeLimit) : filteredNodes),
    [filteredNodes, nodeLimit],
  );
  const visibleEdges = useMemo(
    () => (filteredEdges.length > edgeLimit ? filteredEdges.slice(0, edgeLimit) : filteredEdges),
    [filteredEdges, edgeLimit],
  );
  const nodesTruncated = filteredNodes.length > visibleNodes.length;
  const edgesTruncated = filteredEdges.length > visibleEdges.length;

  const showMoreNodes = useCallback(
    () => setNodeLimit((n) => n + RENDER_CAP_STEP),
    [],
  );
  const showMoreEdges = useCallback(
    () => setEdgeLimit((n) => n + RENDER_CAP_STEP),
    [],
  );

  const filtersActive =
    filters.nodeType !== "" || filters.edgeType !== "" || filters.resolution !== "all";

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
              options={{ nodeTypes, edgeTypes }}
              onChange={patchFilters}
              onClearAll={clearFilters}
              visibleNodes={filteredNodes.length}
              visibleEdges={filteredEdges.length}
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
                  {filteredEdges.length} / {graph.edgeCount}
                </span>
              </header>
              <GraphEdgeList
                edges={visibleEdges}
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
                      ? "Try clearing filters to see all relationships."
                      : undefined
                }
              />
              {edgesTruncated ? (
                <ShowMore
                  visible={visibleEdges.length}
                  total={filteredEdges.length}
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
