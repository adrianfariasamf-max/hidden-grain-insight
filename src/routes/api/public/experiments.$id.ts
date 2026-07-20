import { createFileRoute } from "@tanstack/react-router";

// Public participant-facing endpoint. NEVER exposes hiddenTarget.
export const Route = createFileRoute("/api/public/experiments/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { getExperimentDetail } = await import("@/lib/server/experiments-repo.server");
        const detail = await getExperimentDetail(params.id);
        if (!detail) return Response.json({ error: "not_found" }, { status: 404 });
        // RR-011/RR-012 · `closed` is a valid public state — the landing
        // must show a "study has ended" screen instead of a generic 404.
        // `draft` is never exposed publicly.
        if (detail.experiment.status === "draft") {
          return Response.json({ error: "not_available" }, { status: 404 });
        }

        const { hiddenTarget: _drop, ...safeExperiment } = detail.experiment;
        return Response.json({
          experiment: safeExperiment,
          // Stimuli are needed by the participant landing to preload the
          // first image BEFORE the session is created (RR-006). URLs are
          // short-lived signed reads; imagePath/imageUrl are safe to expose.
          stimuli: detail.stimuli,
        });
      },
    },
  },
});
