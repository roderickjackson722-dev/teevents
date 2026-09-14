ALTER TABLE public.sample_tournaments
  ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#1a5c38',
  ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#F5A623',
  ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sample_created_by uuid,
  ADD COLUMN IF NOT EXISTS sample_share_link text,
  ADD COLUMN IF NOT EXISTS guided_tour boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tour_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tour_completed_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_sample_tour_completed(_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.sample_tournaments
     SET tour_completed = true,
         tour_completed_at = now()
   WHERE unique_slug = _slug;
$$;

REVOKE ALL ON FUNCTION public.mark_sample_tour_completed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_sample_tour_completed(text) TO anon, authenticated, service_role;