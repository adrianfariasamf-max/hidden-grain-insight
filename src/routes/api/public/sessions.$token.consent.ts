import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/sessions/$token/consent")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        try {
          const { acceptConsent } = await import("@/lib/server/experiments-repo.server");
          return Response.json(await acceptConsent(params.token));
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 422 });
        }
      },
    },
  },
});
