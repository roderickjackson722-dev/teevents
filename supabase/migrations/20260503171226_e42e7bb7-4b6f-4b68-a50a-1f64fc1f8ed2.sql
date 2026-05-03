-- Master task definitions
CREATE TABLE public.setup_checklist_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key TEXT UNIQUE NOT NULL,
  task_name TEXT NOT NULL,
  description TEXT,
  phase TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  link TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  auto_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.setup_checklist_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read setup tasks"
  ON public.setup_checklist_tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage setup tasks"
  ON public.setup_checklist_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.tournament_setup_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.setup_checklist_tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started',
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, task_id)
);

CREATE INDEX idx_tournament_setup_progress_tournament ON public.tournament_setup_progress(tournament_id);

ALTER TABLE public.tournament_setup_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view setup progress"
  ON public.tournament_setup_progress FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_setup_progress.tournament_id AND public.is_org_member(auth.uid(), t.organization_id)) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members can insert setup progress"
  ON public.tournament_setup_progress FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_setup_progress.tournament_id AND public.is_org_member(auth.uid(), t.organization_id)) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members can update setup progress"
  ON public.tournament_setup_progress FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_setup_progress.tournament_id AND public.is_org_member(auth.uid(), t.organization_id)) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members can delete setup progress"
  ON public.tournament_setup_progress FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_setup_progress.tournament_id AND public.is_org_member(auth.uid(), t.organization_id)) OR public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS setup_checklist_dismissed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TRIGGER trg_tournament_setup_progress_updated_at
  BEFORE UPDATE ON public.tournament_setup_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.setup_checklist_tasks (task_key, task_name, description, phase, required, link, display_order, auto_complete) VALUES
  ('create_organization', 'Create your organization', 'Set your organization name and dashboard branding.', 'account', true, '/dashboard/settings', 10, true),
  ('choose_plan', 'Choose your plan (Base or Pro)', 'Stay on Base or upgrade individual tournaments to Pro.', 'account', true, '/plans', 20, false),
  ('payout_method', 'Set up a payout method', 'Connect Stripe, PayPal, or request check payouts so you can be paid.', 'account', true, '/dashboard/payout-settings', 30, true),
  ('create_tournament', 'Create your first tournament', 'Spin up a new tournament from the Tournaments page.', 'tournament', true, '/dashboard/tournaments', 110, true),
  ('add_course_details', 'Add course details', 'Set par, slope, rating and tee information for accurate scoring.', 'tournament', true, '/dashboard/course-details', 120, true),
  ('choose_scoring_format', 'Choose a scoring format', 'Pick stroke play, scramble, best ball, Stableford, etc.', 'tournament', true, '/dashboard/scoring', 130, true),
  ('set_registration_pricing', 'Set registration fee & add-ons', 'Define what players pay and any optional add-ons.', 'tournament', true, '/dashboard/registration', 140, true),
  ('customize_public_site', 'Customize your public site', 'Branding, colors, logo, and layout for your tournament page.', 'tournament', true, '/dashboard/site-builder', 150, true),
  ('enable_public_listing', 'Enable public tournament search', 'Let players discover your event in the public tournament directory.', 'promotion', false, '/dashboard/settings', 210, true),
  ('share_link_qr', 'Generate shareable link & QR code', 'Get a short link and QR code to promote your tournament.', 'promotion', true, '/dashboard/share-promote', 220, true),
  ('create_sponsor_tiers', 'Create sponsor tiers (optional)', 'Add sponsorship packages so businesses can sponsor online.', 'promotion', false, '/dashboard/sponsors', 230, false),
  ('setup_email_template', 'Set up your player email template', 'Customize the message players receive when they register.', 'promotion', false, '/dashboard/email-templates', 240, true),
  ('test_registration', 'Test registration as a golfer', 'Walk through your public registration flow end-to-end.', 'registration', false, '/dashboard/share-promote', 310, false),
  ('add_first_player', 'Add or import your first player', 'Add a player manually or import a roster.', 'registration', true, '/dashboard/players', 320, true),
  ('setup_waitlist', 'Set up a waitlist (optional)', 'Capture demand once your tournament is full.', 'registration', false, '/dashboard/waitlist', 330, false),
  ('create_pairings', 'Create pairings / tee sheet', 'Group players into foursomes and assign tee times.', 'pre_tournament', true, '/dashboard/tee-sheet', 410, true),
  ('print_scorecards', 'Print scorecards (with QR codes)', 'Generate printable scorecards with scoring QR codes.', 'pre_tournament', true, '/dashboard/printables', 420, false),
  ('assign_volunteers', 'Assign volunteers (optional)', 'Add volunteers and their assignments.', 'pre_tournament', false, '/dashboard/volunteers', 430, true),
  ('test_live_scoring', 'Test live scoring (use Test Simulator)', 'Use the simulator to verify the scoring flow works.', 'pre_tournament', false, '/dashboard/test-simulator', 440, false),
  ('checkin_players', 'Check in players via QR', 'Use the check-in scanner on event day.', 'day_of', false, '/dashboard/check-in', 510, true),
  ('monitor_leaderboard', 'Monitor the live leaderboard', 'Watch scores come in live during play.', 'day_of', false, '/dashboard/leaderboard', 520, true),
  ('run_auction', 'Run auction / raffle (if enabled)', 'Manage your live silent auction or raffle.', 'day_of', false, '/dashboard/auction', 530, false),
  ('finalize_results', 'Finalize results & winners', 'Lock the leaderboard and confirm winners.', 'post', false, '/dashboard/leaderboard', 610, false),
  ('download_finances', 'Download financial CSV', 'Export your revenue and transaction data.', 'post', false, '/dashboard/finances', 620, false),
  ('upload_gallery', 'Upload photo gallery', 'Share event photos with your players.', 'post', false, '/dashboard/gallery', 630, true),
  ('send_thankyou', 'Send a thank-you email to players', 'Send a closing message to all participants.', 'post', false, '/dashboard/email-templates', 640, false);

INSERT INTO public.tournament_setup_progress (tournament_id, task_id, status)
SELECT t.id, s.id, 'not_started'
FROM public.tournaments t CROSS JOIN public.setup_checklist_tasks s
ON CONFLICT (tournament_id, task_id) DO NOTHING;

UPDATE public.tournament_setup_progress p
SET status='completed', completed_at=now()
FROM public.setup_checklist_tasks s
WHERE p.task_id=s.id AND s.task_key IN ('create_organization','choose_plan','create_tournament') AND p.status='not_started';

UPDATE public.tournament_setup_progress p
SET status='completed', completed_at=now()
FROM public.setup_checklist_tasks s, public.tournaments t, public.organizations o
WHERE p.task_id=s.id AND p.tournament_id=t.id AND t.organization_id=o.id
  AND s.task_key='payout_method' AND p.status='not_started'
  AND (o.stripe_account_id IS NOT NULL OR o.payout_method IS NOT NULL);

UPDATE public.tournament_setup_progress p
SET status='completed', completed_at=now()
FROM public.setup_checklist_tasks s, public.tournaments t
WHERE p.task_id=s.id AND p.tournament_id=t.id AND s.task_key='add_course_details'
  AND p.status='not_started' AND t.course_name IS NOT NULL AND length(trim(t.course_name))>0;

UPDATE public.tournament_setup_progress p
SET status='completed', completed_at=now()
FROM public.setup_checklist_tasks s, public.tournaments t
WHERE p.task_id=s.id AND p.tournament_id=t.id AND s.task_key='choose_scoring_format'
  AND p.status='not_started' AND t.scoring_format IS NOT NULL;

UPDATE public.tournament_setup_progress p
SET status='completed', completed_at=now()
FROM public.setup_checklist_tasks s, public.tournaments t
WHERE p.task_id=s.id AND p.tournament_id=t.id AND s.task_key='set_registration_pricing'
  AND p.status='not_started' AND COALESCE(t.registration_fee_cents,0)>0;

UPDATE public.tournament_setup_progress p
SET status='completed', completed_at=now()
FROM public.setup_checklist_tasks s, public.tournaments t
WHERE p.task_id=s.id AND p.tournament_id=t.id AND s.task_key='customize_public_site'
  AND p.status='not_started'
  AND (t.image_url IS NOT NULL OR t.site_logo_url IS NOT NULL OR t.site_hero_image_url IS NOT NULL OR COALESCE(t.site_published,false)=true);

UPDATE public.tournament_setup_progress p
SET status='completed', completed_at=now()
FROM public.setup_checklist_tasks s, public.tournaments t
WHERE p.task_id=s.id AND p.tournament_id=t.id AND s.task_key='enable_public_listing'
  AND p.status='not_started' AND COALESCE(t.show_in_public_search,false)=true;

UPDATE public.tournament_setup_progress p
SET status='completed', completed_at=now()
FROM public.setup_checklist_tasks s, public.tournaments t
WHERE p.task_id=s.id AND p.tournament_id=t.id AND s.task_key='share_link_qr'
  AND p.status='not_started' AND t.slug IS NOT NULL;

UPDATE public.tournament_setup_progress p
SET status='completed', completed_at=now()
FROM public.setup_checklist_tasks s
WHERE p.task_id=s.id AND s.task_key='add_first_player' AND p.status='not_started'
  AND EXISTS (SELECT 1 FROM public.tournament_registrations r WHERE r.tournament_id=p.tournament_id);

UPDATE public.tournament_setup_progress p
SET status='completed', completed_at=now()
FROM public.setup_checklist_tasks s
WHERE p.task_id=s.id AND s.task_key='create_sponsor_tiers' AND p.status='not_started'
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sponsorship_tiers')
  AND EXISTS (SELECT 1 FROM public.sponsorship_tiers st WHERE st.tournament_id=p.tournament_id);