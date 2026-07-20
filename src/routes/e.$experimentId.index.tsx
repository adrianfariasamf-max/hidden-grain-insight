import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";

import { API_BASE } from "@/lib/api/client";
import { experimentsApi } from "@/lib/perception/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { PublicExperiment } from "@/lib/perception/types";
import { LoadingState } from "@/components/state/LoadingState";
import { ErrorState } from "@/components/state/ErrorState";
import { EmptyState } from "@/components/state/EmptyState";

// Public landing endpoint: same-origin fetch that returns only public-safe
// experiment fields. We reuse the existing detail endpoint but the
// participant view NEVER surfaces hiddenTarget in the UI.
const publicExperimentQuery = (id: string) =>
  queryOptions({
    queryKey: ["perception", "public-experiment", id],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${API_BASE}/public/experiments/${id}`, { signal });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as { experiment: PublicExperiment };
    },
  });

export const Route = createFileRoute("/e/$experimentId")({
  component: ParticipantLanding,
  head: () => ({
    meta: [{ title: "Estudio de percepción" }, { name: "robots", content: "noindex" }],
  }),
});

function ParticipantLanding() {
  const { experimentId } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery(publicExperimentQuery(experimentId));
  const [alias, setAlias] = useState("");
  const [consent, setConsent] = useState(false);

  const start = useMutation({
    mutationFn: async () => {
      const session = await experimentsApi.createSession(experimentId, {
        participantAlias: alias.trim() || null,
      });
      await experimentsApi.acceptConsent(session.publicToken);
      return session;
    },
    onSuccess: (session) => {
      navigate({
        to: "/e/$experimentId/s/$token",
        params: { experimentId, token: session.publicToken },
      });
    },
  });

  if (isLoading) return <LoadingState label="Cargando…" />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!data) return <EmptyState title="Experimento no disponible" />;

  const exp = data.experiment;
  const isOpen = exp.status === "published";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold text-foreground">{exp.title}</h1>
      {exp.description ? (
        <p className="mt-2 text-sm text-muted-foreground">{exp.description}</p>
      ) : null}

      {!isOpen ? (
        <p className="mt-6 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          Este experimento no está aceptando participantes en este momento.
        </p>
      ) : (
        <form
          className="mt-6 grid gap-5 rounded-lg border border-border bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!consent || start.isPending) return;
            start.mutate();
          }}
        >
          <section aria-labelledby="consent-heading" className="grid gap-2">
            <h2 id="consent-heading" className="text-sm font-semibold text-foreground">
              Antes de comenzar
            </h2>
            <p className="text-sm text-muted-foreground">
              Verás tres imágenes en secuencia y responderás algunas preguntas breves sobre cada
              una. Tus respuestas se registran de forma anónima y se usan sólo con fines de
              investigación. Puedes detenerte en cualquier momento cerrando esta página.
            </p>
          </section>

          <div className="grid gap-1.5">
            <Label htmlFor="alias">
              Alias <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="alias"
              value={alias}
              onChange={(ev) => setAlias(ev.target.value)}
              placeholder="Déjalo en blanco para permanecer anónimo"
              maxLength={64}
              autoComplete="off"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
              aria-label="Doy mi consentimiento para participar"
            />
            <span className="text-foreground">
              He leído la información anterior y doy mi consentimiento para participar.
            </span>
          </label>

          <Button type="submit" disabled={!consent || start.isPending} className="w-full">
            {start.isPending ? "Comenzando…" : "Comenzar"}
          </Button>

          {start.error ? (
            <p className="text-xs text-destructive">
              No pudimos iniciar tu sesión. {(start.error as Error).message}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
