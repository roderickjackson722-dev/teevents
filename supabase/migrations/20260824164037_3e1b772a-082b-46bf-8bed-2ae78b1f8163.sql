ALTER TABLE public.scheduled_emails
  ADD COLUMN IF NOT EXISTS test_email text;