CREATE OR REPLACE FUNCTION public.force_pending_access_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('service_role','postgres','supabase_admin')
     AND NOT COALESCE(public.has_role(auth.uid(), 'admin'::app_role), false) THEN
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS a_force_pending_access_request ON public.event_access_requests;
CREATE TRIGGER a_force_pending_access_request BEFORE INSERT ON public.event_access_requests
FOR EACH ROW EXECUTE FUNCTION public.force_pending_access_request();

INSERT INTO public.internal_cron_tokens(name) VALUES ('day_before_reminder'), ('post_event_organizer_email'), ('lead_magnet_followups')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE t1 text; t2 text;
BEGIN
  SELECT token INTO t1 FROM public.internal_cron_tokens WHERE name = 'day_before_reminder';
  SELECT token INTO t2 FROM public.internal_cron_tokens WHERE name = 'post_event_organizer_email';
  PERFORM cron.alter_job(job_id := (SELECT jobid FROM cron.job WHERE jobname = 'day-before-reminder-scheduler'),
    command := format($c$select net.http_post(url:='https://wmoivwwerxqscqznivnn.supabase.co/functions/v1/send-day-before-reminder', headers:=%L::jsonb, body:='{"cron": true}'::jsonb) as request_id;$c$,
      jsonb_build_object('Content-Type','application/json','apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtb2l2d3dlcnhxc2Nxem5pdm5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMzU5NzcsImV4cCI6MjA4NjkxMTk3N30.D5SiWEFRzL_hIYBwTSWm3a3DSarF16xHIu0yHfTa3Zw','x-cron-token',t1)::text));
  PERFORM cron.alter_job(job_id := (SELECT jobid FROM cron.job WHERE jobname = 'post-event-organizer-email-daily'),
    command := format($c$select net.http_post(url:='https://project--13f55f7f-d4af-4c77-8203-43cde447eb16.lovable.app/api/public/post-event-organizer-email', headers:=%L::jsonb, body:='{}'::jsonb) as request_id;$c$,
      jsonb_build_object('Content-Type','application/json','x-cron-token',t2)::text));
END $$;