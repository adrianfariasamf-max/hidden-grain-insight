import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/state/EmptyState";

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
  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Health & metrics"
        description="Live API health, read-only guarantee and index metrics."
      />
      <section className="px-4 py-6 sm:px-8">
        <EmptyState
          title="System panel not implemented yet"
          description="Live health polling and index metrics land in Phase 5."
        />
      </section>
    </>
  );
}