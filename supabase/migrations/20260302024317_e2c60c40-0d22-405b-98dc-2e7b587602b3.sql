
-- Add site builder columns to tournaments
ALTER TABLE public.tournaments
  ADD COLUMN slug text UNIQUE,
  ADD COLUMN site_published boolean DEFAULT false,
  ADD COLUMN site_logo_url text,
  ADD COLUMN site_hero_title text,
  ADD COLUMN site_hero_subtitle text,
  ADD COLUMN site_primary_color text DEFAULT '#1a5c38',
  ADD COLUMN site_secondary_color text DEFAULT '#c8a84e',
  ADD COLUMN site_hero_image_url text,
  ADD COLUMN contact_email text,
  ADD COLUMN contact_phone text,
  ADD COLUMN schedule_info text,
  ADD COLUMN registration_url text;

-- Auto-generate slug from title on insert
CREATE OR REPLACE FUNCTION public.generate_tournament_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.tournaments WHERE slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_slug_on_tournament_insert
  BEFORE INSERT ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_tournament_slug();

-- Create storage bucket for tournament assets
INSERT INTO storage.buckets (id, name, public) VALUES ('tournament-assets', 'tournament-assets', true);

-- Storage RLS: anyone can read public tournament assets
CREATE POLICY "Public read tournament assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tournament-assets');

-- Storage RLS: authenticated org members can upload
CREATE POLICY "Authenticated users can upload tournament assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tournament-assets');

-- Storage RLS: authenticated users can update their uploads
CREATE POLICY "Authenticated users can update tournament assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tournament-assets');

-- Storage RLS: authenticated users can delete their uploads
CREATE POLICY "Authenticated users can delete tournament assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tournament-assets');

-- Public can read tournaments by slug (for public tournament pages)
CREATE POLICY "Public can read published tournaments by slug"
  ON public.tournaments FOR SELECT TO anon
  USING (site_published = true);
