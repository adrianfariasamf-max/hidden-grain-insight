import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { SafeTimestamp } from "@/components/shared/SafeTimestamp";
import {
  experimentSessionsQuery,
  experimentDetailQuery,
  sessionResponsesQuery,
} from "@/lib/perception/client";
import type { ParticipantSession, StimulusResponse } from "@/lib/perception/types";

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
            const label = s.participantAlias?.trim() || `Participant ${idx + 1}`;
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
                      <StatusChip status={s.status} /> · {it.responseCount} response
                      {it.responseCount === 1 ? "" : "s"} · started{" "}
                      <SafeTimestamp value={s.startedAt ?? s.createdAt} />
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {open ? "hide" : "view"}
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
  stimuli: { id: string; position: number; altText: string }[];
}) {
  const rq = useQuery(sessionResponsesQuery(token));
  const responses = rq.data?.items ?? [];
  const byId = new Map(stimuli.map((s) => [s.id, s]));

  return (
    <div className="mt-2 grid gap-3 rounded-md border border-border/60 bg-background/40 p-3">
      <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        <span>
          Consentimiento: <SafeTimestamp value={session.consentAcceptedAt} />
        </span>
        <span>
          Completado: <SafeTimestamp value={session.completedAt} />
        </span>
      </div>
      {rq.isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando respuestas…</p>
      ) : responses.length === 0 ? (
        <p className="text-xs text-muted-foreground">No se registraron respuestas.</p>
      ) : (
        responses.map((r) => {
          const stim = byId.get(r.stimulusId);
          return (
            <article key={r.id} className="rounded border border-border/60 bg-card p-3">
              <header className="mb-2 flex items-baseline justify-between text-[11px] text-muted-foreground">
                <span className="font-mono">
                  Stimulus {stim?.position ?? "?"}
                  {stim?.altText ? ` — ${stim.altText}` : ""}
                </span>
                <span className="font-mono">
                  {r.responseTimeMs != null ? `${(r.responseTimeMs / 1000).toFixed(1)}s` : "—"}
                </span>
              </header>
              <dl className="grid gap-1.5 text-xs">
                <Row k="Observación" v={r.observation} />
                <Row k="Elementos que llamaron la atención" v={r.attention} />
                <Row k="Sensación" v={r.feeling} />
                <Row k="Interpretación" v={r.interpretation} />
                <Row
                  k="Confianza"
                  v={r.confidence == null ? "—" : `${Math.round(r.confidence * 5)}/5`}
                />
              </dl>
            </article>
          );
        })
      )}
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
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
        tone[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}
