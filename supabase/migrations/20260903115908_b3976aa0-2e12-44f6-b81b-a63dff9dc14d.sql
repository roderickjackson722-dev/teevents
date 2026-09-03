ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS sport_type TEXT NOT NULL DEFAULT 'golf';

CREATE TABLE public.sport_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_type TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  field_name TEXT NOT NULL DEFAULT 'Field',
  scoring_type TEXT NOT NULL DEFAULT 'points',
  period_name TEXT NOT NULL DEFAULT 'Period',
  max_players_per_team INTEGER NOT NULL DEFAULT 9,
  min_players_per_team INTEGER NOT NULL DEFAULT 9,
  innings_or_halves INTEGER NOT NULL DEFAULT 9,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sport_settings TO authenticated;
GRANT ALL ON public.sport_settings TO service_role;
ALTER TABLE public.sport_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sport settings" ON public.sport_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  sport_type TEXT NOT NULL DEFAULT 'golf',
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  season_type TEXT NOT NULL DEFAULT 'league',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seasons TO authenticated;
GRANT ALL ON public.seasons TO service_role;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage seasons" ON public.seasons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.season_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  division TEXT,
  coach_name TEXT,
  coach_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.season_teams TO authenticated;
GRANT ALL ON public.season_teams TO service_role;
ALTER TABLE public.season_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage season teams" ON public.season_teams FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.season_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.season_teams(id) ON DELETE CASCADE,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  ties INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  runs_scored INTEGER NOT NULL DEFAULT 0,
  runs_allowed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, team_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.season_standings TO authenticated;
GRANT ALL ON public.season_standings TO service_role;
ALTER TABLE public.season_standings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage season standings" ON public.season_standings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  facility_type TEXT NOT NULL DEFAULT 'field',
  capacity INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facilities TO authenticated;
GRANT ALL ON public.facilities TO service_role;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage facilities" ON public.facilities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.facility_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  title TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  booking_type TEXT NOT NULL DEFAULT 'game',
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facility_bookings TO authenticated;
GRANT ALL ON public.facility_bookings TO service_role;
ALTER TABLE public.facility_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage facility bookings" ON public.facility_bookings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_facility_bookings_facility_start ON public.facility_bookings (facility_id, start_time);
CREATE INDEX idx_season_teams_season ON public.season_teams (season_id);
CREATE INDEX idx_season_standings_season ON public.season_standings (season_id);

CREATE TRIGGER update_sport_settings_updated_at BEFORE UPDATE ON public.sport_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON public.seasons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_season_teams_updated_at BEFORE UPDATE ON public.season_teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_season_standings_updated_at BEFORE UPDATE ON public.season_standings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON public.facilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_facility_bookings_updated_at BEFORE UPDATE ON public.facility_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.sport_settings (sport_type, label, field_name, scoring_type, period_name, max_players_per_team, min_players_per_team, innings_or_halves) VALUES
  ('golf', 'Golf', 'Course', 'strokes', 'Hole', 4, 1, 18),
  ('baseball', 'Baseball', 'Field', 'runs', 'Inning', 12, 9, 9),
  ('softball', 'Softball', 'Field', 'runs', 'Inning', 14, 9, 7),
  ('soccer', 'Soccer', 'Field', 'goals', 'Half', 18, 11, 2),
  ('basketball', 'Basketball', 'Court', 'points', 'Quarter', 12, 5, 4),
  ('flag_football', 'Flag Football', 'Field', 'points', 'Quarter', 14, 7, 4)
ON CONFLICT (sport_type) DO NOTHING;