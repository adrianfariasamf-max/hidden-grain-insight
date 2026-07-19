import { memo } from "react";

import type { DiscoveryInsight } from "@/lib/domain/discovery";

import { InsightListItem } from "./InsightListItem";
import {
  WorkspaceFilters,
  type WorkspaceFiltersProps,
} from "./WorkspaceFilters";

export interface InsightListPanelProps extends WorkspaceFiltersProps {
  /** Already filtered AND sorted — the panel never reorders. */
  insights: readonly DiscoveryInsight[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function InsightListPanelImpl({
  insights,
  selectedId,
  onSelect,
  ...filterProps
}: InsightListPanelProps) {
  return (
    <aside
      aria-label="Insights"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/40"
    >
      <WorkspaceFilters {...filterProps} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {insights.length === 0 ? (
          <p className="p-4 text-center text-[11px] text-muted-foreground">
            No insights match the current filters.
          </p>
        ) : (
          <ul className="flex list-none flex-col gap-1 p-2">
            {insights.map((i) => (
              <InsightListItem
                key={i.id}
                insight={i}
                selected={i.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

export const InsightListPanel = memo(InsightListPanelImpl);