// Trust filter surface for the Graph page (EPIC-002.5).
//
// Renders conditionally:
//   - provenance chip group  → only when the dataset declares provenance
//   - status chip group      → only when >1 distinct status is observed
//     (single-value status is a technical invariant already covered by
//     the dedicated resolution filter)
//   - confidence threshold   → only when the dataset declares confidence
//
// Selection semantics (owned by the caller / stats module):
//   - within provenances       → OR
//   - within statuses          → OR
//   - between groups           → AND
//   - minimum confidence       → AND
//
// The component itself is presentational; it never fabricates values.

import { useCallback, useId } from "react";
import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getConfidenceClassLabel,
  PROVENANCE_NOT_SPECIFIED,
  type ProvenanceFilterValue,
  type RelationshipStatus,
  type RelationshipTrustSummary,
} from "@/lib/domain";

interface RelationshipTrustFilterProps {
  summary: RelationshipTrustSummary;
  selectedProvenances: readonly ProvenanceFilterValue[];
  selectedStatuses: readonly RelationshipStatus[];
  /** Minimum confidence in percentage points (0..100). 0 = no threshold. */
  minConfidencePct: number;
  /** How relationships without a declared confidence are treated when
   *  the threshold is > 0. */
  unknownConfidencePolicy: "include" | "exclude";
  onToggleProvenance: (id: ProvenanceFilterValue) => void;
  onToggleStatus: (id: RelationshipStatus) => void;
  onChangeMinConfidence: (pct: number) => void;
  onChangeUnknownPolicy: (policy: "include" | "exclude") => void;
  onClear: () => void;
}

export function RelationshipTrustFilter({
  summary,
  selectedProvenances,
  selectedStatuses,
  minConfidencePct,
  unknownConfidencePolicy,
  onToggleProvenance,
  onToggleStatus,
  onChangeMinConfidence,
  onChangeUnknownPolicy,
  onClear,
}: RelationshipTrustFilterProps) {
  const sliderId = useId();
  const provSet = new Set<string>(selectedProvenances);
  const statusSet = new Set<string>(selectedStatuses);

  const showProvenance = summary.hasProvenance;
  const showStatus = summary.hasMeaningfulStatus;
  const showConfidence = summary.hasConfidence;

  const handleProvenance = useCallback(
    (id: ProvenanceFilterValue) => () => onToggleProvenance(id),
    [onToggleProvenance],
  );
  const handleStatus = useCallback(
    (id: RelationshipStatus) => () => onToggleStatus(id),
    [onToggleStatus],
  );

  if (!showProvenance && !showStatus && !showConfidence) return null;

  const thresholdActive = minConfidencePct > 0;
  const hasSelection = provSet.size > 0 || statusSet.size > 0 || thresholdActive;

  return (
    <section
      aria-labelledby="graph-trust-filter-heading"
      className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-3 sm:p-4"
    >
      <header className="flex items-baseline justify-between gap-2">
        <h3
          id="graph-trust-filter-heading"
          className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
        >
          Trust filters
        </h3>
        {hasSelection ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Clear trust filters"
          >
            <X className="h-3 w-3" aria-hidden />
            Clear
          </button>
        ) : null}
      </header>

      {showProvenance ? (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Provenance · OR within group
          </legend>
          <ul className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by provenance">
            {summary.provenances.map((stat) => {
              const selected = provSet.has(stat.descriptor.id);
              const Icon = stat.descriptor.icon;
              return (
                <li key={stat.descriptor.id}>
                  <button
                    type="button"
                    onClick={handleProvenance(stat.descriptor.id)}
                    aria-pressed={selected}
                    title={stat.descriptor.description || stat.descriptor.displayName}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
                    )}
                    data-relationship-provenance={stat.descriptor.id}
                  >
                    {selected ? (
                      <Check className="h-3 w-3" aria-hidden />
                    ) : (
                      <Icon className="h-3 w-3 text-muted-foreground" aria-hidden />
                    )}
                    <span className="text-foreground">{stat.descriptor.displayName}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {stat.count}
                    </span>
                  </button>
                </li>
              );
            })}
            {summary.withoutProvenance > 0 ? (
              <li>
                <button
                  type="button"
                  onClick={handleProvenance(PROVENANCE_NOT_SPECIFIED)}
                  aria-pressed={provSet.has(PROVENANCE_NOT_SPECIFIED)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    provSet.has(PROVENANCE_NOT_SPECIFIED)
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
                  )}
                  title="Relationships that did not declare a provenance."
                >
                  <span>Not specified</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {summary.withoutProvenance}
                  </span>
                </button>
              </li>
            ) : null}
          </ul>
        </fieldset>
      ) : null}

      {showStatus ? (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Status · OR within group
          </legend>
          <ul className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
            {summary.statuses.map((stat) => {
              const selected = statusSet.has(stat.descriptor.id);
              const Icon = stat.descriptor.icon;
              return (
                <li key={stat.descriptor.id}>
                  <button
                    type="button"
                    onClick={handleStatus(stat.descriptor.id)}
                    aria-pressed={selected}
                    title={stat.descriptor.description}
                    aria-label={stat.descriptor.accessibleLabel}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
                    )}
                    data-relationship-status={stat.descriptor.id}
                  >
                    {selected ? (
                      <Check className="h-3 w-3" aria-hidden />
                    ) : (
                      <Icon className="h-3 w-3 text-muted-foreground" aria-hidden />
                    )}
                    <span className="text-foreground">{stat.descriptor.displayName}</span>
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

      {showConfidence ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Minimum confidence · AND
          </legend>
          <label htmlFor={sliderId} className="flex flex-wrap items-center gap-3 text-[11px]">
            <input
              id={sliderId}
              type="range"
              min={0}
              max={100}
              step={5}
              value={minConfidencePct}
              onChange={(e) => onChangeMinConfidence(Number(e.target.value))}
              className="h-1 flex-1 min-w-[10rem] cursor-pointer accent-primary"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={minConfidencePct}
              aria-valuetext={`${minConfidencePct}% minimum confidence`}
            />
            <span className="font-mono text-xs text-foreground">≥ {minConfidencePct}%</span>
            {minConfidencePct > 0 ? (
              <span className="font-mono text-[10px] text-muted-foreground">
                {getConfidenceClassLabel(
                  minConfidencePct >= 85 ? "high" : minConfidencePct >= 60 ? "medium" : "low",
                )}{" "}
                threshold
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">No threshold</span>
            )}
          </label>
          {thresholdActive && summary.withoutConfidence > 0 ? (
            <fieldset
              className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"
              aria-label="How to treat relationships without confidence"
            >
              <legend className="sr-only">How to treat relationships without confidence</legend>
              <span>
                {summary.withoutConfidence} relationship
                {summary.withoutConfidence === 1 ? "" : "s"} without confidence:
              </span>
              <PolicyOption
                value="include"
                current={unknownConfidencePolicy}
                onSelect={onChangeUnknownPolicy}
                label="Include"
              />
              <PolicyOption
                value="exclude"
                current={unknownConfidencePolicy}
                onSelect={onChangeUnknownPolicy}
                label="Exclude"
              />
            </fieldset>
          ) : null}
        </fieldset>
      ) : null}
    </section>
  );
}

function PolicyOption({
  value,
  current,
  onSelect,
  label,
}: {
  value: "include" | "exclude";
  current: "include" | "exclude";
  onSelect: (v: "include" | "exclude") => void;
  label: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary/50 bg-primary/10 text-foreground"
          : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
