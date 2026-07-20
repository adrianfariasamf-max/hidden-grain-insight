import { createFileRoute } from "@tanstack/react-router";

// RR-011 · Close a published experiment. No body.
export const Route = createFileRoute("/api/experiments/$id/close")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        try {
          const { closeExperiment } = await import("@/lib/server/experiments-repo.server");
          const experiment = await closeExperiment(params.id);
          return Response.json(experiment);
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 422 });
        }
      },
    },
  },
});