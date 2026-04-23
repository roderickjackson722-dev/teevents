-- Add email column to activity_logs
ALTER TABLE public.activity_logs
ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill existing rows from auth.users
UPDATE public.activity_logs al
SET email = u.email
FROM auth.users u
WHERE al.user_id = u.id
  AND al.email IS NULL;

-- Index for filtering/sorting by email in admin views
CREATE INDEX IF NOT EXISTS idx_activity_logs_email ON public.activity_logs (email);