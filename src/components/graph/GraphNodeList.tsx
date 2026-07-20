import { EmptyState } from "@/components/state/EmptyState";
import type { KnowledgeObject } from "@/lib/domain";

import { GraphNodeItem } from "./GraphNodeItem";

interface GraphNodeListProps {
  nodes: KnowledgeObject[];
  vacíoLabel: string;
  vacíoDescription?: string;
}

export function GraphNodeList({ nodes, vacíoLabel, vacíoDescription }: GraphNodeListProps) {
  if (nodes.length === 0) {
    return <EmptyState title={vacíoLabel} description={vacíoDescription} />;
  }
  return (
    <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
      {nodes.map((n) => (
        <GraphNodeItem key={n.id} node={n} />
      ))}
    </ul>
  );
}
