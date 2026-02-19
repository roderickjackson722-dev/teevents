-- Allow anyone (public/anon) to read event resources directly
CREATE POLICY "Anyone can read event resources"
ON public.event_resources
FOR SELECT
TO anon
USING (true);

-- Also allow authenticated users who aren't admins
CREATE POLICY "Authenticated users can read event resources"
ON public.event_resources
FOR SELECT
TO authenticated
USING (true);