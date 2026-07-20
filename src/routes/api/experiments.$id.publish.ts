import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/experiments/$id/publish")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        try {
          const { publishExperiment } = await import("@/lib/server/experiments-repo.server");
          const updated = await publishExperiment(params.id);
          return Response.json(updated);
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 422 });
        }
      },
    },
  },
});
