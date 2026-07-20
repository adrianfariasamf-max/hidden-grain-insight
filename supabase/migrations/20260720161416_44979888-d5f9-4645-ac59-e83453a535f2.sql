-- SECURITY REVIEW 001 — Cierre de exposiciones públicas (SR-003 a SR-008)
--
-- Estado previo: cada tabla tenía una política SELECT `USING (true)` para el
-- rol `public`, exponiendo TODO el contenido (tokens, respuestas, hidden_target,
-- borradores) al rol `anon` a través de la Data API (PostgREST).
--
-- La aplicación NO consume estas tablas desde el cliente: todas las lecturas
-- y escrituras pasan por rutas TSS `/api/*` que usan `supabaseAdmin`
-- (service_role, que BYPASSA RLS). Por lo tanto es seguro eliminar toda
-- política de lectura pública. Los flujos de participante, investigador,
-- preview, publicación, cierre y duplicación siguen operativos.

-- Perception domain
DROP POLICY IF EXISTS pe_read_all ON public.perception_experiments;
DROP POLICY IF EXISTS es_read_all ON public.experiment_stimuli;
DROP POLICY IF EXISTS ps_read_all ON public.participant_sessions;
DROP POLICY IF EXISTS sr_read_all ON public.stimulus_responses;

-- Knowledge domain (documentación / grafo internos)
DROP POLICY IF EXISTS hg_objects_read_all ON public.knowledge_objects;
DROP POLICY IF EXISTS hg_rel_read_all    ON public.relationships;

-- Revocación explícita a anon/authenticated para cerrar cualquier
-- privilegio heredado. service_role conserva acceso completo.
REVOKE ALL ON public.perception_experiments  FROM anon, authenticated;
REVOKE ALL ON public.experiment_stimuli      FROM anon, authenticated;
REVOKE ALL ON public.participant_sessions    FROM anon, authenticated;
REVOKE ALL ON public.stimulus_responses      FROM anon, authenticated;
REVOKE ALL ON public.knowledge_objects       FROM anon, authenticated;
REVOKE ALL ON public.relationships           FROM anon, authenticated;
REVOKE ALL ON public.system_settings         FROM anon, authenticated;

GRANT ALL ON public.perception_experiments  TO service_role;
GRANT ALL ON public.experiment_stimuli      TO service_role;
GRANT ALL ON public.participant_sessions    TO service_role;
GRANT ALL ON public.stimulus_responses      TO service_role;
GRANT ALL ON public.knowledge_objects       TO service_role;
GRANT ALL ON public.relationships           TO service_role;
GRANT ALL ON public.system_settings         TO service_role;

-- RLS ya está habilitado en las 7 tablas; sin políticas para anon/authenticated
-- todo acceso vía Data API queda denegado. Toda la aplicación sigue funcionando
-- porque las rutas /api/* usan el cliente service_role del servidor.
