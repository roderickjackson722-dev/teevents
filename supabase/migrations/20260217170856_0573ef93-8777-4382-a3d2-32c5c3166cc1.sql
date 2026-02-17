
-- Fix approved_emails: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Admins can manage approved emails" ON public.approved_emails;

CREATE POLICY "Admins can manage approved emails"
  ON public.approved_emails
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix event_access_requests: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Admins can update requests" ON public.event_access_requests;
DROP POLICY IF EXISTS "Admins can view requests" ON public.event_access_requests;
DROP POLICY IF EXISTS "Anyone can request access" ON public.event_access_requests;

CREATE POLICY "Admins can view requests"
  ON public.event_access_requests
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update requests"
  ON public.event_access_requests
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can request access"
  ON public.event_access_requests
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (true);
