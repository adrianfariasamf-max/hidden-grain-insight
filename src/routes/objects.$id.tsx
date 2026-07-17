import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/state/EmptyState";

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
  return (
    <AppShell>
      <PageHeader
        eyebrow="Object"
        title="Object detail"
        description={<span className="font-mono text-xs">id: {id}</span>}
      />
      <section className="px-8 py-6">
        <EmptyState
          title="Object detail not implemented yet"
          description="Metadata, relationships and resolution state land in Phase 3."
        />
      </section>
    </AppShell>
  );
}