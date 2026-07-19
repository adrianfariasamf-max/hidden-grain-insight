import { memo, useCallback } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DISCOVERY_ACTION_CATALOG,
  countActiveDiscoveryFilters,
  listInsightTypes,
  type DiscoveryFilters,
  type DiscoverySortMode,
  type InsightCategory,
  type InsightPriority,
  type InsightType,
} from "@/lib/domain/discovery";

const PRIORITY_OPTIONS: InsightPriority[] = ["critical", "high", "medium", "low", "info"];
const CATEGORY_OPTIONS: InsightCategory[] = [
  "connectivity",
  "structural",
  "quality",
  "topology",
  "custom",
];

const SORT_OPTIONS: { value: DiscoverySortMode; label: string }[] = [
  { value: "ranked", label: "Ranked" },
  { value: "score-desc", label: "Score ↓" },
  { value: "score-asc", label: "Score ↑" },
  { value: "type", label: "Type" },
];

export interface WorkspaceFiltersProps {
  filters: DiscoveryFilters;
  onFiltersChange: (next: DiscoveryFilters) => void;
  sort: DiscoverySortMode;
  onSortChange: (mode: DiscoverySortMode) => void;
  /** Filtered result count for the counter. */
  filteredCount: number;
  totalCount: number;
}

function toggleSet<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function WorkspaceFiltersImpl({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  filteredCount,
  totalCount,
}: WorkspaceFiltersProps) {
  const activeCount = countActiveDiscoveryFilters(filters);
  const typeCatalog = listInsightTypes();

  const handleQuery = useCallback(
    (value: string) => onFiltersChange({ ...filters, query: value }),
    [filters, onFiltersChange],
  );
  const handleClear = useCallback(
    () =>
      onFiltersChange({
        query: "",
        priorities: new Set(),
        categories: new Set(),
        types: new Set(),
      }),
    [onFiltersChange],
  );

  return (
    <div className="flex flex-col gap-3 border-b border-border/60 bg-card/40 p-3">
      <label className="relative flex items-center">
        <Search
          className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted-foreground"
          aria-hidden
        />
        <span className="sr-only">Search insights</span>
        <input
          type="search"
          value={filters.query}
          onChange={(e) => handleQuery(e.target.value)}
          placeholder="Search insights…"
          className="h-8 w-full rounded-md border border-border/60 bg-background pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <FilterGroup label="Priority">
        {PRIORITY_OPTIONS.map((p) => (
          <Chip
            key={p}
            active={filters.priorities.has(p)}
            onClick={() =>
              onFiltersChange({ ...filters, priorities: toggleSet(filters.priorities, p) })
            }
          >
            {p}
          </Chip>
        ))}
      </FilterGroup>

      <FilterGroup label="Category">
        {CATEGORY_OPTIONS.map((c) => (
          <Chip
            key={c}
            active={filters.categories.has(c)}
            onClick={() =>
              onFiltersChange({ ...filters, categories: toggleSet(filters.categories, c) })
            }
          >
            {c}
          </Chip>
        ))}
      </FilterGroup>

      <FilterGroup label="Type">
        {typeCatalog.map((t) => (
          <Chip
            key={t.id}
            active={filters.types.has(t.id as InsightType)}
            onClick={() =>
              onFiltersChange({
                ...filters,
                types: toggleSet(filters.types, t.id as InsightType),
              })
            }
            title={t.description}
          >
            {t.displayName}
          </Chip>
        ))}
      </FilterGroup>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-mono text-foreground">{filteredCount}</span>
          <span>of</span>
          <span className="font-mono">{totalCount}</span>
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              className="ml-1 inline-flex items-center gap-1 rounded text-muted-foreground hover:text-foreground"
              aria-label="Clear all filters"
            >
              <X className="h-3 w-3" aria-hidden />
              Clear
            </button>
          ) : null}
        </div>
        <div
          role="radiogroup"
          aria-label="Sort"
          className="flex items-center gap-1 rounded-md border border-border/60 bg-background p-0.5"
        >
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onSortChange(opt.value)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reserved future action surface — labels shown, no handlers. */}
      <div className="flex flex-wrap items-center gap-1 border-t border-border/40 pt-2 text-[10px] text-muted-foreground/70">
        <span className="font-mono uppercase tracking-wider">soon:</span>
        {DISCOVERY_ACTION_CATALOG.map((a) => (
          <span
            key={a.id}
            className="rounded border border-dashed border-border/50 px-1.5 py-0.5"
            title={a.description}
          >
            {a.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </legend>
      <div className="flex flex-wrap gap-1">{children}</div>
    </fieldset>
  );
}

function Chip({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
        active
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export const WorkspaceFilters = memo(WorkspaceFiltersImpl);