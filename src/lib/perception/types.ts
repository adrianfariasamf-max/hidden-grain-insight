// Canonical Perception Experiment domain types.
// Kept independent from the Knowledge Object contract — do NOT reuse
// KnowledgeObject as a substitute (EPIC-006.0 owner decision).

export type ExperimentStatus = "draft" | "published" | "closed";
export type SessionStatus = "pending" | "in_progress" | "completed" | "abandoned";

export interface PerceptionExperiment {
  id: string;
  title: string;
  description: string;
  status: ExperimentStatus;
  hiddenTarget: string;
  instructions: string;
  createdAt: string;
  updatedAt: string;
}

// Public-safe projection: NEVER contains hiddenTarget.
// Used for every payload delivered to the participant.
export type PublicExperiment = Omit<PerceptionExperiment, "hiddenTarget">;

export interface ExperimentStimulus {
  id: string;
  experimentId: string;
  position: 1 | 2 | 3;
  imageUrl: string;
  imagePath: string;
  altText: string;
  displayDurationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantSession {
  id: string;
  experimentId: string;
  publicToken: string;
  status: SessionStatus;
  startedAt: string | null;
  completedAt: string | null;
  consentAcceptedAt: string | null;
  participantAlias: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface StimulusResponse {
  id: string;
  sessionId: string;
  stimulusId: string;
  firstViewedAt: string | null;
  submittedAt: string;
  responseTimeMs: number | null;
  observation: string;
  attention: string;
  feeling: string;
  interpretation: string;
  discoveredHiddenElement: boolean;
  discoveredText: string | null;
  confidence: number | null;
  metadata: Record<string, unknown>;
}

export interface ExperimentDetail {
  experiment: PerceptionExperiment;
  stimuli: ExperimentStimulus[];
  sessionCount: number;
  responseCount: number;
  publishReadiness: PublishReadiness;
}

export interface PublishReadiness {
  ready: boolean;
  stimulusCount: number;
  missingPositions: number[];
  reasons: string[];
}

export interface ExperimentResults {
  experimentId: string;
  sessions: ParticipantSession[];
  responses: StimulusResponse[];
}

// -------- Write requests --------
export interface CreateExperimentRequest {
  title: string;
  description?: string;
  hiddenTarget: string;
  instructions?: string;
}

export interface UpdateExperimentRequest {
  title?: string;
  description?: string;
  hiddenTarget?: string;
  instructions?: string;
}

export interface CreateStimulusRequest {
  position: 1 | 2 | 3;
  imageUrl: string;
  imagePath: string;
  altText?: string;
  displayDurationSeconds?: number | null;
}

export interface UpdateStimulusRequest {
  altText?: string;
  imageUrl?: string;
  imagePath?: string;
}

export interface SignUploadResponse {
  uploadUrl: string;
  imagePath: string;
  imageUrl: string;
  token: string;
}

export interface CreateSessionRequest {
  participantAlias?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ConsentRequest {
  acceptedAt?: string;
}

export interface SubmitResponseRequest {
  stimulusId: string;
  firstViewedAt?: string | null;
  observation: string;
  attention: string;
  feeling: string;
  interpretation: string;
  discoveredHiddenElement?: boolean;
  discoveredText?: string | null;
  confidence?: number | null;
  metadata?: Record<string, unknown>;
}

export interface SessionSummary {
  session: ParticipantSession;
  responseCount: number;
}

// Public snapshot returned by GET /sessions/:token
export interface SessionSnapshot {
  session: ParticipantSession;
  experiment: PublicExperiment;
  stimuli: ExperimentStimulus[];
  responses: StimulusResponse[];
}
