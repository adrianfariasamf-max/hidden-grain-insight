import { createFileRoute } from "@tanstack/react-router";

import { createSessionSchema } from "@/lib/perception/schemas";

export const Route = createFileRoute("/api/experiments/$id/sessions")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        let raw: unknown = {};
        try {
          raw = await request.json();
        } catch {
          raw = {};
        }
        const parsed = createSessionSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "validation_failed", details: parsed.error.issues },
            { status: 422 },
          );
        }
        try {
          const { createSession } = await import("@/lib/server/experiments-repo.server");
          const created = await createSession(params.id, parsed.data);
          return Response.json(created, { status: 201 });
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 422 });
        }
      },
    },
  },
});
