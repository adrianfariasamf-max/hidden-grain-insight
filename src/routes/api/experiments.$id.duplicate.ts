import { createFileRoute } from "@tanstack/react-router";

// RR-014 · Duplicate an experiment into a new draft. Returns the new record.
export const Route = createFileRoute("/api/experiments/$id/duplicate")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const { requireExperimentOwner } = await import("@/lib/server/auth-guard.server");
        const guard = await requireExperimentOwner(request, params.id);
        if (guard instanceof Response) return guard;
        try {
          const { duplicateExperiment } = await import("@/lib/server/experiments-repo.server");
          const created = await duplicateExperiment(params.id, guard.userId);
          return Response.json(created, { status: 201 });
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 422 });
        }
      },
    },
  },
});