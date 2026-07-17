import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface PaginationProps {
  offset: number;
  limit: number;
  total: number;
  onChange: (nextOffset: number) => void;
  disabled?: boolean;
}

/**
 * offset/limit is the source of truth (per API contract). A page number is
 * computed only for presentation:  currentPage = floor(offset / limit) + 1.
 */
export function Pagination({ offset, limit, total, onChange, disabled }: PaginationProps) {
  const safeLimit = Math.max(1, limit);
  const currentPage = Math.floor(offset / safeLimit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const shownFrom = total === 0 ? 0 : offset + 1;
  const shownTo = Math.min(offset + safeLimit, total);

  const canPrev = !disabled && offset > 0;
  const canNext = !disabled && offset + safeLimit < total;

  return (
    <div className="flex flex-col items-start justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center">
      <div>
        Showing <span className="font-mono text-foreground">{shownFrom}</span>–
        <span className="font-mono text-foreground">{shownTo}</span> of{" "}
        <span className="font-mono text-foreground">{total}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => onChange(Math.max(0, offset - safeLimit))}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-md border border-border/60 bg-background px-2 transition-colors",
            canPrev ? "hover:text-foreground" : "opacity-50",
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3 w-3" aria-hidden />
          Prev
        </button>
        <span className="font-mono text-foreground">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => onChange(offset + safeLimit)}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-md border border-border/60 bg-background px-2 transition-colors",
            canNext ? "hover:text-foreground" : "opacity-50",
          )}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-3 w-3" aria-hidden />
        </button>
      </div>
    </div>
  );
}