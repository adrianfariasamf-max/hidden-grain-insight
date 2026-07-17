import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/state/LoadingState";
import { ErrorState } from "@/components/state/ErrorState";
import { GraphMetrics } from "@/components/graph/GraphMetrics";
import {
  GraphFilters,
  type GraphFilterValues,
} from "@/components/graph/GraphFilters";
import { GraphNodeList } from "@/components/graph/GraphNodeList";
import { GraphEdgeList } from "@/components/graph/GraphEdgeList";
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

function uniqueSorted(values: (string | undefined | null)[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    if (typeof v === "string" && v.length > 0) set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function formatGeneratedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // Deterministic UTC formatting — safe for SSR/hydration.
  return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

function GraphRoute() {
  const query = useQuery(graphQuery());
  const [filters, setFilters] = useState<GraphFilterValues>(INITIAL_FILTERS);

  const patchFilters = (patch: Partial<GraphFilterValues>) =>
    setFilters((prev) => ({ ...prev, ...patch }));
  const clearFilters = () => setFilters(INITIAL_FILTERS);

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
    return graph.edges.filter((e) => {
      if (filters.edgeType && e.type !== filters.edgeType) return false;
      if (filters.resolution === "resolved" && !e.resolved) return false;
      if (filters.resolution === "unresolved" && e.resolved) return false;
      return true;
    });
  }, [graph, filters.edgeType, filters.resolution]);

  const knownNodeIds = useMemo<ReadonlySet<KnowledgeObjectId>>(
    () => new Set((graph?.nodes ?? []).map((n) => n.id)),
    [graph?.nodes],
  );

  const filtersActive =
    filters.nodeType !== "" ||
    filters.edgeType !== "" ||
    filters.resolution !== "all";

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
              <p
                className="text-[11px] text-muted-foreground"
                aria-live="polite"
              >
                Refreshing…
              </p>
            ) : null}

            <section
              aria-labelledby="graph-nodes-heading"
              className="flex flex-col gap-3"
            >
              <header className="flex items-baseline justify-between gap-3">
                <h2
                  id="graph-nodes-heading"
                  className="text-sm font-semibold text-foreground"
                >
                  Nodes
                </h2>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {filteredNodes.length} / {graph.nodeCount}
                </span>
              </header>
              <GraphNodeList
                nodes={filteredNodes}
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
            </section>

            <section
              aria-labelledby="graph-edges-heading"
              className="flex flex-col gap-3"
            >
              <header className="flex items-baseline justify-between gap-3">
                <h2
                  id="graph-edges-heading"
                  className="text-sm font-semibold text-foreground"
                >
                  Relationships
                </h2>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {filteredEdges.length} / {graph.edgeCount}
                </span>
              </header>
              <GraphEdgeList
                edges={filteredEdges}
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
            </section>

            <footer className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
              <span className="uppercase tracking-wide">Generated at</span>
              <span className="font-mono text-foreground">
                {formatGeneratedAt(graph.generatedAt)}
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