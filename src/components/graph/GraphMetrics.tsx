import { MetricCard } from "@/components/shared/MetricCard";
import type { GraphResponse } from "@/lib/api/types";

interface GraphMetricsProps {
  graph: Pick<GraphResponse, "nodeCount" | "edgeCount" | "unresolvedEdgeCount" | "schemaVersion">;
}

/**
 * Metrics come directly from the API projection. We never recompute them
 * from `nodes.length` / `edges.length` — the contract owns those counts.
 */
export function GraphMetrics({ graph }: GraphMetricsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <MetricCard label="Nodes" value={graph.nodeCount} />
      <MetricCard label="Edges" value={graph.edgeCount} />
      <MetricCard
        label="Aristas no resueltas"
        value={graph.unresolvedEdgeCount}
        hint={graph.unresolvedEdgeCount > 0 ? "Destinos ausentes en la proyección" : undefined}
      />
      <MetricCard label="Schema" value={graph.schemaVersion} mono />
    </div>
  );
}
