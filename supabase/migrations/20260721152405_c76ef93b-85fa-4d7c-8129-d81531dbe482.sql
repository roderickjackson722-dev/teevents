ALTER TABLE public.signup_vetting
  ADD COLUMN IF NOT EXISTS interest_area text,
  ADD COLUMN IF NOT EXISTS organization_name text,
  ADD COLUMN IF NOT EXISTS primary_goal text;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS workspace_type text NOT NULL DEFAULT 'tournament';

DROP POLICY IF EXISTS "Service role can insert vetting" ON public.signup_vetting;
CREATE POLICY "Service role can insert vetting"
  ON public.signup_vetting FOR INSERT
  TO service_role
  WITH CHECK (true);