import { createFileRoute } from "@tanstack/react-router";

// Returns the currently authenticated user plus their roles. Requires a
// valid Supabase bearer token; anonymous callers get HTTP 401.
export const Route = createFileRoute("/api/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authenticate } = await import("@/lib/server/auth-guard.server");
        const ctx = await authenticate(request);
        if (ctx instanceof Response) return ctx;
        return Response.json({
          userId: ctx.userId,
          email: ctx.email,
          roles: ctx.roles,
        });
      },
    },
  },
});