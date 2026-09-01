select cron.schedule(
  'process-league-renewals-daily',
  '30 13 * * *',
  $$select net.http_post(
      url := 'https://project--13f55f7f-d4af-4c77-8203-43cde447eb16.lovable.app/api/public/hooks/process-league-renewals',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
  );$$
);