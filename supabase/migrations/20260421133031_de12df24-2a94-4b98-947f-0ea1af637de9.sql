ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS payment_method_override text NOT NULL DEFAULT 'default'
  CHECK (payment_method_override IN ('default', 'force_stripe', 'force_platform'));

COMMENT ON COLUMN public.tournaments.payment_method_override IS
  'Admin override for payment routing. default = use organizer Stripe if connected else platform escrow; force_stripe = require organizer Stripe (error if missing); force_platform = always route to TeeVents platform escrow.';