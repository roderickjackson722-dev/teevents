ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS registration_auto_close_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_close_at timestamptz,
  ADD COLUMN IF NOT EXISTS registration_closed_message text,
  ADD COLUMN IF NOT EXISTS registration_closed_contact_email text,
  ADD COLUMN IF NOT EXISTS registration_closed_contact_phone text,
  ADD COLUMN IF NOT EXISTS registration_auto_closed_at timestamptz;

ALTER TABLE public.side_events ADD COLUMN IF NOT EXISTS sales_close_at timestamptz;
ALTER TABLE public.tournament_registration_addons ADD COLUMN IF NOT EXISTS sales_close_at timestamptz;

CREATE OR REPLACE FUNCTION public.apply_scheduled_registration_closures()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE closed_count integer := 0;
BEGIN
  WITH upd AS (
    UPDATE public.tournaments
       SET registration_open = false,
           registration_auto_closed_at = now()
     WHERE registration_auto_close_enabled IS TRUE
       AND registration_close_at IS NOT NULL
       AND registration_close_at <= now()
       AND registration_open IS TRUE
    RETURNING 1
  )
  SELECT count(*) INTO closed_count FROM upd;

  UPDATE public.side_events
     SET is_active = false
   WHERE sales_close_at IS NOT NULL AND sales_close_at <= now() AND is_active IS TRUE;

  UPDATE public.tournament_registration_addons
     SET is_active = false
   WHERE sales_close_at IS NOT NULL AND sales_close_at <= now() AND is_active IS TRUE;

  RETURN closed_count;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_scheduled_registration_closures() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_scheduled_registration_closures() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('apply-scheduled-registration-closures')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'apply-scheduled-registration-closures');
    PERFORM cron.schedule(
      'apply-scheduled-registration-closures',
      '*/5 * * * *',
      $cron$SELECT public.apply_scheduled_registration_closures();$cron$
    );
  END IF;
END $$;