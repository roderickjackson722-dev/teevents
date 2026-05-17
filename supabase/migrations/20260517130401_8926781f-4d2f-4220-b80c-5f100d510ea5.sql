
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS store_section_title text DEFAULT 'Add-Ons';

ALTER TABLE public.sponsorship_tiers
  ADD COLUMN IF NOT EXISTS custom_package_label text;
