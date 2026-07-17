import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/state/EmptyState";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — Hidden Grain" },
      {
        name: "description",
        content: "Read-only knowledge OS: browse objects, relationships and system health.",
      },
    ],
  }),
  component: OverviewRoute,
});

function OverviewRoute() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Overview"
        title="Hidden Grain"
        description="Read-only knowledge OS. Objects, relationships and system state flow from the API — nothing is authored in the UI."
      />
      <section className="px-8 py-6">
        <EmptyState
          title="Overview widgets land in Phase 5"
          description="Phase 1 ships the shell only: routes, navigation, design tokens, typed API client and shared state components."
        />
      </section>
    </AppShell>
  );
}
