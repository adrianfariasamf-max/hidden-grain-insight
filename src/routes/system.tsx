import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/state/LoadingState";
import { ErrorState } from "@/components/state/ErrorState";
import { SafeTimestamp } from "@/components/shared/SafeTimestamp";
import { SystemStatusCard } from "@/components/system/SystemHealthCard";
import { RuntimeInfo } from "@/components/system/RuntimeInfo";
import { RepositoryMetrics } from "@/components/system/RepositoryMetrics";
import { ReadOnlyNotice } from "@/components/system/ReadOnlyNotice";
import { healthQuery } from "@/lib/api/queries";

export const Route = createFileRoute("/system")({
  head: () => ({
    meta: [
      { title: "System — Hidden Grain" },
      { name: "description", content: "Estado en vivo, métricas y modo de solo lectura." },
    ],
  }),
  component: SystemRoute,
});

function SystemRoute() {
  // Estado polling is scoped to the Sistema route. Inicio and other routes
  // read the same query key from cache without triggering their own polling.
  const query = useQuery({ ...healthQuery(), refetchInterval: 30_000 });
  const isInitialLoading = query.isPending && !query.data;
  const isRefreshing = query.isFetching && !query.isPending;
  const hasStaleAfterError = query.isError && Boolean(query.data);

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Estado y métricas"
        description="Estado en vivo de la API, información de ejecución y contadores del repositorio. Se actualiza automáticamente cada 30 segundos."
      />
      <div className="flex flex-col gap-8 px-4 py-6 sm:px-8">
        {isInitialLoading ? (
          <LoadingState label="Cargando estado del sistema…" />
        ) : query.isError && !query.data ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : query.data ? (
          <>
            {hasStaleAfterError ? (
              <div
                role="status"
                className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning"
              >
                Mostrando el último estado conocido — falló la actualización. Reintentando
                automáticamente.
              </div>
            ) : null}
            <section aria-labelledby="health-heading" className="flex flex-col gap-3">
              <h2 id="health-heading" className="text-sm font-semibold text-foreground">
                Estado
              </h2>
              <SystemStatusCard health={query.data} isRefreshing={isRefreshing} />
            </section>

            <section aria-labelledby="runtime-heading" className="flex flex-col gap-3">
              <h2 id="runtime-heading" className="text-sm font-semibold text-foreground">
                Ejecución
              </h2>
              <RuntimeInfo health={query.data} />
            </section>

            <section aria-labelledby="projection-heading" className="flex flex-col gap-3">
              <h2 id="projection-heading" className="text-sm font-semibold text-foreground">
                Proyección
              </h2>
              <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-card px-4 py-4">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Generado a las
                </span>
                <span className="font-mono text-sm text-foreground break-all">
                  <SafeTimestamp value={query.data.generatedAt} />
                </span>
                <p className="pt-1 text-xs text-muted-foreground">
                  Marca de tiempo de la proyección que sirve la API actualmente.
                </p>
              </div>
            </section>

            <section aria-labelledby="repo-heading" className="flex flex-col gap-3">
              <h2 id="repo-heading" className="text-sm font-semibold text-foreground">
                Contadores del repositorio
              </h2>
              <RepositoryMetrics health={query.data} />
            </section>
          </>
        ) : null}

        <section aria-labelledby="boundaries-heading" className="flex flex-col gap-3">
          <h2 id="boundaries-heading" className="text-sm font-semibold text-foreground">
            Límites arquitectónicos
          </h2>
          <ReadOnlyNotice />
        </section>
      </div>
    </>
  );
}
