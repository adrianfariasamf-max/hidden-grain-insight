import { useMemo, useState, useCallback, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/state/LoadingState";
import { ErrorState } from "@/components/state/ErrorState";
import { DiscoveryEmptyState } from "@/components/discovery/DiscoveryEmptyState";
import { InsightListPanel } from "@/components/discovery/workspace/InsightListPanel";
import { InsightDetailPanel } from "@/components/discovery/workspace/InsightDetailPanel";
import { InsightContextPanel } from "@/components/discovery/workspace/InsightContextPanel";
import { graphQuery } from "@/lib/api/queries";
import type { GraphNode, KnowledgeObjectId } from "@/lib/api/types";
import { toRelationship } from "@/lib/domain";
import {
  analyzeGraph,
  EMPTY_DISCOVERY_FILTERS,
  selectInsightsByFilters,
  sortInsights,
  type DiscoveryFilters,
  type DiscoverySortMode,
} from "@/lib/domain/discovery";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discovery — Hidden Grain" },
      {
        name: "description",
        content:
          "Discovery Workspace: explore, prioritise and inspect deterministic insights from the Grafo de conocimiento.",
      },
    ],
  }),
  component: DiscoverRoute,
});

function DiscoverRoute() {
  const query = useQuery(graphQuery());
  const [filters, setFilters] = useState<DiscoveryFilters>(EMPTY_DISCOVERY_FILTERS);
  const [sort, setSort] = useState<DiscoverySortMode>("ranked");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const graph = query.data;

  // Run the deterministic analyzer once per graph payload. Every downstream
  // memo depends on this reference — same input → same identity → no
  // unnecessary child re-renders.
  const relationships = useMemo(() => (graph ? graph.edges.map(toRelationship) : []), [graph]);
  const insights = useMemo(() => {
    if (!graph) return [];
    return analyzeGraph({ nodes: graph.nodes, relationships });
  }, [graph, relationships]);

  const nodesById = useMemo<ReadonlyMap<KnowledgeObjectId, GraphNode>>(() => {
    const m = new Map<KnowledgeObjectId, GraphNode>();
    if (graph) for (const n of graph.nodes) m.set(n.id, n);
    return m;
  }, [graph]);

  // Filter then sort. Selectors own both operations; the route never
  // reorders. Filters are preserved when selection changes.
  const filtered = useMemo(() => selectInsightsByFilters(insights, filters), [insights, filters]);
  const displayed = useMemo(() => sortInsights(filtered, sort), [filtered, sort]);

  // Auto-select the first insight when the current selection is not in
  // the visible slice. Never re-selects on unrelated re-renders.
  useEffect(() => {
    if (displayed.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!selectedId || !displayed.some((i) => i.id === selectedId)) {
      setSelectedId(displayed[0]!.id);
    }
  }, [displayed, selectedId]);

  const selectedInsight = useMemo(
    () => (selectedId ? (insights.find((i) => i.id === selectedId) ?? null) : null),
    [insights, selectedId],
  );

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);
  const handleFiltersChange = useCallback((next: DiscoveryFilters) => setFilters(next), []);
  const handleSortChange = useCallback((next: DiscoverySortMode) => setSort(next), []);

  return (
    <>
      <PageHeader
        eyebrow="Discovery"
        title="Discovery Workspace"
        description="Deterministic insights derived from the Grafo de conocimiento — no AI, no probabilistic ranking."
      />
      <section className="flex flex-col gap-4 px-4 py-6 sm:px-8">
        {query.isPending ? (
          <LoadingState label="Analyzing graph…" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : insights.length === 0 ? (
          <DiscoveryEmptyState hasGraph={!!graph && graph.nodes.length > 0} />
        ) : (
          <div className="grid min-h-[70vh] gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)_minmax(260px,340px)]">
            <InsightListPanel
              insights={displayed}
              selectedId={selectedId}
              onSelect={handleSelect}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              sort={sort}
              onSortChange={handleSortChange}
              filteredCount={displayed.length}
              totalCount={insights.length}
            />
            <InsightDetailPanel insight={selectedInsight} nodesById={nodesById} />
            <InsightContextPanel
              insight={selectedInsight}
              nodesById={nodesById}
              relationships={relationships}
            />
          </div>
        )}
      </section>
    </>
  );
}
