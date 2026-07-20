import { createFileRoute } from "@tanstack/react-router";

import { getGraph } from "@/lib/server/relationships-repo.server";

export const Route = createFileRoute("/api/graph")({
  server: {
    handlers: {
      GET: async () => {
        const g = await getGraph();
        return Response.json(g);
      },
    },
  },
});