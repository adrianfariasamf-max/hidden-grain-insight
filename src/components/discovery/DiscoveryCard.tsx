import { memo } from "react";
import { Link } from "@tanstack/react-router";

import type { DiscoveryInsightViewModel } from "@/lib/domain/discovery";
import type { GraphNode, KnowledgeObjectId } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export interface DiscoveryCardProps {
  insight: DiscoveryInsightViewModel;
  /** Lookup for object metadata (title/type). Optional — the card falls
   *  back to raw ids if the lookup is missing an entry. */
  nodesById?: ReadonlyMap<KnowledgeObjectId, Pick<GraphNode, "id" | "title" | "type">>;
}

const PRIORITY_TONE: Record<DiscoveryInsightViewModel["priority"], string> = {
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  low: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  info: "border-border/60 bg-muted/40 text-muted-foreground",
};

function DiscoveryCardImpl({ insight, nodesById }: DiscoveryCardProps) {
  const Icon = insight.descriptor.icon;
  const primaryId = insight.objectIds[0];
  const primaryNode = primaryId ? nodesById?.get(primaryId) : undefined;
  const extraObjects = insight.objectIds.length - 1;
  const relationshipCount = insight.relationshipIds.length;

  return (
    <article
      aria-labelledby={`insight-${insight.id}-title`}
      className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/60 p-4 transition-colors hover:border-border"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border/60 bg-background text-foreground">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <div className="flex min-w-0 flex-col">
            <h3
              id={`insight-${insight.id}-title`}
              className="truncate text-sm font-semibold text-foreground"
            >
              {insight.title}
            </h3>
            <span className="truncate text-[11px] text-muted-foreground">
              {insight.descriptor.category} · {insight.type}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
              PRIORITY_TONE[insight.priority],
            )}
          >
            {insight.priority}
          </span>
          <span
            className="rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
            title="Deterministic score, 0–100"
          >
            {insight.scorePct}
          </span>
        </div>
      </header>

      <p className="text-sm text-foreground/90">{insight.why}</p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-3">
        <div className="flex min-w-0 flex-col">
          <dt className="font-mono uppercase tracking-wider">Primary</dt>
          <dd className="min-w-0 truncate text-foreground">
            {primaryId ? (
              <Link
                to="/objects/$id"
                params={{ id: primaryId }}
                className="underline-offset-2 hover:underline"
              >
                {primaryNode?.title ?? primaryId}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="font-mono uppercase tracking-wider">Objects</dt>
          <dd className="text-foreground">
            {insight.objectIds.length}
            {extraObjects > 0 ? (
              <span className="text-muted-foreground"> ({extraObjects} more)</span>
            ) : null}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="font-mono uppercase tracking-wider">Relationships</dt>
          <dd className="text-foreground">{relationshipCount}</dd>
        </div>
      </dl>
    </article>
  );
}

export const DiscoveryCard = memo(DiscoveryCardImpl);
