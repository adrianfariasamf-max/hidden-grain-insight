import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/experiments/$id/results")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { requireExperimentOwner } = await import("@/lib/server/auth-guard.server");
        const guard = await requireExperimentOwner(request, params.id);
        if (guard instanceof Response) return guard;
        const { getExperimentResults } = await import("@/lib/server/experiments-repo.server");
        const results = await getExperimentResults(params.id);
        if (!results) return Response.json({ error: "not_found" }, { status: 404 });
        return Response.json(results);
      },
    },
  },
});
