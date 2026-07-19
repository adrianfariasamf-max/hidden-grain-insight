// Compact trust badges: provenance + confidence.
//
// These renderers are strictly conditional — they render `null` when
// the underlying data is `undefined`. Callers can render them
// unconditionally; the DOM footprint stays zero on datasets that do
// not declare trust signals.

import { cn } from "@/lib/utils";
import {
  classifyConfidence,
  formatConfidencePercent,
  getConfidenceClassLabel,
  getConfidenceClassTone,
  getRelationshipProvenanceDescriptor,
} from "@/lib/domain";
import type { Relationship, RelationshipTone } from "@/lib/domain";

function toneClasses(tone: RelationshipTone): string {
  if (tone === "success") return "border-success/30 bg-success/10 text-success";
  if (tone === "warning") return "border-warning/30 bg-warning/10 text-warning";
  if (tone === "primary") return "border-primary/30 bg-primary/10 text-primary";
  return "border-border/60 bg-card/60 text-muted-foreground";
}

export function ProvenanceBadge({ relationship }: { relationship: Relationship }) {
  const descriptor = getRelationshipProvenanceDescriptor(relationship.provenance);
  if (!descriptor) return null;
  const Icon = descriptor.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide",
        toneClasses(descriptor.tone),
      )}
      title={descriptor.description || descriptor.displayName}
      data-relationship-provenance={descriptor.id}
      aria-label={`Provenance: ${descriptor.displayName}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {descriptor.displayName}
    </span>
  );
}

export function ConfidenceBadge({ relationship }: { relationship: Relationship }) {
  const pct = formatConfidencePercent(relationship.confidence);
  const cls = classifyConfidence(relationship.confidence);
  if (!pct || !cls) return null;
  const label = getConfidenceClassLabel(cls);
  const tone = getConfidenceClassTone(cls);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide",
        toneClasses(tone),
      )}
      title={`${label} confidence — ${pct}`}
      data-relationship-confidence-class={cls}
      aria-label={`${label} confidence, ${pct}`}
    >
      <span>{label}</span>
      <span className="opacity-70">·</span>
      <span>{pct}</span>
    </span>
  );
}
