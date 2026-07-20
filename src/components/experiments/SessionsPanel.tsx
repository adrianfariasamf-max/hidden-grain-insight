import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { SafeTimestamp } from "@/components/shared/SafeTimestamp";
import {
  experimentSessionsQuery,
  experimentDetailQuery,
  sessionResponsesQuery,
} from "@/lib/perception/client";
import type { ExperimentStimulus, ParticipantSession } from "@/lib/perception/types";

function formatDurationMs(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes} min ${seconds} s`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours} h ${remMinutes} min ${seconds} s`;
}

function sessionDurationMs(s: ParticipantSession): number | null {
  const start = s.startedAt ?? s.createdAt;
  const end = s.completedAt;
  if (!start || !end) return null;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return b - a;
}

interface Props {
  experimentId: string;
}

export function SessionsPanel({ experimentId }: Props) {
  const sessionsQ = useQuery(experimentSessionsQuery(experimentId));
  const detailQ = useQuery(experimentDetailQuery(experimentId));
  const [openToken, setOpenToken] = useState<string | null>(null);

  const items = sessionsQ.data?.items ?? [];

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Sesiones de participantes</h3>
          <p className="text-xs text-muted-foreground">
            Datos crudos de participantes. Ordenados por hora de creación.
          </p>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">{items.length}</span>
      </div>

      {sessionsQ.isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando sesiones…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aún no hay sesiones.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((it, idx) => {
            const s = it.session;
            const label = s.participantAlias?.trim() || `Participante ${idx + 1}`;
            const open = openToken === s.publicToken;
            return (
              <li key={s.id} className="py-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left"
                  onClick={() => setOpenToken(open ? null : s.publicToken)}
                  aria-expanded={open}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      <StatusChip status={s.status} /> · {it.responseCount} respuesta
                      {it.responseCount === 1 ? "" : "s"} · iniciada{" "}
                      <SafeTimestamp value={s.startedAt ?? s.createdAt} />
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                     {open ? "ocultar" : "ver"}
                  </span>
                </button>
                {open ? (
                  <SessionResponses
                    token={s.publicToken}
                    session={s}
                    stimuli={detailQ.data?.stimuli ?? []}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SessionResponses({
  token,
  session,
  stimuli,
}: {
  token: string;
  session: ParticipantSession;
  stimuli: ExperimentStimulus[];
}) {
  const rq = useQuery(sessionResponsesQuery(token));
  const responses = rq.data?.items ?? [];
  const byId = useMemo(() => new Map(stimuli.map((s) => [s.id, s])), [stimuli]);
  const totalDurationMs = sessionDurationMs(session);

  return (
    <div className="mt-2 grid gap-3 rounded-md border border-border/60 bg-background/40 p-3">
      <ParticipantSummary session={session} totalDurationMs={totalDurationMs} />
      {rq.isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando respuestas…</p>
      ) : responses.length === 0 ? (
        <p className="text-xs text-muted-foreground">No se registraron respuestas.</p>
      ) : (
        responses.map((r) => {
          const stim = byId.get(r.stimulusId);
          const durationLabel =
            r.responseTimeMs != null ? formatDurationMs(r.responseTimeMs) : "—";
          return (
            <article key={r.id} className="rounded border border-border/60 bg-card p-3">
              <header className="mb-3 flex items-start gap-3">
                {stim?.imageUrl ? (
                  <img
                    src={stim.imageUrl}
                    alt={stim.altText || `Estímulo ${stim.position}`}
                    className="h-16 w-16 flex-shrink-0 rounded border border-border/60 bg-black object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-16 w-16 flex-shrink-0 rounded border border-border/60 bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] text-muted-foreground">
                    Estímulo {stim?.position ?? "?"}
                  </p>
                  {stim?.altText ? (
                    <p className="truncate text-xs text-foreground">{stim.altText}</p>
                  ) : null}
                </div>
              </header>
              <dl className="grid gap-1.5 text-xs">
                <Row k="Observación" v={r.observation} />
                <Row k="Interpretación" v={r.interpretation} />
                <Row k="Elementos que llamaron la atención" v={r.attention} />
                <Row k="Sensación" v={r.feeling} />
                <Row
                  k="Confianza"
                  v={r.confidence == null ? "—" : `${Math.round(r.confidence * 5)}/5`}
                />
                <Row k="Tiempo" v={durationLabel} />
              </dl>
            </article>
          );
        })
      )}
    </div>
  );
}

function ParticipantSummary({
  session,
  totalDurationMs,
}: {
  session: ParticipantSession;
  totalDurationMs: number | null;
}) {
  const alias = session.participantAlias?.trim() || "Sin alias";
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded border border-border/60 bg-card p-3 text-[11px] sm:grid-cols-4">
      <SummaryItem k="Alias" v={alias} />
      <SummaryItem
        k="Fecha"
        v={<SafeTimestamp value={session.startedAt ?? session.createdAt} />}
      />
      <SummaryItem k="Duración total" v={formatDurationMs(totalDurationMs)} />
      <SummaryItem k="Estado" v={<StatusChip status={session.status} />} />
    </dl>
  );
}

function SummaryItem({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="mt-0.5 truncate text-foreground">{v}</dd>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | number | null }) {
  const value = v == null || v === "" ? "—" : String(v);
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="whitespace-pre-wrap break-words text-foreground">{value}</dd>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const tone: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    in_progress: "bg-primary/15 text-primary",
    completed: "bg-primary/25 text-primary",
    abandoned: "bg-destructive/15 text-destructive",
  };
  const label: Record<string, string> = {
    pending: "pendiente",
    in_progress: "en progreso",
    completed: "completada",
    abandoned: "abandonada",
  };
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
        tone[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {label[status] ?? status}
    </span>
  );
}
