import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/experiments/$id/sessions")({
  server: {
    handlers: {
      // Admin-only: participant creation lives at /api/public/experiments/:id/sessions
      GET: async ({ params, request }) => {
        const { requireExperimentOwner } = await import("@/lib/server/auth-guard.server");
        const guard = await requireExperimentOwner(request, params.id);
        if (guard instanceof Response) return guard;
        try {
          const { listSessionsForExperiment } =
            await import("@/lib/server/experiments-repo.server");
          const items = await listSessionsForExperiment(params.id);
          return Response.json({ items });
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 422 });
        }
      },
    },
  },
});
