import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/objects/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { getObject } = await import("@/lib/server/objects-repo.server");
        const detail = await getObject(params.id);
        if (!detail) return Response.json({ error: "not_found" }, { status: 404 });
        return Response.json(detail);
      },
    },
  },
});