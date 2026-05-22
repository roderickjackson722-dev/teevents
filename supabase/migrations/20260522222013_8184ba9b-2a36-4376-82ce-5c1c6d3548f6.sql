
CREATE TABLE public.sample_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  unique_slug text UNIQUE NOT NULL,
  tournament_name text NOT NULL,
  event_date date,
  location text,
  description text,
  logo_url text,
  hero_image_url text,
  scoring_format text DEFAULT 'Scramble',
  registration_fee_cents integer DEFAULT 10000,
  team_fee_cents integer DEFAULT 40000,
  view_count integer NOT NULL DEFAULT 0,
  last_accessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sample_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_tournament_id uuid NOT NULL REFERENCES public.sample_tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  handicap numeric(4,1),
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sample_sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_tournament_id uuid NOT NULL REFERENCES public.sample_tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  level text,
  logo_color text,
  logo_url text,
  website_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sample_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_tournament_id uuid NOT NULL REFERENCES public.sample_tournaments(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  gross_score integer,
  net_score integer,
  thru integer DEFAULT 18,
  position integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sample_participants_t ON public.sample_participants(sample_tournament_id);
CREATE INDEX idx_sample_sponsors_t ON public.sample_sponsors(sample_tournament_id);
CREATE INDEX idx_sample_leaderboard_t ON public.sample_leaderboard(sample_tournament_id);

ALTER TABLE public.sample_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_leaderboard ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read sample_tournaments" ON public.sample_tournaments FOR SELECT USING (true);
CREATE POLICY "Public read sample_participants" ON public.sample_participants FOR SELECT USING (true);
CREATE POLICY "Public read sample_sponsors" ON public.sample_sponsors FOR SELECT USING (true);
CREATE POLICY "Public read sample_leaderboard" ON public.sample_leaderboard FOR SELECT USING (true);

-- Admin write
CREATE POLICY "Admin manage sample_tournaments" ON public.sample_tournaments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin manage sample_participants" ON public.sample_participants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin manage sample_sponsors" ON public.sample_sponsors
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin manage sample_leaderboard" ON public.sample_leaderboard
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_sample_tournaments_updated_at
  BEFORE UPDATE ON public.sample_tournaments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public RPC to increment view count
CREATE OR REPLACE FUNCTION public.increment_sample_view(_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.sample_tournaments
  SET view_count = view_count + 1,
      last_accessed_at = now()
  WHERE unique_slug = _slug;
$$;

GRANT EXECUTE ON FUNCTION public.increment_sample_view(text) TO anon, authenticated;
