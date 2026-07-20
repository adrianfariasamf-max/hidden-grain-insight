// Zod schemas + pure invariant checks for the Perception Experiment domain.
// Domain rules live here (never inside React).

import { z } from "zod";

import type { ExperimentStimulus, PublishReadiness } from "./types";

export const REQUIRED_STIMULI = 3;
export const VALID_POSITIONS = [1, 2, 3] as const;

export const positionSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const experimentStatusSchema = z.enum(["draft", "published", "closed"]);
export const sessionStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "abandoned",
]);

export const createExperimentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  hiddenTarget: z.string().trim().min(1).max(200),
  instructions: z.string().max(2000).optional(),
});

export const createStimulusSchema = z.object({
  position: positionSchema,
  imageUrl: z.string().url(),
  imagePath: z.string().min(1),
  altText: z.string().max(500).optional(),
  displayDurationSeconds: z.number().positive().nullable().optional(),
});

export const createSessionSchema = z.object({
  participantAlias: z.string().max(120).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const consentSchema = z.object({
  acceptedAt: z.string().datetime().optional(),
});

export const submitResponseSchema = z.object({
  stimulusId: z.string().uuid(),
  firstViewedAt: z.string().datetime().nullable().optional(),
  observation: z.string().max(4000).default(""),
  feeling: z.string().max(4000).default(""),
  interpretation: z.string().max(4000).default(""),
  discoveredHiddenElement: z.boolean(),
  discoveredText: z.string().max(500).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ------- Pure invariants -------

/**
 * Compute the publish-readiness of an experiment given its current stimuli.
 * MVP rule: exactly 3 stimuli covering positions 1, 2, 3 (no repeats).
 */
export function computePublishReadiness(
  stimuli: ExperimentStimulus[],
): PublishReadiness {
  const reasons: string[] = [];
  const positions = new Set(stimuli.map((s) => s.position));
  const missing = VALID_POSITIONS.filter((p) => !positions.has(p));
  if (stimuli.length !== REQUIRED_STIMULI) {
    reasons.push(
      `Experiment requires exactly ${REQUIRED_STIMULI} stimuli (has ${stimuli.length}).`,
    );
  }
  if (positions.size !== stimuli.length) {
    reasons.push("Duplicate stimulus positions detected.");
  }
  if (missing.length > 0) {
    reasons.push(`Missing position(s): ${missing.join(", ")}.`);
  }
  return {
    ready: reasons.length === 0,
    stimulusCount: stimuli.length,
    missingPositions: missing,
    reasons,
  };
}

export function assertPositionAvailable(
  existing: ExperimentStimulus[],
  position: number,
): void {
  if (!VALID_POSITIONS.includes(position as 1 | 2 | 3)) {
    throw new Error(`Invalid position ${position}. Must be one of 1,2,3.`);
  }
  if (existing.some((s) => s.position === position)) {
    throw new Error(`Position ${position} already assigned.`);
  }
}