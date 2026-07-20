import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";

import { API_BASE } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ExperimentStimulus, PublicExperiment } from "@/lib/perception/types";
import { experimentDetailQuery } from "@/lib/perception/client";
import { PreviewBanner, usePreviewMode } from "@/components/experiments/PreviewBanner";
import { BrandingLogo } from "@/components/branding/BrandingLogo";
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
      return (await res.json()) as {
        experiment: PublicExperiment;
        stimuli: ExperimentStimulus[];
      };
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
  const preview = usePreviewMode();
  // In preview mode the investigator can iterate on drafts too, so we hit
  // the internal detail endpoint (which returns stimuli + full experiment).
  // hiddenTarget is never rendered by this UI.
  const publicQ = useQuery({ ...publicExperimentQuery(experimentId), enabled: !preview });
  const previewQ = useQuery({
    ...experimentDetailQuery(experimentId),
    enabled: preview,
  });
  const isLoading = preview ? previewQ.isLoading : publicQ.isLoading;
  const error = preview ? previewQ.error : publicQ.error;
  const refetch = preview ? previewQ.refetch : publicQ.refetch;
  const data = preview
    ? previewQ.data
      ? { experiment: previewQ.data.experiment, stimuli: previewQ.data.stimuli }
      : null
    : publicQ.data;
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [consent, setConsent] = useState(false);
  // RR-006 · Session lifecycle:
  //   form → instructions → preloading (first image) → session created + navigate.
  // A participant only exists once the first stimulus has been fetched by the
  // browser. This eliminates the "0-response" ghost participants that appear
  // when someone opens a link or just clicks the consent button.
  const [stage, setStage] = useState<"form" | "preloading">("form");
  const [preloadError, setPreloadError] = useState<string | null>(null);

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
      // Preview mode: no server writes, no session row, no responses.
      if (preview) {
        return { publicToken: "preview" } as const;
      }
      // RR-016 · El participante nace al visualizar correctamente el
      // primer estímulo. Persistimos la sesión con `keepalive` para que la
      // petición llegue al servidor aunque el participante cierre la
      // pestaña inmediatamente después de cargar la imagen. La aceptación
      // de consentimiento también viaja con keepalive; si algo falla, la
      // sesión ya existe y quedará clasificada como ABANDONADA.
      const body = {
        participantAlias: null,
        metadata: {
          demographics: { ageRange },
          ...(isTestSession ? { test: true, testSource: "url_or_webdriver" } : {}),
        },
      };
      const res = await fetch(`${API_BASE}/public/experiments/${experimentId}/sessions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const session = (await res.json()) as { publicToken: string };
      // Consent acceptance is best-effort; the session row already exists.
      try {
        await fetch(`${API_BASE}/public/sessions/${session.publicToken}/consent`, {
          method: "POST",
          keepalive: true,
        });
      } catch {
        // Non-blocking.
      }
      return session;
    },
    onSuccess: (session) => {
      navigate({
        to: "/e/$experimentId/s/$token",
        params: { experimentId, token: session.publicToken },
        search: preview ? { preview: 1 } : undefined,
      });
    },
    onError: (err) => setPreloadError((err as Error).message),
  });

  if (isLoading) return <LoadingState label="Cargando…" />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!data) return <EmptyState title="Experimento no disponible" />;

  const exp = data.experiment;
  // In preview mode the investigator sees the flow regardless of status.
  const isOpen = preview || exp.status === "published";
  const isClosed = exp.status === "closed";
  const firstStimulus = [...(data.stimuli ?? [])].sort((a, b) => a.position - b.position)[0];

  if (isOpen && stage === "preloading") {
    return (
      <>
      <PreviewBanner active={preview} />
      <PreloadingStage
        stimulus={firstStimulus}
        error={preloadError}
        onReady={() => {
          if (start.isPending || start.isSuccess) return;
          start.mutate();
        }}
        onFail={(msg) => setPreloadError(msg)}
        onCancel={() => {
          setStage("form");
          setPreloadError(null);
        }}
      />
      </>
    );
  }

  return (
    <>
    <PreviewBanner active={preview} />
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:gap-6">
        <h1 className="min-w-0 truncate text-xl font-semibold text-foreground sm:text-2xl">{exp.title}</h1>
        <BrandingLogo className="flex shrink-0 items-center" size="lg" />
      </div>
      {exp.description ? (
        <p className="mt-2 text-sm text-muted-foreground">{exp.description}</p>
      ) : null}

      {!isOpen ? (
        <div className="mt-6 rounded-md border border-border bg-card p-4 text-sm">
          {isClosed ? (
            <>
              <p className="font-medium text-foreground">Este estudio ya finalizó.</p>
              <p className="mt-1 text-muted-foreground">
                Gracias por tu interés. La recolección de respuestas ha concluido y ya no acepta
                nuevas participaciones.
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">
              Este experimento no está aceptando participantes en este momento.
            </p>
          )}
        </div>
      ) : (
        <form
          className="mt-6 grid gap-5 rounded-lg border border-border bg-card p-4 sm:p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!consent || !ageRange) return;
            setPreloadError(null);
            setStage("preloading");
          }}
        >
          <section aria-labelledby="consent-heading" className="grid gap-2">
            <h2 id="consent-heading" className="text-sm font-semibold text-foreground">
              Antes de comenzar
            </h2>
            <p className="text-sm text-muted-foreground">
              Verás tres imágenes en secuencia y responderás algunas preguntas breves sobre cada
              una. Tus respuestas se registran de forma anónima y se usan sólo con fines de
              investigación. No existen respuestas correctas o incorrectas. Nos interesa conocer
              tu percepción personal.
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
            size="lg"
            disabled={!consent || !ageRange}
            className="w-full"
          >
            Continuar
          </Button>
        </form>
      )}
    </div>
    </>
  );
}

/**
 * RR-006 · Session-creation gate.
 *
 * The session is only created after the browser reports that the first
 * stimulus image has fully loaded — that is the moment the person becomes a
 * real participant. If they close the tab or the image fails, no session
 * row is created.
 */
function PreloadingStage({
  stimulus,
  error,
  onReady,
  onFail,
  onCancel,
}: {
  stimulus: ExperimentStimulus | undefined;
  error: string | null;
  onReady: () => void;
  onFail: (message: string) => void;
  onCancel: () => void;
}) {
  if (!stimulus || !stimulus.imageUrl) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-destructive">
          No pudimos preparar la primera imagen. Vuelve a intentarlo más tarde.
        </p>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Volver
        </Button>
      </div>
    );
  }
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <div
        role="status"
        aria-live="polite"
        className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary"
      />
      <p className="text-sm text-foreground">Preparando la primera imagen…</p>
      {/* Hidden preloader: browser fully downloads the image before the
          session is created. onLoad = participant is real. */}
      <img
        src={stimulus.imageUrl}
        alt=""
        aria-hidden
        className="hidden"
        onLoad={onReady}
        onError={() =>
          onFail("No pudimos cargar la primera imagen. Verifica tu conexión e intenta de nuevo.")
        }
      />
      {error ? (
        <div className="mt-2 grid gap-2">
          <p className="text-xs text-destructive">{error}</p>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Reintentar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
