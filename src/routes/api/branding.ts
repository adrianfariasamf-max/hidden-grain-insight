import { createFileRoute } from "@tanstack/react-router";

// Investigator branding endpoint. Returns admin view (includes logoUrl even
// when hidden) and accepts visibility toggle / removal.
export const Route = createFileRoute("/api/branding")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/server/auth-guard.server");
        const guard = await requireAdmin(request);
        if (guard instanceof Response) return guard;
        const { getBrandingSettingsAdmin } = await import(
          "@/lib/server/branding-repo.server"
        );
        return Response.json(await getBrandingSettingsAdmin());
      },
      PATCH: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/server/auth-guard.server");
        const guard = await requireAdmin(request);
        if (guard instanceof Response) return guard;
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "invalid JSON" }, { status: 400 });
        }
        const body = (raw ?? {}) as { logoVisible?: unknown };
        if (typeof body.logoVisible !== "boolean") {
          return Response.json(
            { error: "logoVisible must be a boolean" },
            { status: 422 },
          );
        }
        const { setBrandingVisibility } = await import(
          "@/lib/server/branding-repo.server"
        );
        return Response.json(await setBrandingVisibility(body.logoVisible));
      },
      DELETE: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/server/auth-guard.server");
        const guard = await requireAdmin(request);
        if (guard instanceof Response) return guard;
        const { clearBrandingLogo } = await import(
          "@/lib/server/branding-repo.server"
        );
        return Response.json(await clearBrandingLogo());
      },
    },
  },
});