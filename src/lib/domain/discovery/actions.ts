// Workspace action surface (EPIC-004.3 — infrastructure only).
//
// This module reserves the vocabulary for future per-insight actions so
// the Workspace UI can be wired to a real store later without renaming
// props. NOTHING here is implemented: the current build is read-only and
// no action mutates state.
//
// Rules:
//   - Pure types + defaults only. No React, no I/O, no persistence.
//   - Adding a new action means extending `DiscoveryActionType` and the
//     descriptor catalog — never scattering strings across components.

import type { DiscoveryInsight } from "./types";

export type DiscoveryActionType =
  | "pin"
  | "bookmark"
  | "dismiss"
  | "assign"
  | "comment"
  | "feedback";

export interface DiscoveryActionDescriptor {
  id: DiscoveryActionType;
  label: string;
  /** Short human explanation for tooltips. */
  description: string;
  /** Reserved: whether the action mutates the graph. Always `false` for
   *  the read-only MVP. */
  mutating: boolean;
}

export const DISCOVERY_ACTION_CATALOG: readonly DiscoveryActionDescriptor[] = [
  { id: "pin", label: "Pin", description: "Keep this insight visible at the top.", mutating: false },
  {
    id: "bookmark",
    label: "Bookmark",
    description: "Save the insight for later review.",
    mutating: false,
  },
  {
    id: "dismiss",
    label: "Dismiss",
    description: "Remove the insight from the current session view.",
    mutating: false,
  },
  {
    id: "assign",
    label: "Assign",
    description: "Assign the insight to a collaborator.",
    mutating: false,
  },
  {
    id: "comment",
    label: "Comment",
    description: "Attach a note to the insight.",
    mutating: false,
  },
  {
    id: "feedback",
    label: "Feedback",
    description: "Report whether this insight was useful.",
    mutating: false,
  },
];

/** Per-insight action state — reserved. The Workspace reads this shape
 *  via `getInsightActionState`; today it always returns the neutral
 *  default so no action is ever considered active. */
export interface InsightActionState {
  pinned: boolean;
  bookmarked: boolean;
  dismissed: boolean;
  assigneeId?: string;
  commentCount: number;
  feedback?: "useful" | "not-useful";
}

export const NEUTRAL_INSIGHT_ACTION_STATE: InsightActionState = {
  pinned: false,
  bookmarked: false,
  dismissed: false,
  commentCount: 0,
};

/** Reserved lookup — always returns the neutral state today. Wired here
 *  so components can already depend on the accessor signature. */
export function getInsightActionState(_insight: DiscoveryInsight): InsightActionState {
  return NEUTRAL_INSIGHT_ACTION_STATE;
}