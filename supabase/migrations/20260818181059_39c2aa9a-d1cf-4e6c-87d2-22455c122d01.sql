ALTER TABLE public.demo_access
  ADD COLUMN IF NOT EXISTS prospect_phone TEXT,
  ADD COLUMN IF NOT EXISTS delivery_method TEXT NOT NULL DEFAULT 'email';

ALTER TABLE public.demo_access ALTER COLUMN prospect_email DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'demo_access_email_or_phone'
  ) THEN
    ALTER TABLE public.demo_access
      ADD CONSTRAINT demo_access_email_or_phone
      CHECK (prospect_email IS NOT NULL OR prospect_phone IS NOT NULL);
  END IF;
END $$;