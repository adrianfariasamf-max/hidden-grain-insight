import { createFileRoute } from "@tanstack/react-router";

import { createExperimentSchema } from "@/lib/perception/schemas";

export const Route = createFileRoute("/api/experiments")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { requireResearcher } = await import("@/lib/server/auth-guard.server");
        const ctx = await requireResearcher(request);
        if (ctx instanceof Response) return ctx;
        const { listExperimentsFor } = await import(
          "@/lib/server/experiments-repo.server"
        );
        // Install OWNER / ADMIN see every experiment; researchers see only their own.
        const scope = ctx.roles.includes("owner") || ctx.roles.includes("admin")
          ? null
          : ctx.userId;
        return Response.json({ items: await listExperimentsFor(scope) });
      },
      POST: async ({ request }) => {
        const { requireResearcher } = await import("@/lib/server/auth-guard.server");
        const ctx = await requireResearcher(request);
        if (ctx instanceof Response) return ctx;
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
          const { createExperiment } = await import("@/lib/server/experiments-repo.server");
          const created = await createExperiment(parsed.data, ctx.userId);
          return Response.json(created, { status: 201 });
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 500 });
        }
      },
    },
  },
});
