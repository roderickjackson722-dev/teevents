
-- Part 1: Live Leaderboard settings on tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS live_leaderboard_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS live_scoring_require_code BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS live_show_gross BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS live_show_net BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS live_default_view TEXT NOT NULL DEFAULT 'gross',
  ADD COLUMN IF NOT EXISTS live_show_sponsors BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS live_sponsor_placement TEXT NOT NULL DEFAULT 'footer',
  ADD COLUMN IF NOT EXISTS live_allow_edit_past_holes BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS live_require_confirm_save BOOLEAN NOT NULL DEFAULT false;

-- Part 2: group scoring code on registrations (shared across foursome)
ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS group_scoring_code TEXT;

CREATE INDEX IF NOT EXISTS idx_tournament_registrations_group_scoring_code
  ON public.tournament_registrations(tournament_id, group_scoring_code);

-- Backfill: generate a shared 6-char unambiguous code per (tournament_id, group_number)
DO $$
DECLARE
  rec RECORD;
  new_code TEXT;
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i INT;
BEGIN
  FOR rec IN
    SELECT DISTINCT tournament_id, group_number
    FROM public.tournament_registrations
    WHERE group_number IS NOT NULL
      AND (group_scoring_code IS NULL OR group_scoring_code = '')
  LOOP
    LOOP
      new_code := '';
      FOR i IN 1..6 LOOP
        new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.tournament_registrations
        WHERE tournament_id = rec.tournament_id AND group_scoring_code = new_code
      );
    END LOOP;
    UPDATE public.tournament_registrations
      SET group_scoring_code = new_code
      WHERE tournament_id = rec.tournament_id
        AND group_number = rec.group_number
        AND (group_scoring_code IS NULL OR group_scoring_code = '');
  END LOOP;
END $$;

-- Trigger to auto-generate group_scoring_code when a registration is inserted/updated
CREATE OR REPLACE FUNCTION public.assign_group_scoring_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_code TEXT;
  new_code TEXT;
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i INT;
BEGIN
  IF NEW.group_number IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.group_scoring_code IS NOT NULL AND NEW.group_scoring_code <> '' THEN
    RETURN NEW;
  END IF;
  -- Reuse code if any teammate already has one
  SELECT group_scoring_code INTO existing_code
  FROM public.tournament_registrations
  WHERE tournament_id = NEW.tournament_id
    AND group_number = NEW.group_number
    AND group_scoring_code IS NOT NULL
    AND group_scoring_code <> ''
  LIMIT 1;
  IF existing_code IS NOT NULL THEN
    NEW.group_scoring_code := existing_code;
    RETURN NEW;
  END IF;
  -- Generate new unique code within tournament
  LOOP
    new_code := '';
    FOR i IN 1..6 LOOP
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.tournament_registrations
      WHERE tournament_id = NEW.tournament_id AND group_scoring_code = new_code
    );
  END LOOP;
  NEW.group_scoring_code := new_code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_group_scoring_code ON public.tournament_registrations;
CREATE TRIGGER trg_assign_group_scoring_code
BEFORE INSERT OR UPDATE OF group_number ON public.tournament_registrations
FOR EACH ROW EXECUTE FUNCTION public.assign_group_scoring_code();

-- RLS: allow anon to read registrations by group_scoring_code on published tournaments
DROP POLICY IF EXISTS "Public can view registrants by group scoring code" ON public.tournament_registrations;
CREATE POLICY "Public can view registrants by group scoring code"
ON public.tournament_registrations FOR SELECT TO anon, authenticated
USING (
  group_scoring_code IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND t.site_published = true
  )
);

-- Allow anon to insert/update scores when group has a valid scoring code (gated by check at app layer)
-- Existing tournament_scores policies likely already allow this for authenticated/public; only add if missing:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='tournament_scores' AND policyname='Public can write scores via group code'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY "Public can write scores via group code"
      ON public.tournament_scores FOR ALL TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.tournament_registrations r
          JOIN public.tournaments t ON t.id = r.tournament_id
          WHERE r.id = tournament_scores.registration_id
            AND t.site_published = true
            AND r.group_scoring_code IS NOT NULL
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.tournament_registrations r
          JOIN public.tournaments t ON t.id = r.tournament_id
          WHERE r.id = tournament_scores.registration_id
            AND t.site_published = true
            AND r.group_scoring_code IS NOT NULL
        )
      )
    $POL$;
  END IF;
END $$;

GRANT SELECT ON public.tournament_registrations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_scores TO anon, authenticated;
GRANT ALL ON public.tournament_scores TO service_role;
