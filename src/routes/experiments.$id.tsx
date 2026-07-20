import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/state/EmptyState";
import { ErrorState } from "@/components/state/ErrorState";
import { LoadingState } from "@/components/state/LoadingState";
import {
  experimentDetailQuery,
  experimentKeys,
  experimentsApi,
} from "@/lib/perception/client";

export const Route = createFileRoute("/experiments/$id")({
  component: ExperimentDetailPage,
  head: () => ({
    meta: [
      { title: "Experiment — Hidden Grain" },
      { name: "description", content: "Perception experiment configuration." },
    ],
  }),
  errorComponent: ({ error, reset }) => (
    <ErrorState message={error.message} onRetry={reset} />
  ),
  notFoundComponent: () => <EmptyState title="Experiment not found" />,
});

function ExperimentDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(
    experimentDetailQuery(id),
  );

  const publish = useMutation({
    mutationFn: () => experimentsApi.publish(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: experimentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: experimentKeys.list() });
    },
  });

  if (isLoading) return <LoadingState label="Loading experiment…" />;
  if (error)
    return (
      <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
    );
  if (!data) return <EmptyState title="Experiment not found" />;

  const { experiment: e, stimuli, sessionCount, responseCount, publishReadiness } = data;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-4">
        <Link
          to="/experiments"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← All experiments
        </Link>
      </div>
      <PageHeader title={e.title} description={e.description} />

      <section className="mt-6 grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
        <Field label="Status" value={e.status} />
        <Field label="Hidden target" value={e.hiddenTarget} mono />
        <Field label="Stimuli" value={`${stimuli.length} / 3`} />
        <Field label="Sessions" value={String(sessionCount)} />
        <Field label="Responses" value={String(responseCount)} />
        <Field
          label="Publish ready"
          value={publishReadiness.ready ? "yes" : "no"}
        />
      </section>

      {e.instructions ? (
        <section className="mt-4 rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Instructions</h3>
          <p className="mt-1 text-sm text-muted-foreground">{e.instructions}</p>
        </section>
      ) : null}

      <section className="mt-4 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Stimuli</h3>
        {stimuli.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No stimuli attached yet. The MVP requires exactly 3 images.
          </p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {stimuli.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded border border-border/60 p-2 text-sm"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  #{s.position}
                </span>
                <span className="flex-1 truncate">{s.altText || s.imagePath}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Publish readiness</h3>
        {publishReadiness.ready ? (
          <p className="mt-2 text-sm text-primary">
            Experiment is ready to publish.
          </p>
        ) : (
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            {publishReadiness.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        {e.status === "draft" ? (
          <button
            type="button"
            disabled={!publishReadiness.ready || publish.isPending}
            onClick={() => publish.mutate()}
            className="mt-3 inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {publish.isPending ? "Publishing…" : "Publish experiment"}
          </button>
        ) : null}
        {publish.error ? (
          <p className="mt-2 text-xs text-destructive">
            {(publish.error as Error).message}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`mt-0.5 text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}