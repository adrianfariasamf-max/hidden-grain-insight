// Perception Experiment repository — server-only.
// Handles experiments, stimuli, sessions, responses. Uses service-role client;
// never import this file from the client bundle.

import { randomBytes } from "crypto";

import { supabaseAdmin } from "./db.server";
import { computePublishReadiness } from "@/lib/perception/schemas";
import type {
  UpdateExperimentRequest,
  UpdateStimulusRequest,
  CreateExperimentRequest,
  CreateSessionRequest,
  CreateStimulusRequest,
  ExperimentDetail,
  ExperimentResults,
  ExperimentStimulus,
  ParticipantSession,
  PerceptionExperiment,
  PublicExperiment,
  SessionSnapshot,
  SessionSummary,
  StimulusResponse,
  SubmitResponseRequest,
} from "@/lib/perception/types";
// Public projection: strip hiddenTarget before any payload leaves the server
// for participants. Every /sessions/* endpoint MUST route experiment data
// through this helper.
const toPublicExperiment = (e: PerceptionExperiment): PublicExperiment => {
  const { hiddenTarget: _omit, ...safe } = e;
  return safe;
};

// RR-013 · Methodological integrity guard. Once an experiment leaves the
// `draft` status its stimuli, hidden target, instructions and copy become
// immutable — otherwise the meaning of the collected responses changes
// mid-flight and cross-participant comparability is lost.
async function assertExperimentDraft(experimentId: string, action: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("perception_experiments")
    .select("status")
    .eq("id", experimentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Experiment not found.");
  if ((data as { status: string }).status !== "draft") {
    throw new Error(
      `Cannot ${action}: experiment is ${(data as { status: string }).status}. Only draft experiments can be modified.`,
    );
  }
}

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
  attention: string;
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

const toStimulus = (r: StimulusRow, viewUrl?: string): ExperimentStimulus => ({
  id: r.id,
  experimentId: r.experiment_id,
  position: r.position as 1 | 2 | 3,
  imageUrl: viewUrl ?? r.image_url,
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
  attention: r.attention ?? "",
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
    supabaseAdmin.from("experiment_stimuli").select("experiment_id").in("experiment_id", ids),
    supabaseAdmin.from("participant_sessions").select("experiment_id").in("experiment_id", ids),
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

export async function getExperimentDetail(id: string): Promise<ExperimentDetail | null> {
  const { data, error } = await supabaseAdmin
    .from("perception_experiments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const experiment = toExperiment(data as ExperimentRow);

  const [{ data: stim, error: se }, { count: sc }, { count: rc }] = await Promise.all([
    supabaseAdmin.from("experiment_stimuli").select("*").eq("experiment_id", id).order("position"),
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
  const rows = (stim ?? []) as StimulusRow[];
  const stimuli = await Promise.all(
    rows.map(async (r) => toStimulus(r, await signStimulusReadUrl(r.image_path))),
  );

  return {
    experiment,
    stimuli,
    sessionCount: sc ?? 0,
    responseCount: rc ?? 0,
    publishReadiness: computePublishReadiness(stimuli),
  };
}

export async function updateExperiment(
  id: string,
  input: UpdateExperimentRequest,
): Promise<PerceptionExperiment> {
  await assertExperimentDraft(id, "update experiment");
  const patch: Partial<{
    title: string;
    description: string;
    instructions: string;
    hidden_target: string;
  }> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.instructions !== undefined) patch.instructions = input.instructions;
  if (input.hiddenTarget !== undefined) patch.hidden_target = input.hiddenTarget;
  if (Object.keys(patch).length === 0) {
    const detail = await getExperimentDetail(id);
    if (!detail) throw new Error("Experiment not found.");
    return detail.experiment;
  }
  const { data, error } = await supabaseAdmin
    .from("perception_experiments")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return toExperiment(data as ExperimentRow);
}

export async function updateStimulus(
  experimentId: string,
  stimulusId: string,
  input: UpdateStimulusRequest,
): Promise<ExperimentStimulus> {
  await assertExperimentDraft(experimentId, "update stimulus");
  const patch: Partial<{ alt_text: string; image_url: string; image_path: string }> = {};
  if (input.altText !== undefined) patch.alt_text = input.altText;
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl;
  if (input.imagePath !== undefined) patch.image_path = input.imagePath;
  if (Object.keys(patch).length === 0) throw new Error("No fields to update.");
  const { data, error } = await supabaseAdmin
    .from("experiment_stimuli")
    .update(patch)
    .eq("id", stimulusId)
    .eq("experiment_id", experimentId)
    .select("*")
    .single();
  if (error) throw error;
  const row = data as StimulusRow;
  return toStimulus(row, await signStimulusReadUrl(row.image_path));
}

export async function deleteStimulus(
  experimentId: string,
  stimulusId: string,
): Promise<{ deleted: true }> {
  await assertExperimentDraft(experimentId, "delete stimulus");
  const { data: existing, error: qe } = await supabaseAdmin
    .from("experiment_stimuli")
    .select("image_path")
    .eq("id", stimulusId)
    .eq("experiment_id", experimentId)
    .maybeSingle();
  if (qe) throw qe;
  const { error } = await supabaseAdmin
    .from("experiment_stimuli")
    .delete()
    .eq("id", stimulusId)
    .eq("experiment_id", experimentId);
  if (error) throw error;
  if (existing?.image_path) {
    await supabaseAdmin.storage
      .from("experiment-stimuli")
      .remove([existing.image_path])
      .catch(() => undefined);
  }
  return { deleted: true };
}

export async function addStimulus(
  experimentId: string,
  input: CreateStimulusRequest,
): Promise<ExperimentStimulus> {
  await assertExperimentDraft(experimentId, "add stimulus");
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

export async function publishExperiment(id: string): Promise<PerceptionExperiment> {
  const detail = await getExperimentDetail(id);
  if (!detail) throw new Error("Experiment not found.");
  if (detail.experiment.status !== "draft") {
    throw new Error(`Only draft experiments can be published (current: ${detail.experiment.status}).`);
  }
  if (!detail.publishReadiness.ready) {
    throw new Error(`Cannot publish: ${detail.publishReadiness.reasons.join(" ")}`);
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

// RR-011 · Close a published experiment. Closing stops accepting new
// participant sessions but preserves every collected response. Closing is
// irreversible from the UI — a new run must be created via duplicate.
export async function closeExperiment(id: string): Promise<PerceptionExperiment> {
  const detail = await getExperimentDetail(id);
  if (!detail) throw new Error("Experiment not found.");
  if (detail.experiment.status !== "published") {
    throw new Error(
      `Only published experiments can be closed (current: ${detail.experiment.status}).`,
    );
  }
  const { data, error } = await supabaseAdmin
    .from("perception_experiments")
    .update({ status: "closed" })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return toExperiment(data as ExperimentRow);
}

// RR-014 · Duplicate an experiment into a fresh draft. Copies title,
// description, instructions and hidden target, and clones every stimulus
// image object inside the private storage bucket so the original and the
// copy stay independent. Sessions and responses are never copied.
export async function duplicateExperiment(id: string): Promise<PerceptionExperiment> {
  const { data: src, error: qe } = await supabaseAdmin
    .from("perception_experiments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (qe) throw qe;
  if (!src) throw new Error("Experiment not found.");
  const source = toExperiment(src as ExperimentRow);

  const { data: created, error: ce } = await supabaseAdmin
    .from("perception_experiments")
    .insert({
      title: `${source.title} (copia)`,
      description: source.description,
      hidden_target: source.hiddenTarget,
      instructions: source.instructions,
      status: "draft",
    })
    .select("*")
    .single();
  if (ce) throw ce;
  const copy = toExperiment(created as ExperimentRow);

  const { data: stimRows, error: se } = await supabaseAdmin
    .from("experiment_stimuli")
    .select("*")
    .eq("experiment_id", id)
    .order("position");
  if (se) throw se;

  for (const row of (stimRows ?? []) as StimulusRow[]) {
    const oldPath = row.image_path;
    const filename = oldPath.split("/").pop() ?? `${Date.now()}.bin`;
    const newPath = `${copy.id}/${Date.now()}_${filename}`;
    // Best-effort copy in the private bucket. If the object is missing we
    // still create the row without an image so the researcher can re-upload.
    if (oldPath) {
      await supabaseAdmin.storage
        .from("experiment-stimuli")
        .copy(oldPath, newPath)
        .catch(() => undefined);
    }
    const { error: ie } = await supabaseAdmin.from("experiment_stimuli").insert({
      experiment_id: copy.id,
      position: row.position,
      image_url: "",
      image_path: oldPath ? newPath : "",
      alt_text: row.alt_text,
      display_duration_seconds: row.display_duration_seconds,
    });
    if (ie) throw ie;
  }

  return copy;
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
      metadata: (input.metadata ?? {}) as never,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toSession(data as SessionRow);
}

export async function getSessionByToken(token: string): Promise<SessionSnapshot | null> {
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
  const { data: rr, error: re } = await supabaseAdmin
    .from("stimulus_responses")
    .select("*")
    .eq("session_id", session.id);
  if (re) throw re;
  const responses = ((rr ?? []) as ResponseRow[]).map(toResponse);
  return {
    session,
    experiment: toPublicExperiment(detail.experiment),
    stimuli: detail.stimuli,
    responses,
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

export async function completeSession(token: string): Promise<ParticipantSession> {
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
      attention: input.attention,
      feeling: input.feeling,
      interpretation: input.interpretation,
      discovered_hidden_element: input.discoveredHiddenElement ?? false,
      discovered_text: input.discoveredText ?? null,
      confidence: input.confidence ?? null,
      metadata: (input.metadata ?? {}) as never,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toResponse(data as ResponseRow);
}

export async function getSessionResponses(token: string): Promise<StimulusResponse[]> {
  const { data: sess, error: se } = await supabaseAdmin
    .from("participant_sessions")
    .select("id")
    .eq("public_token", token)
    .maybeSingle();
  if (se) throw se;
  if (!sess) return [];
  const { data, error } = await supabaseAdmin
    .from("stimulus_responses")
    .select("*")
    .eq("session_id", (sess as { id: string }).id)
    .order("submitted_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as ResponseRow[]).map(toResponse);
}

export async function listSessionsForExperiment(experimentId: string): Promise<SessionSummary[]> {
  const { data, error } = await supabaseAdmin
    .from("participant_sessions")
    .select("*")
    .eq("experiment_id", experimentId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const sessions = ((data ?? []) as SessionRow[]).map(toSession);
  if (sessions.length === 0) return [];
  const ids = sessions.map((s) => s.id);
  // RR-010 · Join with stimulus positions so we can compute the highest
  // stimulus reached and the last-response timestamp for abandoned sessions.
  const { data: rr, error: re } = await supabaseAdmin
    .from("stimulus_responses")
    .select("session_id, submitted_at, stimulus:experiment_stimuli!inner(position)")
    .in("session_id", ids);
  if (re) throw re;
  const counts = new Map<string, number>();
  const maxPos = new Map<string, number>();
  const lastAt = new Map<string, string>();
  for (const row of (rr ?? []) as Array<{
    session_id: string;
    submitted_at: string;
    stimulus: { position: number } | { position: number }[] | null;
  }>) {
    counts.set(row.session_id, (counts.get(row.session_id) ?? 0) + 1);
    const stim = Array.isArray(row.stimulus) ? row.stimulus[0] : row.stimulus;
    const pos = stim?.position ?? 0;
    if (pos > (maxPos.get(row.session_id) ?? 0)) maxPos.set(row.session_id, pos);
    const prev = lastAt.get(row.session_id);
    if (!prev || row.submitted_at > prev) lastAt.set(row.session_id, row.submitted_at);
  }
  return sessions.map((s) => {
    const start = s.startedAt ?? s.createdAt;
    const end = s.completedAt ?? lastAt.get(s.id) ?? null;
    let durationMs: number | null = null;
    if (start && end) {
      const a = new Date(start).getTime();
      const b = new Date(end).getTime();
      if (!Number.isNaN(a) && !Number.isNaN(b)) durationMs = Math.max(0, b - a);
    }
    return {
      session: s,
      responseCount: counts.get(s.id) ?? 0,
      lastPositionReached: maxPos.get(s.id) ?? null,
      durationMs,
    };
  });
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
  return {
    uploadUrl: data.signedUrl,
    imagePath: path,
    // The object does not exist yet; read URL is re-signed on every detail fetch.
    imageUrl: "",
    token: data.token,
  };
}

// Signed download URL for private bucket. TTL is long enough for a working
// research session (2 hours). Re-signed on every experiment detail fetch.
export async function signStimulusReadUrl(path: string): Promise<string> {
  if (!path) return "";
  const { data, error } = await supabaseAdmin.storage
    .from("experiment-stimuli")
    .createSignedUrl(path, 60 * 60 * 2);
  if (error || !data) return "";
  return data.signedUrl;
}
