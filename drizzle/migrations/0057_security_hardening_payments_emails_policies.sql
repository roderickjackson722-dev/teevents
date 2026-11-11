CREATE TABLE IF NOT EXISTS public.stripe_session_fulfillments (
  session_id text PRIMARY KEY,
  kind text NOT NULL,
  tournament_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.stripe_session_fulfillments TO service_role;
ALTER TABLE public.stripe_session_fulfillments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.email_send_dedupe (
  key text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.email_send_dedupe TO service_role;
ALTER TABLE public.email_send_dedupe ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.generate_team_login_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate TEXT;
  bytes bytea;
  i INT;
BEGIN
  LOOP
    candidate := '';
    bytes := extensions.gen_random_bytes(6);
    FOR i IN 0..5 LOOP
      candidate := candidate || substr(chars, 1 + (get_byte(bytes, i) % length(chars)), 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.org_members WHERE login_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_tournament_paid_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon')
     OR coalesce(auth.jwt() ->> 'role', '') = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_pro := false;
    NEW.pro_paid_at := NULL;
    NEW.pro_payment_intent_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.is_pro IS DISTINCT FROM OLD.is_pro
     OR NEW.pro_paid_at IS DISTINCT FROM OLD.pro_paid_at
     OR NEW.pro_payment_intent_id IS DISTINCT FROM OLD.pro_payment_intent_id
     OR NEW.paid_features IS DISTINCT FROM OLD.paid_features
     OR NEW.sms_enabled IS DISTINCT FROM OLD.sms_enabled
     OR NEW.sms_plan IS DISTINCT FROM OLD.sms_plan
     OR NEW.sms_credits_limit IS DISTINCT FROM OLD.sms_credits_limit THEN
    RAISE EXCEPTION 'Paid features can only be changed through checkout or by TeeVents staff.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_tournament_paid_entitlements ON public.tournaments;
CREATE TRIGGER guard_tournament_paid_entitlements
BEFORE INSERT OR UPDATE ON public.tournaments
FOR EACH ROW EXECUTE FUNCTION public.guard_tournament_paid_entitlements();

DROP POLICY IF EXISTS "Anyone can read outreach templates" ON public.outreach_templates;

DROP POLICY IF EXISTS "Anyone authenticated can read setup tasks" ON public.setup_checklist_tasks;
CREATE POLICY "Organizers can read setup tasks"
ON public.setup_checklist_tasks
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.org_members m WHERE m.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Round status is publicly readable" ON public.tournament_rounds;
CREATE POLICY "Round status readable for public events"
ON public.tournament_rounds
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_rounds.tournament_id
      AND (t.site_published = true OR t.is_sample = true OR t.live_leaderboard_enabled = true)
  )
);

INSERT INTO public.internal_cron_tokens (name, token)
VALUES ('scheduled_emails', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  tok text;
  jid bigint;
BEGIN
  SELECT token INTO tok FROM public.internal_cron_tokens WHERE name = 'scheduled_emails';
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'process-scheduled-emails';
  IF jid IS NOT NULL THEN
    PERFORM cron.alter_job(
      job_id := jid,
      command := format(
        $cmd$select net.http_post(
          url:='https://project--13f55f7f-d4af-4c77-8203-43cde447eb16.lovable.app/api/public/hooks/process-scheduled-emails',
          headers:=%L::jsonb,
          body:='{}'::jsonb
        ) as request_id;$cmd$,
        json_build_object('Content-Type', 'application/json', 'x-cron-token', tok)::text
      )
    );
  END IF;
END $$;