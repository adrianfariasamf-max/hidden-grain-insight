// Typed client + TanStack Query helpers for the Perception Experiment API.
// Same base-URL rules as the Knowledge API client.

import { queryOptions } from "@tanstack/react-query";

import { API_BASE } from "@/lib/api/client";
import type {
  CreateExperimentRequest,
  CreateSessionRequest,
  CreateStimulusRequest,
  ExperimentDetail,
  ExperimentResults,
  ExperimentStimulus,
  ParticipantSession,
  PerceptionExperiment,
  SignUploadResponse,
  StimulusResponse,
  SubmitResponseRequest,
  UpdateExperimentRequest,
  UpdateStimulusRequest,
} from "./types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body || res.statusText}`);
  }
  return (await res.json()) as T;
}

export type ExperimentListItem = PerceptionExperiment & {
  stimulusCount: number;
  sessionCount: number;
};

export const experimentsApi = {
  list: async (signal?: AbortSignal) =>
    json<{ items: ExperimentListItem[] }>(await fetch(`${API_BASE}/experiments`, { signal })),
  detail: async (id: string, signal?: AbortSignal) =>
    json<ExperimentDetail>(await fetch(`${API_BASE}/experiments/${id}`, { signal })),
  create: async (input: CreateExperimentRequest) =>
    json<PerceptionExperiment>(
      await fetch(`${API_BASE}/experiments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    ),
  update: async (id: string, input: UpdateExperimentRequest) =>
    json<PerceptionExperiment>(
      await fetch(`${API_BASE}/experiments/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    ),
  addStimulus: async (id: string, input: CreateStimulusRequest) =>
    json<ExperimentStimulus>(
      await fetch(`${API_BASE}/experiments/${id}/stimuli`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    ),
  updateStimulus: async (id: string, stimulusId: string, input: UpdateStimulusRequest) =>
    json<ExperimentStimulus>(
      await fetch(`${API_BASE}/experiments/${id}/stimuli/${stimulusId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    ),
  deleteStimulus: async (id: string, stimulusId: string) =>
    json<{ deleted: true }>(
      await fetch(`${API_BASE}/experiments/${id}/stimuli/${stimulusId}`, {
        method: "DELETE",
      }),
    ),
  signUpload: async (id: string, filename: string, contentType?: string) =>
    json<SignUploadResponse>(
      await fetch(`${API_BASE}/experiments/${id}/stimuli/upload-url`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filename, contentType }),
      }),
    ),
  publish: async (id: string) =>
    json<PerceptionExperiment>(
      await fetch(`${API_BASE}/experiments/${id}/publish`, { method: "POST" }),
    ),
  createSession: async (id: string, input: CreateSessionRequest = {}) =>
    json<ParticipantSession>(
      await fetch(`${API_BASE}/experiments/${id}/sessions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    ),
  session: async (token: string, signal?: AbortSignal) =>
    json<{
      session: ParticipantSession;
      experiment: PerceptionExperiment;
      stimuli: ExperimentStimulus[];
    }>(await fetch(`${API_BASE}/sessions/${token}`, { signal })),
  acceptConsent: async (token: string) =>
    json<ParticipantSession>(
      await fetch(`${API_BASE}/sessions/${token}/consent`, { method: "POST" }),
    ),
  submitResponse: async (token: string, input: SubmitResponseRequest) =>
    json<StimulusResponse>(
      await fetch(`${API_BASE}/sessions/${token}/responses`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    ),
  completeSession: async (token: string) =>
    json<ParticipantSession>(
      await fetch(`${API_BASE}/sessions/${token}/complete`, { method: "POST" }),
    ),
  results: async (id: string, signal?: AbortSignal) =>
    json<ExperimentResults>(await fetch(`${API_BASE}/experiments/${id}/results`, { signal })),
};

export const experimentKeys = {
  all: ["perception"] as const,
  list: () => [...experimentKeys.all, "experiments"] as const,
  detail: (id: string) => [...experimentKeys.all, "experiment", id] as const,
  results: (id: string) => [...experimentKeys.all, "results", id] as const,
};

export const experimentListQuery = () =>
  queryOptions({
    queryKey: experimentKeys.list(),
    queryFn: ({ signal }) => experimentsApi.list(signal),
  });

export const experimentDetailQuery = (id: string) =>
  queryOptions({
    queryKey: experimentKeys.detail(id),
    queryFn: ({ signal }) => experimentsApi.detail(id, signal),
  });
