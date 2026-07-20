import { EmptyState } from "@/components/state/EmptyState";
import type { KnowledgeObjectId } from "@/lib/api/types";
import type { Relationship } from "@/lib/domain";

import { RelationshipItem } from "./RelationshipItem";

interface RelationshipListProps {
  title: string;
  relationships: Relationship[];
  currentId: KnowledgeObjectId;
  vacíoLabel: string;
}

export function RelationshipList({
  title,
  relationships,
  currentId,
  vacíoLabel,
}: RelationshipListProps) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="font-mono text-[11px] text-muted-foreground">{relationships.length}</span>
      </header>
      {relationships.length === 0 ? (
        <EmptyState title={vacíoLabel} />
      ) : (
        <ul className="flex flex-col gap-2">
          {relationships.map((rel) => (
            <RelationshipItem key={rel.id} relationship={rel} currentId={currentId} />
          ))}
        </ul>
      )}
    </section>
  );
}
