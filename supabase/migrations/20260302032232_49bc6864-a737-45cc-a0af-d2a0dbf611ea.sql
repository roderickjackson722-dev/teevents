
-- Add check-in fields to registrations
ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS checked_in boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS check_in_time timestamp with time zone;

-- Add course_par to tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS course_par integer DEFAULT 72;

-- Scores for leaderboard
CREATE TABLE public.tournament_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES public.tournament_registrations(id) ON DELETE CASCADE,
  hole_number integer NOT NULL,
  strokes integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(registration_id, hole_number)
);
ALTER TABLE public.tournament_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage scores" ON public.tournament_scores FOR ALL
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_scores.tournament_id AND is_org_member(auth.uid(), t.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_scores.tournament_id AND is_org_member(auth.uid(), t.organization_id)));

CREATE POLICY "Public can view scores for published tournaments" ON public.tournament_scores FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_scores.tournament_id AND t.site_published = true));

-- Enable realtime for live leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_scores;

-- Auction items
CREATE TABLE public.tournament_auction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  type text NOT NULL DEFAULT 'auction',
  starting_bid numeric(10,2) DEFAULT 0,
  current_bid numeric(10,2) DEFAULT 0,
  buy_now_price numeric(10,2),
  raffle_ticket_price numeric(10,2),
  winner_name text,
  winner_email text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.tournament_auction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage auction items" ON public.tournament_auction_items FOR ALL
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_auction_items.tournament_id AND is_org_member(auth.uid(), t.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_auction_items.tournament_id AND is_org_member(auth.uid(), t.organization_id)));

CREATE POLICY "Public can view active auction items" ON public.tournament_auction_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_auction_items.tournament_id AND t.site_published = true) AND is_active = true);

-- Auction bids
CREATE TABLE public.tournament_auction_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.tournament_auction_items(id) ON DELETE CASCADE,
  bidder_name text NOT NULL,
  bidder_email text NOT NULL,
  bidder_phone text,
  amount numeric(10,2) NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.tournament_auction_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can place bids" ON public.tournament_auction_bids FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Org members can view bids" ON public.tournament_auction_bids FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournament_auction_items ai JOIN tournaments t ON t.id = ai.tournament_id WHERE ai.id = tournament_auction_bids.item_id AND is_org_member(auth.uid(), t.organization_id)));

CREATE POLICY "Public can view own bids" ON public.tournament_auction_bids FOR SELECT
  USING (true);

-- Photos
CREATE TABLE public.tournament_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.tournament_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage photos" ON public.tournament_photos FOR ALL
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_photos.tournament_id AND is_org_member(auth.uid(), t.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_photos.tournament_id AND is_org_member(auth.uid(), t.organization_id)));

CREATE POLICY "Public can view photos for published tournaments" ON public.tournament_photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_photos.tournament_id AND t.site_published = true));

-- Volunteer roles
CREATE TABLE public.tournament_volunteer_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  max_volunteers integer DEFAULT 1,
  time_slot text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.tournament_volunteer_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage volunteer roles" ON public.tournament_volunteer_roles FOR ALL
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_volunteer_roles.tournament_id AND is_org_member(auth.uid(), t.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_volunteer_roles.tournament_id AND is_org_member(auth.uid(), t.organization_id)));

CREATE POLICY "Public can view volunteer roles for published tournaments" ON public.tournament_volunteer_roles FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_volunteer_roles.tournament_id AND t.site_published = true));

-- Volunteer signups
CREATE TABLE public.tournament_volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.tournament_volunteer_roles(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  status text DEFAULT 'confirmed',
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.tournament_volunteers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage volunteers" ON public.tournament_volunteers FOR ALL
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_volunteers.tournament_id AND is_org_member(auth.uid(), t.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_volunteers.tournament_id AND is_org_member(auth.uid(), t.organization_id)));

CREATE POLICY "Anyone can sign up to volunteer" ON public.tournament_volunteers FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_volunteers.tournament_id AND t.site_published = true));

-- Surveys
CREATE TABLE public.tournament_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Post-Event Survey',
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.tournament_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage surveys" ON public.tournament_surveys FOR ALL
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_surveys.tournament_id AND is_org_member(auth.uid(), t.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_surveys.tournament_id AND is_org_member(auth.uid(), t.organization_id)));

CREATE POLICY "Public can view active surveys" ON public.tournament_surveys FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_surveys.tournament_id AND t.site_published = true) AND is_active = true);

-- Survey questions
CREATE TABLE public.tournament_survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.tournament_surveys(id) ON DELETE CASCADE,
  question text NOT NULL,
  type text DEFAULT 'rating',
  options jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.tournament_survey_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage survey questions" ON public.tournament_survey_questions FOR ALL
  USING (EXISTS (SELECT 1 FROM tournament_surveys s JOIN tournaments t ON t.id = s.tournament_id WHERE s.id = tournament_survey_questions.survey_id AND is_org_member(auth.uid(), t.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tournament_surveys s JOIN tournaments t ON t.id = s.tournament_id WHERE s.id = tournament_survey_questions.survey_id AND is_org_member(auth.uid(), t.organization_id)));

CREATE POLICY "Public can view questions for active surveys" ON public.tournament_survey_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournament_surveys s JOIN tournaments t ON t.id = s.tournament_id WHERE s.id = tournament_survey_questions.survey_id AND t.site_published = true AND s.is_active = true));

-- Survey responses
CREATE TABLE public.tournament_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.tournament_surveys(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.tournament_survey_questions(id) ON DELETE CASCADE,
  respondent_email text NOT NULL,
  answer text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.tournament_survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit survey responses" ON public.tournament_survey_responses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM tournament_surveys s JOIN tournaments t ON t.id = s.tournament_id WHERE s.id = tournament_survey_responses.survey_id AND t.site_published = true AND s.is_active = true));

CREATE POLICY "Org members can view survey responses" ON public.tournament_survey_responses FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournament_surveys s JOIN tournaments t ON t.id = s.tournament_id WHERE s.id = tournament_survey_responses.survey_id AND is_org_member(auth.uid(), t.organization_id)));
