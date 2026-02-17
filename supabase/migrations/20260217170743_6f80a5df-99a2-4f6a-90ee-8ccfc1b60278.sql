
-- Drop ALL existing policies on event_resources
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'event_resources' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.event_resources', pol.policyname);
  END LOOP;
END $$;

-- Recreate with explicit TO authenticated and direct UID check for admin
CREATE POLICY "Admins can read resources"
  ON public.event_resources
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role)
  );

CREATE POLICY "Approved members can read resources"
  ON public.event_resources
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM event_access_requests
    WHERE event_access_requests.event_id = event_resources.event_id
      AND event_access_requests.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
      AND event_access_requests.status = 'approved'
  ));

CREATE POLICY "Admins can insert resources"
  ON public.event_resources
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update resources"
  ON public.event_resources
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete resources"
  ON public.event_resources
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
