select cron.unschedule('daily-tournament-page-canary')
where exists (select 1 from cron.job where jobname = 'daily-tournament-page-canary');

select cron.schedule(
  'daily-tournament-page-canary',
  '0 7 * * *',
  $$select net.http_post(
      url := 'https://www.teevents.golf/api/public/hooks/tournament-page-canary',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{}'::jsonb
    );$$
);