import { memo, useMemo } from "react";
import { Link } from "@tanstack/react-router";

import type { GraphNode, KnowledgeObjectId } from "@/lib/api/types";
import { getInsightTypeDescriptor, type DiscoveryInsight } from "@/lib/domain/discovery";
import type { Relationship } from "@/lib/domain";
import { getRelationshipTypeDescriptor } from "@/lib/domain";

export interface InsightContextPanelProps {
  insight: DiscoveryInsight | null;
  nodesById?: ReadonlyMap<KnowledgeObjectId, Pick<GraphNode, "id" | "title" | "type" | "category">>;
  /** Full relationship set — the panel derives the involved subset locally. */
  relationships: readonly Relationship[];
}

function InsightContextPanelImpl({ insight, nodesById, relationships }: InsightContextPanelProps) {
  const derived = useMemo(() => {
    if (!insight) return null;
    const relIds = new Set(insight.relationshipIds);
    const relSubset = relationships.filter((r) => relIds.has(r.id));
    const involvedIds = new Set<KnowledgeObjectId>(insight.objectIds);
    for (const r of relSubset) {
      involvedIds.add(r.sourceId);
      involvedIds.add(r.targetId);
    }
    const categories = new Map<string, number>();
    const types = new Map<string, number>();
    for (const id of involvedIds) {
      const n = nodesById?.get(id);
      if (!n) continue;
      if (n.category) categories.set(n.category, (categories.get(n.category) ?? 0) + 1);
      if (n.type) types.set(n.type, (types.get(n.type) ?? 0) + 1);
    }
    const relTypes = new Map<string, number>();
    for (const r of relSubset) {
      relTypes.set(r.type, (relTypes.get(r.type) ?? 0) + 1);
    }
    return {
      relSubset,
      involvedIds: [...involvedIds],
      categories: [...categories.entries()].sort(([a], [b]) => a.localeCompare(b)),
      types: [...types.entries()].sort(([a], [b]) => a.localeCompare(b)),
      relTypes: [...relTypes.entries()].sort(([a], [b]) => a.localeCompare(b)),
    };
  }, [insight, nodesById, relationships]);

  if (!insight || !derived) {
    return (
      <aside
        aria-label="Insight context"
        className="flex h-full min-h-0 items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/30 p-6 text-center"
      >
        <p className="text-xs text-muted-foreground">
          Graph context will appear here when an insight is selected.
        </p>
      </aside>
    );
  }

  const primaryId = insight.objectIds[0];
  const primaryNode = primaryId ? nodesById?.get(primaryId) : undefined;
  const descriptor = getInsightTypeDescriptor(insight.type);

  return (
    <aside
      aria-label="Insight context"
      className="flex h-full min-h-0 flex-col overflow-y-auto rounded-lg border border-border/60 bg-card/40"
    >
      <header className="border-b border-border/60 p-3">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Context
        </h3>
        <p className="text-xs text-muted-foreground">
          Local summary derived from the Grafo de conocimiento — no full graph rendered.
        </p>
      </header>

      <div className="flex flex-col gap-4 p-3">
        <section className="flex flex-col gap-1 rounded-md border border-border/60 bg-background/40 p-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Principal object
          </span>
          {primaryId ? (
            <>
              {primaryNode?.title ? (
                <span className="truncate text-sm font-medium text-foreground">
                  {primaryNode.title}
                </span>
              ) : null}
              <span className="min-w-0 break-all font-mono text-[10px] text-muted-foreground">
                {primaryId}
              </span>
              <div className="flex flex-wrap gap-1 pt-1">
                {primaryNode?.type ? <Tag>{primaryNode.type}</Tag> : null}
                {primaryNode?.category ? <Tag>{primaryNode.category}</Tag> : null}
                <Tag title={descriptor.description}>{descriptor.displayName}</Tag>
              </div>
              <Link
                to="/objects/$id"
                params={{ id: primaryId }}
                className="pt-1 text-[11px] text-primary hover:underline"
              >
                Open object detail →
              </Link>
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground">No primary object.</span>
          )}
        </section>

        <Section label={`Categories (${derived.categories.length})`}>
          {derived.categories.length === 0 ? (
            <Muted>No categories in the involved subset.</Muted>
          ) : (
            <ul className="flex list-none flex-wrap gap-1">
              {derived.categories.map(([cat, n]) => (
                <li key={cat}>
                  <Tag>
                    {cat}
                    <span className="ml-1 font-mono text-[9px] text-muted-foreground">{n}</span>
                  </Tag>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section label={`Object types (${derived.types.length})`}>
          {derived.types.length === 0 ? (
            <Muted>No type data available.</Muted>
          ) : (
            <ul className="flex list-none flex-wrap gap-1">
              {derived.types.map(([t, n]) => (
                <li key={t}>
                  <Tag>
                    {t}
                    <span className="ml-1 font-mono text-[9px] text-muted-foreground">{n}</span>
                  </Tag>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section label={`Relationships (${derived.relSubset.length})`}>
          {derived.relSubset.length === 0 ? (
            <Muted>
              This insight is not backed by explicit relationships — it is defined by absence.
            </Muted>
          ) : (
            <>
              <ul className="flex list-none flex-wrap gap-1 pb-2">
                {derived.relTypes.map(([t, n]) => {
                  const td = getRelationshipTypeDescriptor(t);
                  return (
                    <li key={t}>
                      <Tag title={td.description || td.displayName}>
                        {td.displayName}
                        <span className="ml-1 font-mono text-[9px] text-muted-foreground">{n}</span>
                      </Tag>
                    </li>
                  );
                })}
              </ul>
              <ul className="list-none divide-y divide-border/40 overflow-hidden rounded-md border border-border/60">
                {derived.relSubset.slice(0, 8).map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col gap-0.5 bg-background/40 px-2 py-1.5 text-[11px]"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {getRelationshipTypeDescriptor(r.type).displayName}
                    </span>
                    <div className="flex items-center gap-1 min-w-0">
                      <Link
                        to="/objects/$id"
                        params={{ id: r.sourceId }}
                        className="min-w-0 truncate font-mono text-[10px] text-primary hover:underline"
                      >
                        {r.sourceId}
                      </Link>
                      <span className="text-muted-foreground" aria-hidden>
                        →
                      </span>
                      <Link
                        to="/objects/$id"
                        params={{ id: r.targetId }}
                        className="min-w-0 truncate font-mono text-[10px] text-primary hover:underline"
                      >
                        {r.targetId}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
              {derived.relSubset.length > 8 ? (
                <p className="pt-1 text-[10px] text-muted-foreground">
                  {derived.relSubset.length - 8} more not shown.
                </p>
              ) : null}
            </>
          )}
        </Section>

        <Section label={`Involved objects (${derived.involvedIds.length})`}>
          <ul className="list-none divide-y divide-border/40 overflow-hidden rounded-md border border-border/60">
            {derived.involvedIds.slice(0, 10).map((id) => {
              const n = nodesById?.get(id);
              return (
                <li
                  key={id}
                  className="flex items-center justify-between gap-2 bg-background/40 px-2 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    {n?.title ? (
                      <p className="truncate text-[11px] text-foreground">{n.title}</p>
                    ) : null}
                    <p className="min-w-0 break-all font-mono text-[10px] text-muted-foreground">
                      {id}
                    </p>
                  </div>
                  <Link
                    to="/objects/$id"
                    params={{ id }}
                    className="text-[10px] text-primary hover:underline"
                  >
                    Open →
                  </Link>
                </li>
              );
            })}
          </ul>
          {derived.involvedIds.length > 10 ? (
            <p className="pt-1 text-[10px] text-muted-foreground">
              {derived.involvedIds.length - 10} more not shown.
            </p>
          ) : null}
        </Section>
      </div>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </h4>
      {children}
    </section>
  );
}

function Tag({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground"
    >
      {children}
    </span>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-muted-foreground">{children}</p>;
}

export const InsightContextPanel = memo(InsightContextPanelImpl);
