import { createFileRoute } from "@tanstack/react-router";

import { updateStimulusSchema } from "@/lib/perception/schemas";

export const Route = createFileRoute("/api/experiments/$id/stimuli/$stimulusId")({
  server: {
    handlers: {
      PATCH: async ({ params, request }) => {
        const { requireExperimentOwner } = await import("@/lib/server/auth-guard.server");
        const guard = await requireExperimentOwner(request, params.id);
        if (guard instanceof Response) return guard;
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "invalid JSON" }, { status: 400 });
        }
        const parsed = updateStimulusSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "validation_failed", details: parsed.error.issues },
            { status: 422 },
          );
        }
        try {
          const { updateStimulus } = await import("@/lib/server/experiments-repo.server");
          const updated = await updateStimulus(params.id, params.stimulusId, parsed.data);
          return Response.json(updated);
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 422 });
        }
      },
      DELETE: async ({ params, request }) => {
        const { requireExperimentOwner } = await import("@/lib/server/auth-guard.server");
        const guard = await requireExperimentOwner(request, params.id);
        if (guard instanceof Response) return guard;
        try {
          const { deleteStimulus } = await import("@/lib/server/experiments-repo.server");
          const out = await deleteStimulus(params.id, params.stimulusId);
          return Response.json(out);
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 422 });
        }
      },
    },
  },
});
