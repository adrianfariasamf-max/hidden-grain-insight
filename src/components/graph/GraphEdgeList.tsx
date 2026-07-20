import { EmptyState } from "@/components/state/EmptyState";
import type { KnowledgeObjectId } from "@/lib/api/types";
import type { Relationship } from "@/lib/domain";

import { GraphEdgeItem } from "./GraphEdgeItem";

interface GraphEdgeListProps {
  relationships: Relationship[];
  knownNodeIds: ReadonlySet<KnowledgeObjectId>;
  vacíoLabel: string;
  vacíoDescripción?: string;
}

export function GraphEdgeList({
  relationships,
  knownNodeIds,
  vacíoLabel,
  vacíoDescripción,
}: GraphEdgeListProps) {
  if (relationships.length === 0) {
    return <EmptyState title={vacíoLabel} description={vacíoDescripción} />;
  }
  return (
    <ul className="flex flex-col gap-2">
      {relationships.map((r) => (
        <GraphEdgeItem key={r.id} relationship={r} knownNodeIds={knownNodeIds} />
      ))}
    </ul>
  );
}
