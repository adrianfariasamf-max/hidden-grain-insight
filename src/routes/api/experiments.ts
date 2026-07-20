import { createFileRoute } from "@tanstack/react-router";

import { createExperimentSchema } from "@/lib/perception/schemas";

export const Route = createFileRoute("/api/experiments")({
  server: {
    handlers: {
      GET: async () => {
        const { listExperiments } = await import(
          "@/lib/server/experiments-repo.server"
        );
        return Response.json({ items: await listExperiments() });
      },
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "invalid JSON" }, { status: 400 });
        }
        const parsed = createExperimentSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "validation_failed", details: parsed.error.issues },
            { status: 422 },
          );
        }
        try {
          const { createExperiment } = await import(
            "@/lib/server/experiments-repo.server"
          );
          const created = await createExperiment(parsed.data);
          return Response.json(created, { status: 201 });
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 500 });
        }
      },
    },
  },
});