import { CheckCircle2, CircleDashed } from "lucide-react";

import { cn } from "@/lib/utils";

interface ResolutionBadgeProps {
  resolved: boolean;
  className?: string;
}

export function ResolutionBadge({ resolved, className }: ResolutionBadgeProps) {
  const Icon = resolved ? CheckCircle2 : CircleDashed;
  const label = resolved ? "resolved" : "unresolved";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide",
        resolved
          ? "border-success/30 bg-success/15 text-success"
          : "border-warning/30 bg-warning/15 text-warning",
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}