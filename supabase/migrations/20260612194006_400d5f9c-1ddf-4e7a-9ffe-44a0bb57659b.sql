
CREATE TABLE public.demo_tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tournament_name TEXT NOT NULL,
  event_date DATE,
  location TEXT,
  course_name TEXT,
  registration_fee_cents INTEGER NOT NULL DEFAULT 0,
  scoring_format TEXT NOT NULL DEFAULT 'Scramble',
  status TEXT NOT NULL DEFAULT 'active',
  prospect_email TEXT,
  prospect_name TEXT,
  public_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  conversion_token UUID UNIQUE,
  converted_at TIMESTAMPTZ,
  live_tournament_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.demo_tournaments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_tournaments TO authenticated;
GRANT ALL ON public.demo_tournaments TO service_role;
ALTER TABLE public.demo_tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view demo tournaments" ON public.demo_tournaments
  FOR SELECT USING (true);
CREATE POLICY "Admins manage demo tournaments" ON public.demo_tournaments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER demo_tournaments_set_updated
  BEFORE UPDATE ON public.demo_tournaments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.demo_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_tournament_id UUID NOT NULL REFERENCES public.demo_tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  handicap NUMERIC(4,1),
  shirt_size TEXT,
  group_name TEXT,
  tee_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.demo_players TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_players TO authenticated;
GRANT ALL ON public.demo_players TO service_role;
ALTER TABLE public.demo_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view demo players" ON public.demo_players FOR SELECT USING (true);
CREATE POLICY "Admins manage demo players" ON public.demo_players FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));


CREATE TABLE public.demo_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_tournament_id UUID NOT NULL REFERENCES public.demo_tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT,
  logo_url TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.demo_sponsors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_sponsors TO authenticated;
GRANT ALL ON public.demo_sponsors TO service_role;
ALTER TABLE public.demo_sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view demo sponsors" ON public.demo_sponsors FOR SELECT USING (true);
CREATE POLICY "Admins manage demo sponsors" ON public.demo_sponsors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));


CREATE TABLE public.demo_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_tournament_id UUID NOT NULL REFERENCES public.demo_tournaments(id) ON DELETE CASCADE,
  player_name TEXT,
  hole_number INTEGER,
  gross_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.demo_scores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_scores TO authenticated;
GRANT ALL ON public.demo_scores TO service_role;
ALTER TABLE public.demo_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view demo scores" ON public.demo_scores FOR SELECT USING (true);
CREATE POLICY "Admins manage demo scores" ON public.demo_scores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_demo_players_tid ON public.demo_players(demo_tournament_id);
CREATE INDEX idx_demo_sponsors_tid ON public.demo_sponsors(demo_tournament_id);
CREATE INDEX idx_demo_scores_tid ON public.demo_scores(demo_tournament_id);
