-- Cron tokens for scheduled jobs
INSERT INTO public.internal_cron_tokens (name, token) VALUES
  ('edge_cron', encode(extensions.gen_random_bytes(32), 'hex')),
  ('public_hooks', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE te text; tp text; r record; tok text;
BEGIN
  SELECT token INTO te FROM public.internal_cron_tokens WHERE name='edge_cron';
  SELECT token INTO tp FROM public.internal_cron_tokens WHERE name='public_hooks';
  FOR r IN SELECT jobid, jobname, command FROM cron.job WHERE jobname IN (
    'auction-auto-end-every-5min','daily-fee-summary','process-demo-followups','process-scheduled-sms',
    'raffle-auto-draw-hourly','recalc-league-handicaps-nightly','send-outreach-emails-hourly',
    'send-post-event-surveys-daily','send-vendor-reminders-daily','verify-payment-routing-daily',
    'weekly-transaction-report','auto-reconcile-league-payments','daily-tournament-page-canary',
    'handicap-daily-sync','help-chat-daily-summary','platform-health-monitor','process-league-renewals-daily')
    AND command NOT ILIKE '%x-cron-token%'
  LOOP
    tok := CASE WHEN r.command ILIKE '%/functions/v1/%' THEN te ELSE tp END;
    PERFORM cron.alter_job(job_id := r.jobid,
      command := regexp_replace(r.command, 'headers\s*:=\s*''\{', 'headers:=''{"x-cron-token":"' || tok || '",'));
  END LOOP;
END $$;

-- Tighten public insert policies
DROP POLICY IF EXISTS "Anyone can create a demo lead" ON public.demo_leads;
CREATE POLICY "Anyone can create a demo lead" ON public.demo_leads FOR INSERT TO public
WITH CHECK (email IS NOT NULL AND length(email) <= 320 AND demo_completed = false AND welcome_email_sent_at IS NULL
  AND followup_24h_sent_at IS NULL AND followup_7d_sent_at IS NULL AND signed_up_at IS NULL AND feedback_submitted_at IS NULL);

DROP POLICY IF EXISTS "Public reads partner option" ON public.tournament_partner_settings;
CREATE POLICY "Public reads partner option" ON public.tournament_partner_settings FOR SELECT TO public
USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_partner_settings.tournament_id AND t.site_published = true));

DROP POLICY IF EXISTS "Anyone can request event access" ON public.event_access_requests;
DROP POLICY IF EXISTS "Anyone can request access" ON public.event_access_requests;
CREATE POLICY "Anyone can request access" ON public.event_access_requests FOR INSERT TO public
WITH CHECK (status = 'pending' AND (user_id IS NULL OR user_id = auth.uid())
  AND length(coalesce(email,'')) <= 320 AND length(coalesce(name,'')) <= 200
  AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_access_requests.event_id));

DROP POLICY IF EXISTS "Anyone create side event tickets" ON public.side_event_tickets;
CREATE POLICY "Anyone create side event tickets" ON public.side_event_tickets FOR INSERT TO public
WITH CHECK (payment_status = 'pending' AND paid_at IS NULL AND checked_in_at IS NULL AND stripe_payment_intent_id IS NULL
  AND quantity BETWEEN 1 AND 50 AND amount_cents >= 0
  AND EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = side_event_tickets.tournament_id AND t.site_published = true));

DROP POLICY IF EXISTS "Anyone can record FAQ clicks" ON public.faq_question_clicks;
CREATE POLICY "Anyone can record FAQ clicks" ON public.faq_question_clicks FOR INSERT TO anon, authenticated
WITH CHECK (length(coalesce(question,'')) BETWEEN 1 AND 500 AND length(coalesce(category,'')) <= 100);

DROP POLICY IF EXISTS "Anyone can create sponsor registrations" ON public.sponsor_registrations;
CREATE POLICY "Anyone can create sponsor registrations" ON public.sponsor_registrations FOR INSERT TO public
WITH CHECK (payment_status = 'pending' AND paid_at IS NULL AND manually_approved = false AND is_title_sponsor = false
  AND stripe_payment_intent_id IS NULL AND receipt_sent = false
  AND EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = sponsor_registrations.tournament_id AND t.site_published = true));

DROP POLICY IF EXISTS "Anyone can log clicks" ON public.referral_clicks;
CREATE POLICY "Anyone can log clicks" ON public.referral_clicks FOR INSERT TO public
WITH CHECK (promoter_id IS NOT NULL AND length(coalesce(user_agent,'')) <= 1000 AND length(coalesce(ip_address::text,'')) <= 100);

DROP POLICY IF EXISTS "Anyone can submit a sample request" ON public.sample_requests;
CREATE POLICY "Anyone can submit a sample request" ON public.sample_requests FOR INSERT TO anon, authenticated
WITH CHECK (status = 'pending' AND sample_created = false AND sample_url IS NULL AND notes IS NULL
  AND email IS NOT NULL AND length(email) <= 320);

DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.tournament_clicks;
CREATE POLICY "Anyone can insert clicks" ON public.tournament_clicks FOR INSERT TO public
WITH CHECK (length(coalesce(source,'')) <= 100 AND length(coalesce(user_agent,'')) <= 1000 AND length(coalesce(referrer,'')) <= 2000
  AND EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_clicks.tournament_id));

DROP POLICY IF EXISTS "Anyone can submit a demo request" ON public.demo_requests;
CREATE POLICY "Anyone can submit a demo request" ON public.demo_requests FOR INSERT TO anon, authenticated
WITH CHECK (status = 'pending' AND contacted_at IS NULL AND notes IS NULL AND email IS NOT NULL AND length(email) <= 320);

DROP POLICY IF EXISTS "Anyone can create purchases" ON public.event_day_sales_purchases;
CREATE POLICY "Anyone can create purchases" ON public.event_day_sales_purchases FOR INSERT TO public
WITH CHECK (payment_status = 'pending' AND quantity BETWEEN 1 AND 100 AND amount_cents >= 0
  AND EXISTS (SELECT 1 FROM public.event_day_sales_items i WHERE i.id = event_day_sales_purchases.item_id AND i.tournament_id = event_day_sales_purchases.tournament_id));

DROP POLICY IF EXISTS "Anyone can insert donations" ON public.tournament_donations;
CREATE POLICY "Anyone can insert donations" ON public.tournament_donations FOR INSERT TO public
WITH CHECK (status = 'pending' AND amount_cents > 0
  AND EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_donations.tournament_id AND t.site_published = true));

DROP POLICY IF EXISTS "Authenticated users can create orgs" ON public.organizations;
CREATE POLICY "Authenticated users can create orgs" ON public.organizations FOR INSERT TO authenticated
WITH CHECK (stripe_account_id IS NULL AND nonprofit_verified = false AND fee_override IS NULL AND feature_overrides IS NULL
  AND platform_fee_rate = 4 AND coalesce(status,'active') = 'active' AND league_subscription_active = false
  AND coalesce(league_subscription_status,'inactive') = 'inactive' AND enterprise_subscription_id IS NULL
  AND enterprise_subscription_status IS NULL AND dedicated_rep_name IS NULL AND dedicated_rep_email IS NULL
  AND coalesce(plan,'base') IN ('base','free') AND coalesce(pricing_model,'legacy') IN ('legacy','free','per_event','per_league'));

DROP POLICY IF EXISTS "Anyone can create early signups" ON public.early_signups;
CREATE POLICY "Anyone can create early signups" ON public.early_signups FOR INSERT TO public
WITH CHECK (email IS NOT NULL AND length(email) <= 320 AND length(coalesce(name,'')) <= 200
  AND (tournament_id IS NULL OR EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = early_signups.tournament_id)));

DROP POLICY IF EXISTS "Anyone can create reservation" ON public.booking_reservations;
DROP POLICY IF EXISTS "Authenticated can create reservation" ON public.booking_reservations;
CREATE POLICY "Anyone can create reservation" ON public.booking_reservations FOR INSERT TO anon, authenticated
WITH CHECK (coalesce(status,'confirmed') = 'confirmed' AND length(coalesce(coach_email,'')) <= 320 AND length(coalesce(notes,'')) <= 2000
  AND EXISTS (SELECT 1 FROM public.booking_slots s WHERE s.id = booking_reservations.slot_id));

DROP POLICY IF EXISTS "Anyone can submit a vendor registration" ON public.vendor_registrations;
CREATE POLICY "Anyone can submit a vendor registration" ON public.vendor_registrations FOR INSERT TO public
WITH CHECK (payment_status = 'pending' AND status = 'pending_approval' AND paid_at IS NULL AND checked_in = false
  AND manually_approved = false AND stripe_payment_intent_id IS NULL AND booth_location IS NULL
  AND EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = vendor_registrations.tournament_id AND t.site_published = true));

-- Storage uploads bound to safe paths
DROP POLICY IF EXISTS "Anyone can upload sample request files" ON storage.objects;
CREATE POLICY "Anyone can upload sample request files" ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'sample-requests'
  AND name ~ '^(flyer|logo)s/[0-9a-f-]{36}\.(png|jpe?g|webp|gif|pdf|svg)$');

DROP POLICY IF EXISTS "Authenticated users can upload director shop logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload director shop logos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'director-shop-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- League search no longer reveals membership of arbitrary emails
CREATE OR REPLACE FUNCTION public.find_leagues(_query text)
 RETURNS TABLE(league_name text, league_slug text, season_year integer, is_active boolean, is_member boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT l.league_name, l.league_slug, l.season_year, l.is_active,
         EXISTS (SELECT 1 FROM public.league_members m
           WHERE m.league_id = l.id AND lower(m.email) = lower(btrim(_query))
             AND lower(btrim(_query)) = lower(coalesce(auth.jwt()->>'email',''))) AS is_member
  FROM public.golf_leagues l
  WHERE l.publish_status = 'published' AND l.allow_search = true
    AND length(btrim(coalesce(_query, ''))) >= 3
    AND (l.league_name ILIKE '%' || btrim(_query) || '%'
      OR EXISTS (SELECT 1 FROM public.league_members m
        WHERE m.league_id = l.id AND lower(m.email) = lower(btrim(_query))
          AND lower(btrim(_query)) = lower(coalesce(auth.jwt()->>'email',''))))
  ORDER BY l.league_name
  LIMIT 20
$function$;