
-- Fix user_roles: drop restrictive-only policy and create a proper PERMISSIVE one
DROP POLICY IF EXISTS "Admins can view roles" ON public.user_roles;

CREATE POLICY "Users can view own role"
  ON public.user_roles
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Also fix event_resources admin read to use has_role (SECURITY DEFINER) again
DROP POLICY IF EXISTS "Admins can read resources" ON public.event_resources;

CREATE POLICY "Admins can read resources"
  ON public.event_resources
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
