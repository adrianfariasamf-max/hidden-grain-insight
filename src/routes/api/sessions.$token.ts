import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/sessions/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { getSessionByToken } = await import("@/lib/server/experiments-repo.server");
        const found = await getSessionByToken(params.token);
        if (!found) return Response.json({ error: "not_found" }, { status: 404 });
        return Response.json(found);
      },
    },
  },
});
