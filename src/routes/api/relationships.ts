import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CreateSchema = z.object({
  sourceObjectId: z.string().uuid(),
  targetObjectId: z.string().uuid(),
  type: z.string().min(1),
  description: z.string().optional(),
  provenance: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const Route = createFileRoute("/api/relationships")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "invalid JSON" }, { status: 400 });
        }
        const parsed = CreateSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "validation_failed", details: parsed.error.issues },
            { status: 422 },
          );
        }
        try {
          const { createRelationship } = await import("@/lib/server/relationships-repo.server");
          const created = await createRelationship(parsed.data);
          return Response.json(created, { status: 201 });
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 500 });
        }
      },
    },
  },
});
