
-- Add sample-mode columns to tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sample_token uuid,
  ADD COLUMN IF NOT EXISTS sample_view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sample_last_viewed timestamptz,
  ADD COLUMN IF NOT EXISTS sample_created_by uuid,
  ADD COLUMN IF NOT EXISTS sample_converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS sample_converted_to uuid,
  ADD COLUMN IF NOT EXISTS is_converted_from_sample boolean NOT NULL DEFAULT false;

-- Backfill tokens for any existing rows we later flip to sample
UPDATE public.tournaments SET sample_token = gen_random_uuid() WHERE sample_token IS NULL AND is_sample = true;

-- Ensure token is unique when present
CREATE UNIQUE INDEX IF NOT EXISTS tournaments_sample_token_key
  ON public.tournaments (sample_token) WHERE sample_token IS NOT NULL;

-- Public read policy: anyone (including anon) can read a tournament that is currently a sample.
-- This is safe: sample tournaments are explicitly marked by the admin for prospect preview.
DROP POLICY IF EXISTS "Anyone can view sample tournaments" ON public.tournaments;
CREATE POLICY "Anyone can view sample tournaments"
  ON public.tournaments
  FOR SELECT
  TO anon, authenticated
  USING (is_sample = true);

-- Bump view count RPC (security definer so anon can call it without table write access)
CREATE OR REPLACE FUNCTION public.bump_sample_view(_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t_id uuid;
BEGIN
  UPDATE public.tournaments
    SET sample_view_count = sample_view_count + 1,
        sample_last_viewed = now()
    WHERE sample_token = _token AND is_sample = true
    RETURNING id INTO t_id;
  RETURN t_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_sample_view(uuid) TO anon, authenticated;

-- Record prospect "Upgrade Now" interest
CREATE OR REPLACE FUNCTION public.notify_sample_upgrade_interest(
  _token uuid,
  _email text DEFAULT NULL,
  _name text DEFAULT NULL,
  _message text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t_row public.tournaments%ROWTYPE;
BEGIN
  SELECT * INTO t_row FROM public.tournaments WHERE sample_token = _token AND is_sample = true;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.admin_notifications (type, title, message, metadata, is_read)
  VALUES (
    'sample_upgrade_interest',
    'Prospect interested in sample: ' || t_row.title,
    COALESCE(_message, 'A prospect clicked "Upgrade Now" on the sample dashboard.'),
    jsonb_build_object(
      'tournament_id', t_row.id,
      'tournament_title', t_row.title,
      'prospect_email', _email,
      'prospect_name', _name
    ),
    false
  );
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_sample_upgrade_interest(uuid, text, text, text) TO anon, authenticated;
