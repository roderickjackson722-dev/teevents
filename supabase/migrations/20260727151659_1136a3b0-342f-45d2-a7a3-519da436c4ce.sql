CREATE POLICY "Public can upload league member photos"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'sponsorship-assets' AND (storage.foldername(name))[1] = 'league-member-photos');

CREATE POLICY "Authenticated can update league member photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'sponsorship-assets' AND (storage.foldername(name))[1] = 'league-member-photos');