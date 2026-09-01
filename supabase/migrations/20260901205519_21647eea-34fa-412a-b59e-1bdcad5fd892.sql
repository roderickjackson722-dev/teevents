-- 1. Tournament-level division/event structure
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS event_title TEXT,
  ADD COLUMN IF NOT EXISTS divisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scoring_rounds INTEGER NOT NULL DEFAULT 1;

-- 2. Teams
CREATE TABLE IF NOT EXISTS public.tournament_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  division_id TEXT,
  team_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tournament_teams_tournament_idx ON public.tournament_teams(tournament_id);

GRANT SELECT ON public.tournament_teams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_teams TO authenticated;
GRANT ALL ON public.tournament_teams TO service_role;

ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view teams for published tournaments"
  ON public.tournament_teams FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_teams.tournament_id AND t.site_published = true));

CREATE POLICY "Org members can manage teams"
  ON public.tournament_teams FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_teams.tournament_id AND public.is_org_member(auth.uid(), t.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_teams.tournament_id AND public.is_org_member(auth.uid(), t.organization_id)));

CREATE POLICY "Admins can manage teams"
  ON public.tournament_teams FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tournament_teams_updated_at
  BEFORE UPDATE ON public.tournament_teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Registration links + status metadata (status/wd_reason already exist)
ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS division_id TEXT,
  ADD COLUMN IF NOT EXISTS team_score_count INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS tournament_registrations_team_idx ON public.tournament_registrations(team_id);
CREATE INDEX IF NOT EXISTS tournament_registrations_division_idx ON public.tournament_registrations(tournament_id, division_id);

-- 4. Scoring admins (email + 6-digit passcode)
CREATE TABLE IF NOT EXISTS public.tournament_scoring_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  passcode TEXT NOT NULL,
  scoring_only BOOLEAN NOT NULL DEFAULT true,
  all_events BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  session_token UUID,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tournament_scoring_admins_org_idx ON public.tournament_scoring_admins(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_scoring_admins TO authenticated;
GRANT ALL ON public.tournament_scoring_admins TO service_role;

ALTER TABLE public.tournament_scoring_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage scoring admins"
  ON public.tournament_scoring_admins FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Platform admins can manage scoring admins"
  ON public.tournament_scoring_admins FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tournament_scoring_admins_updated_at
  BEFORE UPDATE ON public.tournament_scoring_admins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Passcode login + scoped scoring RPCs
CREATE OR REPLACE FUNCTION public.scoring_admin_login(_email TEXT, _code TEXT)
RETURNS TABLE (token UUID, admin_name TEXT, tournament_id UUID, all_events BOOLEAN, organization_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.tournament_scoring_admins;
  new_token UUID := gen_random_uuid();
BEGIN
  SELECT * INTO rec FROM public.tournament_scoring_admins a
   WHERE lower(a.email) = lower(trim(_email))
     AND a.passcode = trim(_code)
     AND a.is_active = true
   LIMIT 1;
  IF rec.id IS NULL THEN RETURN; END IF;
  UPDATE public.tournament_scoring_admins
     SET session_token = new_token, last_login_at = now()
   WHERE id = rec.id;
  RETURN QUERY SELECT new_token, rec.name, rec.tournament_id, rec.all_events, rec.organization_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.scoring_admin_context(_token UUID)
RETURNS public.tournament_scoring_admins
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.tournament_scoring_admins
   WHERE session_token = _token AND is_active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.scoring_admin_can_access(_token UUID, _tournament_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tournament_scoring_admins a
     JOIN public.tournaments t ON t.id = _tournament_id
    WHERE a.session_token = _token
      AND a.is_active = true
      AND (a.tournament_id = _tournament_id OR (a.all_events AND t.organization_id = a.organization_id))
  );
$$;

CREATE OR REPLACE FUNCTION public.scoring_admin_events(_token UUID)
RETURNS TABLE (id UUID, title TEXT, event_title TEXT, date DATE, divisions JSONB, scoring_rounds INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.title, t.event_title, t.date, t.divisions, t.scoring_rounds
    FROM public.tournaments t
    JOIN public.tournament_scoring_admins a ON a.session_token = _token AND a.is_active = true
   WHERE (a.tournament_id = t.id OR (a.all_events AND a.organization_id = t.organization_id))
   ORDER BY t.date NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.scoring_admin_roster(_token UUID, _tournament_id UUID)
RETURNS TABLE (
  registration_id UUID, first_name TEXT, last_name TEXT, status TEXT, status_reason TEXT,
  team_id UUID, team_name TEXT, division_id TEXT, group_number INTEGER, group_label TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.first_name, r.last_name, COALESCE(r.status, 'active'), r.status_reason,
         r.team_id, tt.team_name, r.division_id, r.group_number, r.group_label
    FROM public.tournament_registrations r
    LEFT JOIN public.tournament_teams tt ON tt.id = r.team_id
   WHERE r.tournament_id = _tournament_id
     AND public.scoring_admin_can_access(_token, _tournament_id)
   ORDER BY tt.team_name NULLS LAST, r.last_name, r.first_name;
$$;

CREATE OR REPLACE FUNCTION public.scoring_admin_scores(_token UUID, _tournament_id UUID)
RETURNS TABLE (registration_id UUID, round_number INTEGER, hole_number INTEGER, strokes INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.registration_id, COALESCE(s.round_number, 1), s.hole_number, s.strokes
    FROM public.tournament_scores s
   WHERE s.tournament_id = _tournament_id
     AND public.scoring_admin_can_access(_token, _tournament_id);
$$;

CREATE OR REPLACE FUNCTION public.scoring_admin_save_round(
  _token UUID, _tournament_id UUID, _registration_id UUID, _round_number INTEGER, _scores JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hole TEXT;
  val INTEGER;
BEGIN
  IF NOT public.scoring_admin_can_access(_token, _tournament_id) THEN
    RAISE EXCEPTION 'Not authorized for this event';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tournament_registrations r
                  WHERE r.id = _registration_id AND r.tournament_id = _tournament_id) THEN
    RAISE EXCEPTION 'Player not in this event';
  END IF;

  FOR hole IN SELECT jsonb_object_keys(_scores) LOOP
    val := NULLIF(_scores ->> hole, '')::INTEGER;
    IF val IS NULL THEN
      DELETE FROM public.tournament_scores
       WHERE tournament_id = _tournament_id AND registration_id = _registration_id
         AND COALESCE(round_number, 1) = _round_number AND hole_number = hole::INTEGER;
    ELSE
      IF val < 1 OR val > 20 THEN RAISE EXCEPTION 'Invalid strokes: %', val; END IF;
      INSERT INTO public.tournament_scores (tournament_id, registration_id, round_number, hole_number, strokes)
      VALUES (_tournament_id, _registration_id, _round_number, hole::INTEGER, val)
      ON CONFLICT (tournament_id, registration_id, hole_number, round_number)
        DO UPDATE SET strokes = EXCLUDED.strokes, updated_at = now();
    END IF;
  END LOOP;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.scoring_admin_set_status(
  _token UUID, _tournament_id UUID, _registration_id UUID, _status TEXT, _reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.scoring_admin_can_access(_token, _tournament_id) THEN
    RAISE EXCEPTION 'Not authorized for this event';
  END IF;
  IF _status NOT IN ('active', 'wd', 'dq') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE public.tournament_registrations
     SET status = _status, status_reason = _reason, status_updated_at = now()
   WHERE id = _registration_id AND tournament_id = _tournament_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.scoring_admin_login(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scoring_admin_events(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scoring_admin_roster(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scoring_admin_scores(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scoring_admin_save_round(UUID, UUID, UUID, INTEGER, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scoring_admin_set_status(UUID, UUID, UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scoring_admin_can_access(UUID, UUID) TO anon, authenticated;