import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface FilterOptionSet {
  types: string[];
  categories: string[];
  statuses: string[];
}

export interface FilterValues {
  type: string;
  category: string;
  status: string;
}

interface FiltersBarProps {
  values: FilterValues;
  options: FilterOptionSet;
  onChange: (patch: Partial<FilterValues>) => void;
  onClearAll: () => void;
  disabled?: boolean;
}

/**
 * Filter selects for type, category and status.
 *
 * Contract limitation: the API does not expose a facet/catalog endpoint yet,
 * so option lists are derived from the currently loaded page as an auxiliary
 * hint — they are NOT presented as the canonical set of possible values. The
 * currently selected value is always kept in the option list even when it is
 * not present in the loaded page, so the URL state stays consistent.
 */
export function FiltersBar({ values, options, onChange, onClearAll, disabled }: FiltersBarProps) {
  const hasAny = values.type || values.category || values.status;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
      <FilterSelect
        label="Tipo"
        value={values.type}
        options={options.types}
        onChange={(v) => onChange({ type: v })}
        disabled={disabled}
      />
      <FilterSelect
        label="Categoría"
        value={values.category}
        options={options.categories}
        onChange={(v) => onChange({ category: v })}
        disabled={disabled}
      />
      <FilterSelect
        label="Estado"
        value={values.status}
        options={options.statuses}
        onChange={(v) => onChange({ status: v })}
        disabled={disabled}
      />
      {hasAny ? (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex h-9 items-center gap-1 self-start rounded-md border border-border/60 bg-background px-3 text-xs text-muted-foreground transition-colors hover:text-foreground sm:self-end"
        >
          <X className="h-3 w-3" aria-hidden />
          Limpiar filtros
        </button>
      ) : null}
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

function FilterSelect({ label, value, options, onChange, disabled }: FilterSelectProps) {
  // Always include the current value even if it is missing from the loaded
  // page — keeps the URL state visible in the control.
  const merged = value && !options.includes(value) ? [value, ...options] : options;

  return (
    <label className="flex min-w-[9rem] flex-col gap-1 text-xs">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "h-9 rounded-md border border-border/60 bg-background px-2 text-sm text-foreground outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring",
          disabled ? "opacity-60" : "",
        )}
      >
        <option value="">All</option>
        {merged.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
