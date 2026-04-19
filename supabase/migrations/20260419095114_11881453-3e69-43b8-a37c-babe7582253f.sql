ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS site_show_logo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS site_text_color text DEFAULT '#1F2937',
  ADD COLUMN IF NOT EXISTS site_background_color text DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS site_font_family text DEFAULT 'Inter',
  ADD COLUMN IF NOT EXISTS site_heading_font_size integer DEFAULT 60,
  ADD COLUMN IF NOT EXISTS site_body_font_size integer DEFAULT 16,
  ADD COLUMN IF NOT EXISTS site_button_font_size integer DEFAULT 16,
  ADD COLUMN IF NOT EXISTS site_logo_position text DEFAULT 'center',
  ADD COLUMN IF NOT EXISTS site_title_position text DEFAULT 'center',
  ADD COLUMN IF NOT EXISTS site_button_position text DEFAULT 'center',
  ADD COLUMN IF NOT EXISTS site_button_radius integer DEFAULT 8,
  ADD COLUMN IF NOT EXISTS site_button_hover_effect text DEFAULT 'darken';