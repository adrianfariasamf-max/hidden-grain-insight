import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Compass, FlaskConical, Network } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/state/LoadingState";
import { ErrorState } from "@/components/state/ErrorState";
import { RepositoryMetrics } from "@/components/system/RepositoryMetrics";
import { SystemHealthCard } from "@/components/system/SystemHealthCard";
import { ReadOnlyNotice } from "@/components/system/ReadOnlyNotice";
import { healthQuery } from "@/lib/api/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — Perception Studio" },
      {
        name: "description",
        content:
          "Perception Studio: design, publish and share perception experiments, and browse the knowledge repository.",
      },
    ],
  }),
  component: OverviewRoute,
});

function OverviewRoute() {
  const query = useQuery(healthQuery());
  const isInitialLoading = query.isPending && !query.data;
  const isRefreshing = query.isFetching && !query.isPending;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Perception Studio"
        description="Design perception experiments end to end and browse the Hidden Grain knowledge repository — all in one workspace."
      />
      <div className="flex flex-col gap-8 px-4 py-6 sm:px-8">
        {/* Hero / primary navigation */}
        <section
          aria-labelledby="hero-heading"
          className="flex flex-col gap-5 rounded-lg border border-border/60 bg-card px-5 py-6 sm:px-8 sm:py-8"
        >
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Perception Studio
            </span>
            <h2
              id="hero-heading"
              className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
            >
              Run perception experiments end to end
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Create an experiment, upload the three stimuli, publish it, and share the participant
              link — without leaving the studio. The Hidden Grain knowledge repository is available
              side by side for reference.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              to="/experiments"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            >
              <FlaskConical className="h-4 w-4" aria-hidden />
              Open Experiments
            </Link>
            <Link
              to="/explorer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/20 sm:w-auto"
            >
              <Compass className="h-4 w-4" aria-hidden />
              Browse Knowledge Repository
            </Link>
            <Link
              to="/graph"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/20 sm:w-auto"
            >
              <Network className="h-4 w-4" aria-hidden />
              Knowledge Graph
            </Link>
          </div>
        </section>

        {/* System status + repository metrics from /health */}
        <section aria-labelledby="status-heading" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="status-heading" className="text-sm font-semibold text-foreground">
              System status
            </h2>
            <Link
              to="/system"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              System details →
            </Link>
          </div>

          {isInitialLoading ? (
            <LoadingState label="Loading system status…" />
          ) : query.isError && !query.data ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : query.data ? (
            <div className="flex flex-col gap-4">
              <SystemHealthCard health={query.data} isRefreshing={isRefreshing} />
              <RepositoryMetrics health={query.data} includeSchema />
            </div>
          ) : null}
        </section>

        <ReadOnlyNotice />
      </div>
    </>
  );
}
