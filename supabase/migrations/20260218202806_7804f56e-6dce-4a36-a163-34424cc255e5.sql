-- Allow anonymous (unauthenticated) users to insert access requests
CREATE POLICY "Anyone can request event access"
ON public.event_access_requests
FOR INSERT
TO anon
WITH CHECK (true);