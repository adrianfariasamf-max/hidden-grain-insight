import { Loader2 } from "lucide-react";

import { SafeTimestamp } from "@/components/shared/SafeTimestamp";
import type { StatusResponse } from "@/lib/api/types";

import { StatusStatusIndicator } from "./StatusStatusIndicator";

interface SystemHealthCardProps {
  health: StatusResponse;
  isRefreshing?: boolean;
}

/**
 * Compact summary of /health for Inicio and Sistema. Only fields that
 * exist in the contract are rendered — nothing is inferred.
 */
export function SystemStatusCard({ health, isRefreshing }: SystemHealthCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Service</span>
          <span className="font-mono text-sm text-foreground">{health.service}</span>
        </div>
        <div className="flex items-center gap-2" aria-live="polite" aria-atomic="true">
          {isRefreshing ? (
            <span
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
              aria-label="Refreshing health status"
            >
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              refreshing
            </span>
          ) : null}
          <StatusStatusIndicator status={health.status} />
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Schema</dt>
          <dd className="font-mono text-foreground">{health.schemaVersion}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Proyección generated
          </dt>
          <dd className="font-mono text-foreground break-all">
            <SafeTimestamp value={health.generatedAt} />
          </dd>
        </div>
      </dl>
    </div>
  );
}
