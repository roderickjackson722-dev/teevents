
ALTER TABLE public.tournament_promo_codes
  ADD COLUMN IF NOT EXISTS auto_apply boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS applies_to text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS applies_to_custom text,
  ADD COLUMN IF NOT EXISTS alert_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alert_html text,
  ADD COLUMN IF NOT EXISTS show_alert_at_checkout boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_alert_on_top boolean NOT NULL DEFAULT true;
