import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { ResolutionBadge } from "@/components/shared/ResolutionBadge";
import type { GraphEdge, KnowledgeObjectId } from "@/lib/api/types";

interface GraphEdgeItemProps {
  edge: GraphEdge;
  /**
   * Set of node ids present in the projection. Used to decide which endpoint
   * is navigable when the edge is unresolved — the contract does not tell us
   * which side failed to resolve, so we only link the endpoint we can prove
   * exists in the projection.
   */
  knownNodeIds: ReadonlySet<KnowledgeObjectId>;
}

function Endpoint({
  id,
  navigable,
  ariaLabel,
}: {
  id: KnowledgeObjectId;
  navigable: boolean;
  ariaLabel: string;
}) {
  if (navigable) {
    return (
      <Link
        to="/objects/$id"
        params={{ id }}
        className="min-w-0 break-all font-mono text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={ariaLabel}
      >
        {id}
      </Link>
    );
  }
  return <span className="min-w-0 break-all font-mono text-xs text-foreground">{id}</span>;
}

/**
 * A single graph edge in the structured list.
 *
 * Resolved edges → both endpoints link to /objects/:id.
 * Unresolved edges → we keep the edge visible with an explicit
 * "Unresolved target" hint. We DO NOT claim which side failed; we only turn
 * an endpoint into a link when its id is present in the projection's node
 * set (i.e. we can prove it exists). No extra fetch is issued.
 */
export function GraphEdgeItem({ edge, knownNodeIds }: GraphEdgeItemProps) {
  const sourceNavigable = edge.resolved || knownNodeIds.has(edge.source);
  const targetNavigable = edge.resolved || knownNodeIds.has(edge.target);

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border/60 bg-card/60 p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        <span className="rounded border border-border/60 px-1.5 py-0.5 font-mono uppercase tracking-wide">
          {edge.type}
        </span>
        <ResolutionBadge resolved={edge.resolved} />
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <Endpoint
          id={edge.source}
          navigable={sourceNavigable}
          ariaLabel={`Open source object ${edge.source}`}
        />
        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
        <Endpoint
          id={edge.target}
          navigable={targetNavigable}
          ariaLabel={`Open target object ${edge.target}`}
        />
      </div>

      {!edge.resolved ? <p className="text-[11px] text-warning">Unresolved target</p> : null}

      {edge.description ? (
        <p className="text-xs text-muted-foreground">{edge.description}</p>
      ) : null}
    </li>
  );
}
