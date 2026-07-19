import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import type { KnowledgeObject } from "@/lib/domain";

interface GraphNodeItemProps {
  node: KnowledgeObject;
}

/**
 * Only renders fields confirmed by the `GraphNode` contract. Every node is
 * navigable to /objects/:id — the contract guarantees `id` is a Knowledge
 * Object id. No extra fetch is issued to enrich the node.
 */
function GraphNodeItemImpl({ node }: GraphNodeItemProps) {
  const category = node.metadata.category;
  return (
    <li>
      <Link
        to="/objects/$id"
        params={{ id: node.id }}
        className="group flex flex-col gap-1 rounded-md border border-border/60 bg-card/60 p-3 transition-colors hover:border-primary/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Open object ${node.id}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            {node.title ? (
              <span className="truncate text-sm font-medium text-foreground">{node.title}</span>
            ) : null}
            <span className="min-w-0 break-all font-mono text-[11px] text-muted-foreground">
              {node.id}
            </span>
          </div>
          <ArrowUpRight
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
            aria-hidden
          />
        </div>
        <div className="flex flex-wrap gap-1 pt-1">
          {node.type ? (
            <span className="rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {node.type}
            </span>
          ) : null}
          {category ? (
            <span className="rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {category}
            </span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

// Memoized by identity of the node object. Because we render sliced views
// of the immutable API response, node references are stable across filter
// changes and only the truly changed items re-render.
export const GraphNodeItem = memo(GraphNodeItemImpl);
