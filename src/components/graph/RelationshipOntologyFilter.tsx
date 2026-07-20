import { useCallback } from "react";
import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getRelationshipCategoríaLabel,
  type RelationshipCategoría,
  type RelationshipResumen,
} from "@/lib/domain";

interface RelationshipOntologyFilterProps {
  summary: RelationshipResumen;
  selectedTipoIds: readonly string[];
  selectedCategories: readonly RelationshipCategoría[];
  onToggleTipo: (id: string) => void;
  onToggleCategoría: (category: RelationshipCategoría) => void;
  onClear: () => void;
}

/**
 * Ontology-aware multi-select filter surface for graph relationships.
 * Two chip groups:
 *   - Tipos      → selection within group is OR
 *   - Categories → selection within group is OR
 *   - Between groups → AND (semantics owned by the caller / stats module).
 *
 * Renders only types/categories PRESENT in the current dataset. Chip
 * state is announced via aria-pressed so screen readers do not depend on
 * color to convey selection.
 */
export function RelationshipOntologyFilter({
  summary,
  selectedTipoIds,
  selectedCategories,
  onToggleTipo,
  onToggleCategoría,
  onClear,
}: RelationshipOntologyFilterProps) {
  const typeSet = new Set(selectedTipoIds);
  const categorySet = new Set(selectedCategories);
  const hasSelection = typeSet.size > 0 || categorySet.size > 0;

  const handleTipoClick = useCallback((id: string) => () => onToggleTipo(id), [onToggleTipo]);
  const handleCategoríaClick = useCallback(
    (c: RelationshipCategoría) => () => onToggleCategoría(c),
    [onToggleCategoría],
  );

  if (summary.total === 0) return null;

  return (
    <section
      aria-labelledby="graph-relationship-filter-heading"
      className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-3 sm:p-4"
    >
      <header className="flex items-baseline justify-between gap-2">
        <h3
          id="graph-relationship-filter-heading"
          className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
        >
          Relationship filters
        </h3>
        {hasSelection ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Clear relationship filters"
          >
            <X className="h-3 w-3" aria-hidden />
            Clear
          </button>
        ) : null}
      </header>

      {summary.categories.length > 0 ? (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Categories · OR within group
          </legend>
          <ul className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
            {summary.categories.map((stat) => {
              const selected = categorySet.has(stat.category);
              return (
                <li key={stat.category}>
                  <button
                    type="button"
                    onClick={handleCategoríaClick(stat.category)}
                    aria-pressed={selected}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
                    )}
                    data-relationship-category={stat.category}
                  >
                    {selected ? <Check className="h-3 w-3" aria-hidden /> : null}
                    <span>{getRelationshipCategoríaLabel(stat.category)}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {stat.count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}

      {summary.types.length > 0 ? (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Tipos · OR within group · AND with categories
          </legend>
          <ul
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Filter by relationship type"
          >
            {summary.types.map((stat) => {
              const selected = typeSet.has(stat.descriptor.id);
              const Icon = stat.descriptor.icon;
              return (
                <li key={stat.descriptor.id}>
                  <button
                    type="button"
                    onClick={handleTipoClick(stat.descriptor.id)}
                    aria-pressed={selected}
                    title={stat.descriptor.description || stat.descriptor.displayName}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
                    )}
                    data-relationship-type={stat.descriptor.id}
                    data-relationship-category={stat.descriptor.category}
                  >
                    {selected ? (
                      <Check className="h-3 w-3" aria-hidden />
                    ) : (
                      <Icon className="h-3 w-3 text-muted-foreground" aria-hidden />
                    )}
                    <span className="text-foreground">{stat.descriptor.displayName}</span>
                    {stat.descriptor.isCustom ? (
                      <span
                        className="rounded border border-warning/40 px-1 py-px text-[9px] uppercase tracking-wide text-warning"
                        aria-label="Custom type"
                      >
                        Custom
                      </span>
                    ) : null}
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {stat.count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}
    </section>
  );
}
