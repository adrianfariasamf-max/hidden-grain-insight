import { createFileRoute } from "@tanstack/react-router";

// Sign an upload URL for the institutional logo, then commit the resulting
// path back to branding_settings. Two POSTs keep this consistent with the
// experiment-stimuli flow: sign → PUT to storage → commit.
export const Route = createFileRoute("/api/branding/upload-url")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/server/auth-guard.server");
        const guard = await requireAdmin(request);
        if (guard instanceof Response) return guard;
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "invalid JSON" }, { status: 400 });
        }
        const body = (raw ?? {}) as { filename?: unknown; commitPath?: unknown };
        try {
          const repo = await import("@/lib/server/branding-repo.server");
          if (typeof body.commitPath === "string" && body.commitPath.length > 0) {
            return Response.json(await repo.commitBrandingLogo(body.commitPath));
          }
          if (typeof body.filename !== "string" || body.filename.length === 0) {
            return Response.json({ error: "filename required" }, { status: 422 });
          }
          return Response.json(await repo.signBrandingUpload(body.filename));
        } catch (err) {
          return Response.json({ error: (err as Error).message }, { status: 422 });
        }
      },
    },
  },
});