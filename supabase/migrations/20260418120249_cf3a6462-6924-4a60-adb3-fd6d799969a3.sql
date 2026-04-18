
-- Add managed_by_teevents flag (admin-only internal flag, not shown publicly)
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS managed_by_teevents boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tournaments_managed_by_teevents
  ON public.tournaments(managed_by_teevents) WHERE managed_by_teevents = true;

-- Sponsorship landing pages (one per tournament)
CREATE TABLE IF NOT EXISTS public.sponsorship_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE UNIQUE,
  hero_title text,
  hero_description text,
  tiers_content jsonb DEFAULT '[]'::jsonb,
  use_imported_tiers boolean NOT NULL DEFAULT true,
  contact_email text,
  contact_phone text,
  contact_name text,
  pdf_url text,
  custom_html text,
  cta_register_label text DEFAULT 'Become a Sponsor',
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsorship_pages ENABLE ROW LEVEL SECURITY;

-- Public can read PUBLISHED sponsorship pages
CREATE POLICY "Public can view published sponsorship pages"
  ON public.sponsorship_pages FOR SELECT
  USING (published = true);

-- Admins can do everything
CREATE POLICY "Admins manage sponsorship pages"
  ON public.sponsorship_pages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER set_sponsorship_pages_updated_at
  BEFORE UPDATE ON public.sponsorship_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for prospectus PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('sponsorship-assets', 'sponsorship-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, admin write
CREATE POLICY "Public read sponsorship assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sponsorship-assets');

CREATE POLICY "Admins upload sponsorship assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'sponsorship-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update sponsorship assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'sponsorship-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete sponsorship assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'sponsorship-assets' AND public.has_role(auth.uid(), 'admin'));
