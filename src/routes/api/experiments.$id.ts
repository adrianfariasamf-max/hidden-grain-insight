import { createFileRoute } from "@tanstack/react-router";

import { updateExperimentSchema } from "@/lib/perception/schemas";

export const Route = createFileRoute("/api/experiments/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { requireExperimentOwner } = await import("@/lib/server/auth-guard.server");
        const guard = await requireExperimentOwner(request, params.id);
        if (guard instanceof Response) return guard;
        const { getExperimentDetail } = await import("@/lib/server/experiments-repo.server");
        const detail = await getExperimentDetail(params.id);
        if (!detail) return Response.json({ error: "not_found" }, { status: 404 });
        return Response.json(detail);
      },
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
        const parsed = updateExperimentSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "validation_failed", details: parsed.error.issues },
            { status: 422 },
          );
        }
        try {
          const { updateExperiment } = await import("@/lib/server/experiments-repo.server");
          const updated = await updateExperiment(params.id, parsed.data);
          return Response.json(updated);
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 422 });
        }
      },
    },
  },
});
