DO $$ BEGIN CREATE TYPE public.handicap_source AS ENUM ('ghin','manual','none'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.enterprise_roster
  ADD COLUMN IF NOT EXISTS handicap_source public.handicap_source NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS handicap_last_updated timestamptz,
  ADD COLUMN IF NOT EXISTS low_handicap_index numeric(4,1);

ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS ghin_id text,
  ADD COLUMN IF NOT EXISTS handicap_source public.handicap_source NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS handicap_last_updated timestamptz,
  ADD COLUMN IF NOT EXISTS low_handicap_index numeric(4,1);

ALTER TABLE public.league_members
  ADD COLUMN IF NOT EXISTS ghin_id text,
  ADD COLUMN IF NOT EXISTS handicap_source public.handicap_source NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS handicap_last_updated timestamptz,
  ADD COLUMN IF NOT EXISTS low_handicap_index numeric(4,1);

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS handicap_allowance_percentage integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS course_rating numeric(4,1),
  ADD COLUMN IF NOT EXISTS slope_rating integer,
  ADD COLUMN IF NOT EXISTS handicap_sync_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.golf_leagues
  ADD COLUMN IF NOT EXISTS handicap_sync_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_roster_ghin ON public.enterprise_roster(organization_id, ghin_number);
CREATE INDEX IF NOT EXISTS idx_reg_ghin ON public.tournament_registrations(ghin_id);

CREATE TABLE IF NOT EXISTS public.course_handicaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.tournament_registrations(id) ON DELETE CASCADE,
  handicap_index numeric(4,1) NOT NULL,
  course_handicap integer NOT NULL,
  playing_handicap integer NOT NULL,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, player_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_handicaps TO authenticated;
GRANT ALL ON public.course_handicaps TO service_role;
ALTER TABLE public.course_handicaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage course handicaps" ON public.course_handicaps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = event_id AND public.is_org_member(auth.uid(), t.organization_id)))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = event_id AND public.is_org_member(auth.uid(), t.organization_id)));

CREATE TABLE IF NOT EXISTS public.handicap_index_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  league_member_id uuid REFERENCES public.league_members(id) ON DELETE CASCADE,
  roster_id uuid REFERENCES public.enterprise_roster(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES public.tournament_registrations(id) ON DELETE CASCADE,
  handicap_index numeric(4,1) NOT NULL,
  source public.handicap_source NOT NULL DEFAULT 'manual',
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hih_member ON public.handicap_index_history(league_member_id, recorded_at);
GRANT SELECT, INSERT ON public.handicap_index_history TO authenticated;
GRANT ALL ON public.handicap_index_history TO service_role;
ALTER TABLE public.handicap_index_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members read handicap history" ON public.handicap_index_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id)));
CREATE POLICY "Org members add handicap history" ON public.handicap_index_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id)));

CREATE TABLE IF NOT EXISTS public.handicap_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  scope text NOT NULL,
  target_id uuid,
  target_name text,
  triggered_by text NOT NULL DEFAULT 'manual',
  total integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  manual_remaining integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  pending boolean NOT NULL DEFAULT false,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hsl_created ON public.handicap_sync_logs(created_at DESC);
GRANT SELECT ON public.handicap_sync_logs TO authenticated;
GRANT ALL ON public.handicap_sync_logs TO service_role;
ALTER TABLE public.handicap_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members and admins read sync logs" ON public.handicap_sync_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id)));