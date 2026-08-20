ALTER TABLE public.league_payments
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('auto-reconcile-league-payments');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'auto-reconcile-league-payments',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.teevents.golf/api/public/league-payment-confirm',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"all": true}'::jsonb
  );
  $$
);