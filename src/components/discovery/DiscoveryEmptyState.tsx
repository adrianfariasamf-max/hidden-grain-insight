import { Sparkles } from "lucide-react";

import { EmptyState } from "@/components/state/EmptyState";

export interface DescubrimientosEmptyStateProps {
  /** True when the analyzer ran on a non-vacío graph but produced 0 insights. */
  hasGraph: boolean;
}

export function DescubrimientosEmptyState({ hasGraph }: DescubrimientosEmptyStateProps) {
  if (!hasGraph) {
    return (
      <EmptyState
        icon={<Sparkles className="h-6 w-6" aria-hidden />}
        title="No graph data available"
        description="Descubrimientos needs a populated Grafo de conocimiento before it can surface insights."
      />
    );
  }
  return (
    <EmptyState
      icon={<Sparkles className="h-6 w-6" aria-hidden />}
      title="Nothing to discover yet"
      description="The deterministic analyzer did not detect any noteworthy patterns in the current graph."
    />
  );
}
