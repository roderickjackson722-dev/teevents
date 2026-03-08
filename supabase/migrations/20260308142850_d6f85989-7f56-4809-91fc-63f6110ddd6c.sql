
-- Add email response tracking to prospects
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS email_response_status text DEFAULT 'none';
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS follow_up_count integer DEFAULT 0;
