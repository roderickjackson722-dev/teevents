
-- Audit log table
CREATE TABLE IF NOT EXISTS public.dashboard_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  user_email text,
  organization_id uuid,
  table_name text NOT NULL,
  row_id text,
  action text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_fields jsonb,
  old_values jsonb,
  new_values jsonb
);

CREATE INDEX IF NOT EXISTS idx_dashboard_audit_log_occurred_at ON public.dashboard_audit_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_audit_log_user_id ON public.dashboard_audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_audit_log_table ON public.dashboard_audit_log (table_name);
CREATE INDEX IF NOT EXISTS idx_dashboard_audit_log_org ON public.dashboard_audit_log (organization_id);

ALTER TABLE public.dashboard_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit log" ON public.dashboard_audit_log;
CREATE POLICY "Admins can view audit log"
  ON public.dashboard_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- No insert/update/delete policies → only service role / triggers (SECURITY DEFINER) can write.

-- Generic trigger function
CREATE OR REPLACE FUNCTION public.log_dashboard_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_org_id uuid;
  v_row_id text;
  v_old jsonb;
  v_new jsonb;
  v_changed jsonb := '{}'::jsonb;
  k text;
BEGIN
  -- Skip if no authenticated user (system / service-role writes from edge functions still get logged with NULL user)
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_new := NULL;
    v_row_id := COALESCE((v_old->>'id'), NULL);
    v_org_id := NULLIF(v_old->>'organization_id','')::uuid;
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_old := NULL;
    v_row_id := COALESCE((v_new->>'id'), NULL);
    v_org_id := NULLIF(v_new->>'organization_id','')::uuid;
  ELSE -- UPDATE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_row_id := COALESCE((v_new->>'id'), NULL);
    v_org_id := NULLIF(v_new->>'organization_id','')::uuid;
    -- Build diff of changed fields only
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF (v_new -> k) IS DISTINCT FROM (v_old -> k) THEN
        v_changed := v_changed || jsonb_build_object(k, jsonb_build_object('old', v_old -> k, 'new', v_new -> k));
      END IF;
    END LOOP;
    -- Skip if nothing actually changed
    IF v_changed = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.dashboard_audit_log
    (user_id, user_email, organization_id, table_name, row_id, action, changed_fields, old_values, new_values)
  VALUES
    (v_user_id, v_email, v_org_id, TG_TABLE_NAME, v_row_id, TG_OP, NULLIF(v_changed,'{}'::jsonb), v_old, v_new);

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Never block a write because audit logging failed
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach trigger to dashboard-writable tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'organizations','org_members','org_invitations','user_roles',
    'tournaments','tournament_registrations','tournament_registration_tiers',
    'tournament_registration_fields','tournament_registration_addons','tournament_registration_addon_purchases',
    'tournament_sponsors','sponsorship_tiers','sponsor_registrations','sponsor_assets','sponsorship_pages',
    'vendor_tiers','vendor_registrations','vendor_booth_locations','vendor_forms',
    'tournament_volunteers','tournament_volunteer_roles',
    'tournament_contests','tournament_scores','tournament_waitlist',
    'tournament_promo_codes','tournament_donations','tournament_refund_requests',
    'tournament_store_products','tournament_messages','tournament_photos',
    'tournament_auction_items','tournament_auction_bids',
    'tournament_budgets','tournament_budget_items',
    'tournament_survey_questions','tournament_surveys','tournament_survey_responses',
    'tournament_accommodations','accommodation_room_types','accommodation_custom_fields',
    'side_events','side_event_tickets',
    'auctions','auction_bids','raffles','raffle_tickets',
    'media_clips','leaderboard_gallery','pin_placements','course_tee_sets','golf_courses',
    'organization_payout_methods','organization_payouts','payout_change_requests','payout_notes','manual_payouts','paypal_payouts',
    'event_resources','events','approved_emails',
    'golf_trips','trip_participants','trip_agenda','trip_games','trip_rooms','trip_skins','trip_tee_times','trip_payments',
    'team_promoters','promoter_incentives',
    'notification_emails'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
      EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_dashboard_change()', t, t);
    END IF;
  END LOOP;
END $$;
