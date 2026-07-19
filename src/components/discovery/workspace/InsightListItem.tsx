import { memo } from "react";

import { cn } from "@/lib/utils";
import type { DiscoveryInsight } from "@/lib/domain/discovery";
import { getInsightTypeDescriptor } from "@/lib/domain/discovery";

const PRIORITY_DOT: Record<DiscoveryInsight["priority"], string> = {
  critical: "bg-destructive",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-sky-500",
  info: "bg-muted-foreground",
};

export interface InsightListItemProps {
  insight: DiscoveryInsight;
  selected: boolean;
  onSelect: (id: string) => void;
}

function InsightListItemImpl({ insight, selected, onSelect }: InsightListItemProps) {
  const descriptor = getInsightTypeDescriptor(insight.type);
  const Icon = descriptor.icon;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(insight.id)}
        aria-pressed={selected}
        className={cn(
          "flex w-full flex-col gap-1 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected
            ? "border-primary/60 bg-primary/10"
            : "border-border/60 bg-card/40 hover:border-border hover:bg-card/70",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn("h-1.5 w-1.5 shrink-0 rounded-full", PRIORITY_DOT[insight.priority])}
            aria-hidden
          />
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {descriptor.displayName}
          </span>
          <span
            className="shrink-0 font-mono text-[10px] text-muted-foreground"
            title="Deterministic score, 0–100"
          >
            {Math.round(insight.score * 100)}
          </span>
        </div>
        <div className="flex items-center gap-2 pl-6 text-[10px] text-muted-foreground">
          <span className="font-mono uppercase tracking-wider">{insight.priority}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{descriptor.category}</span>
          <span aria-hidden>·</span>
          <span className="font-mono">{insight.objectIds.length} obj</span>
        </div>
      </button>
    </li>
  );
}

export const InsightListItem = memo(InsightListItemImpl);