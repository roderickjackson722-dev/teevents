ALTER TABLE public.platform_transactions DROP COLUMN IF EXISTS hold_amount_cents;
ALTER TABLE public.platform_transactions DROP COLUMN IF EXISTS hold_release_date;
ALTER TABLE public.platform_transactions DROP COLUMN IF EXISTS hold_status;