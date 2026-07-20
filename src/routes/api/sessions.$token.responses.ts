import { createFileRoute } from "@tanstack/react-router";

import { submitResponseSchema } from "@/lib/perception/schemas";

export const Route = createFileRoute("/api/sessions/$token/responses")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "invalid JSON" }, { status: 400 });
        }
        const parsed = submitResponseSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "validation_failed", details: parsed.error.issues },
            { status: 422 },
          );
        }
        try {
          const { submitResponse } = await import("@/lib/server/experiments-repo.server");
          const created = await submitResponse(params.token, parsed.data);
          return Response.json(created, { status: 201 });
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 422 });
        }
      },
    },
  },
});
