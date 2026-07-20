import { Sparkles } from "lucide-react";

import { EmptyState } from "@/components/state/EmptyState";

export interface DiscoveryEmptyStateProps {
  /** True when the analyzer ran on a non-vacío graph but produced 0 insights. */
  hasGraph: boolean;
}

export function DiscoveryEmptyState({ hasGraph }: DiscoveryEmptyStateProps) {
  if (!hasGraph) {
    return (
      <EmptyState
        icon={<Sparkles className="h-6 w-6" aria-hidden />}
        title="No hay datos del grafo disponibles"
        description="Discovery needs a populated Grafo de conocimiento before it can surface insights."
      />
    );
  }
  return (
    <EmptyState
      icon={<Sparkles className="h-6 w-6" aria-hidden />}
      title="Aún no hay descubrimientos"
      description="El analizador determinista no detectó patrones destacables en el grafo actual."
    />
  );
}
