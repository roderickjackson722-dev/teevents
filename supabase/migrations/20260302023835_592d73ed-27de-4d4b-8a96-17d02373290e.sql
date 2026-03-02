
-- Organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subdomain text UNIQUE,
  logo_url text,
  primary_color text DEFAULT '#1a5c38',
  secondary_color text DEFAULT '#c8a84e',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Org members table
CREATE TABLE public.org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- Tournaments table
CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  date date,
  location text,
  course_name text,
  status text NOT NULL DEFAULT 'draft',
  template text DEFAULT 'classic',
  image_url text,
  max_players integer DEFAULT 144,
  registration_open boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Tournament checklist items
CREATE TABLE public.tournament_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  sort_order integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_checklist_items ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is member of an org
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- Helper function: check if user is owner of an org
CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = 'owner'
  )
$$;

-- RLS: organizations
CREATE POLICY "Members can view their org"
  ON public.organizations FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create orgs"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Owners can update their org"
  ON public.organizations FOR UPDATE TO authenticated
  USING (is_org_owner(auth.uid(), id));

-- RLS: org_members
CREATE POLICY "Members can view org members"
  ON public.org_members FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert themselves as owner"
  ON public.org_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS: tournaments
CREATE POLICY "Members can view their tournaments"
  ON public.tournaments FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can create tournaments"
  ON public.tournaments FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can update tournaments"
  ON public.tournaments FOR UPDATE TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Owners can delete tournaments"
  ON public.tournaments FOR DELETE TO authenticated
  USING (is_org_owner(auth.uid(), organization_id));

-- RLS: checklist items
CREATE POLICY "Members can view checklist"
  ON public.tournament_checklist_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Members can insert checklist items"
  ON public.tournament_checklist_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Members can update checklist items"
  ON public.tournament_checklist_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Members can delete checklist items"
  ON public.tournament_checklist_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND is_org_member(auth.uid(), t.organization_id)
  ));

-- Function to seed default checklist items when a tournament is created
CREATE OR REPLACE FUNCTION public.seed_tournament_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tournament_checklist_items (tournament_id, title, description, category, sort_order) VALUES
    -- 12 months out
    (NEW.id, 'Set tournament date', 'Confirm the date and secure the golf course.', '12_months', 1),
    (NEW.id, 'Negotiate course contract', 'Review pricing, minimums, and cancellation terms.', '12_months', 2),
    (NEW.id, 'Establish tournament budget', 'Create initial revenue and expense projections.', '12_months', 3),
    (NEW.id, 'Form tournament committee', 'Recruit key volunteers and assign responsibilities.', '12_months', 4),
    (NEW.id, 'Define tournament format', 'Choose scramble, best ball, stroke play, etc.', '12_months', 5),
    (NEW.id, 'Set fundraising goals', 'Determine how much you want to raise and for what cause.', '12_months', 6),
    -- 6 months out
    (NEW.id, 'Launch tournament website', 'Publish your branded tournament page with registration.', '6_months', 7),
    (NEW.id, 'Begin sponsor outreach', 'Create sponsor packages and start contacting potential sponsors.', '6_months', 8),
    (NEW.id, 'Open player registration', 'Enable online registration and payment collection.', '6_months', 9),
    (NEW.id, 'Plan food & beverage', 'Coordinate menu, catering, and beverage cart with the course.', '6_months', 10),
    (NEW.id, 'Order tournament merchandise', 'Design and order shirts, hats, bags, or other swag.', '6_months', 11),
    (NEW.id, 'Secure auction/raffle items', 'Begin collecting donated items for silent auction or raffle.', '6_months', 12),
    -- 3 months out
    (NEW.id, 'Confirm sponsor commitments', 'Finalize all sponsor agreements and collect logos/payments.', '3_months', 13),
    (NEW.id, 'Plan on-course contests', 'Set up closest-to-pin, longest drive, hole-in-one insurance, etc.', '3_months', 14),
    (NEW.id, 'Recruit volunteers', 'Assign volunteers to registration, contests, and other stations.', '3_months', 15),
    (NEW.id, 'Order signage & banners', 'Sponsor signs, directional signs, contest signs, and banners.', '3_months', 16),
    (NEW.id, 'Coordinate awards & prizes', 'Order trophies, gift cards, and prize packages.', '3_months', 17),
    -- 1 month out
    (NEW.id, 'Finalize player pairings', 'Create foursomes and assign tee times or shotgun start holes.', '1_month', 18),
    (NEW.id, 'Create event timeline', 'Minute-by-minute schedule for registration through awards.', '1_month', 19),
    (NEW.id, 'Send player communications', 'Email or text all registered players with event details.', '1_month', 20),
    (NEW.id, 'Prepare registration materials', 'Name badges, gift bags, scorecards, cart signs, and rules sheets.', '1_month', 21),
    (NEW.id, 'Confirm all vendors', 'Verify catering, photographers, entertainment, and rentals.', '1_month', 22),
    -- Week of
    (NEW.id, 'Final walkthrough with course', 'Review setup, cart staging, contest locations, and signage placement.', 'week_of', 23),
    (NEW.id, 'Prepare scoring system', 'Set up live scoring or manual scorecards and verification process.', 'week_of', 24),
    (NEW.id, 'Brief volunteers', 'Hold a volunteer meeting to review roles and event timeline.', 'week_of', 25),
    -- Post event
    (NEW.id, 'Send thank you communications', 'Thank players, sponsors, volunteers, and the golf course.', 'post_event', 26),
    (NEW.id, 'Finalize budget report', 'Reconcile all revenue and expenses. Report to stakeholders.', 'post_event', 27),
    (NEW.id, 'Share photos & results', 'Post event photos, scores, and highlights to your tournament site.', 'post_event', 28),
    (NEW.id, 'Conduct post-event review', 'Gather feedback and document lessons learned for next year.', 'post_event', 29),
    (NEW.id, 'Book next year''s date', 'Secure the course and date for next year''s tournament.', 'post_event', 30);
  RETURN NEW;
END;
$$;

CREATE TRIGGER seed_checklist_on_tournament_create
  AFTER INSERT ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_tournament_checklist();

-- Updated_at triggers
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
