import { createFileRoute } from "@tanstack/react-router";

import { getObject } from "@/lib/server/objects-repo.server";

export const Route = createFileRoute("/api/objects/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const detail = await getObject(params.id);
        if (!detail) return Response.json({ error: "not_found" }, { status: 404 });
        return Response.json(detail);
      },
    },
  },
});