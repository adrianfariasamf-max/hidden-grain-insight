import { useMemo, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/state/LoadingState";
import { ErrorState } from "@/components/state/ErrorState";
import {
  DiscoveryFeed,
  type DiscoveryFeedGrouping,
} from "@/components/discovery/DiscoveryFeed";
import { graphQuery } from "@/lib/api/queries";
import type { GraphNode, KnowledgeObjectId } from "@/lib/api/types";
import { toRelationship } from "@/lib/domain";
import { analyzeGraph, summarizeInsights } from "@/lib/domain/discovery";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discovery — Hidden Grain" },
      {
        name: "description",
        content:
          "Deterministic Discovery Feed: insights surfaced automatically from the Knowledge Graph.",
      },
    ],
  }),
  component: DiscoverRoute,
});

const GROUPING_OPTIONS: { value: DiscoveryFeedGrouping; label: string }[] = [
  { value: "none", label: "Ranked" },
  { value: "priority", label: "By priority" },
  { value: "category", label: "By category" },
];

function DiscoverRoute() {
  const query = useQuery(graphQuery());
  const [grouping, setGrouping] = useState<DiscoveryFeedGrouping>("none");

  const graph = query.data;

  // Run the deterministic analyzer once per graph payload. Every downstream
  // memo depends on this reference — same input → same identity → no
  // unnecessary child re-renders.
  const insights = useMemo(() => {
    if (!graph) return [];
    return analyzeGraph({
      nodes: graph.nodes,
      relationships: graph.edges.map(toRelationship),
    });
  }, [graph]);

  const nodesById = useMemo<ReadonlyMap<KnowledgeObjectId, GraphNode>>(() => {
    const m = new Map<KnowledgeObjectId, GraphNode>();
    if (graph) for (const n of graph.nodes) m.set(n.id, n);
    return m;
  }, [graph]);

  const summary = useMemo(() => summarizeInsights(insights), [insights]);

  const handleGroupingChange = useCallback((next: DiscoveryFeedGrouping) => {
    setGrouping(next);
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Discovery"
        title="Discovery Feed"
        description="Deterministic insights derived from the Knowledge Graph — no AI, no probabilistic ranking."
      />
      <section className="flex flex-col gap-6 px-4 py-6 sm:px-8">
        {query.isPending ? (
          <LoadingState label="Analyzing graph…" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                <span className="font-mono">
                  {summary.total} insight{summary.total === 1 ? "" : "s"} · {summary.distinctObjects}{" "}
                  object{summary.distinctObjects === 1 ? "" : "s"}
                </span>
              </div>
              <div
                role="radiogroup"
                aria-label="Grouping"
                className="flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-1"
              >
                {GROUPING_OPTIONS.map((opt) => {
                  const active = grouping === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => handleGroupingChange(opt.value)}
                      className={cn(
                        "rounded px-2 py-1 text-[11px] font-medium transition-colors",
                        active
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {query.isFetching ? (
              <p className="text-[11px] text-muted-foreground" aria-live="polite">
                Refreshing…
              </p>
            ) : null}

            <DiscoveryFeed
              insights={insights}
              nodesById={nodesById}
              grouping={grouping}
              hasGraph={!!graph && graph.nodes.length > 0}
            />
          </>
        )}
      </section>
    </>
  );
}