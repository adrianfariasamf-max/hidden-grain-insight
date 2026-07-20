import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  /** Current committed text (source of truth, e.g. from SearchQuery.text). */
  value: string;
  /**
   * Called with the committed text. If `debounceMs > 0`, calls are
   * debounced from local typing; the caller still receives immediate
   * calls when the input is cleared.
   */
  onChange: (next: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  /** Debounce for keystroke → onChange. 0 disables. Default 300ms. */
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Reusable search input for the Universal Search UI. Purely
 * presentational: no domain awareness, no URL awareness. Callers wire
 * it to `SearchQuery.text` through `useSearch`.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  ariaLabel = "Search",
  debounceMs = 300,
  className,
  autoFocus,
}: SearchInputProps) {
  // Local text mirrors `value` so external resets (URL, Clear all) are
  // reflected in the field. See Explorador for the same pattern applied
  // to the URL as source of truth.
  const [local, setLocal] = useState(value);
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const debounced = useDebouncedValue(local, debounceMs);
  const lastEmitted = useRef(value);
  useEffect(() => {
    if (debounceMs === 0) return;
    if (debounced === lastEmitted.current) return;
    lastEmitted.current = debounced;
    onChange(debounced);
  }, [debounced, debounceMs, onChange]);

  const handleChange = (next: string) => {
    setLocal(next);
    if (debounceMs === 0) {
      lastEmitted.current = next;
      onChange(next);
    }
  };

  const handleClear = () => {
    setLocal("");
    lastEmitted.current = "";
    onChange("");
  };

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        className="h-10 w-full rounded-md border border-border/60 bg-background pl-9 pr-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
      {local ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
