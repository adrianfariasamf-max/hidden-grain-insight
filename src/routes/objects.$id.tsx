import { createFileRoute } from "@tanstack/react-router";

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
    <>
      <PageHeader
        eyebrow="Object"
        title="Object detail"
        description={<span className="font-mono text-xs">id: {id}</span>}
      />
      <section className="px-4 py-6 sm:px-8">
        <EmptyState
          title="Object detail not implemented yet"
          description="Metadata, relationships and resolution state land in Phase 3."
        />
      </section>
    </>
  );
}