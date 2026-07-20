-- SR-006: eliminar política pública de storage.objects para stimuli.
-- El bucket 'experiment-stimuli' es privado; las lecturas se realizan por
-- URLs firmadas emitidas por el servidor (service_role), que no dependen
-- de esta política. La política actual permitía a anon leer cualquier
-- objeto del bucket vía la API de storage.
DROP POLICY IF EXISTS stimuli_public_read ON storage.objects;
