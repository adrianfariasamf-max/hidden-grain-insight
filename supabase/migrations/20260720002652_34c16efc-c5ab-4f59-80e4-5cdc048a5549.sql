
CREATE POLICY "stimuli_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'experiment-stimuli');
