
-- 1. Add offset_days column
ALTER TABLE public.tournament_checklist_items
ADD COLUMN IF NOT EXISTS offset_days integer;

-- 2. Map for category -> default offset (used for backfill if title not matched)
-- We backfill known titles with specific offsets to match the seed.
UPDATE public.tournament_checklist_items SET offset_days = CASE title
  WHEN 'Set tournament date' THEN -365
  WHEN 'Negotiate course contract' THEN -360
  WHEN 'Establish tournament budget' THEN -355
  WHEN 'Form tournament committee' THEN -350
  WHEN 'Define tournament format' THEN -345
  WHEN 'Set fundraising goals' THEN -340
  WHEN 'Launch tournament website' THEN -180
  WHEN 'Begin sponsor outreach' THEN -180
  WHEN 'Open player registration' THEN -175
  WHEN 'Plan food & beverage' THEN -170
  WHEN 'Order tournament merchandise' THEN -165
  WHEN 'Secure auction/raffle items' THEN -160
  WHEN 'Confirm sponsor commitments' THEN -90
  WHEN 'Plan on-course contests' THEN -85
  WHEN 'Recruit volunteers' THEN -80
  WHEN 'Order signage & banners' THEN -75
  WHEN 'Coordinate awards & prizes' THEN -70
  WHEN 'Finalize player pairings' THEN -30
  WHEN 'Create event timeline' THEN -28
  WHEN 'Send player communications' THEN -25
  WHEN 'Prepare registration materials' THEN -21
  WHEN 'Confirm all vendors' THEN -18
  WHEN 'Final walkthrough with course' THEN -7
  WHEN 'Prepare scoring system' THEN -5
  WHEN 'Brief volunteers' THEN -3
  WHEN 'Send thank you communications' THEN 3
  WHEN 'Finalize budget report' THEN 14
  WHEN 'Share photos & results' THEN 7
  WHEN 'Conduct post-event review' THEN 21
  WHEN 'Book next year''s date' THEN 30
  ELSE offset_days
END
WHERE offset_days IS NULL;

-- Fallback for any unknown rows: assign by category bucket
UPDATE public.tournament_checklist_items SET offset_days = CASE category
  WHEN '12_months' THEN -360
  WHEN '6_months' THEN -180
  WHEN '3_months' THEN -90
  WHEN '1_month' THEN -30
  WHEN 'week_of' THEN -5
  WHEN 'post_event' THEN 7
  ELSE 0
END
WHERE offset_days IS NULL;

-- 3. Backfill due_date from tournaments.date for existing rows when missing
UPDATE public.tournament_checklist_items ci
SET due_date = (t.date + ci.offset_days)
FROM public.tournaments t
WHERE ci.tournament_id = t.id
  AND t.date IS NOT NULL
  AND ci.offset_days IS NOT NULL
  AND ci.due_date IS NULL;

-- 4. Replace the seed function so new tournaments get offsets AND computed due dates
CREATE OR REPLACE FUNCTION public.seed_tournament_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.tournament_checklist_items (tournament_id, title, description, category, sort_order, offset_days, due_date) VALUES
    -- 12 months out
    (NEW.id, 'Set tournament date', 'Confirm the date and secure the golf course.', '12_months', 1, -365, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 365 ELSE NULL END),
    (NEW.id, 'Negotiate course contract', 'Review pricing, minimums, and cancellation terms.', '12_months', 2, -360, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 360 ELSE NULL END),
    (NEW.id, 'Establish tournament budget', 'Create initial revenue and expense projections.', '12_months', 3, -355, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 355 ELSE NULL END),
    (NEW.id, 'Form tournament committee', 'Recruit key volunteers and assign responsibilities.', '12_months', 4, -350, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 350 ELSE NULL END),
    (NEW.id, 'Define tournament format', 'Choose scramble, best ball, stroke play, etc.', '12_months', 5, -345, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 345 ELSE NULL END),
    (NEW.id, 'Set fundraising goals', 'Determine how much you want to raise and for what cause.', '12_months', 6, -340, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 340 ELSE NULL END),
    -- 6 months out
    (NEW.id, 'Launch tournament website', 'Publish your branded tournament page with registration.', '6_months', 7, -180, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 180 ELSE NULL END),
    (NEW.id, 'Begin sponsor outreach', 'Create sponsor packages and start contacting potential sponsors.', '6_months', 8, -180, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 180 ELSE NULL END),
    (NEW.id, 'Open player registration', 'Enable online registration and payment collection.', '6_months', 9, -175, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 175 ELSE NULL END),
    (NEW.id, 'Plan food & beverage', 'Coordinate menu, catering, and beverage cart with the course.', '6_months', 10, -170, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 170 ELSE NULL END),
    (NEW.id, 'Order tournament merchandise', 'Design and order shirts, hats, bags, or other swag.', '6_months', 11, -165, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 165 ELSE NULL END),
    (NEW.id, 'Secure auction/raffle items', 'Begin collecting donated items for silent auction or raffle.', '6_months', 12, -160, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 160 ELSE NULL END),
    -- 3 months out
    (NEW.id, 'Confirm sponsor commitments', 'Finalize all sponsor agreements and collect logos/payments.', '3_months', 13, -90, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 90 ELSE NULL END),
    (NEW.id, 'Plan on-course contests', 'Set up closest-to-pin, longest drive, hole-in-one insurance, etc.', '3_months', 14, -85, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 85 ELSE NULL END),
    (NEW.id, 'Recruit volunteers', 'Assign volunteers to registration, contests, and other stations.', '3_months', 15, -80, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 80 ELSE NULL END),
    (NEW.id, 'Order signage & banners', 'Sponsor signs, directional signs, contest signs, and banners.', '3_months', 16, -75, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 75 ELSE NULL END),
    (NEW.id, 'Coordinate awards & prizes', 'Order trophies, gift cards, and prize packages.', '3_months', 17, -70, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 70 ELSE NULL END),
    -- 1 month out
    (NEW.id, 'Finalize player pairings', 'Create foursomes and assign tee times or shotgun start holes.', '1_month', 18, -30, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 30 ELSE NULL END),
    (NEW.id, 'Create event timeline', 'Minute-by-minute schedule for registration through awards.', '1_month', 19, -28, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 28 ELSE NULL END),
    (NEW.id, 'Send player communications', 'Email or text all registered players with event details.', '1_month', 20, -25, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 25 ELSE NULL END),
    (NEW.id, 'Prepare registration materials', 'Name badges, gift bags, scorecards, cart signs, and rules sheets.', '1_month', 21, -21, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 21 ELSE NULL END),
    (NEW.id, 'Confirm all vendors', 'Verify catering, photographers, entertainment, and rentals.', '1_month', 22, -18, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 18 ELSE NULL END),
    -- Week of
    (NEW.id, 'Final walkthrough with course', 'Review setup, cart staging, contest locations, and signage placement.', 'week_of', 23, -7, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 7 ELSE NULL END),
    (NEW.id, 'Prepare scoring system', 'Set up live scoring or manual scorecards and verification process.', 'week_of', 24, -5, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 5 ELSE NULL END),
    (NEW.id, 'Brief volunteers', 'Hold a volunteer meeting to review roles and event timeline.', 'week_of', 25, -3, CASE WHEN NEW.date IS NOT NULL THEN NEW.date - 3 ELSE NULL END),
    -- Post event
    (NEW.id, 'Send thank you communications', 'Thank players, sponsors, volunteers, and the golf course.', 'post_event', 26, 3, CASE WHEN NEW.date IS NOT NULL THEN NEW.date + 3 ELSE NULL END),
    (NEW.id, 'Share photos & results', 'Post event photos, scores, and highlights to your tournament site.', 'post_event', 27, 7, CASE WHEN NEW.date IS NOT NULL THEN NEW.date + 7 ELSE NULL END),
    (NEW.id, 'Finalize budget report', 'Reconcile all revenue and expenses. Report to stakeholders.', 'post_event', 28, 14, CASE WHEN NEW.date IS NOT NULL THEN NEW.date + 14 ELSE NULL END),
    (NEW.id, 'Conduct post-event review', 'Gather feedback and document lessons learned for next year.', 'post_event', 29, 21, CASE WHEN NEW.date IS NOT NULL THEN NEW.date + 21 ELSE NULL END),
    (NEW.id, 'Book next year''s date', 'Secure the course and date for next year''s tournament.', 'post_event', 30, 30, CASE WHEN NEW.date IS NOT NULL THEN NEW.date + 30 ELSE NULL END);
  RETURN NEW;
END;
$function$;

-- 5. Trigger to recalculate due dates when tournament date changes
CREATE OR REPLACE FUNCTION public.recalculate_checklist_due_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.date IS DISTINCT FROM OLD.date THEN
    UPDATE public.tournament_checklist_items
    SET due_date = CASE
      WHEN NEW.date IS NOT NULL AND offset_days IS NOT NULL THEN NEW.date + offset_days
      ELSE NULL
    END
    WHERE tournament_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recalc_checklist_due_dates ON public.tournaments;
CREATE TRIGGER recalc_checklist_due_dates
AFTER UPDATE OF date ON public.tournaments
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_checklist_due_dates();
