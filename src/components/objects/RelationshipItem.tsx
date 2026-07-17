import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft, ExternalLink } from "lucide-react";

import { ResolutionBadge } from "@/components/shared/ResolutionBadge";
import type { GraphEdge, KnowledgeObjectId } from "@/lib/api/types";

export type RelationshipDirection = "outgoing" | "incoming";

interface RelationshipItemProps {
  edge: GraphEdge;
  direction: RelationshipDirection;
  /** ID of the object currently being viewed — used to pick the related side. */
  currentId: KnowledgeObjectId;
}

/**
 * Renders one relationship edge.
 *
 * Direction rules (per contract):
 *   outgoing → related object is edge.target
 *   incoming → related object is edge.source
 *
 * Navigation is built ONLY from the edge's confirmed id — we never enrich
 * with extra fetches. An unresolved edge stays visible but is not a link
 * (it would point at a route that does not exist).
 */
export function RelationshipItem({ edge, direction, currentId }: RelationshipItemProps) {
  const relatedId = direction === "outgoing" ? edge.target : edge.source;
  const DirectionIcon = direction === "outgoing" ? ArrowRight : ArrowLeft;
  const directionLabel = direction === "outgoing" ? "to" : "from";
  const isSelfReference = edge.resolved && Boolean(relatedId) && relatedId === currentId;
  const isNavigable = edge.resolved && Boolean(relatedId) && relatedId !== currentId;

  const relatedNode = (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className="truncate font-mono text-xs text-foreground">{relatedId}</span>
      {isNavigable ? (
        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
    </span>
  );

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border/60 bg-card/60 p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        <span className="rounded border border-border/60 px-1.5 py-0.5 font-mono uppercase tracking-wide">
          {edge.type}
        </span>
        <DirectionIcon className="h-3 w-3" aria-hidden />
        <span>{directionLabel}</span>
        <ResolutionBadge resolved={edge.resolved} />
      </div>

      <div className="min-w-0 text-sm">
        {isNavigable ? (
          <Link
            to="/objects/$id"
            params={{ id: relatedId }}
            className="inline-flex min-w-0 max-w-full items-center gap-1 break-all text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Open related object ${relatedId} (${directionLabel} ${edge.type})`}
          >
            {relatedNode}
          </Link>
        ) : (
          <span className="flex flex-col gap-1">
            <span className="min-w-0 break-all font-mono text-xs text-foreground">
              {relatedId}
            </span>
            {isSelfReference ? (
              <span className="text-[11px] text-muted-foreground">Current object</span>
            ) : !edge.resolved ? (
              <span className="text-[11px] text-warning">Unresolved target</span>
            ) : null}
          </span>
        )}
      </div>

      {edge.description ? (
        <p className="text-xs text-muted-foreground">{edge.description}</p>
      ) : null}

      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 pt-1 text-[10px] text-muted-foreground">
        <span className="uppercase tracking-wide">source</span>
        <span className="min-w-0 break-all font-mono">{edge.source}</span>
        <span className="uppercase tracking-wide">target</span>
        <span className="min-w-0 break-all font-mono">{edge.target}</span>
      </div>
    </li>
  );
}