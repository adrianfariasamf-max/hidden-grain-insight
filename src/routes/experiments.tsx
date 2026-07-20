import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/state/EmptyState";
import { ErrorState } from "@/components/state/ErrorState";
import { LoadingState } from "@/components/state/LoadingState";
import { experimentListQuery } from "@/lib/perception/client";

export const Route = createFileRoute("/experiments")({
  component: ExperimentsPage,
  head: () => ({
    meta: [
      { title: "Experiments — Hidden Grain" },
      {
        name: "description",
        content:
          "Design, run and analyse perception experiments in Hidden Grain.",
      },
    ],
  }),
  errorComponent: ({ error, reset }) => (
    <ErrorState message={error.message} onRetry={reset} />
  ),
  notFoundComponent: () => <EmptyState title="Not found" />,
});

function ExperimentsPage() {
  const { data, isLoading, error, refetch } = useQuery(experimentListQuery());

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <PageHeader
        title="Experiments"
        description="Perception studies powered by Hidden Grain."
      />
      <div className="mt-6">
        {isLoading ? (
          <LoadingState label="Loading experiments…" />
        ) : error ? (
          <ErrorState
            message={(error as Error).message}
            onRetry={() => refetch()}
          />
        ) : !data?.items.length ? (
          <EmptyState
            title="No experiments yet"
            description="Create the first perception experiment to begin."
          />
        ) : (
          <ul className="grid gap-3">
            {data.items.map((e) => {
              const missing = Math.max(0, 3 - e.stimulusCount);
              return (
                <li key={e.id}>
                  <Link
                    to="/experiments/$id"
                    params={{ id: e.id }}
                    className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-base font-semibold text-foreground">
                        {e.title}
                      </h2>
                      <StatusPill status={e.status} />
                    </div>
                    {e.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {e.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-4 font-mono text-[11px] text-muted-foreground">
                      <span>hidden: {e.hiddenTarget}</span>
                      <span>
                        stimuli: {e.stimulusCount}/3
                        {missing > 0 ? ` (missing ${missing})` : ""}
                      </span>
                      <span>sessions: {e.sessionCount}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    published: "bg-primary/15 text-primary",
    closed: "bg-secondary text-secondary-foreground",
  };
  return (
    <span
      className={`rounded px-2 py-0.5 font-mono text-[11px] ${tone[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status}
    </span>
  );
}