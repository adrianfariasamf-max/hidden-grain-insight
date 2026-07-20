import { createFileRoute } from "@tanstack/react-router";

import { createStimulusSchema } from "@/lib/perception/schemas";

export const Route = createFileRoute("/api/experiments/$id/stimuli")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const { requireExperimentOwner } = await import("@/lib/server/auth-guard.server");
        const guard = await requireExperimentOwner(request, params.id);
        if (guard instanceof Response) return guard;
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "invalid JSON" }, { status: 400 });
        }
        const parsed = createStimulusSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "validation_failed", details: parsed.error.issues },
            { status: 422 },
          );
        }
        try {
          const { addStimulus } = await import("@/lib/server/experiments-repo.server");
          const created = await addStimulus(params.id, parsed.data);
          return Response.json(created, { status: 201 });
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 422 });
        }
      },
    },
  },
});
