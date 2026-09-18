-- Enterprise section: flag events, store simplified enterprise settings, club roster

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS is_enterprise boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enterprise_event_type text,
  ADD COLUMN IF NOT EXISTS enterprise_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS tournaments_enterprise_idx
  ON public.tournaments (organization_id, is_enterprise);

CREATE TABLE IF NOT EXISTS public.enterprise_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  handicap_index numeric,
  ghin_number text,
  member_id text,
  tee_set text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enterprise_roster_org_idx ON public.enterprise_roster (organization_id, last_name);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_roster TO authenticated;
GRANT ALL ON public.enterprise_roster TO service_role;

ALTER TABLE public.enterprise_roster ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read roster" ON public.enterprise_roster;
CREATE POLICY "Org members read roster" ON public.enterprise_roster
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Org members insert roster" ON public.enterprise_roster;
CREATE POLICY "Org members insert roster" ON public.enterprise_roster
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Org members update roster" ON public.enterprise_roster;
CREATE POLICY "Org members update roster" ON public.enterprise_roster
  FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_org_member(organization_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Org members delete roster" ON public.enterprise_roster;
CREATE POLICY "Org members delete roster" ON public.enterprise_roster
  FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));