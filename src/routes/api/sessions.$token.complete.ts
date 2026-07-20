import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/sessions/$token/complete")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        try {
          const { completeSession } = await import("@/lib/server/experiments-repo.server");
          return Response.json(await completeSession(params.token));
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 422 });
        }
      },
    },
  },
});
