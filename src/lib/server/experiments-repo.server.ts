// Perception Experiment repository — server-only.
// Handles experiments, stimuli, sessions, responses. Uses service-role client;
// never import this file from the client bundle.

import { randomBytes } from "crypto";

import { supabaseAdmin } from "./db.server";
import { computePublishReadiness } from "@/lib/perception/schemas";
import type {
  CreateExperimentRequest,
  CreateSessionRequest,
  CreateStimulusRequest,
  ExperimentDetail,
  ExperimentResults,
  ExperimentStimulus,
  ParticipantSession,
  PerceptionExperiment,
  StimulusResponse,
  SubmitResponseRequest,
} from "@/lib/perception/types";

// ------------------- Mappers -------------------

interface ExperimentRow {
  id: string;
  title: string;
  description: string;
  status: string;
  hidden_target: string;
  instructions: string;
  created_at: string;
  updated_at: string;
}
interface StimulusRow {
  id: string;
  experiment_id: string;
  position: number;
  image_url: string;
  image_path: string;
  alt_text: string;
  display_duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}
interface SessionRow {
  id: string;
  experiment_id: string;
  public_token: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  consent_accepted_at: string | null;
  participant_alias: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}
interface ResponseRow {
  id: string;
  session_id: string;
  stimulus_id: string;
  first_viewed_at: string | null;
  submitted_at: string;
  response_time_ms: number | null;
  observation: string;
  feeling: string;
  interpretation: string;
  discovered_hidden_element: boolean;
  discovered_text: string | null;
  confidence: number | null;
  metadata: Record<string, unknown> | null;
}

const toExperiment = (r: ExperimentRow): PerceptionExperiment => ({
  id: r.id,
  title: r.title,
  description: r.description,
  status: r.status as PerceptionExperiment["status"],
  hiddenTarget: r.hidden_target,
  instructions: r.instructions,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toStimulus = (r: StimulusRow): ExperimentStimulus => ({
  id: r.id,
  experimentId: r.experiment_id,
  position: r.position as 1 | 2 | 3,
  imageUrl: r.image_url,
  imagePath: r.image_path,
  altText: r.alt_text,
  displayDurationSeconds: r.display_duration_seconds,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toSession = (r: SessionRow): ParticipantSession => ({
  id: r.id,
  experimentId: r.experiment_id,
  publicToken: r.public_token,
  status: r.status as ParticipantSession["status"],
  startedAt: r.started_at,
  completedAt: r.completed_at,
  consentAcceptedAt: r.consent_accepted_at,
  participantAlias: r.participant_alias,
  metadata: r.metadata ?? {},
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toResponse = (r: ResponseRow): StimulusResponse => ({
  id: r.id,
  sessionId: r.session_id,
  stimulusId: r.stimulus_id,
  firstViewedAt: r.first_viewed_at,
  submittedAt: r.submitted_at,
  responseTimeMs: r.response_time_ms,
  observation: r.observation,
  feeling: r.feeling,
  interpretation: r.interpretation,
  discoveredHiddenElement: r.discovered_hidden_element,
  discoveredText: r.discovered_text,
  confidence: r.confidence,
  metadata: r.metadata ?? {},
});

// ------------------- Experiments -------------------

export async function listExperiments(): Promise<
  Array<PerceptionExperiment & { stimulusCount: number; sessionCount: number }>
> {
  const { data, error } = await supabaseAdmin
    .from("perception_experiments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const experiments = (data ?? []).map((r) => toExperiment(r as ExperimentRow));
  if (experiments.length === 0) return [];

  const ids = experiments.map((e) => e.id);
  const [{ data: stim }, { data: sess }] = await Promise.all([
    supabaseAdmin
      .from("experiment_stimuli")
      .select("experiment_id")
      .in("experiment_id", ids),
    supabaseAdmin
      .from("participant_sessions")
      .select("experiment_id")
      .in("experiment_id", ids),
  ]);
  const stimCount = new Map<string, number>();
  for (const s of stim ?? [])
    stimCount.set(s.experiment_id, (stimCount.get(s.experiment_id) ?? 0) + 1);
  const sessCount = new Map<string, number>();
  for (const s of sess ?? [])
    sessCount.set(s.experiment_id, (sessCount.get(s.experiment_id) ?? 0) + 1);

  return experiments.map((e) => ({
    ...e,
    stimulusCount: stimCount.get(e.id) ?? 0,
    sessionCount: sessCount.get(e.id) ?? 0,
  }));
}

export async function createExperiment(
  input: CreateExperimentRequest,
): Promise<PerceptionExperiment> {
  const { data, error } = await supabaseAdmin
    .from("perception_experiments")
    .insert({
      title: input.title,
      description: input.description ?? "",
      hidden_target: input.hiddenTarget,
      instructions: input.instructions ?? "",
      status: "draft",
    })
    .select("*")
    .single();
  if (error) throw error;
  return toExperiment(data as ExperimentRow);
}

export async function getExperimentDetail(
  id: string,
): Promise<ExperimentDetail | null> {
  const { data, error } = await supabaseAdmin
    .from("perception_experiments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const experiment = toExperiment(data as ExperimentRow);

  const [{ data: stim, error: se }, { count: sc }, { count: rc }] =
    await Promise.all([
      supabaseAdmin
        .from("experiment_stimuli")
        .select("*")
        .eq("experiment_id", id)
        .order("position"),
      supabaseAdmin
        .from("participant_sessions")
        .select("id", { count: "exact", head: true })
        .eq("experiment_id", id),
      supabaseAdmin
        .from("stimulus_responses")
        .select("id,session:participant_sessions!inner(experiment_id)", {
          count: "exact",
          head: true,
        })
        .eq("session.experiment_id", id),
    ]);
  if (se) throw se;
  const stimuli = ((stim ?? []) as StimulusRow[]).map(toStimulus);

  return {
    experiment,
    stimuli,
    sessionCount: sc ?? 0,
    responseCount: rc ?? 0,
    publishReadiness: computePublishReadiness(stimuli),
  };
}

export async function addStimulus(
  experimentId: string,
  input: CreateStimulusRequest,
): Promise<ExperimentStimulus> {
  // Guard: cannot add >3 or duplicate positions; unique constraint enforces
  // uniqueness, but we return a friendly error for the count case.
  const { count } = await supabaseAdmin
    .from("experiment_stimuli")
    .select("id", { count: "exact", head: true })
    .eq("experiment_id", experimentId);
  if ((count ?? 0) >= 3) {
    throw new Error("Experiment already has 3 stimuli.");
  }
  const { data, error } = await supabaseAdmin
    .from("experiment_stimuli")
    .insert({
      experiment_id: experimentId,
      position: input.position,
      image_url: input.imageUrl,
      image_path: input.imagePath,
      alt_text: input.altText ?? "",
      display_duration_seconds: input.displayDurationSeconds ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toStimulus(data as StimulusRow);
}

export async function publishExperiment(
  id: string,
): Promise<PerceptionExperiment> {
  const detail = await getExperimentDetail(id);
  if (!detail) throw new Error("Experiment not found.");
  if (!detail.publishReadiness.ready) {
    throw new Error(
      `Cannot publish: ${detail.publishReadiness.reasons.join(" ")}`,
    );
  }
  const { data, error } = await supabaseAdmin
    .from("perception_experiments")
    .update({ status: "published" })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return toExperiment(data as ExperimentRow);
}

// ------------------- Sessions -------------------

function generatePublicToken(): string {
  return randomBytes(16).toString("hex");
}

export async function createSession(
  experimentId: string,
  input: CreateSessionRequest,
): Promise<ParticipantSession> {
  const detail = await getExperimentDetail(experimentId);
  if (!detail) throw new Error("Experiment not found.");
  if (detail.experiment.status !== "published") {
    throw new Error("Sessions can only be started for published experiments.");
  }
  const { data, error } = await supabaseAdmin
    .from("participant_sessions")
    .insert({
      experiment_id: experimentId,
      public_token: generatePublicToken(),
      status: "pending",
      participant_alias: input.participantAlias ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return toSession(data as SessionRow);
}

export async function getSessionByToken(
  token: string,
): Promise<{
  session: ParticipantSession;
  experiment: PerceptionExperiment;
  stimuli: ExperimentStimulus[];
} | null> {
  const { data, error } = await supabaseAdmin
    .from("participant_sessions")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const session = toSession(data as SessionRow);
  const detail = await getExperimentDetail(session.experimentId);
  if (!detail) return null;
  return {
    session,
    experiment: detail.experiment,
    stimuli: detail.stimuli,
  };
}

export async function acceptConsent(token: string): Promise<ParticipantSession> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("participant_sessions")
    .update({
      consent_accepted_at: now,
      started_at: now,
      status: "in_progress",
    })
    .eq("public_token", token)
    .select("*")
    .single();
  if (error) throw error;
  return toSession(data as SessionRow);
}

export async function completeSession(
  token: string,
): Promise<ParticipantSession> {
  const { data, error } = await supabaseAdmin
    .from("participant_sessions")
    .update({ completed_at: new Date().toISOString(), status: "completed" })
    .eq("public_token", token)
    .select("*")
    .single();
  if (error) throw error;
  return toSession(data as SessionRow);
}

// ------------------- Responses -------------------

export async function submitResponse(
  token: string,
  input: SubmitResponseRequest,
): Promise<StimulusResponse> {
  const { data: sess, error: se } = await supabaseAdmin
    .from("participant_sessions")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();
  if (se) throw se;
  if (!sess) throw new Error("Session not found.");
  const session = toSession(sess as SessionRow);

  // Verify stimulus belongs to same experiment
  const { data: stim, error: ste } = await supabaseAdmin
    .from("experiment_stimuli")
    .select("*")
    .eq("id", input.stimulusId)
    .maybeSingle();
  if (ste) throw ste;
  if (!stim) throw new Error("Stimulus not found.");
  if ((stim as StimulusRow).experiment_id !== session.experimentId) {
    throw new Error("Stimulus does not belong to session experiment.");
  }

  const submittedAt = new Date();
  const firstViewedAt = input.firstViewedAt ? new Date(input.firstViewedAt) : null;
  const responseTimeMs = firstViewedAt
    ? Math.max(0, submittedAt.getTime() - firstViewedAt.getTime())
    : null;

  const { data, error } = await supabaseAdmin
    .from("stimulus_responses")
    .insert({
      session_id: session.id,
      stimulus_id: input.stimulusId,
      first_viewed_at: input.firstViewedAt ?? null,
      submitted_at: submittedAt.toISOString(),
      response_time_ms: responseTimeMs,
      observation: input.observation,
      feeling: input.feeling,
      interpretation: input.interpretation,
      discovered_hidden_element: input.discoveredHiddenElement,
      discovered_text: input.discoveredText ?? null,
      confidence: input.confidence ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return toResponse(data as ResponseRow);
}

// ------------------- Results -------------------

export async function getExperimentResults(
  experimentId: string,
): Promise<ExperimentResults | null> {
  const detail = await getExperimentDetail(experimentId);
  if (!detail) return null;
  const { data: sess, error: se } = await supabaseAdmin
    .from("participant_sessions")
    .select("*")
    .eq("experiment_id", experimentId);
  if (se) throw se;
  const sessions = ((sess ?? []) as SessionRow[]).map(toSession);
  const sessionIds = sessions.map((s) => s.id);
  const responses: StimulusResponse[] = [];
  if (sessionIds.length > 0) {
    const { data: resp, error: re } = await supabaseAdmin
      .from("stimulus_responses")
      .select("*")
      .in("session_id", sessionIds);
    if (re) throw re;
    for (const r of resp ?? []) responses.push(toResponse(r as ResponseRow));
  }
  return { experimentId, sessions, responses };
}

// ------------------- Storage signed upload -------------------

export async function signStimulusUpload(
  experimentId: string,
  filename: string,
): Promise<{ uploadUrl: string; imagePath: string; imageUrl: string; token: string }> {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${experimentId}/${Date.now()}_${safe}`;
  const { data, error } = await supabaseAdmin.storage
    .from("experiment-stimuli")
    .createSignedUploadUrl(path);
  if (error) throw error;
  const { data: pub } = supabaseAdmin.storage
    .from("experiment-stimuli")
    .getPublicUrl(path);
  return {
    uploadUrl: data.signedUrl,
    imagePath: path,
    imageUrl: pub.publicUrl, // requires bucket public read policy (already granted)
    token: data.token,
  };
}