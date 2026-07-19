import { EmptyState } from "@/components/state/EmptyState";
import type { KnowledgeObjectId } from "@/lib/api/types";
import type { Relationship } from "@/lib/domain";

import { GraphEdgeItem } from "./GraphEdgeItem";

interface GraphEdgeListProps {
  relationships: Relationship[];
  knownNodeIds: ReadonlySet<KnowledgeObjectId>;
  emptyLabel: string;
  emptyDescription?: string;
}

export function GraphEdgeList({
  relationships,
  knownNodeIds,
  emptyLabel,
  emptyDescription,
}: GraphEdgeListProps) {
  if (relationships.length === 0) {
    return <EmptyState title={emptyLabel} description={emptyDescription} />;
  }
  return (
    <ul className="flex flex-col gap-2">
      {relationships.map((r) => (
        <GraphEdgeItem key={r.id} relationship={r} knownNodeIds={knownNodeIds} />
      ))}
    </ul>
  );
}
