ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS show_promo_code_input boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.tournaments.show_promo_code_input IS 'When false, the promo code input box is hidden from public registration forms.';

GRANT UPDATE (show_promo_code_input) ON public.tournaments TO authenticated;
GRANT SELECT (show_promo_code_input) ON public.tournaments TO authenticated;
GRANT ALL (show_promo_code_input) ON public.tournaments TO service_role;