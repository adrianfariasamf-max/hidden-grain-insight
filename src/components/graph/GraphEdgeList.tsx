import { EmptyState } from "@/components/state/EmptyState";
import type { GraphEdge, KnowledgeObjectId } from "@/lib/api/types";

import { GraphEdgeItem } from "./GraphEdgeItem";

interface GraphEdgeListProps {
  edges: GraphEdge[];
  knownNodeIds: ReadonlySet<KnowledgeObjectId>;
  emptyLabel: string;
  emptyDescription?: string;
}

export function GraphEdgeList({
  edges,
  knownNodeIds,
  emptyLabel,
  emptyDescription,
}: GraphEdgeListProps) {
  if (edges.length === 0) {
    return <EmptyState title={emptyLabel} description={emptyDescription} />;
  }
  return (
    <ul className="flex flex-col gap-2">
      {edges.map((e) => (
        <GraphEdgeItem key={e.id} edge={e} knownNodeIds={knownNodeIds} />
      ))}
    </ul>
  );
}
