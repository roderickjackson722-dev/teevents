
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

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admins can read resources"
  ON public.event_resources FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Approved members can read resources"
  ON public.event_resources FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM event_access_requests
    WHERE event_access_requests.event_id = event_resources.event_id
      AND event_access_requests.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
      AND event_access_requests.status = 'approved'
  ));

CREATE POLICY "Admins can insert resources"
  ON public.event_resources FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update resources"
  ON public.event_resources FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete resources"
  ON public.event_resources FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
