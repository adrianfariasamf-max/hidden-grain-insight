import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const { SCHEMA_VERSION, SERVICE_NAME, supabaseAdmin } =
          await import("@/lib/server/db.server");
        try {
          const [{ count: objects }, { count: edges }] = await Promise.all([
            supabaseAdmin.from("knowledge_objects").select("id", { count: "exact", head: true }),
            supabaseAdmin.from("relationships").select("id", { count: "exact", head: true }),
          ]);
          const body = {
            status: "ok",
            service: SERVICE_NAME,
            schemaVersion: SCHEMA_VERSION,
            objects: objects ?? 0,
            nodes: objects ?? 0,
            edges: edges ?? 0,
            generatedAt: new Date().toISOString(),
          };
          return Response.json(body);
        } catch (err) {
          return Response.json(
            { status: "error", message: (err as Error).message },
            { status: 500 },
          );
        }
      },
    },
  },
});
