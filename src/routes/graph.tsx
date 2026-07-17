import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/state/EmptyState";

export const Route = createFileRoute("/graph")({
  head: () => ({
    meta: [
      { title: "Graph — Hidden Grain" },
      { name: "description", content: "Relationship graph across Knowledge Objects." },
    ],
  }),
  component: GraphRoute,
});

function GraphRoute() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Graph"
        title="Relationship graph"
        description="Structured view of nodes, edges and resolution metrics."
      />
      <section className="px-8 py-6">
        <EmptyState
          title="Graph not implemented yet"
          description="Metrics and the structured view land in Phase 4."
        />
      </section>
    </AppShell>
  );
}