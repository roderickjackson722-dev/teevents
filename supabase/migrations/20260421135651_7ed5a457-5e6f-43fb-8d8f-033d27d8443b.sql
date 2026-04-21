
-- Part 1: Schema additions for migrated CMS events
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS external_link TEXT,
  ADD COLUMN IF NOT EXISTS gallery_url TEXT,
  ADD COLUMN IF NOT EXISTS results_url TEXT;

CREATE INDEX IF NOT EXISTS idx_tournaments_display_order ON public.tournaments(display_order);
CREATE INDEX IF NOT EXISTS idx_tournaments_managed_by_teevents ON public.tournaments(managed_by_teevents) WHERE managed_by_teevents = true;

-- Migrate legacy events into tournaments under "TeeVents Charity Foundation" org
-- Skip events that have already been migrated (matched by title + date).
DO $$
DECLARE
  org_uuid UUID;
BEGIN
  SELECT id INTO org_uuid FROM public.organizations WHERE name = 'TeeVents Charity Foundation' LIMIT 1;
  IF org_uuid IS NULL THEN
    INSERT INTO public.organizations (name, plan, is_nonprofit)
    VALUES ('TeeVents Charity Foundation', 'premium', true)
    RETURNING id INTO org_uuid;
  END IF;

  INSERT INTO public.tournaments (
    organization_id, title, description, date, location, image_url,
    external_link, gallery_url, results_url,
    status, managed_by_teevents, display_order,
    site_published, registration_open, show_in_public_search
  )
  SELECT
    org_uuid,
    e.title,
    e.description,
    e.date,
    e.location,
    e.image_url,
    e.link,
    e.gallery_url,
    e.results_url,
    'past',
    true,
    COALESCE(e.sort_order, 0),
    false,
    false,
    false
  FROM public.events e
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.managed_by_teevents = true
      AND t.title = e.title
      AND COALESCE(t.date::text, '') = COALESCE(e.date::text, '')
  );
END $$;
