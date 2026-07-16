
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS sponsor_form_config jsonb NOT NULL DEFAULT '{
    "company_name": "required",
    "contact_name": "required",
    "contact_email": "required",
    "contact_phone": "optional",
    "website_url": "optional",
    "description": "optional",
    "address": "hidden",
    "additional_notes": "hidden"
  }'::jsonb;

ALTER TABLE public.sponsor_registrations
  ADD COLUMN IF NOT EXISTS address text;
