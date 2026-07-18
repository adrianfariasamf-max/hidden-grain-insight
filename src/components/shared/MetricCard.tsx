import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  mono?: boolean;
  className?: string;
}

export function MetricCard({ label, value, hint, mono, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border border-border/60 bg-card px-4 py-3",
        className,
      )}
    >
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn("text-xl font-semibold text-foreground", mono && "font-mono text-base")}>
        {value}
      </span>
      {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
    </div>
  );
}
