import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/experiments/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { getExperimentDetail } = await import(
          "@/lib/server/experiments-repo.server"
        );
        const detail = await getExperimentDetail(params.id);
        if (!detail) return Response.json({ error: "not_found" }, { status: 404 });
        return Response.json(detail);
      },
    },
  },
});