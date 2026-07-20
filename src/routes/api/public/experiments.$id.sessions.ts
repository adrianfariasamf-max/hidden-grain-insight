import { createFileRoute } from "@tanstack/react-router";

import { createSessionSchema } from "@/lib/perception/schemas";

// Public participant endpoint: create a new session on a PUBLISHED experiment.
// Never returns hiddenTarget. Rejects drafts and closed experiments.
export const Route = createFileRoute("/api/public/experiments/$id/sessions")({
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
          const { getExperimentDetail, createSession } = await import(
            "@/lib/server/experiments-repo.server"
          );
          const detail = await getExperimentDetail(params.id);
          if (!detail) return Response.json({ error: "not_found" }, { status: 404 });
          if (detail.experiment.status !== "published") {
            return Response.json({ error: "not_accepting_sessions" }, { status: 409 });
          }
          const created = await createSession(params.id, parsed.data);
          return Response.json(created, { status: 201 });
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 422 });
        }
      },
    },
  },
});