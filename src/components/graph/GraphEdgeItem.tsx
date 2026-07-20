import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { ResolutionBadge } from "@/components/shared/ResolutionBadge";
import { ConfidenceBadge, ProvenanceBadge } from "@/components/shared/TrustBadges";
import type { KnowledgeObjectId } from "@/lib/api/types";
import { getRelationshipTypeDescriptor, type Relationship } from "@/lib/domain";

interface GraphEdgeItemProps {
  relationship: Relationship;
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
function GraphEdgeItemImpl({ relationship, knownNodeIds }: GraphEdgeItemProps) {
  const resolved = relationship.status === "resolved";
  const sourceNavigable = resolved || knownNodeIds.has(relationship.sourceId);
  const targetNavigable = resolved || knownNodeIds.has(relationship.targetId);
  const description = relationship.metadata.description;
  const typeDescriptor = getRelationshipTypeDescriptor(relationship.type);

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
        <ResolutionBadge resolved={resolved} />
        <ProvenanceBadge relationship={relationship} />
        <ConfidenceBadge relationship={relationship} />
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <Endpoint
          id={relationship.sourceId}
          navigable={sourceNavigable}
          ariaLabel={`Open source object ${relationship.sourceId}`}
        />
        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
        <Endpoint
          id={relationship.targetId}
          navigable={targetNavigable}
          ariaLabel={`Open target object ${relationship.targetId}`}
        />
      </div>

      {!resolved ? <p className="text-[11px] text-warning">Unresolved target</p> : null}

      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </li>
  );
}

// Memoized: `edge` references are stable across filter changes because they
// come straight from the immutable query cache. `knownNodeIds` is the same
// Set instance for the whole render pass, so reference equality is enough.
export const GraphEdgeItem = memo(GraphEdgeItemImpl);
