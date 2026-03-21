
-- College Tournaments
CREATE TABLE public.college_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date date,
  end_date date,
  location text,
  course_name text,
  status text NOT NULL DEFAULT 'draft',
  registration_open boolean DEFAULT false,
  contact_email text DEFAULT 'info@teevents.golf',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.college_tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage college tournaments" ON public.college_tournaments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view published college tournaments" ON public.college_tournaments
  FOR SELECT TO public
  USING (status = 'active');

-- College Tournament Tabs
CREATE TABLE public.college_tournament_tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES public.college_tournaments(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content_type text NOT NULL DEFAULT 'rich_text',
  content text,
  file_url text,
  sort_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.college_tournament_tabs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage college tabs" ON public.college_tournament_tabs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view visible tabs" ON public.college_tournament_tabs
  FOR SELECT TO public
  USING (is_visible = true AND EXISTS (
    SELECT 1 FROM public.college_tournaments ct
    WHERE ct.id = college_tournament_tabs.tournament_id AND ct.status = 'active'
  ));

-- College Tournament Invitations
CREATE TABLE public.college_tournament_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES public.college_tournaments(id) ON DELETE CASCADE NOT NULL,
  coach_name text NOT NULL,
  coach_email text NOT NULL,
  school_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rsvp_response text,
  rsvp_date timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.college_tournament_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations" ON public.college_tournament_invitations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view own invitations" ON public.college_tournament_invitations
  FOR SELECT TO public
  USING (true);

CREATE POLICY "Public can update own rsvp" ON public.college_tournament_invitations
  FOR UPDATE TO public
  USING (true);

-- College Tournament Registrations (team level)
CREATE TABLE public.college_tournament_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES public.college_tournaments(id) ON DELETE CASCADE NOT NULL,
  invitation_id uuid REFERENCES public.college_tournament_invitations(id),
  coach_name text NOT NULL,
  coach_email text NOT NULL,
  school_name text NOT NULL,
  payment_status text DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.college_tournament_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage college registrations" ON public.college_tournament_registrations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can submit registrations" ON public.college_tournament_registrations
  FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.college_tournaments ct
    WHERE ct.id = college_tournament_registrations.tournament_id AND ct.registration_open = true
  ));

CREATE POLICY "Public can view own registrations" ON public.college_tournament_registrations
  FOR SELECT TO public
  USING (true);

-- College Tournament Players (individual players within a team)
CREATE TABLE public.college_tournament_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid REFERENCES public.college_tournament_registrations(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  year text,
  handicap numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.college_tournament_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage college players" ON public.college_tournament_players
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can insert players with registration" ON public.college_tournament_players
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Public can view players" ON public.college_tournament_players
  FOR SELECT TO public
  USING (true);
