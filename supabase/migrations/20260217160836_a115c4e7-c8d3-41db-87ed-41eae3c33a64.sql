
-- Drop the restrictive SELECT policy
DROP POLICY "Resources readable by approved members" ON public.event_resources;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Resources readable by approved members"
ON public.event_resources
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM event_access_requests
    WHERE event_access_requests.event_id = event_resources.event_id
    AND event_access_requests.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    AND event_access_requests.status = 'approved'::text
  )
);

-- Also fix the other restrictive policies on event_resources to be permissive
DROP POLICY "Admins can manage resources" ON public.event_resources;
CREATE POLICY "Admins can manage resources"
ON public.event_resources
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "Admins can update resources" ON public.event_resources;
CREATE POLICY "Admins can update resources"
ON public.event_resources
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "Admins can delete resources" ON public.event_resources;
CREATE POLICY "Admins can delete resources"
ON public.event_resources
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
