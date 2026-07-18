import { EmptyState } from "@/components/state/EmptyState";
import type { GraphEdge, KnowledgeObjectId } from "@/lib/api/types";

import { RelationshipItem, type RelationshipDirection } from "./RelationshipItem";

interface RelationshipListProps {
  title: string;
  direction: RelationshipDirection;
  edges: GraphEdge[];
  currentId: KnowledgeObjectId;
  emptyLabel: string;
}

export function RelationshipList({
  title,
  direction,
  edges,
  currentId,
  emptyLabel,
}: RelationshipListProps) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="font-mono text-[11px] text-muted-foreground">{edges.length}</span>
      </header>
      {edges.length === 0 ? (
        <EmptyState title={emptyLabel} />
      ) : (
        <ul className="flex flex-col gap-2">
          {edges.map((edge) => (
            <RelationshipItem
              key={edge.id}
              edge={edge}
              direction={direction}
              currentId={currentId}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
