ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS registration_close_includes_addons boolean NOT NULL DEFAULT true;

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

  -- Per-item cut-off times
  UPDATE public.side_events
     SET is_active = false
   WHERE sales_close_at IS NOT NULL AND sales_close_at <= now() AND is_active IS TRUE;

  UPDATE public.tournament_registration_addons
     SET is_active = false
   WHERE sales_close_at IS NOT NULL AND sales_close_at <= now() AND is_active IS TRUE;

  -- Tournament-level close that also covers add-ons / side events
  UPDATE public.side_events se
     SET is_active = false
    FROM public.tournaments t
   WHERE se.tournament_id = t.id
     AND se.is_active IS TRUE
     AND t.registration_auto_close_enabled IS TRUE
     AND t.registration_close_includes_addons IS TRUE
     AND t.registration_close_at IS NOT NULL
     AND t.registration_close_at <= now();

  UPDATE public.tournament_registration_addons a
     SET is_active = false
    FROM public.tournaments t
   WHERE a.tournament_id = t.id
     AND a.is_active IS TRUE
     AND t.registration_auto_close_enabled IS TRUE
     AND t.registration_close_includes_addons IS TRUE
     AND t.registration_close_at IS NOT NULL
     AND t.registration_close_at <= now();

  RETURN closed_count;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_scheduled_registration_closures() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_scheduled_registration_closures() TO service_role;