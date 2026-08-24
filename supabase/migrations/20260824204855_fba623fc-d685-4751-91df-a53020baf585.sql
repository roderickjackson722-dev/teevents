-- ============ tables ============
CREATE TABLE public.platform_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at timestamptz NOT NULL DEFAULT now(),
  connections int,
  max_connections int,
  connections_pct numeric,
  wal_files int,
  wal_bytes bigint,
  max_wal_bytes bigint,
  wal_pct numeric,
  db_bytes bigint,
  cache_hit_pct numeric,
  temp_bytes bigint,
  deadlocks bigint,
  rolled_back bigint,
  checkpoints_timed bigint,
  checkpoints_requested bigint,
  active_queries int,
  longest_query_seconds numeric,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_phs_captured_at ON public.platform_health_snapshots (captured_at DESC);
GRANT SELECT ON public.platform_health_snapshots TO authenticated;
GRANT ALL ON public.platform_health_snapshots TO service_role;
ALTER TABLE public.platform_health_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read health snapshots" ON public.platform_health_snapshots
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.platform_health_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  metric text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  value numeric,
  threshold numeric,
  message text NOT NULL,
  emailed_at timestamptz,
  email_error text,
  resolved_at timestamptz
);
CREATE INDEX idx_pha_created_at ON public.platform_health_alerts (created_at DESC);
CREATE INDEX idx_pha_metric_created ON public.platform_health_alerts (metric, created_at DESC);
GRANT SELECT ON public.platform_health_alerts TO authenticated;
GRANT ALL ON public.platform_health_alerts TO service_role;
ALTER TABLE public.platform_health_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read health alerts" ON public.platform_health_alerts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.platform_health_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  alert_email text NOT NULL DEFAULT 'info@teevents.golf',
  alerts_enabled boolean NOT NULL DEFAULT true,
  connections_pct_threshold numeric NOT NULL DEFAULT 80,
  wal_pct_threshold numeric NOT NULL DEFAULT 75,
  disk_gb_threshold numeric NOT NULL DEFAULT 6,
  cache_hit_pct_floor numeric NOT NULL DEFAULT 95,
  monitoring_started_at timestamptz,
  monitoring_ends_at timestamptz,
  monitoring_label text,
  last_summary_sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, INSERT ON public.platform_health_settings TO authenticated;
GRANT ALL ON public.platform_health_settings TO service_role;
ALTER TABLE public.platform_health_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read health settings" ON public.platform_health_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update health settings" ON public.platform_health_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert health settings" ON public.platform_health_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.platform_health_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- ============ live health reader ============
CREATE OR REPLACE FUNCTION public.platform_health_live()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v jsonb;
BEGIN
  SELECT jsonb_build_object(
    'captured_at', now(),
    'connections', (SELECT count(*) FROM pg_stat_activity),
    'max_connections', (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'),
    'active_queries', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
    'idle_in_transaction', (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction'),
    'longest_query_seconds', COALESCE((
      SELECT round(EXTRACT(epoch FROM (now() - min(query_start)))::numeric, 1)
      FROM pg_stat_activity WHERE state = 'active' AND query_start IS NOT NULL
    ), 0),
    'wal_files', (SELECT count(*) FROM pg_ls_waldir()),
    'wal_bytes', (SELECT COALESCE(sum(size), 0) FROM pg_ls_waldir()),
    'max_wal_bytes', (SELECT setting::bigint * 1024 * 1024 FROM pg_settings WHERE name = 'max_wal_size'),
    'db_bytes', pg_database_size(current_database()),
    'shared_buffers_bytes', (SELECT setting::bigint * 8192 FROM pg_settings WHERE name = 'shared_buffers'),
    'cache_hit_pct', COALESCE((
      SELECT round((sum(blks_hit)::numeric / GREATEST(sum(blks_hit) + sum(blks_read), 1)) * 100, 2)
      FROM pg_stat_database WHERE datname = current_database()
    ), 0),
    'temp_bytes', COALESCE((SELECT sum(temp_bytes) FROM pg_stat_database WHERE datname = current_database()), 0),
    'temp_files', COALESCE((SELECT sum(temp_files) FROM pg_stat_database WHERE datname = current_database()), 0),
    'deadlocks', COALESCE((SELECT sum(deadlocks) FROM pg_stat_database WHERE datname = current_database()), 0),
    'rolled_back', COALESCE((SELECT sum(xact_rollback) FROM pg_stat_database WHERE datname = current_database()), 0),
    'committed', COALESCE((SELECT sum(xact_commit) FROM pg_stat_database WHERE datname = current_database()), 0),
    'checkpoints_timed', (SELECT num_timed FROM pg_stat_checkpointer),
    'checkpoints_requested', (SELECT num_requested FROM pg_stat_checkpointer),
    'replication_slots', (SELECT count(*) FROM pg_replication_slots),
    'inactive_replication_slots', (SELECT count(*) FROM pg_replication_slots WHERE NOT active),
    'postgres_started_at', (SELECT pg_postmaster_start_time()),
    'version', (SELECT current_setting('server_version'))
  ) INTO v;
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_health_live() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_health_live() TO service_role;

CREATE OR REPLACE FUNCTION public.admin_platform_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;
  RETURN public.platform_health_live();
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_platform_health() TO authenticated, service_role;

-- ============ WAL / checkpoint diagnostics ============
CREATE OR REPLACE FUNCTION public.admin_wal_diagnostics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  SELECT jsonb_build_object(
    'settings', (
      SELECT jsonb_object_agg(name, setting || COALESCE(' ' || unit, ''))
      FROM pg_settings
      WHERE name IN (
        'max_wal_size','min_wal_size','checkpoint_timeout','checkpoint_completion_target',
        'wal_keep_size','wal_level','archive_mode','shared_buffers','work_mem','max_connections'
      )
    ),
    'checkpointer', (
      SELECT jsonb_build_object(
        'num_timed', num_timed,
        'num_requested', num_requested,
        'write_time_ms', round(write_time::numeric, 0),
        'sync_time_ms', round(sync_time::numeric, 0),
        'buffers_written', buffers_written,
        'stats_reset', stats_reset,
        'minutes_since_reset', round(EXTRACT(epoch FROM (now() - stats_reset))::numeric / 60, 1)
      ) FROM pg_stat_checkpointer
    ),
    'wal', (
      SELECT jsonb_build_object(
        'files', count(*),
        'bytes', COALESCE(sum(size), 0),
        'oldest_file', min(name),
        'newest_file', max(name)
      ) FROM pg_ls_waldir()
    ),
    'wal_activity', (
      SELECT jsonb_build_object(
        'wal_records', wal_records,
        'wal_bytes', wal_bytes,
        'wal_fpi', wal_fpi,
        'stats_reset', stats_reset
      ) FROM pg_stat_wal
    ),
    'replication_slots', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'slot_name', slot_name, 'active', active, 'slot_type', slot_type,
        'retained_bytes', pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)
      )) FROM pg_replication_slots
    ), '[]'::jsonb),
    'top_write_tables', COALESCE((
      SELECT jsonb_agg(t) FROM (
        SELECT relname AS table_name,
               n_tup_ins AS inserts, n_tup_upd AS updates, n_tup_del AS deletes,
               n_dead_tup AS dead_rows, last_autovacuum, last_autoanalyze
        FROM pg_stat_user_tables
        ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) DESC
        LIMIT 10
      ) t
    ), '[]'::jsonb),
    'vacuum_running', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('phase', phase, 'relation', relid::regclass::text))
      FROM pg_stat_progress_vacuum
    ), '[]'::jsonb)
  ) INTO v;

  RETURN v;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_wal_diagnostics() TO authenticated, service_role;

-- ============ snapshot capture (used by scheduled monitor) ============
CREATE OR REPLACE FUNCTION public.platform_health_capture()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  m jsonb;
  row_id uuid;
BEGIN
  m := public.platform_health_live();

  INSERT INTO public.platform_health_snapshots (
    connections, max_connections, connections_pct,
    wal_files, wal_bytes, max_wal_bytes, wal_pct,
    db_bytes, cache_hit_pct, temp_bytes, deadlocks, rolled_back,
    checkpoints_timed, checkpoints_requested, active_queries, longest_query_seconds, metrics
  ) VALUES (
    (m->>'connections')::int,
    (m->>'max_connections')::int,
    round(((m->>'connections')::numeric / GREATEST((m->>'max_connections')::numeric, 1)) * 100, 2),
    (m->>'wal_files')::int,
    (m->>'wal_bytes')::bigint,
    (m->>'max_wal_bytes')::bigint,
    round(((m->>'wal_bytes')::numeric / GREATEST((m->>'max_wal_bytes')::numeric, 1)) * 100, 2),
    (m->>'db_bytes')::bigint,
    (m->>'cache_hit_pct')::numeric,
    (m->>'temp_bytes')::bigint,
    (m->>'deadlocks')::bigint,
    (m->>'rolled_back')::bigint,
    (m->>'checkpoints_timed')::bigint,
    (m->>'checkpoints_requested')::bigint,
    (m->>'active_queries')::int,
    (m->>'longest_query_seconds')::numeric,
    m
  ) RETURNING id INTO row_id;

  RETURN m || jsonb_build_object('snapshot_id', row_id);
END;
$$;
REVOKE ALL ON FUNCTION public.platform_health_capture() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_health_capture() TO service_role;

-- keep the snapshot table small
CREATE OR REPLACE FUNCTION public.prune_platform_health_snapshots()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.platform_health_snapshots WHERE captured_at < now() - interval '45 days';
  DELETE FROM public.platform_health_alerts WHERE created_at < now() - interval '90 days';
$$;
REVOKE ALL ON FUNCTION public.prune_platform_health_snapshots() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prune_platform_health_snapshots() TO service_role;