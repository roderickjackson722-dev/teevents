
-- Add slug to college tournaments for public URLs
ALTER TABLE public.college_tournaments ADD COLUMN IF NOT EXISTS slug text;

-- Generate slug trigger
CREATE OR REPLACE FUNCTION public.generate_college_tournament_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
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
    WHILE EXISTS (SELECT 1 FROM public.college_tournaments WHERE slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_college_tournament_slug
  BEFORE INSERT OR UPDATE ON public.college_tournaments
  FOR EACH ROW EXECUTE FUNCTION public.generate_college_tournament_slug();

-- Add invitation token for RSVP links
ALTER TABLE public.college_tournament_invitations ADD COLUMN IF NOT EXISTS token text DEFAULT encode(extensions.gen_random_bytes(16), 'hex');
CREATE UNIQUE INDEX IF NOT EXISTS idx_college_inv_token ON public.college_tournament_invitations(token);
