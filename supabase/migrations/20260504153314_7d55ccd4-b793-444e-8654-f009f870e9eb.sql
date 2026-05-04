-- 1. Add demo flags to tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS demo_flyer_url text;

CREATE INDEX IF NOT EXISTS idx_tournaments_is_demo ON public.tournaments(is_demo) WHERE is_demo = true;

-- 2. Storage bucket for prospect flyers
INSERT INTO storage.buckets (id, name, public)
VALUES ('flyer-uploads', 'flyer-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Admins can upload to flyer-uploads
DROP POLICY IF EXISTS "Admins can upload flyers" ON storage.objects;
CREATE POLICY "Admins can upload flyers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'flyer-uploads' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete flyers" ON storage.objects;
CREATE POLICY "Admins can delete flyers"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'flyer-uploads' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Public can view flyers" ON storage.objects;
CREATE POLICY "Public can view flyers"
ON storage.objects FOR SELECT
USING (bucket_id = 'flyer-uploads');

-- 3. Cleanup function (admins can invoke)
CREATE OR REPLACE FUNCTION public.delete_old_demo_tournaments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can run demo cleanup';
  END IF;

  WITH deleted AS (
    DELETE FROM public.tournaments
    WHERE is_demo = true
      AND created_at < now() - interval '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;