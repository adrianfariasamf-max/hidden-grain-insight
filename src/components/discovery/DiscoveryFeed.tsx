import { memo, useMemo } from "react";

import type { GraphNode, KnowledgeObjectId } from "@/lib/api/types";
import {
  groupInsightsByCategory,
  groupInsightsByPriority,
  rankInsights,
  toInsightViewModel,
  type DiscoveryInsight,
  type InsightCategory,
  type InsightPriority,
} from "@/lib/domain/discovery";

import { DiscoveryCard } from "./DiscoveryCard";
import { DiscoveryEmptyState } from "./DiscoveryEmptyState";

export type DiscoveryFeedGrouping = "none" | "priority" | "category";

export interface DiscoveryFeedProps {
  insights: readonly DiscoveryInsight[];
  /** Called for lookups only — never mutated. */
  nodesById?: ReadonlyMap<KnowledgeObjectId, Pick<GraphNode, "id" | "title" | "type">>;
  grouping?: DiscoveryFeedGrouping;
  /** Drives the "no graph yet" vs "no insights" empty state. */
  hasGraph: boolean;
}

function DiscoveryFeedImpl({
  insights,
  nodesById,
  grouping = "none",
  hasGraph,
}: DiscoveryFeedProps) {
  // Ordering is delegated to `rankInsights` — never resorted in React.
  const ranked = useMemo(() => rankInsights(insights), [insights]);

  const grouped = useMemo(() => {
    if (grouping === "priority") {
      return { kind: "priority" as const, buckets: groupInsightsByPriority(insights) };
    }
    if (grouping === "category") {
      return { kind: "category" as const, buckets: groupInsightsByCategory(insights) };
    }
    return null;
  }, [grouping, insights]);

  if (ranked.length === 0) {
    return <DiscoveryEmptyState hasGraph={hasGraph} />;
  }

  if (grouped) {
    // Selectors already emit buckets in deterministic order — we only iterate.
    const entries = Array.from(grouped.buckets.entries()) as Array<
      [InsightPriority | InsightCategory, DiscoveryInsight[]]
    >;
    return (
      <div className="flex flex-col gap-6">
        {entries.map(([key, bucket]) => (
          <section
            key={String(key)}
            aria-labelledby={`discovery-group-${String(key)}`}
            className="flex flex-col gap-3"
          >
            <header className="flex items-baseline justify-between gap-3">
              <h2
                id={`discovery-group-${String(key)}`}
                className="text-xs font-mono uppercase tracking-widest text-muted-foreground"
              >
                {String(key)}
              </h2>
              <span className="font-mono text-[11px] text-muted-foreground">{bucket.length}</span>
            </header>
            <ul className="grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2">
              {bucket.map((insight) => (
                <li key={insight.id}>
                  <DiscoveryCard
                    insight={toInsightViewModel(insight)}
                    nodesById={nodesById}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <ul className="grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2">
      {ranked.map((insight) => (
        <li key={insight.id}>
          <DiscoveryCard insight={toInsightViewModel(insight)} nodesById={nodesById} />
        </li>
      ))}
    </ul>
  );
}

export const DiscoveryFeed = memo(DiscoveryFeedImpl);