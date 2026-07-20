import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";

import { API_BASE } from "@/lib/api/client";
import { experimentsApi } from "@/lib/perception/client";
import { Button } from "@/components/ui/button";
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

// Demographic fields the investigator can eventually toggle per experiment.
// For now every field defined here is shown and required. The array shape is
// intentional so a future config can filter/reorder without refactor.
const AGE_RANGES = [
  { value: "under_18", label: "Menos de 18" },
  { value: "18-24", label: "18–24" },
  { value: "25-34", label: "25–34" },
  { value: "35-44", label: "35–44" },
  { value: "45-54", label: "45–54" },
  { value: "55-64", label: "55–64" },
  { value: "65_plus", label: "65+" },
] as const;

type AgeRange = (typeof AGE_RANGES)[number]["value"];

export const Route = createFileRoute("/e/$experimentId/")({
  component: ParticipantLanding,
  head: () => ({
    meta: [{ title: "Estudio de percepción" }, { name: "robots", content: "noindex" }],
  }),
});

function ParticipantLanding() {
  const { experimentId } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery(publicExperimentQuery(experimentId));
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [consent, setConsent] = useState(false);

  // Contamination shield (RR-005): sessions started with ?test=1 in the URL
  // or from an automated browser (Playwright/WebDriver) are tagged as test
  // sessions so real research data stays clean.
  const isTestSession = useMemo(() => {
    if (typeof window === "undefined") return false;
    const flagged = new URLSearchParams(window.location.search).get("test") === "1";
    const automated =
      typeof navigator !== "undefined" &&
      (navigator as Navigator & { webdriver?: boolean }).webdriver === true;
    return flagged || automated;
  }, []);

  const start = useMutation({
    mutationFn: async () => {
      const session = await experimentsApi.createSession(experimentId, {
        participantAlias: null,
        metadata: {
          demographics: { ageRange },
          ...(isTestSession ? { test: true, testSource: "url_or_webdriver" } : {}),
        },
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
            if (!consent || !ageRange || start.isPending) return;
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

          <fieldset
            className="grid gap-2"
            aria-describedby="demographics-hint"
            data-demographic-field="age_range"
          >
            <legend className="text-sm font-medium text-foreground">Edad</legend>
            <p id="demographics-hint" className="text-[11px] text-muted-foreground">
              Selecciona el rango que te corresponde.
            </p>
            <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {AGE_RANGES.map((r) => {
                const active = ageRange === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setAgeRange(r.value)}
                    className={`h-9 rounded-md border text-sm transition-colors ${
                      active
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

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

          {isTestSession ? (
            <p className="rounded border border-dashed border-border/70 bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">
              Esta sesión se guardará como <strong>Sesión de prueba</strong>.
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={!consent || !ageRange || start.isPending}
            className="w-full"
          >
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
