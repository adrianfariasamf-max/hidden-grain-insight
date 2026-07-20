
-- =========================================================
-- HIDDEN GRAIN — canonical persistence (EPIC-005.0)
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- shared updated_at trigger
CREATE OR REPLACE FUNCTION public.hg_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------
-- knowledge_objects
-- ---------------------------------------------------------
CREATE TABLE public.knowledge_objects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  type         TEXT NOT NULL,
  category     TEXT NOT NULL,
  status       TEXT NOT NULL,
  summary      TEXT NOT NULL DEFAULT '' CHECK (char_length(summary) <= 2000),
  keywords     TEXT[] NOT NULL DEFAULT '{}',
  tags         TEXT[] NOT NULL DEFAULT '{}',
  version      TEXT NOT NULL DEFAULT '1',
  path         TEXT NOT NULL DEFAULT '',
  checksum     TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_objects TO authenticated;
GRANT SELECT ON public.knowledge_objects TO anon;
GRANT ALL ON public.knowledge_objects TO service_role;

ALTER TABLE public.knowledge_objects ENABLE ROW LEVEL SECURITY;

-- MVP RLS: reads are public, writes are server-only (service_role bypasses RLS).
-- When auth arrives, tighten by adding owner_id and scoping policies to auth.uid().
CREATE POLICY "hg_objects_read_all"
  ON public.knowledge_objects FOR SELECT
  USING (true);

CREATE INDEX hg_objects_type_idx     ON public.knowledge_objects (type);
CREATE INDEX hg_objects_category_idx ON public.knowledge_objects (category);
CREATE INDEX hg_objects_status_idx   ON public.knowledge_objects (status);
CREATE INDEX hg_objects_tags_gin     ON public.knowledge_objects USING GIN (tags);
CREATE INDEX hg_objects_keywords_gin ON public.knowledge_objects USING GIN (keywords);
CREATE INDEX hg_objects_title_trgm   ON public.knowledge_objects (lower(title));

CREATE TRIGGER hg_objects_touch
  BEFORE UPDATE ON public.knowledge_objects
  FOR EACH ROW EXECUTE FUNCTION public.hg_touch_updated_at();

-- ---------------------------------------------------------
-- relationships
-- ---------------------------------------------------------
CREATE TABLE public.relationships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_object_id  UUID NOT NULL REFERENCES public.knowledge_objects(id) ON DELETE CASCADE,
  target_object_id  UUID NOT NULL REFERENCES public.knowledge_objects(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,
  description       TEXT,
  resolved          BOOLEAN NOT NULL DEFAULT true,
  provenance        TEXT,
  confidence        NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- self-reference is allowed (represents recursive/current-object concepts)
  -- duplicate relationships of the same triple are forbidden.
  CONSTRAINT hg_rel_unique_triple UNIQUE (source_object_id, target_object_id, type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.relationships TO authenticated;
GRANT SELECT ON public.relationships TO anon;
GRANT ALL ON public.relationships TO service_role;

ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hg_rel_read_all"
  ON public.relationships FOR SELECT
  USING (true);

CREATE INDEX hg_rel_source_idx ON public.relationships (source_object_id);
CREATE INDEX hg_rel_target_idx ON public.relationships (target_object_id);
CREATE INDEX hg_rel_type_idx   ON public.relationships (type);

CREATE TRIGGER hg_rel_touch
  BEFORE UPDATE ON public.relationships
  FOR EACH ROW EXECUTE FUNCTION public.hg_touch_updated_at();

-- ---------------------------------------------------------
-- SEED — deterministic, stable IDs, only if empty
-- ---------------------------------------------------------
INSERT INTO public.knowledge_objects (id, title, type, category, status, summary, keywords, tags, version, path, checksum)
VALUES
  ('11111111-1111-4111-8111-111111111001', 'Hidden Grain Architecture', 'document', 'architecture', 'stable',
   'Overall system architecture for the Hidden Grain knowledge platform.',
   ARRAY['architecture','system'], ARRAY['core','reference'], '1.0.0', '/docs/architecture.md', 'sha256:seed001'),
  ('11111111-1111-4111-8111-111111111002', 'Knowledge Object Contract', 'spec', 'contract', 'stable',
   'Canonical wire contract for Knowledge Objects.',
   ARRAY['contract','spec'], ARRAY['core'], '1.0.0', '/docs/contract.md', 'sha256:seed002'),
  ('11111111-1111-4111-8111-111111111003', 'Relationship Ontology', 'spec', 'contract', 'stable',
   'Ontology of structural, dependency, semantic and provenance relationships.',
   ARRAY['ontology','relationships'], ARRAY['core'], '1.0.0', '/docs/ontology.md', 'sha256:seed003'),
  ('11111111-1111-4111-8111-111111111004', 'Explorer UI', 'component', 'frontend', 'stable',
   'Search and filtering UI over Knowledge Objects.',
   ARRAY['ui','explorer'], ARRAY['frontend'], '1.0.0', '/src/routes/explorer.tsx', 'sha256:seed004'),
  ('11111111-1111-4111-8111-111111111005', 'Graph View', 'component', 'frontend', 'stable',
   'Visualization of the knowledge graph.',
   ARRAY['ui','graph'], ARRAY['frontend'], '1.0.0', '/src/routes/graph.tsx', 'sha256:seed005'),
  ('11111111-1111-4111-8111-111111111006', 'Discovery Engine', 'engine', 'backend', 'beta',
   'Deterministic insight discovery over the knowledge graph.',
   ARRAY['discovery','insights'], ARRAY['engine'], '0.2.0', '/src/lib/domain/discovery', 'sha256:seed006'),
  ('11111111-1111-4111-8111-111111111007', 'API Client', 'module', 'frontend', 'stable',
   'Typed HTTP client with Zod validation, ETag cache and timeouts.',
   ARRAY['api','client'], ARRAY['frontend','core'], '1.1.0', '/src/lib/api/client.ts', 'sha256:seed007'),
  ('11111111-1111-4111-8111-111111111008', 'Persistence Layer', 'module', 'backend', 'beta',
   'Canonical Lovable Cloud persistence for knowledge objects and relationships.',
   ARRAY['persistence','database'], ARRAY['backend','core'], '0.1.0', '/supabase/migrations', 'sha256:seed008');

INSERT INTO public.relationships (source_object_id, target_object_id, type, description, resolved, provenance, confidence)
VALUES
  ('11111111-1111-4111-8111-111111111001', '11111111-1111-4111-8111-111111111002', 'defines',        'Architecture defines the contract',    true, 'seed', 1.0),
  ('11111111-1111-4111-8111-111111111001', '11111111-1111-4111-8111-111111111003', 'defines',        'Architecture defines the ontology',     true, 'seed', 1.0),
  ('11111111-1111-4111-8111-111111111002', '11111111-1111-4111-8111-111111111007', 'implemented_by', 'Contract implemented by API client',    true, 'seed', 0.95),
  ('11111111-1111-4111-8111-111111111003', '11111111-1111-4111-8111-111111111005', 'used_by',        'Ontology consumed by graph view',       true, 'seed', 0.9),
  ('11111111-1111-4111-8111-111111111004', '11111111-1111-4111-8111-111111111007', 'depends_on',     'Explorer depends on API client',        true, 'seed', 1.0),
  ('11111111-1111-4111-8111-111111111005', '11111111-1111-4111-8111-111111111007', 'depends_on',     'Graph depends on API client',           true, 'seed', 1.0),
  ('11111111-1111-4111-8111-111111111006', '11111111-1111-4111-8111-111111111005', 'analyzes',       'Discovery analyzes graph',              true, 'seed', 0.9),
  ('11111111-1111-4111-8111-111111111007', '11111111-1111-4111-8111-111111111008', 'depends_on',     'Client depends on persistence layer',   true, 'seed', 0.9),
  ('11111111-1111-4111-8111-111111111008', '11111111-1111-4111-8111-111111111001', 'realizes',       'Persistence realizes architecture',     true, 'seed', 0.85),
  ('11111111-1111-4111-8111-111111111006', '11111111-1111-4111-8111-111111111006', 'self_reference', 'Discovery is idempotent',               true, 'seed', 1.0);
