import { createFileRoute } from "@tanstack/react-router";

// Public branding endpoint (RR-019/020). Returns only the participant-safe
// view: whether the institutional logo should be shown and, if so, a
// short-lived signed URL. No PII, no admin metadata.
export const Route = createFileRoute("/api/public/branding")({
  server: {
    handlers: {
      GET: async () => {
        const { getBrandingSettings } = await import("@/lib/server/branding-repo.server");
        const settings = await getBrandingSettings();
        return Response.json({
          logoVisible: settings.logoVisible,
          logoUrl: settings.logoVisible ? settings.logoUrl : null,
        });
      },
    },
  },
});