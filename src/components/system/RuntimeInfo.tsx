import { API_BASE } from "@/lib/api/client";
import type { HealthResponse } from "@/lib/api/types";

interface RuntimeInfoProps {
  health: Pick<HealthResponse, "service" | "schemaVersion">;
}

/**
 * Ejecución facts about the client/server pairing. API base is read from the
 * already-resolved client value so we never duplicate the resolution logic.
 * VITE_HG_API_BASE is a public frontend variable — no secret exposure.
 */
export function RuntimeInfo({ health }: RuntimeInfoProps) {
  const rows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: "API base", value: API_BASE, mono: true },
    { label: "Service", value: health.service, mono: true },
    { label: "Versión del esquema", value: health.schemaVersion, mono: true },
  ];

  return (
    <dl className="grid gap-3 rounded-lg border border-border/60 bg-card px-4 py-4 sm:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{row.label}</dt>
          <dd
            className={"min-w-0 break-all text-sm text-foreground" + (row.mono ? " font-mono" : "")}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
