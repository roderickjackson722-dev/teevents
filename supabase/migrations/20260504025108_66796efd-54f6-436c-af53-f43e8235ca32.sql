-- Fix Setup Checklist task links to be tournament-aware (use {tid} token resolved by frontend)
-- and reorder + add post-event email task.

-- 1) Customize public site → tournament-scoped site builder
UPDATE public.setup_checklist_tasks
SET link = '/dashboard/tournaments/{tid}/site-builder'
WHERE task_key = 'customize_public_site';

-- 2) Enable public tournament search → site builder Public View tab
UPDATE public.setup_checklist_tasks
SET link = '/dashboard/tournaments/{tid}/site-builder?tab=public_view'
WHERE task_key = 'enable_public_listing';

-- 3) Move "Test registration as a golfer" to bottom of Phase 4 (registration)
--    and point its link at the dashboard registration page.
UPDATE public.setup_checklist_tasks
SET display_order = 390,
    link = '/dashboard/registration'
WHERE task_key = 'test_registration';

-- 4) Make sure the "Test live scoring" task points at the dedicated Test Simulator tab.
UPDATE public.setup_checklist_tasks
SET link = '/dashboard/test-simulator'
WHERE task_key = 'test_live_scoring';

-- 5) Make Choose Scoring Format task point at the Scoring page (not just any page)
--    and add a Handicap Settings task pointing to the new Handicap tab.
INSERT INTO public.setup_checklist_tasks
  (task_key, task_name, description, phase, required, link, display_order, auto_complete)
VALUES
  ('configure_handicap', 'Configure handicap settings',
   'Set handicap allowances, course/slope ratings, and tee adjustments used by the leaderboard.',
   'tournament', false, '/dashboard/scoring?tab=handicap', 135, false)
ON CONFLICT (task_key) DO UPDATE
  SET link = EXCLUDED.link,
      task_name = EXCLUDED.task_name,
      description = EXCLUDED.description,
      phase = EXCLUDED.phase,
      display_order = EXCLUDED.display_order;

-- 6) Add the new "Send post-event thank-you / next-event CTA" task
--    in the post phase. It points to the Email Templates page on the new tab.
INSERT INTO public.setup_checklist_tasks
  (task_key, task_name, description, phase, required, link, display_order, auto_complete)
VALUES
  ('post_event_thankyou_email', 'Send post-event thank-you & next-event email',
   'Thank participants and invite them to subscribe or register for your next event.',
   'post', false, '/dashboard/email-templates?template=post_event', 645, false)
ON CONFLICT (task_key) DO UPDATE
  SET link = EXCLUDED.link,
      task_name = EXCLUDED.task_name,
      description = EXCLUDED.description,
      phase = EXCLUDED.phase,
      display_order = EXCLUDED.display_order;

-- 7) Add post_event_email_config column to tournaments for the new template
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS post_event_email_config jsonb DEFAULT NULL;
