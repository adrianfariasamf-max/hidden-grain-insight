import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export type ResolutionFilter = "all" | "resolved" | "unresolved";

export interface GraphFilterValues {
  nodeType: string;
  edgeType: string;
  resolution: ResolutionFilter;
}

export interface GraphFilterOptions {
  nodeTypes: string[];
  edgeTypes: string[];
}

interface GraphFiltersProps {
  values: GraphFilterValues;
  options: GraphFilterOptions;
  onChange: (patch: Partial<GraphFilterValues>) => void;
  onClearAll: () => void;
  visibleNodes: number;
  visibleEdges: number;
}

/**
 * Local, in-memory filters over the projection returned by GET /graph.
 * Options are derived only from observed `nodes` / `edges` values —
 * the contract has no facet endpoint.
 */
export function GraphFilters({
  values,
  options,
  onChange,
  onClearAll,
  visibleNodes,
  visibleEdges,
}: GraphFiltersProps) {
  const hasAny = values.nodeType !== "" || values.edgeType !== "" || values.resolution !== "all";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <Select
          label="Node type"
          value={values.nodeType}
          options={options.nodeTypes}
          onChange={(v) => onChange({ nodeType: v })}
        />
        <Select
          label="Edge type"
          value={values.edgeType}
          options={options.edgeTypes}
          onChange={(v) => onChange({ edgeType: v })}
        />
        <label className="flex min-w-[9rem] flex-col gap-1 text-xs">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Resolution
          </span>
          <select
            value={values.resolution}
            onChange={(e) => onChange({ resolution: e.target.value as ResolutionFilter })}
            className="h-9 rounded-md border border-border/60 bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All</option>
            <option value="resolved">Resolved</option>
            <option value="unresolved">Unresolved</option>
          </select>
        </label>
        {hasAny ? (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex h-9 items-center gap-1 self-start rounded-md border border-border/60 bg-background px-3 text-xs text-muted-foreground transition-colors hover:text-foreground sm:self-end"
          >
            <X className="h-3 w-3" aria-hidden />
            Clear filters
          </button>
        ) : null}
      </div>
      <p className="text-[11px] text-muted-foreground" aria-live="polite">
        Showing <span className="font-mono text-foreground">{visibleNodes}</span> nodes ·{" "}
        <span className="font-mono text-foreground">{visibleEdges}</span> edges
      </p>
    </div>
  );
}

interface SelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function Select({ label, value, options, onChange }: SelectProps) {
  const merged = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <label className={cn("flex min-w-[9rem] flex-col gap-1 text-xs")}>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-border/60 bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
