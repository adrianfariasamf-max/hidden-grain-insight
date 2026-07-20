import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  experimentKeys,
  experimentsApi,
  experimentDetailQuery,
  sessionResponsesQuery,
  sessionSnapshotQuery,
} from "@/lib/perception/client";
import type {
  ExperimentStimulus,
  StimulusResponse,
  SubmitResponseRequest,
} from "@/lib/perception/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/state/LoadingState";
import { ErrorState } from "@/components/state/ErrorState";
import { EmptyState } from "@/components/state/EmptyState";
import { PreviewBanner, usePreviewMode } from "@/components/experiments/PreviewBanner";

export const Route = createFileRoute("/e/$experimentId/s/$token")({
  component: ParticipantSession,
  head: () => ({
    meta: [{ title: "Sesión del estudio de percepción" }, { name: "robots", content: "noindex" }],
  }),
});

function ParticipantSession() {
  const { experimentId, token } = Route.useParams();
  const preview = usePreviewMode();
  if (preview) {
    return <PreviewSession experimentId={experimentId} />;
  }
  const qc = useQueryClient();
  const snapshot = useQuery(sessionSnapshotQuery(token));
  const responsesQ = useQuery(sessionResponsesQuery(token));

  // RR-006 · Instructions are shown on the landing before the session is
  // created. Once the participant lands here they go straight to the first
  // stimulus. `complete` remains for the thank-you view (and reload of a
  // finished session).
  const [stage, setStage] = useState<"stimulus" | "complete">("stimulus");

  const answered = responsesQ.data?.items ?? [];
  const stimuliSorted = useMemo(() => {
    const stimuli = snapshot.data?.stimuli ?? [];
    return [...stimuli].sort((a, b) => a.position - b.position);
  }, [snapshot.data?.stimuli]);

  // Server-driven initial stage on first load / hard reload.
  const initedRef = useRef(false);
  useEffect(() => {
    if (initedRef.current) return;
    if (!snapshot.data || !responsesQ.data) return;
    initedRef.current = true;
    const total = stimuliSorted.length;
    if (total > 0 && answered.length >= total) setStage("complete");
  }, [snapshot.data, responsesQ.data, answered.length, stimuliSorted.length]);

  if (snapshot.isLoading || responsesQ.isLoading) return <LoadingState label="Cargando…" />;
  if (snapshot.error)
    return <ErrorState error={snapshot.error} onRetry={() => snapshot.refetch()} />;
  if (!snapshot.data) return <EmptyState title="Sesión no encontrada" />;

  const exp = snapshot.data.experiment;
  const currentIndex = Math.min(answered.length, stimuliSorted.length - 1);
  const currentStimulus = stimuliSorted[currentIndex];
  const completed = answered.length >= stimuliSorted.length && stimuliSorted.length > 0;

  if (stage === "complete" || completed) {
    return <ThankYou />;
  }

  if (!currentStimulus) return <EmptyState title="No hay estímulos disponibles" />;

  return (
    <StimulusView
      key={currentStimulus.id}
      stimulus={currentStimulus}
      index={currentIndex}
      total={stimuliSorted.length}
      onSubmitted={async (last) => {
        await qc.invalidateQueries({ queryKey: experimentKeys.sessionResponses(token) });
        if (last) {
          try {
            await experimentsApi.completeSession(token);
          } catch {
            // Non-blocking: server state can be finalized on retry.
          }
          setStage("complete");
        }
      }}
      submit={(input) => experimentsApi.submitResponse(token, input)}
    />
  );
}

/**
 * Preview flow for the investigator. Identical UI to the real participant
 * runner, but no session, response or metric is persisted. All state lives
 * in memory and disappears when the tab closes.
 */
function PreviewSession({ experimentId }: { experimentId: string }) {
  const detail = useQuery(experimentDetailQuery(experimentId));
  const [answered, setAnswered] = useState(0);
  const stimuliSorted = useMemo(() => {
    const stimuli = detail.data?.stimuli ?? [];
    return [...stimuli].sort((a, b) => a.position - b.position);
  }, [detail.data?.stimuli]);

  if (detail.isLoading) return <LoadingState label="Cargando…" />;
  if (detail.error)
    return <ErrorState error={detail.error} onRetry={() => detail.refetch()} />;
  if (!detail.data) return <EmptyState title="Experimento no encontrado" />;

  const total = stimuliSorted.length;
  const currentStimulus = stimuliSorted[Math.min(answered, total - 1)];
  const completed = total > 0 && answered >= total;

  if (completed) {
    return (
      <>
        <PreviewBanner active />
        <ThankYou />
      </>
    );
  }
  if (!currentStimulus) {
    return (
      <>
        <PreviewBanner active />
        <EmptyState title="No hay estímulos disponibles" />
      </>
    );
  }
  return (
    <>
      <PreviewBanner active />
      <StimulusView
        key={currentStimulus.id}
        stimulus={currentStimulus}
        index={answered}
        total={total}
        submit={async (_input) => {
          // No-op: preview never persists responses.
          return {
            id: "preview",
            sessionId: "preview",
            stimulusId: currentStimulus.id,
            firstViewedAt: null,
            submittedAt: new Date().toISOString(),
            responseTimeMs: null,
            observation: "",
            attention: "",
            feeling: "",
            interpretation: "",
            discoveredHiddenElement: false,
            discoveredText: null,
            confidence: null,
            metadata: {},
          } satisfies StimulusResponse;
        }}
        onSubmitted={() => {
          setAnswered((n) => n + 1);
        }}
      />
    </>
  );
}

function StimulusView({
  stimulus,
  index,
  total,
  submit,
  onSubmitted,
}: {
  stimulus: ExperimentStimulus;
  index: number;
  total: number;
  submit: (input: SubmitResponseRequest) => Promise<StimulusResponse>;
  onSubmitted: (last: boolean) => void | Promise<void>;
}) {
  const [observation, setObservation] = useState("");
  const [attention, setAttention] = useState("");
  const [feeling, setFeeling] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [firstViewedAt] = useState(() => new Date().toISOString());
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: (input: SubmitResponseRequest) => submit(input),
    onSuccess: () => {
      onSubmitted(index + 1 >= total);
    },
    onError: (err) => setError((err as Error).message),
  });

  const canSubmit =
    !mut.isPending &&
    observation.trim().length > 0 &&
    attention.trim().length > 0 &&
    feeling.trim().length > 0 &&
    interpretation.trim().length > 0 &&
    confidence !== null;

  // RR-008 · Image + questions share the viewport as a single observation
  // unit. On lg+ the image is sticky on the left so the participant never
  // has to scroll back to see the stimulus while answering. On mobile the
  // image sits above the form, capped in height so the first question is
  // always visible below.
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Imagen {index + 1} de {total}
        </span>
        <div aria-hidden className="h-1 w-24 overflow-hidden rounded-full bg-muted sm:w-32">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(index / total) * 100}%` }}
          />
        </div>
      </div>

      {/* RR-023 · La imagen es el elemento protagonista: 60% del ancho en
          desktop, formulario 40%. En móvil/tablet mantenemos el diseño
          responsive con la imagen dominante en la parte superior. */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr] lg:gap-8">
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="overflow-hidden rounded-lg border border-border bg-black">
            {/* Full-image display, preserve aspect ratio. Height caps keep
                the participant's first question visible on mobile and let
                the image dominate the left column on desktop. */}
            <img
              src={stimulus.imageUrl}
              alt={stimulus.altText || `Imagen ${index + 1}`}
              className="mx-auto block max-h-[48vh] w-full object-contain sm:max-h-[60vh] lg:max-h-[calc(100vh-8rem)]"
            />
          </div>
        </div>

        <form
          className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          setError(null);
          mut.mutate({
            stimulusId: stimulus.id,
            firstViewedAt,
            observation: observation.trim(),
            attention: attention.trim(),
            feeling: feeling.trim(),
            interpretation: interpretation.trim(),
            confidence: confidence == null ? null : confidence / 5,
          });
        }}
      >
        <Field
          id="q-observation"
          label="¿Qué observas?"
          hint="Descríbela con tus propias palabras."
        >
          <Textarea
            id="q-observation"
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            rows={3}
            required
          />
        </Field>

        <Field
          id="q-interpretation"
          label="Describe con una palabra qué te genera esta imagen"
          hint="Una sola palabra, la primera que se te venga a la mente."
        >
          <Input
            id="q-interpretation"
            value={interpretation}
            onChange={(e) => setInterpretation(e.target.value)}
            maxLength={40}
            autoComplete="off"
            required
          />
        </Field>

        <Field
          id="q-attention"
          label="¿Qué es lo primero que te llamó la atención de esta imagen?"
          hint="Menciona cualquier detalle al que vuelva tu mirada."
        >
          <Textarea
            id="q-attention"
            value={attention}
            onChange={(e) => setAttention(e.target.value)}
            rows={2}
            required
          />
        </Field>

        <Field id="q-feeling" label="¿Qué sensación te transmite esta imagen?">
          <Textarea
            id="q-feeling"
            value={feeling}
            onChange={(e) => setFeeling(e.target.value)}
            rows={2}
            required
          />
        </Field>

        {/* RR-002 · Variable experimental "Seguridad" — obligatoria. */}
        {/* RR-022 · Escala numérica 1–5 con extremos etiquetados debajo,
            reemplaza la escala de círculos por mayor claridad visual. La
            lógica de almacenamiento (0..1) no cambia. */}
        <fieldset className="grid gap-2" data-experimental-variable="security">
          <legend className="text-sm font-medium text-foreground">
            ¿Qué tan seguro(a) estás de lo que acabas de responder?
          </legend>
          <div
            className="grid grid-cols-5 gap-2"
            role="radiogroup"
            aria-label="Nivel de seguridad"
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const active = confidence === n;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`Nivel ${n} de 5`}
                  onClick={() => setConfidence(n)}
                  className={`h-10 rounded-md border text-sm font-semibold transition-colors ${
                    active
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Nada seguro</span>
            <span>Muy seguro</span>
          </div>
        </fieldset>

        {error ? (
          <p className="text-xs text-destructive" role="alert">
            No pudimos guardar tu respuesta. {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={!canSubmit} className="w-full">
          {mut.isPending
            ? "Guardando…"
            : index + 1 >= total
              ? "Enviar y finalizar"
              : "Siguiente imagen"}
        </Button>
        </form>
      </div>
    </div>
  );
}

function ThankYou() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-10 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Gracias</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Tus respuestas se registraron correctamente. Ya puedes cerrar esta página.
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
