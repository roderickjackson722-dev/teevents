
ALTER TABLE public.tournaments 
  ADD COLUMN IF NOT EXISTS refund_policy text DEFAULT 'Full refund requests accepted up to 30 days before the event start date. No refunds after that date, except in cases of full event cancellation or major postponement.',
  ADD COLUMN IF NOT EXISTS refund_policy_type text DEFAULT 'full_30_days',
  ADD COLUMN IF NOT EXISTS rain_date_policy text DEFAULT 'In case of rain or weather postponement, registrations will automatically transfer to the new rain date. If no rain date is possible, full refunds will be issued.',
  ADD COLUMN IF NOT EXISTS rain_date_policy_type text DEFAULT 'auto_transfer',
  ADD COLUMN IF NOT EXISTS reserve_percentage numeric DEFAULT 15;

UPDATE public.organizations SET platform_fee_rate = 4 WHERE platform_fee_rate = 0 OR platform_fee_rate IS NULL;
ALTER TABLE public.organizations ALTER COLUMN platform_fee_rate SET DEFAULT 4;
