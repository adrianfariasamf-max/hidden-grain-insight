import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Link2 } from "lucide-react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import type { KnowledgeObjectSummary } from "@/lib/api/types";

interface ObjectCardProps {
  object: KnowledgeObjectSummary;
}

/**
 * Displays a single Knowledge Object summary as returned by GET /objects.
 * Only renders fields that exist on the response — no fabricated fallbacks.
 * The whole card links to /objects/:id.
 */
export function ObjectCard({ object }: ObjectCardProps) {
  const hasTags = Array.isArray(object.tags) && object.tags.length > 0;

  return (
    <Link
      to="/objects/$id"
      params={{ id: object.id }}
      className="group flex h-full flex-col gap-3 rounded-lg border border-border/60 bg-card/60 p-4 text-left transition-colors hover:border-primary/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          {object.type ? (
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {object.type}
            </span>
          ) : null}
          <h3 className="truncate text-sm font-semibold text-foreground">
            {object.title}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {object.status ? <StatusBadge status={object.status} /> : null}
          <ArrowUpRight
            className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground"
            aria-hidden
          />
        </div>
      </header>

      {object.summary ? (
        <p className="line-clamp-3 text-xs text-muted-foreground">{object.summary}</p>
      ) : null}

      <footer className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[11px] text-muted-foreground">
        <span className="font-mono">{object.id}</span>
        {object.version ? (
          <span className="font-mono">v{object.version}</span>
        ) : null}
        {typeof object.relationshipCount === "number" ? (
          <span className="inline-flex items-center gap-1">
            <Link2 className="h-3 w-3" aria-hidden />
            {object.relationshipCount}
          </span>
        ) : null}
        {hasTags ? (
          <span className="ml-auto flex flex-wrap gap-1">
            {object.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </span>
        ) : null}
      </footer>
    </Link>
  );
}