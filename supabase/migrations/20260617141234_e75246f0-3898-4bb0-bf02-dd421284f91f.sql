
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS show_branding_footer boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS branding_footer_admin_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS branding_footer_admin_show boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS branding_footer_custom_text text;
