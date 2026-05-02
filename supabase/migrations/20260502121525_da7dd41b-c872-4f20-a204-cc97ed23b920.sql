-- 1) Add columns to vendor_registrations
ALTER TABLE public.vendor_registrations
  ADD COLUMN IF NOT EXISTS check_in_code text,
  ADD COLUMN IF NOT EXISTS reminder_week_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_day_sent_at timestamptz;

-- Backfill any nulls with a code
UPDATE public.vendor_registrations
  SET check_in_code = upper(substr(md5(id::text || random()::text), 1, 6))
  WHERE check_in_code IS NULL;

-- Trigger to auto-generate unique 6-char check-in code
CREATE OR REPLACE FUNCTION public.generate_vendor_check_in_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.check_in_code IS NULL OR NEW.check_in_code = '' THEN
    NEW.check_in_code := upper(substr(md5(NEW.id::text || now()::text || random()::text), 1, 6));
    WHILE EXISTS (
      SELECT 1 FROM public.vendor_registrations
      WHERE check_in_code = NEW.check_in_code AND id != NEW.id
    ) LOOP
      NEW.check_in_code := upper(substr(md5(NEW.id::text || now()::text || random()::text), 1, 6));
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_registrations_check_in_code ON public.vendor_registrations;
CREATE TRIGGER trg_vendor_registrations_check_in_code
  BEFORE INSERT ON public.vendor_registrations
  FOR EACH ROW EXECUTE FUNCTION public.generate_vendor_check_in_code();

CREATE UNIQUE INDEX IF NOT EXISTS uniq_vendor_registrations_check_in_code
  ON public.vendor_registrations (check_in_code);

-- 2) Prevent double-booking of booths
CREATE UNIQUE INDEX IF NOT EXISTS uniq_vendor_booth_assigned
  ON public.vendor_booth_locations (tournament_id, assigned_to)
  WHERE assigned_to IS NOT NULL;

-- 3) Storage: private bucket for vendor documents
INSERT INTO storage.buckets (id, name, public)
  VALUES ('vendor-documents', 'vendor-documents', false)
  ON CONFLICT (id) DO NOTHING;

-- Allow anonymous (public form) uploads into vendor-documents/<tournament_id>/...
DROP POLICY IF EXISTS "Public can upload vendor documents" ON storage.objects;
CREATE POLICY "Public can upload vendor documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vendor-documents'
    AND EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id::text = (storage.foldername(name))[1]
    )
  );

-- Organizers (tournament owners) can read their vendor documents
DROP POLICY IF EXISTS "Organizers can read vendor documents" ON storage.objects;
CREATE POLICY "Organizers can read vendor documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vendor-documents'
    AND EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.org_members om ON om.organization_id = t.organization_id
      WHERE t.id::text = (storage.foldername(name))[1]
        AND om.user_id = auth.uid()
    )
  );

-- Organizers can delete vendor documents
DROP POLICY IF EXISTS "Organizers can delete vendor documents" ON storage.objects;
CREATE POLICY "Organizers can delete vendor documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'vendor-documents'
    AND EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.org_members om ON om.organization_id = t.organization_id
      WHERE t.id::text = (storage.foldername(name))[1]
        AND om.user_id = auth.uid()
    )
  );