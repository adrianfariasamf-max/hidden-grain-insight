import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/state/LoadingState";
import { ErrorState } from "@/components/state/ErrorState";
import { SafeTimestamp } from "@/components/shared/SafeTimestamp";
import { SystemHealthCard } from "@/components/system/SystemHealthCard";
import { RuntimeInfo } from "@/components/system/RuntimeInfo";
import { RepositoryMetrics } from "@/components/system/RepositoryMetrics";
import { ReadOnlyNotice } from "@/components/system/ReadOnlyNotice";
import { healthQuery } from "@/lib/api/queries";

export const Route = createFileRoute("/system")({
  head: () => ({
    meta: [
      { title: "System — Hidden Grain" },
      { name: "description", content: "Live health, metrics and read-only status." },
    ],
  }),
  component: SystemRoute,
});

function SystemRoute() {
  const query = useQuery(healthQuery());
  const isInitialLoading = query.isPending && !query.data;
  const isRefreshing = query.isFetching && !query.isPending;
  const hasStaleAfterError = query.isError && Boolean(query.data);

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Health & metrics"
        description="Live API health, runtime information and repository counters. Refreshes automatically every 15 seconds."
      />
      <div className="flex flex-col gap-8 px-4 py-6 sm:px-8">
        {isInitialLoading ? (
          <LoadingState label="Loading system health…" />
        ) : query.isError && !query.data ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : query.data ? (
          <>
            {hasStaleAfterError ? (
              <div
                role="status"
                className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning"
              >
                Showing last known health — refresh failed. Retrying automatically.
              </div>
            ) : null}
            <section aria-labelledby="health-heading" className="flex flex-col gap-3">
              <h2 id="health-heading" className="text-sm font-semibold text-foreground">
                Health
              </h2>
              <SystemHealthCard health={query.data} isRefreshing={isRefreshing} />
            </section>

            <section aria-labelledby="runtime-heading" className="flex flex-col gap-3">
              <h2 id="runtime-heading" className="text-sm font-semibold text-foreground">
                Runtime
              </h2>
              <RuntimeInfo health={query.data} />
            </section>

            <section aria-labelledby="projection-heading" className="flex flex-col gap-3">
              <h2 id="projection-heading" className="text-sm font-semibold text-foreground">
                Projection
              </h2>
              <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-card px-4 py-4">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Generated at
                </span>
                <span className="font-mono text-sm text-foreground break-all">
                  <SafeTimestamp value={query.data.generatedAt} />
                </span>
                <p className="pt-1 text-xs text-muted-foreground">
                  Timestamp of the projection currently served by the API.
                </p>
              </div>
            </section>

            <section aria-labelledby="repo-heading" className="flex flex-col gap-3">
              <h2 id="repo-heading" className="text-sm font-semibold text-foreground">
                Repository counters
              </h2>
              <RepositoryMetrics health={query.data} />
            </section>
          </>
        ) : null}

        <section aria-labelledby="boundaries-heading" className="flex flex-col gap-3">
          <h2 id="boundaries-heading" className="text-sm font-semibold text-foreground">
            Architectural boundaries
          </h2>
          <ReadOnlyNotice />
        </section>
      </div>
    </>
  );
}
