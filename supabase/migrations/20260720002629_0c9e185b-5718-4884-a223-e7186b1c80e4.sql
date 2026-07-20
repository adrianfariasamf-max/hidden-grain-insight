
-- Perception Experiment domain (EPIC-006.0)

CREATE TABLE public.perception_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed')),
  hidden_target text NOT NULL,
  instructions text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.perception_experiments TO anon, authenticated;
GRANT ALL ON public.perception_experiments TO service_role;
ALTER TABLE public.perception_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY pe_read_all ON public.perception_experiments FOR SELECT USING (true);
CREATE TRIGGER pe_touch BEFORE UPDATE ON public.perception_experiments
  FOR EACH ROW EXECUTE FUNCTION public.hg_touch_updated_at();

CREATE TABLE public.experiment_stimuli (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.perception_experiments(id) ON DELETE CASCADE,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 3),
  image_url text NOT NULL,
  image_path text NOT NULL,
  alt_text text NOT NULL DEFAULT '',
  display_duration_seconds numeric NULL CHECK (display_duration_seconds IS NULL OR display_duration_seconds > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (experiment_id, position)
);
GRANT SELECT ON public.experiment_stimuli TO anon, authenticated;
GRANT ALL ON public.experiment_stimuli TO service_role;
ALTER TABLE public.experiment_stimuli ENABLE ROW LEVEL SECURITY;
CREATE POLICY es_read_all ON public.experiment_stimuli FOR SELECT USING (true);
CREATE INDEX es_experiment_idx ON public.experiment_stimuli(experiment_id);
CREATE TRIGGER es_touch BEFORE UPDATE ON public.experiment_stimuli
  FOR EACH ROW EXECUTE FUNCTION public.hg_touch_updated_at();

CREATE TABLE public.participant_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.perception_experiments(id) ON DELETE CASCADE,
  public_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','abandoned')),
  started_at timestamptz NULL,
  completed_at timestamptz NULL,
  consent_accepted_at timestamptz NULL,
  participant_alias text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.participant_sessions TO anon, authenticated;
GRANT ALL ON public.participant_sessions TO service_role;
ALTER TABLE public.participant_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ps_read_all ON public.participant_sessions FOR SELECT USING (true);
CREATE INDEX ps_experiment_idx ON public.participant_sessions(experiment_id);
CREATE TRIGGER ps_touch BEFORE UPDATE ON public.participant_sessions
  FOR EACH ROW EXECUTE FUNCTION public.hg_touch_updated_at();

CREATE TABLE public.stimulus_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  stimulus_id uuid NOT NULL REFERENCES public.experiment_stimuli(id) ON DELETE CASCADE,
  first_viewed_at timestamptz NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  response_time_ms integer NULL CHECK (response_time_ms IS NULL OR response_time_ms >= 0),
  observation text NOT NULL DEFAULT '',
  feeling text NOT NULL DEFAULT '',
  interpretation text NOT NULL DEFAULT '',
  discovered_hidden_element boolean NOT NULL DEFAULT false,
  discovered_text text NULL,
  confidence numeric NULL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, stimulus_id)
);
GRANT SELECT ON public.stimulus_responses TO anon, authenticated;
GRANT ALL ON public.stimulus_responses TO service_role;
ALTER TABLE public.stimulus_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY sr_read_all ON public.stimulus_responses FOR SELECT USING (true);
CREATE INDEX sr_session_idx ON public.stimulus_responses(session_id);
CREATE INDEX sr_stimulus_idx ON public.stimulus_responses(stimulus_id);
CREATE TRIGGER sr_touch BEFORE UPDATE ON public.stimulus_responses
  FOR EACH ROW EXECUTE FUNCTION public.hg_touch_updated_at();

-- Seed CATA experiment (draft, no stimuli yet)
INSERT INTO public.perception_experiments (id, title, description, status, hidden_target, instructions)
VALUES (
  '00000000-0000-4000-8000-000000000cad',
  'CATA — Hidden Name Perception Study',
  'Perception study evaluating how participants describe three images of a wooden tray that conceal the name CATA.',
  'draft',
  'CATA',
  'Observe each image carefully. Describe what you see, what you feel, and how you interpret it.'
)
ON CONFLICT (id) DO NOTHING;
