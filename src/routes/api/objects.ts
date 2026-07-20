import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { createObject, listObjects } from "@/lib/server/objects-repo.server";

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.string().min(1),
  category: z.string().min(1),
  status: z.string().min(1),
  summary: z.string().max(2000).optional(),
  keywords: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const Route = createFileRoute("/api/objects")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const p = url.searchParams;
        const result = await listObjects({
          q: p.get("q") ?? undefined,
          type: p.get("type") ?? undefined,
          category: p.get("category") ?? undefined,
          status: p.get("status") ?? undefined,
          tag: p.get("tag") ?? undefined,
          offset: p.get("offset") ? Number(p.get("offset")) : undefined,
          limit: p.get("limit") ? Number(p.get("limit")) : undefined,
        });
        return Response.json(result);
      },
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
          const created = await createObject(parsed.data);
          return Response.json(created, { status: 201 });
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 500 });
        }
      },
    },
  },
});