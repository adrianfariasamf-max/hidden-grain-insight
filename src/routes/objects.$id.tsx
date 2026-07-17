import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { RelationshipList } from "@/components/objects/RelationshipList";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/state/EmptyState";
import { ErrorState } from "@/components/state/ErrorState";
import { LoadingState } from "@/components/state/LoadingState";
import { ApiNotFoundError } from "@/lib/api/errors";
import { objectDetailQuery } from "@/lib/api/queries";
import type { ObjectDetailResponse } from "@/lib/api/types";

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
  const query = useQuery(objectDetailQuery(id));

  return (
    <>
      <PageHeader
        eyebrow="Object"
        title={query.data?.object.title ?? "Object detail"}
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
        {query.isLoading ? (
          <LoadingState label="Loading object…" />
        ) : query.error instanceof ApiNotFoundError ? (
          <NotFoundView id={id} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : query.data ? (
          <ObjectDetailBody data={query.data} />
        ) : null}
      </section>
    </>
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

function ObjectDetailBody({ data }: { data: ObjectDetailResponse }) {
  const { object, node, relationships } = data;
  const hasTags = object.tags && object.tags.length > 0;
  const hasKeywords = object.keywords && object.keywords.length > 0;

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
          {object.category ? (
            <span className="rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {object.category}
            </span>
          ) : null}
          {object.status ? <StatusBadge status={object.status} /> : null}
          {object.version ? (
            <span className="font-mono text-[11px] text-muted-foreground">v{object.version}</span>
          ) : null}
        </div>

        <h2 className="text-2xl font-semibold text-foreground">{object.title}</h2>

        {object.summary ? (
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {object.summary}
          </p>
        ) : null}
      </section>

      {/* Relationships */}
      <section className="flex flex-col gap-6">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">Relationships</h2>
          <span className="font-mono text-[11px] text-muted-foreground">
            {object.relationshipCount} total
          </span>
        </header>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RelationshipList
            title="Outgoing"
            direction="outgoing"
            edges={relationships.outgoing}
            currentId={object.id}
            emptyLabel="No outgoing relationships"
          />
          <RelationshipList
            title="Incoming"
            direction="incoming"
            edges={relationships.incoming}
            currentId={object.id}
            emptyLabel="No incoming relationships"
          />
        </div>
      </section>

      {/* Source metadata */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Source</h2>
        <dl className="rounded-md border border-border/60 bg-card/40 px-4 py-2">
          <MetaRow label="ID" value={object.id} mono />
          {object.path ? <MetaRow label="Path" value={object.path} mono /> : null}
          {node ? (
            <>
              <MetaRow label="Graph type" value={node.type} mono />
              <MetaRow label="Graph category" value={node.category} mono />
            </>
          ) : null}
        </dl>
      </section>

      {/* Tags & keywords */}
      {(hasTags || hasKeywords) ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">Tags &amp; keywords</h2>
          {hasTags ? (
            <TagCloud label="Tags" items={object.tags} />
          ) : null}
          {hasKeywords ? (
            <TagCloud label="Keywords" items={object.keywords} />
          ) : null}
        </section>
      ) : null}

      {/* Checksum — technical, de-emphasized */}
      {object.checksum ? (
        <section className="flex flex-col gap-1 border-t border-border/40 pt-4">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Checksum
          </span>
          <code className="min-w-0 break-all font-mono text-[11px] text-muted-foreground">
            {object.checksum}
          </code>
        </section>
      ) : null}
    </div>
  );
}

function TagCloud({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
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