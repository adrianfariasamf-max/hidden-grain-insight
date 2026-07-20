import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/experiments/$id/results")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { getExperimentResults } = await import("@/lib/server/experiments-repo.server");
        const results = await getExperimentResults(params.id);
        if (!results) return Response.json({ error: "not_found" }, { status: 404 });
        return Response.json(results);
      },
    },
  },
});
