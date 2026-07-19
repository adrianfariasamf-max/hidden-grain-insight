import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface ActiveFiltersBarProps {
  /** Count of active filter dimensions from `useSearch().activeCount`. */
  count: number;
  onClear: () => void;
  className?: string;
  /** Rendered when `count === 0`. Optional. */
  emptyLabel?: string;
}

/**
 * Compact summary of the active-filter tally with a Clear action.
 * Purely presentational — logic lives in the Search domain.
 */
export function ActiveFiltersBar({
  count,
  onClear,
  className,
  emptyLabel = "No active filters",
}: ActiveFiltersBarProps) {
  if (count === 0) {
    return (
      <p className={cn("text-[11px] text-muted-foreground", className)} aria-live="polite">
        {emptyLabel}
      </p>
    );
  }
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 self-start rounded-md border border-border/60 bg-card/40 px-2 py-1 text-[11px]",
        className,
      )}
      aria-live="polite"
    >
      <span className="font-mono text-foreground">
        {count} active filter{count === 1 ? "" : "s"}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1 rounded text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Clear all active filters"
      >
        <X className="h-3 w-3" aria-hidden />
        Clear
      </button>
    </div>
  );
}