import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getRelationshipCategoryLabel,
  type RelationshipSummary,
  type RelationshipTypeStat,
} from "@/lib/domain";

interface RelationshipLegendProps {
  summary: RelationshipSummary;
  /** Above this count, the list collapses behind a "Show all" toggle so
   *  large ontologies do not push the graph below the fold. */
  collapseThreshold?: number;
}

/**
 * Ontology-driven legend for the Graph page. Renders one entry per
 * relationship type PRESENT in the current dataset. Never invents entries
 * for catalog types that are not observed. Icons + labels + a category
 * chip ensure information is not conveyed by color alone.
 */
export function RelationshipLegend({ summary, collapseThreshold = 8 }: RelationshipLegendProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = summary.types.length > collapseThreshold;
  const visibleTypes = useMemo(
    () => (isLong && !expanded ? summary.types.slice(0, collapseThreshold) : summary.types),
    [summary.types, isLong, expanded, collapseThreshold],
  );

  if (summary.total === 0) return null;

  return (
    <section
      aria-labelledby="graph-legend-heading"
      className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/40 p-3 sm:p-4"
    >
      <header className="flex items-baseline justify-between gap-2">
        <h3
          id="graph-legend-heading"
          className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
        >
          Relationship legend
        </h3>
        <span className="font-mono text-[10px] text-muted-foreground">
          {summary.types.length} type{summary.types.length === 1 ? "" : "s"}
          {summary.customTypeCount > 0 ? ` · ${summary.customTypeCount} custom` : ""}
        </span>
      </header>
      <ul className="flex flex-wrap gap-1.5">
        {visibleTypes.map((stat) => (
          <LegendItem key={stat.descriptor.id} stat={stat} />
        ))}
      </ul>
      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="inline-flex w-fit items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {expanded ? (
            <>
              <ChevronDown className="h-3 w-3" aria-hidden />
              Show fewer
            </>
          ) : (
            <>
              <ChevronRight className="h-3 w-3" aria-hidden />
              Show all {summary.types.length}
            </>
          )}
        </button>
      ) : null}
    </section>
  );
}

function LegendItem({ stat }: { stat: RelationshipTypeStat }) {
  const { descriptor, count } = stat;
  const Icon = descriptor.icon;
  return (
    <li
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px]",
      )}
      title={descriptor.description || descriptor.displayName}
      data-relationship-type={descriptor.id}
      data-relationship-category={descriptor.category}
      data-tone={descriptor.tone}
    >
      <Icon className="h-3 w-3 text-muted-foreground" aria-hidden />
      <span className="text-foreground">{descriptor.displayName}</span>
      <span
        className="rounded border border-border/60 px-1 py-px font-mono text-[9px] uppercase tracking-wide text-muted-foreground"
        aria-label={`Category ${getRelationshipCategoryLabel(descriptor.category)}`}
      >
        {getRelationshipCategoryLabel(descriptor.category)}
      </span>
      {descriptor.isCustom ? (
        <span
          className="rounded border border-warning/40 px-1 py-px text-[9px] uppercase tracking-wide text-warning"
          aria-label="Custom relationship type not in the official ontology"
        >
          Custom
        </span>
      ) : null}
      <span
        className="font-mono text-[10px] text-muted-foreground"
        aria-label={`${count} relationships`}
      >
        {count}
      </span>
    </li>
  );
}
