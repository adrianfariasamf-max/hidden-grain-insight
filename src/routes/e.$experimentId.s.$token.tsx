import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  experimentKeys,
  experimentsApi,
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
import { LoadingState } from "@/components/state/LoadingState";
import { ErrorState } from "@/components/state/ErrorState";
import { EmptyState } from "@/components/state/EmptyState";

export const Route = createFileRoute("/e/$experimentId/s/$token")({
  component: ParticipantSession,
  head: () => ({
    meta: [
      { title: "Sesión del estudio de percepción" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ParticipantSession() {
  const { experimentId, token } = Route.useParams();
  const qc = useQueryClient();
  const snapshot = useQuery(sessionSnapshotQuery(token));
  const responsesQ = useQuery(sessionResponsesQuery(token));

  const [stage, setStage] = useState<"instructions" | "stimulus" | "complete">(
    "instructions",
  );

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
    else if (answered.length > 0) setStage("stimulus");
  }, [snapshot.data, responsesQ.data, answered.length, stimuliSorted.length]);

  if (snapshot.isLoading || responsesQ.isLoading) return <LoadingState label="Cargando…" />;
  if (snapshot.error) return <ErrorState error={snapshot.error} onRetry={() => snapshot.refetch()} />;
  if (!snapshot.data) return <EmptyState title="Sesión no encontrada" />;

  const exp = snapshot.data.experiment;
  const currentIndex = Math.min(answered.length, stimuliSorted.length - 1);
  const currentStimulus = stimuliSorted[currentIndex];
  const completed = answered.length >= stimuliSorted.length && stimuliSorted.length > 0;

  if (stage === "complete" || completed) {
    return <ThankYou experimentId={experimentId} />;
  }

  if (stage === "instructions") {
    return (
      <InstructionsView
        title={exp.title}
        instructions={exp.instructions}
        total={stimuliSorted.length}
        onBegin={() => setStage("stimulus")}
      />
    );
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

function InstructionsView({
  title,
  instructions,
  total,
  onBegin,
}: {
  title: string;
  instructions: string;
  total: number;
  onBegin: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-10">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Verás {total} imagen{total === 1 ? "" : "es"} en secuencia.
      </p>
      <div className="mt-4 whitespace-pre-wrap rounded-lg border border-border bg-card p-4 text-sm text-foreground">
        {instructions || "Observa cada imagen con atención y responde las preguntas a continuación."}
      </div>
      <Button type="button" className="mt-6" onClick={onBegin}>
        Start
      </Button>
    </div>
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
    interpretation.trim().length > 0;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-6">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Imagen {index + 1} de {total}
        </span>
        <div
          aria-hidden
          className="h-1 w-32 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((index) / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-black">
        {/* Full-image display, no thumbnails, preserve aspect ratio */}
        <img
          src={stimulus.imageUrl}
          alt={stimulus.altText || `Image ${index + 1}`}
          className="mx-auto block max-h-[70vh] w-full object-contain"
        />
      </div>

      <form
        className="mt-5 grid gap-4"
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
          id="q-attention"
          label="¿Qué elementos llamaron primero tu atención?"
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

        <Field
          id="q-interpretation"
          label="¿Cómo interpretas lo que estás viendo?"
          hint="No hay respuestas correctas ni incorrectas."
        >
          <Textarea
            id="q-interpretation"
            value={interpretation}
            onChange={(e) => setInterpretation(e.target.value)}
            rows={2}
            required
          />
        </Field>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium text-foreground">
            Nivel de confianza in your response{" "}
            <span className="text-xs text-muted-foreground">(opcional)</span>
          </legend>
          <div className="flex gap-2" role="radiogroup" aria-label="Nivel de confianza level">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = confidence === n;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setConfidence(active ? null : n)}
                  className={`h-9 flex-1 rounded-md border text-sm transition-colors ${
                    active
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            1 = poca confianza · 5 = mucha confianza
          </p>
        </fieldset>

        {error ? (
          <p className="text-xs text-destructive" role="alert">
            No pudimos guardar tu respuesta. {error}
          </p>
        ) : null}

        <Button type="submit" disabled={!canSubmit} className="w-full">
          {mut.isPending
            ? "Guardando…"
            : index + 1 >= total
              ? "Enviar y finalizar"
              : "Siguiente imagen"}
        </Button>
      </form>
    </div>
  );
}

function ThankYou({ experimentId: _ }: { experimentId: string }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-10 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Gracias</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Tus respuestas se registraron correctamente. Ya puedes cerrar esta página.
      </p>
      <Link
        to="/"
        className="mt-6 text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Inicio
      </Link>
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