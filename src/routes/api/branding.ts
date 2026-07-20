import { createFileRoute } from "@tanstack/react-router";

// Investigator branding endpoint. Returns admin view (includes logoUrl even
// when hidden) and accepts visibility toggle / removal.
export const Route = createFileRoute("/api/branding")({
  server: {
    handlers: {
      GET: async () => {
        const { getBrandingSettingsAdmin } = await import(
          "@/lib/server/branding-repo.server"
        );
        return Response.json(await getBrandingSettingsAdmin());
      },
      PATCH: async ({ request }) => {
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
      DELETE: async () => {
        const { clearBrandingLogo } = await import(
          "@/lib/server/branding-repo.server"
        );
        return Response.json(await clearBrandingLogo());
      },
    },
  },
});