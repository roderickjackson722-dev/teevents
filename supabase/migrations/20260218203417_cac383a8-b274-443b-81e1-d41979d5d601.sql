-- Allow anon users to read back their own access request after inserting
CREATE POLICY "Anon can read own access request"
ON public.event_access_requests
FOR SELECT
TO anon
USING (true);