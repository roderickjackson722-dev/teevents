ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS sponsor_email_config jsonb,
  ADD COLUMN IF NOT EXISTS vendor_email_config jsonb;

COMMENT ON COLUMN public.tournaments.sponsor_email_config IS 'Organizer-editable confirmation email template for sponsor purchases';
COMMENT ON COLUMN public.tournaments.vendor_email_config IS 'Organizer-editable confirmation email template for vendor registrations';