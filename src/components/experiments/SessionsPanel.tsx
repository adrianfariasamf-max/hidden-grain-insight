import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { SafeTimestamp } from "@/components/shared/SafeTimestamp";
import {
  experimentSessionsQuery,
  experimentDetailQuery,
  sessionResponsesQuery,
} from "@/lib/perception/client";
import type { ExperimentStimulus, ParticipantSession } from "@/lib/perception/types";

// RR-003 · Demographic labels shared with the participant landing.
// Keep in sync if new ranges are added there.
const AGE_RANGE_LABEL: Record<string, string> = {
  under_18: "Menos de 18",
  "18-24": "18–24",
  "25-34": "25–34",
  "35-44": "35–44",
  "45-54": "45–54",
  "55-64": "55–64",
  "65_plus": "65+",
};

function readAgeRange(session: ParticipantSession): string {
  const meta = session.metadata as Record<string, unknown> | undefined;
  const demo = meta?.demographics as Record<string, unknown> | undefined;
  const raw = typeof demo?.ageRange === "string" ? (demo.ageRange as string) : null;
  if (!raw) return "—";
  return AGE_RANGE_LABEL[raw] ?? raw;
}

function isTestSession(session: ParticipantSession): boolean {
  const meta = session.metadata as Record<string, unknown> | undefined;
  return meta?.test === true;
}

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

// RR-010 · Derive an outcome status independent of the raw DB `status`.
// Rules:
//   - responseCount === 0 → "discarded" (never opened a stimulus).
//   - session.status === "completed" → "completed".
//   - otherwise (has responses but did not reach the end) → "abandoned".
type SessionOutcome = "discarded" | "completed" | "abandoned";
function classifyOutcome(item: {
  session: ParticipantSession;
  responseCount: number;
}): SessionOutcome {
  if (item.responseCount === 0) return "discarded";
  if (item.session.status === "completed") return "completed";
  return "abandoned";
}

const OUTCOME_LABEL: Record<SessionOutcome, string> = {
  discarded: "descartada",
  completed: "completada",
  abandoned: "abandonada",
};
const OUTCOME_TONE: Record<SessionOutcome, string> = {
  discarded: "bg-muted text-muted-foreground",
  completed: "bg-primary/25 text-primary",
  abandoned: "bg-amber-500/15 text-amber-400",
};

interface Props {
  experimentId: string;
}

export function SessionsPanel({ experimentId }: Props) {
  const sessionsQ = useQuery(experimentSessionsQuery(experimentId));
  const detailQ = useQuery(experimentDetailQuery(experimentId));
  const [openToken, setOpenToken] = useState<string | null>(null);
  // RR-006 · Empty sessions (0 responses) are treated as discarded and
  // hidden by default so they never mix with real research data. Historical
  // rows from before the new lifecycle can still be inspected via toggle.
  const [showEmpty, setShowEmpty] = useState(false);

  const rawItems = sessionsQ.data?.items ?? [];
  const emptyCount = rawItems.filter((it) => it.responseCount === 0).length;
  const items = showEmpty ? rawItems : rawItems.filter((it) => it.responseCount > 0);

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Sesiones de participantes</h3>
          <p className="text-xs text-muted-foreground">
            Datos crudos de participantes. Las sesiones sin respuestas (descartadas) se ocultan
            por defecto. Las sesiones abandonadas conservan sus respuestas parciales.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          {emptyCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowEmpty((v) => !v)}
              className="rounded border border-border px-2 py-1 font-mono text-muted-foreground hover:text-foreground"
            >
              {showEmpty ? "ocultar" : "mostrar"} vacías ({emptyCount})
            </button>
          ) : null}
          <span className="font-mono text-muted-foreground">{items.length}</span>
        </div>
      </div>

      {sessionsQ.isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando sesiones…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aún no hay sesiones.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((it, idx) => {
            const s = it.session;
            const test = isTestSession(s);
            const label = `Participante ${idx + 1}`;
            const open = openToken === s.publicToken;
            const outcome = classifyOutcome(it);
            const durationLabel = formatDurationMs(it.durationMs);
            return (
              <li key={s.id} className="py-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left"
                  onClick={() => setOpenToken(open ? null : s.publicToken)}
                  aria-expanded={open}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {label}
                      <span
                        className={`ml-2 rounded px-1.5 py-0.5 font-mono text-[10px] ${OUTCOME_TONE[outcome]}`}
                      >
                        {OUTCOME_LABEL[outcome]}
                      </span>
                      {test ? (
                        <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
                          sesión de prueba
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Edad {readAgeRange(s)} · {it.responseCount}/3 respuesta
                      {it.responseCount === 1 ? "" : "s"}
                      {outcome === "abandoned" && it.lastPositionReached
                        ? ` · abandonó tras estímulo ${it.lastPositionReached}`
                        : ""}
                      {" · "}
                      duración {durationLabel} · iniciada{" "}
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
                    totalDurationMs={it.durationMs}
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
  totalDurationMs,
}: {
  token: string;
  session: ParticipantSession;
  stimuli: ExperimentStimulus[];
  totalDurationMs: number | null;
}) {
  const rq = useQuery(sessionResponsesQuery(token));
  const responses = rq.data?.items ?? [];
  const byId = useMemo(() => new Map(stimuli.map((s) => [s.id, s])), [stimuli]);
  // Fallback for older sessions that lack the enriched duration from the API.
  const effectiveDuration = totalDurationMs ?? sessionDurationMs(session);

  return (
    <div className="mt-2 grid gap-3 rounded-md border border-border/60 bg-background/40 p-3">
      <ParticipantSummary session={session} totalDurationMs={effectiveDuration} />
      {rq.isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando respuestas…</p>
      ) : responses.length === 0 ? (
        <p className="text-xs text-muted-foreground">No se registraron respuestas.</p>
      ) : (
        responses.map((r) => {
          const stim = byId.get(r.stimulusId);
          const durationLabel =
            r.responseTimeMs != null ? formatDurationMs(r.responseTimeMs) : "—";
          const securityLevel = r.confidence == null ? null : Math.round(r.confidence * 5);
          return (
            <article key={r.id} className="rounded border border-border/60 bg-card p-3">
              {/* RR-004 · Ficha de observación. Prioridad visual:
                    Imagen → Observación → Palabra → Atención → Sensación → Seguridad → Tiempo */}
              <div className="grid gap-3 sm:grid-cols-[128px_1fr]">
                <div className="flex flex-col gap-1">
                  {stim?.imageUrl ? (
                    <img
                      src={stim.imageUrl}
                      alt={stim.altText || `Estímulo ${stim.position}`}
                      className="h-32 w-32 flex-shrink-0 rounded border border-border/60 bg-black object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-32 w-32 flex-shrink-0 rounded border border-border/60 bg-muted" />
                  )}
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Estímulo {stim?.position ?? "?"}
                  </p>
                </div>
                <div className="min-w-0 space-y-3">
                  <ObservationBlock label="Observación" value={r.observation} tone="primary" />
                  <WordBlock
                    label="Describe con una palabra qué te genera esta imagen"
                    value={r.interpretation}
                  />
                  <QuietBlock label="¿Qué llamó primero tu atención?" value={r.attention} />
                  <QuietBlock label="Sensación" value={r.feeling} />
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-muted-foreground">
                    <SecurityMeter level={securityLevel} />
                    <span>
                      <span className="text-muted-foreground">Tiempo:</span>{" "}
                      <span className="text-foreground">{durationLabel}</span>
                    </span>
                  </div>
                </div>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}

function ObservationBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | null;
  tone?: "primary" | "quiet";
}) {
  const text = value?.trim() ? value : "—";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 whitespace-pre-wrap break-words ${
          tone === "primary" ? "text-sm text-foreground" : "text-xs text-foreground"
        }`}
      >
        {text}
      </p>
    </div>
  );
}

function WordBlock({ label, value }: { label: string; value: string | null }) {
  const text = value?.trim() ? value.trim() : "—";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-foreground">{text}</p>
    </div>
  );
}

function QuietBlock({ label, value }: { label: string; value: string | null }) {
  return <ObservationBlock label={label} value={value} tone="quiet" />;
}

function SecurityMeter({ level }: { level: number | null }) {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Seguridad ${level ?? "—"} de 5`}>
      <span className="text-muted-foreground">Seguridad:</span>
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`h-2 w-2 rounded-full border ${
              level != null && n <= level
                ? "border-primary bg-primary"
                : "border-border bg-transparent"
            }`}
          />
        ))}
      </span>
      <span className="text-foreground">{level == null ? "—" : `${level}/5`}</span>
    </span>
  );
}

function ParticipantSummary({
  session,
  totalDurationMs,
}: {
  session: ParticipantSession;
  totalDurationMs: number | null;
}) {
  const age = readAgeRange(session);
  const test = isTestSession(session);
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded border border-border/60 bg-card p-3 text-[11px] sm:grid-cols-4">
      <SummaryItem k="Edad" v={age} />
      <SummaryItem
        k="Fecha"
        v={<SafeTimestamp value={session.startedAt ?? session.createdAt} />}
      />
      <SummaryItem k="Duración total" v={formatDurationMs(totalDurationMs)} />
      <SummaryItem
        k="Estado"
        v={
          <span className="inline-flex items-center gap-1.5">
            <StatusChip status={session.status} />
            {test ? (
              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
                prueba
              </span>
            ) : null}
          </span>
        }
      />
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
