import { createFileRoute, Outlet } from "@tanstack/react-router";

import { EmptyState } from "@/components/state/EmptyState";
import { ErrorState } from "@/components/state/ErrorState";

export const Route = createFileRoute("/experiments")({
  component: ExperimentsLayout,
  head: () => ({
    meta: [
      { title: "Experimentos — Perception Studio" },
      {
        name: "description",
        content: "Diseña, ejecuta y analiza estudios de percepción en Perception Studio.",
      },
    ],
  }),
  errorComponent: ({ error, reset }) => <ErrorState error={error} onRetry={reset} />,
  notFoundComponent: () => <EmptyState title="No encontrado" />,
});

function ExperimentsLayout() {
  return <Outlet />;
}
