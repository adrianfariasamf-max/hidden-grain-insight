import { createFileRoute } from "@tanstack/react-router";

// Public participant-facing endpoint. NEVER exposes hiddenTarget.
export const Route = createFileRoute("/api/public/experiments/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { getExperimentDetail } = await import(
          "@/lib/server/experiments-repo.server"
        );
        const detail = await getExperimentDetail(params.id);
        if (!detail) return Response.json({ error: "not_found" }, { status: 404 });
        if (detail.experiment.status !== "published") {
          return Response.json({ error: "not_available" }, { status: 404 });
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hiddenTarget: _drop, ...safeExperiment } = detail.experiment;
        return Response.json({
          experiment: safeExperiment,
        });
      },
    },
  },
});