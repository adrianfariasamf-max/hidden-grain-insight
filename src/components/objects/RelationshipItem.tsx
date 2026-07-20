import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { ResolutionBadge } from "@/components/shared/ResolutionBadge";
import { ConfidenceBadge, ProvenanceBadge } from "@/components/shared/TrustBadges";
import type { KnowledgeObjectId } from "@/lib/api/types";
import {
  getRelatedEndpointId,
  getRelationshipDirectionIcon,
  getRelationshipDirectionLabel,
  getRelationshipTypeDescriptor,
  isRelatedEndpointNavigable,
  type Relationship,
} from "@/lib/domain";

/** Legacy alias kept for backward compatibility with callers that still
 *  import from this file. The canonical type lives in the domain layer. */
export type RelationshipDirection = "outgoing" | "incoming";

interface RelationshipItemProps {
  relationship: Relationship;
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
export function RelationshipItem({ relationship, currentId }: RelationshipItemProps) {
  const rel = relationship;
  const resolved = rel.status === "resolved";
  const relatedId = getRelatedEndpointId(rel, currentId);
  const DirectionIcon = getRelationshipDirectionIcon(rel.direction);
  const directionLabel = getRelationshipDirectionLabel(rel.direction);
  const isSelfReference = resolved && Boolean(relatedId) && relatedId === currentId;
  const isNavigable = isRelatedEndpointNavigable(rel, currentId);
  const description = rel.metadata.description;
  const typeDescriptor = getRelationshipTypeDescriptor(rel.type);

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
        <span
          className="rounded border border-border/60 px-1.5 py-0.5 font-mono uppercase tracking-wide"
          title={typeDescriptor.description || typeDescriptor.displayName}
          data-relationship-type={typeDescriptor.id}
          data-relationship-category={typeDescriptor.category}
        >
          {typeDescriptor.displayName}
        </span>
        <DirectionIcon className="h-3 w-3" aria-hidden />
        {directionLabel ? <span>{directionLabel}</span> : null}
        <ResolutionBadge resolved={resolved} />
        <ProvenanceBadge relationship={rel} />
        <ConfidenceBadge relationship={rel} />
      </div>

      <div className="min-w-0 text-sm">
        {isNavigable ? (
          <Link
            to="/objects/$id"
            params={{ id: relatedId }}
            className="inline-flex min-w-0 max-w-full items-center gap-1 break-all text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Open related object ${relatedId} (${directionLabel ?? "related"} ${typeDescriptor.displayName})`}
          >
            {relatedNode}
          </Link>
        ) : (
          <span className="flex flex-col gap-1">
            <span className="min-w-0 break-all font-mono text-xs text-foreground">{relatedId}</span>
            {isSelfReference ? (
              <span className="text-[11px] text-muted-foreground">Objeto actual</span>
            ) : !resolved ? (
              <span className="text-[11px] text-warning">Destino no resuelto</span>
            ) : null}
          </span>
        )}
      </div>

      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}

      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 pt-1 text-[10px] text-muted-foreground">
        <span className="uppercase tracking-wide">source</span>
        <span className="min-w-0 break-all font-mono">{rel.sourceId}</span>
        <span className="uppercase tracking-wide">target</span>
        <span className="min-w-0 break-all font-mono">{rel.targetId}</span>
      </div>
    </li>
  );
}
