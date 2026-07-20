import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/graph")({
  server: {
    handlers: {
      GET: async () => {
        const { getGraph } = await import("@/lib/server/relationships-repo.server");
        const g = await getGraph();
        return Response.json(g);
      },
    },
  },
});
