-- Part 1: branding / presented-by fields
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS branding_removed_paid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS branding_removed_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS presented_by TEXT,
  ADD COLUMN IF NOT EXISTS presented_by_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Part 2: archive table
CREATE TABLE IF NOT EXISTS public.archived_tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  organization_id UUID,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS archived_tournaments_tournament_id_key
  ON public.archived_tournaments(tournament_id);

GRANT SELECT ON public.archived_tournaments TO authenticated;
GRANT ALL ON public.archived_tournaments TO service_role;

ALTER TABLE public.archived_tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view archives" ON public.archived_tournaments;
CREATE POLICY "Admins can view archives"
  ON public.archived_tournaments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Org members can view their archives" ON public.archived_tournaments;
CREATE POLICY "Org members can view their archives"
  ON public.archived_tournaments FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()));

DROP TRIGGER IF EXISTS trg_archived_tournaments_updated_at ON public.archived_tournaments;
CREATE TRIGGER trg_archived_tournaments_updated_at
BEFORE UPDATE ON public.archived_tournaments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Daily cleanup: archive score snapshot, drop regenerable live data, mark archived.
CREATE OR REPLACE FUNCTION public.archive_completed_tournaments(_days INTEGER DEFAULT 30)
RETURNS TABLE(archived_count INTEGER, snapshots_deleted INTEGER, clicks_deleted INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD;
  n_arch INTEGER := 0;
  n_snap INTEGER := 0;
  n_click INTEGER := 0;
  d INTEGER;
BEGIN
  FOR t IN
    SELECT id, organization_id, title, date, end_date
    FROM public.tournaments
    WHERE archived = FALSE
      AND COALESCE(end_date, date) IS NOT NULL
      AND COALESCE(end_date, date) < (CURRENT_DATE - _days)
    LIMIT 200
  LOOP
    INSERT INTO public.archived_tournaments (tournament_id, organization_id, data)
    VALUES (
      t.id,
      t.organization_id,
      jsonb_build_object(
        'title', t.title,
        'date', t.date,
        'end_date', t.end_date,
        'archived_reason', 'auto_cleanup',
        'scores', COALESCE((
          SELECT jsonb_agg(to_jsonb(s)) FROM public.tournament_scores s WHERE s.tournament_id = t.id
        ), '[]'::jsonb)
      )
    )
    ON CONFLICT (tournament_id) DO UPDATE
      SET data = EXCLUDED.data, archived_at = now(), updated_at = now();

    DELETE FROM public.leaderboard_snapshots WHERE tournament_id = t.id;
    GET DIAGNOSTICS d = ROW_COUNT; n_snap := n_snap + d;

    DELETE FROM public.tournament_clicks
      WHERE tournament_id = t.id AND created_at < now() - INTERVAL '30 days';
    GET DIAGNOSTICS d = ROW_COUNT; n_click := n_click + d;

    UPDATE public.tournaments SET archived = TRUE, archived_at = now() WHERE id = t.id;
    n_arch := n_arch + 1;
  END LOOP;

  RETURN QUERY SELECT n_arch, n_snap, n_click;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_completed_tournaments(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_completed_tournaments(INTEGER) TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('daily-tournament-archive-cleanup')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-tournament-archive-cleanup');
    PERFORM cron.schedule(
      'daily-tournament-archive-cleanup',
      '30 8 * * *',
      $cron$SELECT public.archive_completed_tournaments(30);$cron$
    );
  END IF;
END $$;

-- Part 5: admin in-dashboard alert on new tournament
CREATE OR REPLACE FUNCTION public.notify_admin_new_tournament()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE org_name TEXT;
BEGIN
  SELECT name INTO org_name FROM public.organizations WHERE id = NEW.organization_id;
  PERFORM public.push_admin_notification(
    'tournament',
    'New Tournament Created – ' || COALESCE(NEW.title, 'Untitled'),
    COALESCE(org_name, 'An organizer') || ' created "' || COALESCE(NEW.title, 'Untitled')
      || '"' || COALESCE(' on ' || NEW.date::text, '') || '.',
    '/admin/users-events',
    NEW.organization_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_new_tournament ON public.tournaments;
CREATE TRIGGER trg_notify_admin_new_tournament
AFTER INSERT ON public.tournaments
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_tournament();