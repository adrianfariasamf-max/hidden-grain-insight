import { EmptyState } from "@/components/state/EmptyState";
import type { KnowledgeObjectId } from "@/lib/api/types";
import type { Relationship } from "@/lib/domain";

import { GraphEdgeItem } from "./GraphEdgeItem";

interface GraphEdgeListProps {
  relationships: Relationship[];
  knownNodeIds: ReadonlySet<KnowledgeObjectId>;
  emptyLabel: string;
  vacíoDescription?: string;
}

export function GraphEdgeList({
  relationships,
  knownNodeIds,
  emptyLabel,
  vacíoDescription,
}: GraphEdgeListProps) {
  if (relationships.length === 0) {
    return <EmptyState title={emptyLabel} description={vacíoDescription} />;
  }
  return (
    <ul className="flex flex-col gap-2">
      {relationships.map((r) => (
        <GraphEdgeItem key={r.id} relationship={r} knownNodeIds={knownNodeIds} />
      ))}
    </ul>
  );
}
