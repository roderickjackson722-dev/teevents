
-- Drop ALL existing policies on event_resources
DROP POLICY IF EXISTS "Resources readable by approved members" ON public.event_resources;
DROP POLICY IF EXISTS "Admins can manage resources" ON public.event_resources;
DROP POLICY IF EXISTS "Admins can update resources" ON public.event_resources;
DROP POLICY IF EXISTS "Admins can delete resources" ON public.event_resources;

-- Recreate as PERMISSIVE (explicitly)
CREATE POLICY "Resources readable by admins and approved members"
ON public.event_resources
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM event_access_requests
    WHERE event_access_requests.event_id = event_resources.event_id
    AND event_access_requests.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    AND event_access_requests.status = 'approved'::text
  )
);

CREATE POLICY "Admins can insert resources"
ON public.event_resources
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update resources"
ON public.event_resources
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete resources"
ON public.event_resources
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
