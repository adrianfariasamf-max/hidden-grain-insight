import { MetricCard } from "@/components/shared/MetricCard";
import type { HealthResponse } from "@/lib/api/types";

interface RepositoryMetricsProps {
  health: Pick<HealthResponse, "objects" | "nodes" | "edges" | "schemaVersion">;
  includeSchema?: boolean;
}

/**
 * Renders repository counters straight from /health. Zero is a valid value
 * — never treated as empty or errored.
 */
export function RepositoryMetrics({ health, includeSchema }: RepositoryMetricsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <MetricCard label="Objects" value={health.objects} />
      <MetricCard label="Nodes" value={health.nodes} />
      <MetricCard label="Edges" value={health.edges} />
      {includeSchema ? (
        <MetricCard label="Schema" value={health.schemaVersion} mono />
      ) : null}
    </div>
  );
}