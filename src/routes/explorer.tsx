import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/state/EmptyState";

export const Route = createFileRoute("/explorer")({
  head: () => ({
    meta: [
      { title: "Explorer — Hidden Grain" },
      { name: "description", content: "Browse and search Knowledge Objects." },
    ],
  }),
  component: ExplorerRoute,
});

function ExplorerRoute() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Explorer"
        title="Knowledge Objects"
        description="Search, filter and paginate the read-only object index."
      />
      <section className="px-8 py-6">
        <EmptyState
          title="Explorer not implemented yet"
          description="Search, filters and pagination arrive in Phase 2. This route ships in Phase 1 only as part of the shell."
        />
      </section>
    </AppShell>
  );
}