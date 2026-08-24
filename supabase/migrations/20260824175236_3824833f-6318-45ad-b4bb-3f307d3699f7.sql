-- 1. Slim down the audit trigger so it stops storing full row snapshots.
CREATE OR REPLACE FUNCTION public.log_dashboard_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_org_id uuid;
  v_row_id text;
  v_old jsonb;
  v_new jsonb;
  v_changed jsonb := '{}'::jsonb;
  k text;
  v_old_v jsonb;
  v_new_v jsonb;
  MAX_VALUE_BYTES constant int := 2048;
BEGIN
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_row_id := COALESCE((v_old->>'id'), NULL);
    v_org_id := NULLIF(v_old->>'organization_id','')::uuid;
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_row_id := COALESCE((v_new->>'id'), NULL);
    v_org_id := NULLIF(v_new->>'organization_id','')::uuid;
  ELSE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_row_id := COALESCE((v_new->>'id'), NULL);
    v_org_id := NULLIF(v_new->>'organization_id','')::uuid;
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF (v_new -> k) IS DISTINCT FROM (v_old -> k) THEN
        v_old_v := v_old -> k;
        v_new_v := v_new -> k;
        IF pg_column_size(v_old_v) > MAX_VALUE_BYTES THEN
          v_old_v := jsonb_build_object('_truncated', true, 'bytes', pg_column_size(v_old -> k));
        END IF;
        IF pg_column_size(v_new_v) > MAX_VALUE_BYTES THEN
          v_new_v := jsonb_build_object('_truncated', true, 'bytes', pg_column_size(v_new -> k));
        END IF;
        v_changed := v_changed || jsonb_build_object(k, jsonb_build_object('old', v_old_v, 'new', v_new_v));
      END IF;
    END LOOP;
    IF v_changed = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Only keep full snapshots for inserts/deletes, and only when small.
  IF TG_OP = 'UPDATE' THEN
    v_old := NULL;
    v_new := NULL;
  ELSE
    IF v_old IS NOT NULL AND pg_column_size(v_old) > 8192 THEN
      v_old := jsonb_build_object('_truncated', true, 'bytes', pg_column_size(v_old));
    END IF;
    IF v_new IS NOT NULL AND pg_column_size(v_new) > 8192 THEN
      v_new := jsonb_build_object('_truncated', true, 'bytes', pg_column_size(v_new));
    END IF;
  END IF;

  INSERT INTO public.dashboard_audit_log
    (user_id, user_email, organization_id, table_name, row_id, action, changed_fields, old_values, new_values)
  VALUES
    (v_user_id, v_email, v_org_id, TG_TABLE_NAME, v_row_id, TG_OP, NULLIF(v_changed,'{}'::jsonb), v_old, v_new);

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 2. Reclaim space from existing oversized audit rows (keep changed_fields).
UPDATE public.dashboard_audit_log
SET old_values = CASE WHEN old_values IS NULL THEN NULL
                      ELSE jsonb_build_object('_truncated', true, 'bytes', pg_column_size(old_values)) END,
    new_values = CASE WHEN new_values IS NULL THEN NULL
                      ELSE jsonb_build_object('_truncated', true, 'bytes', pg_column_size(new_values)) END
WHERE coalesce(pg_column_size(old_values),0) + coalesce(pg_column_size(new_values),0) > 8192;

-- 3. Nightly housekeeping for log tables.
CREATE OR REPLACE FUNCTION public.prune_platform_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.dashboard_audit_log WHERE occurred_at < now() - interval '180 days';
  DELETE FROM public.site_visits WHERE created_at < now() - interval '180 days';
  DELETE FROM public.leaderboard_performance_log WHERE created_at < now() - interval '30 days';
END;
$$;

REVOKE ALL ON FUNCTION public.prune_platform_logs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_platform_logs() TO service_role;

SELECT cron.schedule('prune-platform-logs', '30 4 * * *', $$SELECT public.prune_platform_logs();$$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-platform-logs');

-- 4. Indexes for the hottest queries found in pg_stat_statements.
CREATE INDEX IF NOT EXISTS idx_tournament_messages_status_scheduled
  ON public.tournament_messages (status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_tournament_photos_tid_order
  ON public.tournament_photos (tournament_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_tournament_reg_fields_tid_order
  ON public.tournament_registration_fields (tournament_id, sort_order)
  WHERE is_enabled;

CREATE INDEX IF NOT EXISTS idx_tournament_volunteer_roles_tid_order
  ON public.tournament_volunteer_roles (tournament_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_tournament_surveys_tid_active
  ON public.tournament_surveys (tournament_id)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_tournaments_day_before_pending
  ON public.tournaments (day_before_send_at)
  WHERE day_before_approved AND day_before_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tournaments_custom_domain_published
  ON public.tournaments (custom_domain)
  WHERE site_published;

CREATE INDEX IF NOT EXISTS idx_site_visits_created_at
  ON public.site_visits (created_at DESC);

ANALYZE public.dashboard_audit_log;
ANALYZE public.tournament_messages;
ANALYZE public.tournaments;
