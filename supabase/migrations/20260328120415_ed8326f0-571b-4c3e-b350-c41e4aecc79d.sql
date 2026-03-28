ALTER TABLE public.college_tournaments 
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS hero_overlay_opacity numeric DEFAULT 0.6;