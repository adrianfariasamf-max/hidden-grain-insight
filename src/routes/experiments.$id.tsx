import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, EyeOff, Rocket } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/state/EmptyState";
import { ErrorState } from "@/components/state/ErrorState";
import { LoadingState } from "@/components/state/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SharePanel } from "@/components/experiments/SharePanel";
import { StimulusSlot } from "@/components/experiments/StimulusSlot";
import { SessionsPanel } from "@/components/experiments/SessionsPanel";
import { experimentDetailQuery, experimentKeys, experimentsApi } from "@/lib/perception/client";
import type { ExperimentDetail } from "@/lib/perception/types";

export const Route = createFileRoute("/experiments/$id")({
  component: ExperimentDetailPage,
  head: () => ({
    meta: [
      { title: "Experimento — Perception Studio" },
      { name: "description", content: "Configura, publica y comparte un estudio de percepción." },
    ],
  }),
  errorComponent: ({ error, reset }) => <ErrorState error={error} onRetry={reset} />,
  notFoundComponent: () => <EmptyState title="Experimento no encontrado" />,
});

function ExperimentDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(experimentDetailQuery(id));

  if (isLoading) return <LoadingState label="Cargando experimento…" />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!data) return <EmptyState title="Experimento no encontrado" />;

  return <ExperimentEditor detail={data} experimentId={id} qc={qc} />;
}

function ExperimentEditor({
  detail,
  experimentId,
  qc,
}: {
  detail: ExperimentDetail;
  experimentId: string;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const { experiment, stimuli, sessionCount, responseCount, publishReadiness } = detail;
  const isPublished = experiment.status !== "draft";

  const publish = useMutation({
    mutationFn: () => experimentsApi.publish(experimentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: experimentKeys.detail(experimentId) });
      qc.invalidateQueries({ queryKey: experimentKeys.list() });
    },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-4">
        <Link to="/experiments" className="text-xs text-muted-foreground hover:text-foreground">
          ← Todos los experimentos
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={experiment.title} description={experiment.description} />
        <StatusPill status={experiment.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-6">
          <MetadataCard
            detail={detail}
            experimentId={experimentId}
            qc={qc}
            readOnly={isPublished}
          />

          <section className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Estímulos</h3>
                <p className="text-xs text-muted-foreground">
                  Se requieren exactamente tres imágenes. El texto alternativo es obligatorio para
                  cada una.
                </p>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                {stimuli.length}/3
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((pos) => (
                <StimulusSlot
                  key={pos}
                  experimentId={experimentId}
                  position={pos as 1 | 2 | 3}
                  stimulus={stimuli.find((s) => s.position === pos)}
                  readOnly={isPublished}
                />
              ))}
            </div>
          </section>

          {isPublished ? <SharePanel experimentId={experimentId} /> : null}

          {isPublished ? <SessionsPanel experimentId={experimentId} /> : null}
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-6 lg:self-start">
          <PublishChecklist
            reasons={publishReadiness.reasons}
            ready={publishReadiness.ready}
            status={experiment.status}
            onPublish={() => publish.mutate()}
            pending={publish.isPending}
            error={publish.error ? (publish.error as Error).message : null}
          />

          <section className="rounded-lg border border-border bg-card p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Actividad
            </h4>
            <dl className="mt-3 grid gap-2 text-sm">
              <Row label="Sesiones" value={String(sessionCount)} />
              <Row label="Respuestas" value={String(responseCount)} />
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function MetadataCard({
  detail,
  experimentId,
  qc,
  readOnly,
}: {
  detail: ExperimentDetail;
  experimentId: string;
  qc: ReturnType<typeof useQueryClient>;
  readOnly: boolean;
}) {
  const e = detail.experiment;
  const [title, setTitle] = useState(e.title);
  const [description, setDescription] = useState(e.description);
  const [instructions, setInstructions] = useState(e.instructions);
  const [hiddenTarget, setHiddenTarget] = useState(e.hiddenTarget);

  useEffect(() => {
    setTitle(e.title);
    setDescription(e.description);
    setInstructions(e.instructions);
    setHiddenTarget(e.hiddenTarget);
  }, [e.id, e.title, e.description, e.instructions, e.hiddenTarget]);

  const dirty =
    title !== e.title ||
    description !== e.description ||
    instructions !== e.instructions ||
    hiddenTarget !== e.hiddenTarget;

  const save = useMutation({
    mutationFn: () =>
      experimentsApi.update(experimentId, { title, description, instructions, hiddenTarget }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: experimentKeys.detail(experimentId) });
      qc.invalidateQueries({ queryKey: experimentKeys.list() });
    },
  });

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground">Datos del experimento</h3>
      <p className="text-xs text-muted-foreground">
        Estos campos definen lo que las personas participantes leen antes de ver las imágenes.
      </p>
      <div className="mt-4 grid gap-4">
        <Field id="exp-title" label="Título">
          <Input
            id="exp-title"
            value={title}
            onChange={(ev) => setTitle(ev.target.value)}
            disabled={readOnly}
          />
        </Field>
        <Field id="exp-desc" label="Descripción">
          <Textarea
            id="exp-desc"
            value={description}
            onChange={(ev) => setDescription(ev.target.value)}
            rows={2}
            disabled={readOnly}
          />
        </Field>
        <Field id="exp-instr" label="Instrucciones para participantes">
          <Textarea
            id="exp-instr"
            value={instructions}
            onChange={(ev) => setInstructions(ev.target.value)}
            rows={4}
            disabled={readOnly}
          />
        </Field>
        <Field
          id="exp-hidden"
          label={
            <span className="inline-flex items-center gap-1.5">
              <EyeOff className="h-3 w-3" /> Objetivo oculto — nunca se muestra a las personas
              participantes
            </span>
          }
        >
          <Input
            id="exp-hidden"
            value={hiddenTarget}
            onChange={(ev) => setHiddenTarget(ev.target.value)}
            disabled={readOnly}
            className="font-mono"
          />
        </Field>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            onClick={() => save.mutate()}
            disabled={!dirty || save.isPending || readOnly}
          >
            {save.isPending ? "Guardando…" : dirty ? "Guardar cambios" : "Guardado"}
          </Button>
              {readOnly ? (
            <span className="text-[11px] text-muted-foreground">
              Los experimentos publicados no se pueden editar.
            </span>
          ) : null}
          {save.error ? (
            <span className="text-xs text-destructive">{(save.error as Error).message}</span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function PublishChecklist({
  reasons,
  ready,
  status,
  onPublish,
  pending,
  error,
}: {
  reasons: string[];
  ready: boolean;
  status: string;
  onPublish: () => void;
  pending: boolean;
  error: string | null;
}) {
  const items = [
    { key: "title", label: "Título presente" },
    { key: "instructions", label: "Instrucciones para participantes" },
    { key: "hidden", label: "Objetivo oculto definido" },
    { key: "3-stimuli", label: "Exactamente 3 estímulos adjuntos" },
    { key: "alt", label: "Texto alternativo en cada estímulo" },
  ];
  const missingLower = reasons.map((r) => r.toLowerCase()).join(" | ");
  const isMissing = (k: string) => {
    switch (k) {
      case "title":
        return missingLower.includes("title");
      case "instructions":
        return missingLower.includes("instruction");
      case "hidden":
        return missingLower.includes("hidden");
      case "3-stimuli":
        return missingLower.includes("stimul");
      case "alt":
        return missingLower.includes("alt");
      default:
        return false;
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Lista de verificación para publicar
      </h4>
      <ul className="mt-3 grid gap-1.5 text-sm">
        {items.map((it) => {
          const missing = isMissing(it.key);
          return (
            <li key={it.key} className="flex items-center gap-2">
              {missing ? (
                <Circle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />
              )}
              <span className={missing ? "text-muted-foreground" : "text-foreground"}>
                {it.label}
              </span>
            </li>
          );
        })}
      </ul>

      {status === "draft" ? (
        <Button
          type="button"
          size="sm"
          className="mt-4 w-full"
          onClick={onPublish}
          disabled={!ready || pending}
        >
          <Rocket className="mr-1.5 h-4 w-4" />
          {pending ? "Publicando…" : "Publicar experimento"}
        </Button>
      ) : (
        <p className="mt-4 text-xs text-primary">El experimento está publicado.</p>
      )}
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </section>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm text-foreground">{value}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    published: "bg-primary/15 text-primary",
    closed: "bg-secondary text-secondary-foreground",
  };
  const label: Record<string, string> = {
    draft: "borrador",
    published: "publicado",
    closed: "cerrado",
  };
  return (
    <span
      className={`rounded px-2 py-0.5 font-mono text-[11px] ${tone[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {label[status] ?? status}
    </span>
  );
}
