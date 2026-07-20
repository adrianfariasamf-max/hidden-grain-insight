import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { CreateRelationshipDialog } from "@/components/objects/CreateRelationshipDialog";
import { RelationshipList } from "@/components/objects/RelationshipList";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/state/EmptyState";
import { ErrorState } from "@/components/state/ErrorState";
import { LoadingState } from "@/components/state/LoadingState";
import { ApiNotFoundError } from "@/lib/api/errors";
import { objectDetailQuery } from "@/lib/api/queries";
import type { ObjectDetailResponse } from "@/lib/api/types";
import { isValidKnowledgeObjectId } from "@/lib/api/validation";
import {
  fromGraphNode,
  getDisplayVersion,
  toKnowledgeObject,
  toRelationshipFromViewpoint,
  dedupRelationshipsById,
  type KnowledgeObject,
  type Relationship,
} from "@/lib/domain";

export const Route = createFileRoute("/objects/$id")({
  head: () => ({
    meta: [
      { title: "Object — Hidden Grain" },
      { name: "description", content: "Knowledge Object detail view." },
    ],
  }),
  component: ObjectDetailRoute,
});

function ObjectDetailRoute() {
  const { id } = Route.useParams();
  const idIsValid = isValidKnowledgeObjectId(id);
  // Skip the network entirely for locally invalid IDs — no HTTP call is made
  // and the UI renders a dedicated validation state instead of a 404.
  const query = useQuery({ ...objectDetailQuery(id), enabled: idIsValid });

  const canonical = useMemo(
    () => (query.data ? toKnowledgeObject(query.data.object) : undefined),
    [query.data],
  );
  const graphView = useMemo(
    () => (query.data?.node ? fromGraphNode(query.data.node) : undefined),
    [query.data],
  );

  return (
    <>
      <PageHeader
        eyebrow="Object"
        title={canonical?.title ?? "Object detail"}
        description={<span className="break-all font-mono text-xs">{id}</span>}
        actions={
          <Link
            to="/explorer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to Explorer
          </Link>
        }
      />
      <section className="px-4 py-6 sm:px-8">
        {!idIsValid ? (
          <InvalidIdView id={id} />
        ) : query.isLoading ? (
          <LoadingState label="Loading object…" />
        ) : query.error instanceof ApiNotFoundError ? (
          <NotFoundView id={id} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : query.data && canonical ? (
          <ObjectDetailBody data={query.data} object={canonical} graphView={graphView} />
        ) : null}
      </section>
    </>
  );
}

function InvalidIdView({ id }: { id: string }) {
  return (
    <EmptyState
      title="Invalid object ID"
      description={`"${id}" is not a valid Knowledge Object ID. No request was sent to the API.`}
      action={
        <Link
          to="/explorer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs text-foreground hover:bg-accent/20"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to Explorer
        </Link>
      }
    />
  );
}

function NotFoundView({ id }: { id: string }) {
  return (
    <EmptyState
      title="Object not found"
      description={`No Knowledge Object matches id ${id}.`}
      action={
        <Link
          to="/explorer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs text-foreground hover:bg-accent/20"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to Explorer
        </Link>
      }
    />
  );
}

interface MetaRowProps {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

function MetaRow({ label, value, mono }: MetaRowProps) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-baseline gap-3 border-b border-border/40 py-2 last:border-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={
          mono
            ? "min-w-0 break-all font-mono text-xs text-foreground"
            : "min-w-0 break-words text-sm text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function ObjectDetailBody({
  data,
  object,
  graphView,
}: {
  data: ObjectDetailResponse;
  object: KnowledgeObject;
  graphView?: KnowledgeObject;
}) {
  const { relationships } = data;
  const hasTags = object.tags.length > 0;
  const keywords = object.metadata.keywords;
  const hasKeywords = keywords.length > 0;
  const version = getDisplayVersion(object);
  const category = object.metadata.category;
  const graphCategory = graphView?.metadata.category;
  const graphType = graphView?.type;
  const checksum = object.metadata.checksum;
  const path = object.metadata.path ?? object.source;
  const relationshipCount = object.metadata.relationshipCount ?? data.object.relationshipCount;

  // Normalize wire edges to canonical Relationships from the viewpoint of
  // the current object, then stable-dedup exact-id duplicates. Nothing
  // else is collapsed — two edges sharing (source, target, type) but
  // with different ids remain distinct.
  const { outgoing, incoming, summary } = useMemo(() => {
    const outRaw: Relationship[] = relationships.outgoing.map((e) =>
      toRelationshipFromViewpoint(e, object.id, "outgoing"),
    );
    const inRaw: Relationship[] = relationships.incoming.map((e) =>
      toRelationshipFromViewpoint(e, object.id, "incoming"),
    );
    const out = dedupRelationshipsById(outRaw);
    const inc = dedupRelationshipsById(inRaw);
    const unresolved =
      out.items.filter((r) => r.status === "unresolved").length +
      inc.items.filter((r) => r.status === "unresolved").length;
    return {
      outgoing: out.items,
      incoming: inc.items,
      summary: {
        outgoingCount: out.items.length,
        backlinksCount: inc.items.length,
        total: out.items.length + inc.items.length,
        unresolved,
        droppedDuplicates: out.removed + inc.removed,
      },
    };
  }, [relationships, object.id]);

  const [filter, setFilter] = useState<"all" | "outgoing" | "backlinks">("all");
  const showOutgoing = filter !== "backlinks";
  const showBacklinks = filter !== "outgoing";

  return (
    <div className="flex flex-col gap-8">
      {/* Canonical identity + primary metadata */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {object.type ? (
            <span className="rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {object.type}
            </span>
          ) : null}
          {category ? (
            <span className="rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {category}
            </span>
          ) : null}
          {object.status ? <StatusBadge status={object.status} /> : null}
          {version ? (
            <span className="font-mono text-[11px] text-muted-foreground">{version}</span>
          ) : null}
        </div>

        <h2 className="text-2xl font-semibold text-foreground">{object.title}</h2>

        {object.description ? (
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {object.description}
          </p>
        ) : null}
      </section>

      {/* Relationships */}
      <section className="flex flex-col gap-6">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">Relationships</h2>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-muted-foreground">
              {relationshipCount ?? 0} total
            </span>
            <CreateRelationshipDialog sourceObjectId={object.id} sourceTitle={object.title} />
          </div>
        </header>
        <RelationshipsSummary summary={summary} />
        <RelationshipsFilter value={filter} onChange={setFilter} summary={summary} />
        {summary.total === 0 ? (
          <EmptyState
            title="No relationships"
            description="This object has no outgoing relationships or backlinks."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {showOutgoing ? (
              <RelationshipList
                title="Outgoing"
                relationships={outgoing}
                currentId={object.id}
                emptyLabel="No outgoing relationships"
              />
            ) : null}
            {showBacklinks ? (
              <RelationshipList
                title="Backlinks"
                relationships={incoming}
                currentId={object.id}
                emptyLabel="No backlinks"
              />
            ) : null}
          </div>
        )}
      </section>

      {/* Source metadata */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Source</h2>
        <dl className="rounded-md border border-border/60 bg-card/40 px-4 py-2">
          <MetaRow label="ID" value={object.id} mono />
          {path ? <MetaRow label="Path" value={path} mono /> : null}
          {graphView ? (
            <>
              {graphType ? <MetaRow label="Graph type" value={graphType} mono /> : null}
              {graphCategory ? <MetaRow label="Graph category" value={graphCategory} mono /> : null}
            </>
          ) : null}
        </dl>
      </section>

      {/* Tags & keywords */}
      {hasTags || hasKeywords ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">Tags &amp; keywords</h2>
          {hasTags ? <TagCloud label="Tags" items={object.tags} /> : null}
          {hasKeywords ? <TagCloud label="Keywords" items={keywords} /> : null}
        </section>
      ) : null}

      {/* Checksum — technical, de-emphasized */}
      {checksum ? (
        <section className="flex flex-col gap-1 border-t border-border/40 pt-4">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Checksum
          </span>
          <code className="min-w-0 break-all font-mono text-[11px] text-muted-foreground">
            {checksum}
          </code>
        </section>
      ) : null}
    </div>
  );
}

function TagCloud({ label, items }: { label: string; items: readonly string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((t) => (
          <li
            key={t}
            className="rounded border border-border/60 bg-card/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
          >
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface RelationshipsSummaryData {
  outgoingCount: number;
  backlinksCount: number;
  total: number;
  unresolved: number;
  droppedDuplicates: number;
}

function RelationshipsSummary({ summary }: { summary: RelationshipsSummaryData }) {
  return (
    <dl
      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground"
      aria-label="Relationships summary"
    >
      <SummaryChip label="Total" value={summary.total} />
      <SummaryChip label="Outgoing" value={summary.outgoingCount} />
      <SummaryChip label="Backlinks" value={summary.backlinksCount} />
      {summary.unresolved > 0 ? (
        <SummaryChip label="Unresolved" value={summary.unresolved} tone="warning" />
      ) : null}
      {summary.droppedDuplicates > 0 ? (
        <span className="text-[10px] italic text-muted-foreground">
          {summary.droppedDuplicates} duplicate{summary.droppedDuplicates === 1 ? "" : "s"} hidden
        </span>
      ) : null}
    </dl>
  );
}

function SummaryChip({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warning";
}) {
  const toneClass = tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="inline-flex items-baseline gap-1.5">
      <dt className="uppercase tracking-wide">{label}</dt>
      <dd className={`font-mono text-xs ${toneClass}`}>{value}</dd>
    </div>
  );
}

type RelationshipsFilterValue = "all" | "outgoing" | "backlinks";

function RelationshipsFilter({
  value,
  onChange,
  summary,
}: {
  value: RelationshipsFilterValue;
  onChange: (next: RelationshipsFilterValue) => void;
  summary: RelationshipsSummaryData;
}) {
  const options: { key: RelationshipsFilterValue; label: string; count: number }[] = [
    { key: "all", label: "All", count: summary.total },
    { key: "outgoing", label: "Outgoing", count: summary.outgoingCount },
    { key: "backlinks", label: "Backlinks", count: summary.backlinksCount },
  ];
  return (
    <div
      role="tablist"
      aria-label="Filter relationships"
      className="inline-flex flex-wrap gap-1 rounded-md border border-border/60 bg-card/40 p-1"
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`${opt.label}: ${opt.count}`}
            onClick={() => onChange(opt.key)}
            className={
              active
                ? "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium bg-accent/30 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                : "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            }
          >
            <span>{opt.label}</span>
            <span className="font-mono text-[10px] opacity-70">{opt.count}</span>
          </button>
        );
      })}
    </div>
  );
}
