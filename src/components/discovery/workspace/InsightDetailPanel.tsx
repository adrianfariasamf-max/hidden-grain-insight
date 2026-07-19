import { memo } from "react";
import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import type { GraphNode, KnowledgeObjectId } from "@/lib/api/types";
import {
  DISCOVERY_ACTION_CATALOG,
  getInsightActionState,
  toInsightViewModel,
  type DiscoveryInsight,
} from "@/lib/domain/discovery";

export interface InsightDetailPanelProps {
  insight: DiscoveryInsight | null;
  nodesById?: ReadonlyMap<KnowledgeObjectId, Pick<GraphNode, "id" | "title" | "type">>;
}

const PRIORITY_TONE: Record<DiscoveryInsight["priority"], string> = {
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  low: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  info: "border-border/60 bg-muted/40 text-muted-foreground",
};

function InsightDetailPanelImpl({ insight, nodesById }: InsightDetailPanelProps) {
  if (!insight) {
    return (
      <section
        aria-label="Insight detail"
        className="flex h-full min-h-0 items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/30 p-6 text-center"
      >
        <p className="text-xs text-muted-foreground">
          Select an insight from the list to view its full analysis.
        </p>
      </section>
    );
  }

  const vm = toInsightViewModel(insight);
  const Icon = vm.descriptor.icon;
  const actionState = getInsightActionState(insight);

  return (
    <section
      aria-labelledby={`insight-detail-${vm.id}-title`}
      className="flex h-full min-h-0 flex-col overflow-y-auto rounded-lg border border-border/60 bg-card/40"
    >
      <header className="flex flex-col gap-3 border-b border-border/60 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border/60 bg-background">
            <Icon className="h-5 w-5 text-foreground" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id={`insight-detail-${vm.id}-title`}
              className="text-base font-semibold text-foreground"
            >
              {vm.title}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {vm.descriptor.category} · <span className="font-mono">{vm.type}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={cn(
                "rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                PRIORITY_TONE[vm.priority],
              )}
            >
              {vm.priority}
            </span>
            <span
              className="rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              title="Deterministic score, 0–100"
            >
              {vm.scorePct}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{vm.description}</p>

        {/* Reserved action toolbar (EPIC-004.3 infrastructure — disabled). */}
        <div className="flex flex-wrap gap-1 pt-1">
          {DISCOVERY_ACTION_CATALOG.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled
              title={`${a.description} (coming soon)`}
              aria-disabled
              className="cursor-not-allowed rounded border border-dashed border-border/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/70"
              data-action={a.id}
              data-action-active={
                (actionState.pinned && a.id === "pin") ||
                (actionState.bookmarked && a.id === "bookmark") ||
                (actionState.dismissed && a.id === "dismiss")
              }
            >
              {a.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-6 p-4">
        <Block label="Why">
          <p className="text-sm text-foreground/90">{vm.why}</p>
        </Block>

        <Block label={`Evidence (${vm.evidence.length})`}>
          <ul className="list-none divide-y divide-border/40 overflow-hidden rounded-md border border-border/60">
            {vm.evidence.map((e, idx) => (
              <li
                key={`${e.metric}-${idx}`}
                className="flex items-baseline justify-between gap-3 bg-background/40 px-3 py-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] text-muted-foreground">{e.metric}</p>
                  {e.detail ? <p className="text-foreground/80">{e.detail}</p> : null}
                </div>
                <span className="shrink-0 font-mono text-foreground">{String(e.value)}</span>
              </li>
            ))}
          </ul>
        </Block>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Score" value={`${vm.scorePct}`} />
          <Metric label="Priority" value={vm.priority} />
          <Metric label="Objects" value={String(vm.objectIds.length)} />
          <Metric label="Relationships" value={String(vm.relationshipIds.length)} />
        </div>

        <Block label={`Objects (${vm.objectIds.length})`}>
          {vm.objectIds.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No objects referenced.</p>
          ) : (
            <ul className="list-none divide-y divide-border/40 overflow-hidden rounded-md border border-border/60">
              {vm.objectIds.map((id, idx) => {
                const node = nodesById?.get(id);
                return (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-3 bg-background/40 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      {node?.title ? (
                        <p className="truncate text-xs text-foreground">{node.title}</p>
                      ) : null}
                      <p className="min-w-0 break-all font-mono text-[10px] text-muted-foreground">
                        {id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {idx === 0 ? (
                        <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-primary">
                          primary
                        </span>
                      ) : null}
                      <Link
                        to="/objects/$id"
                        params={{ id }}
                        className="text-[11px] text-primary hover:underline"
                      >
                        Open →
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Block>

        <Block label={`Relationships (${vm.relationshipIds.length})`}>
          {vm.relationshipIds.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              No supporting relationships — this insight is defined by absence.
            </p>
          ) : (
            <ul className="flex list-none flex-wrap gap-1">
              {vm.relationshipIds.map((id) => (
                <li
                  key={id}
                  className="rounded border border-border/60 bg-background/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                  title={id}
                >
                  {id}
                </li>
              ))}
            </ul>
          )}
        </Block>
      </div>
    </section>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </h3>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border/60 bg-background/40 px-3 py-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-sm text-foreground">{value}</span>
    </div>
  );
}

export const InsightDetailPanel = memo(InsightDetailPanelImpl);