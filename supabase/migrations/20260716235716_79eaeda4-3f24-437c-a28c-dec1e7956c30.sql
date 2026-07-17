
-- 1. golf_leagues
CREATE TABLE public.golf_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  league_name TEXT NOT NULL,
  league_slug TEXT NOT NULL UNIQUE,
  description TEXT,
  start_date DATE,
  end_date DATE,
  season_year INTEGER,
  logo_url TEXT,
  banner_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.golf_leagues TO authenticated;
GRANT SELECT ON public.golf_leagues TO anon;
GRANT ALL ON public.golf_leagues TO service_role;
ALTER TABLE public.golf_leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage leagues" ON public.golf_leagues FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Public can view public leagues" ON public.golf_leagues FOR SELECT
  USING (is_public = true);
CREATE TRIGGER trg_golf_leagues_updated BEFORE UPDATE ON public.golf_leagues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. league_seasons
CREATE TABLE public.league_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.golf_leagues(id) ON DELETE CASCADE,
  season_name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_seasons TO authenticated;
GRANT SELECT ON public.league_seasons TO anon;
GRANT ALL ON public.league_seasons TO service_role;
ALTER TABLE public.league_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage seasons" ON public.league_seasons FOR ALL
  USING (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND public.is_org_member(auth.uid(), l.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND public.is_org_member(auth.uid(), l.organization_id)));
CREATE POLICY "Public can view seasons of public leagues" ON public.league_seasons FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND l.is_public = true));

-- 3. league_members
CREATE TABLE public.league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.golf_leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  handicap_index NUMERIC(4,1),
  membership_status TEXT NOT NULL DEFAULT 'active',
  membership_fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  membership_fee_cents INTEGER,
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scoring_code TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_members TO authenticated;
GRANT SELECT ON public.league_members TO anon;
GRANT ALL ON public.league_members TO service_role;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage league members" ON public.league_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND public.is_org_member(auth.uid(), l.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND public.is_org_member(auth.uid(), l.organization_id)));
CREATE POLICY "Public can view members of public leagues" ON public.league_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND l.is_public = true));
CREATE TRIGGER trg_league_members_updated BEFORE UPDATE ON public.league_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.generate_league_member_scoring_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.scoring_code IS NULL OR NEW.scoring_code = '' THEN
    NEW.scoring_code := upper(substr(md5(NEW.id::text || now()::text || random()::text), 1, 6));
    WHILE EXISTS (SELECT 1 FROM public.league_members WHERE scoring_code = NEW.scoring_code AND id != NEW.id) LOOP
      NEW.scoring_code := upper(substr(md5(NEW.id::text || now()::text || random()::text), 1, 6));
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_league_members_scoring_code BEFORE INSERT ON public.league_members
  FOR EACH ROW EXECUTE FUNCTION public.generate_league_member_scoring_code();

-- 4. league_events
CREATE TABLE public.league_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.golf_leagues(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.league_seasons(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  course_name TEXT,
  course_id UUID REFERENCES public.golf_courses(id) ON DELETE SET NULL,
  format_type TEXT NOT NULL DEFAULT 'individual_stroke',
  start_time TIME,
  registration_deadline DATE,
  max_players INTEGER,
  registration_fee_cents INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_events TO authenticated;
GRANT SELECT ON public.league_events TO anon;
GRANT ALL ON public.league_events TO service_role;
ALTER TABLE public.league_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage league events" ON public.league_events FOR ALL
  USING (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND public.is_org_member(auth.uid(), l.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND public.is_org_member(auth.uid(), l.organization_id)));
CREATE POLICY "Public can view events of public leagues" ON public.league_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND l.is_public = true));
CREATE TRIGGER trg_league_events_updated BEFORE UPDATE ON public.league_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. league_event_registrations
CREATE TABLE public.league_event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.league_events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.league_members(id) ON DELETE CASCADE,
  team_name TEXT,
  pairing_group INTEGER,
  pairing_position INTEGER,
  tee_time TIME,
  registration_fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, member_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_event_registrations TO authenticated;
GRANT SELECT ON public.league_event_registrations TO anon;
GRANT ALL ON public.league_event_registrations TO service_role;
ALTER TABLE public.league_event_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage event registrations" ON public.league_event_registrations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.league_events e JOIN public.golf_leagues l ON l.id = e.league_id WHERE e.id = event_id AND public.is_org_member(auth.uid(), l.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.league_events e JOIN public.golf_leagues l ON l.id = e.league_id WHERE e.id = event_id AND public.is_org_member(auth.uid(), l.organization_id)));
CREATE POLICY "Public can view registrations of public league events" ON public.league_event_registrations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.league_events e JOIN public.golf_leagues l ON l.id = e.league_id WHERE e.id = event_id AND l.is_public = true));

-- 6. league_event_scores
CREATE TABLE public.league_event_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.league_events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.league_members(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL,
  gross_score INTEGER,
  net_score INTEGER,
  points_earned INTEGER NOT NULL DEFAULT 0,
  entered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, member_id, hole_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_event_scores TO authenticated;
GRANT SELECT ON public.league_event_scores TO anon;
GRANT ALL ON public.league_event_scores TO service_role;
ALTER TABLE public.league_event_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage event scores" ON public.league_event_scores FOR ALL
  USING (EXISTS (SELECT 1 FROM public.league_events e JOIN public.golf_leagues l ON l.id = e.league_id WHERE e.id = event_id AND public.is_org_member(auth.uid(), l.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.league_events e JOIN public.golf_leagues l ON l.id = e.league_id WHERE e.id = event_id AND public.is_org_member(auth.uid(), l.organization_id)));
CREATE POLICY "Public can view scores of public league events" ON public.league_event_scores FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.league_events e JOIN public.golf_leagues l ON l.id = e.league_id WHERE e.id = event_id AND l.is_public = true));

-- 7. league_standings
CREATE TABLE public.league_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.golf_leagues(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.league_seasons(id) ON DELETE SET NULL,
  member_id UUID NOT NULL REFERENCES public.league_members(id) ON DELETE CASCADE,
  matches_played INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  ties INTEGER NOT NULL DEFAULT 0,
  total_gross INTEGER NOT NULL DEFAULT 0,
  total_net INTEGER NOT NULL DEFAULT 0,
  handicap_differential NUMERIC(6,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_standings TO authenticated;
GRANT SELECT ON public.league_standings TO anon;
GRANT ALL ON public.league_standings TO service_role;
ALTER TABLE public.league_standings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage standings" ON public.league_standings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND public.is_org_member(auth.uid(), l.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND public.is_org_member(auth.uid(), l.organization_id)));
CREATE POLICY "Public can view standings of public leagues" ON public.league_standings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND l.is_public = true));
CREATE TRIGGER trg_league_standings_updated BEFORE UPDATE ON public.league_standings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. league_skins
CREATE TABLE public.league_skins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.league_events(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL,
  winner_member_id UUID REFERENCES public.league_members(id) ON DELETE SET NULL,
  skin_amount_cents INTEGER,
  is_gross BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_skins TO authenticated;
GRANT SELECT ON public.league_skins TO anon;
GRANT ALL ON public.league_skins TO service_role;
ALTER TABLE public.league_skins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage skins" ON public.league_skins FOR ALL
  USING (EXISTS (SELECT 1 FROM public.league_events e JOIN public.golf_leagues l ON l.id = e.league_id WHERE e.id = event_id AND public.is_org_member(auth.uid(), l.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.league_events e JOIN public.golf_leagues l ON l.id = e.league_id WHERE e.id = event_id AND public.is_org_member(auth.uid(), l.organization_id)));
CREATE POLICY "Public can view skins of public league events" ON public.league_skins FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.league_events e JOIN public.golf_leagues l ON l.id = e.league_id WHERE e.id = event_id AND l.is_public = true));

-- 9. league_point_systems
CREATE TABLE public.league_point_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL UNIQUE REFERENCES public.golf_leagues(id) ON DELETE CASCADE,
  win_points INTEGER NOT NULL DEFAULT 2,
  tie_points INTEGER NOT NULL DEFAULT 1,
  loss_points INTEGER NOT NULL DEFAULT 0,
  position_points JSONB NOT NULL DEFAULT '{"1":10,"2":8,"3":6,"4":4,"5":2}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_point_systems TO authenticated;
GRANT SELECT ON public.league_point_systems TO anon;
GRANT ALL ON public.league_point_systems TO service_role;
ALTER TABLE public.league_point_systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage point systems" ON public.league_point_systems FOR ALL
  USING (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND public.is_org_member(auth.uid(), l.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND public.is_org_member(auth.uid(), l.organization_id)));
CREATE POLICY "Public can view point systems of public leagues" ON public.league_point_systems FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.golf_leagues l WHERE l.id = league_id AND l.is_public = true));
CREATE TRIGGER trg_league_point_systems_updated BEFORE UPDATE ON public.league_point_systems
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_golf_leagues_org ON public.golf_leagues(organization_id);
CREATE INDEX idx_league_members_league ON public.league_members(league_id);
CREATE INDEX idx_league_events_league ON public.league_events(league_id);
CREATE INDEX idx_league_event_regs_event ON public.league_event_registrations(event_id);
CREATE INDEX idx_league_event_scores_event ON public.league_event_scores(event_id);
CREATE INDEX idx_league_standings_league ON public.league_standings(league_id);
CREATE INDEX idx_league_skins_event ON public.league_skins(event_id);
